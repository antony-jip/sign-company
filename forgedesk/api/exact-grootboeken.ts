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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const EXACT_API_BASE = 'https://start.exactonline.nl/api/v1'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

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

async function getValidToken(userId: string): Promise<{ token: string; division: number }> {
  const { data, error } = await supabaseAdmin
    .from('exact_tokens')
    .select('access_token, refresh_token, expires_at, division')
    .eq('user_id', userId)
    .single()

  if (error || !data?.access_token) throw new Error('Geen Exact Online tokens gevonden')

  if (new Date(data.expires_at).getTime() - Date.now() > 5 * 60 * 1000) {
    return { token: decryptSecret(data.access_token), division: data.division }
  }

  const settings = await loadAppSettingsOrgFirst(
    supabaseAdmin,
    userId,
    'exact_online_client_id, exact_online_client_secret',
  )
  const exactClientId = settings?.exact_online_client_id as string | undefined
  const exactClientSecret = settings?.exact_online_client_secret ? decryptSecret(settings.exact_online_client_secret as string) : undefined

  if (!exactClientId || !exactClientSecret) {
    throw new Error('Exact credentials niet gevonden')
  }

  const refreshRes = await fetch('https://start.exactonline.nl/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decryptSecret(data.refresh_token),
      client_id: exactClientId,
      client_secret: exactClientSecret,
    }),
    // Token-endpoint is een kleine POST die normaal in een seconde klaar is;
    // hangt Exact, dan mag dat niet de hele functieduur opeten.
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
        .select('access_token, refresh_token, expires_at, division')
        .eq('user_id', userId)
        .maybeSingle()
      if (herlezen?.refresh_token && herlezen.refresh_token !== data.refresh_token) {
        return { token: decryptSecret(herlezen.access_token), division: herlezen.division }
      }

      if (errorBody.includes('invalid_grant')) {
        // Bij invalid_grant heeft Exact deze user uitgegooid, vaak doordat een
        // collega zojuist opnieuw OAuth'de op hetzelfde Exact-bedrijfsaccount
        // (Exact staat geen twee gelijktijdige sessies toe). Verwijder alleen
        // diens tokens; raak de org-brede `exact_online_connected` niet aan.
        //
        // De voorwaarde op refresh_token wist alleen de keten die wij gelezen
        // hebben. Draaien er twee refreshes tegelijk, dan krijgt de verliezer
        // invalid_grant terwijl de winnaar net een geldige keten wegschreef;
        // zonder die voorwaarde gooit de verliezer die verse rij weg en is de
        // koppeling org-breed dood.
        await supabaseAdmin
          .from('exact_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('refresh_token', data.refresh_token)
        console.error('[Exact] invalid_grant — token rejected', {
          userId, endpoint: 'exact-grootboeken.ts', status: refreshRes.status,
        })
        Sentry.captureException(new Error('Exact invalid_grant'), {
          level: 'warning',
          tags: { exact_endpoint: 'exact-grootboeken', oauth_error: 'invalid_grant' },
          extra: { user_id: userId, status: refreshRes.status },
        })
        throw new Error('Token refresh mislukt. Verbind Exact Online opnieuw via Instellingen.')
      }
    }
    console.error('[Exact] token refresh fout', {
      endpoint: 'exact-grootboeken.ts', status: refreshRes.status, errorBody,
    })
    throw new Error('Exact Online token vernieuwen mislukt. Probeer het opnieuw.')
  }
  const tokens = await refreshRes.json()

  // Compare-and-swap op de refresh_token die we gelezen hebben. Het ciphertext
  // is een betrouwbaar versiemerk (elke write gebruikt een nieuwe random salt),
  // dus nul geraakte rijen betekent dat iemand anders de keten al vervangen of
  // de koppeling ontkoppeld heeft. Een blinde upsert overschreef in dat geval de
  // verse keten van een net afgeronde OAuth of wekte een ontkoppelde rij weer op.
  const { data: bijgewerkt, error: updateFout } = await supabaseAdmin
    .from('exact_tokens')
    .update({
      access_token: encryptSecret(tokens.access_token),
      refresh_token: encryptSecret(tokens.refresh_token || decryptSecret(data.refresh_token)),
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      division: data.division,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('refresh_token', data.refresh_token)
    .select('user_id')

  if (updateFout) {
    console.error('[Exact] geroteerde token NIET opgeslagen — keten is hierna dood', {
      user_id: userId, endpoint: 'exact-grootboeken.ts', fout: updateFout.message,
    })
    Sentry.captureException(new Error('Exact token rotation not persisted'), {
      level: 'error',
      tags: { exact_endpoint: 'exact-grootboeken', oauth_error: 'rotation_not_persisted' },
      extra: { user_id: userId, fout: updateFout.message },
    })
  } else if (!bijgewerkt?.length) {
    // Deze route leest alleen gegevens op. Bij een verloren race is de nieuwste
    // keten van iemand anders leidend en hoeven we niets te herstellen.
    const { data: huidig } = await supabaseAdmin
      .from('exact_tokens')
      .select('access_token, division')
      .eq('user_id', userId)
      .maybeSingle()
    const rij = huidig as { access_token?: string | null; division?: number | null } | null
    if (rij?.access_token) {
      return { token: decryptSecret(rij.access_token), division: rij.division as number }
    }
  }

  return { token: tokens.access_token, division: data.division }
}

// Exact hanteert per-minuut rate-limits; bij 429 kort wachten (Retry-After,
// gecapt op 10s) en één keer opnieuw proberen.
// Elke poging krijgt een eigen signal: één AbortSignal.timeout hergebruiken zou
// na de eerste poging al afgevuurd zijn en de retry meteen laten falen.
async function exactFetchMetRetry(url: string, init: RequestInit): Promise<Response> {
  const metTimeout = (): RequestInit => ({ ...init, signal: AbortSignal.timeout(20_000) })
  let res = await fetch(url, metTimeout())
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After'))
    const wachtMs = Math.min((retryAfter > 0 ? retryAfter : 5) * 1000, 10_000)
    await new Promise((r) => setTimeout(r, wachtMs))
    res = await fetch(url, metTimeout())
  }
  return res
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const { token, division } = await getValidToken(userId)

    const divisionId = req.query.division || division

    const glRes = await exactFetchMetRetry(
      `${EXACT_API_BASE}/${divisionId}/financial/GLAccounts?$select=Code,Description&$top=500&$orderby=Code`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )

    if (glRes.status === 429) throw new Error('Exact Online rate-limit bereikt. Probeer het over een minuut opnieuw.')
    if (!glRes.ok) throw new Error('Kon grootboekrekeningen niet ophalen')

    const body = await glRes.json()
    const results = (body.d?.results || []).map((g: { Code: string; Description: string }) => ({
      id: g.Code,
      code: g.Code,
      naam: `${g.Code} - ${g.Description}`,
    }))

    return res.status(200).json(results)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return res.status(500).json({ error: message })
  }
}
