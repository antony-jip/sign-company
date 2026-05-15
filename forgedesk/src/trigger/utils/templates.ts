import { logger } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./supabase";

/**
 * Trigger-context template fetcher voor outbound mails. Leest de
 * systeem-template uit `email_templates` via service_role, zodat RLS
 * geen rol speelt. Throws bij onbekende rij of DB-fout: trigger-task
 * vangt dat op en logt — we sturen liever geen mail dan een mail met
 * ontbrekende inhoud.
 *
 * In de UI loopt template-fetch via `emailTemplateService.getTemplate`
 * die WEL fallback heeft op `DEFAULT_TEMPLATES`. Beide bronnen zouden
 * inhoudelijk gelijk moeten zijn omdat migration 103 dezelfde defaults
 * seedt; bij discrepantie wint de DB (= bron van waarheid voor trigger).
 */
export async function getTemplateAdmin(
  organisatieId: string,
  triggerTaskNaam: string,
): Promise<{ onderwerp: string; body: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("email_templates")
    .select("onderwerp, body")
    .eq("organisatie_id", organisatieId)
    .eq("trigger_task_naam", triggerTaskNaam)
    .eq("is_systeem", true)
    .maybeSingle();

  if (error) {
    logger.error("Template-lookup faalde", {
      error: error.message,
      code: error.code,
      organisatieId,
      triggerTaskNaam,
    });
    throw new Error(`Template-lookup faalde: ${error.message}`);
  }
  if (!data) {
    logger.error("Geen systeem-template gevonden", { organisatieId, triggerTaskNaam });
    throw new Error(`Geen systeem-template voor (${organisatieId}, ${triggerTaskNaam})`);
  }
  return { onderwerp: data.onderwerp, body: data.body };
}

/**
 * Single-pass renderer voor systeem-template-strings. Accepteert
 * `{{var}}` (canoniek) en `{var}` (legacy). Onbekende placeholders
 * blijven staan zodat fouten zichtbaar zijn in mail-logs. Gedupliceerd
 * vanuit `src/utils/templateRender.ts` omdat trigger-bundler geen
 * imports uit `src/services` of `src/utils` accepteert.
 */
export function renderTriggerTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(
    /\{\{(\w+)\}\}|\{(\w+)\}/g,
    (match, doubleKey: string | undefined, singleKey: string | undefined) => {
      const key = doubleKey ?? singleKey ?? "";
      const value = vars[key];
      return value !== undefined ? value : match;
    },
  );
}
