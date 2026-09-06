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
const AUTH_PATROON = /authenticationfailed|invalid credentials|auth(?:enticatie)?\s*(?:mislukt|geweigerd|failed)|wachtwoord|password/i

// Serverconfiguratie, geen gebruikersfout. Deze twee kwamen eerst in
// AUTH_PATROON terecht en gingen daarmee zonder backoff naar de dodebrievenbus.
// Gevolg: een scheve EMAIL_ENCRYPTION_KEY na een deploy zette in één ronde ALLE
// pilot-mailboxen permanent uit, en er is geen herstelpad in code. Ze horen bij
// 'onbekend': backoff, en dus vanzelf herstel zodra de env-var goed staat.
const CONFIG_PATROON = /encryption_key|geen email instellingen/i
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
  // Vóór de 400-tak: fetch-emails geeft 400 bij een ontbrekende sleutel, en dat
  // is een deployfout die vanzelf overgaat, geen verlopen app-password.
  if (CONFIG_PATROON.test(tekst)) return 'onbekend'
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

// ── Postvak-bewuste wachtrij (migratie 245 en 247) ─────────────────────
//
// BEWUST BUITEN HET GEDEELDE BLOK HIERBOVEN. Dat blok staat byte voor byte in
// drie bestanden en `api/fetch-emails.ts` is van een andere hand; deze helpers
// hebben daar niets te zoeken. De kopie hiervan staat alleen in
// `api/cron-mailsync-werker.ts`, onder dezelfde kop.

interface PostvakTaak {
  user_id: string
  /** Rij-id van user_email_settings. Ontbreekt zolang migratie 245 niet draait. */
  account_id?: string | null
}

/**
 * Spiegelt `COALESCE(account_id, user_id)` uit `mailsync_taken_open_unique`
 * (migratie 247). Zonder account_id valt de sleutel terug op de gebruiker,
 * precies zoals de oude index op (user_id, folder, soort): zolang iedereen één
 * postvak heeft verandert er niets.
 */
function postvakSleutel(rij: PostvakTaak): string {
  return rij.account_id || rij.user_id
}

interface TeMakenTaak {
  user_id: string
  folder: string
  soort: string
  account_id?: string
}

/**
 * Welke postvakken nog een open taak missen.
 *
 * `metAccountKolom` is de terugval: bestaat `mailsync_taken.account_id` niet
 * (migratie 245 niet gedraaid), dan is de sleutel weer de gebruiker en is dit
 * exact het oude gedrag — één taak per gebruiker, zonder account_id in de rij.
 *
 * Een bestaande taak zónder account_id komt uit de oude code of uit het venster
 * tussen 245 en 247. Heeft die gebruiker maar één postvak, dan hoort de taak
 * daarbij en telt hij als dekking; heeft hij er meer, dan is niet te zeggen
 * welke en gaat de sleutel per postvak.
 */
function ontbrekendeTaken(
  postvakken: readonly PostvakTaak[],
  bestaand: readonly PostvakTaak[],
  metAccountKolom: boolean,
  folder = 'inbox',
  soort = 'incrementeel',
): TeMakenTaak[] {
  const aantalPerUser = new Map<string, number>()
  for (const postvak of postvakken) {
    aantalPerUser.set(postvak.user_id, (aantalPerUser.get(postvak.user_id) ?? 0) + 1)
  }

  const heeftAl = new Set<string>()
  const zonderAccount = new Set<string>()
  for (const rij of bestaand) {
    heeftAl.add(metAccountKolom ? postvakSleutel(rij) : rij.user_id)
    if (!rij.account_id) zonderAccount.add(rij.user_id)
  }

  const gepland = new Set<string>()
  const rijen: TeMakenTaak[] = []
  for (const postvak of postvakken) {
    const sleutel = metAccountKolom ? postvakSleutel(postvak) : postvak.user_id
    if (gepland.has(sleutel)) continue
    if (heeftAl.has(sleutel)) continue
    if (zonderAccount.has(postvak.user_id) && aantalPerUser.get(postvak.user_id) === 1) continue
    gepland.add(sleutel)
    const rij: TeMakenTaak = { user_id: postvak.user_id, folder, soort }
    if (metAccountKolom && postvak.account_id) rij.account_id = postvak.account_id
    rijen.push(rij)
  }
  return rijen
}

/**
 * Hoogstens één taak per postvak per ronde claimen.
 *
 * Twee open taken voor dezelfde mailbox kunnen bestaan zolang migratie 247 niet
 * gedraaid is, en ook daarna: een oude rij zonder account_id en een nieuwe met
 * account_id geven onder COALESCE twee verschillende sleutels. Twee
 * gelijktijdige IMAP-verbindingen naar hetzelfde postvak is precies wat de
 * lease hoort te voorkomen, dus valt de tweede hier af in plaats van bij de
 * mailserver.
 */
function eenTaakPerPostvak<T extends PostvakTaak>(taken: readonly T[]): T[] {
  const gezien = new Set<string>()
  const uniek: T[] = []
  for (const taak of taken) {
    const sleutel = postvakSleutel(taak)
    if (gezien.has(sleutel)) continue
    gezien.add(sleutel)
    uniek.push(taak)
  }
  return uniek
}

export type { FlagStand, FeatureFlagRij, TaakStatus, FoutSoort, Aanleiding, TaakUitkomst, CasUitvoer }
export type { PostvakTaak, TeMakenTaak }
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
  postvakSleutel,
  ontbrekendeTaken,
  eenTaakPerPostvak,
}
