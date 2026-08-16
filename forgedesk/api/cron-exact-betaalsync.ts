/**
 * Dagelijkse terugkoppeling Exact -> doen. voor betaalstatus.
 *
 * Leest per gekoppelde organisatie de gewijzigde betaaltermijnen uit Exact
 * (sync/Cashflow/PaymentTerms, delta op de Int64-rowversion Timestamp) en
 * spiegelt ze in exact_betaaltermijnen. Termijnbedragen gaan bewust NIET los
 * door factuur_betalingen: een Mollie-betaling duikt na het afletteren van de
 * payout ook in Exact op en zou dan dubbel tellen. Pas als álle termijnen van
 * een factuur status 50 (afgeletterd) hebben, boekt de cron het nog
 * openstaande restant als één betaling via factuur_markeer_betaald
 * (bron 'exact'; de RPC berekent het restant onder de rij-lock en genereert
 * per settle een unieke referentie).
 *
 * Exact-webhooks zijn hier bewust niet gebruikt: er bestaat geen topic voor
 * betalingen/afletteren en Exact geeft geen afleveringsgarantie. Eén delta-run
 * per dag kost een handvol calls en valt ruim binnen de limieten (60/min,
 * 5000/dag per app per administratie).
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET} header.
 * Schedule: dagelijks 05:45 UTC (06:45 winter- / 07:45 zomertijd Amsterdam).
 * De factuur-herinnering draait op 09:30 Amsterdam; door de cron in UTC te
 * plannen blijft de marge ook in zomertijd bijna twee uur, zodat de
 * herinneringen altijd met een verse stand vertrekken.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import * as Sentry from '@sentry/node'

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

const ZOMBIE_ORG = '08352d84-e2be-4760-9436-f468b4327438'
const EXACT_API_BASE = 'https://start.exactonline.nl/api/v1'
// Grens per run: 20 pagina's van max 1000 termijnen. De eerste inhaalslag kan
// meerdere runs duren; zolang dat loopt (inhaalslag_bezig) wordt er nog niets
// betaald gemarkeerd, omdat de spiegel dan incompleet kan zijn.
const MAX_PAGINAS_PER_RUN = 20

// -- Integration credential encryption (zelfde formaat als exact-sync-factuur.ts) --
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''
function encryptSecret(text: string): string {
  if (!INT_KEY) return text
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(INT_KEY, salt, 32)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return 'g1:' + Buffer.concat([salt, iv, cipher.getAuthTag(), ct]).toString('base64')
}
function decryptSecret(text: string): string {
  if (text && text.startsWith('g1:')) {
    if (!INT_KEY) throw new Error('Server-encryptie is niet geconfigureerd (INTEGRATION_ENCRYPTION_KEY).')
    try {
      const raw = Buffer.from(text.slice(3), 'base64')
      const key = crypto.scryptSync(INT_KEY, raw.subarray(0, 16), 32)
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(16, 28))
      decipher.setAuthTag(raw.subarray(28, 44))
      return Buffer.concat([decipher.update(raw.subarray(44)), decipher.final()]).toString('utf8')
    } catch {
      throw new Error('Integratie-token kan niet ontsleuteld worden (encryptie-key gewijzigd?).')
    }
  }
  if (!text || !text.includes(':') || text.length < 34) return text
  if (!INT_KEY) { console.warn('[encryption] INTEGRATION_ENCRYPTION_KEY not set'); return text }
  try {
    const key = crypto.scryptSync(INT_KEY, 'integration', 32)
    const [ivHex, enc] = text.split(':')
    if (!ivHex || ivHex.length !== 32 || !enc) return text
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
    return decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8')
  } catch { console.warn('[encryption] decrypt failed, treating as plaintext'); return text }
}

async function getOrgIdForUser(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()
  return ((data as { organisatie_id?: string } | null)?.organisatie_id) ?? null
}

async function loadAppSettingsOrgFirst(
  supabase: SupabaseClient,
  userId: string,
  columns: string,
): Promise<Record<string, unknown> | null> {
  const orgId = await getOrgIdForUser(supabase, userId)
  if (orgId) {
    const { data } = await supabase
      .from('app_settings')
      .select(columns)
      .eq('organisatie_id', orgId)
      .maybeSingle()
    if (data) return data as unknown as Record<string, unknown>
  }
  const { data } = await supabase
    .from('app_settings')
    .select(columns)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as Record<string, unknown> | null) ?? null
}

// ── Token-machinerie: zelfde compare-and-swap-rotatie als exact-sync-factuur.ts.
// De cache leeft per org-run; de cron draait organisaties sequentieel.
type TokenCache = { accessToken: string | null; expiresAt: number }

async function schrijfGeroteerdeKeten(params: {
  tokenUserId: string
  gelezenRefreshToken: string
  nieuweRij: Record<string, unknown>
  versAccessToken: string
}): Promise<string> {
  const { tokenUserId, gelezenRefreshToken, nieuweRij, versAccessToken } = params

  const { data: bijgewerkt, error: updateFout } = await supabaseAdmin
    .from('exact_tokens')
    .update(nieuweRij)
    .eq('user_id', tokenUserId)
    .eq('refresh_token', gelezenRefreshToken)
    .select('user_id')

  if (!updateFout && bijgewerkt?.length) return versAccessToken

  if (updateFout) {
    // Exact heeft de oude keten al ongeldig gemaakt; zonder deze write staat
    // er een dode keten in de DB. Anders dan het interactieve pad (waar een
    // gebruiker op zijn factuur wacht) is er voor een nachtelijke cron geen
    // reden om door te syncen alsof er niets gebeurd is: hard falen zet
    // laatste_fout en maakt de breuk zichtbaar vóór iemand anders op de dode
    // keten invalid_grant haalt.
    console.error('[Exact] geroteerde token NIET opgeslagen — keten is hierna dood', {
      token_user_id: tokenUserId, endpoint: 'cron-exact-betaalsync.ts', fout: updateFout.message,
    })
    Sentry.captureException(new Error('Exact token rotation not persisted'), {
      level: 'error',
      tags: { exact_endpoint: 'cron-exact-betaalsync', oauth_error: 'rotation_not_persisted' },
      extra: { token_user_id: tokenUserId, fout: updateFout.message },
    })
    throw new Error('TOKEN_ROTATIE_NIET_OPGESLAGEN')
  }

  // Nul rijen geraakt: de rij is inmiddels vervangen of verwijderd.
  const { data: huidig } = await supabaseAdmin
    .from('exact_tokens')
    .select('access_token')
    .eq('user_id', tokenUserId)
    .maybeSingle()
  const huidigToken = (huidig as { access_token?: string | null } | null)?.access_token
  if (huidigToken) {
    // Nieuwere keten van een parallelle refresh of verse OAuth-callback is
    // leidend; onze rotatie laten we vallen.
    return decryptSecret(huidigToken)
  }

  // Rij is weg. Dat kan een expliciete ontkoppeling zijn (dan NIET
  // reanimeren), maar ook een interactief pad dat tijdens onze refresh
  // invalid_grant kreeg en de rij wiste — dan is onze verse keten de enige
  // werkende die nog bestaat en zou weggooien de hele org ontkoppelen.
  // Zelfde discriminator als exact-sync-factuur.ts: exact_owner_user_id en
  // exact_online_connected worden bij een echte ontkoppeling geleegd.
  const settings = await loadAppSettingsOrgFirst(
    supabaseAdmin,
    tokenUserId,
    'exact_owner_user_id, exact_online_connected',
  )
  const eigenaar = (settings?.exact_owner_user_id as string | null) ?? null
  const nogGekoppeld = eigenaar === tokenUserId || (eigenaar === null && settings?.exact_online_connected === true)

  if (!nogGekoppeld) {
    console.warn('[Exact] rotatie niet bewaard: koppeling is inmiddels ontkoppeld', { token_user_id: tokenUserId })
    return versAccessToken
  }

  const { error: insertFout } = await supabaseAdmin.from('exact_tokens').insert(nieuweRij)
  // 23505 = een parallel request maakte de rij net aan; die keten is nieuwer.
  if (insertFout && insertFout.code !== '23505') {
    console.error('[Exact] geroteerde token NIET opgeslagen (insert)', {
      token_user_id: tokenUserId, fout: insertFout.message,
    })
    Sentry.captureException(new Error('Exact token rotation not persisted'), {
      level: 'error',
      tags: { exact_endpoint: 'cron-exact-betaalsync', oauth_error: 'rotation_not_persisted' },
      extra: { token_user_id: tokenUserId, fout: insertFout.message },
    })
    throw new Error('TOKEN_ROTATIE_NIET_OPGESLAGEN')
  }
  return versAccessToken
}

async function getValidToken(tokenUserId: string, cache: TokenCache): Promise<{ token: string; division: number | null }> {
  const { data: tokenData } = await supabaseAdmin
    .from('exact_tokens')
    .select('access_token, refresh_token, expires_at, division')
    .eq('user_id', tokenUserId)
    .maybeSingle() as { data: { access_token: string; refresh_token: string; expires_at: string; division: number | null } | null }

  if (!tokenData) throw new Error('GEEN_TOKENS')

  if (cache.accessToken && cache.expiresAt - Date.now() > 5 * 60 * 1000) {
    return { token: cache.accessToken, division: tokenData.division }
  }

  const expiresAt = new Date(tokenData.expires_at).getTime()
  if (expiresAt < Date.now() + 5 * 60 * 1000) {
    const settings = await loadAppSettingsOrgFirst(
      supabaseAdmin,
      tokenUserId,
      'exact_online_client_id, exact_online_client_secret',
    )
    const exactClientId = settings?.exact_online_client_id as string | undefined
    const exactClientSecret = settings?.exact_online_client_secret ? decryptSecret(settings.exact_online_client_secret as string) : undefined
    if (!exactClientId || !exactClientSecret) throw new Error('Exact credentials niet gevonden')

    const refreshRes = await fetch('https://start.exactonline.nl/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decryptSecret(tokenData.refresh_token),
        client_id: exactClientId,
        client_secret: exactClientSecret,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!refreshRes.ok) {
      const errorBody = await refreshRes.text()
      if (refreshRes.status === 400 || refreshRes.status === 401) {
        // Single-use refresh tokens: een parallelle refresh kan net gewonnen
        // hebben. Herlees; staat er een nieuwe keten, gebruik die. De cron
        // verwijdert bij invalid_grant bewust NIETS — dat oordeel is aan de
        // interactieve paden, een nachtelijke job mag niet ontkoppelen.
        await new Promise((r) => setTimeout(r, 1500))
        const { data: herlezen } = await supabaseAdmin
          .from('exact_tokens')
          .select('access_token, refresh_token')
          .eq('user_id', tokenUserId)
          .maybeSingle()
        if (herlezen?.refresh_token && herlezen.refresh_token !== tokenData.refresh_token) {
          return { token: decryptSecret(herlezen.access_token), division: tokenData.division }
        }
        if (errorBody.includes('invalid_grant')) {
          Sentry.captureException(new Error('Exact invalid_grant'), {
            level: 'warning',
            tags: { exact_endpoint: 'cron-exact-betaalsync', oauth_error: 'invalid_grant' },
            extra: { token_user_id: tokenUserId },
          })
          throw new Error('TOKEN_AFGEWEZEN')
        }
      }
      throw new Error(`Token vernieuwen mislukt (${refreshRes.status})`)
    }

    const tokens = await refreshRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
    if (!tokens?.access_token) throw new Error('Token-refresh gaf 200 zonder access_token')

    const nieuweRij = {
      user_id: tokenUserId,
      access_token: encryptSecret(tokens.access_token),
      refresh_token: encryptSecret(tokens.refresh_token || decryptSecret(tokenData.refresh_token)),
      expires_at: new Date(Date.now() + (tokens.expires_in ?? 600) * 1000).toISOString(),
      division: tokenData.division,
      updated_at: new Date().toISOString(),
    }
    const uitkomst = await schrijfGeroteerdeKeten({
      tokenUserId,
      gelezenRefreshToken: tokenData.refresh_token,
      nieuweRij,
      versAccessToken: tokens.access_token,
    })
    cache.accessToken = uitkomst
    cache.expiresAt = new Date(nieuweRij.expires_at).getTime()
    return { token: uitkomst, division: tokenData.division }
  }

  const bestaand = decryptSecret(tokenData.access_token)
  cache.accessToken = bestaand
  cache.expiresAt = expiresAt
  return { token: bestaand, division: tokenData.division }
}

// 429 met Retry-After (gecapt) en maximaal twee extra pogingen. Alle calls in
// dit bestand zijn idempotente GET's, dus een afgekapte poging mag ook één keer
// over: AbortSignal.timeout gooit een TimeoutError (oudere runtimes: AbortError)
// en die zou anders de hele org-run laten falen op één trage response.
//
// Fetch én json() zitten samen in de lus. Stond het body-lezen erbuiten, dan
// gooide een trage body ná snelle headers een TimeoutError die de retry-laag
// niet zag — precies het geval dat deze retry moest afvangen.
async function exactFetchJsonMetRetry<T>(url: string, init: RequestInit, label: string): Promise<T> {
  let rateLimitPogingen = 0
  let timeoutPogingOver = true
  for (;;) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) })
      if (response.status === 429 && rateLimitPogingen < 2) {
        rateLimitPogingen++
        const retryAfter = Number(response.headers.get('Retry-After'))
        const wachtMs = Math.min((retryAfter > 0 ? retryAfter : 5) * 1000, 15_000)
        await new Promise((r) => setTimeout(r, wachtMs))
        continue
      }
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Exact API fout (${label}): ${response.status} - ${body.slice(0, 300)}`)
      }
      return await response.json() as T
    } catch (err) {
      const naam = err instanceof Error ? err.name : ''
      if (!timeoutPogingOver || (naam !== 'TimeoutError' && naam !== 'AbortError')) throw err
      timeoutPogingOver = false
    }
  }
}

interface ExactPaymentTerm {
  ID?: string
  Timestamp?: number
  EntryNumber?: number
  InvoiceNumber?: number | null
  YourRef?: string | null
  AmountDC?: number | null
  AmountDiscountDC?: number | null
  Status?: number | null
  LineType?: number | null
  LastPaymentDate?: string | null
}

// Exact serialiseert datums als "/Date(1618963200000)/".
// Geverifieerd tegen een echte Exact-respons: LastPaymentDate staat op exacte
// UTC-middernacht (ms % 86400000 === 0), dus toISOString() knipt de juiste dag
// af en er is geen tijdzone-correctie nodig. Niet "fixen".
function parseExactDate(value: string | null | undefined): string | null {
  if (!value) return null
  const m = /\/Date\((\d+)/.exec(value)
  if (!m) return null
  return new Date(Number(m[1])).toISOString().split('T')[0]
}

async function haalTermijnPaginas(token: string, division: string, vanafTimestamp: number, deadline: number): Promise<{
  termijnen: ExactPaymentTerm[]
  afgekapt: boolean
}> {
  const select = 'ID,Timestamp,EntryNumber,InvoiceNumber,YourRef,AmountDC,AmountDiscountDC,Status,LineType,LastPaymentDate'
  // Int64-literal vereist het L-suffix; eerste run start op 0.
  let url: string | null =
    `${EXACT_API_BASE}/${division}/sync/Cashflow/PaymentTerms` +
    `?$filter=${encodeURIComponent(`Timestamp gt ${vanafTimestamp}L`)}` +
    `&$select=${encodeURIComponent(select)}`
  const termijnen: ExactPaymentTerm[] = []
  let paginas = 0

  while (url && paginas < MAX_PAGINAS_PER_RUN) {
    // Op de deadline NIET gooien maar breken: gooien zou de al opgehaalde
    // termijnen én de cursor-vooruitgang weggooien, waarna dezelfde run morgen
    // identiek strandt. Breken laat het bestaande afkap-mechanisme de spiegel
    // upserten en de timestamp vooruitzetten, dus de volgende run begint verder.
    if (Date.now() > deadline) break
    const pagina: { d?: { results?: ExactPaymentTerm[]; __next?: string } } = await exactFetchJsonMetRetry(
      url,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      'sync/Cashflow/PaymentTerms',
    )
    termijnen.push(...(pagina?.d?.results ?? []))
    url = pagina?.d?.__next ?? null
    paginas++
  }
  return { termijnen, afgekapt: !!url }
}

interface OrgConfig {
  organisatie_id: string
  exact_owner_user_id: string | null
  exact_administratie_id: string | null
  exact_betaalsync_actief?: boolean | null
}

interface SpiegelTermijn {
  factuur_id: string
  bedrag: number
  status: number | null
  laatste_betaaldatum: string | null
}

// Facturen per chunk gelijktijdig evalueren. Sequentieel kost elke factuur 1-2
// Supabase-roundtrips; bij een inhaalslag van duizenden facturen loopt dat over
// de maxDuration heen, waarna de kill de state-upsert verhindert en de volgende
// run exact hetzelfde probleem heeft. Tien tegelijk is genoeg om binnen het
// budget te blijven zonder de connectiepool te verzuipen.
const EVALUATIE_CHUNK = 10

// Match op YourRef: daar staat het doen.-factuurnummer sinds de eerste sync
// (exact-sync-factuur.ts stuurt nummer als YourRef mee). Exacts eigen
// InvoiceNumber is een integer met een eigen reeks en matcht dus niet.
// De guard op exact_entry_id voorkomt dat een handmatige Exact-boeking met
// een toevallig gelijk "uw referentie" (bv. een PO-nummer van een klant)
// zich aan een nooit-gesyncte doen.-factuur hangt en die op betaald zet.
async function zoekFacturenOpNummer(orgId: string, refs: string[]): Promise<Map<string, { id: string; status: string }>> {
  const factuurPerRef = new Map<string, { id: string; status: string }>()
  for (let i = 0; i < refs.length; i += 100) {
    const chunk = refs.slice(i, i + 100)
    const { data: facturen, error } = await supabaseAdmin
      .from('facturen')
      .select('id, nummer, status')
      .eq('organisatie_id', orgId)
      .not('exact_entry_id', 'is', null)
      .in('nummer', chunk)
    if (error) throw new Error(`facturen-lookup mislukt: ${error.message}`)
    for (const f of (facturen ?? []) as { id: string; nummer: string; status: string }[]) {
      factuurPerRef.set(f.nummer, { id: f.id, status: f.status })
    }
  }
  return factuurPerRef
}

// Openstaand terugschrijven en volledig afgeletterde facturen betaald
// markeren. Geen vaste settle-referentie: factuur_markeer_betaald berekent
// het restant onder de rij-lock en genereert zelf een unieke referentie,
// zodat een tweede settle (bv. na een Mollie-refund) het restant bíjboekt
// in plaats van de oude settle-rij te herinterpreteren en betaald_bedrag te
// verlagen. Dubbele gelijktijdige aanroepen serialiseren op de lock: de
// tweede ziet restant 0 en boekt niets.
async function evalueerFactuur(
  orgId: string,
  factuur: { id: string; status: string },
  rijen: SpiegelTermijn[],
): Promise<boolean> {
  if (rijen.length === 0) return false

  const openstaand = Math.round(rijen
    .filter((r) => r.status !== 50)
    .reduce((som, r) => som + (Number(r.bedrag) || 0), 0) * 100) / 100
  const allesAfgeletterd = rijen.every((r) => r.status === 50)

  // De org-filter is defensief: de ids komen uit org-gefilterde bronnen, maar
  // een factuur die ooit van organisatie wisselde zou anders cross-org
  // beschreven worden.
  const { error: standFout } = await supabaseAdmin
    .from('facturen')
    .update({ openstaand_exact: openstaand, exact_stand_op: new Date().toISOString() })
    .eq('id', factuur.id)
    .eq('organisatie_id', orgId)
  if (standFout) throw new Error(`openstaand_exact-update mislukt: ${standFout.message}`)

  // Bewuste versimpeling: status 50 kan ook via betalingskorting of een
  // afboeking bereikt zijn; het restant wordt dan toch als "ontvangen"
  // geboekt. De korting-kolom staat in de spiegel voor wie dat later
  // wil uitsplitsen.
  if (allesAfgeletterd && ['open', 'verzonden', 'vervallen'].includes(factuur.status)) {
    // Jongste bankdatum van de termijnen: dát is de dag waarop de factuur
    // volledig binnen was. Zonder deze waarde zou de RPC terugvallen op de
    // crondag en zou elke betaling de datum van de nachtrun krijgen.
    const betaaldOp = rijen
      .map((r) => r.laatste_betaaldatum)
      .filter((d): d is string => !!d)
      .sort()
      .pop() ?? null

    const { error: settleFout } = await supabaseAdmin.rpc('factuur_markeer_betaald', {
      p_factuur_id: factuur.id,
      p_bron: 'exact',
      p_betaald_op: betaaldOp,
    })
    if (settleFout) throw new Error(`settle mislukt voor factuur ${factuur.id}: ${settleFout.message}`)
    return true
  }
  return false
}

// De deadline is hard: bij overschrijding stopt de evaluatie met
// EVALUATIE_ONVOLTOOID, zodat de catch in de handler alleen laatste_fout zet.
// De cursor (laatste_timestamp) en inhaalslag_bezig blijven dan staan en de
// volgende run herstart idempotent — beter een halve evaluatie die morgen
// verdergaat dan een platform-kill die de state-upsert helemaal overslaat.
// De koppel- en spiegel-leesfase bewaken dezelfde deadline en gooien
// RUN_ONVOLTOOID; daar gaat niets verloren (de spiegel is idempotent en de
// cursor staat al goed). De fetchfase gooit bewust niet maar kapt af, omdat
// daar wél opgehaalde delta en cursor-vooruitgang op het spel staan.
async function evalueerFacturen(
  orgId: string,
  facturen: { id: string; status: string }[],
  termijnenPerFactuur: Map<string, SpiegelTermijn[]>,
  deadline: number,
): Promise<number> {
  let gesettled = 0
  for (let i = 0; i < facturen.length; i += EVALUATIE_CHUNK) {
    if (Date.now() > deadline) throw new Error('EVALUATIE_ONVOLTOOID')
    const chunk = facturen.slice(i, i + EVALUATIE_CHUNK)
    const uitkomsten = await Promise.all(
      chunk.map((factuur) => evalueerFactuur(orgId, factuur, termijnenPerFactuur.get(factuur.id) ?? []))
    )
    gesettled += uitkomsten.filter(Boolean).length
  }
  return gesettled
}

async function haalSpiegel(orgId: string, deadline: number, factuurIds?: string[]): Promise<Map<string, SpiegelTermijn[]>> {
  const perFactuur = new Map<string, SpiegelTermijn[]>()
  const verwerk = (rijen: SpiegelTermijn[]) => {
    for (const r of rijen) {
      if (!perFactuur.has(r.factuur_id)) perFactuur.set(r.factuur_id, [])
      perFactuur.get(r.factuur_id)!.push(r)
    }
  }
  if (factuurIds) {
    for (let i = 0; i < factuurIds.length; i += 50) {
      if (Date.now() > deadline) throw new Error('RUN_ONVOLTOOID')
      const { data, error } = await supabaseAdmin
        .from('exact_betaaltermijnen')
        .select('factuur_id, bedrag, status, laatste_betaaldatum')
        .eq('organisatie_id', orgId)
        .eq('line_type', 20)
        .in('factuur_id', factuurIds.slice(i, i + 50))
        .range(0, 4999)
      if (error) throw new Error(`spiegel-lezing mislukt: ${error.message}`)
      verwerk((data ?? []) as SpiegelTermijn[])
    }
    return perFactuur
  }
  // Volledige spiegel, gepagineerd (PostgREST kapt op 1000 af).
  for (let offset = 0; ; offset += 1000) {
    if (Date.now() > deadline) throw new Error('RUN_ONVOLTOOID')
    const { data, error } = await supabaseAdmin
      .from('exact_betaaltermijnen')
      .select('factuur_id, bedrag, status, laatste_betaaldatum')
      .eq('organisatie_id', orgId)
      .eq('line_type', 20)
      .not('factuur_id', 'is', null)
      .order('id')
      .range(offset, offset + 999)
    if (error) throw new Error(`spiegel-lezing mislukt: ${error.message}`)
    verwerk((data ?? []) as SpiegelTermijn[])
    if (!data || data.length < 1000) break
  }
  return perFactuur
}

// Legacy-orgs zijn gekoppeld zonder dat exact_owner_user_id ooit gevuld is:
// exact_online_connected staat aan en de rest van de keten (o.a. de
// nogGekoppeld-discriminator) beschouwt zo'n org terecht als gekoppeld. Hard
// falen op GEEN_EIGENAAR zou de betaalsync daar stil voor altijd stilzetten, en
// daarmee ook de herinneringsmotor die op een verse stand wacht. Zoek daarom de
// tokenhouder op: een exact_tokens-rij van een gebruiker die via
// profiles.organisatie_id bij deze org hoort.
//
// Alleen met een ingestelde administratie, en bij voorkeur een kandidaat wiens
// token op diezelfde division staat. Zonder die toets kan een gebruiker die
// naar deze org verhuisd is met een wees-tokenrij van zijn vórige werkgever de
// tokenhouder worden, en spiegelt de cron de betaalstand van een vreemde
// boekhouding naar de facturen van deze org. Meerdere kandidaten? De laatst
// ververste keten is de levende.
async function zoekTokenhouderVoorOrg(orgId: string, administratieId: string | null): Promise<string | null> {
  if (!administratieId) return null

  const { data: profielen } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('organisatie_id', orgId)
  const userIds = ((profielen ?? []) as { id: string }[]).map((p) => p.id)
  if (userIds.length === 0) return null

  const { data: tokens } = await supabaseAdmin
    .from('exact_tokens')
    .select('user_id, division')
    .in('user_id', userIds)
    .order('updated_at', { ascending: false })
  const kandidaten = (tokens ?? []) as { user_id: string; division: number | null }[]
  if (kandidaten.length === 0) return null

  const opAdministratie = kandidaten.find(
    (k) => k.division != null && String(k.division) === String(administratieId)
  )
  if (opAdministratie) return opAdministratie.user_id

  // Geen enkele kandidaat staat op de ingestelde administratie. Dat hoeft niet
  // fout te zijn (de division-kolom kan NULL zijn als /current/Me faalde bij de
  // callback), maar het is niet te verifiëren — daarom zichtbaar in de log.
  console.warn('[cron-exact-betaalsync] tokenhouder gekozen zonder administratie-match', {
    organisatie_id: orgId,
    token_user_id: kandidaten[0].user_id,
    administratie_id: administratieId,
  })
  return kandidaten[0].user_id
}

async function syncOrganisatie(org: OrgConfig, deadline: number): Promise<{ verwerkt: number; gesettled: number; afgekapt: boolean }> {
  let eigenaarUserId = org.exact_owner_user_id
  if (!eigenaarUserId) {
    // Zonder ingestelde administratie is de tokenhouder niet te verifiëren en
    // geeft zoekTokenhouderVoorOrg null. Dat als GEEN_EIGENAAR wegschrijven
    // wijst de beheerder de verkeerde kant op: het gat zit in de administratie.
    if (!org.exact_administratie_id) {
      console.warn('[cron-exact-betaalsync] geen exact_owner_user_id én geen administratie ingesteld, tokenhouder niet te bepalen', {
        organisatie_id: org.organisatie_id,
      })
      throw new Error('GEEN_ADMINISTRATIE')
    }
    eigenaarUserId = await zoekTokenhouderVoorOrg(org.organisatie_id, org.exact_administratie_id)
    if (!eigenaarUserId) throw new Error('GEEN_EIGENAAR')
    console.log('[cron-exact-betaalsync] lege exact_owner_user_id, terugval op tokenhouder', {
      organisatie_id: org.organisatie_id, token_user_id: eigenaarUserId,
    })
  }

  // `exact_tokens` heeft geen organisatie_id: check dat de eigenaar nog bij
  // déze organisatie hoort, anders synct org A met de sessie (en mogelijk de
  // administratie) die de verhuisde eigenaar inmiddels voor org B gebruikt.
  const eigenaarOrg = await getOrgIdForUser(supabaseAdmin, eigenaarUserId)
  if (eigenaarOrg !== org.organisatie_id) throw new Error('EIGENAAR_ANDERE_ORG')

  const cache: TokenCache = { accessToken: null, expiresAt: 0 }
  const { token, division: tokenDivision } = await getValidToken(eigenaarUserId, cache)
  const division = org.exact_administratie_id || (tokenDivision != null ? String(tokenDivision) : null)
  if (!division) throw new Error('GEEN_ADMINISTRATIE')

  const { data: state } = await supabaseAdmin
    .from('exact_sync_state')
    .select('laatste_timestamp, inhaalslag_bezig')
    .eq('organisatie_id', org.organisatie_id)
    .maybeSingle()
  const vanaf = Number((state as { laatste_timestamp?: number } | null)?.laatste_timestamp ?? 0)
  // Ontbrekende rij telt als inhaalslag: de eerste run moet sowieso de
  // volledige evaluatie draaien zodra hij compleet is.
  const inhaalslagWasBezig = (state as { inhaalslag_bezig?: boolean } | null)?.inhaalslag_bezig ?? true

  const { termijnen, afgekapt } = await haalTermijnPaginas(token, division, vanaf, deadline)

  // Alleen debiteurentermijnen (LineType 20); crediteuren (22) zijn de
  // inkoopkant en blijven buiten dit domein.
  const relevant = termijnen.filter((t) => t.LineType === 20 && t.ID)
  const maxTimestamp = termijnen.reduce((max, t) => Math.max(max, Number(t.Timestamp) || 0), vanaf)

  const refs = Array.from(new Set(relevant.map((t) => (t.YourRef || '').trim()).filter(Boolean)))
  const factuurPerRef = await zoekFacturenOpNummer(org.organisatie_id, refs)

  if (relevant.length > 0) {
    const nu = new Date().toISOString()
    const spiegelRijen = relevant.map((t) => ({
      organisatie_id: org.organisatie_id,
      term_id: t.ID,
      factuur_id: factuurPerRef.get((t.YourRef || '').trim())?.id ?? null,
      entry_number: t.EntryNumber ?? null,
      invoice_number: t.InvoiceNumber ?? null,
      your_ref: (t.YourRef || '').trim() || null,
      bedrag: Math.round((Number(t.AmountDC) || 0) * 100) / 100,
      korting: t.AmountDiscountDC != null ? Math.round(Number(t.AmountDiscountDC) * 100) / 100 : null,
      status: t.Status ?? null,
      line_type: t.LineType ?? null,
      laatste_betaaldatum: parseExactDate(t.LastPaymentDate),
      exact_timestamp: Number(t.Timestamp) || null,
      updated_at: nu,
    }))
    for (let i = 0; i < spiegelRijen.length; i += 500) {
      const { error } = await supabaseAdmin
        .from('exact_betaaltermijnen')
        .upsert(spiegelRijen.slice(i, i + 500), { onConflict: 'organisatie_id,term_id' })
      if (error) throw new Error(`spiegel-upsert mislukt: ${error.message}`)
    }
  }

  // Facturen die in déze run in de delta zaten. Beide takken hebben ze nodig:
  // de delta-tak evalueert precies deze set, de inhaalslag-tak moet ze altijd
  // meenemen omdat hun spiegel zojuist gewijzigd is.
  const geraakteFacturen = Array.from(new Map(
    relevant
      .map((t) => factuurPerRef.get((t.YourRef || '').trim()))
      .filter((f): f is { id: string; status: string } => !!f)
      .map((f) => [f.id, f])
  ).values())
  const geraakteIds = new Set(geraakteFacturen.map((f) => f.id))

  // Zolang de inhaalslag loopt kan de spiegel incompleet zijn; dan alleen
  // spiegelen en nog niets betaald markeren of openstaand terugschrijven.
  let gesettled = 0
  if (!afgekapt) {
    if (inhaalslagWasBezig) {
      // De run die de inhaalslag afrondt evalueert de VOLLEDIGE spiegel:
      // termijnen uit eerdere afgekapte runs (waaronder facturen die toen al
      // volledig afgeletterd waren) komen nooit meer in een delta terug en
      // zouden anders nooit gesettled worden. Eerst nog niet-gekoppelde
      // spiegelrijen alsnog aan facturen koppelen.
      // Cursor-paginatie op id: de updates in deze loop halen rijen uit de
      // filterset (factuur_id IS NULL), dus offset-vensters zouden rijen
      // overslaan. Een cursor die alleen vooruit beweegt ziet elke rij
      // precies één keer, ongeacht wat er onderweg gekoppeld wordt.
      let cursor = ''
      for (;;) {
        if (Date.now() > deadline) throw new Error('RUN_ONVOLTOOID')
        let query = supabaseAdmin
          .from('exact_betaaltermijnen')
          .select('id, your_ref')
          .eq('organisatie_id', org.organisatie_id)
          .eq('line_type', 20)
          .is('factuur_id', null)
          .not('your_ref', 'is', null)
          .order('id')
          .limit(1000)
        if (cursor) query = query.gt('id', cursor)
        const { data: losseRijen, error } = await query
        if (error) throw new Error(`spiegel-koppeling lezen mislukt: ${error.message}`)
        const rijen = (losseRijen ?? []) as { id: string; your_ref: string }[]
        if (rijen.length === 0) break
        cursor = rijen[rijen.length - 1].id

        const losseRefs = Array.from(new Set(rijen.map((r) => r.your_ref)))
        const gevonden = await zoekFacturenOpNummer(org.organisatie_id, losseRefs)
        for (const [ref, factuur] of gevonden) {
          const { error: koppelFout } = await supabaseAdmin
            .from('exact_betaaltermijnen')
            .update({ factuur_id: factuur.id, updated_at: new Date().toISOString() })
            .eq('organisatie_id', org.organisatie_id)
            .eq('your_ref', ref)
            .is('factuur_id', null)
          if (koppelFout) throw new Error(`spiegel-koppeling mislukt: ${koppelFout.message}`)
        }
        if (rijen.length < 1000) break
      }

      const spiegel = await haalSpiegel(org.organisatie_id, deadline)
      const alleIds = Array.from(spiegel.keys())
      const statusPerId = new Map<string, { status: string; standOp: string | null }>()
      for (let i = 0; i < alleIds.length; i += 100) {
        const { data: statusRijen, error } = await supabaseAdmin
          .from('facturen')
          .select('id, status, exact_stand_op')
          .eq('organisatie_id', org.organisatie_id)
          .in('id', alleIds.slice(i, i + 100))
        if (error) throw new Error(`facturen-status lezen mislukt: ${error.message}`)
        for (const f of (statusRijen ?? []) as { id: string; status: string; exact_stand_op: string | null }[]) {
          statusPerId.set(f.id, { status: f.status, standOp: f.exact_stand_op })
        }
      }

      // Hervat-cursor voor de volledige evaluatie. Zonder dit begon een op de
      // deadline afgebroken evaluatie de volgende run weer bij factuur één en
      // kwam een grote spiegel nooit voorbij dezelfde kop — de klassieke
      // livelock. evalueerFactuur zet exact_stand_op bij elke openstaand-update,
      // dus een verse stand betekent dat een eerdere run deze factuur al deed.
      // Het venster moet LANGER zijn dan het runinterval, anders telt het werk
      // van gisteren nooit als vers en begint elke run weer bij dezelfde kop:
      // 24 uur cadans + marge voor zomertijd-schuif en late starts = 30 uur.
      const standGrens = Date.now() - 30 * 60 * 60 * 1000
      const metStand = alleIds
        .map((id) => ({ id, ...(statusPerId.get(id) ?? { status: 'onbekend', standOp: null }) }))
      const isOnvers = (f: { standOp: string | null }) => !f.standOp || new Date(f.standOp).getTime() < standGrens
      // Volgorde bewaakt de monotone voortgang: eerst de nog niet (vers)
      // geëvalueerde staart van de cursor, pas daarna de facturen die alleen
      // meegaan omdat ze in de delta van déze run zaten. Andersom zou een
      // grote, elke run identieke delta-set het budget opeten en de cursor
      // nooit laten opschuiven.
      const cursorRest = metStand.filter(isOnvers)
      const geforceerdVers = metStand.filter((f) => !isOnvers(f) && geraakteIds.has(f.id))
      const teEvalueren = [...cursorRest, ...geforceerdVers].map((f) => ({ id: f.id, status: f.status }))

      gesettled = await evalueerFacturen(org.organisatie_id, teEvalueren, spiegel, deadline)
    } else {
      // Delta-tak: die set is klein en mag altijd verversen, dus hier geen
      // exact_stand_op-filter — een factuur die vandaag opnieuw in de delta
      // zit, is in Exact ook echt gewijzigd.
      const spiegel = await haalSpiegel(org.organisatie_id, deadline, geraakteFacturen.map((f) => f.id))
      gesettled = await evalueerFacturen(org.organisatie_id, geraakteFacturen, spiegel, deadline)
    }
  }

  // Een afkap die niets ophaalde (deadline verstreek vóór pagina 1) is geen
  // sync-resultaat: de spiegel is exact even compleet als daarvoor. De vlag
  // inhaalslag_bezig flippen zou een gezonde delta-org onterecht pauzeren en
  // een verse laatste_sync_op zou de staleness-detectie uitschakelen terwijl
  // er nul werk gedaan is. Alleen laatste_fout + updated_at (fairness).
  if (afgekapt && termijnen.length === 0) {
    await supabaseAdmin
      .from('exact_sync_state')
      .upsert({
        organisatie_id: org.organisatie_id,
        laatste_fout: 'RUN_ONVOLTOOID',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organisatie_id' })
    return { verwerkt: 0, gesettled: 0, afgekapt: true }
  }

  const { error: stateFout } = await supabaseAdmin
    .from('exact_sync_state')
    .upsert({
      organisatie_id: org.organisatie_id,
      division,
      laatste_timestamp: maxTimestamp,
      laatste_sync_op: new Date().toISOString(),
      laatste_fout: null,
      inhaalslag_bezig: afgekapt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organisatie_id' })
  if (stateFout) throw new Error(`sync_state-upsert mislukt: ${stateFout.message}`)

  return { verwerkt: relevant.length, gesettled, afgekapt }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Beide migraties nodig: 211 (spiegel + state) én 210 (de betaal-RPC's).
  // Ontbreekt er één, dan is er niets te doen en niets kapot.
  const { error: probe211 } = await supabaseAdmin.from('exact_sync_state').select('organisatie_id').limit(1)
  if (probe211 && probe211.code === 'PGRST205') {
    console.warn('[cron-exact-betaalsync] migratie 211 ontbreekt nog, run overgeslagen')
    return res.status(200).json({ skipped: 'migratie_211_ontbreekt' })
  }
  const { error: probe210 } = await supabaseAdmin.from('factuur_betalingen').select('id').limit(1)
  if (probe210 && probe210.code === 'PGRST205') {
    console.warn('[cron-exact-betaalsync] migratie 210 ontbreekt nog, run overgeslagen')
    return res.status(200).json({ skipped: 'migratie_210_ontbreekt' })
  }

  const { data: orgRijen, error: orgFout } = await supabaseAdmin
    .from('app_settings')
    .select('organisatie_id, exact_owner_user_id, exact_administratie_id, exact_betaalsync_actief')
    .eq('exact_online_connected', true)
    .not('organisatie_id', 'is', null)
    .neq('organisatie_id', ZOMBIE_ORG)
    .order('updated_at', { ascending: false })

  if (orgFout) {
    Sentry.captureException(orgFout)
    return res.status(500).json({ error: orgFout.message })
  }

  // Nieuwste rij per organisatie: orgs kunnen door een historische bug
  // meerdere app_settings-rijen hebben, en een legacy-rij met een oude
  // eigenaar zou anders na een geslaagde run alsnog een fout wegschrijven.
  const perOrg = new Map<string, OrgConfig>()
  for (const rij of (orgRijen ?? []) as OrgConfig[]) {
    if (!perOrg.has(rij.organisatie_id)) perOrg.set(rij.organisatie_id, rij)
  }

  // Langst niet aangeraakt eerst: een org met een grote inhaalslag mag de rest
  // niet dagen achtereen verhongeren binnen de maxDuration. Sorteren op
  // updated_at en niet op laatste_sync_op, want updated_at wordt óók in het
  // foutpad bijgewerkt: een org die elke nacht strandt houdt anders voor altijd
  // een lege laatste_sync_op, staat elke run vooraan en eet het budget op.
  // Nooit-gesyncte orgs (geen state-rij) gaan voorop.
  const orgs = Array.from(perOrg.values())
  const { data: stateRijen } = await supabaseAdmin
    .from('exact_sync_state')
    .select('organisatie_id, updated_at')
    .in('organisatie_id', orgs.map((o) => o.organisatie_id))
  const aangeraaktPerOrg = new Map(
    ((stateRijen ?? []) as { organisatie_id: string; updated_at: string | null }[])
      .map((r) => [r.organisatie_id, r.updated_at])
  )
  orgs.sort((a, b) => {
    const ta = aangeraaktPerOrg.get(a.organisatie_id) ?? ''
    const tb = aangeraaktPerOrg.get(b.organisatie_id) ?? ''
    // ISO-8601 in UTC: byte-volgorde is chronologische volgorde.
    return ta < tb ? -1 : ta > tb ? 1 : 0
  })

  const start = Date.now()
  const TIJD_BUDGET_MS = 240_000
  // Zelfde budget als de org-loop: de evaluatie binnen één org moet stoppen op
  // hetzelfde moment waarop de loop geen nieuwe org meer zou starten.
  const deadline = start + TIJD_BUDGET_MS
  // Per org een eigen plafond binnen dat budget. Eén org met een grote
  // inhaalslag at anders de hele 240s op, waarna de rest dag na dag
  // 'uitgesteld' bleef en hun herinneringen op een verouderde Exact-stand
  // pauzeerden. Loopt een org op zijn eigen plafond stuk, dan komen de
  // volgende alsnog aan de beurt; de gestrande org gaat morgen door waar hij
  // gebleven was (cursor + hervat-cursor blijven staan). Alleen van kracht
  // zolang er ná deze org nog een actieve org wacht.
  const ORG_BUDGET_MS = 120_000
  const resultaten: Record<string, unknown> = {}

  // Per org uitschakelbaar: sommige bedrijven willen alleen de push naar Exact
  // en laten de betaalstatus bij de boekhouder. Vooraf uitfilteren, zodat een
  // uitgeschakelde org niet meetelt als "er wacht nog iemand" hieronder.
  const actieveOrgs: OrgConfig[] = []
  for (const org of orgs) {
    if (org.exact_betaalsync_actief === false) {
      resultaten[org.organisatie_id] = { uitgeschakeld: true }
      continue
    }
    actieveOrgs.push(org)
  }

  // Sequentieel: elke org heeft eigen rate-limits, maar de token-refresh-keten
  // per eigenaar verdraagt geen parallelle refreshes vanuit dezelfde run.
  for (let i = 0; i < actieveOrgs.length; i++) {
    const org = actieveOrgs[i]
    if (Date.now() > deadline) {
      // Uitgestelde orgs staan morgen door de oudste-eerst-sortering voorop.
      resultaten[org.organisatie_id] = { uitgesteld: true }
      continue
    }
    try {
      // Is dit de laatste org die nog aan de beurt komt, dan is een eigen
      // plafond pure budgethalvering: er wacht niemand meer op zijn beurt, dus
      // mag hij de rest van het globale budget gebruiken.
      const alleenNogDezeOrg = i === actieveOrgs.length - 1
      const orgDeadline = alleenNogDezeOrg ? deadline : Math.min(deadline, Date.now() + ORG_BUDGET_MS)
      resultaten[org.organisatie_id] = await syncOrganisatie(org, orgDeadline)
    } catch (err) {
      const melding = err instanceof Error ? err.message : String(err)
      resultaten[org.organisatie_id] = { fout: melding }
      if (melding === 'RUN_ONVOLTOOID' || melding === 'EVALUATIE_ONVOLTOOID') {
        console.warn('[cron-exact-betaalsync] org raakte zijn tijdbudget op, gaat morgen verder', {
          organisatie_id: org.organisatie_id, signaal: melding,
        })
      }
      // Verwachte configuratie-gaten, al-naar-Sentry-gelogde token-fouten en
      // capaciteitssignalen niet nogmaals naar Sentry; echte fouten wel.
      // RUN_/EVALUATIE_ONVOLTOOID zijn zelfherstellend: het per-org-budget laat
      // de rest doorlopen en de hervat-cursor laat deze org morgen verdergaan.
      if (!['GEEN_TOKENS', 'GEEN_EIGENAAR', 'GEEN_ADMINISTRATIE', 'EIGENAAR_ANDERE_ORG', 'TOKEN_ROTATIE_NIET_OPGESLAGEN', 'TOKEN_AFGEWEZEN', 'RUN_ONVOLTOOID', 'EVALUATIE_ONVOLTOOID'].includes(melding)) {
        Sentry.captureException(err instanceof Error ? err : new Error(melding), {
          tags: { cron: 'exact-betaalsync' },
          extra: { organisatie_id: org.organisatie_id },
        })
      }
      await supabaseAdmin
        .from('exact_sync_state')
        .upsert({
          organisatie_id: org.organisatie_id,
          laatste_fout: melding.slice(0, 500),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organisatie_id' })
    }
  }

  return res.status(200).json({ ok: true, organisaties: resultaten })
}
