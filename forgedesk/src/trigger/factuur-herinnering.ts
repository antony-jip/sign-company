import { logger, schedules } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import { sendEmailForUser } from "./utils/email";
import { buildPortalEmailHtml } from "./utils/emailTemplate";

/**
 * Automatische betalingsherinneringen — dagelijks 09:30 CET.
 *
 * Alleen voor organisaties met `factuur_opvolging_automatisch` aan (opt-in,
 * Instellingen > Communicatie > Factuur-opvolging). Escalatie na vervaldatum:
 * herinnering_1 (7d) → herinnering_2 (14d) → aanmaning (30d), laagste stap
 * eerst, max één stap per factuur per run en minimaal 5 dagen rust tussen
 * stappen (relevant wanneer de toggle aangaat bij al lang openstaande
 * facturen). Gebruikt dezelfde `*_verstuurd`-vlaggen als de handmatige flow
 * in FacturenLayout, zodat handmatig en automatisch elkaar nooit dubbel
 * mailen. Teksten komen uit dezelfde app_settings-velden die de instellingen-
 * tab bewerkt.
 */

type Stap = "herinnering_1" | "herinnering_2" | "aanmaning";

const MIN_DAGEN_TUSSEN_STAPPEN = 5;

const STANDAARD_TEKSTEN: Record<Stap, { onderwerp: string; inhoud: string }> = {
  herinnering_1: {
    onderwerp: "Herinnering: factuur {factuur_nummer}",
    inhoud:
      "Beste {klant_naam},\n\nGraag herinneren wij u aan factuur {factuur_nummer} ter waarde van {factuur_bedrag}, met vervaldatum {vervaldatum}. De factuur staat nu {dagen_verlopen} dagen open.\n\nWij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk te voldoen. Heeft u al betaald, dan kunt u dit bericht negeren.\n\nMet vriendelijke groet,\n{bedrijfsnaam}",
  },
  herinnering_2: {
    onderwerp: "Tweede herinnering: factuur {factuur_nummer}",
    inhoud:
      "Beste {klant_naam},\n\nOndanks onze eerdere herinnering hebben wij nog geen betaling ontvangen voor factuur {factuur_nummer} ter waarde van {factuur_bedrag}. De vervaldatum was {vervaldatum}, inmiddels {dagen_verlopen} dagen geleden.\n\nWij verzoeken u het bedrag binnen 7 dagen te voldoen. Heeft u al betaald, dan kunt u dit bericht negeren.\n\nMet vriendelijke groet,\n{bedrijfsnaam}",
  },
  aanmaning: {
    onderwerp: "Aanmaning: factuur {factuur_nummer}",
    inhoud:
      "Beste {klant_naam},\n\nOndanks meerdere herinneringen staat factuur {factuur_nummer} ter waarde van {factuur_bedrag} nog altijd open ({dagen_verlopen} dagen na de vervaldatum van {vervaldatum}).\n\nWij verzoeken u dringend het openstaande bedrag binnen 7 dagen te voldoen om verdere stappen te voorkomen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}",
  },
};

function dagenSinds(datum: string): number {
  return Math.floor((Date.now() - new Date(datum).getTime()) / 86_400_000);
}

function replaceVars(tekst: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((r, [k, v]) => r.split(`{${k}}`).join(v), tekst);
}

interface FactuurRow {
  id: string;
  user_id: string;
  klant_id: string | null;
  nummer: string | null;
  titel: string | null;
  totaal: number | null;
  betaald_bedrag: number | null;
  vervaldatum: string | null;
  factuur_type: string | null;
  betaal_link: string | null;
  herinnering_1_verstuurd: string | null;
  herinnering_2_verstuurd: string | null;
  herinnering_3_verstuurd: string | null;
  aanmaning_verstuurd: string | null;
}

export const factuurHerinneringCron = schedules.task({
  id: "factuur-herinnering-cron",
  cron: { pattern: "30 9 * * *", timezone: "Europe/Amsterdam" },
  maxDuration: 300,
  run: async () => {
    const supabase = getSupabaseAdmin();
    const result = { verstuurd: 0, overgeslagen: 0, errors: [] as string[] };

    const { data: settingsRijen, error: settingsError } = await supabase
      .from("app_settings")
      .select(
        "organisatie_id, user_id, updated_at, factuur_opvolging_automatisch, herinnering_1_tekst, herinnering_1_onderwerp, herinnering_2_tekst, herinnering_2_onderwerp, aanmaning_tekst, aanmaning_onderwerp"
      )
      .not("organisatie_id", "is", null)
      .order("updated_at", { ascending: false });

    if (settingsError) {
      // Kolom bestaat pas na migratie 149 — tot die tijd stilletjes klaar
      logger.error("factuur-herinnering: settings query faalde (migratie 149 gedraaid?)", {
        error: settingsError.message,
      });
      return result;
    }

    // Nieuwste rij per organisatie is leidend: orgs kunnen door een
    // historische bug meerdere app_settings-rijen hebben en de frontend
    // leest/schrijft alleen de nieuwste — anders is de uit-toggle geen
    // werkende kill-switch en komen templates uit een verouderde rij.
    const nieuwstePerOrg = new Map<string, NonNullable<typeof settingsRijen>[number]>();
    for (const rij of settingsRijen || []) {
      const orgId = rij.organisatie_id as string;
      if (!nieuwstePerOrg.has(orgId)) nieuwstePerOrg.set(orgId, rij);
    }
    const orgSettings = [...nieuwstePerOrg.values()].filter(
      (r) => r.factuur_opvolging_automatisch === true
    );

    if (orgSettings.length === 0) {
      logger.info("factuur-herinnering: geen organisaties met automatische opvolging");
      return result;
    }

    for (const settings of orgSettings) {
      const orgId = settings.organisatie_id as string;

      const { data: facturen } = await supabase
        .from("facturen")
        .select(
          "id, user_id, klant_id, nummer, titel, totaal, betaald_bedrag, vervaldatum, factuur_type, betaal_link, herinnering_1_verstuurd, herinnering_2_verstuurd, herinnering_3_verstuurd, aanmaning_verstuurd"
        )
        .eq("organisatie_id", orgId)
        .in("status", ["verzonden", "vervallen"])
        .not("vervaldatum", "is", null);

      if (!facturen || facturen.length === 0) continue;

      const { data: org } = await supabase
        .from("organisaties")
        .select("eigenaar_id")
        .eq("id", orgId)
        .maybeSingle();
      const { data: bedrijfsProfiel } = await supabase
        .from("profiles")
        .select("bedrijfsnaam, logo_url")
        .eq("id", org?.eigenaar_id || settings.user_id)
        .maybeSingle();
      const bedrijfsnaam = (bedrijfsProfiel?.bedrijfsnaam as string) || "";

      for (const factuur of facturen as FactuurRow[]) {
        if (factuur.factuur_type === "creditnota" || factuur.factuur_type === "credit") continue;
        if (!factuur.vervaldatum) continue;

        const dagen = dagenSinds(factuur.vervaldatum);
        if (dagen < 7) continue;

        // Deelbetalingen: alleen manen voor wat er echt openstaat
        const openstaand =
          Math.round(((Number(factuur.totaal) || 0) - (Number(factuur.betaald_bedrag) || 0)) * 100) / 100;
        if (openstaand <= 0) {
          result.overgeslagen++;
          continue;
        }

        // Laagste nog-niet-verstuurde stap; herinnering_3 blijft handmatig domein
        let stap: Stap | null = null;
        if (!factuur.herinnering_1_verstuurd && dagen >= 7) stap = "herinnering_1";
        else if (!factuur.herinnering_2_verstuurd && dagen >= 14) stap = "herinnering_2";
        else if (!factuur.aanmaning_verstuurd && dagen >= 30) stap = "aanmaning";
        if (!stap) {
          result.overgeslagen++;
          continue;
        }

        // Handmatig kan elke stap direct kiezen — nooit terugvallen naar een
        // lagere stap nadat een hogere al is verstuurd.
        if (
          stap === "herinnering_1" &&
          (factuur.herinnering_2_verstuurd || factuur.herinnering_3_verstuurd || factuur.aanmaning_verstuurd)
        ) {
          result.overgeslagen++;
          continue;
        }
        if (stap === "herinnering_2" && (factuur.herinnering_3_verstuurd || factuur.aanmaning_verstuurd)) {
          result.overgeslagen++;
          continue;
        }

        const eerdereStappen = [
          factuur.herinnering_1_verstuurd,
          factuur.herinnering_2_verstuurd,
          factuur.herinnering_3_verstuurd,
          factuur.aanmaning_verstuurd,
        ].filter(Boolean) as string[];

        // Vangnet voor geïmporteerde/legacy facturen: heel oud én nog nooit
        // herinnerd → niet ineens automatisch gaan manen.
        if (dagen > 180 && eerdereStappen.length === 0) {
          result.overgeslagen++;
          continue;
        }

        const gesorteerd = [...eerdereStappen].sort();
        const laatsteStap = gesorteerd[gesorteerd.length - 1];
        if (laatsteStap && dagenSinds(laatsteStap) < MIN_DAGEN_TUSSEN_STAPPEN) {
          result.overgeslagen++;
          continue;
        }

        if (!factuur.klant_id) {
          result.overgeslagen++;
          continue;
        }
        const { data: klant } = await supabase
          .from("klanten")
          .select("bedrijfsnaam, contactpersoon, email")
          .eq("id", factuur.klant_id)
          .maybeSingle();
        if (!klant?.email) {
          result.overgeslagen++;
          continue;
        }

        const vars: Record<string, string> = {
          klant_naam: (klant.contactpersoon as string) || (klant.bedrijfsnaam as string) || "klant",
          factuur_nummer: factuur.nummer || "",
          factuur_bedrag: new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(openstaand),
          vervaldatum: new Date(factuur.vervaldatum).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          dagen_verlopen: String(dagen),
          bedrijfsnaam,
          betaal_link: factuur.betaal_link || "",
        };

        const eigenTeksten: Record<Stap, { onderwerp?: string | null; inhoud?: string | null }> = {
          herinnering_1: { onderwerp: settings.herinnering_1_onderwerp, inhoud: settings.herinnering_1_tekst },
          herinnering_2: { onderwerp: settings.herinnering_2_onderwerp, inhoud: settings.herinnering_2_tekst },
          aanmaning: { onderwerp: settings.aanmaning_onderwerp, inhoud: settings.aanmaning_tekst },
        };
        const onderwerp = replaceVars(eigenTeksten[stap].onderwerp || STANDAARD_TEKSTEN[stap].onderwerp, vars);
        const inhoud = replaceVars(eigenTeksten[stap].inhoud || STANDAARD_TEKSTEN[stap].inhoud, vars);

        const html = buildPortalEmailHtml({
          heading: stap === "aanmaning" ? "Aanmaning" : "Betalingsherinnering",
          itemTitel: `Factuur ${factuur.nummer || ""}${factuur.titel ? ` — ${factuur.titel}` : ""}`,
          beschrijving: inhoud,
          ctaLabel: "Factuur betalen →",
          ctaUrl: factuur.betaal_link || undefined,
          bedrijfsnaam: bedrijfsnaam || undefined,
          logoUrl: (bedrijfsProfiel?.logo_url as string) || undefined,
        });

        const sendResult = await sendEmailForUser({
          userId: factuur.user_id,
          to: klant.email as string,
          subject: onderwerp,
          text: inhoud,
          html,
          organisatieId: orgId,
          idempotencyKey: `factuur_herinnering:${factuur.id}:${stap}`,
        });

        if (!sendResult.success) {
          result.errors.push(`Factuur ${factuur.nummer}: ${sendResult.error}`);
          continue;
        }

        const vlagVeld =
          stap === "herinnering_1"
            ? "herinnering_1_verstuurd"
            : stap === "herinnering_2"
              ? "herinnering_2_verstuurd"
              : "aanmaning_verstuurd";
        // Ook bij skipped (idempotency-key bestond al, dus eerder verzonden
        // maar vlag-write toen mislukt) alsnog de vlag zetten — anders zit de
        // ladder permanent vast op deze stap.
        const { error: vlagError } = await supabase
          .from("facturen")
          .update({ [vlagVeld]: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", factuur.id);
        if (vlagError) {
          logger.error("factuur-herinnering: vlag-update mislukt", {
            factuurId: factuur.id,
            veld: vlagVeld,
            error: vlagError.message,
          });
        }

        if (sendResult.skipped) {
          result.overgeslagen++;
          continue;
        }

        await supabase.from("notificaties").insert({
          user_id: factuur.user_id,
          type: "factuur_herinnering",
          titel: `${stap === "aanmaning" ? "Aanmaning" : "Herinnering"} automatisch verstuurd`,
          bericht: `Factuur ${factuur.nummer || ""} — ${vars.klant_naam} (${dagen} dagen over vervaldatum)`,
          link: "/facturen",
          gelezen: false,
        });

        result.verstuurd++;
      }
    }

    logger.info("factuur-herinnering klaar", result);
    return result;
  },
});
