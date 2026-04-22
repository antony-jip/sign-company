import { logger, schedules, metadata } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import { sendSystemEmail } from "./utils/resend";

const APP_URL =
  process.env.VITE_APP_URL || process.env.APP_URL || "https://app.doen.team";

interface ReminderConfig {
  subject: string;
  heading: string;
  ctaLabel: string;
}

function buildReminder(dagenOver: number, voornaam: string): ReminderConfig | null {
  const naam = voornaam || "daar";
  if (dagenOver === 5) {
    return {
      subject: "Nog 5 dagen in je proefperiode",
      heading: `Hey ${naam}, je hebt nog 5 dagen in je proefperiode van doen. Activeer je abonnement wanneer je klaar bent om door te gaan — je houdt al je data.`,
      ctaLabel: "Bekijk abonnement",
    };
  }
  if (dagenOver === 2) {
    return {
      subject: "Je proefperiode loopt bijna af",
      heading: `Hey ${naam}, je proefperiode van doen. loopt over 2 dagen af. Activeer nu je abonnement om zonder onderbreking door te werken.`,
      ctaLabel: "Activeer abonnement",
    };
  }
  if (dagenOver === 0) {
    return {
      subject: "Je proefperiode is vandaag afgelopen",
      heading: `Hey ${naam}, je proefperiode van doen. is vandaag afgelopen. Je data blijft bewaard — activeer je abonnement om weer verder te kunnen werken.`,
      ctaLabel: "Activeer abonnement — €49/maand",
    };
  }
  return null;
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

      const recipients = await getAdminRecipients(supabase, org.id);
      if (recipients.length === 0) {
        overgeslagen++;
        continue;
      }

      for (const recipient of recipients) {
        const reminder = buildReminder(dagenOver, recipient.voornaam);
        if (!reminder) {
          overgeslagen++;
          continue;
        }

        const result = await sendSystemEmail({
          to: recipient.email,
          subject: reminder.subject,
          heading: reminder.heading,
          ctaUrl: `${APP_URL}/instellingen?tab=abonnement`,
          ctaLabel: reminder.ctaLabel,
        });

        if (result.success) {
          verstuurd++;
          logger.info("Trial reminder verstuurd", {
            organisatieId: org.id,
            dagenOver,
            email: recipient.email,
          });
        } else {
          const msg = `org=${org.id}: ${result.error}`;
          errors.push(msg);
          logger.error("Trial reminder verzenden mislukt", { msg });
        }
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
