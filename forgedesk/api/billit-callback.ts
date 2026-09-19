/**
 * OAuth-callback van Billit: wisselt de code in voor tokens, haalt het
 * PartyID op, slaat alles versleuteld op in app_settings en zet Billit als
 * actief boekhoudpakket. Registreert daarna best-effort een webhook zodat
 * Peppol-statussen en inkomende facturen binnenkomen; de cron
 * (api/cron-billit-inbox.ts) is de vangnet-route als dat niet lukt.
 *
 * Spiegel van api/exact-callback.ts.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto, { createHmac } from 'crypto'
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const APP_URL = 'https://app.doen.team'
const REDIRECT_URI = `${APP_URL}/api/billit-callback`

type Omgeving = 'sandbox' | 'productie'
const BILLIT_BASE: Record<Omgeving, string> = {
  sandbox: 'https://api.sandbox.billit.be',
  productie: 'https://api.billit.be',
}
function tokenUrl(omgeving: Omgeving): string {
  return process.env[omgeving === 'sandbox' ? 'BILLIT_SANDBOX_TOKEN_URL' : 'BILLIT_TOKEN_URL'] || `${BILLIT_BASE[omgeving]}/OAuth2/token`
}
function clientCredentials(omgeving: Omgeving): { id: string; secret: string } {
  return omgeving === 'sandbox'
    ? { id: process.env.BILLIT_SANDBOX_CLIENT_ID || '', secret: process.env.BILLIT_SANDBOX_CLIENT_SECRET || '' }
    : { id: process.env.BILLIT_CLIENT_ID || '', secret: process.env.BILLIT_CLIENT_SECRET || '' }
}

// -- Integration credential encryption (copied from api/save-integration-settings.ts) --
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

// Inline kopie van signState uit billit-auth.ts; formaat
// `${userId}:${omgeving}:${ts}:${sig}` met dezelfde TTL.
const STATE_TTL_MS = 60 * 60 * 1000
function verifyState(state: string): { userId: string; omgeving: Omgeving } | null {
  if (!SUPABASE_SERVICE_KEY) return null
  const parts = state.split(':')
  if (parts.length !== 4) return null
  const [userId, omgeving, ts, sig] = parts
  if (omgeving !== 'sandbox' && omgeving !== 'productie') return null
  const expected = createHmac('sha256', SUPABASE_SERVICE_KEY).update(`${userId}:${omgeving}:${ts}`).digest('hex').slice(0, 16)
  if (sig !== expected) return null
  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum) || Date.now() - tsNum > STATE_TTL_MS || tsNum > Date.now() + 60_000) return null
  return { userId, omgeving }
}

const REASON_PER_OAUTH_FOUT: Record<string, string> = {
  invalid_client: 'oauth_client',
  unauthorized_client: 'oauth_client',
  invalid_grant: 'oauth_grant',
  invalid_request: 'oauth_verzoek',
  invalid_scope: 'oauth_verzoek',
  unsupported_grant_type: 'oauth_verzoek',
}

async function getOrgIdForUser(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()
  return ((data as { organisatie_id?: string } | null)?.organisatie_id) ?? null
}

// app_settings wordt niet bij signup aangemaakt; zonder insert-pad zou een
// eerste koppeling stil 0 rijen raken. Zelfde aanpak als save-integration-settings.
async function upsertAppSettingsOrg(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const { data: bestaand } = await supabase
    .from('app_settings')
    .select('id')
    .eq('organisatie_id', orgId)
    .maybeSingle()
  if (bestaand) {
    const { error } = await supabase.from('app_settings').update(updates).eq('id', (bestaand as { id: string }).id)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('app_settings')
    .insert({ ...updates, organisatie_id: orgId, user_id: userId })
  if (error?.code === '23505') {
    const { error: e2 } = await supabase.from('app_settings').update(updates).eq('organisatie_id', orgId)
    if (e2) throw e2
  } else if (error) {
    throw error
  }
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

// Billit's accountInformation geeft het PartyID terug; de exacte vorm
// (los veld of geneste Party) wordt in fase 0 tegen de sandbox bevestigd,
// vandaar de tolerante lezer.
function leesPartyId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const kandidaten = [b.PartyID, b.partyID, b.PartyId, (b.Party as Record<string, unknown> | undefined)?.PartyID]
  for (const k of kandidaten) {
    if (typeof k === 'number' || (typeof k === 'string' && k.trim())) return String(k)
  }
  return null
}

async function registreerWebhook(base: string, accessToken: string, partyId: string, url: string): Promise<boolean> {
  // Eén registratie per update-type; Billit adviseert altijd een UpdateType
  // mee te geven. Mislukt dit, dan vangt de cron het op.
  let gelukt = false
  for (const updateType of ['Created', 'Updated']) {
    try {
      const res = await fetch(`${base}/v1/webhooks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          partyID: partyId,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ URL: url, EntityType: 'Order', UpdateType: updateType }),
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok) gelukt = true
      else console.warn('[billit-callback] webhook registreren mislukt:', updateType, res.status, (await res.text()).slice(0, 200))
    } catch (err) {
      console.warn('[billit-callback] webhook registreren exception:', updateType, err)
    }
  }
  return gelukt
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const foutUrl = (reason: string) => `${APP_URL}/instellingen?tab=integraties&billit=error&reason=${reason}`
  try {
    const code = req.query.code as string
    const state = req.query.state as string
    if (typeof req.query.error === 'string') {
      return res.redirect(302, foutUrl(REASON_PER_OAUTH_FOUT[req.query.error] ?? 'oauth_geweigerd'))
    }
    if (!code || !state) return res.redirect(302, foutUrl('missing_params'))

    const geverifieerd = verifyState(state)
    if (!geverifieerd) return res.redirect(302, foutUrl('invalid_state'))
    const { userId, omgeving } = geverifieerd

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const orgId = await getOrgIdForUser(supabase, userId)
    if (!orgId) return res.redirect(302, foutUrl('no_org'))

    const creds = clientCredentials(omgeving)
    if (!creds.id || !creds.secret) return res.redirect(302, foutUrl('no_credentials'))

    // Billit verwacht de token-body als JSON (zie docs: grant_type, code,
    // client_id, client_secret, redirect_uri).
    const tokenResponse = await fetch(tokenUrl(omgeving), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: creds.id,
        client_secret: creds.secret,
        redirect_uri: REDIRECT_URI,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!tokenResponse.ok) {
      const tekst = await tokenResponse.text()
      console.error('[billit-callback] token exchange mislukt:', tokenResponse.status, tekst.slice(0, 300))
      let reason = 'token_exchange'
      try {
        const fout = JSON.parse(tekst) as { error?: string }
        if (fout.error && REASON_PER_OAUTH_FOUT[fout.error]) reason = REASON_PER_OAUTH_FOUT[fout.error]
      } catch { /* geen JSON */ }
      return res.redirect(302, foutUrl(reason))
    }
    const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
    if (!tokens.access_token) return res.redirect(302, foutUrl('token_exchange'))

    const base = BILLIT_BASE[omgeving]
    const accountRes = await fetch(`${base}/v1/account/accountInformation`, {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    const partyId = accountRes.ok ? leesPartyId(await accountRes.json().catch(() => null)) : null
    if (!partyId) {
      console.error('[billit-callback] PartyID niet gevonden, status', accountRes.status)
      return res.redirect(302, foutUrl('no_party'))
    }

    const webhookSecret = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + Math.max(60, Number(tokens.expires_in ?? 3600) - 60) * 1000).toISOString()

    await upsertAppSettingsOrg(supabase, userId, orgId, {
      billit_access_token: encryptSecret(tokens.access_token),
      billit_refresh_token: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
      billit_token_expires_at: expiresAt,
      billit_party_id: partyId,
      billit_omgeving: omgeving,
      billit_owner_user_id: userId,
      // Alleen de hash in de database: app_settings komt via select('*') bij elke org-gebruiker.
      billit_webhook_secret: crypto.createHash('sha256').update(webhookSecret).digest('hex'),
      boekhoud_pakket: 'billit',
    })

    const webhookUrl = `${APP_URL}/api/billit-webhook?org=${encodeURIComponent(orgId)}&secret=${webhookSecret}`
    const webhookOk = await registreerWebhook(base, tokens.access_token, partyId, webhookUrl)

    const { data: profiel } = await supabase.from('profiles').select('email').eq('id', userId).maybeSingle()
    await logAuditEvent(supabase, {
      organisatie_id: orgId,
      actor_user_id: userId,
      actor_email: (profiel as { email?: string } | null)?.email ?? null,
      action: 'integration.billit_connected',
      resource_type: 'integration',
      resource_id: 'billit',
      metadata: { omgeving, webhook: webhookOk },
      ip: getClientIp(req),
    })

    return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&billit=connected${webhookOk ? '' : '&webhook=mislukt'}`)
  } catch (err) {
    console.error('[billit-callback] error:', err)
    Sentry.captureException(err, { tags: { route: 'billit-callback' } })
    return res.redirect(302, foutUrl('unknown'))
  }
}
