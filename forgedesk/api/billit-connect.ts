/**
 * Billit koppelen met de eigen API-key van de organisatie (Exact-stijl:
 * de klant haalt zelf zijn sleutel op, niets aanvragen bij Billit).
 *
 * POST { api_key?, party_id, omgeving }
 *  → { success, party_id, naam? }
 *
 * Valideert de sleutel tegen /v1/account/accountInformation, slaat hem
 * versleuteld op, zet Billit als actief boekhoudpakket en registreert
 * best-effort de webhook (zelfde als api/billit-callback.ts na OAuth).
 * Zonder api_key wordt de opgeslagen sleutel opnieuw gevalideerd.
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const APP_URL = 'https://app.doen.team'

type Omgeving = 'sandbox' | 'productie'
const BILLIT_BASE: Record<Omgeving, string> = {
  sandbox: 'https://api.sandbox.billit.be',
  productie: 'https://api.billit.be',
}

const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''
function encryptSecret(text: string): string {
  if (!INT_KEY) throw new Error('INTEGRATION_ENCRYPTION_KEY niet geconfigureerd')
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

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

async function upsertAppSettingsOrg(supabase: SupabaseClient, userId: string, orgId: string, updates: Record<string, unknown>): Promise<void> {
  const { data: bestaand } = await supabase.from('app_settings').select('id').eq('organisatie_id', orgId).maybeSingle()
  if (bestaand) {
    const { error } = await supabase.from('app_settings').update(updates).eq('id', (bestaand as { id: string }).id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('app_settings').insert({ ...updates, organisatie_id: orgId, user_id: userId })
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

async function logAuditEvent(supabase: SupabaseClient, event: { organisatie_id?: string | null; actor_user_id?: string | null; actor_email?: string | null; action: string; resource_type?: string; resource_id?: string; metadata?: Record<string, unknown>; ip?: string | null }): Promise<void> {
  try {
    const ipHash = event.ip ? crypto.createHash('sha256').update(event.ip).digest('hex').slice(0, 32) : null
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

function leesNaam(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  for (const k of [b.Name, b.CompanyName, b.PartyName, (b.Party as Record<string, unknown> | undefined)?.Name]) {
    if (typeof k === 'string' && k.trim()) return k.trim()
  }
  return null
}

async function registreerWebhook(base: string, apiKey: string, partyId: string, url: string): Promise<boolean> {
  let gelukt = false
  for (const updateType of ['Created', 'Updated']) {
    try {
      const res = await fetch(`${base}/v1/webhooks`, {
        method: 'POST',
        headers: { apikey: apiKey, partyID: partyId, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ URL: url, EntityType: 'Order', UpdateType: updateType }),
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok) gelukt = true
      else console.warn('[billit-connect] webhook registreren mislukt:', updateType, res.status)
    } catch (err) {
      console.warn('[billit-connect] webhook registreren exception:', updateType, err)
    }
  }
  return gelukt
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)
    const { data: profiel } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id, rol, email')
      .eq('id', user_id)
      .maybeSingle()
    const orgId = (profiel as { organisatie_id?: string } | null)?.organisatie_id
    if (!orgId) return res.status(403).json({ error: 'Geen organisatie gevonden' })
    if ((profiel as { rol?: string } | null)?.rol !== 'admin') {
      return res.status(403).json({ error: 'Alleen admins kunnen een boekhoudkoppeling instellen' })
    }

    const { api_key, party_id, omgeving: omgevingRuw } = req.body as { api_key?: string; party_id?: string; omgeving?: string }
    const omgeving: Omgeving = omgevingRuw === 'sandbox' ? 'sandbox' : 'productie'
    const partyId = (party_id ?? '').trim()
    if (!partyId || !/^[A-Za-z0-9\-]{1,64}$/.test(partyId)) {
      return res.status(400).json({ error: 'Vul het Billit Party ID in (staat in Billit onder Instellingen > API).' })
    }

    let apiKey = (api_key ?? '').trim()
    const isNieuweKey = apiKey.length > 0
    if (!isNieuweKey) {
      const { data: s } = await supabaseAdmin.from('app_settings').select('billit_api_key').eq('organisatie_id', orgId).maybeSingle()
      const opgeslagen = (s as { billit_api_key?: string | null } | null)?.billit_api_key ?? ''
      if (!opgeslagen) return res.status(400).json({ error: 'Geen Billit API-key opgegeven of opgeslagen.' })
      apiKey = decryptSecret(opgeslagen)
    }

    const base = BILLIT_BASE[omgeving]
    const accountRes = await fetch(`${base}/v1/account/accountInformation`, {
      headers: { apikey: apiKey, partyID: partyId, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (accountRes.status === 401 || accountRes.status === 403) {
      return res.status(400).json({ error: 'Billit weigert deze API-key of dit Party ID. Controleer beide in Billit (Instellingen > API) en of je de juiste omgeving hebt gekozen.' })
    }
    if (!accountRes.ok) {
      const tekst = (await accountRes.text()).slice(0, 200)
      console.error('[billit-connect] accountInformation fout:', accountRes.status, tekst)
      return res.status(502).json({ error: `Billit gaf een fout (${accountRes.status}). Probeer het later opnieuw.` })
    }
    const naam = leesNaam(await accountRes.json().catch(() => null))

    const webhookSecret = crypto.randomBytes(24).toString('hex')
    await upsertAppSettingsOrg(supabaseAdmin, user_id, orgId, {
      ...(isNieuweKey ? { billit_api_key: encryptSecret(apiKey) } : {}),
      billit_party_id: partyId,
      billit_omgeving: omgeving,
      billit_owner_user_id: user_id,
      billit_webhook_secret: crypto.createHash('sha256').update(webhookSecret).digest('hex'),
      // Een API-key-koppeling vervangt eventuele oude OAuth-tokens.
      billit_access_token: null,
      billit_refresh_token: null,
      billit_token_expires_at: null,
      boekhoud_pakket: 'billit',
    })

    const webhookUrl = `${APP_URL}/api/billit-webhook?org=${encodeURIComponent(orgId)}&secret=${webhookSecret}`
    const webhookOk = await registreerWebhook(base, apiKey, partyId, webhookUrl)

    await logAuditEvent(supabaseAdmin, {
      organisatie_id: orgId,
      actor_user_id: user_id,
      actor_email: (profiel as { email?: string } | null)?.email ?? null,
      action: 'integration.billit_connected',
      resource_type: 'integration',
      resource_id: 'billit',
      metadata: { omgeving, modus: 'api_key', webhook: webhookOk },
      ip: getClientIp(req),
    })

    return res.status(200).json({ success: true, party_id: partyId, naam, webhook: webhookOk })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[billit-connect] error:', message)
    Sentry.captureException(err, { tags: { route: 'billit-connect' } })
    return res.status(500).json({ error: message })
  }
}
