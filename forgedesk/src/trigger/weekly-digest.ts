import { schedules, logger } from "@trigger.dev/sdk/v3";
import { Resend } from "resend";
import { getSupabaseAdmin } from "./utils/supabase";

// ─── Dutch currency formatting ───

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Dutch date formatting ───

function formatDateRange(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
  };
  const fromStr = from.toLocaleDateString("nl-NL", opts);
  const toStr = to.toLocaleDateString("nl-NL", {
    ...opts,
    year: "numeric",
  });
  return `${fromStr} – ${toStr}`;
}

// ─── Send raw HTML email via Resend ───

async function sendDigestEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { success: false, error: "RESEND_API_KEY not configured" };

  const resend = new Resend(key);
  try {
    await resend.emails.send({
      from: "doen. <noreply@doen.team>",
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

// ─── Stats per user ───

interface WeeklyStats {
  offertesCreated: number;
  offertesAkkoord: number;
  revenueAkkoord: number;
  facturenCreated: number;
  facturenBetaald: number;
  projectenCreated: number;
  montagesPlanned: number;
}

async function fetchUserStats(
  userId: string,
  from: string,
  to: string
): Promise<WeeklyStats> {
  const supabase = getSupabaseAdmin();

  // Run all queries in parallel for efficiency
  const [
    offertesCreated,
    offertesAkkoord,
    facturenCreated,
    facturenBetaald,
    projectenCreated,
    montagesPlanned,
  ] = await Promise.all([
    // Offertes created
    supabase
      .from("offertes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", from)
      .lt("created_at", to),

    // Offertes with status akkoord (created this week)
    supabase
      .from("offertes")
      .select("totaal")
      .eq("user_id", userId)
      .eq("status", "akkoord")
      .gte("created_at", from)
      .lt("created_at", to),

    // Facturen created
    supabase
      .from("facturen")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", from)
      .lt("created_at", to),

    // Facturen with status betaald
    supabase
      .from("facturen")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "betaald")
      .gte("created_at", from)
      .lt("created_at", to),

    // Projecten created
    supabase
      .from("projecten")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", from)
      .lt("created_at", to),

    // Montages planned this week (by datum, not created_at)
    supabase
      .from("montage_afspraken")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("datum", from)
      .lt("datum", to),
  ]);

  const akkoordRows = offertesAkkoord.data ?? [];
  const revenueAkkoord = akkoordRows.reduce(
    (sum, row) => sum + (Number(row.totaal) || 0),
    0
  );

  return {
    offertesCreated: offertesCreated.count ?? 0,
    offertesAkkoord: akkoordRows.length,
    revenueAkkoord,
    facturenCreated: facturenCreated.count ?? 0,
    facturenBetaald: facturenBetaald.count ?? 0,
    projectenCreated: projectenCreated.count ?? 0,
    montagesPlanned: montagesPlanned.count ?? 0,
  };
}

// ─── Email HTML builder ───

function buildDigestHtml(stats: WeeklyStats, dateRange: string): string {
  const font =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  function statRow(
    label: string,
    value: string | number,
    color?: string
  ): string {
    const valueColor = color || "#1A1A1A";
    return `
      <tr>
        <td style="padding: 12px 0; font-family: ${font}; font-size: 14px; color: #6B6B66; border-bottom: 1px solid #F0EFEC;">
          ${label}
        </td>
        <td style="padding: 12px 0; font-family: ${font}; font-size: 16px; font-weight: 700; color: ${valueColor}; text-align: right; border-bottom: 1px solid #F0EFEC;">
          ${value}
        </td>
      </tr>`;
  }

  const hasActivity =
    stats.offertesCreated > 0 ||
    stats.facturenCreated > 0 ||
    stats.projectenCreated > 0 ||
    stats.montagesPlanned > 0;

  const summaryMessage = hasActivity
    ? "Hier is je overzicht van de afgelopen week."
    : "Een rustige week — soms is dat precies wat je nodig hebt.";

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #F5F4F1; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">

        <!-- Logo -->
        <tr><td style="padding: 0 0 24px 0; text-align: center;">
          <span style="font-family: ${font}; font-size: 24px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.5px;">doen</span><span style="font-family: ${font}; font-size: 24px; font-weight: 800; color: #F15025;">.</span>
        </td></tr>

        <!-- Card -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);">
            <tr><td style="padding: 36px 36px 32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Heading -->
                <tr><td style="padding: 0 0 4px 0; font-family: ${font}; font-size: 22px; font-weight: 700; color: #1A1A1A; line-height: 1.3;">
                  Je week in doen.
                </td></tr>
                <tr><td style="padding: 0 0 24px 0; font-family: ${font}; font-size: 14px; color: #9B9B95;">
                  ${dateRange}
                </td></tr>

                <!-- Intro -->
                <tr><td style="padding: 0 0 24px 0; font-family: ${font}; font-size: 15px; color: #1A1A1A; line-height: 1.6;">
                  ${summaryMessage}
                </td></tr>

                <!-- Offertes section -->
                <tr><td style="padding: 0 0 8px 0; font-family: ${font}; font-size: 12px; font-weight: 700; color: #1A535C; text-transform: uppercase; letter-spacing: 0.5px;">
                  Offertes
                </td></tr>
                <tr><td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${statRow("Aangemaakt", stats.offertesCreated)}
                    ${statRow("Akkoord", stats.offertesAkkoord, "#1A535C")}
                    ${statRow("Omzet akkoord", formatCurrency(stats.revenueAkkoord), "#1A535C")}
                  </table>
                </td></tr>

                <!-- Spacer -->
                <tr><td style="padding: 20px 0 0 0;"></td></tr>

                <!-- Facturen section -->
                <tr><td style="padding: 0 0 8px 0; font-family: ${font}; font-size: 12px; font-weight: 700; color: #1A535C; text-transform: uppercase; letter-spacing: 0.5px;">
                  Facturen
                </td></tr>
                <tr><td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${statRow("Aangemaakt", stats.facturenCreated)}
                    ${statRow("Betaald", stats.facturenBetaald, "#1A535C")}
                  </table>
                </td></tr>

                <!-- Spacer -->
                <tr><td style="padding: 20px 0 0 0;"></td></tr>

                <!-- Projecten & Montage section -->
                <tr><td style="padding: 0 0 8px 0; font-family: ${font}; font-size: 12px; font-weight: 700; color: #1A535C; text-transform: uppercase; letter-spacing: 0.5px;">
                  Projecten & Montage
                </td></tr>
                <tr><td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${statRow("Nieuwe projecten", stats.projectenCreated)}
                    ${statRow("Montages gepland", stats.montagesPlanned)}
                  </table>
                </td></tr>

                <!-- CTA -->
                <tr><td style="padding: 28px 0 0 0;" align="center">
                  <a href="https://app.doen.team" target="_blank" style="display: inline-block; background-color: #1A535C; color: #FFFFFF; font-family: ${font}; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">
                    Open doen. &rarr;
                  </a>
                </td></tr>

              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer with spectrum bar -->
        <tr><td style="padding: 24px 0 0 0;">
          <div style="height: 3px; border-radius: 2px; background: linear-gradient(90deg, #1A535C, #F15025); margin-bottom: 16px;"></div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="font-family: ${font}; font-size: 12px; color: #9B9B95; line-height: 1.6;">
              <span style="font-weight: 700;">doen</span><span style="color: #F15025; font-weight: 700;">.</span> de kracht achter doeners.
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Scheduled task: every Monday 08:00 CET ───

export const weeklyDigestTask = schedules.task({
  id: "weekly-digest",
  // Monday 08:00 CET = 07:00 UTC (CET = UTC+1), but use timezone to handle DST
  cron: {
    pattern: "0 8 * * 1",
    timezone: "Europe/Amsterdam",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
  },
  maxDuration: 300,
  run: async (payload) => {
    const supabase = getSupabaseAdmin();

    // Calculate the date range: previous Monday 00:00 to this Monday 00:00 CET
    const now = payload.timestamp;
    const weekEnd = new Date(now);
    weekEnd.setUTCHours(0, 0, 0, 0);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    const fromISO = weekStart.toISOString();
    const toISO = weekEnd.toISOString();
    const dateRange = formatDateRange(weekStart, weekEnd);

    logger.info("Weekly digest gestart", { from: fromISO, to: toISO });

    // Fetch all users with email settings
    const { data: users, error: usersError } = await supabase
      .from("user_email_settings")
      .select("user_id, gmail_address")
      .not("gmail_address", "is", null);

    if (usersError) {
      throw new Error(`Kon gebruikers niet ophalen: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      logger.info("Geen gebruikers met email gevonden, overgeslagen");
      return { sent: 0, skipped: 0, failed: 0 };
    }

    const subject = `Je week in doen. \u2014 ${dateRange}`;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    // Process all users (run in parallel with allSettled to avoid one failure blocking all)
    const results = await Promise.allSettled(
      users.map(async (user) => {
        if (!user.gmail_address) {
          skipped++;
          return;
        }

        const stats = await fetchUserStats(user.user_id, fromISO, toISO);
        const html = buildDigestHtml(stats, dateRange);
        const result = await sendDigestEmail({
          to: user.gmail_address,
          subject,
          html,
        });

        if (result.success) {
          logger.info("Digest verstuurd", {
            userId: user.user_id,
            email: user.gmail_address,
          });
          return { status: "sent" as const };
        } else {
          logger.error("Digest versturen mislukt", {
            userId: user.user_id,
            error: result.error,
          });
          return { status: "failed" as const, error: result.error };
        }
      })
    );

    for (const result of results) {
      if (result.status === "rejected") {
        failed++;
        logger.error("Onverwachte fout bij digest", {
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      } else if (result.value?.status === "sent") {
        sent++;
      } else if (result.value?.status === "failed") {
        failed++;
      } else {
        skipped++;
      }
    }

    logger.info("Weekly digest afgerond", { sent, skipped, failed });
    return { sent, skipped, failed };
  },
});
