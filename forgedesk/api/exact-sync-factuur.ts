import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import * as Sentry from '@sentry/node'

// ── Sentry init (inline; Vercel bundelt geen lokale modules in api/) ──
if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
    sendDefaultPii: false,
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
    if (data) return data as Record<string, unknown>
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

    const tokens = await refreshRes.json()
    if (!tokens?.access_token) {
      console.error('[Exact] refresh gaf 200 zonder access_token', { endpoint: 'exact-sync-factuur.ts' })
      throw new Error('Exact Online gaf een onverwacht antwoord bij token vernieuwen. Probeer het opnieuw.')
    }

    const nieuweRij = {
      user_id: tokenUserId,
      access_token: encryptSecret(tokens.access_token),
      refresh_token: encryptSecret(tokens.refresh_token || decryptSecret(tokenData.refresh_token)),
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
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
async function exactFetchMetRetry(url: string, init: RequestInit): Promise<Response> {
  for (let poging = 0; ; poging++) {
    const response = await fetch(url, init)
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

function bepaalBtwCode(btwPercentage: number, settings: ExactSettings): string | null {
  if (btwPercentage >= 21) return settings.exact_btw_hoog || null
  if (btwPercentage >= 9) return settings.exact_btw_laag || null
  return settings.exact_btw_nul || null
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

async function findOrCreateKlant(
  token: string,
  division: string,
  klantNaam: string,
  klantEmail?: string,
  klantTelefoon?: string
): Promise<string> {
  // Zoek alleen onder customer accounts (Status 'C') zodat we geen
  // leveranciers of prospects matchen die toevallig dezelfde naam hebben.
  const encodedName = klantNaam.replace(/'/g, "''")
  const searchData = await exactGet(
    token,
    division,
    `crm/Accounts?$filter=Name eq '${encodedName}' and Status eq 'C'&$select=ID`
  ) as { d?: { results?: Array<{ ID: string }> } }

  const existingId = searchData?.d?.results?.[0]?.ID
  if (existingId) return existingId

  // Klant niet gevonden, maak aan met Status 'C' (Customer) zodat de
  // latere SalesEntry-sync werkt — Exact accepteert geen SalesEntry voor
  // een account zonder customer rol.
  const newAccount: Record<string, string> = { Name: klantNaam, Status: 'C' }
  if (klantEmail) newAccount.Email = klantEmail
  if (klantTelefoon) newAccount.Phone = klantTelefoon

  const createData = await exactPost(token, division, 'crm/Accounts', newAccount) as {
    d?: { ID: string }
  }

  const newId = createData?.d?.ID
  if (!newId) {
    throw new Error(`Klant "${klantNaam}" kon niet aangemaakt worden in Exact Online.`)
  }

  return newId
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
          retryCustomerGuid = await findOrCreateKlant(
            token,
            division,
            retryKlantNaam,
            retryKlant?.email,
            retryKlant?.telefoon,
          )
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

    // 4. Klant zoeken/aanmaken
    // Haal klantgegevens op uit Supabase
    const { data: klant, error: klantError } = await supabaseAdmin
      .from('klanten')
      .select('bedrijfsnaam, email, telefoon')
      .eq('id', factuur.klant_id)
      .maybeSingle()
    if (klantError) console.error('[exact-sync] klant lookup fout:', klantError.message)

    const klantNaam = klant?.bedrijfsnaam || factuur.klant_naam || 'Onbekende klant'
    let customerGuid: string

    try {
      customerGuid = await findOrCreateKlant(
        token,
        division,
        klantNaam,
        klant?.email,
        klant?.telefoon
      )
    } catch (klantError: unknown) {
      // Token verlopen tijdens klant zoeken? Refresh en retry 1x
      try {
        token = await getValidToken(tokenUserId, user_id, tokenCache)

        customerGuid = await findOrCreateKlant(
          token,
          division,
          klantNaam,
          klant?.email,
          klant?.telefoon
        )
      } catch {
        const msg = klantError instanceof Error ? klantError.message : 'Klant aanmaken mislukt'
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

      if (documentId) {
        await supabaseAdmin
          .from('facturen')
          .update({ exact_document_id: documentId })
          .eq('id', factuur_id)

        const attachmentPayload = {
          Document: documentId,
          FileName: `Factuur-${factuur.nummer}.pdf`,
          Attachment: pdfBase64,
        }

        try {
          await exactPost(token, division, 'documents/DocumentAttachments', attachmentPayload)
          bijlageSynced = true
        } catch (attErr) {
          try {
            token = await getValidToken(tokenUserId, user_id, tokenCache)

            await exactPost(token, division, 'documents/DocumentAttachments', attachmentPayload)
            bijlageSynced = true
          } catch (retryErr) {
            console.error('DocumentAttachment POST mislukt (na retry):', attErr, retryErr)
          }
        }

        if (bijlageSynced) {
          await supabaseAdmin
            .from('facturen')
            .update({ exact_bijlage_gesynced_op: new Date().toISOString() })
            .eq('id', factuur_id)
        }

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

    const salesEntryLines = (factuurItems || []).map((item: {
      beschrijving: string
      btw_percentage: number
      totaal: number
      aantal: number
      eenheidsprijs: number
      korting_percentage: number
      grootboek_code?: string | null
    }) => {
      // factuur_items.totaal is al excl. BTW (zie calcLineTotal in FactuurEditor)
      const regelTotaal = item.totaal
      const btwCode = bepaalBtwCode(item.btw_percentage, exactSettings)
      const regelGrootboekCode = (item.grootboek_code || '').trim() || defaultGrootboekCode

      const line: Record<string, string | null> = {
        AmountDC: regelTotaal.toFixed(2),
        AmountFC: regelTotaal.toFixed(2),
        Description: item.beschrijving,
        GLAccount: grootboekGuidPerCode.get(regelGrootboekCode) ?? null,
        VATCode: btwCode,
      }

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
      VATAmountDC: (factuur.btw_bedrag as number).toFixed(2),
      VATAmountFC: (factuur.btw_bedrag as number).toFixed(2),
      SalesEntryLines: salesEntryLines,
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
        return res.status(502).json({ success: false, error: msg })
      }
    }

    const exactEntryId = entryResult?.d?.EntryID

    // 7. Sla op in factuur
    await supabaseAdmin
      .from('facturen')
      .update({
        exact_entry_id: exactEntryId || null,
        exact_synced_at: new Date().toISOString(),
      })
      .eq('id', factuur_id)

    return res.status(200).json({
      success: true,
      exact_entry_id: exactEntryId,
      document_id: documentId,
      bijlage_synced: bijlageSynced,
      bijlagen_synced: mainBijlagenSyncResult.synced,
      bijlagen_failed: mainBijlagenSyncResult.failed,
      bijlagen_geprobeerd: mainBijlagenSyncResult.geprobeerd,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout bij synchroniseren'
    console.error('Exact sync factuur error:', message)
    return res.status(500).json({ success: false, error: message })
  }
}
