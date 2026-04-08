import { logger, schedules } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import { getUserEmailCredentials } from "./utils/email";

/**
 * Scheduled task: elke minuut wachtende berichten verwerken die hun
 * scheduled_at moment hebben bereikt. Vervangt de oude per-bericht
 * wait.until task — eenvoudiger en idempotent.
 */
export const verzendGeplandeBerichtenCron = schedules.task({
  id: "verzend-geplande-berichten-cron",
  cron: { pattern: "* * * * *", timezone: "Europe/Amsterdam" },
  maxDuration: 300,
  run: async (payload) => {
    const supabase = getSupabaseAdmin();

    logger.info("Verzend geplande berichten cron gestart", {
      scheduledAt: payload.timestamp,
    });

    const nu = new Date().toISOString();

    const { data: due, error: fetchError } = await supabase
      .from("ingeplande_berichten")
      .select("*")
      .eq("status", "wachtend")
      .lte("scheduled_at", nu)
      .limit(50);

    if (fetchError) {
      logger.error("Wachtende berichten ophalen mislukt", {
        error: fetchError.message,
      });
      throw fetchError;
    }

    if (!due || due.length === 0) {
      logger.info("Geen berichten te verwerken");
      return { processed: 0 };
    }

    logger.info(`${due.length} berichten te verwerken`);

    let verzonden = 0;
    let mislukt = 0;

    for (const bericht of due) {
      try {
        const creds = await getUserEmailCredentials(bericht.user_id);
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
          to: bericht.ontvanger,
          subject: bericht.onderwerp,
        };

        if (bericht.html) {
          mailOptions.html = bericht.html;
          mailOptions.text = bericht.body || bericht.onderwerp;
        } else {
          mailOptions.text = bericht.body;
        }

        if (bericht.cc) mailOptions.cc = bericht.cc;

        const bijlagen = (bericht.bijlagen || []) as Array<{
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

        await supabase
          .from("ingeplande_berichten")
          .update({
            status: "verzonden",
            verzonden_op: new Date().toISOString(),
          })
          .eq("id", bericht.id);

        verzonden++;
        logger.info("Bericht verzonden", { id: bericht.id, ontvanger: bericht.ontvanger });
      } catch (err) {
        mislukt++;
        const foutmelding = err instanceof Error ? err.message : String(err);
        await supabase
          .from("ingeplande_berichten")
          .update({ status: "mislukt", foutmelding })
          .eq("id", bericht.id);
        logger.error("Bericht verzenden mislukt", { id: bericht.id, error: foutmelding });
      }
    }

    return { processed: due.length, verzonden, mislukt };
  },
});
