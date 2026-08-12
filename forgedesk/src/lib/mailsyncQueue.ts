// Beslislogica van de mailsync-wachtrij (migratie 202, docs/plan-mailsync-queue.md).
//
// WAAROM DIT BESTAND IN src/ STAAT TERWIJL DE CONSUMENT IN api/ ZIT.
// `api/*` mag niets uit `src/` importeren (CLAUDE.md §2) en valt daardoor
// buiten de tsconfig én buiten `npm run build`. Er is dus geen enkele
// automatische poort op die bestanden. Deze module is de getypte, geteste
// tweeling: het blok tussen de twee GEDEELD-markers hieronder staat
// letterlijk ook in `api/cron-mailsync-werker.ts` en `api/fetch-emails.ts`,
// en `tests/lib/mailsyncQueue.test.ts` faalt zodra die kopieën uit de pas
// lopen. Wijzig het blok dus in alle drie de bestanden of in geen enkele.
//
// De vlagresolutie is een kopie van `bepaalStand` uit `src/lib/featureFlags.ts`
// en moet daar gelijk aan blijven; de test bewaakt ook dat.

// ── GEDEELD-MET-API BEGIN ──────────────────────────────────────────────
// Letterlijke kopie in api/cron-mailsync-werker.ts en api/fetch-emails.ts.
// Bewust zonder imports, zodat het blok in een standalone api-bestand past.

type FlagStand = 'aan' | 'uit' | 'onbekend'

interface FeatureFlagRij {
  naam: string
  organisatie_id: string | null
  aan: boolean
}

// Serverkant van migratie 200. Zelfde rangorde als src/lib/featureFlags.ts:
// een globale false is een noodstop die geen org-rij kan overrulen, een
// org-rij gaat vóór een globale true, en géén rij is 'onbekend'.
function bepaalStand(
  naam: string,
  rijen: readonly FeatureFlagRij[],
  organisatieId: string | null,
): FlagStand {
  const vanDezeFlag = rijen.filter((r) => r.naam === naam)
  const globaal = vanDezeFlag.find((r) => r.organisatie_id == null)

  if (globaal && !globaal.aan) return 'uit'

  const perOrg = organisatieId
    ? vanDezeFlag.find((r) => r.organisatie_id === organisatieId)
    : undefined
  if (perOrg) return perOrg.aan ? 'aan' : 'uit'

  if (globaal) return 'aan'
  return 'onbekend'
}

// Faalt dicht: alles wat geen expliciete 'aan' is houdt het nieuwe pad uit.
function vlagStaatAan(
  naam: string,
  rijen: readonly FeatureFlagRij[],
  organisatieId: string | null,
): boolean {
  return bepaalStand(naam, rijen, organisatieId) === 'aan'
}

// Faalt dicht op transportniveau: een queryfout of een ontbrekende tabel
// levert nul rijen, dus staat geen enkele flag op 'aan'. De serverkant heeft
// geen bestaand gedrag te beschermen — hier is stil niets doen het juiste.
async function veiligeVlagRijen(
  laad: () => Promise<FeatureFlagRij[]>,
  onFout?: (fout: unknown) => void,
): Promise<FeatureFlagRij[]> {
  try {
    return await laad()
  } catch (fout) {
    onFout?.(fout)
    return []
  }
}

type TaakStatus = 'wachtend' | 'verwerken' | 'gedaan' | 'mislukt'
type FoutSoort = 'auth' | 'netwerk' | 'database' | 'onbekend'
// 'uitstel' is geen fout: de tijd was op vóór het werk klaar was. Die mag het
// foutbudget niet opmaken, anders belandt een grote mailbox die vier ronden
// nodig heeft om bij te komen in de dodebrievenbus.
type Aanleiding = FoutSoort | 'uitstel'

// Lease van 90s met 60s marge voor de opruimer. De marge dekt het klokverschil
// tussen de Vercel-runtime (die lease_tot berekent) en Postgres (dat now()
// levert), en garandeert dat een nog levende functie — maxDuration 60 — nooit
// onder zijn eigen taak wordt weggetrokken.
const LEASE_MS = 90_000
const LEASE_MARGE_MS = 60_000
// Tempo van de terugkerende incrementele taak: gelijk aan de oude cron
// (*/3 * * * *), zodat aanzetten geen tempoverandering is.
const HERPLAN_MS = 180_000
// Langer dan de [1, 5, 15] van ingeplande_berichten: daar wacht een mens op
// een mail, hier niet, en een kapotte mailserver is in 15 minuten niet heel.
// Zeven pogingen, samen ruim 10 uur.
const RETRY_DELAYS_MIN = [1, 3, 10, 30, 60, 180, 360]
// Plafond voor het uitstel dat géén fout is. Vangt de taak die binnen geen
// enkel venster af kan; zonder plafond draait die eeuwig rond.
const MAX_UITSTEL = 20

function leaseGrens(nu: number): string {
  return new Date(nu - LEASE_MARGE_MS).toISOString()
}

// Alleen de mailbox zelf is 'auth'. Die krijgt géén backoff maar meteen de
// dodebrievenbus: een verkeerd wachtwoord elke drie minuten opnieuw bij Gmail
// aanbieden is de manier om het account door Gmail geblokkeerd te krijgen.
const AUTH_PATROON = /authenticationfailed|invalid credentials|auth(?:enticatie)?\s*(?:mislukt|geweigerd|failed)|wachtwoord|password|encryption_key|geen email instellingen/i
const NETWERK_PATROON = /timeout|timed out|etimedout|econnreset|econnrefused|enotfound|eai_again|socket|network|aborted|abort/i
const DATABASE_PATROON = /\bupsert\b|postgrest|pgrst|does not exist|violates|constraint|database/i

function classificeerFout(bericht: string): FoutSoort {
  if (AUTH_PATROON.test(bericht)) return 'auth'
  if (NETWERK_PATROON.test(bericht)) return 'netwerk'
  if (DATABASE_PATROON.test(bericht)) return 'database'
  return 'onbekend'
}

// De HTTP-antwoorden van /api/fetch-emails apart, want de tekst alleen is hier
// misleidend. 401/403 betekent dat het cron-secret niet klopt: dat is een
// configuratiefout van de hele deploy en niet van deze mailbox, dus die mag
// niet elke taak in de dodebrievenbus duwen. 429 is de rate limit en dus
// uitstel, geen fout.
function classificeerHttp(status: number, tekst: string): Aanleiding {
  if (status === 429) return 'uitstel'
  if (status === 400) return classificeerFout(tekst)
  if (status === 401 || status === 403) return 'onbekend'
  if (status >= 500) return 'netwerk'
  return classificeerFout(tekst)
}

interface TaakUitkomst {
  status: Extract<TaakStatus, 'wachtend' | 'mislukt'>
  retry_count: number
  uitstel_count: number
  fout_soort: FoutSoort | null
  vertraging_ms: number
}

function bepaalFoutAfhandeling(
  aanleiding: Aanleiding,
  retryCount: number,
  uitstelCount: number,
): TaakUitkomst {
  if (aanleiding === 'uitstel') {
    const volgend = uitstelCount + 1
    return {
      status: volgend > MAX_UITSTEL ? 'mislukt' : 'wachtend',
      retry_count: retryCount,
      uitstel_count: volgend,
      fout_soort: volgend > MAX_UITSTEL ? 'onbekend' : null,
      vertraging_ms: 0,
    }
  }

  if (aanleiding === 'auth') {
    return {
      status: 'mislukt',
      retry_count: retryCount + 1,
      uitstel_count: uitstelCount,
      fout_soort: 'auth',
      vertraging_ms: 0,
    }
  }

  if (retryCount < RETRY_DELAYS_MIN.length) {
    return {
      status: 'wachtend',
      retry_count: retryCount + 1,
      uitstel_count: uitstelCount,
      fout_soort: aanleiding,
      vertraging_ms: RETRY_DELAYS_MIN[retryCount] * 60_000,
    }
  }

  return {
    status: 'mislukt',
    retry_count: retryCount + 1,
    uitstel_count: uitstelCount,
    fout_soort: aanleiding,
    vertraging_ms: 0,
  }
}

// De payload van de claim. Apart van de uitvoering zodat hij te testen is:
// api/* praat via supabase-js en PostgREST kan `now() + interval` niet in een
// UPDATE-payload uitdrukken, dus lease_tot wordt hier berekend. geclaimd_op
// blijft bewust óók een JS-tijd zodat beide velden uit dezelfde klok komen.
function claimWaarden(runId: string, nu: number): Record<string, unknown> {
  return {
    status: 'verwerken',
    geclaimd_op: new Date(nu).toISOString(),
    geclaimd_door: runId,
    lease_tot: new Date(nu + LEASE_MS).toISOString(),
    updated_at: new Date(nu).toISOString(),
  }
}

// Compare-and-swap: de uitvoerder MOET `status = 'wachtend'` in zijn WHERE
// zetten en false teruggeven als de UPDATE nul rijen raakte. Zo verliest bij
// twee gelijktijdige claims er precies één, en die slaat de taak over in
// plaats van hem naast de winnaar te verwerken.
type CasUitvoer = (
  waarden: Record<string, unknown>,
  verwachteStatus: TaakStatus,
) => Promise<boolean>

async function claimTaak(
  runId: string,
  nu: number,
  cas: CasUitvoer,
): Promise<Record<string, unknown> | null> {
  const waarden = claimWaarden(runId, nu)
  return (await cas(waarden, 'wachtend')) ? waarden : null
}

// Verlopen lease terugzetten. Verhoogt retry_count: zonder dat blijft een taak
// die structureel de functietijd overschrijdt eeuwig rondgaan zonder ooit in
// de dodebrievenbus te belanden.
function opruimWaarden(nu: number, retryCount: number): Record<string, unknown> {
  return {
    status: 'wachtend',
    retry_count: retryCount + 1,
    fout_soort: 'onbekend',
    foutmelding: 'lease verlopen: proces gestorven of functietijd op',
    scheduled_at: new Date(nu).toISOString(),
    geclaimd_op: null,
    geclaimd_door: null,
    lease_tot: null,
    updated_at: new Date(nu).toISOString(),
  }
}

// Ook de opruimer is een CAS, op `status = 'verwerken'`, zodat twee
// gelijktijdige opruimers dezelfde taak niet twee keer terugzetten en
// retry_count niet twee keer verhogen.
async function opruimTaak(
  nu: number,
  retryCount: number,
  cas: CasUitvoer,
): Promise<Record<string, unknown> | null> {
  const waarden = opruimWaarden(nu, retryCount)
  return (await cas(waarden, 'verwerken')) ? waarden : null
}

// Terugkerende taak hergebruiken in plaats van 'gedaan' zetten en een nieuwe
// inplannen. Zo blijft de coalescing-index betekenisvol (precies één rij per
// mailbox, altijd) en blijft de tabel klein.
function herplanWaarden(nu: number, duurMs: number | null): Record<string, unknown> {
  return {
    status: 'wachtend',
    scheduled_at: new Date(nu + HERPLAN_MS).toISOString(),
    retry_count: 0,
    uitstel_count: 0,
    fout_soort: null,
    foutmelding: null,
    gemeld_op: null,
    geclaimd_op: null,
    geclaimd_door: null,
    lease_tot: null,
    laatste_duur_ms: duurMs,
    updated_at: new Date(nu).toISOString(),
  }
}

// FNV-1a, 32 bits. Bewust geen crypto: dit blok moet zonder imports in een
// standalone api-bestand passen. Er hangt geen beveiliging aan de waarde, hij
// moet alleen deterministisch en kort zijn.
function korteHash(tekst: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < tekst.length; i++) {
    hash ^= tekst.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}

// Mail zonder Message-ID dupliceert vandaag bij elke herhaalde ophaal: de
// constraint is UNIQUE (user_id, message_id) zonder NULLS NOT DISTINCT, en
// Postgres ziet twee NULL's als verschillend. Een id uit de IMAP-identiteit is
// stabiel zolang UIDVALIDITY niet wisselt, dus dekt de bestaande constraint
// daarna 100 procent van de rijen zonder tweede conflictdoel.
//
// Het domein maakt later leesbaar dat de waarde niet van de afzender komt. Een
// gesynthetiseerd id matcht nooit een In-Reply-To, en dat is correct: naar een
// bericht zonder Message-ID kan niemand verwijzen.
function synthetiseerMessageId(
  uid: number,
  uidvalidity: number,
  imapFolder: string,
): string {
  return `<uid-${uid}.${uidvalidity}.${korteHash(imapFolder)}@sync.doen.local>`
}

function messageIdVoorRij(
  headerMessageId: string | null | undefined,
  uid: number | null | undefined,
  uidvalidity: number,
  imapFolder: string,
): string | null {
  if (headerMessageId) return headerMessageId
  // Zonder UID is er geen stabiele identiteit; dan liever NULL dan een id dat
  // bij de volgende ronde anders is en alsnog dupliceert.
  if (!uid) return null
  return synthetiseerMessageId(uid, uidvalidity, imapFolder)
}

// ── GEDEELD-MET-API EINDE ──────────────────────────────────────────────

export type { FlagStand, FeatureFlagRij, TaakStatus, FoutSoort, Aanleiding, TaakUitkomst, CasUitvoer }
export {
  bepaalStand,
  vlagStaatAan,
  veiligeVlagRijen,
  LEASE_MS,
  LEASE_MARGE_MS,
  HERPLAN_MS,
  RETRY_DELAYS_MIN,
  MAX_UITSTEL,
  leaseGrens,
  classificeerFout,
  classificeerHttp,
  bepaalFoutAfhandeling,
  claimWaarden,
  claimTaak,
  opruimWaarden,
  opruimTaak,
  herplanWaarden,
  korteHash,
  synthetiseerMessageId,
  messageIdVoorRij,
}
