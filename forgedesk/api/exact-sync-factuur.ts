import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
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
    tracesSampleRate: 0,
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

// -- Integration credential encryption (copied from api/save-integration-settings.ts) --
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''
/**
 * Nieuwe tokens gaan als 'g1:' de deur uit: AES-256-GCM met een willekeurige
 * salt per token en een auth-tag. Het oude CBC-formaat leidde de sleutel af met
 * een vaste salt die in de code staat en had geen integriteitscontrole, dus
 * geknoei aan een opgeslagen token viel niet op. Bestaande CBC-waarden blijven
 * leesbaar; een rij schuift pas op naar g1 zodra hij opnieuw wordt weggeschreven.
 */
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
    if (!INT_KEY) throw new Error('Server-encryptie is niet geconfigureerd (INTEGRATION_ENCRYPTION_KEY). Neem contact op met support.')
    try {
      const raw = Buffer.from(text.slice(3), 'base64')
      const key = crypto.scryptSync(INT_KEY, raw.subarray(0, 16), 32)
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(16, 28))
      decipher.setAuthTag(raw.subarray(28, 44))
      return Buffer.concat([decipher.update(raw.subarray(44)), decipher.final()]).toString('utf8')
    } catch {
      throw new Error('Integratie-token kan niet ontsleuteld worden (encryptie-key gewijzigd?). Verbind opnieuw via Instellingen > Integraties.')
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

// ─── Inline org-aware app_settings helpers (zie profielService.ts) ───
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
    // Via unknown: `select()` met een variabele kolomlijst kan PostgREST niet
    // typen, dus het statische type is hier GenericStringError en die overlapt
    // niet met Record. Zelfde reden als in de tweede return hieronder.
    if (data) return data as unknown as Record<string, unknown>
  }
  const { data } = await supabase
    .from('app_settings')
    .select(columns)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as Record<string, unknown> | null) ?? null
}

async function updateAppSettingsOrgFirst(
  supabase: SupabaseClient,
  userId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const orgId = await getOrgIdForUser(supabase, userId)
  if (orgId) {
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('organisatie_id', orgId)
      .maybeSingle()
    if (existing) {
      await supabase
        .from('app_settings')
        .update(updates)
        .eq('id', (existing as { id: string }).id)
      return
    }
  }
  await supabase.from('app_settings').update(updates).eq('user_id', userId)
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

const EXACT_API_BASE = 'https://start.exactonline.nl/api/v1'

/**
 * Mag deze fout opnieuw geprobeerd worden op een POST die iets AANMAAKT?
 *
 * Nee bij een afgebroken request. Exact heeft geen idempotency-key, dus als de
 * eerste POST wél is aangekomen en alleen het antwoord wegbleef, boekt een retry
 * dezelfde factuur een tweede keer in de administratie van de klant. Precies dat
 * gat opende zich toen deze endpoints een AbortSignal.timeout kregen: vóórdien
 * hing de fetch en kilde het platform de functie, dus er kwam geen tweede POST
 * uit dezelfde invocatie.
 *
 * De guard vóór de sync (die weigert te syncen als exact_entry_id al gezet is)
 * dekt dit niet: die staat vóór de POST, waar het id nog leeg is. Hij stopt een
 * tweede invocatie, niet een tweede POST binnen één invocatie.
 *
 * Bij een 401 is er juist niets aangekomen en is retryen na een token-refresh
 * wel het goede gedrag. Vandaar dat alleen abort en timeout worden uitgesloten.
 */
function magOpnieuwNaFout(err: unknown): boolean {
  const naam = (err as { name?: string } | null)?.name
  return naam !== 'TimeoutError' && naam !== 'AbortError'
}

// Laatste syncfout op de factuur bewaren (migratie 213), zodat er na het
// wegklikken van de toast nog iets terug te vinden is. Best-effort: vóór de
// migratie ontbreken de kolommen en mag dit de echte foutafhandeling niet
// verstoren.
async function registreerSyncFout(factuurId: string, melding: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('facturen')
      .update({ exact_sync_fout: melding.slice(0, 500), exact_sync_fout_op: new Date().toISOString() })
      .eq('id', factuurId)
    if (error && !error.message?.includes('exact_sync_fout')) {
      console.warn('[exact-sync] foutlog schrijven mislukt:', error.message)
    }
  } catch {
    // nooit de hoofdfout maskeren
  }
}

// ── Helpers ──

interface ExactSettings {
  exact_administratie_id: string
  exact_verkoopboek: string
  exact_grootboek: string
  exact_btw_hoog: string
  exact_btw_laag: string | null
  exact_btw_nul: string | null
  exact_document_type_id: number | null
}

// De Exact-koppeling hoort aan de organisatie, niet aan de individuele
// medewerker: Exact is één administratie van één bedrijf. `exact_owner_user_id`
// is de medewerker die de OAuth-sessie houdt en dus als enige een
// `exact_tokens`-rij heeft. Iedereen in de org synct met dát token, zodat
// boekingen consistent onder de eigenaar in Exact landen en collega's zonder
// eigen OAuth-sessie niet op een 401 stuiten die ze niet kunnen oplossen.
// Valt terug op de caller zolang er nog geen eigenaar is vastgelegd.
async function bepaalTokenHouder(callerUserId: string): Promise<string> {
  const settings = await loadAppSettingsOrgFirst(supabaseAdmin, callerUserId, 'exact_owner_user_id')
  const eigenaar = (settings?.exact_owner_user_id as string | null) || null
  if (!eigenaar || eigenaar === callerUserId) return callerUserId

  // `exact_tokens` heeft geen organisatie_id (migratie 018), dus dat de eigenaar
  // nog bij deze organisatie hoort moet hier gecontroleerd worden. Zonder deze
  // check zou een verhuisde eigenaar het token meenemen naar zijn nieuwe org en
  // zou de oude org daar nog steeds mee boeken.
  const callerOrg = await getOrgIdForUser(supabaseAdmin, callerUserId)
  const eigenaarOrg = await getOrgIdForUser(supabaseAdmin, eigenaar)
  if (!callerOrg || callerOrg !== eigenaarOrg) return callerUserId
  return eigenaar
}

// Eén sync roept getValidToken tot acht keer aan (elke retry-tak doet dat). Zo
// werd de rij zeven keer overbodig herlezen, en erger: lukte het wegschrijven
// van een rotatie niet, dan las een volgende aanroep de stale rij en refreshte
// met de inmiddels dode keten. Dat eindigde in invalid_grant en het wissen van
// de tokenrij van de eigenaar, dus een transiënte DB-fout werd een org-brede
// ontkoppeling. Deze cache leeft per request; op module-niveau zou hij tussen
// invocations en dus tussen organisaties blijven hangen.
type TokenCache = { accessToken: string | null; expiresAt: number }

// `tokenUserId` bepaalt WELKE tokenrij geroteerd wordt, `settingsUserId` uit
// welke organisatie de client-credentials komen. Die twee zijn gescheiden zodat
// een sync altijd de credentials van de caller-org gebruikt, ook als de
// eigenaar ooit naar een andere organisatie verhuist.
async function getValidToken(tokenUserId: string, settingsUserId: string, cache: TokenCache): Promise<string> {
  if (cache.accessToken && cache.expiresAt - Date.now() > 5 * 60 * 1000) {
    return cache.accessToken
  }

  const { data: tokenData } = await supabaseAdmin
    .from('exact_tokens')
    .select('access_token, refresh_token, expires_at, division')
    .eq('user_id', tokenUserId)
    .single() as { data: { access_token: string; refresh_token: string; expires_at: string; division: number | null } | null }

  if (!tokenData) {
    throw new Error('GEEN_TOKENS')
  }

  // Token verloopt binnen 5 minuten? Ververs direct.
  const expiresAt = new Date(tokenData.expires_at).getTime()
  if (expiresAt < Date.now() + 5 * 60 * 1000) {
    const settings = await loadAppSettingsOrgFirst(
      supabaseAdmin,
      settingsUserId,
      'exact_online_client_id, exact_online_client_secret',
    )
    const exactClientId = settings?.exact_online_client_id as string | undefined
    const exactClientSecret = settings?.exact_online_client_secret ? decryptSecret(settings.exact_online_client_secret as string) : undefined

    if (!exactClientId || !exactClientSecret) {
      throw new Error('Exact credentials niet gevonden')
    }

    // client_id en client_secret als form-encoded body params (standaard
    // Exact Online methode, zelfde als in exact-callback.ts).
    const refreshRes = await fetch('https://start.exactonline.nl/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decryptSecret(tokenData.refresh_token),
        client_id: exactClientId,
        client_secret: exactClientSecret,
      }),
      // Token-endpoint is een kleine POST die normaal in een seconde klaar is;
      // hangt Exact, dan is er geen budget meer voor de zes sync-calls erna.
      signal: AbortSignal.timeout(10_000),
    })

    if (!refreshRes.ok) {
      const errorBody = await refreshRes.text()

      if (refreshRes.status === 400 || refreshRes.status === 401) {
        // Exact refresh tokens zijn single-use: een parallel request kan de
        // keten net geroteerd hebben. Wacht kort en herlees — staat er
        // inmiddels een nieuw token, gebruik dat dan i.p.v. los te koppelen.
        await new Promise((r) => setTimeout(r, 1500))
        const { data: herlezen } = await supabaseAdmin
          .from('exact_tokens')
          .select('access_token, refresh_token')
          .eq('user_id', tokenUserId)
          .maybeSingle()
        if (herlezen?.refresh_token && herlezen.refresh_token !== tokenData.refresh_token) {
          return decryptSecret(herlezen.access_token)
        }

        if (errorBody.includes('invalid_grant')) {
          // Bij invalid_grant heeft Exact de keten van de tokenhouder echt
          // afgewezen. Verwijder alleen diens tokens; raak de org-brede
          // `exact_online_connected` niet aan. Log tokenhouder én caller
          // apart: bij een org-brede koppeling zijn dat verschillende mensen
          // en anders is niet te zien wie er opnieuw moet verbinden.
          //
          // Voorwaarde op refresh_token: verwijder alleen als er nog steeds de
          // keten staat die wij gelezen hebben. Draaien er twee refreshes
          // tegelijk, dan krijgt de verliezer invalid_grant terwijl de winnaar
          // net een geldige keten wegschreef. Zonder deze voorwaarde gooit de
          // verliezer die verse rij weg en is de koppeling org-breed dood.
          await supabaseAdmin
            .from('exact_tokens')
            .delete()
            .eq('user_id', tokenUserId)
            .eq('refresh_token', tokenData.refresh_token)
          console.error('[Exact] invalid_grant — token rejected', {
            token_user_id: tokenUserId, caller_user_id: settingsUserId,
            endpoint: 'exact-sync-factuur.ts', status: refreshRes.status,
          })
          Sentry.captureException(new Error('Exact invalid_grant'), {
            level: 'warning',
            tags: { exact_endpoint: 'exact-sync-factuur', oauth_error: 'invalid_grant' },
            extra: { token_user_id: tokenUserId, caller_user_id: settingsUserId, status: refreshRes.status },
          })
          throw new Error('Token vernieuwen mislukt. Verbind Exact Online opnieuw.')
        }
      }
      console.error('[Exact] token refresh fout', {
        endpoint: 'exact-sync-factuur.ts', status: refreshRes.status, errorBody,
      })
      throw new Error('Exact Online token vernieuwen mislukt. Probeer het opnieuw.')
    }

    const tokens = (await refreshRes.json()) as { access_token?: string; refresh_token?: string; expires_in?: number }
    if (!tokens?.access_token) {
      console.error('[Exact] refresh gaf 200 zonder access_token', { endpoint: 'exact-sync-factuur.ts' })
      throw new Error('Exact Online gaf een onverwacht antwoord bij token vernieuwen. Probeer het opnieuw.')
    }

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
      settingsUserId,
      gelezenRefreshToken: tokenData.refresh_token,
      nieuweRij,
      versAccessToken: tokens.access_token,
      endpoint: 'exact-sync-factuur.ts',
    })
    // De echte expiry van het verse token, niet de refresh-drempel: die laatste
    // zou de cache-check nooit laten slagen en de rest van deze sync alsnog de
    // stale rij laten herlezen.
    cache.accessToken = uitkomst
    cache.expiresAt = new Date(nieuweRij.expires_at).getTime()
    return uitkomst
  }

  const bestaand = decryptSecret(tokenData.access_token)
  cache.accessToken = bestaand
  cache.expiresAt = new Date(tokenData.expires_at).getTime()
  return bestaand
}

// Schrijft de geroteerde keten weg als compare-and-swap op de refresh_token die
// we zelf gelezen hebben. Het ciphertext is een betrouwbaar versiemerk: elke
// write versleutelt met een nieuwe random salt en IV, dus een gewijzigde rij
// heeft gegarandeerd een andere waarde.
//
// Een blinde upsert kostte drie manieren om de koppeling org-breed te slopen:
// een parallelle sync die de verse keten van een net afgeronde OAuth-callback
// overschreef, een sync die de rij weer tot leven wekte ná een ontkoppeling, en
// een verliezende refresh die de rij van de winnaar overschreef.
async function schrijfGeroteerdeKeten(params: {
  tokenUserId: string
  settingsUserId: string
  gelezenRefreshToken: string
  nieuweRij: Record<string, unknown>
  versAccessToken: string
  endpoint: string
}): Promise<string> {
  const { tokenUserId, settingsUserId, gelezenRefreshToken, nieuweRij, versAccessToken, endpoint } = params

  const { data: bijgewerkt, error: updateFout } = await supabaseAdmin
    .from('exact_tokens')
    .update(nieuweRij)
    .eq('user_id', tokenUserId)
    .eq('refresh_token', gelezenRefreshToken)
    .select('user_id')

  if (!updateFout && bijgewerkt?.length) return versAccessToken

  if (updateFout) {
    // Exact heeft de vorige refresh_token al ongeldig gemaakt, dus een mislukte
    // write laat een dode keten achter. De sync zelf gaat door (dit
    // access_token is 10 minuten geldig, de factuur kan geboekt worden), maar
    // dit is de enige plek waar het nog te zien is.
    console.error('[Exact] geroteerde token NIET opgeslagen — keten is hierna dood', {
      token_user_id: tokenUserId, caller_user_id: settingsUserId, endpoint, fout: updateFout.message,
    })
    Sentry.captureException(new Error('Exact token rotation not persisted'), {
      level: 'error',
      tags: { exact_endpoint: endpoint.replace('.ts', ''), oauth_error: 'rotation_not_persisted' },
      extra: { token_user_id: tokenUserId, caller_user_id: settingsUserId, fout: updateFout.message },
    })
    return versAccessToken
  }

  // Nul rijen geraakt: de rij is inmiddels vervangen of verwijderd.
  const { data: huidig } = await supabaseAdmin
    .from('exact_tokens')
    .select('access_token')
    .eq('user_id', tokenUserId)
    .maybeSingle()

  const huidigToken = (huidig as { access_token?: string | null } | null)?.access_token
  if (huidigToken) {
    // Iemand schreef een nieuwere keten (parallelle refresh of een verse
    // OAuth-callback). Die is leidend; onze eigen rotatie laten we vallen.
    return decryptSecret(huidigToken)
  }

  // Rij is weg. Alleen opnieuw aanmaken als de koppeling nog hoort te bestaan,
  // anders wekken we een net ontkoppelde koppeling weer tot leven en blijven er
  // facturen naar Exact gaan na een expliciete ontkoppeling.
  const settings = await loadAppSettingsOrgFirst(
    supabaseAdmin,
    settingsUserId,
    'exact_owner_user_id, exact_online_connected',
  )
  const eigenaar = (settings?.exact_owner_user_id as string | null) ?? null
  const nogGekoppeld = eigenaar === tokenUserId || (eigenaar === null && settings?.exact_online_connected === true)

  if (!nogGekoppeld) {
    console.warn('[Exact] rotatie niet bewaard: koppeling is inmiddels ontkoppeld', { token_user_id: tokenUserId, endpoint })
    return versAccessToken
  }

  const { error: insertFout } = await supabaseAdmin.from('exact_tokens').insert(nieuweRij)
  // 23505 = een parallel request maakte de rij net aan; die keten is dan
  // nieuwer dan de onze en mag blijven staan.
  if (insertFout && insertFout.code !== '23505') {
    console.error('[Exact] geroteerde token NIET opgeslagen (insert)', {
      token_user_id: tokenUserId, caller_user_id: settingsUserId, endpoint, fout: insertFout.message,
    })
    Sentry.captureException(new Error('Exact token rotation not persisted'), {
      level: 'error',
      tags: { exact_endpoint: endpoint.replace('.ts', ''), oauth_error: 'rotation_not_persisted' },
      extra: { token_user_id: tokenUserId, caller_user_id: settingsUserId, fout: insertFout.message },
    })
  }
  return versAccessToken
}

// Exact hanteert per-minuut rate-limits; bij 429 wachten (Retry-After, gecapt
// op 15s) en maximaal twee keer opnieuw proberen.
// Elke poging krijgt een eigen signal: één AbortSignal.timeout hergebruiken zou
// na de eerste poging al afgevuurd zijn en de retries meteen laten falen.
async function exactFetchMetRetry(url: string, init: RequestInit): Promise<Response> {
  for (let poging = 0; ; poging++) {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) })
    if (response.status !== 429 || poging >= 2) return response
    const retryAfter = Number(response.headers.get('Retry-After'))
    const wachtMs = Math.min((retryAfter > 0 ? retryAfter : 5) * 1000, 15_000)
    await new Promise((r) => setTimeout(r, wachtMs))
  }
}

async function exactGet(token: string, division: string, endpoint: string): Promise<unknown> {
  const url = `${EXACT_API_BASE}/${division}/${endpoint}`
  const response = await exactFetchMetRetry(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Exact API fout (GET ${endpoint}): ${response.status} - ${body}`)
  }

  return response.json()
}

async function exactPost(token: string, division: string, endpoint: string, data: unknown): Promise<unknown> {
  const url = `${EXACT_API_BASE}/${division}/${endpoint}`
  const response = await exactFetchMetRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Exact API fout (POST ${endpoint}): ${response.status} - ${body}`)
  }

  return response.json()
}

// Exacte mapping, geen drempels. Met `>= 9` kreeg een gewogen percentage als
// 12% stil de laag-code en 6% zelfs de nul-code, en die percentages ontstaan
// echt: de editor rekent bij gemengde regels een gewogen tarief uit. Een
// onbekend tarief levert nu null, zodat de pre-check vóór het boeken er een
// leesbare 400 van maakt in plaats van een verkeerde btw-code in Exact.
const ONDERSTEUNDE_BTW_TARIEVEN = [21, 9, 0]

function bepaalBtwCode(btwPercentage: unknown, settings: ExactSettings): string | null {
  // numeric uit PostgREST kan als string binnenkomen; === zou daar stil op falen.
  // Ontbreekt het percentage helemaal, dan mag Number() er geen 0 van maken: dat
  // mapt een regel zónder tarief stil op de nul-code. Null hier laat de guard
  // vóór het boeken er een leesbare 400 van maken.
  if (btwPercentage === null || btwPercentage === undefined || btwPercentage === '') return null
  const tarief = Number(btwPercentage)
  if (tarief === 21) return settings.exact_btw_hoog || null
  if (tarief === 9) return settings.exact_btw_laag || null
  if (tarief === 0) return settings.exact_btw_nul || null
  return null
}

// numeric-kolommen komen via PostgREST soms als string binnen, en dan bestaat
// .toFixed() er niet op. Alles wat als bedrag naar Exact gaat loopt daarom via
// dit ene punt. Een ontbrekende of onleesbare waarde levert null in plaats van
// een stille 0, zodat de guards vóór het boeken er een 400 van maken.
function alsBedrag(waarde: unknown): number | null {
  if (waarde === null || waarde === undefined || waarde === '') return null
  const getal = Number(waarde)
  return Number.isFinite(getal) ? getal : null
}

// ── Grootboek GUID cache ──
// Staat op module-niveau en overleeft dus invocations op een warme lambda, die
// alle organisaties bedient. De key MOET daarom de division bevatten: een GUID
// geldt per administratie, terwijl grootboekcodes als 8000 en 8020 uit het
// standaardschema bij vrijwel iedereen voorkomen. Zonder division in de key
// krijgt de ene organisatie de GUID van de andere en weigert Exact de boeking
// met een onnavolgbare 400.
const grootboekCache = new Map<string, string>()

async function getGrootboekGuid(token: string, division: string, rekeningNummer: string): Promise<string> {
  const cacheKey = `${division}:${rekeningNummer}`
  const cached = grootboekCache.get(cacheKey)
  if (cached) return cached

  const data = await exactGet(
    token,
    division,
    `financial/GLAccounts?$filter=Code eq '${rekeningNummer}'&$select=ID`
  ) as { d?: { results?: Array<{ ID: string }> } }

  const guid = data?.d?.results?.[0]?.ID
  if (!guid) {
    throw new Error(`Grootboekrekening ${rekeningNummer} niet gevonden in Exact Online.`)
  }

  grootboekCache.set(cacheKey, guid)
  return guid
}

// ── Klant zoeken/aanmaken ──

interface KlantVoorExact {
  naam: string
  email?: string | null
  telefoon?: string | null
  debiteurennummer?: string | null
  adres?: string | null
  postcode?: string | null
  stad?: string | null
  land?: string | null
  btw_nummer?: string | null
  kvk_nummer?: string | null
}

// klanten.land is vrije tekst ("Nederland"); Exact wil een ISO-landcode.
// Onbekende landen leveren null: Country dan liever weglaten (Exact vult de
// administratie-default in) dan hem fout op NL zetten.
function landNaarIso(land: string | null | undefined): string | null {
  const genormaliseerd = (land || '').trim().toLowerCase()
  if (!genormaliseerd || genormaliseerd === 'nederland') return 'NL'
  if (genormaliseerd === 'belgië' || genormaliseerd === 'belgie') return 'BE'
  if (genormaliseerd === 'duitsland') return 'DE'
  if (/^[a-z]{2}$/.test(genormaliseerd)) return genormaliseerd.toUpperCase()
  return null
}

// Geeft naast de GUID een `naamWaarschuwing` terug: alleen Sentry zag voorheen
// dat een Code-hit op naamverschil werd afgewezen en er dus een tweede relatie
// in Exact bijkwam. De caller hangt die tekst aan de succes-respons.
async function findOrCreateKlant(
  token: string,
  division: string,
  klant: KlantVoorExact
): Promise<{ id: string; naamWaarschuwing: string | null }> {
  // Eerst op debiteurennummer (Account.Code): dat is een stabiele sleutel,
  // waar naam-matching breekt op elke spellingsvariant. Exact slaat Code op
  // als 18 tekens rechts uitgelijnd, dus beide varianten proberen.
  // De hit telt alleen als ook de naam (genormaliseerd) klopt: doen. genereert
  // debiteurennummers los van Exact, en een nummerbotsing met een ándere
  // Exact-relatie zou anders elke factuur stil op de verkeerde debiteur boeken.
  const debiteurennummer = (klant.debiteurennummer || '').trim()
  // Was er wél een relatie met dit debiteurennummer, maar met een andere naam?
  // Dan is de Code in Exact bezet en zou een nieuwe relatie MET die Code een
  // rauwe 400 geven bij elke volgende factuur van deze klant. Dat gebeurt al bij
  // een spellingswijziging ("Jansen BV" -> "Jansen B.V.").
  let codeHitAfgewezen = false
  if (debiteurennummer) {
    const escaped = debiteurennummer.replace(/'/g, "''")
    const padded = escaped.padStart(18, ' ')
    const codeData = await exactGet(
      token,
      division,
      `crm/Accounts?$filter=(Code eq '${padded}' or Code eq '${escaped}') and Status eq 'C'&$select=ID,Name`
    ) as { d?: { results?: Array<{ ID: string; Name?: string }> } }
    const hit = codeData?.d?.results?.[0]
    if (hit?.ID) {
      const zelfdeNaam = (hit.Name || '').trim().toLowerCase() === klant.naam.trim().toLowerCase()
      if (zelfdeNaam) return { id: hit.ID, naamWaarschuwing: null }
      codeHitAfgewezen = true
      console.warn('[exact-sync] debiteurennummer-match afgewezen: naam wijkt af', {
        debiteurennummer, exact_naam: hit.Name, doen_naam: klant.naam,
      })
      Sentry.captureMessage(
        `Exact Code-match afgewezen: debiteurennummer ${debiteurennummer} hoort in Exact bij "${hit.Name}", doen. verwacht "${klant.naam}"`,
        'warning'
      )
    }
  }

  // Zoek alleen onder customer accounts (Status 'C') zodat we geen
  // leveranciers of prospects matchen die toevallig dezelfde naam hebben.
  const encodedName = klant.naam.replace(/'/g, "''")
  const searchData = await exactGet(
    token,
    division,
    `crm/Accounts?$filter=Name eq '${encodedName}' and Status eq 'C'&$select=ID`
  ) as { d?: { results?: Array<{ ID: string }> } }

  const existingId = searchData?.d?.results?.[0]?.ID
  if (existingId) return { id: existingId, naamWaarschuwing: null }

  // Klant niet gevonden, maak aan met Status 'C' (Customer) zodat de
  // latere SalesEntry-sync werkt — Exact accepteert geen SalesEntry voor
  // een account zonder customer rol. Adres, btw-nummer, KvK en het
  // debiteurennummer gaan mee zodat de relatie in Exact compleet is en de
  // volgende sync op Code kan matchen.
  // Zonder Code als het nummer in Exact al bij een andere naam hoort: die Code
  // is bezet, dus aanmaken mét Code faalt gegarandeerd. De Sentry-warning
  // hierboven blijft staan zodat de dubbele relatie opgeruimd kan worden.
  const newAccount: Record<string, string> = { Name: klant.naam, Status: 'C' }
  if (debiteurennummer && !codeHitAfgewezen) newAccount.Code = debiteurennummer
  if (klant.email) newAccount.Email = klant.email
  if (klant.telefoon) newAccount.Phone = klant.telefoon
  if (klant.adres?.trim()) newAccount.AddressLine1 = klant.adres.trim()
  if (klant.postcode?.trim()) newAccount.Postcode = klant.postcode.trim()
  if (klant.stad?.trim()) newAccount.City = klant.stad.trim()
  const landCode = landNaarIso(klant.land)
  if (landCode) newAccount.Country = landCode
  if (klant.btw_nummer?.trim()) newAccount.VATNumber = klant.btw_nummer.trim()
  if (klant.kvk_nummer?.trim()) newAccount.ChamberOfCommerce = klant.kvk_nummer.trim()

  const createData = await exactPost(token, division, 'crm/Accounts', newAccount) as {
    d?: { ID: string }
  }

  const newId = createData?.d?.ID
  if (!newId) {
    throw new Error(`Klant "${klant.naam}" kon niet aangemaakt worden in Exact Online.`)
  }

  return {
    id: newId,
    naamWaarschuwing: codeHitAfgewezen
      ? `Klantnaam wijkt af van de Exact-relatie met debiteurennummer ${debiteurennummer}; er is een nieuwe relatie zonder nummer aangemaakt. Controleer in Exact of dit klopt.`
      : null,
  }
}

// Loop factuur_bijlagen (alleen onsync'd) en POST elk als DocumentAttachment.
// Werkt best-effort: één gefaalde bijlage blokkeert de rest niet.
// `tokenRef.current` wordt bijgewerkt na een succesvolle refresh zodat de
// caller met een vers token verder kan.
async function syncFactuurBijlagenToExact(params: {
  factuurId: string
  documentId: string
  tokenRef: { current: string }
  division: string
  tokenUserId: string
  user_id: string
  tokenCache: TokenCache
}): Promise<{ synced: number; failed: number; geprobeerd: number }> {
  const { factuurId, documentId, tokenRef, division, tokenUserId, user_id, tokenCache } = params

  const { data: bijlagen, error: bijErr } = await supabaseAdmin
    .from('factuur_bijlagen')
    .select('id, bestandsnaam, storage_path')
    .eq('factuur_id', factuurId)
    .is('exact_synced_op', null)

  if (bijErr) {
    console.error('factuur_bijlagen lookup mislukt:', bijErr)
    return { synced: 0, failed: 0, geprobeerd: 0 }
  }
  if (!bijlagen?.length) {
    return { synced: 0, failed: 0, geprobeerd: 0 }
  }

  let synced = 0
  let failed = 0

  for (const bij of bijlagen) {
    try {
      const { data: blob, error: dlError } = await supabaseAdmin.storage
        .from('factuur-bijlagen')
        .download(bij.storage_path as string)
      if (dlError || !blob) {
        console.error(`Bijlage download mislukt: ${bij.storage_path}`, dlError)
        failed++
        continue
      }
      const buffer = Buffer.from(await blob.arrayBuffer())
      const base64 = buffer.toString('base64')
      const payload = {
        Document: documentId,
        FileName: bij.bestandsnaam,
        Attachment: base64,
      }

      try {
        await exactPost(tokenRef.current, division, 'documents/DocumentAttachments', payload)
      } catch (firstErr) {
        // Afgebroken request: de POST kan wél aangekomen zijn, dus niet opnieuw
        // proberen — anders hangt dezelfde bijlage twee keer aan het Document.
        // Zie magOpnieuwNaFout.
        if (!magOpnieuwNaFout(firstErr)) {
          console.error(`[Exact] bijlage-POST afgebroken; niet opnieuw geprobeerd voor ${bij.bestandsnaam}`, {
            naam: (firstErr as { name?: string })?.name,
          })
          failed++
          continue
        }
        try {
          tokenRef.current = await getValidToken(tokenUserId, user_id, tokenCache)
          await exactPost(tokenRef.current, division, 'documents/DocumentAttachments', payload)
        } catch (retryErr) {
          console.error(`Bijlage DocumentAttachment POST mislukt voor ${bij.bestandsnaam}:`, firstErr, retryErr)
          failed++
          continue
        }
      }

      const { error: updateErr } = await supabaseAdmin
        .from('factuur_bijlagen')
        .update({ exact_synced_op: new Date().toISOString() })
        .eq('id', bij.id)
      if (updateErr) {
        console.error(`exact_synced_op update mislukt voor ${bij.id}:`, updateErr)
      }
      synced++
    } catch (err) {
      console.error(`Bijlage sync exception voor ${bij.bestandsnaam}:`, err)
      failed++
    }
  }

  return { synced, failed, geprobeerd: bijlagen.length }
}

// ── Main Handler ──

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Pas true zodra de factuur bestaat én bij de organisatie van de caller
  // hoort. De catch-all onderaan schreef zijn foutmelding anders op een
  // factuur_id uit de request-body die nog nergens tegen getoetst was: een
  // ongeauthenticeerde POST kon zo een spook-syncfout op andermans factuur
  // zetten.
  let factuurGeautoriseerd = false
  // Claim gezet op deze factuur (migratie 214)? Dan moet hij bij élk vertrek
  // uit deze functie weer los, anders blijft de factuur tien minuten op slot.
  let claimActief = false
  let geclaimdeFactuurId: string | null = null
  // De timestamp die wij zelf op de claim schreven. De vrijgave is daarop
  // voorwaardelijk: wordt maxDuration ooit boven de tien minuten verjaring
  // getild, dan wist een trage invocatie anders de verse claim van de collega
  // die hem inmiddels had overgenomen.
  let eigenClaimTimestamp: string | null = null
  // Het 504-pad weet niet of Exact de boeking heeft aangenomen. De claim blijft
  // dan bewust staan, zodat een tweede klik niet meteen opnieuw kan boeken; de
  // verjaring van tien minuten bewaakt dat venster machinaal.
  let claimBehouden = false

  try {
    const user_id = await verifyUser(req)
    const { factuur_id, attachment_only, bijlagen_only } = req.body as { factuur_id: string; attachment_only?: boolean; bijlagen_only?: boolean }

    if (!factuur_id) {
      return res.status(400).json({ error: 'factuur_id is verplicht' })
    }

    // 1. Haal factuur + items op
    const { data: factuur, error: factuurError } = await supabaseAdmin
      .from('facturen')
      .select('*')
      .eq('id', factuur_id)
      .single()

    if (factuurError || !factuur) {
      return res.status(404).json({ error: 'Factuur niet gevonden.' })
    }

    // Tenant-isolatie: factuur moet bij de organisatie van de caller horen.
    const callerOrgId = await getOrgIdForUser(supabaseAdmin, user_id)
    if (!callerOrgId || factuur.organisatie_id !== callerOrgId) {
      return res.status(404).json({ error: 'Factuur niet gevonden.' })
    }
    factuurGeautoriseerd = true

    // Concepten horen niet in Exact: geen definitief nummer betekent een lege
    // YourRef en een gat zodra het echte reeksnummer wordt toegekend. Eerst
    // verwerken, dan syncen. Retry-modi mogen er langs (die vereisen een
    // bestaande SalesEntry en dus een eerder gesyncte, definitieve factuur).
    if (!attachment_only && !bijlagen_only && (factuur.status === 'concept' || !factuur.nummer)) {
      return res.status(400).json({ error: 'Verwerk de factuur eerst; concepten kunnen niet naar Exact.' })
    }

    // Idempotency. Exact heeft geen idempotency-key, dus een tweede POST maakt
    // een tweede SalesEntry: de factuur staat dan dubbel in de administratie van
    // de klant. Dat kon op twee manieren gebeuren. Twee keer op synchroniseren
    // drukken (de knop was alleen tijdens de call uitgeschakeld, niet daarna), en
    // de 401-retry hieronder, die opnieuw POST als de eerste POST wél is
    // aangekomen maar het antwoord verloren ging.
    //
    // De beide retry-modi mogen er langs: attachment_only en bijlagen_only
    // hebben een bestaande SalesEntry juist nodig en maken er zelf geen.
    if (!attachment_only && !bijlagen_only && factuur.exact_entry_id) {
      return res.status(200).json({
        success: true,
        al_gesynct: true,
        exact_entry_id: factuur.exact_entry_id,
        document_id: (factuur.exact_document_id as string | null) ?? null,
        bijlage_synced: !!factuur.exact_bijlage_gesynced_op,
        bijlagen_synced: 0,
        bijlagen_failed: 0,
        bijlagen_geprobeerd: 0,
      })
    }

    // Claim. De guard hierboven is check-then-act: twee tabs die tegelijk op
    // synchroniseren drukken lezen allebei een lege exact_entry_id, passeren
    // allebei en boeken de factuur dubbel in Exact. Deze conditionele UPDATE
    // (migratie 214) laat er maar één door. Een claim ouder dan tien minuten is
    // van een invocatie die het platform allang gekild heeft en mag
    // overgenomen worden, anders zit de factuur na één crash voorgoed vast.
    //
    // Twee losse updates in plaats van één met `.or()`: PostgREST verwerkt een
    // or-filter niet op een UPDATE (geeft 42703 op een kolom die wél bestaat).
    // Elke update is op zichzelf atomair, dus de race blijft afgedekt.
    if (!attachment_only && !bijlagen_only) {
      const claimVerlooptVoor = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const nu = new Date().toISOString()

      const claimBasis = () => supabaseAdmin
        .from('facturen')
        .update({ exact_sync_gestart_op: nu })
        .eq('id', factuur_id)
        .is('exact_entry_id', null)

      let { data: geclaimd, error: claimFout } = await claimBasis()
        .is('exact_sync_gestart_op', null)
        .select('id')

      if (!claimFout && !geclaimd?.length) {
        // Geen verse claim mogelijk: neem een verlopen claim over.
        const overname = await claimBasis()
          .lt('exact_sync_gestart_op', claimVerlooptVoor)
          .select('id')
        geclaimd = overname.data
        claimFout = overname.error
      }

      if (claimFout) {
        // Migratie 214 nog niet gedraaid: doorgaan zonder claim, zoals voorheen.
        if (!claimFout.message?.includes('exact_sync_gestart_op')) throw new Error(claimFout.message)
        console.warn('[exact-sync] claim-kolom ontbreekt (migratie 214 nog niet gedraaid); sync zonder claim')
      } else if (!geclaimd?.length) {
        // Nul rijen heeft twee mogelijke oorzaken: er loopt echt een sync, óf de
        // factuur is tussen onze lezing en de claim alsnog geboekt — beide
        // claim-updates eisen immers `exact_entry_id IS NULL`. Herlees dus eerst,
        // anders krijgt de gebruiker een conflict te zien voor een factuur die
        // gewoon klaar is.
        const { data: herlezen } = await supabaseAdmin
          .from('facturen')
          .select('exact_entry_id, exact_document_id, exact_bijlage_gesynced_op')
          .eq('id', factuur_id)
          .maybeSingle()
        if (herlezen?.exact_entry_id) {
          return res.status(200).json({
            success: true,
            al_gesynct: true,
            exact_entry_id: herlezen.exact_entry_id,
            document_id: (herlezen.exact_document_id as string | null) ?? null,
            bijlage_synced: !!herlezen.exact_bijlage_gesynced_op,
            bijlagen_synced: 0,
            bijlagen_failed: 0,
            bijlagen_geprobeerd: 0,
          })
        }
        return res.status(409).json({ error: 'Er loopt al een synchronisatie voor deze factuur' })
      } else {
        claimActief = true
        geclaimdeFactuurId = factuur_id
        eigenClaimTimestamp = nu
      }
    }

    const { data: factuurItems, error: itemsError } = await supabaseAdmin
      .from('factuur_items')
      .select('*')
      .eq('factuur_id', factuur_id)
      .order('volgorde', { ascending: true })

    if (itemsError) {
      return res.status(500).json({ error: 'Factuurregels ophalen mislukt.' })
    }

    // 2. Haal geldige access_token op. De koppeling is org-breed: het token van
    // de eigenaar wordt gebruikt, ongeacht wie de sync start.
    const tokenUserId = await bepaalTokenHouder(user_id)
    const callerIsEigenaar = tokenUserId === user_id
    const tokenCache: TokenCache = { accessToken: null, expiresAt: 0 }

    let token: string
    try {
      token = await getValidToken(tokenUserId, user_id, tokenCache)
    } catch (tokenErr) {
      // Wie de koppeling niet zelf kan herstellen moet horen wie dat wel kan,
      // anders verwijst de melding naar een knop die hij niet heeft.
      const ontbreekt = tokenErr instanceof Error && tokenErr.message === 'GEEN_TOKENS'
      return res.status(401).json({
        error: callerIsEigenaar
          ? (ontbreekt
              ? 'Exact Online is niet verbonden. Verbind opnieuw via Instellingen > Integraties.'
              : 'Exact Online sessie verlopen. Verbind opnieuw via Instellingen > Integraties.')
          : 'De Exact Online-koppeling moet opnieuw verbonden worden door de eigenaar van de koppeling (zie Instellingen > Integraties).',
      })
    }

    // 3. Haal Exact instellingen op (org-first)
    const settings = await loadAppSettingsOrgFirst(
      supabaseAdmin,
      user_id,
      'exact_administratie_id, exact_verkoopboek, exact_grootboek, exact_btw_hoog, exact_btw_laag, exact_btw_nul, exact_document_type_id',
    )

    if (!settings?.exact_administratie_id) {
      return res.status(400).json({
        error: 'Exact Online administratie niet geconfigureerd. Controleer Instellingen > Integraties.',
      })
    }

    const exactSettings = settings as unknown as ExactSettings
    const division = exactSettings.exact_administratie_id

    // 3b. Pre-check: Document-type moet geconfigureerd zijn voor de bijlage-flow.
    if (exactSettings.exact_document_type_id == null) {
      return res.status(400).json({
        error: 'Configureer eerst Document-type in Exact-instellingen voordat je een factuur kunt syncen.',
      })
    }

    // 3b-bis. bijlagen_only flow: retry alleen de factuur_bijlagen die nog niet
    // gesynced zijn. Vereist dat de factuur al een Document GUID in Exact heeft;
    // raakt SalesEntry of de factuur-PDF zelf niet aan.
    if (bijlagen_only) {
      if (!factuur.exact_document_id) {
        return res.status(400).json({
          error: 'Bijlagen-sync vereist dat de factuur al een Document in Exact heeft. Sync eerst de factuur volledig.',
        })
      }
      const tokenRef = { current: token }
      const result = await syncFactuurBijlagenToExact({
        factuurId: factuur_id,
        documentId: factuur.exact_document_id as string,
        tokenRef,
        division,
        tokenUserId,
        user_id,
        tokenCache,
      })
      return res.status(200).json({
        success: true,
        bijlagen_synced: result.synced,
        bijlagen_failed: result.failed,
        bijlagen_geprobeerd: result.geprobeerd,
      })
    }

    // 3c. Download PDF uit Storage. Failure is soft — sync gaat door zonder
    // bijlage als pdf_storage_path NULL is (oude facturen) of download mislukt.
    let pdfBase64: string | null = null
    if (factuur.pdf_storage_path) {
      try {
        const { data: pdfBlob, error: dlError } = await supabaseAdmin.storage
          .from('facturen')
          .download(factuur.pdf_storage_path as string)
        if (dlError || !pdfBlob) {
          console.warn('PDF download uit storage.facturen mislukt:', dlError)
        } else {
          const buffer = Buffer.from(await pdfBlob.arrayBuffer())
          pdfBase64 = buffer.toString('base64')
        }
      } catch (dlErr) {
        console.warn('PDF download uit storage.facturen exception:', dlErr)
      }
    } else {
      console.warn(`Factuur ${factuur_id} heeft geen pdf_storage_path, sync zonder bijlage`)
    }

    let documentId: string | null = null
    let bijlageSynced = false
    let mainBijlagenSyncResult: { synced: number; failed: number; geprobeerd: number } = { synced: 0, failed: 0, geprobeerd: 0 }

    // 3d. Retry-only flow: alleen Document + Attachment opnieuw proberen voor
    // een factuur die al een SalesEntry heeft. Vermijdt dubbele Documents als
    // exact_document_id al gezet is.
    if (attachment_only) {
      if (!factuur.exact_entry_id) {
        return res.status(400).json({
          error: 'Retry vereist eerst een succesvolle SalesEntry sync',
        })
      }
      if (!pdfBase64) {
        return res.status(400).json({
          error: 'Geen PDF beschikbaar in Storage voor deze factuur',
        })
      }

      documentId = (factuur.exact_document_id as string | null) ?? null

      if (!documentId) {
        // Resolve klant alleen als we het Document echt nog moeten aanmaken.
        const { data: retryKlant, error: retryKlantError } = await supabaseAdmin
          .from('klanten')
          .select('bedrijfsnaam, email, telefoon')
          .eq('id', factuur.klant_id)
          .maybeSingle()
        if (retryKlantError) console.error('[exact-sync] klant lookup fout (retry-flow):', retryKlantError.message)
        const retryKlantNaam = retryKlant?.bedrijfsnaam || factuur.klant_naam || 'Onbekende klant'
        let retryCustomerGuid: string
        try {
          const retryKlantResultaat = await findOrCreateKlant(token, division, {
            naam: retryKlantNaam,
            email: retryKlant?.email,
            telefoon: retryKlant?.telefoon,
          })
          retryCustomerGuid = retryKlantResultaat.id
        } catch (klantErr) {
          console.error('Klant lookup mislukt in retry-flow:', klantErr)
          return res.status(502).json({ error: 'Klant niet gevonden in Exact' })
        }

        const retrySubject = factuur.factuur_type === 'creditnota'
          ? `Creditnota ${factuur.nummer}`
          : `Factuur ${factuur.nummer}`
        const docPayload = {
          Subject: retrySubject,
          Type: exactSettings.exact_document_type_id,
          Account: retryCustomerGuid,
        }

        try {
          const docResult = await exactPost(
            token,
            division,
            'documents/Documents',
            docPayload,
          ) as { d?: { ID?: string } }
          documentId = docResult?.d?.ID ?? null
        } catch (docErr) {
          // Afgebroken request: niet opnieuw posten, dat geeft een tweede
          // Document in Exact. Zie magOpnieuwNaFout.
          if (!magOpnieuwNaFout(docErr)) {
            console.error('[Exact] Document POST afgebroken; niet opnieuw geprobeerd', {
              factuur_id, naam: (docErr as { name?: string })?.name,
            })
            return res.status(504).json({
              error: 'Exact reageerde niet binnen de tijd bij het aanmaken van het document. Controleer in Exact voordat je opnieuw probeert.',
            })
          }
          try {
            token = await getValidToken(tokenUserId, user_id, tokenCache)
            const docResult = await exactPost(
              token,
              division,
              'documents/Documents',
              docPayload,
            ) as { d?: { ID?: string } }
            documentId = docResult?.d?.ID ?? null
          } catch (retryErr) {
            console.error('Document POST mislukt in retry-flow:', docErr, retryErr)
            return res.status(502).json({ error: 'Document aanmaken in Exact mislukt' })
          }
        }

        if (!documentId) {
          return res.status(502).json({ error: 'Document GUID niet terug van Exact' })
        }

        await supabaseAdmin
          .from('facturen')
          .update({ exact_document_id: documentId })
          .eq('id', factuur_id)
      }

      const attPayload = {
        Document: documentId,
        FileName: `Factuur-${factuur.nummer}.pdf`,
        Attachment: pdfBase64,
      }
      try {
        await exactPost(token, division, 'documents/DocumentAttachments', attPayload)
        bijlageSynced = true
      } catch (attErr) {
        // Afgebroken request: niet opnieuw posten, dan hangt de PDF dubbel aan
        // het Document. Zie magOpnieuwNaFout.
        if (!magOpnieuwNaFout(attErr)) {
          console.error('[Exact] DocumentAttachment POST afgebroken; niet opnieuw geprobeerd', {
            factuur_id, naam: (attErr as { name?: string })?.name,
          })
          return res.status(504).json({
            error: 'Exact reageerde niet binnen de tijd bij het uploaden van de bijlage. Controleer in Exact of de PDF al aan het document hangt voordat je opnieuw probeert.',
          })
        }
        try {
          token = await getValidToken(tokenUserId, user_id, tokenCache)
          await exactPost(token, division, 'documents/DocumentAttachments', attPayload)
          bijlageSynced = true
        } catch (retryErr) {
          console.error('DocumentAttachment POST mislukt in retry-flow:', attErr, retryErr)
          return res.status(502).json({ error: 'Bijlage uploaden naar Exact mislukt' })
        }
      }

      if (bijlageSynced) {
        await supabaseAdmin
          .from('facturen')
          .update({ exact_bijlage_gesynced_op: new Date().toISOString() })
          .eq('id', factuur_id)
      }

      // Best-effort: sync ook de losse factuur_bijlagen (klant-inkooporders,
      // extra docs) die nog niet aan Exact gekoppeld zijn. Falures blokkeren
      // de attachment-retry-flow niet — die is succesvol zolang de factuur-PDF
      // gekoppeld is.
      const retryTokenRef = { current: token }
      const bijlagenResult = documentId
        ? await syncFactuurBijlagenToExact({
            factuurId: factuur_id,
            documentId,
            tokenRef: retryTokenRef,
            division,
            tokenUserId,
            user_id,
            tokenCache,
          })
        : { synced: 0, failed: 0, geprobeerd: 0 }
      token = retryTokenRef.current

      // Best-effort: koppel het Document inline aan de SalesEntry via PUT.
      // Niet-kritiek — Document is al gekoppeld via DocumentAttachment-relatie.
      // Sommige Exact-tenants weigeren PUT op SalesEntry, dat is acceptabel.
      try {
        const putUrl = `${EXACT_API_BASE}/${division}/salesentry/SalesEntries(guid'${factuur.exact_entry_id}')`
        const putRes = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ Document: documentId }),
          // Best-effort call aan het eind van de sync; korter dan de andere
          // Exact-calls omdat de sync hier al geslaagd is en niemand erop wacht.
          signal: AbortSignal.timeout(15_000),
        })
        if (!putRes.ok) {
          const putBody = await putRes.text()
          console.warn('SalesEntry PUT met Document mislukt (niet-kritiek):', putRes.status, putBody)
        }
      } catch (putErr) {
        console.warn('SalesEntry PUT exception (niet-kritiek):', putErr)
      }

      return res.status(200).json({
        success: true,
        exact_entry_id: factuur.exact_entry_id,
        document_id: documentId,
        bijlage_synced: bijlageSynced,
        bijlagen_synced: bijlagenResult.synced,
        bijlagen_failed: bijlagenResult.failed,
        bijlagen_geprobeerd: bijlagenResult.geprobeerd,
      })
    }

    // Zonder regels valt er niets te boeken; Exact geeft daar zelf een
    // onnavolgbare 400 op (komt voor bij creditnota's uit de snelle
    // lijst-dialoog, die alleen kopbedragen aanmaakt).
    if (!factuurItems || factuurItems.length === 0) {
      return res.status(400).json({
        error: 'Deze factuur heeft geen regels; voeg regels toe voordat je naar Exact boekt.',
      })
    }

    // Elke regel moet op een geconfigureerde btw-code uitkomen; een lege code
    // ging voorheen stilzwijgend als VATCode null naar Exact.
    for (const item of factuurItems as Array<{ btw_percentage: unknown }>) {
      if (bepaalBtwCode(item.btw_percentage, exactSettings) === null) {
        if (item.btw_percentage === null || item.btw_percentage === undefined || item.btw_percentage === '') {
          return res.status(400).json({
            error: 'Een factuurregel heeft geen btw-tarief. Open de factuur, vul het percentage in en sla opnieuw op voordat je naar Exact boekt.',
          })
        }
        const tarief = Number(item.btw_percentage)
        return res.status(400).json({
          error: ONDERSTEUNDE_BTW_TARIEVEN.includes(tarief)
            ? `Geen Exact-btw-code geconfigureerd voor ${tarief}% btw. Vul de btw-codes in bij Instellingen > Integraties.`
            : `Exact kent geen btw-tarief van ${tarief}%. Splits de factuurregel op in losse regels per tarief, of corrigeer het percentage naar 21%, 9% of 0%.`,
        })
      }
    }

    // Bedragen één keer normaliseren, in regelvolgorde. numeric komt via
    // PostgREST soms als string binnen en `.toFixed()` op een string gooit.
    const regelTotalen: number[] = []
    for (const item of factuurItems as Array<{ totaal: unknown }>) {
      const regelBedrag = alsBedrag(item.totaal)
      if (regelBedrag === null) {
        return res.status(400).json({
          error: 'Een factuurregel heeft geen geldig regeltotaal. Open de factuur, controleer de regels en sla opnieuw op.',
        })
      }
      regelTotalen.push(regelBedrag)
    }

    const btwBedrag = alsBedrag(factuur.btw_bedrag)
    if (btwBedrag === null) {
      return res.status(400).json({
        error: 'Het btw-bedrag van deze factuur ontbreekt of is ongeldig. Open de factuur en sla hem opnieuw op voordat je naar Exact boekt.',
      })
    }

    // Kop en regels moeten bij dezelfde versie van de factuur horen. Slaagt een
    // editor-save maar half (kop bijgewerkt, regels nog de oude), dan kloppen de
    // regelbedragen niet bij het btw-totaal van de kop en landt er een boeking in
    // Exact die alleen met een correctie recht te zetten is. 0,02 speling voor
    // afrondingsverschillen per regel. Een lege subtotaal-kop slaan we over: dan
    // is er niets om tegen te vergelijken.
    const subtotaalKop = alsBedrag(factuur.subtotaal)
    const regelsSom = regelTotalen.reduce((som, bedrag) => som + bedrag, 0)
    if (subtotaalKop !== null && Math.abs(regelsSom - subtotaalKop) > 0.02) {
      return res.status(400).json({
        error: `De kop en de regels van deze factuur horen niet bij dezelfde versie: het subtotaal is € ${subtotaalKop.toFixed(2)}, terwijl de regels optellen tot € ${regelsSom.toFixed(2)}. Open de factuur en sla hem opnieuw op voordat je naar Exact boekt.`,
      })
    }

    // 4. Klant zoeken/aanmaken
    // Haal klantgegevens op uit Supabase
    const { data: klant, error: klantError } = await supabaseAdmin
      .from('klanten')
      .select('bedrijfsnaam, email, telefoon, debiteurennummer, adres, postcode, stad, land, btw_nummer, kvk_nummer')
      .eq('id', factuur.klant_id)
      .maybeSingle()
    if (klantError) console.error('[exact-sync] klant lookup fout:', klantError.message)

    const klantVoorExact: KlantVoorExact = {
      naam: klant?.bedrijfsnaam || factuur.klant_naam || 'Onbekende klant',
      email: klant?.email,
      telefoon: klant?.telefoon,
      debiteurennummer: klant?.debiteurennummer,
      adres: klant?.adres,
      postcode: klant?.postcode,
      stad: klant?.stad,
      land: klant?.land,
      btw_nummer: klant?.btw_nummer,
      kvk_nummer: klant?.kvk_nummer,
    }
    let customerGuid: string
    // Alleen Sentry zag voorheen dat een debiteurennummer-match op naamverschil
    // werd afgewezen en er dus een dubbele relatie in Exact bijkwam. Deze tekst
    // gaat mee in de succes-respons, die de editor als toast.warning toont.
    let klantNaamWaarschuwing: string | null = null

    try {
      const klantResultaat = await findOrCreateKlant(token, division, klantVoorExact)
      customerGuid = klantResultaat.id
      klantNaamWaarschuwing = klantResultaat.naamWaarschuwing
    } catch (klantError: unknown) {
      // Token verlopen tijdens klant zoeken? Refresh en retry 1x
      try {
        token = await getValidToken(tokenUserId, user_id, tokenCache)

        const klantResultaat = await findOrCreateKlant(token, division, klantVoorExact)
        customerGuid = klantResultaat.id
        klantNaamWaarschuwing = klantResultaat.naamWaarschuwing
      } catch {
        const msg = klantError instanceof Error ? klantError.message : 'Klant aanmaken mislukt'
        await registreerSyncFout(factuur_id, msg)
        return res.status(502).json({ error: msg })
      }
    }

    // 5. Grootboek GUID per regel opzoeken.
    // DOEN kan per factuurregel een grootboekrekening hebben (factuur_items.
    // grootboek_code). Die krijgt voorrang; ontbreekt hij, dan valt de regel
    // terug op het org-brede standaard-grootboek (exact_grootboek). De code→GUID
    // lookup koppelt de DOEN-grootboekcode aan de Exact GLAccount met dezelfde Code.
    const defaultGrootboekCode = (exactSettings.exact_grootboek || '').trim()
    const grootboekGuidPerCode = new Map<string, string>()
    for (const item of (factuurItems || []) as Array<{ grootboek_code?: string | null }>) {
      const code = (item.grootboek_code || '').trim() || defaultGrootboekCode
      if (!code) {
        return res.status(400).json({
          error: 'Geen grootboekrekening op de factuurregel én geen standaard-grootboek geconfigureerd in Instellingen > Integraties.',
        })
      }
      if (!grootboekGuidPerCode.has(code)) {
        grootboekGuidPerCode.set(code, await getGrootboekGuid(token, division, code))
      }
    }

    // 5b. Document POST + DocumentAttachment POST (alleen als PDF beschikbaar).
    // Bij failure: log, sla over, sync gaat door zonder bijlage-koppeling.
    // Aparte 401-retry per call zodat een retry op Attachment geen dubbele
    // Document aanmaakt (Exact heeft geen idempotency-key).
    if (pdfBase64) {
      // Hergebruik het Document van een eerdere poging die op de SalesEntry
      // strandde. Zonder deze check maakte élke retry een nieuw Document met een
      // nieuwe PDF-bijlage aan en bleven de vorige als wezen in Exact staan.
      // Zelfde patroon als de attachment_only-tak hierboven.
      documentId = (factuur.exact_document_id as string | null) ?? null
      // exact_bijlage_gesynced_op is de enige beslisser over opnieuw uploaden.
      // De UI zet hem op null zodra pdf_storage_path geïnvalideerd wordt (de
      // factuur is inhoudelijk gewijzigd), en dan hangt deze flow de verse PDF
      // aan hetzelfde bestaande Document — geen tweede Document dus.
      // Let op: de oude bijlage blijft in Exact aan dat Document hangen. Exact
      // biedt via dit pad geen delete op een DocumentAttachment, dus er staan na
      // een herziening twee PDF's bij het document. Dat is bewust: liever een
      // dubbele bijlage die zichtbaar is dan een document zonder actuele PDF.
      const pdfAlGekoppeld = !!factuur.exact_bijlage_gesynced_op

      if (!documentId) {
        const documentSubject = factuur.factuur_type === 'creditnota'
          ? `Creditnota ${factuur.nummer}`
          : `Factuur ${factuur.nummer}`

        const documentPayload = {
          Subject: documentSubject,
          Type: exactSettings.exact_document_type_id,
          Account: customerGuid,
        }

        try {
          const docResult = await exactPost(
            token,
            division,
            'documents/Documents',
            documentPayload,
          ) as { d?: { ID?: string } }
          documentId = docResult?.d?.ID ?? null
        } catch (docErr) {
          // Afgebroken request: niet opnieuw posten. Anders staat het document
          // dubbel in Exact. Zie magOpnieuwNaFout. Hier niet-fataal: de SalesEntry
          // is al geboekt, dus alleen de bijlage-koppeling ontbreekt en die is via
          // attachment_only opnieuw te proberen.
          if (!magOpnieuwNaFout(docErr)) {
            console.error('[Exact] Document POST afgebroken; niet opnieuw geprobeerd', {
              factuur_id, naam: (docErr as { name?: string })?.name,
            })
            documentId = null
          } else {
            try {
              token = await getValidToken(tokenUserId, user_id, tokenCache)

              const docResult = await exactPost(
                token,
                division,
                'documents/Documents',
                documentPayload,
              ) as { d?: { ID?: string } }
              documentId = docResult?.d?.ID ?? null
            } catch (retryErr) {
              console.error('Document POST mislukt (na retry):', docErr, retryErr)
              documentId = null
            }
          }
        }

        if (documentId) {
          await supabaseAdmin
            .from('facturen')
            .update({ exact_document_id: documentId })
            .eq('id', factuur_id)
        }
      }

      if (documentId && pdfAlGekoppeld) {
        // De factuur-PDF hangt al aan dit Document; opnieuw posten zou hem een
        // tweede keer koppelen.
        bijlageSynced = true
      } else if (documentId) {
        const attachmentPayload = {
          Document: documentId,
          FileName: `Factuur-${factuur.nummer}.pdf`,
          Attachment: pdfBase64,
        }

        try {
          await exactPost(token, division, 'documents/DocumentAttachments', attachmentPayload)
          bijlageSynced = true
        } catch (attErr) {
          // Afgebroken request: niet opnieuw posten, dan hangt de PDF dubbel aan
          // het Document. Zie magOpnieuwNaFout. Niet-fataal; via attachment_only
          // is de koppeling later te herstellen.
          if (!magOpnieuwNaFout(attErr)) {
            console.error('[Exact] DocumentAttachment POST afgebroken; niet opnieuw geprobeerd', {
              factuur_id, naam: (attErr as { name?: string })?.name,
            })
          } else {
            try {
              token = await getValidToken(tokenUserId, user_id, tokenCache)

              await exactPost(token, division, 'documents/DocumentAttachments', attachmentPayload)
              bijlageSynced = true
            } catch (retryErr) {
              console.error('DocumentAttachment POST mislukt (na retry):', attErr, retryErr)
            }
          }
        }

        if (bijlageSynced) {
          await supabaseAdmin
            .from('facturen')
            .update({ exact_bijlage_gesynced_op: new Date().toISOString() })
            .eq('id', factuur_id)
        }
      }

      if (documentId) {
        // Losse factuur_bijlagen (klant-inkooporders, extra docs) elk als
        // aparte DocumentAttachment posten. Best-effort: faalt één, dan
        // blijven de andere staan en blokkeert het de factuur-sync niet.
        const mainTokenRef = { current: token }
        const bijlagenResult = await syncFactuurBijlagenToExact({
          factuurId: factuur_id,
          documentId,
          tokenRef: mainTokenRef,
          division,
          tokenUserId,
          user_id,
          tokenCache,
        })
        token = mainTokenRef.current
        mainBijlagenSyncResult = bijlagenResult
      }
    }

    // 6. SalesEntry aanmaken
    const factuurdatum = factuur.factuurdatum || new Date().toISOString().split('T')[0]
    const dateParts = factuurdatum.split('-')
    const reportingYear = parseInt(dateParts[0], 10)
    const reportingPeriod = parseInt(dateParts[1], 10)

    // Kostenplaats van de factuur gaat als code mee op elke regel; hij ging
    // al wel in de UBL maar nooit naar Exact.
    let kostenplaatsCode: string | null = null
    if (factuur.kostenplaats_id) {
      const { data: kostenplaats } = await supabaseAdmin
        .from('kostenplaatsen')
        .select('code')
        .eq('id', factuur.kostenplaats_id)
        .maybeSingle()
      kostenplaatsCode = (kostenplaats?.code as string | undefined)?.trim() || null
    }

    const salesEntryLines = (factuurItems || []).map((item: {
      beschrijving: string
      btw_percentage: number
      totaal: number
      aantal: number
      eenheidsprijs: number
      korting_percentage: number
      grootboek_code?: string | null
    }, index: number) => {
      // factuur_items.totaal is al excl. BTW (zie calcLineTotal in FactuurEditor).
      // Genormaliseerd bij de consistentiecheck hierboven, in dezelfde volgorde.
      const regelTotaal = regelTotalen[index]
      const btwCode = bepaalBtwCode(item.btw_percentage, exactSettings)
      const regelGrootboekCode = (item.grootboek_code || '').trim() || defaultGrootboekCode

      const line: Record<string, string | null> = {
        AmountDC: regelTotaal.toFixed(2),
        AmountFC: regelTotaal.toFixed(2),
        Description: item.beschrijving,
        GLAccount: grootboekGuidPerCode.get(regelGrootboekCode) ?? null,
        VATCode: btwCode,
      }
      if (kostenplaatsCode) line.CostCenter = kostenplaatsCode

      return line
    })

    // Omschrijving (Exact 'Description', max 50 tekens) = factuurtitel;
    // 'Uw referentie' (YourRef) blijft het factuurnummer.
    const omschrijving = String(factuur.titel || '').slice(0, 50)

    const salesEntry: Record<string, unknown> = {
      Journal: exactSettings.exact_verkoopboek,
      YourRef: factuur.nummer,
      Description: omschrijving,
      Customer: customerGuid,
      EntryDate: `${factuurdatum}T00:00:00`,
      ReportingPeriod: reportingPeriod,
      ReportingYear: reportingYear,
      VATAmountDC: btwBedrag.toFixed(2),
      VATAmountFC: btwBedrag.toFixed(2),
      SalesEntryLines: salesEntryLines,
    }
    // Vervaldatum bepaalt in Exact de openstaande-postentermijn; zonder
    // DueDate rekent Exact zelf vanuit de betalingsconditie van de relatie
    // en lopen de vervaldata in doen. en Exact uit elkaar.
    if (factuur.vervaldatum) {
      salesEntry.DueDate = `${factuur.vervaldatum}T00:00:00`
    }
    if (documentId) {
      salesEntry.Document = documentId
    }

    let entryResult: { d?: { EntryID?: string } }
    try {
      entryResult = await exactPost(
        token,
        division,
        'salesentry/SalesEntries',
        salesEntry
      ) as { d?: { EntryID?: string } }
    } catch (syncError: unknown) {
      // Bij een afgebroken request NIET opnieuw posten: de eerste POST kan zijn
      // aangekomen en dan staat de factuur na een retry dubbel in Exact. Zie
      // magOpnieuwNaFout. 504 zodat de client weet dat de uitkomst onbekend is;
      // de guard bovenaan dit endpoint vangt een tweede poging op, want die ziet
      // exact_entry_id dan wel of niet staan.
      if (!magOpnieuwNaFout(syncError)) {
        console.error('[Exact] SalesEntry POST afgebroken; niet opnieuw geprobeerd om dubbele boeking te voorkomen', {
          factuur_id, naam: (syncError as { name?: string })?.name,
        })
        Sentry.captureException(syncError, { extra: { factuur_id, fase: 'salesentry-post-afgebroken' } })
        await registreerSyncFout(factuur_id, 'Exact reageerde niet binnen de tijd; boeking mogelijk wel aangekomen.')
        // Claim vasthouden: er is geen exact_entry_id om de idempotency-guard mee
        // te voeden, dus de claim is het enige wat een tweede boeking tegenhoudt.
        // Hij verjaart na tien minuten vanzelf — genoeg tijd om in Exact te kijken.
        claimBehouden = true
        return res.status(504).json({
          success: false,
          error: 'Exact reageerde niet binnen de tijd. De boeking is mogelijk wél aangekomen. Controleer in Exact of de factuur er staat voordat je opnieuw synchroniseert. Probeer het na tien minuten opnieuw.',
        })
      }
      // Retry 1x na token refresh
      try {
        token = await getValidToken(tokenUserId, user_id, tokenCache)

        entryResult = await exactPost(
          token,
          division,
          'salesentry/SalesEntries',
          salesEntry
        ) as { d?: { EntryID?: string } }
      } catch {
        const msg = syncError instanceof Error ? syncError.message : 'Factuur synchroniseren mislukt'
        await registreerSyncFout(factuur_id, msg)
        return res.status(502).json({ success: false, error: msg })
      }
    }

    const exactEntryId = entryResult?.d?.EntryID

    // 7. Sla op in factuur; een geslaagde sync wist de vorige foutmelding.
    let { error: syncOpslagFout } = await supabaseAdmin
      .from('facturen')
      .update({
        exact_entry_id: exactEntryId || null,
        exact_synced_at: new Date().toISOString(),
        exact_sync_fout: null,
        exact_sync_fout_op: null,
      })
      .eq('id', factuur_id)
    if (syncOpslagFout && syncOpslagFout.message?.includes('exact_sync_fout')) {
      // Migratie 213 nog niet gedraaid: zonder foutlog-kolommen opslaan.
      const { error: fallbackFout } = await supabaseAdmin
        .from('facturen')
        .update({ exact_entry_id: exactEntryId || null, exact_synced_at: new Date().toISOString() })
        .eq('id', factuur_id)
      syncOpslagFout = fallbackFout
    }
    // Verloren exact_entry_id betekent dat de idempotency-guard de volgende
    // klik niet meer tegenhoudt en de factuur dubbel in Exact kan landen.
    // Niet stil laten passeren, en de claim laten staan: dan houdt de
    // 10-minuten-verjaring een snelle tweede poging machinaal tegen, net als
    // op het 504-pad.
    if (syncOpslagFout) {
      claimBehouden = true
      console.error('[exact-sync] exact_entry_id NIET opgeslagen na geslaagde boeking', {
        factuur_id, exact_entry_id: exactEntryId, fout: syncOpslagFout.message,
      })
      Sentry.captureException(new Error('Exact entry id not persisted after booking'), {
        level: 'error',
        extra: { factuur_id, exact_entry_id: exactEntryId, fout: syncOpslagFout.message },
      })
    }

    // Er kan meer dan één ding zijn misgegaan zonder dat de boeking faalde; de
    // editor toont één `waarschuwing`-veld, dus alles wat speelt gaat samen mee.
    const waarschuwingen = [
      syncOpslagFout
        ? 'De boeking staat in Exact, maar het registreren in doen. mislukte. Synchroniseer NIET opnieuw voordat je in Exact gecontroleerd hebt of de factuur er staat.'
        : null,
      klantNaamWaarschuwing,
    ].filter((tekst): tekst is string => !!tekst)

    return res.status(200).json({
      success: true,
      exact_entry_id: exactEntryId,
      document_id: documentId,
      bijlage_synced: bijlageSynced,
      bijlagen_synced: mainBijlagenSyncResult.synced,
      bijlagen_failed: mainBijlagenSyncResult.failed,
      bijlagen_geprobeerd: mainBijlagenSyncResult.geprobeerd,
      ...(waarschuwingen.length ? { waarschuwing: waarschuwingen.join(' ') } : {}),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout bij synchroniseren'
    console.error('Exact sync factuur error:', message)
    const factuurId = (req.body as { factuur_id?: string } | undefined)?.factuur_id
    // Alleen loggen op een factuur waarvan vaststaat dat de caller erbij mag.
    if (factuurGeautoriseerd && factuurId) await registreerSyncFout(factuurId, message)
    return res.status(500).json({ success: false, error: message })
  } finally {
    // Claim vrijgeven op elk vertrekpunt: geslaagd, gefaald of geworpen. Behalve
    // na een afgebroken SalesEntry-POST: daar is de uitkomst onbekend en houdt
    // de claim de tweede klik tegen tot de verjaring hem loslaat.
    // Alleen de eigen claim wissen, nooit die van een overnemer.
    if (claimActief && geclaimdeFactuurId && !claimBehouden) {
      const { error: vrijgaveFout } = await supabaseAdmin
        .from('facturen')
        .update({ exact_sync_gestart_op: null })
        .eq('id', geclaimdeFactuurId)
        .eq('exact_sync_gestart_op', eigenClaimTimestamp)
      if (vrijgaveFout) {
        // Niet fataal: de claim verloopt vanzelf na tien minuten.
        console.warn('[exact-sync] claim vrijgeven mislukt:', vrijgaveFout.message)
      }
    }
  }
}
