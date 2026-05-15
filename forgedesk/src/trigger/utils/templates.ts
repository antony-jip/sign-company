import { logger } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./supabase";

/**
 * In-trigger fallback voor systeem-templates. Identiek aan
 * `DEFAULT_TEMPLATES` in `src/services/emailTemplateService.ts` en aan
 * de seed in migration 103. Gedupliceerd omdat de trigger-bundler geen
 * imports uit `src/services` accepteert; drift-risico gedocumenteerd in
 * REVIEW_NOTES + issue #16. Wordt gebruikt zodra een org nog niet is
 * geseed (nieuwe trial-org) of bij een DB-flap.
 */
const FALLBACK_TEMPLATES: Record<string, { onderwerp: string; body: string }> = {
  offerte_opvolging_dag1: {
    onderwerp: "Herinnering: offerte {{offerte_nummer}}",
    body: `Hoi {{contactpersoon}},

Een paar dagen geleden stuurden we je offerte {{offerte_nummer}}. Heb je de offerte kunnen bekijken? We horen graag of je nog vragen hebt.

Bekijk de offerte hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  offerte_opvolging_dag7: {
    onderwerp: "Vraag over offerte {{offerte_nummer}}",
    body: `Hoi {{contactpersoon}},

We hebben nog geen reactie ontvangen op offerte {{offerte_nummer}}. Past het tarief, of zijn er onderdelen die we kunnen aanpassen? Laat het ons gerust weten.

Bekijk de offerte hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  factuur_herinnering_1: {
    onderwerp: "Vriendelijke herinnering factuur {{factuur_nummer}}",
    body: `Hoi {{contactpersoon}},

Factuur {{factuur_nummer}} van {{factuur_bedrag}} stond vervallen op {{verval_datum}}. Wil je het bedrag overmaken? Heb je de factuur al voldaan, dan kun je dit bericht negeren.

Bekijk de factuur hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  factuur_herinnering_2: {
    onderwerp: "Tweede herinnering factuur {{factuur_nummer}}",
    body: `Hoi {{contactpersoon}},

Factuur {{factuur_nummer}} van {{factuur_bedrag}} is nog niet voldaan. We willen je vriendelijk verzoeken het bedrag binnen 7 dagen over te maken.

Bekijk de factuur hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  factuur_herinnering_3: {
    onderwerp: "Laatste herinnering factuur {{factuur_nummer}}",
    body: `Hoi {{contactpersoon}},

Dit is de laatste herinnering voor factuur {{factuur_nummer}} van {{factuur_bedrag}}. We ontvangen graag binnen 7 dagen je betaling. Mocht er iets in de weg staan, neem dan contact met ons op.

Bekijk de factuur hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  portaal_uitnodiging: {
    onderwerp: "Welkom in het klantportaal van {{bedrijfsnaam}}",
    body: `Hoi {{contactpersoon}},

Hierbij je persoonlijke toegang tot het klantportaal van {{bedrijfsnaam}}. Je vindt hier alle documenten, offertes en facturen voor project {{project_naam}}.

Open het portaal: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  portaal_herinnering: {
    onderwerp: "Herinnering: actie nodig in je portaal",
    body: `Hoi {{contactpersoon}},

Er staat nog een openstaande actie voor je klaar in het portaal van {{bedrijfsnaam}}. Wil je even kijken wanneer het je uitkomt?

Open het portaal: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  onboarding_dag3: {
    onderwerp: "Aan de slag met doen.",
    body: `Hey {{voornaam}},

Drie dagen geleden ben je begonnen met doen. Hoe bevalt het? We helpen je graag verder als je ergens vastloopt.

Open je dashboard: {{app_url}}

Vragen? Mail ons op hello@doen.team.`,
  },
  onboarding_dag7: {
    onderwerp: "Hoe gaat het met doen.?",
    body: `Hey {{voornaam}},

Een week onderweg met doen. Veel gebruikers vinden de combinatie offertes plus portaal de grootste tijdwinst. Heb je dat al uitgeprobeerd?

Open je dashboard: {{app_url}}

Vragen? Mail ons op hello@doen.team.`,
  },
  trial_reminder_5: {
    onderwerp: "Nog 5 dagen in je proefperiode",
    body: `Hey {{voornaam}},

Je hebt nog 5 dagen in je proefperiode van doen. Activeer je abonnement wanneer je klaar bent om door te gaan. Je houdt al je data.

Bekijk abonnement: {{abonnement_url}}`,
  },
  trial_reminder_2: {
    onderwerp: "Je proefperiode loopt bijna af",
    body: `Hey {{voornaam}},

Je proefperiode van doen. loopt over 2 dagen af. Activeer nu je abonnement om zonder onderbreking door te werken.

Activeer abonnement: {{abonnement_url}}`,
  },
  trial_reminder_0: {
    onderwerp: "Je proefperiode is vandaag afgelopen",
    body: `Hey {{voornaam}},

Je proefperiode van doen. is vandaag afgelopen. Je data blijft bewaard. Activeer je abonnement om weer verder te kunnen werken.

Activeer abonnement: {{abonnement_url}}`,
  },
};

/**
 * Trigger-context template fetcher voor outbound mails. Leest de
 * systeem-template uit `email_templates` via service_role, zodat RLS
 * geen rol speelt. Bij DB-fout of ontbrekende rij (nieuwe org die nog
 * niet geseed is) valt fail-soft terug op `FALLBACK_TEMPLATES` met een
 * warn-log, zodat een trial-reminder ook werkt zolang de seed nog niet
 * heeft gedraaid.
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

  const fallback = FALLBACK_TEMPLATES[triggerTaskNaam];

  if (error) {
    logger.warn("Template-lookup faalde, fallback gebruikt", {
      error: error.message,
      code: error.code,
      organisatieId,
      triggerTaskNaam,
    });
    if (fallback) return fallback;
    throw new Error(`Template-lookup faalde en geen fallback: ${error.message}`);
  }
  if (!data) {
    if (fallback) {
      logger.warn("Geen DB-rij, fallback template gebruikt", { organisatieId, triggerTaskNaam });
      return fallback;
    }
    throw new Error(`Geen systeem-template en geen fallback voor (${organisatieId}, ${triggerTaskNaam})`);
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
