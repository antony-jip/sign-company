import { logger, schedules, metadata } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { createDecipheriv, createHash } from "crypto";

const ENCRYPTION_KEY = process.env.INKOOPFACTUUR_ENCRYPTION_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

function decrypt(encrypted: string): string {
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const key = createHash("sha256").update(ENCRYPTION_KEY).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

interface InboxConfig {
  id: string;
  organisatie_id: string;
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_password_encrypted: string;
  gmail_label: string;
  laatste_uid: number;
}

export const inkoopfactuurIntakeCron = schedules.task({
  id: "inkoopfactuur-intake",
  cron: { pattern: "*/15 * * * *", timezone: "Europe/Amsterdam" },
  maxDuration: 300,
  retry: { maxAttempts: 2 },
  run: async (payload) => {
    const supabase = getSupabaseAdmin();

    logger.info("Inkoopfactuur intake gestart", {
      scheduledAt: payload.timestamp,
    });

    const { data: configs } = await supabase
      .from("inkoopfactuur_inbox_config")
      .select("id, organisatie_id, imap_host, imap_port, imap_user, imap_password_encrypted, gmail_label, laatste_uid")
      .eq("actief", true);

    if (!configs || configs.length === 0) {
      logger.info("Geen actieve inbox configs gevonden");
      return { verwerkt: 0 };
    }

    let totaalVerwerkt = 0;

    for (const config of configs as InboxConfig[]) {
      try {
        const verwerkt = await processInbox(supabase, config);
        totaalVerwerkt += verwerkt;

        await supabase
          .from("inkoopfactuur_inbox_config")
          .update({
            laatst_gecheckt_op: new Date().toISOString(),
            laatste_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", config.id);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Onbekende fout";
        logger.error(`Inbox fout voor org ${config.organisatie_id}`, { error: message });

        await supabase
          .from("inkoopfactuur_inbox_config")
          .update({
            laatst_gecheckt_op: new Date().toISOString(),
            laatste_error: message.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("id", config.id);
      }
    }

    metadata.set("totaalVerwerkt", totaalVerwerkt);
    return { verwerkt: totaalVerwerkt };
  },
});

async function processInbox(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  config: InboxConfig
): Promise<number> {
  if (!ENCRYPTION_KEY) throw new Error("INKOOPFACTUUR_ENCRYPTION_KEY niet gezet");

  const password = decrypt(config.imap_password_encrypted);

  const client = new ImapFlow({
    host: config.imap_host,
    port: config.imap_port,
    secure: config.imap_port === 993,
    auth: { user: config.imap_user, pass: password },
    logger: false,
    emitLogs: false,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });

  await client.connect();

  let verwerkt = 0;

  try {
    await client.mailboxOpen(config.gmail_label, { readOnly: true });

    const searchCriteria: Record<string, unknown> = config.laatste_uid > 0
      ? { uid: `${config.laatste_uid + 1}:*` }
      : { all: true };

    let hoogsteUid = config.laatste_uid;

    for await (const msg of client.fetch(searchCriteria, {
      uid: true,
      envelope: true,
      source: true,
    })) {
      if (msg.uid <= config.laatste_uid) continue;

      if (!msg.source) continue;
      const parsed = await simpleParser(msg.source as Buffer);

      const pdfAttachments = (parsed.attachments || []).filter(
        (a: { contentType: string }) => a.contentType === "application/pdf"
      );

      if (pdfAttachments.length === 0) {
        if (msg.uid > hoogsteUid) hoogsteUid = msg.uid;
        continue;
      }

      const messageId = (parsed as any).messageId || msg.envelope?.messageId || null;

      if (messageId) {
        const { data: existing } = await supabase
          .from("inkoopfacturen")
          .select("id")
          .eq("organisatie_id", config.organisatie_id)
          .eq("email_message_id", messageId)
          .limit(1);

        if (existing && existing.length > 0) {
          if (msg.uid > hoogsteUid) hoogsteUid = msg.uid;
          continue;
        }
      }

      for (const pdf of pdfAttachments) {
        const fileId = crypto.randomUUID();
        const storagePath = `${config.organisatie_id}/${fileId}.pdf`;

        const { error: uploadError } = await supabase.storage
          .from("inkoopfacturen")
          .upload(storagePath, pdf.content, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          logger.error("PDF upload fout", { error: uploadError.message, storagePath });
          continue;
        }

        const { data: factuur, error: insertError } = await supabase
          .from("inkoopfacturen")
          .insert({
            organisatie_id: config.organisatie_id,
            pdf_storage_path: storagePath,
            email_subject: (parsed as any).subject || null,
            email_van: (parsed as any).from?.text || null,
            email_message_id: messageId,
            email_ontvangen_op: (parsed as any).date?.toISOString() || new Date().toISOString(),
            status: "nieuw",
          })
          .select("id")
          .single();

        if (insertError) {
          logger.error("Insert fout", { error: insertError.message });
          continue;
        }

        await triggerExtract(factuur.id, storagePath, supabase, config.organisatie_id);
        await broadcastNotificatie(supabase, config.organisatie_id, (parsed as any).from?.text || "Onbekend");

        verwerkt++;
      }

      if (msg.uid > hoogsteUid) hoogsteUid = msg.uid;
    }

    if (hoogsteUid > config.laatste_uid) {
      await supabase
        .from("inkoopfactuur_inbox_config")
        .update({ laatste_uid: hoogsteUid })
        .eq("id", config.id);
    }
  } finally {
    await client.logout();
  }

  return verwerkt;
}

async function triggerExtract(
  factuurId: string,
  storagePath: string,
  supabase: ReturnType<typeof getSupabaseAdmin>,
  _organisatieId: string
): Promise<void> {
  if (!ANTHROPIC_API_KEY) {
    logger.warn("ANTHROPIC_API_KEY niet gezet, extractie overgeslagen");
    return;
  }

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("inkoopfacturen")
      .download(storagePath);

    if (downloadError || !fileData) {
      logger.error("PDF download fout voor extractie", { storagePath });
      return;
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const systemPrompt = `Je bent een Nederlandse inkoopfactuur extractor. Analyseer de PDF en geef UITSLUITEND valide JSON terug, geen markdown codeblokken, geen uitleg. Schema:
{
  "leverancier_naam": "string",
  "factuur_nummer": "string | null",
  "factuur_datum": "YYYY-MM-DD | null",
  "vervaldatum": "YYYY-MM-DD | null",
  "subtotaal": number,
  "btw_bedrag": number,
  "totaal": number,
  "valuta": "EUR",
  "regels": [{"omschrijving": "string", "aantal": number, "eenheidsprijs": number, "btw_tarief": number, "regel_totaal": number}],
  "vertrouwen": "hoog" | "midden" | "laag",
  "opmerkingen": ""
}
Als totaal niet matcht met subtotaal + btw: zet vertrouwen op "laag" en beschrijf in opmerkingen.
Als geen factuurnummer vindbaar: null.
Bedragen altijd als number, niet string met comma.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64Data },
              },
              { type: "text", text: "Extraheer alle factuurgegevens uit deze PDF." },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      logger.error("Anthropic API fout", { status: response.status, body: errBody.slice(0, 300) });
      return;
    }

    const data = await response.json();
    const textContent = data.content?.find((c: { type: string }) => c.type === "text")?.text || "";

    let cleaned = textContent.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      await supabase
        .from("inkoopfacturen")
        .update({
          extractie_opmerkingen: `JSON parse fout. Ruwe response: ${textContent.slice(0, 500)}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", factuurId);
      return;
    }

    const regels = Array.isArray(parsed.regels) ? parsed.regels : [];

    await supabase
      .from("inkoopfacturen")
      .update({
        leverancier_naam: parsed.leverancier_naam || "",
        factuur_nummer: parsed.factuur_nummer || null,
        factuur_datum: parsed.factuur_datum || null,
        vervaldatum: parsed.vervaldatum || null,
        subtotaal: parsed.subtotaal || 0,
        btw_bedrag: parsed.btw_bedrag || 0,
        totaal: parsed.totaal || 0,
        valuta: parsed.valuta || "EUR",
        status: "verwerkt",
        extractie_vertrouwen: parsed.vertrouwen || "laag",
        extractie_opmerkingen: parsed.opmerkingen || null,
        raw_extractie_json: parsed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", factuurId);

    if (regels.length > 0) {
      const regelRows = regels.map((r: Record<string, unknown>, i: number) => ({
        inkoopfactuur_id: factuurId,
        volgorde: i,
        omschrijving: (r.omschrijving as string) || "",
        aantal: (r.aantal as number) || 1,
        eenheidsprijs: (r.eenheidsprijs as number) || 0,
        btw_tarief: (r.btw_tarief as number) || 21,
        regel_totaal: (r.regel_totaal as number) || 0,
      }));

      await supabase.from("inkoopfactuur_regels").insert(regelRows);
    }

    logger.info("Extractie voltooid", { factuurId, vertrouwen: parsed.vertrouwen });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    logger.error("Extractie fout", { factuurId, error: message });

    await supabase
      .from("inkoopfacturen")
      .update({
        extractie_opmerkingen: `Extractie fout: ${message.slice(0, 300)}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", factuurId);
  }
}

async function broadcastNotificatie(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  organisatieId: string,
  emailVan: string
): Promise<void> {
  const { data: medewerkers } = await supabase
    .from("medewerkers")
    .select("user_id")
    .eq("organisatie_id", organisatieId)
    .eq("inkoopfacturen_toegang", true)
    .not("user_id", "is", null);

  if (!medewerkers || medewerkers.length === 0) return;

  const notificaties = medewerkers.map((m) => ({
    user_id: m.user_id,
    type: "inkoopfactuur",
    titel: "Nieuwe inkoopfactuur ontvangen",
    bericht: `Nieuwe inkoopfactuur van ${emailVan}`,
    link: "/inkoopfacturen",
  }));

  await supabase.from("app_notificaties").insert(notificaties);
}
