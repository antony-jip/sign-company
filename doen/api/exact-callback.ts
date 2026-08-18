import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto, { createHmac } from 'crypto'
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const EXACT_TOKEN_URL = 'https://start.exactonline.nl/api/oauth2/token'

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
const EXACT_API_BASE = 'https://start.exactonline.nl/api/v1'
const REDIRECT_URI = 'https://app.doen.team/api/exact-callback'
const APP_URL = 'https://app.doen.team'

// OAuth-foutcode (RFC 6749) naar de reason-slug die IntegratiesTab omzet in een
// melding. Codes die hier niet in staan vallen terug op `token_exchange`.
const REASON_PER_OAUTH_FOUT: Record<string, string> = {
  invalid_client: 'oauth_client',
  unauthorized_client: 'oauth_client',
  invalid_grant: 'oauth_grant',
  invalid_request: 'oauth_verzoek',
  invalid_scope: 'oauth_verzoek',
  unsupported_grant_type: 'oauth_verzoek',
}

// Inline copy van verifyState uit exact-auth.ts. Vercel serverless functions
// kunnen geen lokale modules importeren — elke route moet standalone zijn.
// Moet in sync blijven met signState/verifyState in exact-auth.ts:
// formaat `${userId}:${ts}:${sig}`, sig = HMAC(userId:ts), met TTL-check.
// Moet gelijk blijven aan STATE_TTL_MS in exact-auth.ts.
const STATE_TTL_MS = 60 * 60 * 1000
function verifyState(state: string): string | null {
  if (!SUPABASE_SERVICE_KEY) return null // fail-closed: geen fallback-secret
  const parts = state.split(':')
  if (parts.length !== 3) return null
  const [userId, ts, sig] = parts
  const expected = createHmac('sha256', SUPABASE_SERVICE_KEY).update(`${userId}:${ts}`).digest('hex').slice(0, 16)
  if (sig !== expected) return null
  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum) || Date.now() - tsNum > STATE_TTL_MS || tsNum > Date.now() + 60_000) return null
  return userId
}

// ─── Inline org-aware app_settings helpers ───
// Vercel serverless functions kunnen geen modules delen tussen API routes,
// dus deze helpers zijn ge-dupliceerd in elke exact-* route. Pakt eerst de
// organisatie-rij (matcht RLS policy + andere users in dezelfde org), valt
// terug op de user-eigen rij. Zelfde strategie als profielService.ts.
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

function getClientIp(req: VercelRequest): string | null {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim() || null
  if (Array.isArray(fwd)) return fwd[0] || null
  return null
}

async function logAuditEvent(
  supabase: SupabaseClient,
  event: {
    organisatie_id?: string | null
    actor_user_id?: string | null
    actor_email?: string | null
    action: string
    resource_type?: string
    resource_id?: string
    metadata?: Record<string, unknown>
    ip?: string | null
  },
): Promise<void> {
  try {
    const ipHash = event.ip
      ? crypto.createHash('sha256').update(event.ip).digest('hex').slice(0, 32)
      : null
    await supabase.from('audit_log').insert({
      organisatie_id: event.organisatie_id ?? null,
      actor_user_id: event.actor_user_id ?? null,
      actor_email: event.actor_email ?? null,
      action: event.action,
      resource_type: event.resource_type ?? null,
      resource_id: event.resource_id ?? null,
      metadata: event.metadata ?? {},
      ip_hash: ipHash,
    })
  } catch (err) {
    console.warn('[audit] log failed:', err)
  }
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const code = req.query.code as string
    const state = req.query.state as string

    if (!code || !state) {
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=missing_params`)
    }

    // Verify HMAC-signed state to prevent CSRF/state manipulation
    const user_id = verifyState(state)
    if (!user_id) {
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=invalid_state`)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Haal client_id + client_secret op uit app_settings (org-first)
    const settings = await loadAppSettingsOrgFirst(
      supabase,
      user_id,
      'exact_online_client_id, exact_online_client_secret',
    )
    const exactClientId = settings?.exact_online_client_id as string | undefined
    const exactClientSecret = settings?.exact_online_client_secret ? decryptSecret(settings.exact_online_client_secret as string) : undefined

    if (!exactClientId || !exactClientSecret) {
      console.error('Exact callback: credentials niet gevonden voor user', user_id)
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=no_credentials`)
    }

    // 2. Wissel code in voor tokens — client_id en client_secret als
    // form-encoded body params (standaard Exact Online methode).
    const tokenResponse = await fetch(EXACT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: exactClientId,
        client_secret: exactClientSecret,
      }).toString(),
      // Token-exchange is een kleine POST; de gebruiker staat hier in de
      // browser te wachten op de redirect, dus kort houden.
      signal: AbortSignal.timeout(10_000),
    })

    // Lees response body als text zodat we hem zowel kunnen loggen bij
    // fouten als parsen bij success. Body kan maar één keer gelezen worden.
    const responseText = await tokenResponse.text()

    if (!tokenResponse.ok) {
      // Dit is de meest voorkomende manier waarop verbinden mislukt (verkeerde
      // client_secret, niet-matchende redirect_uri, verlopen code) en er ging
      // hiervoor geen enkel signaal naar Sentry: alleen een status in de Vercel
      // logs. Zonder oorzaak is dit niet te diagnosticeren.
      //
      // De volledige body niet loggen (kan gevoelige velden bevatten), maar wél
      // de twee OAuth-foutvelden. Die zijn per RFC 6749 juist bedoeld om de
      // oorzaak te benoemen en bevatten geen credentials.
      let oauthError: string | null = null
      let oauthDescription: string | null = null
      try {
        const foutBody = JSON.parse(responseText) as { error?: string; error_description?: string }
        oauthError = foutBody?.error ?? null
        oauthDescription = foutBody?.error_description ?? null
      } catch {
        // Exact antwoordt bij sommige fouten met HTML of platte tekst.
      }
      // Eén reason voor elke weigering stuurde iedereen naar het App Center om
      // de sleutels te controleren, ook als het probleem de redirect-URI of een
      // storing bij Exact was. De OAuth-code benoemt de oorzaak wel, dus vertaal
      // hem naar een eigen slug. Vertalen en niet doorgeven: alleen bekende
      // codes belanden zo in de redirect-URL.
      const reason =
        tokenResponse.status >= 500
          ? 'exact_storing'
          : (oauthError && REASON_PER_OAUTH_FOUT[oauthError]) || 'token_exchange'

      console.error('Exact token exchange error:', tokenResponse.status, oauthError, oauthDescription)
      Sentry.captureException(new Error('Exact token exchange failed'), {
        level: 'error',
        tags: { exact_endpoint: 'exact-callback', oauth_error: oauthError ?? 'onbekend' },
        extra: {
          status: tokenResponse.status,
          oauth_error: oauthError,
          oauth_error_description: oauthDescription,
          body_lengte: responseText.length,
          user_id,
        },
      })
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=${reason}`)
    }

    let tokens: { access_token: string; refresh_token: string; expires_in: number }
    try {
      tokens = JSON.parse(responseText)
    } catch (parseErr) {
      // responseText kan bij een 200 de tokens bevatten → nooit loggen.
      console.error('Exact token exchange: JSON parse failed', parseErr instanceof Error ? parseErr.message : 'parse error', `(${responseText.length} bytes)`)
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=token_parse`)
    }

    // 3. Haal division op via /current/Me
    const meResponse = await fetch(`${EXACT_API_BASE}/current/Me?$select=CurrentDivision`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/json',
      },
      // Eén klein veld ophalen; de gebruiker wacht op de OAuth-redirect.
      signal: AbortSignal.timeout(10_000),
    })

    let division: number | null = null
    if (meResponse.ok) {
      const meData = await meResponse.json() as { d?: { results?: Array<{ CurrentDivision: number }> } }
      division = meData?.d?.results?.[0]?.CurrentDivision ?? null
    } else {
      console.error('Exact /current/Me error:', meResponse.status, await meResponse.text())
    }

    // 4. Sla tokens op in exact_tokens tabel
    const expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { error: upsertError } = await supabase
      .from('exact_tokens')
      .upsert({
        user_id,
        access_token: encryptSecret(tokens.access_token),
        refresh_token: encryptSecret(tokens.refresh_token),
        expires_at,
        division,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('Exact tokens opslaan mislukt:', upsertError)
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=save_tokens`)
    }

    // 5a. Haal default DocumentType voor bijlagen op.
    // Best-effort: ELKE failure (network, 401, lege array, JSON-parse) wordt
    // gezwaluwd zodat de OAuth-flow nooit faalt door deze fetch. Antony kan
    // alsnog handmatig kiezen in Instellingen > Integraties.
    let defaultDocumentType: { id: number; description: string } | null = null
    if (division !== null) {
      try {
        const typesRes = await fetch(
          `${EXACT_API_BASE}/${division}/documents/DocumentTypes?$filter=DocumentIsCreatable eq true&$select=ID,Description,TypeCategory&$orderby=Description`,
          {
            headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
            // Best-effort en al in een try/catch: een timeout laat de
            // OAuth-flow gewoon doorlopen zonder default-documenttype.
            signal: AbortSignal.timeout(10_000),
          },
        )
        if (typesRes.ok) {
          const typesBody = await typesRes.json() as {
            d?: { results?: Array<{ ID: number; Description: string }> }
          }
          const first = typesBody?.d?.results?.[0]
          if (first?.ID && first?.Description) {
            defaultDocumentType = { id: first.ID, description: first.Description }
          }
        } else {
          console.error('Exact DocumentTypes fetch error (non-fatal):', typesRes.status)
        }
      } catch (dtErr) {
        console.error('Exact DocumentTypes fetch failed (non-fatal):', dtErr)
      }
    }

    // 5b. Zet exact_online_connected = true + sla division op als administratie_id
    const settingsUpdate: Record<string, unknown> = { exact_online_connected: true }
    if (division !== null) {
      settingsUpdate.exact_administratie_id = String(division)
    }
    if (defaultDocumentType) {
      settingsUpdate.exact_document_type_id = defaultDocumentType.id
      settingsUpdate.exact_document_type_naam = defaultDocumentType.description
    }

    // First-OAuth-wins voor exact_owner_user_id. Andere medewerkers in dezelfde
    // org kunnen niet zelf opnieuw verbinden zonder de sessie van de eigenaar te
    // invalideren (Exact's single-session-policy per bedrijfsaccount); syncen
    // doen ze met het token van de eigenaar. Het eigenaarschap komt vrij via
    // /api/exact-disconnect, dat de eigenaar of een admin kan aanroepen.
    const orgIdForOwner = await getOrgIdForUser(supabase, user_id)
    if (orgIdForOwner) {
      const { data: existing } = await supabase
        .from('app_settings')
        .select('exact_owner_user_id')
        .eq('organisatie_id', orgIdForOwner)
        .maybeSingle()
      const currentOwner = (existing as { exact_owner_user_id?: string | null } | null)?.exact_owner_user_id
      if (!currentOwner) {
        settingsUpdate.exact_owner_user_id = user_id
      }
    }

    await updateAppSettingsOrgFirst(supabase, user_id, settingsUpdate)

    await logAuditEvent(supabase, {
      organisatie_id: await getOrgIdForUser(supabase, user_id),
      actor_user_id: user_id,
      action: 'integration.exact_connected',
      resource_type: 'integration',
      resource_id: 'exact_online',
      metadata: { division },
      ip: getClientIp(req),
    })

    // 6. Redirect naar instellingen
    return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=connected`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Exact callback error:', message)
    Sentry.captureException(error)
    return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=unknown`)
  }
}
