import { task, wait, logger } from "@trigger.dev/sdk/v3";
import { ImapFlow } from "imapflow";
import crypto from "crypto";
import { getSupabaseAdmin } from "./utils/supabase";
import { sendEmailForUser, getUserEmailCredentials } from "./utils/email";

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;

function decrypt(encrypted: string): string {
  if (encrypted.startsWith("b64:")) {
    return Buffer.from(encrypted.slice(4), "base64").toString("utf8");
  }
  if (!ENCRYPTION_KEY) {
    throw new Error("EMAIL_ENCRYPTION_KEY niet geconfigureerd");
  }
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const [ivHex, encHex] = encrypted.split(":");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
  let decrypted = decipher.update(encHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

interface ImapCredentials {
  gmail_address: string;
  password: string;
  imap_host: string;
  imap_port: number;
}

async function getImapCredentials(userId: string): Promise<ImapCredentials | null> {
  const supabase = getSupabaseAdmin();
  const { data: settings } = await supabase
    .from("user_email_settings")
    .select("gmail_address, encrypted_app_password, imap_host, imap_port")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings?.gmail_address || !settings?.encrypted_app_password) return null;

  return {
    gmail_address: settings.gmail_address,
    password: decrypt(settings.encrypted_app_password),
    imap_host: settings.imap_host || "imap.gmail.com",
    imap_port: settings.imap_port || 993,
  };
}

/**
 * Check via IMAP of de ontvanger heeft gereageerd op de originele email.
 * Zoekt in INBOX naar mails VAN de ontvanger die het onderwerp bevatten.
 */
async function checkForReply(
  userId: string,
  ontvanger: string,
  onderwerp: string,
  sindsDate: Date
): Promise<boolean> {
  const creds = await getImapCredentials(userId);
  if (!creds) {
    logger.warn("Geen IMAP credentials gevonden, skip reply check");
    return false;
  }

  const client = new ImapFlow({
    host: creds.imap_host,
    port: creds.imap_port,
    secure: creds.imap_port === 993,
    auth: { user: creds.gmail_address, pass: creds.password },
    logger: false,
    emitLogs: false,
    greetingTimeout: 5000,
    socketTimeout: 15000,
  });

  try {
    await client.connect();
    await client.mailboxOpen("INBOX");

    // Zoek mails VAN de ontvanger SINCE de verzenddatum
    // Extract bare email address from "Name <email>" format
    const bareEmail = ontvanger.includes("<")
      ? ontvanger.match(/<([^>]+)>/)?.[1] || ontvanger
      : ontvanger;

    const searchResult = await client.search({
      from: bareEmail,
      since: sindsDate,
    });

    if (!searchResult || searchResult.length === 0) {
      await client.logout();
      return false;
    }

    // Check of een van de gevonden mails het onderwerp bevat
    // Strip "Re: " en "Fwd: " prefixen voor vergelijking
    const cleanSubject = onderwerp
      .replace(/^(Re|Fwd|FW|Fw):\s*/gi, "")
      .toLowerCase()
      .trim();

    for await (const message of client.fetch(searchResult, { envelope: true })) {
      if (!message.envelope?.subject) continue;
      const replySubject = message.envelope.subject
        .replace(/^(Re|Fwd|FW|Fw):\s*/gi, "")
        .toLowerCase()
        .trim();

      if (replySubject.includes(cleanSubject) || cleanSubject.includes(replySubject)) {
        await client.logout();
        return true;
      }
    }

    await client.logout();
    return false;
  } catch (err) {
    logger.error("IMAP reply check mislukt", {
      error: err instanceof Error ? err.message : String(err),
    });
    try { await client.logout(); } catch (err) { /* ignore */ }
    return false;
  }
}

/**
 * Genereer een opvolg-email via de Anthropic API.
 */
async function generateFollowUpEmail(
  ontvanger: string,
  onderwerp: string,
  oorspronkelijkeBody: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY niet geconfigureerd");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 500,
      system:
        "Je bent een professionele Nederlandse zakenman. Schrijf een korte, " +
        "vriendelijke opvolg-email. Gebruik de context van de originele email. " +
        "Geen formele aanhef, gewoon direct en persoonlijk. Max 3 zinnen. " +
        "Geen onderwerpregel, alleen de body tekst.",
      messages: [
        {
          role: "user",
          content:
            `Originele email aan ${ontvanger} over: ${onderwerp}\n\n` +
            `Inhoud:\n${oorspronkelijkeBody}\n\n` +
            `Schrijf een opvolging.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  const textBlock = data.content.find((c) => c.type === "text");
  if (!textBlock?.text) throw new Error("Geen tekst in Anthropic response");

  return textBlock.text.trim();
}

export const emailOpvolgingTask = task({
  id: "email-opvolging",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: { opvolgingId: string }) => {
    const supabase = getSupabaseAdmin();

    // 1. Haal opvolging record op
    const { data: opvolging, error: fetchError } = await supabase
      .from("email_opvolgingen")
      .select("*")
      .eq("id", payload.opvolgingId)
      .single();

    if (fetchError || !opvolging) {
      throw new Error(`Opvolging niet gevonden: ${payload.opvolgingId}`);
    }

    // Direct stoppen als status niet meer 'wachtend' is (geannuleerd etc.)
    if (opvolging.status !== "wachtend") {
      logger.info("Opvolging niet meer wachtend, overgeslagen", {
        id: opvolging.id,
        status: opvolging.status,
      });
      return { status: "skipped", reason: opvolging.status };
    }

    // 2. Wacht X dagen (gratis via Trigger.dev wait — geen compute)
    const wachtSeconden = opvolging.dagen * 86400;
    logger.info(`Wacht ${opvolging.dagen} dagen voor opvolging`, {
      id: opvolging.id,
      ontvanger: opvolging.ontvanger,
      onderwerp: opvolging.onderwerp,
    });

    await wait.for({ seconds: wachtSeconden });

    // 3. Na het wachten: opnieuw status checken (kan tussentijds geannuleerd zijn)
    const { data: refreshed } = await supabase
      .from("email_opvolgingen")
      .select("status")
      .eq("id", payload.opvolgingId)
      .single();

    if (refreshed?.status !== "wachtend") {
      logger.info("Opvolging tussentijds geannuleerd", {
        id: opvolging.id,
        status: refreshed?.status,
      });
      return { status: "skipped", reason: refreshed?.status || "unknown" };
    }

    // 4. Check of er een reply is via IMAP
    const verzenddatum = new Date(opvolging.created_at);
    const heeftReply = await checkForReply(
      opvolging.user_id,
      opvolging.ontvanger,
      opvolging.onderwerp,
      verzenddatum
    );

    if (heeftReply) {
      await supabase
        .from("email_opvolgingen")
        .update({ status: "reply_ontvangen" })
        .eq("id", opvolging.id);

      logger.info("Reply ontvangen, opvolging overgeslagen", {
        id: opvolging.id,
      });
      return { status: "reply_ontvangen" };
    }

    // 5. Geen reply → gebruik handmatige tekst of genereer via AI
    const opvolgBody = opvolging.opvolg_body
      ? opvolging.opvolg_body
      : await generateFollowUpEmail(
          opvolging.ontvanger,
          opvolging.onderwerp,
          opvolging.oorspronkelijke_body
        );

    // Voeg handtekening toe
    const volledigeTekst = opvolging.handtekening
      ? `${opvolgBody}\n\n${opvolging.handtekening}`
      : opvolgBody;

    // 6. Verstuur als reply in dezelfde thread
    const replySubject = opvolging.onderwerp.startsWith("Re:")
      ? opvolging.onderwerp
      : `Re: ${opvolging.onderwerp}`;

    // Bouw HTML met reply threading headers
    const htmlBody = `<div style="font-family: -apple-system, system-ui, sans-serif; font-size: 14px; color: #1A1A1A;">
${volledigeTekst.replace(/\n/g, "<br/>")}
</div>`;

    // Gebruik sendEmailForUser met extra headers voor threading
    const creds = await getUserEmailCredentials(opvolging.user_id);
    if (!creds) {
      throw new Error("Geen email instellingen gevonden voor user");
    }

    const { createTransport } = await import("nodemailer");
    const transporter = createTransport({
      host: creds.smtp_host,
      port: creds.smtp_port,
      secure: creds.smtp_port === 465,
      auth: { user: creds.gmail_address, pass: creds.password },
    });

    const fromAddress = creds.bedrijfsnaam
      ? `"${creds.bedrijfsnaam.replace(/"/g, "")}" <${creds.gmail_address}>`
      : creds.gmail_address;

    // Extract bare email for "to"
    const toAddress = opvolging.ontvanger.includes("<")
      ? opvolging.ontvanger.match(/<([^>]+)>/)?.[1] || opvolging.ontvanger
      : opvolging.ontvanger;

    const mailOptions: Record<string, unknown> = {
      from: fromAddress,
      to: toAddress,
      subject: replySubject,
      text: volledigeTekst,
      html: htmlBody,
      headers: {} as Record<string, string>,
    };

    // Threading headers (In-Reply-To en References)
    if (opvolging.message_id) {
      (mailOptions.headers as Record<string, string>)["In-Reply-To"] = opvolging.message_id;
      (mailOptions.headers as Record<string, string>)["References"] = opvolging.message_id;
    }

    await transporter.sendMail(mailOptions);

    // 7. Update Supabase record
    await supabase
      .from("email_opvolgingen")
      .update({
        status: "verstuurd",
        opvolg_body: opvolgBody,
        verstuurd_op: new Date().toISOString(),
      })
      .eq("id", opvolging.id);

    // 8. Stuur app_notificatie naar de user
    await supabase.from("notificaties").insert({
      user_id: opvolging.user_id,
      type: "email_opvolging",
      titel: "Auto-opvolging verstuurd",
      bericht: `Opvolging verstuurd naar ${opvolging.ontvanger} over '${opvolging.onderwerp}'`,
      link: "/email",
      gelezen: false,
      actie_genomen: false,
    });

    logger.info("Email opvolging verstuurd", {
      id: opvolging.id,
      ontvanger: opvolging.ontvanger,
      onderwerp: replySubject,
    });

    return { status: "verstuurd", opvolgBody };
  },
});
