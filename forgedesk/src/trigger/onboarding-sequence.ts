import { schemaTask, wait, logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { Resend } from "resend";
import { getSupabaseAdmin } from "./utils/supabase";

// ─── Helpers ────────────────────────────────────────────────

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY niet geconfigureerd");
  return new Resend(key);
}

const APP_URL =
  process.env.VITE_APP_URL || process.env.APP_URL || "https://app.doen.team";

const FROM = "doen. <noreply@doen.team>";

/**
 * Haal het e-mailadres van de gebruiker op.
 * Eerst user_email_settings, fallback naar auth.users.
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data: settings } = await supabase
    .from("user_email_settings")
    .select("gmail_address")
    .eq("user_id", userId)
    .maybeSingle();

  if (settings?.gmail_address) return settings.gmail_address;

  // Fallback: auth.users
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

/**
 * Check of de gebruiker nog bestaat (niet verwijderd).
 */
async function userExists(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.auth.admin.getUserById(userId);
  return !!data?.user;
}

// ─── Email template builder ─────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface OnboardingEmailParams {
  subject: string;
  greeting: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

function buildOnboardingHtml(p: OnboardingEmailParams): string {
  const ctaBlock = p.ctaUrl
    ? `<tr><td style="padding: 24px 0 0 0;" align="center">
        <a href="${escapeHtml(p.ctaUrl)}" target="_blank" style="display: inline-block; background-color: #F15025; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">
          ${escapeHtml(p.ctaLabel || "Open doen.")}
        </a>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #F5F4F1; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">

        <!-- Logo -->
        <tr><td style="padding: 0 0 24px 0; text-align: center;">
          <span style="font-size: 28px; font-weight: 800; color: #1A1A1A;">doen</span><span style="font-size: 28px; font-weight: 800; color: #F15025;">.</span>
        </td></tr>

        <!-- Card -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);">
            <tr><td style="padding: 36px 36px 32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Greeting -->
                <tr><td style="padding: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A; line-height: 1.3;">
                  ${escapeHtml(p.greeting)}
                </td></tr>

                <!-- Body -->
                <tr><td style="padding: 8px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #1A1A1A; line-height: 1.7;">
                  ${p.bodyHtml}
                </td></tr>

                ${ctaBlock}

              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer: spectrum bar + tagline -->
        <tr><td style="padding: 24px 0 0 0; text-align: center;">
          <div style="height: 3px; border-radius: 2px; background: linear-gradient(90deg, #1A535C, #F15025); margin-bottom: 16px;"></div>
          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #9B9B95;">
            <span style="font-weight: 700;">doen</span><span style="color: #F15025; font-weight: 700;">.</span> slim gedaan, niet?
          </span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Email content per stap ──────────────────────────────────

function buildWelcomeEmail(name: string): OnboardingEmailParams {
  const voornaam = name || "daar";
  return {
    subject: "Welkom bij doen.",
    greeting: `Hey ${voornaam}, welkom!`,
    bodyHtml: `
      <p style="margin: 0 0 16px 0;">
        Goed dat je er bent. Je hebt nu je eigen werkplaats om projecten, offertes en klanten op een plek te beheren.
      </p>
      <p style="margin: 0 0 16px 0; font-weight: 600; color: #1A535C;">
        Twee dingen die je nu kunt doen:
      </p>
      <table cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0;">
        <tr>
          <td style="padding: 0 12px 10px 0; vertical-align: top; font-size: 18px;">1.</td>
          <td style="padding: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #1A1A1A; line-height: 1.6;">
            <strong>Maak je eerste project aan.</strong> Voeg een klant toe, geef het project een naam en je bent onderweg.
          </td>
        </tr>
        <tr>
          <td style="padding: 0 12px 10px 0; vertical-align: top; font-size: 18px;">2.</td>
          <td style="padding: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #1A1A1A; line-height: 1.6;">
            <strong>Stel je bedrijfsprofiel in.</strong> Logo, gegevens, kleuren. Zo zien je offertes en het klantportaal er meteen professioneel uit.
          </td>
        </tr>
      </table>
      <p style="margin: 0; color: #6B6B66;">
        Geen haast. Verken het op je eigen tempo.
      </p>
    `,
    ctaUrl: APP_URL,
    ctaLabel: "Aan de slag",
  };
}

function buildPortaalEmail(name: string): OnboardingEmailParams {
  const voornaam = name || "daar";
  return {
    subject: "Heb je het klantportaal al ontdekt?",
    greeting: `Hey ${voornaam}`,
    bodyHtml: `
      <p style="margin: 0 0 16px 0;">
        Binnen elk project kun je een klantportaal activeren. Dat is een eigen pagina voor je klant, met alleen de dingen die jij deelt: offertes, tekeningen, bestanden.
      </p>
      <p style="margin: 0 0 16px 0;">
        Je klant kan direct goedkeuren, revisies aanvragen of een bericht achterlaten. Geen eindeloze e-mailketens meer.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; border-radius: 8px; margin: 0 0 16px 0;">
        <tr><td style="padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #1A1A1A; line-height: 1.6;">
          <strong style="color: #1A535C;">Zo werkt het:</strong><br>
          Open een project &rarr; klik op "Portaal" &rarr; deel de link met je klant. Klaar.
        </td></tr>
      </table>
      <p style="margin: 0; color: #6B6B66;">
        Je klant heeft geen account nodig. Gewoon openen en reageren.
      </p>
    `,
    ctaUrl: `${APP_URL}/projecten`,
    ctaLabel: "Bekijk je projecten",
  };
}

function buildDaanEmail(name: string): OnboardingEmailParams {
  const voornaam = name || "daar";
  return {
    subject: "Daan staat voor je klaar.",
    greeting: `Hey ${voornaam}`,
    bodyHtml: `
      <p style="margin: 0 0 16px 0;">
        Heb je Daan al gezien? Dat is je AI-assistent in doen. Hij zit rechtsonder in je scherm en kan je helpen met van alles.
      </p>
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1A535C;">
        Wat Daan allemaal kan:
      </p>
      <table cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0;">
        <tr>
          <td style="padding: 0 10px 8px 0; vertical-align: top; color: #F15025; font-weight: bold;">&bull;</td>
          <td style="padding: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #1A1A1A; line-height: 1.6;">
            Offerteteksten schrijven op basis van je projectgegevens
          </td>
        </tr>
        <tr>
          <td style="padding: 0 10px 8px 0; vertical-align: top; color: #F15025; font-weight: bold;">&bull;</td>
          <td style="padding: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #1A1A1A; line-height: 1.6;">
            E-mails opstellen voor klanten
          </td>
        </tr>
        <tr>
          <td style="padding: 0 10px 8px 0; vertical-align: top; color: #F15025; font-weight: bold;">&bull;</td>
          <td style="padding: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #1A1A1A; line-height: 1.6;">
            Vragen beantwoorden over hoe doen. werkt
          </td>
        </tr>
        <tr>
          <td style="padding: 0 10px 8px 0; vertical-align: top; color: #F15025; font-weight: bold;">&bull;</td>
          <td style="padding: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #1A1A1A; line-height: 1.6;">
            Samenvatten wat er in een project speelt
          </td>
        </tr>
      </table>
      <p style="margin: 0; color: #6B6B66;">
        Gewoon typen en kijken wat er gebeurt. Daan leert je bedrijf steeds beter kennen.
      </p>
    `,
    ctaUrl: APP_URL,
    ctaLabel: "Praat met Daan",
  };
}

// ─── Main task ───────────────────────────────────────────────

export const onboardingSequence = schemaTask({
  id: "onboarding.email-sequence",
  schema: z.object({
    userId: z.string().uuid(),
    userEmail: z.string().email(),
    userName: z.string().optional(),
  }),
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload) => {
    const { userId, userEmail, userName } = payload;
    const resend = getResend();
    const voornaam = userName?.split(" ")[0] || "";

    // Bepaal het e-mailadres (payload als fallback, maar check DB voor meest recente)
    const resolveEmail = async (): Promise<string | null> => {
      const dbEmail = await getUserEmail(userId);
      return dbEmail || userEmail;
    };

    // ── Stap 1: Welkom (direct) ──────────────────────────────

    logger.info("Onboarding stap 1: welkomstmail", { userId, userEmail });

    const welcomeEmail = buildWelcomeEmail(voornaam);
    await resend.emails.send({
      from: FROM,
      to: userEmail,
      subject: welcomeEmail.subject,
      html: buildOnboardingHtml(welcomeEmail),
    });

    logger.info("Welkomstmail verstuurd", { userId });

    // ── Wacht 2 dagen (tot dag 3) ────────────────────────────

    await wait.for({ days: 2 });

    // ── Stap 2: Klantportaal (dag 3) ─────────────────────────

    if (!(await userExists(userId))) {
      logger.info("Gebruiker verwijderd, onboarding gestopt", { userId });
      return { completed: false, stoppedAtStep: 2, reason: "user_deleted" };
    }

    const emailDay3 = await resolveEmail();
    if (!emailDay3) {
      logger.warn("Geen e-mailadres gevonden op dag 3", { userId });
      return { completed: false, stoppedAtStep: 2, reason: "no_email" };
    }

    logger.info("Onboarding stap 2: portaal email", { userId, email: emailDay3 });

    const portaalEmail = buildPortaalEmail(voornaam);
    await resend.emails.send({
      from: FROM,
      to: emailDay3,
      subject: portaalEmail.subject,
      html: buildOnboardingHtml(portaalEmail),
    });

    logger.info("Portaal email verstuurd", { userId });

    // ── Wacht 4 dagen (tot dag 7) ────────────────────────────

    await wait.for({ days: 4 });

    // ── Stap 3: Daan AI-assistent (dag 7) ────────────────────

    if (!(await userExists(userId))) {
      logger.info("Gebruiker verwijderd, onboarding gestopt", { userId });
      return { completed: false, stoppedAtStep: 3, reason: "user_deleted" };
    }

    const emailDay7 = await resolveEmail();
    if (!emailDay7) {
      logger.warn("Geen e-mailadres gevonden op dag 7", { userId });
      return { completed: false, stoppedAtStep: 3, reason: "no_email" };
    }

    logger.info("Onboarding stap 3: Daan email", { userId, email: emailDay7 });

    const daanEmail = buildDaanEmail(voornaam);
    await resend.emails.send({
      from: FROM,
      to: emailDay7,
      subject: daanEmail.subject,
      html: buildOnboardingHtml(daanEmail),
    });

    logger.info("Daan email verstuurd, onboarding sequence compleet", { userId });

    return { completed: true, stoppedAtStep: null, reason: null };
  },
});
