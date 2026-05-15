import { logger, schedules, metadata } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import { sendSystemEmail } from "./utils/resend";
import { getTemplateAdmin, renderTriggerTemplate } from "./utils/templates";
import { buildKey, checkAndMark, rollbackKey } from "./utils/idempotency";

const APP_URL =
  process.env.VITE_APP_URL || process.env.APP_URL || "https://app.doen.team";

const DEFAULT_OFFSETS = [5, 2, 0];

function triggerNaamVoorOffset(dagenOver: number): string {
  return `trial_reminder_${dagenOver}`;
}

async function getAdminRecipients(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  organisatieId: string
): Promise<Array<{ email: string; voornaam: string }>> {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, voornaam, email")
    .eq("organisatie_id", organisatieId)
    .eq("rol", "admin");

  if (!profiles || profiles.length === 0) return [];

  const recipients: Array<{ email: string; voornaam: string }> = [];
  for (const profile of profiles) {
    if (!profile.id) continue;
    let email = profile.email as string | null;
    if (!email) {
      const { data } = await supabase.auth.admin.getUserById(profile.id);
      email = data?.user?.email ?? null;
    }
    if (!email) continue;
    recipients.push({ email, voornaam: (profile.voornaam as string) || "" });
  }
  return recipients;
}

/**
 * Scheduled task: stuurt reminder-emails naar organisaties met een
 * naderende trial-einddatum (5, 2 en 0 dagen).
 *
 * Draait dagelijks om 09:00 Europe/Amsterdam. Deduplicatie via datum-match:
 * omdat de cron exact 1× per dag draait per (dagenOver) stap, krijgt een
 * organisatie elke reminder maximaal één keer.
 */
export const trialReminderCron = schedules.task({
  id: "trial-reminder-cron",
  cron: { pattern: "0 9 * * *", timezone: "Europe/Amsterdam" },
  maxDuration: 300,
  run: async (payload) => {
    const supabase = getSupabaseAdmin();

    logger.info("Trial reminder cron gestart", {
      scheduledAt: payload.timestamp,
    });

    metadata.set("status", "scanning");

    const { data: organisaties, error } = await supabase
      .from("organisaties")
      .select("id, naam, trial_einde, abonnement_status")
      .eq("abonnement_status", "trial");

    if (error) {
      logger.error("Ophalen trial organisaties mislukt", { error: error.message });
      throw error;
    }

    if (!organisaties || organisaties.length === 0) {
      logger.info("Geen organisaties in trial");
      return { verstuurd: 0, overgeslagen: 0, errors: [] };
    }

    const vandaag = new Date();
    vandaag.setUTCHours(0, 0, 0, 0);

    let verstuurd = 0;
    let overgeslagen = 0;
    const errors: string[] = [];

    for (const org of organisaties) {
      if (!org.trial_einde) {
        overgeslagen++;
        continue;
      }

      const einde = new Date(org.trial_einde);
      einde.setUTCHours(0, 0, 0, 0);
      const dagenOver = Math.round(
        (einde.getTime() - vandaag.getTime()) / (1000 * 60 * 60 * 24)
      );

      const { data: settings } = await supabase
        .from("app_settings")
        .select("trial_reminder_offsets")
        .eq("organisatie_id", org.id)
        .maybeSingle();
      const offsets: number[] = (settings?.trial_reminder_offsets as number[] | null) ?? DEFAULT_OFFSETS;
      if (!offsets.includes(dagenOver)) {
        overgeslagen++;
        continue;
      }

      const recipients = await getAdminRecipients(supabase, org.id);
      if (recipients.length === 0) {
        overgeslagen++;
        continue;
      }

      const idempotencyKey = buildKey("trial_reminder", org.id, dagenOver);
      const fresh = await checkAndMark(org.id, idempotencyKey);
      if (!fresh) {
        logger.info("Trial reminder al verzonden vandaag, overgeslagen", {
          organisatieId: org.id,
          dagenOver,
        });
        overgeslagen++;
        continue;
      }

      let template: { onderwerp: string; body: string };
      try {
        template = await getTemplateAdmin(org.id, triggerNaamVoorOffset(dagenOver));
      } catch (err) {
        await rollbackKey(org.id, idempotencyKey);
        const msg = `org=${org.id}: ${err instanceof Error ? err.message : "template-fetch failed"}`;
        errors.push(msg);
        logger.error("Trial reminder template-fetch mislukt", { msg });
        continue;
      }

      let sendErrors = 0;
      for (const recipient of recipients) {
        const vars: Record<string, string> = {
          voornaam: recipient.voornaam || "daar",
          abonnement_url: `${APP_URL}/instellingen?tab=abonnement`,
        };
        const onderwerp = renderTriggerTemplate(template.onderwerp, vars);
        const heading = renderTriggerTemplate(template.body, vars);

        const result = await sendSystemEmail({
          to: recipient.email,
          subject: onderwerp,
          heading,
          ctaUrl: `${APP_URL}/instellingen?tab=abonnement`,
          ctaLabel: "Bekijk abonnement",
        });

        if (result.success) {
          verstuurd++;
          logger.info("Trial reminder verstuurd", {
            organisatieId: org.id,
            dagenOver,
            email: recipient.email,
          });
        } else {
          sendErrors++;
          const msg = `org=${org.id}: ${result.error}`;
          errors.push(msg);
          logger.error("Trial reminder verzenden mislukt", { msg });
        }
      }
      if (sendErrors === recipients.length) {
        await rollbackKey(org.id, idempotencyKey);
      }
    }

    metadata.set("status", "completed");
    logger.info("Trial reminder cron klaar", {
      totaal: organisaties.length,
      verstuurd,
      overgeslagen,
      errors: errors.length,
    });

    return { verstuurd, overgeslagen, errors };
  },
});
