/**
 * Start de Billit OAuth-koppeling (authorization code flow).
 *
 * GET ?omgeving=sandbox|productie — met Accept: application/json komt {url}
 * terug, anders een redirect. Billit staat API-keys alleen toe voor
 * niet-commerciële eigen integraties, dus doen. koppelt via OAuth met een
 * Client ID/Secret die per omgeving in de env staat (BILLIT_CLIENT_ID,
 * BILLIT_CLIENT_SECRET, BILLIT_SANDBOX_CLIENT_ID, BILLIT_SANDBOX_CLIENT_SECRET).
 *
 * Zelfde opzet als api/exact-auth.ts: HMAC-ondertekende state met TTL,
 * eigenaar-check zodat een collega de koppeling van de eigenaar niet
 * overschrijft, en alleen een admin mag de eerste koppeling leggen.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
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

// Fase 0 van PLAN_PEPPOL_BILLIT.md: de OAuth-paden komen uit de Billit-docs
// (token-endpoint https://api.sandbox.billit.be/OAuth2/token); het
// authorize-pad staat hier op dezelfde basis. Overschrijfbaar via env zodat
// een afwijkend pad geen deploy kost.
const BILLIT_BASE: Record<Omgeving, string> = {
  sandbox: 'https://api.sandbox.billit.be',
  productie: 'https://api.billit.be',
}
type Omgeving = 'sandbox' | 'productie'

function authorizeUrl(omgeving: Omgeving): string {
  return process.env[omgeving === 'sandbox' ? 'BILLIT_SANDBOX_AUTHORIZE_URL' : 'BILLIT_AUTHORIZE_URL'] || `${BILLIT_BASE[omgeving]}/OAuth2/authorize`
}

function clientId(omgeving: Omgeving): string {
  return (omgeving === 'sandbox' ? process.env.BILLIT_SANDBOX_CLIENT_ID : process.env.BILLIT_CLIENT_ID) || ''
}

const STATE_TTL_MS = 60 * 60 * 1000

function stateSecret(): string {
  if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY ontbreekt — kan OAuth-state niet ondertekenen')
  return SUPABASE_SERVICE_KEY
}

// Formaat `${userId}:${omgeving}:${ts}:${sig}`; billit-callback.ts heeft een
// inline kopie van verifyState en moet hiermee in sync blijven.
export function signState(userId: string, omgeving: Omgeving): string {
  const ts = Date.now().toString()
  const sig = createHmac('sha256', stateSecret()).update(`${userId}:${omgeving}:${ts}`).digest('hex').slice(0, 16)
  return `${userId}:${omgeving}:${ts}:${sig}`
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

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

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : ''
  if (!token) throw new Error('Niet geautoriseerd')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

function antwoord(res: VercelResponse, wilJson: boolean, url: string, reason?: string) {
  if (wilJson) {
    return reason ? res.status(400).json({ error: 'Billit-koppeling kon niet starten', reason }) : res.status(200).json({ url })
  }
  return res.redirect(302, url)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const wilJson = (req.headers.accept ?? '').includes('application/json')
  const foutUrl = (reason: string) => `${APP_URL}/instellingen?tab=integraties&billit=error&reason=${reason}`
  try {
    const user_id = await verifyUser(req)
    const omgeving: Omgeving = req.query.omgeving === 'sandbox' ? 'sandbox' : 'productie'

    if (!clientId(omgeving)) {
      return antwoord(res, wilJson, foutUrl('no_credentials'), 'no_credentials')
    }

    const settings = await loadAppSettingsOrgFirst(supabaseAdmin, user_id, 'billit_owner_user_id')
    const eigenaarId = settings?.billit_owner_user_id as string | null | undefined
    if (eigenaarId && eigenaarId !== user_id) {
      return antwoord(res, wilJson, foutUrl('not_owner'), 'not_owner')
    }
    if (!eigenaarId) {
      const { data: profiel } = await supabaseAdmin
        .from('profiles')
        .select('rol')
        .eq('id', user_id)
        .maybeSingle()
      if ((profiel as { rol?: string } | null)?.rol !== 'admin') {
        return antwoord(res, wilJson, foutUrl('not_admin'), 'not_admin')
      }
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId(omgeving),
      redirect_uri: REDIRECT_URI,
      state: signState(user_id, omgeving),
    })
    return antwoord(res, wilJson, `${authorizeUrl(omgeving)}?${params.toString()}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return wilJson ? res.status(401).json({ error: message }) : res.redirect(302, foutUrl('session'))
    }
    console.error('[billit-auth] error:', message)
    Sentry.captureException(err, { tags: { route: 'billit-auth' } })
    return antwoord(res, wilJson, foutUrl('unknown'), 'unknown')
  }
}
