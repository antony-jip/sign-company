/**
 * Werker van de mailsync-wachtrij (migratie 202, docs/plan-mailsync-queue.md §3).
 *
 * SLAAPT TOT DE VLAG OMGAAT. Zonder rij in feature_flags voor 'mailsync_queue'
 * doet dit endpoint precies één SELECT op die tabel en gaat dan naar huis. Het
 * raakt mailsync_taken niet aan, opent geen IMAP-verbinding en roept
 * /api/fetch-emails niet aan. Is feature_flags onbereikbaar of bestaat de tabel
 * niet, dan is de uitkomst hetzelfde — de vlaglezer faalt dicht.
 *
 * WAT HIJ VERVANGT. De fan-out-lus in api/cron-email-sync.ts pakt acht
 * accounts per ronde en slaat de rest stil over. Er is geen slot per mailbox,
 * een mislukte sync is nergens zichtbaar, en een account met een verkeerd
 * wachtwoord blijft eeuwig elke drie minuten een IMAP-slot kosten. Hier is elk
 * account een claimbare taak met een lease, een foutbudget en een eindstatus.
 *
 * DE VOLGORDE IS DE VEILIGHEID. Deze werker roept hetzelfde /api/fetch-emails
 * aan en houdt dus geen eigen watermerk bij: dat blijft
 * email_sync_state.last_seen_uid, dat pas opschuift nadat de rijen bewezen zijn
 * weggeschreven (api/fetch-emails.ts:610). Sterft dit proces halverwege, dan
 * zet de opruimer de taak terug op 'wachtend' en haalt de volgende ronde exact
 * dezelfde UID's opnieuw op; de upsert op (user_id, message_id) gooit ze weg.
 * At-least-once ophalen, exactly-once rij. Een crash dupliceert dus niet en
 * maakt niets kwijt, en dat mag deze werker niet omdraaien.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET}. Datzelfde secret
 * gebruikt fetch-emails om de service-modus te herkennen.
 *
 * Handmatig testen (na deploy, en pas nadat de vlag aanstaat):
 * curl -H "Authorization: Bearer $CRON_SECRET" \
 *   https://app.doen.team/api/cron-mailsync-werker
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/node'

// ── Sentry init (inline; Vercel bundelt geen lokale modules in api/) ──
if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  const SENS = /password|app_password|encrypted_app_password|betaal_token|payment_token|access_token|refresh_token|mollie_api_key|authorization|cookie|secret|api_key|to|cc|bcc|email/i
  const scrub = (v: unknown, d = 0): unknown => {
    if (d > 6 || v == null) return v
    if (Array.isArray(v)) return v.map(x => scrub(x, d + 1))
    if (typeof v === 'object') {
      const o: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) o[k] = SENS.test(k) ? '[Filtered]' : scrub(val, d + 1)
      return o
    }
    return v
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) for (const k of Object.keys(event.request.headers)) if (/authorization|cookie/i.test(k)) (event.request.headers as Record<string, string>)[k] = '[Filtered]'
      if (event.request?.data) event.request.data = scrub(event.request.data) as typeof event.request.data
      if (event.user) { delete event.user.ip_address; delete event.user.email }
      return event
    },
  })
}

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

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
// Kopie van hetzelfde blok in src/lib/mailsyncQueue.ts, waar
// tests/lib/mailsyncQueue.test.ts hem test. Bewust buiten het GEDEELDE blok
// hierboven: dat staat byte voor byte ook in api/fetch-emails.ts, en daar
// hebben deze helpers niets te zoeken.

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

function isKolomFout(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  if (fout.code === '42703' || fout.code === 'PGRST204') return true
  return /column .* does not exist|could not find the .* column/i.test(fout.message || '')
}

const VLAG = 'mailsync_queue'
// Kort in cache per invocatie, niet per request: een warme functie hergebruikt
// de rijen, een koude haalt ze opnieuw op. Zo kost de vlag geen query per taak
// en volgt een omgezette vlag toch binnen een halve minuut.
const VLAG_CACHE_MS = 30_000
// Gelijk aan MAX_PER_RONDE van de oude cron, zodat aanzetten geen
// capaciteitsverandering is. Parallel om dezelfde reden als daar: elke
// gebruiker praat met zijn eigen IMAP-server.
const MAX_PER_RONDE = 8
// Ruim onder maxDuration en ruim onder de lease van 90s, zodat de samenvatting
// nog terugkomt en een taak nooit doorloopt terwijl zijn lease al verlopen is.
const DEADLINE_MS = 50_000
const OPRUIM_PER_RONDE = 50
// Slapende accounts (afgelopen trial, opgezegd) hoeven geen taak te hebben.
// Zelfde grens als api/cron-email-sync.ts:30.
const ACTIEF_BINNEN_DAGEN = 7
// De aanvulronde kost een listUsers-paginatie en hoort niet elke minuut te
// draaien. Per warme functie hoogstens eens per tien minuten; loopt hij op twee
// instanties tegelijk, dan weigert de coalescing-index de tweede taak toch.
const AANVUL_INTERVAL_MS = 600_000

let vlagCache: { op: number; rijen: FeatureFlagRij[] } | null = null
let laatsteAanvulling = 0

/**
 * Serverkant van het feature-flag-mechanisme uit migratie 200.
 *
 * Er is er geen: src/lib/featureFlags.ts is een React-hook en api/* mag niets
 * uit src/ importeren (CLAUDE.md §2), dus de resolutie staat hierboven in het
 * gedeelde blok en het transport hier. Dezelfde drie standen en dezelfde
 * voorrangsregels als de clientkant; tests/lib/mailsyncQueue.test.ts vergelijkt
 * de twee uitkomst voor uitkomst.
 *
 * Ook de mislukking gaat de cache in. Bestaat feature_flags niet, dan zou elke
 * ronde anders opnieuw tegen een ontbrekende tabel aanlopen.
 */
async function haalVlagRijen(): Promise<FeatureFlagRij[]> {
  const nu = Date.now()
  if (vlagCache && nu - vlagCache.op < VLAG_CACHE_MS) return vlagCache.rijen

  const rijen = await veiligeVlagRijen(
    async () => {
      const { data, error } = await supabaseAdmin
        .from('feature_flags')
        .select('naam, organisatie_id, aan')
        .eq('naam', VLAG)
      if (error) throw new Error(error.message)
      return (data ?? []) as FeatureFlagRij[]
    },
    (fout) => console.warn('[cron-mailsync-werker] feature_flags niet leesbaar, wachtrij blijft uit:',
      fout instanceof Error ? fout.message : fout),
  )

  vlagCache = { op: nu, rijen }
  return rijen
}

async function organisatiePerGebruiker(userIds: string[]): Promise<Map<string, string | null>> {
  const perUser = new Map<string, string | null>()
  if (userIds.length === 0) return perUser
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, organisatie_id')
    .in('id', userIds)
  if (error) {
    console.warn('[cron-mailsync-werker] organisaties ophalen mislukt:', error.message)
    return perUser
  }
  for (const rij of data ?? []) {
    perUser.set(rij.id as string, (rij.organisatie_id as string | null) ?? null)
  }
  return perUser
}

async function actieveUserIds(): Promise<Set<string>> {
  const grens = Date.now() - ACTIEF_BINNEN_DAGEN * 24 * 60 * 60 * 1000
  const actief = new Set<string>()
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) break
    for (const u of data.users) {
      const laatst = u.last_sign_in_at ? Date.parse(u.last_sign_in_at) : 0
      if (laatst >= grens) actief.add(u.id)
    }
    if (data.users.length < 200) break
  }
  return actief
}

/**
 * De producent. In het oude model was lidmaatschap van de ronde impliciet: een
 * rij in user_email_settings plus een login binnen zeven dagen. Hier moet
 * iemand een taak aanmaken, en dat is deze functie.
 *
 * Alleen voor gebruikers wier organisatie de vlag expliciet op 'aan' heeft. Het
 * dubbel inplannen wordt niet hier voorkomen maar door de partiële unieke index
 * mailsync_taken_open_unique: hoe vaak deze ronde ook draait, er komt nooit een
 * tweede open taak voor dezelfde mailbox. De pre-filter hieronder is dus alleen
 * een besparing, geen slot.
 *
 * Bewust geen taak voor een mailbox die op 'mislukt' staat. Dat is het verschil
 * met vandaag, waar een dood account voor altijd meedoet in de ronde van acht.
 *
 * LET OP, en dit is de reden om de pilot klein te houden: 'mislukt' is nu
 * DEFINITIEF. Er is geen herstelpad in code. Er is geen UI die de stand toont,
 * geen knop om opnieuw te proberen, en het opslaan van je verbinding zet de
 * taak niet terug. De enige uitweg is met de hand in de SQL Editor:
 *
 *   UPDATE public.mailsync_taken
 *      SET status = 'wachtend', retry_count = 0, uitstel_count = 0,
 *          foutmelding = NULL, fout_soort = NULL, scheduled_at = now()
 *    WHERE user_id = '<user-uuid>' AND status = 'mislukt';
 *
 * Bouw dat herstelpad vóór je verder uitrolt dan één organisatie. De goedkoopste
 * weg loopt niet via deze tabel maar via email_sync_state: die heeft al
 * user_id-policies, dus een nullable foutkolom daar is client-leesbaar zonder
 * dat mailsync_taken open hoeft.
 */
async function vulWachtrijAan(vlagRijen: FeatureFlagRij[], nu: number): Promise<number> {
  if (nu - laatsteAanvulling < AANVUL_INTERVAL_MS) return 0
  laatsteAanvulling = nu
  try {
    return await vulWachtrijAanInternal(vlagRijen)
  } catch (err) {
    // Mag de ronde nooit omver halen: de taken die er al staan moeten hoe dan
    // ook verwerkt worden.
    console.warn('[cron-mailsync-werker] aanvulronde mislukt:', err instanceof Error ? err.message : err)
    return 0
  }
}

interface Postvak {
  /** Rij-id van user_email_settings. Null zolang de kolom niet leesbaar is. */
  id: string | null
  user_id: string
  /** 'persoonlijk' of 'gedeeld' (migratie 245). Zonder die kolom persoonlijk. */
  soort: string
}

/**
 * Eén rij per postvak in plaats van één per gebruiker. `id` en `soort` komen
 * uit migratie 245 en mogen ontbreken: zonder die kolommen is dit exact de
 * oude select, met één postvak per gebruiker.
 */
async function haalPostvakken(): Promise<Postvak[]> {
  for (const kolommen of ['id, user_id, soort', 'id, user_id', 'user_id']) {
    const { data, error } = await supabaseAdmin
      .from('user_email_settings')
      .select(kolommen)
      .not('gmail_address', 'is', null)
      .not('encrypted_app_password', 'is', null)
    if (error) {
      if (isKolomFout(error)) continue
      console.warn('[cron-mailsync-werker] accounts ophalen mislukt:', error.message)
      return []
    }
    const gezien = new Set<string>()
    const postvakken: Postvak[] = []
    for (const rij of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      const userId = rij.user_id as string
      if (!userId) continue
      const id = (rij.id as string) ?? null
      const sleutel = id ?? userId
      if (gezien.has(sleutel)) continue
      gezien.add(sleutel)
      postvakken.push({ id, user_id: userId, soort: (rij.soort as string) || 'persoonlijk' })
    }
    return postvakken
  }
  return []
}

/**
 * De open taken van deze gebruikers, met account_id als die kolom bestaat.
 * `metAccount` zegt of de sleutel per postvak of per gebruiker gaat; null
 * betekent dat de query zelf faalde en de aanvulronde moet worden overgeslagen.
 */
async function leesOpenTaken(userIds: string[]): Promise<{ rijen: PostvakTaak[]; metAccount: boolean } | null> {
  for (const kolommen of ['user_id, account_id', 'user_id']) {
    const { data, error } = await supabaseAdmin
      .from('mailsync_taken')
      .select(kolommen)
      .eq('folder', 'inbox')
      .eq('soort', 'incrementeel')
      .in('status', ['wachtend', 'verwerken', 'mislukt'])
      .in('user_id', userIds)
    if (error) {
      if (isKolomFout(error)) continue
      // Zonder deze check zou een hik in de query een lege heeftAl geven en dus
      // een insert voor élke mailbox. De partiële index vangt wachtend/verwerken
      // af met 23505, maar 'mislukt' valt daarbuiten: daar zou per hik een
      // extra rij bij komen, onbegrensd.
      console.error('[mailsync-werker] bestaande taken lezen mislukt, ronde overgeslagen:', error.message)
      return null
    }
    return {
      rijen: (data ?? []) as unknown as PostvakTaak[],
      metAccount: kolommen.includes('account_id'),
    }
  }
  return null
}

async function plaatsTaken(rijen: TeMakenTaak[]): Promise<number> {
  const { error: batchFout } = await supabaseAdmin.from('mailsync_taken').insert(rijen)
  if (!batchFout) {
    console.log(`[cron-mailsync-werker] ${rijen.length} taak/taken ingeplant`)
    return rijen.length
  }
  // account_id komt uit migratie 245; zonder die kolom faalt de hele insert.
  if (isKolomFout(batchFout) && rijen.some((r) => r.account_id)) {
    return plaatsTaken(rijen.map(({ user_id, folder, soort }) => ({ user_id, folder, soort })))
  }

  // Eén conflict laat de hele batch vallen, dus per rij opnieuw. Een
  // unique-violation is hier de goede uitkomst: een andere instantie was net
  // eerder, en dat is precies wat de coalescing-index hoort te doen. Zolang
  // migratie 247 niet gedraaid is geldt de oude index op (user_id, folder,
  // soort) en krijgt een tweede postvak hier 23505 — geen taak dus, tot 247.
  let geplaatst = 0
  for (const rij of rijen) {
    const { error: rijFout } = await supabaseAdmin.from('mailsync_taken').insert(rij)
    if (!rijFout) geplaatst++
    else if (isKolomFout(rijFout) && rij.account_id) {
      const { user_id, folder, soort } = rij
      const { error: zonderFout } = await supabaseAdmin.from('mailsync_taken').insert({ user_id, folder, soort })
      if (!zonderFout) geplaatst++
    } else if (rijFout.code !== '23505') {
      console.warn('[cron-mailsync-werker] taak inplannen mislukt:', { userId: rij.user_id, accountId: rij.account_id, fout: rijFout.message })
    }
  }
  return geplaatst
}

async function vulWachtrijAanInternal(vlagRijen: FeatureFlagRij[]): Promise<number> {
  const postvakken = await haalPostvakken()
  if (postvakken.length === 0) return 0

  // Een gedeeld postvak (migratie 245) is niet van één mens en mag dus niet aan
  // de login-frequentie hangen van degene die hem toevallig koppelde: dan valt
  // de team-inbox stil zodra die persoon een week op vakantie is. Bestaat de
  // kolom `soort` nog niet, dan is elk postvak 'persoonlijk' en geldt de filter
  // onveranderd voor iedereen.
  const gedeeld = postvakken.filter((p) => p.soort === 'gedeeld')
  const persoonlijk = postvakken.filter((p) => p.soort !== 'gedeeld')
  const actief = persoonlijk.length > 0 ? await actieveUserIds() : new Set<string>()
  const kandidaten = [...persoonlijk.filter((p) => actief.has(p.user_id)), ...gedeeld]
  if (kandidaten.length === 0) return 0

  const orgs = await organisatiePerGebruiker([...new Set(kandidaten.map((p) => p.user_id))])
  const metVlag = kandidaten.filter((p) => vlagStaatAan(VLAG, vlagRijen, orgs.get(p.user_id) ?? null))
  if (metVlag.length === 0) return 0

  const open = await leesOpenTaken([...new Set(metVlag.map((p) => p.user_id))])
  if (!open) return 0

  const rijen = ontbrekendeTaken(
    metVlag.map((p) => ({ user_id: p.user_id, account_id: p.id })),
    open.rijen,
    open.metAccount,
  )
  if (rijen.length === 0) return 0

  return plaatsTaken(rijen)
}

interface Taak {
  id: string
  user_id: string
  account_id?: string | null
  folder: string
  soort: string
  retry_count: number
  uitstel_count: number
}

/**
 * De taken die aan de beurt zijn. `account_id` komt uit migratie 245 en mag
 * ontbreken; dan draait de ronde per gebruiker, precies zoals vandaag. Een
 * andere fout is fataal voor de ronde, zoals voorheen.
 */
async function leesDueTaken(nu: number, limiet: number): Promise<Taak[]> {
  const basis = 'id, user_id, folder, soort, retry_count, uitstel_count'
  for (const kolommen of [`${basis}, account_id`, basis]) {
    const { data, error } = await supabaseAdmin
      .from('mailsync_taken')
      .select(kolommen)
      .eq('status', 'wachtend')
      .lte('scheduled_at', new Date(nu).toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(limiet)
    if (error) {
      if (isKolomFout(error)) continue
      throw new Error(error.message)
    }
    return (data ?? []) as unknown as Taak[]
  }
  return []
}

/**
 * De compare-and-swap zelf. De `.eq('status', ...)` in de UPDATE is wat een
 * gelijktijdige tweede run laat verliezen: die raakt nul rijen, krijgt niets
 * terug uit .select() en slaat de taak over. Een queryfout telt hier bewust als
 * verlies — doorgaan op onzekerheid is precies wat een claim moet voorkomen.
 */
function casOpTaak(taakId: string): CasUitvoer {
  return async (waarden, verwachteStatus) => {
    const { data, error } = await supabaseAdmin
      .from('mailsync_taken')
      .update(waarden)
      .eq('id', taakId)
      .eq('status', verwachteStatus)
      .select('id')
      .maybeSingle()
    if (error) {
      console.warn('[cron-mailsync-werker] claim/opruim mislukt:', { taakId, fout: error.message })
      return false
    }
    return !!data
  }
}

/**
 * Verlopen leases terugzetten. Draait aan het begin van elke ronde in plaats
 * van als eigen cron: dat scheelt een vercel.json-regel en een tweede
 * invocatie. Keerzijde, bewust geaccepteerd: draait de werker helemaal niet,
 * dan wordt er ook niet opgeruimd — maar dan staat er sowieso niets meer te
 * gebeuren met die taken.
 */
async function ruimVerlopenLeasesOp(nu: number): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('mailsync_taken')
    .select('id, retry_count')
    .eq('status', 'verwerken')
    .lt('lease_tot', leaseGrens(nu))
    .limit(OPRUIM_PER_RONDE)
  if (error) {
    console.warn('[cron-mailsync-werker] verlopen leases zoeken mislukt:', error.message)
    return 0
  }

  let opgeruimd = 0
  for (const rij of data ?? []) {
    const terug = await opruimTaak(nu, Number(rij.retry_count) || 0, casOpTaak(rij.id as string))
    if (terug) opgeruimd++
  }
  if (opgeruimd > 0) console.warn(`[cron-mailsync-werker] ${opgeruimd} verlopen lease(s) teruggezet`)
  return opgeruimd
}

/**
 * Meldt binnengekomen mail op het toestel. Kopie van de melding in
 * api/cron-email-sync.ts, want zodra die lus gedoofd wordt is dit de enige
 * plek waar hij nog vandaan kan komen. Faalt stil: de sync is geslaagd en dat
 * is wat telt.
 */
async function meldNieuweMail(userId: string, aantal: number, cronSecret: string, url: string) {
  try {
    const { data: profiel } = await supabaseAdmin
      .from('profiles')
      .select('push_nieuwe_mail')
      .eq('id', userId)
      .maybeSingle()
    if (!profiel?.push_nieuwe_mail) return

    const { data: laatste } = await supabaseAdmin
      .from('emails')
      .select('van, from_name, onderwerp')
      .eq('user_id', userId)
      .eq('map', 'inbox')
      .order('datum', { ascending: false })
      .limit(1)
      .maybeSingle()

    const afzender = (laatste?.from_name as string) || (laatste?.van as string) || 'Nieuwe mail'
    const onderwerp = (laatste?.onderwerp as string) || ''
    const titel = aantal > 1 ? `${aantal} nieuwe berichten` : afzender
    const tekst = aantal > 1 ? `Laatste: ${afzender} · ${onderwerp}` : onderwerp

    await fetch(`${url}/api/push-verstuur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ service_user_id: userId, titel, tekst, url: '/email', tag: 'doen-mail' }),
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    console.warn('[cron-mailsync-werker] melding niet verstuurd', { userId, err: err instanceof Error ? err.message : err })
  }
}

function basisUrl(): string {
  if (process.env.CRON_SELF_URL) return process.env.CRON_SELF_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://app.doen.team'
}

/**
 * Tweede ronde per mailbox: de Verzonden-map. Eigen email_sync_state-rij per
 * folder, klein venster, en `snel` omdat de sweeps al in de INBOX-ronde zijn
 * gedaan. Faalt stil: de INBOX-taak is dan al afgerond en dat is wat telt.
 */
async function syncVerzonden(taak: Taak, cronSecret: string, url: string, resterendMs: number): Promise<number> {
  if (resterendMs < 8_000) return 0
  const userId = taak.user_id
  try {
    const respons = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ folder: 'verzonden', limit: 200, snel: true, service_user_id: userId, ...(taak.account_id ? { account_id: taak.account_id } : {}) }),
      signal: AbortSignal.timeout(resterendMs - 1_000),
    })
    if (!respons.ok) {
      const tekst = await respons.text().catch(() => '')
      console.warn('[cron-mailsync-werker] verzonden-sync mislukt', { userId, status: respons.status, tekst: tekst.slice(0, 200) })
      return 0
    }
    const antwoord = (await respons.json().catch(() => ({}))) as { synced?: number }
    return Number(antwoord?.synced) || 0
  } catch (err) {
    console.warn('[cron-mailsync-werker] verzonden-sync gooide', { userId, err: err instanceof Error ? err.message : err })
    return 0
  }
}

/**
 * Bodies alvast ophalen na een geslaagde sync, zodat de body er is vóór de
 * gebruiker klikt. Hoogstens 25 per ronde en alleen als er tijd over is.
 */
async function prefetchBodies(taak: Taak, cronSecret: string, resterendMs: number): Promise<number> {
  if (resterendMs < 15_000) return 0
  const userId = taak.user_id
  try {
    const respons = await fetch(`${basisUrl()}/api/prefetch-email-bodies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ folder: 'INBOX', limit: 25, service_user_id: userId, ...(taak.account_id ? { account_id: taak.account_id } : {}) }),
      signal: AbortSignal.timeout(resterendMs - 1_000),
    })
    if (!respons.ok) {
      const tekst = await respons.text().catch(() => '')
      console.warn('[cron-mailsync-werker] prefetch mislukt', { userId, status: respons.status, tekst: tekst.slice(0, 200) })
      return 0
    }
    const antwoord = (await respons.json().catch(() => ({}))) as { verwerkt?: number }
    return Number(antwoord?.verwerkt) || 0
  } catch (err) {
    console.warn('[cron-mailsync-werker] prefetch gooide', { userId, err: err instanceof Error ? err.message : err })
    return 0
  }
}

/**
 * Afronden van een geslaagde ronde: de rij wordt hergebruikt in plaats van op
 * 'gedaan' gezet. Zo blijft de coalescing-index betekenisvol — precies één rij
 * per mailbox, altijd — en blijft de tabel klein.
 *
 * De twee .eq()'s zijn geen franje: heeft de opruimer deze taak intussen
 * teruggezet omdat de lease verliep, dan is hij niet meer van deze run en mag
 * die run hem niet meer overschrijven.
 */
async function rondAf(taakId: string, runId: string, waarden: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from('mailsync_taken')
    .update(waarden)
    .eq('id', taakId)
    .eq('status', 'verwerken')
    .eq('geclaimd_door', runId)
  if (error) console.warn('[cron-mailsync-werker] afronden mislukt:', { taakId, fout: error.message })
}

/**
 * De dodebrievenbus luid loggen. Dit is voorlopig de enige plek waar te zien is
 * dat een mailbox niet meer gesynchroniseerd wordt: mailsync_taken is
 * service-role-only, dus de app kan de status niet tonen, en de melding uit
 * plan §3.5 laag 3 is niet gebouwd. Een 'mislukt' hoort dus in de Vercel-logs
 * op te vallen, en niet tussen de warnings te verdwijnen.
 */
function logUitkomst(taak: Taak, status: string, melding: string, foutSoort: string | null) {
  const context = { userId: taak.user_id, accountId: taak.account_id ?? null, folder: taak.folder, foutSoort, melding: melding.slice(0, 200) }
  if (status === 'mislukt') {
    console.error('[cron-mailsync-werker] MAILBOX UITGEZET, geen sync meer tot de gebruiker zijn verbinding opnieuw opslaat', context)
  } else {
    console.warn('[cron-mailsync-werker] sync mislukt, opnieuw ingeplant', context)
  }
}

/**
 * De dodebrievenbus zichtbaar maken (migratie 244): email_sync_state is
 * client-leesbaar, mailsync_taken niet. De instellingenpagina toont
 * 'uitgezet' met de laatste fout, en opnieuw opslaan zet hem terug op 'ok'.
 */
async function zetMailboxUitgezet(taak: Taak, foutSoort: string | null, melding: string) {
  const omschrijving = foutSoort === 'auth' ? 'Wachtwoord geweigerd'
    : foutSoort === 'netwerk' ? 'Server onbereikbaar'
    : melding.slice(0, 120)
  const nu = new Date().toISOString()
  const userId = taak.user_id
  const velden = {
    user_id: userId,
    folder: 'inbox',
    status: 'uitgezet',
    laatste_fout: omschrijving,
    laatste_fout_op: nu,
    updated_at: nu,
  }
  // Migratie 245 zet (account_id, folder) naast (user_id, folder), 246 laat de
  // oude sleutel vallen. Zolang beide werelden kunnen bestaan eerst de nieuwe
  // en dan de oude proberen: 42703 is een ontbrekende kolom, 42P10 een
  // onConflict zonder bijpassende unieke index.
  const pogingen: Array<{ onConflict: string; metAccount: boolean }> = taak.account_id
    ? [
        { onConflict: 'account_id,folder', metAccount: true },
        { onConflict: 'user_id,folder', metAccount: true },
        { onConflict: 'user_id,folder', metAccount: false },
      ]
    : [{ onConflict: 'user_id,folder', metAccount: false }]

  for (const poging of pogingen) {
    const rij: Record<string, unknown> = { ...velden }
    if (poging.metAccount) rij.account_id = taak.account_id
    const { error } = await supabaseAdmin
      .from('email_sync_state')
      .upsert(rij, { onConflict: poging.onConflict })
    if (!error) return
    if (!isKolomFout(error) && error.code !== '42P10' && !/no unique or exclusion constraint/i.test(error.message)) {
      console.warn('[cron-mailsync-werker] status uitgezet schrijven mislukt:', { userId, fout: error.message })
      return
    }
    if (poging === pogingen[pogingen.length - 1]) {
      console.warn('[cron-mailsync-werker] status uitgezet schrijven mislukt:', { userId, fout: error.message })
    }
  }
}

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const gestartOp = Date.now()
  const runId = (req.headers['x-vercel-id'] as string) || `lokaal-${gestartOp}`

  try {
    const vlagRijen = await haalVlagRijen()
    // Geen enkele rij op true betekent dat de vlag voor niemand aanstaat: geen
    // rij, een globale noodstop, of een onleesbare tabel. Hier stopt de werker
    // dus vóór hij mailsync_taken ook maar aanraakt.
    if (!vlagRijen.some((r) => r.aan)) {
      return res.status(200).json({ overgeslagen: 'vlag-uit', geclaimd: 0 })
    }

    const nu = Date.now()
    const opgeruimd = await ruimVerlopenLeasesOp(nu)
    // Vóór de due-query, zodat een net ingeplande taak (scheduled_at = now)
    // meteen in deze ronde meedoet.
    const ingeplant = await vulWachtrijAan(vlagRijen, nu)

    // Ruimer ophalen dan MAX_PER_RONDE: een deel valt zo af op de vlag, en dan
    // houdt één account zonder vlag niet de hele ronde bezet.
    const due = await leesDueTaken(nu, MAX_PER_RONDE * 4)
    if (!due?.length) return res.status(200).json({ opgeruimd, ingeplant, geclaimd: 0, wachtend: 0 })

    const orgs = await organisatiePerGebruiker([...new Set(due.map((t) => t.user_id))])
    // eenTaakPerPostvak vóór de begrenzing: twee open taken voor dezelfde
    // mailbox zouden anders samen twee IMAP-verbindingen openen én één slot van
    // een ander postvak inpikken.
    const metVlag = eenTaakPerPostvak(due
      .filter((taak) => vlagStaatAan(VLAG, vlagRijen, orgs.get(taak.user_id) ?? null)))
      .slice(0, MAX_PER_RONDE)

    if (metVlag.length === 0) {
      return res.status(200).json({ opgeruimd, ingeplant, geclaimd: 0, wachtend: due.length })
    }

    const url = `${basisUrl()}/api/fetch-emails`

    const uitkomsten = await Promise.all(metVlag.map(async (taak) => {
      const resterend = DEADLINE_MS - (Date.now() - gestartOp)
      // Niet claimen wat toch niet af kan: een claim die meteen op zijn eigen
      // deadline stukloopt kost alleen maar een lease van 90 seconden.
      if (resterend <= 5_000) return { taak, uitkomst: 'geen-tijd' as const }

      const geclaimd = await claimTaak(runId, Date.now(), casOpTaak(taak.id))
      if (!geclaimd) return { taak, uitkomst: 'verloren' as const }

      const begonnenOp = Date.now()
      try {
        const respons = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
          // snel blijft uit: de sales- en lead-sweeps horen juist hier thuis,
          // waar niemand op wacht.
          body: JSON.stringify({ folder: taak.folder === 'inbox' ? 'INBOX' : taak.folder, limit: 200, service_user_id: taak.user_id, ...(taak.account_id ? { account_id: taak.account_id } : {}) }),
          signal: AbortSignal.timeout(Math.max(5_000, DEADLINE_MS - (Date.now() - gestartOp))),
        })

        if (!respons.ok) {
          const tekst = await respons.text().catch(() => '')
          const aanleiding = classificeerHttp(respons.status, tekst)
          const gevolg = bepaalFoutAfhandeling(aanleiding, taak.retry_count, taak.uitstel_count)
          await rondAf(taak.id, runId, {
            status: gevolg.status,
            retry_count: gevolg.retry_count,
            uitstel_count: gevolg.uitstel_count,
            fout_soort: gevolg.fout_soort,
            foutmelding: `http ${respons.status}: ${tekst.slice(0, 300)}`,
            scheduled_at: new Date(Date.now() + gevolg.vertraging_ms).toISOString(),
            geclaimd_op: null,
            geclaimd_door: null,
            lease_tot: null,
            updated_at: new Date().toISOString(),
          })
          logUitkomst(taak, gevolg.status, `http ${respons.status}`, gevolg.fout_soort)
          if (gevolg.status === 'mislukt') await zetMailboxUitgezet(taak, gevolg.fout_soort, tekst)
          return { taak, uitkomst: 'mislukt' as const, status: gevolg.status }
        }

        const antwoord = (await respons.json().catch(() => ({}))) as { synced?: number }
        const nieuw = Number(antwoord?.synced) || 0
        await rondAf(taak.id, runId, herplanWaarden(Date.now(), Date.now() - begonnenOp))
        if (nieuw > 0) await meldNieuweMail(taak.user_id, nieuw, cronSecret, basisUrl())
        if (taak.folder === 'inbox') {
          await syncVerzonden(taak, cronSecret, url, DEADLINE_MS - (Date.now() - gestartOp))
          await prefetchBodies(taak, cronSecret, DEADLINE_MS - (Date.now() - gestartOp))
        }
        return { taak, uitkomst: 'gedaan' as const, synced: nieuw }
      } catch (err) {
        const melding = err instanceof Error ? err.message : String(err)
        // Een afgebroken fetch is de eigen deadline en geen fout van de
        // mailbox: uitstel, zodat een grote achterstand zijn foutbudget niet
        // opmaakt aan ronden waarin hij gewoon nog bezig was.
        const aanleiding = Date.now() - gestartOp >= DEADLINE_MS - 1_000 ? 'uitstel' : classificeerFout(melding)
        const gevolg = bepaalFoutAfhandeling(aanleiding, taak.retry_count, taak.uitstel_count)
        await rondAf(taak.id, runId, {
          status: gevolg.status,
          retry_count: gevolg.retry_count,
          uitstel_count: gevolg.uitstel_count,
          fout_soort: gevolg.fout_soort,
          foutmelding: melding.slice(0, 300),
          scheduled_at: new Date(Date.now() + gevolg.vertraging_ms).toISOString(),
          geclaimd_op: null,
          geclaimd_door: null,
          lease_tot: null,
          updated_at: new Date().toISOString(),
        })
        logUitkomst(taak, gevolg.status, melding, gevolg.fout_soort)
        if (gevolg.status === 'mislukt') await zetMailboxUitgezet(taak, gevolg.fout_soort, melding)
        return { taak, uitkomst: 'mislukt' as const, status: gevolg.status }
      }
    }))

    const gedaan = uitkomsten.filter((u) => u.uitkomst === 'gedaan')
    return res.status(200).json({
      opgeruimd,
      ingeplant,
      wachtend: due.length,
      geclaimd: uitkomsten.filter((u) => u.uitkomst !== 'verloren' && u.uitkomst !== 'geen-tijd').length,
      gedaan: gedaan.length,
      nieuweMail: gedaan.reduce((som, u) => som + (Number((u as { synced?: number }).synced) || 0), 0),
      verloren: uitkomsten.filter((u) => u.uitkomst === 'verloren').length,
      geenTijd: uitkomsten.filter((u) => u.uitkomst === 'geen-tijd').length,
      dodebrievenbus: uitkomsten.filter((u) => (u as { status?: string }).status === 'mislukt').length,
      duurMs: Date.now() - gestartOp,
    })
  } catch (err) {
    console.error('[cron-mailsync-werker] Fatal:', err)
    Sentry.captureException(err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Werker mislukt' })
  }
}
