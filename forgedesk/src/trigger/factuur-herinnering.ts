import { logger, schedules } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import { sendEmailForUser } from "./utils/email";
import { buildPortalEmailHtml } from "./utils/emailTemplate";

/**
 * Automatische betalingsherinneringen — dagelijks 09:30 CET.
 *
 * Alleen voor organisaties met `factuur_opvolging_automatisch` aan (opt-in,
 * Instellingen > Communicatie > Factuur-opvolging). Escalatie na vervaldatum
 * volgens de ladder in factuur_opvolg_stappen (per org configureerbaar,
 * migratie 212); zonder eigen rijen geldt de standaard: herinnering_1 (7d) →
 * herinnering_2 (14d) → aanmaning (30d), met herinnering_3 (21d) standaard
 * uit als handmatig domein. Laagste stap eerst, max één stap per factuur per
 * run en minimaal 5 dagen rust tussen stappen. Gebruikt dezelfde
 * `*_verstuurd`-vlaggen als de handmatige flow in FacturenLayout, zodat
 * handmatig en automatisch elkaar nooit dubbel mailen.
 *
 * Kill-switches: klanten.geen_betalingsherinneringen en
 * facturen.opvolging_actief = false. Fail-safe: heeft de org een actieve
 * Exact-koppeling en is de laatste betaalsync (exact_sync_state) ouder dan
 * MAX_SYNC_LEEFTIJD_DAGEN, dan worden herinneringen voor die org
 * overgeslagen — anders manen we klanten die per bank al betaald hebben.
 * Elke verzending (of mislukking) wordt vastgelegd in factuur_opvolg_log.
 *
 * Draait migratie 212 nog niet, dan valt alles terug op het oude gedrag
 * (hardcoded ladder, geen kill-switches, geen log).
 */

type Stap = "herinnering_1" | "herinnering_2" | "herinnering_3" | "aanmaning";

const MIN_DAGEN_TUSSEN_STAPPEN = 5;
const MAX_SYNC_LEEFTIJD_DAGEN = 3;

// Restant-organisatie van een verwijderd account; die rijen mogen nergens
// meer verwerkt worden (zelfde uitsluiting als cron-exact-betaalsync).
const ZOMBIE_ORG = "08352d84-e2be-4760-9436-f468b4327438";

// De handmatige flow blokkeert op dezelfde statussen (useTrialGuard:
// verlopen/opgezegd = geblokkeerd, trial mag wel mailen). Zonder deze guard
// stuurt de cron nog jaren namens een opgezegde organisatie.
const ABONNEMENT_MAG_MAILEN = ["actief", "trial"];

const STANDAARD_LADDER: { stap: Stap; dagen: number; actief: boolean }[] = [
  { stap: "herinnering_1", dagen: 7, actief: true },
  { stap: "herinnering_2", dagen: 14, actief: true },
  { stap: "herinnering_3", dagen: 21, actief: false },
  { stap: "aanmaning", dagen: 30, actief: true },
];

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
  herinnering_3: {
    onderwerp: "Derde herinnering: factuur {factuur_nummer}",
    inhoud:
      "Beste {klant_naam},\n\nFactuur {factuur_nummer} ter waarde van {factuur_bedrag} staat nog altijd open, {dagen_verlopen} dagen na de vervaldatum van {vervaldatum}.\n\nWij verzoeken u het openstaande bedrag per omgaande te voldoen. Heeft u al betaald, dan kunt u dit bericht negeren.\n\nMet vriendelijke groet,\n{bedrijfsnaam}",
  },
  aanmaning: {
    onderwerp: "Aanmaning: factuur {factuur_nummer}",
    inhoud:
      "Beste {klant_naam},\n\nOndanks meerdere herinneringen staat factuur {factuur_nummer} ter waarde van {factuur_bedrag} nog altijd open ({dagen_verlopen} dagen na de vervaldatum van {vervaldatum}).\n\nWij verzoeken u dringend het openstaande bedrag binnen 7 dagen te voldoen om verdere stappen te voorkomen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}",
  },
};

const VLAG_VELD: Record<Stap, string> = {
  herinnering_1: "herinnering_1_verstuurd",
  herinnering_2: "herinnering_2_verstuurd",
  herinnering_3: "herinnering_3_verstuurd",
  aanmaning: "aanmaning_verstuurd",
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
  betaal_token_verloopt_op: string | null;
  herinnering_1_verstuurd: string | null;
  herinnering_2_verstuurd: string | null;
  herinnering_3_verstuurd: string | null;
  aanmaning_verstuurd: string | null;
  opvolging_actief?: boolean | null;
  openstaand_exact?: number | null;
  exact_stand_op?: string | null;
}

interface StapConfig {
  stap: Stap;
  dagen: number;
  actief: boolean;
  kanaal: "email" | "intern";
  onderwerp: string | null;
  inhoud: string | null;
}

export const factuurHerinneringCron = schedules.task({
  id: "factuur-herinnering-cron",
  cron: { pattern: "30 9 * * *", timezone: "Europe/Amsterdam" },
  maxDuration: 300,
  run: async () => {
    const supabase = getSupabaseAdmin();
    const result = { verstuurd: 0, overgeslagen: 0, gepauzeerd: 0, errors: [] as string[] };

    // Migratie 212 gedraaid? Drie standen: succes = v2, PGRST205 = legacy,
    // en elke andere fout breekt de run af. Fail-open zou hier betekenen dat
    // een transiente DB-hik alle kill-switches en de staleness-guard
    // uitschakelt en er tóch gemaild wordt; één dag uitstel is de veilige
    // kant (Trigger.dev retried de run).
    const { error: probeError } = await supabase.from("factuur_opvolg_stappen").select("id").limit(1);
    if (probeError && probeError.code !== "PGRST205") {
      logger.error("factuur-herinnering: probe factuur_opvolg_stappen faalde, run afgebroken", { error: probeError.message });
      throw new Error(`probe factuur_opvolg_stappen faalde: ${probeError.message}`);
    }
    const v2 = !probeError;

    // exact_betaalsync_actief bestaat pas na migratie 211; als deze code
    // geredeployed is vóór die migratie mag de hele run daar niet op
    // stilvallen — dan zonder die kolom opnieuw proberen.
    const basisKolommen =
      "organisatie_id, user_id, updated_at, factuur_opvolging_automatisch, exact_online_connected, herinnering_1_tekst, herinnering_1_onderwerp, herinnering_2_tekst, herinnering_2_onderwerp, aanmaning_tekst, aanmaning_onderwerp";
    let { data: settingsRijen, error: settingsError } = await supabase
      .from("app_settings")
      .select(`${basisKolommen}, exact_betaalsync_actief`)
      .not("organisatie_id", "is", null)
      .order("updated_at", { ascending: false });

    if (settingsError && settingsError.message?.includes("exact_betaalsync_actief")) {
      const fallback = await supabase
        .from("app_settings")
        .select(basisKolommen)
        .not("organisatie_id", "is", null)
        .order("updated_at", { ascending: false });
      settingsRijen = (fallback.data ?? null) as typeof settingsRijen;
      settingsError = fallback.error;
    }

    if (settingsError) {
      // De opvolg-kolommen bestaan pas na migratie 149 — tot die tijd klaar.
      logger.error("factuur-herinnering: settings query faalde (migraties 149/211 gedraaid?)", {
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
      (r) => r.factuur_opvolging_automatisch === true && r.organisatie_id !== ZOMBIE_ORG
    );

    if (orgSettings.length === 0) {
      logger.info("factuur-herinnering: geen organisaties met automatische opvolging");
      return result;
    }

    // Ladder-config per org in één query (v2).
    const ladderPerOrg = new Map<string, Map<Stap, { dagen: number; actief: boolean; kanaal: string; onderwerp: string | null; inhoud: string | null }>>();
    if (v2) {
      const orgIds = orgSettings.map((s) => s.organisatie_id as string);
      const { data: stapRijen } = await supabase
        .from("factuur_opvolg_stappen")
        .select("organisatie_id, stap_type, dagen_na_vervaldatum, kanaal, onderwerp, inhoud, actief")
        .in("organisatie_id", orgIds);
      for (const rij of stapRijen || []) {
        const orgId = rij.organisatie_id as string;
        if (!ladderPerOrg.has(orgId)) ladderPerOrg.set(orgId, new Map());
        ladderPerOrg.get(orgId)!.set(rij.stap_type as Stap, {
          dagen: rij.dagen_na_vervaldatum as number,
          actief: rij.actief as boolean,
          kanaal: (rij.kanaal as string) || "email",
          onderwerp: rij.onderwerp as string | null,
          inhoud: rij.inhoud as string | null,
        });
      }
    }

    const schrijfLog = async (orgId: string, factuur: FactuurRow, stap: Stap, kanaal: string, ontvanger: string | null, onderwerp: string | null, resultaat: string, detail?: string) => {
      if (!v2) return;
      const { error } = await supabase.from("factuur_opvolg_log").insert({
        organisatie_id: orgId,
        factuur_id: factuur.id,
        factuur_nummer: factuur.nummer,
        stap,
        kanaal,
        ontvanger,
        onderwerp,
        resultaat,
        detail: detail ?? null,
      });
      if (error) logger.error("factuur-herinnering: log-insert mislukt", { factuurId: factuur.id, error: error.message });
    };

    for (const settings of orgSettings) {
      const orgId = settings.organisatie_id as string;

      const { data: org } = await supabase
        .from("organisaties")
        .select("eigenaar_id, abonnement_status")
        .eq("id", orgId)
        .maybeSingle();

      // Zonder rij of zonder status: behandelen als trial, net als de app doet.
      const abonnementStatus = (org?.abonnement_status as string) || "trial";
      if (!ABONNEMENT_MAG_MAILEN.includes(abonnementStatus)) {
        result.overgeslagen++;
        logger.info("factuur-herinnering: org overgeslagen, abonnement niet actief", {
          orgId,
          abonnementStatus,
        });
        continue;
      }

      // Fail-safe: bankbetalingen kennen we alleen via de Exact-betaalsync.
      // Is die stand verouderd (koppeling een week down, cron kapot) of
      // loopt de eerste inhaalslag nog (dan is openstaand_exact voor geen
      // enkele factuur geschreven), dan NIET blind doorgaan — dan manen we
      // klanten die al betaald hebben. De guard kijkt naar de settings-vlag
      // ÉN naar het bestaan van een sync-state-rij: de vlag kan op een
      // oudere app_settings-rij staan dan de rij die deze cron leest.
      if (v2) {
        const { data: syncState, error: syncError } = await supabase
          .from("exact_sync_state")
          .select("laatste_sync_op, inhaalslag_bezig")
          .eq("organisatie_id", orgId)
          .maybeSingle();
        // Bestaat exact_sync_state niet (migratie 211 nog niet gedraaid),
        // dan is er geen betaalsync om op te wachten — geen guard.
        // Betaalsync per org uitgezet = bewust push-only; dan is er geen
        // Exact-stand om op te wachten en geldt de guard niet.
        const betaalsyncUit = settings.exact_betaalsync_actief === false;
        const heeftExact = !betaalsyncUit && ((!syncError && !!syncState) || settings.exact_online_connected === true);
        if (heeftExact && (!syncError || syncError.code !== "PGRST205")) {
          const laatsteSync = syncState?.laatste_sync_op as string | null | undefined;
          const inhaalslag = syncState?.inhaalslag_bezig === true;
          const verouderd = !laatsteSync || inhaalslag || dagenSinds(laatsteSync) >= MAX_SYNC_LEEFTIJD_DAGEN;
          if (verouderd) {
            result.gepauzeerd++;
            logger.warn("factuur-herinnering: org gepauzeerd, Exact-betaalsync verouderd", {
              orgId,
              laatsteSync: laatsteSync ?? "nooit",
            });
            const eigenaar = (org?.eigenaar_id as string) || (settings.user_id as string);
            const vandaagStart = new Date();
            vandaagStart.setHours(0, 0, 0, 0);
            const { data: alGemeld } = await supabase
              .from("notificaties")
              .select("id")
              .eq("user_id", eigenaar)
              .eq("type", "factuur_opvolging_gepauzeerd")
              .gte("created_at", vandaagStart.toISOString())
              .limit(1);
            if (!alGemeld || alGemeld.length === 0) {
              await supabase.from("notificaties").insert({
                user_id: eigenaar,
                type: "factuur_opvolging_gepauzeerd",
                titel: "Betalingsherinneringen gepauzeerd",
                bericht: inhaalslag
                  ? "De eerste Exact-inhaalslag loopt nog; herinneringen wachten tot de betaalstand compleet is."
                  : laatsteSync
                    ? `De Exact-betaalstand is ${dagenSinds(laatsteSync)} dagen oud; herinneringen wachten tot de sync weer draait.`
                    : "Er is nog geen Exact-betaalsync gedraaid; herinneringen wachten tot de eerste sync klaar is.",
                link: "/instellingen?tab=integraties",
                gelezen: false,
              });
            }
            continue;
          }
        }
      }

      // openstaand_exact/exact_stand_op komen pas met migratie 211. Staat 212
      // wel en 211 niet, dan faalde deze select en viel de hele motor
      // geluidloos stil; daarom eerst zonder die kolommen opnieuw proberen en
      // pas daarna de org overslaan met een luide fout.
      const basisFactuurKolommen =
        "id, user_id, klant_id, nummer, titel, totaal, betaald_bedrag, vervaldatum, factuur_type, betaal_link, betaal_token_verloopt_op, herinnering_1_verstuurd, herinnering_2_verstuurd, herinnering_3_verstuurd, aanmaning_verstuurd" +
        (v2 ? ", opvolging_actief" : "");
      const factuurKolommen = basisFactuurKolommen + (v2 ? ", openstaand_exact, exact_stand_op" : "");
      const haalFacturen = (kolommen: string) =>
        supabase
          .from("facturen")
          .select(kolommen)
          .eq("organisatie_id", orgId)
          .in("status", ["verzonden", "vervallen"])
          .not("vervaldatum", "is", null);

      let { data: facturen, error: facturenError } = await haalFacturen(factuurKolommen);

      if (
        facturenError &&
        (facturenError.message?.includes("openstaand_exact") || facturenError.message?.includes("exact_stand_op"))
      ) {
        logger.warn("factuur-herinnering: Exact-kolommen ontbreken (migratie 211?), opnieuw zonder", { orgId });
        const zonderExact = await haalFacturen(basisFactuurKolommen);
        facturen = zonderExact.data;
        facturenError = zonderExact.error;
      }

      if (facturenError) {
        logger.error("factuur-herinnering: facturen ophalen mislukt, org overgeslagen", {
          orgId,
          error: facturenError.message,
        });
        result.errors.push(`Org ${orgId}: facturen ophalen mislukt (${facturenError.message})`);
        continue;
      }

      if (!facturen || facturen.length === 0) continue;

      const { data: bedrijfsProfiel } = await supabase
        .from("profiles")
        .select("bedrijfsnaam, logo_url")
        .eq("id", org?.eigenaar_id || settings.user_id)
        .maybeSingle();
      const bedrijfsnaam = (bedrijfsProfiel?.bedrijfsnaam as string) || "";

      const ladder: StapConfig[] = STANDAARD_LADDER.map((std) => {
        const eigen = ladderPerOrg.get(orgId)?.get(std.stap);
        return {
          stap: std.stap,
          dagen: eigen?.dagen ?? std.dagen,
          actief: eigen?.actief ?? std.actief,
          kanaal: (eigen?.kanaal as "email" | "intern") ?? "email",
          onderwerp: eigen?.onderwerp ?? null,
          inhoud: eigen?.inhoud ?? null,
        };
      });

      for (const factuur of facturen as unknown as FactuurRow[]) {
        if (factuur.factuur_type === "creditnota" || factuur.factuur_type === "credit") continue;
        if (!factuur.vervaldatum) continue;

        // Kill-switch per factuur
        if (v2 && factuur.opvolging_actief === false) {
          result.overgeslagen++;
          continue;
        }

        const dagen = dagenSinds(factuur.vervaldatum);

        // Deelbetalingen: alleen manen voor wat er echt openstaat
        const openstaand =
          Math.round(((Number(factuur.totaal) || 0) - (Number(factuur.betaald_bedrag) || 0)) * 100) / 100;
        if (openstaand <= 0) {
          result.overgeslagen++;
          continue;
        }

        // Extra zekering: zegt een verse Exact-stand dat er niets meer
        // openstaat (bank betaald, settle nog onderweg), dan niet manen.
        if (
          v2 &&
          factuur.openstaand_exact != null &&
          factuur.exact_stand_op &&
          dagenSinds(factuur.exact_stand_op) < MAX_SYNC_LEEFTIJD_DAGEN &&
          Number(factuur.openstaand_exact) <= 0.05
        ) {
          result.overgeslagen++;
          continue;
        }

        // Laagste actieve nog-niet-verstuurde stap waarvan de drempel is
        // bereikt; een hogere al-verstuurde stap blokkeert terugvallen.
        const vlagWaarde = (s: Stap): string | null =>
          (factuur as unknown as Record<string, string | null>)[VLAG_VELD[s]] ?? null;
        let stapConfig: StapConfig | null = null;
        for (let i = 0; i < ladder.length; i++) {
          const kandidaat = ladder[i];
          if (!kandidaat.actief) continue;
          if (vlagWaarde(kandidaat.stap)) continue;
          const hogereVerstuurd = ladder.slice(i + 1).some((h) => vlagWaarde(h.stap));
          if (hogereVerstuurd) continue;
          if (dagen >= kandidaat.dagen) stapConfig = kandidaat;
          break;
        }
        if (!stapConfig) {
          result.overgeslagen++;
          continue;
        }
        const stap = stapConfig.stap;

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
        const klantKolommen = "bedrijfsnaam, contactpersoon, email" + (v2 ? ", geen_betalingsherinneringen" : "");
        const { data: klant } = await supabase
          .from("klanten")
          .select(klantKolommen)
          .eq("id", factuur.klant_id)
          .maybeSingle();
        const klantRij = klant as { bedrijfsnaam?: string; contactpersoon?: string; email?: string; geen_betalingsherinneringen?: boolean } | null;

        // Kill-switch per klant
        if (v2 && klantRij?.geen_betalingsherinneringen === true) {
          result.overgeslagen++;
          continue;
        }
        // Ontvanger zoals de app hem kiest: het contact met de
        // factuur-standaard-vlag gaat voor het algemene klantadres.
        let ontvanger = klantRij?.email || null;
        const { data: contactpersonen, error: contactError } = await supabase
          .from("contactpersonen")
          .select("email, is_factuur_standaard")
          .eq("klant_id", factuur.klant_id);
        if (contactError) {
          logger.warn("factuur-herinnering: contactpersonen ophalen mislukt, val terug op klant-e-mail", {
            klantId: factuur.klant_id,
            error: contactError.message,
          });
        } else {
          const standaard = (contactpersonen || []).find(
            (c) => (c as { is_factuur_standaard?: boolean }).is_factuur_standaard === true && (c as { email?: string }).email
          );
          if (standaard) ontvanger = (standaard as { email: string }).email;
        }

        // Een intern-signaal-stap heeft geen klantadres nodig; alleen het
        // email-kanaal strandt op een ontbrekend adres.
        if (!ontvanger && stapConfig.kanaal === "email") {
          result.overgeslagen++;
          // Deze skip was permanent stil: de gebruiker zag nooit waarom er
          // niets gebeurde. Eén logregel per factuur volstaat als bewijs.
          if (v2) {
            const { data: alGelogd } = await supabase
              .from("factuur_opvolg_log")
              .select("id")
              .eq("factuur_id", factuur.id)
              .eq("resultaat", "overgeslagen_geen_email")
              .limit(1);
            if (!alGelogd || alGelogd.length === 0) {
              await schrijfLog(
                orgId,
                factuur,
                stap,
                stapConfig.kanaal,
                null,
                null,
                "overgeslagen_geen_email",
                "Klant en factuur-contactpersoon hebben geen e-mailadres"
              );
            }
          }
          continue;
        }

        // Het betaal-token verloopt na 92 dagen; een CTA naar een verlopen
        // link levert de klant een 410 op. Dan liever geen knop.
        const betaalTokenGeldig =
          !factuur.betaal_token_verloopt_op || new Date(factuur.betaal_token_verloopt_op).getTime() > Date.now();
        const betaallink = betaalTokenGeldig ? factuur.betaal_link : null;

        const vars: Record<string, string> = {
          klant_naam: klantRij?.contactpersoon || klantRij?.bedrijfsnaam || "klant",
          factuur_nummer: factuur.nummer || "",
          factuur_bedrag: new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(openstaand),
          vervaldatum: new Date(factuur.vervaldatum).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          dagen_verlopen: String(dagen),
          bedrijfsnaam,
          betaal_link: betaallink || "",
        };

        // Tekst-voorrang: stap-rij (v2) → app_settings-velden → standaard.
        const appSettingsTeksten: Partial<Record<Stap, { onderwerp?: string | null; inhoud?: string | null }>> = {
          herinnering_1: { onderwerp: settings.herinnering_1_onderwerp, inhoud: settings.herinnering_1_tekst },
          herinnering_2: { onderwerp: settings.herinnering_2_onderwerp, inhoud: settings.herinnering_2_tekst },
          aanmaning: { onderwerp: settings.aanmaning_onderwerp, inhoud: settings.aanmaning_tekst },
        };
        const onderwerp = replaceVars(
          stapConfig.onderwerp || appSettingsTeksten[stap]?.onderwerp || STANDAARD_TEKSTEN[stap].onderwerp,
          vars
        );
        const inhoud = replaceVars(
          stapConfig.inhoud || appSettingsTeksten[stap]?.inhoud || STANDAARD_TEKSTEN[stap].inhoud,
          vars
        );

        // Kanaal 'intern': geen klantmail, alleen een notificatie voor het
        // team — voor orgs die zelf willen bellen bij deze stap.
        if (stapConfig.kanaal === "intern") {
          const { error: internNotifError } = await supabase.from("notificaties").insert({
            user_id: factuur.user_id,
            type: "factuur_herinnering",
            titel: `Opvolgstap ${stap.replace("_", " ")} bereikt`,
            bericht: `Factuur ${factuur.nummer || ""} — ${vars.klant_naam} (${dagen} dagen over vervaldatum). Kanaal staat op intern: zelf contact opnemen.`,
            link: "/facturen",
            gelezen: false,
          });
          if (internNotifError) {
            // De stap niet consumeren als niemand het signaal zag: geen vlag,
            // anders escaleert de ladder over vijf dagen langs een stap die
            // nooit is aangekomen.
            logger.error("factuur-herinnering: interne notificatie mislukt", { factuurId: factuur.id, error: internNotifError.message });
            result.errors.push(`Factuur ${factuur.nummer}: interne notificatie mislukt`);
            await schrijfLog(orgId, factuur, stap, "intern", null, onderwerp, "fout", internNotifError.message);
            continue;
          }
          const { error: vlagError } = await supabase
            .from("facturen")
            .update({ [VLAG_VELD[stap]]: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", factuur.id);
          if (vlagError) {
            logger.error("factuur-herinnering: vlag-update mislukt", { factuurId: factuur.id, error: vlagError.message });
          }
          await schrijfLog(orgId, factuur, stap, "intern", null, onderwerp, "verstuurd");
          result.verstuurd++;
          continue;
        }

        const html = buildPortalEmailHtml({
          heading: stap === "aanmaning" ? "Aanmaning" : "Betalingsherinnering",
          itemTitel: `Factuur ${factuur.nummer || ""}${factuur.titel ? ` — ${factuur.titel}` : ""}`,
          beschrijving: inhoud,
          ctaLabel: "Factuur betalen →",
          ctaUrl: betaallink || undefined,
          bedrijfsnaam: bedrijfsnaam || undefined,
          logoUrl: (bedrijfsProfiel?.logo_url as string) || undefined,
        });

        // Na de intern-tak hierboven is dit gegarandeerd het email-kanaal en
        // heeft de guard een lege ontvanger al weggefilterd.
        if (!ontvanger) {
          result.overgeslagen++;
          continue;
        }
        const sendResult = await sendEmailForUser({
          userId: factuur.user_id,
          to: ontvanger,
          subject: onderwerp,
          text: inhoud,
          html,
          organisatieId: orgId,
          idempotencyKey: `factuur_herinnering:${factuur.id}:${stap}`,
        });

        if (!sendResult.success) {
          result.errors.push(`Factuur ${factuur.nummer}: ${sendResult.error}`);
          await schrijfLog(orgId, factuur, stap, "email", ontvanger, onderwerp, "fout", sendResult.error);
          continue;
        }

        // Ook bij skipped (idempotency-key bestond al, dus eerder verzonden
        // maar vlag-write toen mislukt) alsnog de vlag zetten — anders zit de
        // ladder permanent vast op deze stap.
        const { error: vlagError } = await supabase
          .from("facturen")
          .update({ [VLAG_VELD[stap]]: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", factuur.id);
        if (vlagError) {
          logger.error("factuur-herinnering: vlag-update mislukt", {
            factuurId: factuur.id,
            veld: VLAG_VELD[stap],
            error: vlagError.message,
          });
        }

        if (sendResult.skipped) {
          await schrijfLog(orgId, factuur, stap, "email", ontvanger, onderwerp, "overgeslagen_idempotent");
          result.overgeslagen++;
          continue;
        }

        await schrijfLog(orgId, factuur, stap, "email", ontvanger, onderwerp, "verstuurd");

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
