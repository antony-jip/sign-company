import { task, wait, logger } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import { getUserEmailCredentials } from "./utils/email";

interface VerzendEmailGeplandPayload {
  ingeplandBerichtId: string;
}

export const verzendEmailGeplandTask = task({
  id: "verzend-email-gepland",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: VerzendEmailGeplandPayload) => {
    const supabase = getSupabaseAdmin();

    const { data: ingepland, error: fetchError } = await supabase
      .from("ingeplande_berichten")
      .select("*")
      .eq("id", payload.ingeplandBerichtId)
      .single();

    if (fetchError || !ingepland) {
      throw new Error(`Ingepland bericht niet gevonden: ${payload.ingeplandBerichtId}`);
    }

    if (ingepland.status !== "wachtend") {
      logger.info("Ingepland bericht niet meer wachtend, overgeslagen", {
        id: ingepland.id,
        status: ingepland.status,
      });
      return { status: "skipped", reason: ingepland.status };
    }

    const verzendDatum = new Date(ingepland.scheduled_at);
    if (Number.isNaN(verzendDatum.getTime())) {
      throw new Error(`Ongeldige scheduled_at: ${ingepland.scheduled_at}`);
    }

    logger.info("Geplande email wacht tot verzendmoment", {
      id: ingepland.id,
      ontvanger: ingepland.ontvanger,
      onderwerp: ingepland.onderwerp,
      scheduledAt: ingepland.scheduled_at,
    });

    if (verzendDatum.getTime() > Date.now()) {
      await wait.until({ date: verzendDatum });
    }

    // Re-check status na het wachten — kan tussentijds geannuleerd zijn
    const { data: refreshed } = await supabase
      .from("ingeplande_berichten")
      .select("status")
      .eq("id", ingepland.id)
      .single();

    if (refreshed?.status !== "wachtend") {
      logger.info("Ingepland bericht tussentijds geannuleerd", {
        id: ingepland.id,
        status: refreshed?.status,
      });
      return { status: "skipped", reason: refreshed?.status || "unknown" };
    }

    try {
      const creds = await getUserEmailCredentials(ingepland.user_id);
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

      const mailOptions: Record<string, unknown> = {
        from: fromAddress,
        to: ingepland.ontvanger,
        subject: ingepland.onderwerp,
      };

      if (ingepland.html) {
        mailOptions.html = ingepland.html;
        mailOptions.text = ingepland.body || ingepland.onderwerp;
      } else {
        mailOptions.text = ingepland.body;
      }

      if (ingepland.cc) mailOptions.cc = ingepland.cc;

      const bijlagen = (ingepland.bijlagen || []) as Array<{
        filename: string;
        content: string;
        encoding: "base64";
      }>;
      if (bijlagen.length) {
        mailOptions.attachments = bijlagen.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "base64"),
        }));
      }

      await transporter.sendMail(mailOptions);

      const verzondenOp = new Date().toISOString();

      await supabase
        .from("ingeplande_berichten")
        .update({
          status: "verzonden",
          verzonden_op: verzondenOp,
        })
        .eq("id", ingepland.id);

      // Post-send actie: offerte status bijwerken indien metadata aanwezig
      const meta = (ingepland.metadata || {}) as Record<string, unknown>;
      if (meta.type === "offerte_verzenden" && typeof meta.offerte_id === "string") {
        try {
          const { data: offerte } = await supabase
            .from("offertes")
            .select("activiteiten")
            .eq("id", meta.offerte_id)
            .single();

          const huidigeActiviteiten = Array.isArray(offerte?.activiteiten)
            ? offerte.activiteiten
            : [];

          const verstuurdNaar = typeof meta.verstuurd_naar === "string"
            ? meta.verstuurd_naar
            : ingepland.ontvanger;

          const nieuweActiviteit = {
            datum: verzondenOp,
            type: "verstuurd",
            beschrijving: `Verstuurd naar ${verstuurdNaar} (ingepland)`,
          };

          await supabase
            .from("offertes")
            .update({
              status: "verzonden",
              verstuurd_op: verzondenOp,
              verstuurd_naar: verstuurdNaar,
              activiteiten: [...huidigeActiviteiten, nieuweActiviteit],
            })
            .eq("id", meta.offerte_id);

          logger.info("Offerte status bijgewerkt na geplande verzending", {
            offerteId: meta.offerte_id,
          });
        } catch (offerteErr) {
          logger.error("Offerte update na verzending mislukt", {
            error: offerteErr instanceof Error ? offerteErr.message : String(offerteErr),
            offerteId: meta.offerte_id,
          });
        }
      }

      logger.info("Geplande email verzonden", {
        id: ingepland.id,
        ontvanger: ingepland.ontvanger,
      });

      return { status: "verzonden" };
    } catch (err) {
      const foutmelding = err instanceof Error ? err.message : String(err);
      await supabase
        .from("ingeplande_berichten")
        .update({ status: "mislukt", foutmelding })
        .eq("id", ingepland.id);
      logger.error("Geplande email verzenden mislukt", {
        id: ingepland.id,
        error: foutmelding,
      });
      throw err;
    }
  },
});
