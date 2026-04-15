import { schedules, logger } from "@trigger.dev/sdk/v3";
import { Resend } from "resend";
import { getSupabaseAdmin } from "./utils/supabase";

// ─── Tabellen die gebackupt worden ───

const BACKUP_TABLES = [
  "klanten",
  "projecten",
  "offertes",
  "offerte_items",
  "offerte_versies",
  "facturen",
  "factuur_items",
  "werkbonnen",
  "werkbon_items",
  "taken",
  "medewerkers",
  "montage_afspraken",
  "documenten",
  "profiles",
  "organisaties",
  "contactpersonen",
  "deals",
] as const;

const BACKUP_EMAIL = "antony@signcompany.nl";

// ─── Elke zondag 03:00 CET ───

export const databaseBackup = schedules.task({
  id: "database-backup-weekly",
  cron: { pattern: "0 3 * * 0", timezone: "Europe/Amsterdam" },
  retry: { maxAttempts: 3 },
  run: async () => {
    logger.info("Database backup gestart");

    const supabase = getSupabaseAdmin();
    const backup: Record<string, unknown[]> = {};
    let totalRecords = 0;
    const errors: string[] = [];

    // Elke tabel ophalen
    for (const table of BACKUP_TABLES) {
      try {
        // Supabase geeft max 1000 per query, dus pagineren
        let allRows: unknown[] = [];
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .range(offset, offset + pageSize - 1);

          if (error) {
            errors.push(`${table}: ${error.message}`);
            hasMore = false;
          } else {
            allRows = allRows.concat(data || []);
            hasMore = (data?.length || 0) === pageSize;
            offset += pageSize;
          }
        }

        backup[table] = allRows;
        totalRecords += allRows.length;
        logger.info(`${table}: ${allRows.length} records`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Onbekende fout";
        errors.push(`${table}: ${msg}`);
        logger.error(`Fout bij ${table}:`, { error: msg });
      }
    }

    // JSON genereren
    const jsonContent = JSON.stringify(backup, null, 0); // compact
    const sizeBytes = new Blob([jsonContent]).size;
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    const datum = new Date().toISOString().split("T")[0];

    logger.info(`Backup compleet: ${totalRecords} records, ${sizeMB} MB`);

    // Base64 encode voor email bijlage
    const base64Content = Buffer.from(jsonContent, "utf-8").toString("base64");

    // Email versturen met bijlage
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      logger.error("RESEND_API_KEY niet geconfigureerd");
      return { success: false, error: "RESEND_API_KEY missing" };
    }

    const resend = new Resend(key);

    const tablesOverview = BACKUP_TABLES.map((t) => {
      const count = backup[t]?.length || 0;
      return `<tr>
        <td style="padding: 6px 16px; font-family: -apple-system, sans-serif; font-size: 13px; color: #6B6B66; border-bottom: 1px solid #F0EFEB;">${t}</td>
        <td style="padding: 6px 16px; font-family: -apple-system, sans-serif; font-size: 13px; font-weight: 600; color: #1A1A1A; border-bottom: 1px solid #F0EFEB; text-align: right; font-variant-numeric: tabular-nums;">${count.toLocaleString("nl-NL")}</td>
      </tr>`;
    }).join("");

    const errorsHtml = errors.length > 0
      ? `<tr><td colspan="2" style="padding: 16px; font-family: -apple-system, sans-serif; font-size: 13px; color: #D03A18; background: #FEF2F0; border-radius: 8px;">
          ⚠️ ${errors.length} fout${errors.length > 1 ? "en" : ""}: ${errors.join(", ")}
        </td></tr>`
      : "";

    try {
      await resend.emails.send({
        from: "doen. <noreply@doen.team>",
        to: BACKUP_EMAIL,
        subject: `✓ Database backup — ${datum} — ${totalRecords.toLocaleString("nl-NL")} records`,
        html: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #F5F4F1;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">
        <tr><td style="padding: 0 0 24px 0; text-align: center;">
          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 24px; font-weight: 800; color: #2b535c; letter-spacing: -0.5px;">doen</span><span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 24px; font-weight: 800; color: #df5c36;">.</span>
          <br/><span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 400; color: #8aacb1; letter-spacing: -0.2px;">slim gedaan.</span>
        </td></tr>
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);">
            <tr><td style="padding: 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 0 0 8px 0; font-family: -apple-system, sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A;">
                  Database backup ${datum}
                </td></tr>
                <tr><td style="padding: 0 0 24px 0; font-family: -apple-system, sans-serif; font-size: 14px; color: #6B6B66;">
                  ${totalRecords.toLocaleString("nl-NL")} records &middot; ${sizeMB} MB &middot; ${BACKUP_TABLES.length} tabellen
                </td></tr>
                ${errorsHtml}
                <tr><td>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #E8E7E3; border-radius: 8px; overflow: hidden;">
                    <tr style="background: #F8F7F5;">
                      <td style="padding: 8px 16px; font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 700; color: #9B9B95; text-transform: uppercase; letter-spacing: 0.05em;">Tabel</td>
                      <td style="padding: 8px 16px; font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 700; color: #9B9B95; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Records</td>
                    </tr>
                    ${tablesOverview}
                  </table>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding: 20px 0 0 0; text-align: center;">
          <span style="font-family: -apple-system, sans-serif; font-size: 11px; color: #9B9B95;">Automatische wekelijkse backup via <span style="font-weight: 700; color: #2b535c;">doen</span><span style="color: #df5c36; font-weight: 700;">.</span></span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        attachments: [
          {
            filename: `doen-backup-${datum}.json`,
            content: base64Content,
          },
        ],
      });

      logger.info("Backup email verzonden naar " + BACKUP_EMAIL);
      return {
        success: true,
        records: totalRecords,
        sizeMB: parseFloat(sizeMB),
        tables: BACKUP_TABLES.length,
        errors,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      logger.error("Email verzenden mislukt:", { error: msg });
      return { success: false, error: msg };
    }
  },
});
