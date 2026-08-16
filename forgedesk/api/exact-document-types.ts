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

// De Exact-koppeling is org-breed: `exact_owner_user_id` houdt de OAuth-sessie
// en is de enige met een `exact_tokens`-rij. Zonder deze omweg kan een collega
// zonder eigen sessie de Document-types niet ophalen en blijft dat veld in
// Instellingen leeg. Zelfde keuze als in exact-sync-factuur.ts.
async function bepaalTokenHouder(callerUserId: string): Promise<string> {
  const settings = await loadAppSettingsOrgFirst(supabaseAdmin, callerUserId, 'exact_owner_user_id')
  const eigenaar = (settings?.exact_owner_user_id as string | null) || null
  if (!eigenaar || eigenaar === callerUserId) return callerUserId

  // `exact_tokens` heeft geen organisatie_id, dus controleren dat de eigenaar
  // nog bij deze organisatie hoort moet hier. Zelfde check als in
  // exact-sync-factuur.ts.
  const callerOrg = await getOrgIdForUser(supabaseAdmin, callerUserId)
  const eigenaarOrg = await getOrgIdForUser(supabaseAdmin, eigenaar)
  if (!callerOrg || callerOrg !== eigenaarOrg) return callerUserId
  return eigenaar
}

async function getValidToken(tokenUserId: string, settingsUserId: string): Promise<{ token: string; division: number }> {
  const { data, error } = await supabaseAdmin
    .from('exact_tokens')
    .select('access_token, refresh_token, expires_at, division')
    .eq('user_id', tokenUserId)
    .single()

  if (error || !data?.access_token) throw new Error('Geen Exact Online tokens gevonden')

  const expiresAt = new Date(data.expires_at)
  const now = new Date()
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return { token: decryptSecret(data.access_token), division: data.division }
  }

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
        .eq('user_id', tokenUserId)
        .maybeSingle()
      if (herlezen?.refresh_token && herlezen.refresh_token !== data.refresh_token) {
        return { token: decryptSecret(herlezen.access_token), division: herlezen.division }
      }

      if (errorBody.includes('invalid_grant')) {
        // Bij invalid_grant heeft Exact de keten van de tokenhouder afgewezen.
        // Verwijder alleen diens tokens; raak de org-brede
        // `exact_online_connected` niet aan. Tokenhouder en caller apart
        // loggen: bij een org-brede koppeling zijn dat verschillende mensen.
        //
        // Voorwaarde op refresh_token: alleen wissen als er nog de keten staat
        // die wij gelezen hebben, zodat een verliezende parallelle refresh niet
        // de verse rij van de winnaar weggooit.
        await supabaseAdmin
          .from('exact_tokens')
          .delete()
          .eq('user_id', tokenUserId)
          .eq('refresh_token', data.refresh_token)
        console.error('[Exact] invalid_grant — token rejected', {
          token_user_id: tokenUserId, caller_user_id: settingsUserId,
          endpoint: 'exact-document-types.ts', status: refreshRes.status,
        })
        Sentry.captureException(new Error('Exact invalid_grant'), {
          level: 'warning',
          tags: { exact_endpoint: 'exact-document-types', oauth_error: 'invalid_grant' },
          extra: { token_user_id: tokenUserId, caller_user_id: settingsUserId, status: refreshRes.status },
        })
        throw new Error('Token refresh mislukt. Verbind Exact Online opnieuw via Instellingen.')
      }
    }
    console.error('[Exact] token refresh fout', {
      endpoint: 'exact-document-types.ts', status: refreshRes.status, errorBody,
    })
    throw new Error('Exact Online token vernieuwen mislukt. Probeer het opnieuw.')
  }
  const tokens = (await refreshRes.json()) as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!tokens?.access_token) {
    console.error('[Exact] refresh gaf 200 zonder access_token', { endpoint: 'exact-document-types.ts' })
    throw new Error('Exact Online gaf een onverwacht antwoord bij token vernieuwen. Probeer het opnieuw.')
  }

  const nieuweRij = {
    user_id: tokenUserId,
    access_token: encryptSecret(tokens.access_token),
    refresh_token: encryptSecret(tokens.refresh_token || decryptSecret(data.refresh_token)),
    expires_at: new Date(Date.now() + (tokens.expires_in ?? 600) * 1000).toISOString(),
    division: data.division,
    updated_at: new Date().toISOString(),
  }

  // Compare-and-swap op de refresh_token die we gelezen hebben. Het ciphertext
  // is een betrouwbaar versiemerk (elke write gebruikt een nieuwe random salt),
  // dus nul geraakte rijen betekent dat iemand anders de keten al vervangen of
  // de koppeling ontkoppeld heeft. Een blinde upsert overschreef in dat geval de
  // verse keten van een net afgeronde OAuth of wekte een ontkoppelde rij weer op.
  const { data: bijgewerkt, error: updateFout } = await supabaseAdmin
    .from('exact_tokens')
    .update(nieuweRij)
    .eq('user_id', tokenUserId)
    .eq('refresh_token', data.refresh_token)
    .select('user_id')

  if (updateFout) {
    console.error('[Exact] geroteerde token NIET opgeslagen — keten is hierna dood', {
      token_user_id: tokenUserId, caller_user_id: settingsUserId,
      endpoint: 'exact-document-types.ts', fout: updateFout.message,
    })
    Sentry.captureException(new Error('Exact token rotation not persisted'), {
      level: 'error',
      tags: { exact_endpoint: 'exact-document-types', oauth_error: 'rotation_not_persisted' },
      extra: { token_user_id: tokenUserId, caller_user_id: settingsUserId, fout: updateFout.message },
    })
  } else if (!bijgewerkt?.length) {
    // Verloren race: staat er een nieuwere keten, dan is die van iemand anders
    // leidend en hoeven we niets te herstellen.
    const { data: huidig } = await supabaseAdmin
      .from('exact_tokens')
      .select('access_token, division')
      .eq('user_id', tokenUserId)
      .maybeSingle()
    const rij = huidig as { access_token?: string | null; division?: number | null } | null
    if (rij?.access_token) {
      return { token: decryptSecret(rij.access_token), division: rij.division as number }
    }

    // Rij is weg. Dat kan een expliciete ontkoppeling zijn (dan NIET
    // reanimeren), maar ook een parallel pad dat tijdens onze refresh
    // invalid_grant kreeg en de rij wiste — dan is onze verse keten de enige
    // werkende die nog bestaat en zou hem laten vallen de hele org ontkoppelen.
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
      console.warn('[Exact] rotatie niet bewaard: koppeling is inmiddels ontkoppeld', {
        token_user_id: tokenUserId, caller_user_id: settingsUserId, endpoint: 'exact-document-types.ts',
      })
    } else {
      const { error: insertFout } = await supabaseAdmin.from('exact_tokens').insert(nieuweRij)
      // 23505 = een parallel request maakte de rij net aan; die keten is dan
      // nieuwer dan de onze en mag blijven staan.
      if (insertFout && insertFout.code !== '23505') {
        console.error('[Exact] geroteerde token NIET opgeslagen (insert)', {
          token_user_id: tokenUserId, caller_user_id: settingsUserId,
          endpoint: 'exact-document-types.ts', fout: insertFout.message,
        })
        Sentry.captureException(new Error('Exact token rotation not persisted'), {
          level: 'error',
          tags: { exact_endpoint: 'exact-document-types', oauth_error: 'rotation_not_persisted' },
          extra: { token_user_id: tokenUserId, caller_user_id: settingsUserId, fout: insertFout.message },
        })
      }
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
    const tokenUserId = await bepaalTokenHouder(userId)
    const { token, division } = await getValidToken(tokenUserId, userId)

    // De ingestelde administratie is leidend, net als in exact-sync-factuur.ts.
    // Op de division uit de tokenrij vertrouwen leverde Document-types uit een
    // andere administratie dan waarin geboekt wordt, en die kolom kan NULL zijn
    // als /current/Me faalde tijdens de callback (dan werd de URL `/null/...`).
    const adminSettings = await loadAppSettingsOrgFirst(supabaseAdmin, userId, 'exact_administratie_id')
    const administratie = (adminSettings?.exact_administratie_id as string | null) || (division != null ? String(division) : null)
    if (!administratie) {
      return res.status(400).json({
        error: 'Exact Online administratie niet geconfigureerd. Vul deze in bij Instellingen > Integraties.',
      })
    }

    const typesRes = await exactFetchMetRetry(
      `${EXACT_API_BASE}/${administratie}/documents/DocumentTypes?$filter=DocumentIsCreatable eq true&$select=ID,Description,TypeCategory&$orderby=Description`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )

    if (typesRes.status === 429) throw new Error('Exact Online rate-limit bereikt. Probeer het over een minuut opnieuw.')
    if (!typesRes.ok) {
      const text = await typesRes.text()
      console.error('Exact DocumentTypes error:', typesRes.status, text)
      throw new Error(`Kon Document-types niet ophalen (${typesRes.status})`)
    }

    const body = await typesRes.json() as {
      d?: { results?: Array<{ ID: number; Description: string; TypeCategory: number }> }
    }
    const results = (body.d?.results || []).map((t) => ({
      id: t.ID,
      description: t.Description,
      typeCategory: t.TypeCategory,
    }))

    return res.status(200).json(results)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return res.status(500).json({ error: message })
  }
}
