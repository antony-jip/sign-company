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

// Spiegel van STANDAARD_HERINNERING_TEKSTEN in src/services/factuurService.ts:
// de cron draait los van de app-bundel en houdt bewust een eigen kopie.
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
  contactpersoon_id: string | null;
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

interface KlantRij {
  id: string;
  bedrijfsnaam?: string | null;
  contactpersoon?: string | null;
  email?: string | null;
  contactpersonen?: unknown;
  geen_betalingsherinneringen?: boolean | null;
}

// klanten.contactpersonen is JSONB, maar komt bij oudere imports als string
// terug. Spiegel van parseContactpersonenJson in src/services/factuurService.ts.
function parseContactpersonenJson(waarde: unknown): Array<{ id?: string; email?: string }> {
  let rauw = waarde;
  if (typeof rauw === "string") {
    try {
      rauw = JSON.parse(rauw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(rauw)) return [];
  return (rauw as unknown[]).filter((c): c is { id?: string; email?: string } => !!c && typeof c === "object");
}

function schoonEmail(waarde: unknown): string | null {
  const adres = typeof waarde === "string" ? waarde.trim() : "";
  return adres || null;
}

interface ContactRij {
  id: string;
  klant_id: string | null;
  email: string | null;
  is_factuur_standaard?: boolean | null;
  organisatie_id?: string | null;
}

// PostgREST stuurt een .in()-filter als querystring mee; een org met honderden
// openstaande facturen zou anders een URL bouwen die de proxy weigert.
function inStukken<T>(waarden: T[], maat = 120): T[][] {
  const stukken: T[][] = [];
  for (let i = 0; i < waarden.length; i += maat) stukken.push(waarden.slice(i, i + maat));
  return stukken;
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

    // exact_betaalsync_actief (migratie 211) en herinnering_bcc_adres
    // (migratie 215) bestaan mogelijk nog niet; als deze code geredeployed
    // is vóór die migraties mag de hele run daar niet op stilvallen — dan
    // zonder de ontbrekende kolommen opnieuw proberen (de foutmelding van
    // PostgREST noemt de kolomnaam).
    const basisKolommen =
      "organisatie_id, user_id, updated_at, factuur_opvolging_automatisch, exact_online_connected, herinnering_1_tekst, herinnering_1_onderwerp, herinnering_2_tekst, herinnering_2_onderwerp, aanmaning_tekst, aanmaning_onderwerp";
    interface SettingsRij {
      organisatie_id: string;
      user_id: string;
      updated_at: string;
      factuur_opvolging_automatisch: boolean | null;
      exact_online_connected: boolean | null;
      exact_betaalsync_actief?: boolean | null;
      herinnering_bcc_adres?: string | null;
      herinnering_1_tekst: string | null;
      herinnering_1_onderwerp: string | null;
      herinnering_2_tekst: string | null;
      herinnering_2_onderwerp: string | null;
      aanmaning_tekst: string | null;
      aanmaning_onderwerp: string | null;
    }
    const optioneleKolommen = ["exact_betaalsync_actief", "herinnering_bcc_adres"];
    let actieveOptioneel = [...optioneleKolommen];
    // De kolomlijst is dynamisch, dus PostgREST kan de rijen niet typen;
    // SettingsRij is de handmatige spiegel van de select hierboven.
    const selecteerSettings = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select([basisKolommen, ...actieveOptioneel].join(", "))
        .not("organisatie_id", "is", null)
        .order("updated_at", { ascending: false });
      return { data: data as unknown as SettingsRij[] | null, error };
    };
    let { data: settingsRijen, error: settingsError } = await selecteerSettings();
    while (settingsError && actieveOptioneel.some((k) => settingsError!.message?.includes(k))) {
      actieveOptioneel = actieveOptioneel.filter((k) => !settingsError!.message?.includes(k));
      ({ data: settingsRijen, error: settingsError } = await selecteerSettings());
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
                  ? "De Exact-betaalsync is de stand nog aan het inhalen; herinneringen wachten tot de betaalstand compleet is."
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
        "id, user_id, klant_id, contactpersoon_id, nummer, titel, totaal, betaald_bedrag, vervaldatum, factuur_type, betaal_link, betaal_token_verloopt_op, herinnering_1_verstuurd, herinnering_2_verstuurd, herinnering_3_verstuurd, aanmaning_verstuurd" +
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

      const factuurRijen = facturen as unknown as FactuurRow[];

      // Klanten en contactpersonen in een handvol queries per org in plaats van
      // twee roundtrips per factuur; bij 300 openstaande facturen scheelde dat
      // 600 losse calls binnen één cron-run.
      const klantIds = [...new Set(factuurRijen.map((f) => f.klant_id).filter(Boolean) as string[])];
      const factuurCpIds = [...new Set(factuurRijen.map((f) => f.contactpersoon_id).filter(Boolean) as string[])];

      const klantPerId = new Map<string, KlantRij>();
      if (klantIds.length > 0) {
        // contactpersonen (JSONB) hoort er altijd bij: facturen.contactpersoon_id
        // heeft bewust geen FK en kan naar een contact in die kolom wijzen.
        const klantKolommen =
          "id, bedrijfsnaam, contactpersoon, email, contactpersonen" + (v2 ? ", geen_betalingsherinneringen" : "");
        let klantenFout: string | null = null;
        for (const stuk of inStukken(klantIds)) {
          const { data, error } = await supabase
            .from("klanten")
            .select(klantKolommen)
            .in("id", stuk)
            .eq("organisatie_id", orgId);
          if (error) {
            klantenFout = error.message;
            break;
          }
          for (const rij of (data || []) as unknown as KlantRij[]) klantPerId.set(rij.id, rij);
        }
        if (klantenFout) {
          logger.error("factuur-herinnering: klanten ophalen mislukt, org overgeslagen", { orgId, error: klantenFout });
          result.errors.push(`Org ${orgId}: klanten ophalen mislukt (${klantenFout})`);
          continue;
        }
      }

      // Twee id-sets: de contactpersonen van de klanten (voor de
      // is_factuur_standaard-route) en die waar facturen.contactpersoon_id
      // rechtstreeks naar wijst. contactpersonen.organisatie_id bestaat wel
      // (migratie_041) maar is op oude rijen niet gevuld, dus de org-controle
      // leunt in eerste instantie op de klant-koppeling: die klant is hierboven
      // al op organisatie_id gefilterd.
      const contactPerKlant = new Map<string, ContactRij[]>();
      const contactPerId = new Map<string, ContactRij>();
      const contactKolommen = "id, klant_id, email, is_factuur_standaard, organisatie_id";
      const haalContacten = async (kolom: "klant_id" | "id", ids: string[]): Promise<string | null> => {
        for (const stuk of inStukken(ids)) {
          let { data, error } = await supabase.from("contactpersonen").select(contactKolommen).in(kolom, stuk);
          if (error && error.message?.includes("organisatie_id")) {
            const zonderOrg = await supabase
              .from("contactpersonen")
              .select("id, klant_id, email, is_factuur_standaard")
              .in(kolom, stuk);
            data = zonderOrg.data as typeof data;
            error = zonderOrg.error;
          }
          if (error) return error.message;
          for (const rij of (data || []) as unknown as ContactRij[]) {
            contactPerId.set(rij.id, rij);
            if (rij.klant_id) {
              const lijst = contactPerKlant.get(rij.klant_id);
              if (lijst) lijst.push(rij);
              else contactPerKlant.set(rij.klant_id, [rij]);
            }
          }
        }
        return null;
      };
      const contactFout =
        (klantIds.length > 0 ? await haalContacten("klant_id", klantIds) : null) ??
        (factuurCpIds.length > 0 ? await haalContacten("id", factuurCpIds) : null);
      if (contactFout) {
        logger.warn("factuur-herinnering: contactpersonen ophalen mislukt, val terug op klant-e-mail", {
          orgId,
          error: contactFout,
        });
      }

      for (const factuur of factuurRijen) {
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
        const klantRij = klantPerId.get(factuur.klant_id) || null;
        // Geen klantrij binnen deze org: de factuur hoort bij een klant van een
        // andere organisatie of de klant is verwijderd. Niet mailen.
        if (!klantRij) {
          result.overgeslagen++;
          continue;
        }

        // Kill-switch per klant
        if (v2 && klantRij.geen_betalingsherinneringen === true) {
          result.overgeslagen++;
          continue;
        }

        // Ontvanger-volgorde van migratie 101, gelijk aan
        // factuurService.bepaalHerinneringOntvanger: (1) het contact dat op de
        // factuur staat, (2) datzelfde id in de klanten.contactpersonen-JSONB
        // (de contactkiezer zet nieuwe contacten daar neer, zonder rij in de
        // contactpersonen-tabel), (3) het factuur-standaard-contact van de
        // klant, (4) het algemene klantadres.
        const factuurContact = factuur.contactpersoon_id ? contactPerId.get(factuur.contactpersoon_id) : undefined;
        const factuurContactVanDezeOrg =
          !!factuurContact &&
          !!factuurContact.email &&
          (factuurContact.klant_id === factuur.klant_id || factuurContact.organisatie_id === orgId);
        const jsonbContactEmail = factuur.contactpersoon_id
          ? schoonEmail(
              parseContactpersonenJson(klantRij.contactpersonen).find((c) => c.id === factuur.contactpersoon_id)?.email
            )
          : null;
        const standaardContact = (contactPerKlant.get(factuur.klant_id) || []).find(
          (c) => c.is_factuur_standaard === true && c.email
        );
        const ontvanger =
          (factuurContactVanDezeOrg ? factuurContact!.email : null) ||
          jsonbContactEmail ||
          standaardContact?.email ||
          klantRij.email ||
          null;

        // Een intern-signaal-stap heeft geen klantadres nodig; alleen het
        // email-kanaal strandt op een ontbrekend adres.
        if (!ontvanger && stapConfig.kanaal === "email") {
          result.overgeslagen++;
          // Deze skip was permanent stil: de gebruiker zag nooit waarom er
          // niets gebeurde. Eén logregel per factuur én per stap: strandt een
          // latere stap opnieuw, dan hoort daar een eigen bewijsregel bij.
          if (v2) {
            const { data: alGelogd } = await supabase
              .from("factuur_opvolg_log")
              .select("id")
              .eq("factuur_id", factuur.id)
              .eq("stap", stap)
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
        // Kopie naar het eigen ingestelde BCC-adres, zodat de administratie
        // meekijkt met wat er daadwerkelijk naar de klant gaat.
        const bccAdres = typeof settings.herinnering_bcc_adres === "string" && settings.herinnering_bcc_adres.includes("@")
          ? settings.herinnering_bcc_adres.trim()
          : undefined;
        const sendResult = await sendEmailForUser({
          userId: factuur.user_id,
          to: ontvanger,
          subject: onderwerp,
          text: inhoud,
          html,
          bcc: bccAdres,
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
