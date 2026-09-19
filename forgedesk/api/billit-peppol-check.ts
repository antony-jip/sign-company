/**
 * Controleert of een klant bereikbaar is op het Peppol-netwerk en zet de
 * uitkomst op klanten.peppol_status.
 *
 * POST { klant_id } → { peppol_status, identifier }
 *
 * Gaat via GET /v1/peppol/participantInformation/{identifier} van Billit;
 * de organisatie moet dus Billit als boekhoudpakket gekoppeld hebben. De
 * identifier is voor België het ondernemingsnummer uit het btw-nummer, elders
 * het btw-nummer (spiegel van src/lib/peppol.ts). Rate-limited per
 * organisatie: de Peppol-directory is niet de onze.
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
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

async function isRateLimited(key: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', { p_key: key, p_max_count: maxCount, p_window_seconds: windowSeconds })
  if (error) console.error('[billit-peppol-check] check_rate_limit faalde:', error)
  return data === true
}

interface BillitSettings {
  id: string
  boekhoud_pakket: string | null
  billit_access_token: string | null
  billit_refresh_token: string | null
  billit_api_key?: string | null
  billit_client_id?: string | null
  billit_client_secret?: string | null
  billit_token_expires_at: string | null
  billit_party_id: string | null
  billit_omgeving: Omgeving | null
}

// Geeft óf 'apikey:<sleutel>' (eigen API-key van de organisatie, Exact-stijl)
// óf een OAuth-access-token; billitFetch kiest daarop de auth-header.
async function billitAccessToken(supabase: SupabaseClient, s: BillitSettings): Promise<string> {
  const apiKey = decryptSecret(s.billit_api_key ?? '')
  if (apiKey) return `apikey:${apiKey}`
  const huidig = decryptSecret(s.billit_access_token ?? '')
  const verlooptOp = s.billit_token_expires_at ? new Date(s.billit_token_expires_at).getTime() : 0
  if (huidig && verlooptOp > Date.now() + 60_000) return huidig
  const refresh = decryptSecret(s.billit_refresh_token ?? '')
  if (!refresh) throw new Error('Billit-token is verlopen en kan niet ververst worden. Verbind opnieuw via Instellingen > Integraties.')
  const omgeving: Omgeving = s.billit_omgeving === 'sandbox' ? 'sandbox' : 'productie'
  const eigenId = (s.billit_client_id ?? '').trim()
  const eigenSecret = decryptSecret(s.billit_client_secret ?? '')
  const creds = eigenId && eigenSecret ? { id: eigenId, secret: eigenSecret } : clientCredentials(omgeving)
  const res = await fetch(tokenUrl(omgeving), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refresh, client_id: creds.id, client_secret: creds.secret }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error('Billit-token kon niet ververst worden. Verbind opnieuw via Instellingen > Integraties.')
  const tokens = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!tokens.access_token) throw new Error('Billit gaf geen nieuw token terug. Verbind opnieuw via Instellingen > Integraties.')
  await supabase.from('app_settings').update({
    billit_access_token: encryptSecret(tokens.access_token),
    ...(tokens.refresh_token ? { billit_refresh_token: encryptSecret(tokens.refresh_token) } : {}),
    billit_token_expires_at: new Date(Date.now() + Math.max(60, Number(tokens.expires_in ?? 3600) - 60) * 1000).toISOString(),
  }).eq('id', s.id)
  return tokens.access_token
}

function peppolIdentifier(klant: { land?: string | null; btw_nummer?: string | null; kvk_nummer?: string | null; peppol_id?: string | null }): string | null {
  const handmatig = (klant.peppol_id ?? '').trim()
  if (handmatig) return handmatig.includes(':') ? handmatig.split(':').slice(1).join(':') : handmatig
  const land = (klant.land ?? 'NL').trim().toUpperCase()
  const btw = (klant.btw_nummer ?? '').replace(/[\s.\-]/g, '').toUpperCase()
  if (land === 'BE' || land === 'BELGIË' || land === 'BELGIE') {
    const cijfers = btw.replace(/^BE/, '')
    if (/^[01]\d{9}$/.test(cijfers)) return cijfers
    const kvk = (klant.kvk_nummer ?? '').replace(/[\s.\-]/g, '')
    return /^[01]\d{9}$/.test(kvk) ? kvk : null
  }
  // Nederland: KvK (schema 0106) zoals src/lib/peppol.ts, anders het btw-nummer
  const kvk = (klant.kvk_nummer ?? '').replace(/[\s.\-]/g, '')
  if (land === 'NL' && /^\d{8}$/.test(kvk)) return kvk
  return btw || null
}

function leesRegistratie(status: number, body: unknown): 'geregistreerd' | 'niet_geregistreerd' | 'onbekend' {
  if (status === 404) return 'niet_geregistreerd'
  if (status !== 200) return 'onbekend'
  if (Array.isArray(body)) return body.length > 0 ? 'geregistreerd' : 'niet_geregistreerd'
  if (!body || typeof body !== 'object') return 'onbekend'
  const b = body as Record<string, unknown>
  for (const k of ['Registered', 'IsRegistered', 'IsPeppolReceiver', 'PeppolRegistered']) {
    if (b[k] === true) return 'geregistreerd'
    if (b[k] === false) return 'niet_geregistreerd'
  }
  for (const k of ['DocumentTypes', 'Documents', 'SupportedDocumentTypes', 'Services']) {
    if (Array.isArray(b[k])) return (b[k] as unknown[]).length > 0 ? 'geregistreerd' : 'niet_geregistreerd'
  }
  return b.Identifier || b.ParticipantIdentifier ? 'geregistreerd' : 'onbekend'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)
    const { klant_id } = req.body as { klant_id?: string }
    if (!klant_id) return res.status(400).json({ error: 'klant_id is verplicht' })

    const orgId = await getOrgIdForUser(supabaseAdmin, user_id)
    if (!orgId) return res.status(403).json({ error: 'Geen organisatie gevonden' })
    if (await isRateLimited(`peppol-check:${orgId}`, 60, 3600)) {
      return res.status(429).json({ error: 'Te veel Peppol-checks in korte tijd. Probeer het over een uur opnieuw.' })
    }

    const { data: klant } = await supabaseAdmin
      .from('klanten')
      .select('id, land, btw_nummer, kvk_nummer, peppol_id')
      .eq('id', klant_id)
      .eq('organisatie_id', orgId)
      .maybeSingle()
    if (!klant) return res.status(404).json({ error: 'Klant niet gevonden' })

    const identifier = peppolIdentifier(klant)
    if (!identifier) {
      return res.status(400).json({ error: 'Vul eerst het btw-nummer van de klant in (of een Peppol-identifier).' })
    }

    const settings = (await loadAppSettingsOrgFirst(
      supabaseAdmin,
      user_id,
      'id, boekhoud_pakket, billit_access_token, billit_refresh_token, billit_api_key, billit_client_id, billit_client_secret, billit_token_expires_at, billit_party_id, billit_omgeving',
    ) ?? {}) as unknown as BillitSettings
    if (settings.boekhoud_pakket !== 'billit' || (!settings.billit_access_token && !settings.billit_api_key) || !settings.billit_party_id) {
      return res.status(400).json({ error: 'De Peppol-check loopt via Billit. Koppel Billit eerst via Instellingen > Integraties.' })
    }
    const omgeving: Omgeving = settings.billit_omgeving === 'sandbox' ? 'sandbox' : 'productie'
    const token = await billitAccessToken(supabaseAdmin, settings)

    const checkRes = await fetch(`${BILLIT_BASE[omgeving]}/v1/peppol/participantInformation/${encodeURIComponent(identifier)}`, {
      headers: { ...(token.startsWith('apikey:') ? { apikey: token.slice(7) } : { Authorization: `Bearer ${token}` }), partyID: settings.billit_party_id, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (checkRes.status === 401) {
      return res.status(401).json({ error: 'Billit-token is niet meer geldig. Verbind opnieuw via Instellingen > Integraties.' })
    }
    const registratie = leesRegistratie(checkRes.status, await checkRes.json().catch(() => null))
    if (registratie === 'onbekend') {
      console.warn('[billit-peppol-check] onduidelijk antwoord:', checkRes.status)
      return res.status(502).json({ error: `Billit gaf geen bruikbaar antwoord op de Peppol-check (${checkRes.status}).` })
    }

    const gecheckt = new Date().toISOString()
    await supabaseAdmin.from('klanten').update({ peppol_status: registratie, peppol_gecheckt_op: gecheckt }).eq('id', klant.id)

    return res.status(200).json({ peppol_status: registratie, identifier, peppol_gecheckt_op: gecheckt, omgeving })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[billit-peppol-check] error:', message)
    Sentry.captureException(err, { tags: { route: 'billit-peppol-check' } })
    return res.status(500).json({ error: message })
  }
}
