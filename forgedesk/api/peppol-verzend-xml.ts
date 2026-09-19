/**
 * Peppol-verzending zonder Billit-boekhouding: doen. stuurt de eigen UBL
 * (src/services/ublService.ts, Peppol BIS 3.0) via het Billit-access-point-
 * account van doen. zelf. Voor organisaties die in Exact/Moneybird boekhouden
 * maar wél via Peppol willen factureren. Fase 5 van PLAN_PEPPOL_BILLIT.md;
 * in de UI achter feature flag `peppol_accesspoint` (docs/feature-flags.md).
 *
 * POST { factuur_id, ubl_xml } → { peppol_status, waarschuwing? }
 *
 * Env: BILLIT_ACCESSPOINT_API_KEY, BILLIT_ACCESSPOINT_PARTY_ID en optioneel
 * BILLIT_ACCESSPOINT_BASE (default https://api.billit.be). De XML komt van de
 * client omdat api/ niets uit src/ mag importeren; de route controleert dat de
 * factuur van de organisatie is en dat het factuurnummer in de XML klopt.
 * Billit valideert de UBL tegen de Peppol-regels en weigert bij afwijking.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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

const AP_BASE = process.env.BILLIT_ACCESSPOINT_BASE || 'https://api.billit.be'
const AP_API_KEY = process.env.BILLIT_ACCESSPOINT_API_KEY || ''
const AP_PARTY_ID = process.env.BILLIT_ACCESSPOINT_PARTY_ID || ''

const MAX_XML_BYTES = 512 * 1024

async function getOrgIdForUser(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()
  return ((data as { organisatie_id?: string } | null)?.organisatie_id) ?? null
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
  if (error) console.error('[peppol-verzend-xml] check_rate_limit faalde:', error)
  return data === true
}

function apFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${AP_BASE}${path}`, {
    ...init,
    headers: {
      apikey: AP_API_KEY,
      partyID: AP_PARTY_ID,
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(25_000),
  })
}

function xmlTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`))
  return m ? m[1].trim() : null
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
    if (!AP_API_KEY || !AP_PARTY_ID) {
      return res.status(503).json({ error: 'Peppol-verzending via doen. is nog niet ingericht (access-point-credentials ontbreken).' })
    }
    const user_id = await verifyUser(req)
    const { factuur_id, ubl_xml } = req.body as { factuur_id?: string; ubl_xml?: string }
    if (!factuur_id || typeof ubl_xml !== 'string' || !ubl_xml.trim()) {
      return res.status(400).json({ error: 'factuur_id en ubl_xml zijn verplicht' })
    }
    if (Buffer.byteLength(ubl_xml, 'utf8') > MAX_XML_BYTES) {
      return res.status(413).json({ error: 'UBL is te groot' })
    }
    if (!/^\s*<\?xml/.test(ubl_xml) || !/<(Invoice|CreditNote)[\s>]/.test(ubl_xml)) {
      return res.status(400).json({ error: 'ubl_xml is geen UBL-factuur' })
    }

    const orgId = await getOrgIdForUser(supabaseAdmin, user_id)
    if (!orgId) return res.status(403).json({ error: 'Geen organisatie gevonden' })
    if (await isRateLimited(`peppol-xml:${orgId}`, 120, 3600)) {
      return res.status(429).json({ error: 'Te veel Peppol-verzendingen in korte tijd. Probeer het over een uur opnieuw.' })
    }

    const { data: factuur } = await supabaseAdmin
      .from('facturen')
      .select('id, nummer, klant_id, peppol_status')
      .eq('id', factuur_id)
      .eq('organisatie_id', orgId)
      .maybeSingle()
    if (!factuur) return res.status(404).json({ error: 'Factuur niet gevonden of geen toegang.' })
    if (factuur.peppol_status === 'verzonden' || factuur.peppol_status === 'afgeleverd') {
      return res.status(200).json({ peppol_status: factuur.peppol_status, waarschuwing: 'Deze factuur is al via Peppol verstuurd.' })
    }
    if (xmlTag(ubl_xml, 'cbc:ID') !== String(factuur.nummer)) {
      return res.status(400).json({ error: 'Het factuurnummer in de UBL komt niet overeen met de factuur.' })
    }

    // Ontvanger: de tweede EndpointID in de UBL is die van de klant.
    const endpoints = [...ubl_xml.matchAll(/<cbc:EndpointID schemeID="(\d{4})">([^<]+)<\/cbc:EndpointID>/g)].map((m) => ({ schema: m[1], id: m[2].trim() }))
    if (endpoints.length < 2) {
      await supabaseAdmin.from('facturen').update({ peppol_status: 'niet_verzonden', peppol_fout: 'Geen Peppol-identifier voor leverancier en klant in de UBL' }).eq('id', factuur.id)
      return res.status(200).json({ peppol_status: 'niet_verzonden', waarschuwing: 'Vul het KvK-/btw-nummer van je bedrijf en van de klant in; zonder Peppol-identifier is de factuur niet af te leveren.' })
    }
    const ontvanger = endpoints[1]

    const checkRes = await apFetch(`/v1/peppol/participantInformation/${encodeURIComponent(ontvanger.id)}`)
    const registratie = leesRegistratie(checkRes.status, await checkRes.json().catch(() => null))
    if (factuur.klant_id && registratie !== 'onbekend') {
      await supabaseAdmin.from('klanten').update({ peppol_status: registratie, peppol_gecheckt_op: new Date().toISOString() }).eq('id', factuur.klant_id).eq('organisatie_id', orgId)
    }
    if (registratie === 'niet_geregistreerd') {
      await supabaseAdmin.from('facturen').update({ peppol_status: 'niet_verzonden', peppol_fout: 'Klant is niet geregistreerd op het Peppol-netwerk' }).eq('id', factuur.id)
      return res.status(200).json({ peppol_status: 'niet_verzonden', waarschuwing: 'De klant is niet geregistreerd op Peppol; verstuur de factuur per e-mail.' })
    }

    await supabaseAdmin.from('facturen').update({ peppol_status: 'in_wachtrij', peppol_fout: null }).eq('id', factuur.id)
    const sendRes = await apFetch('/v1/peppol/sendXml', {
      method: 'POST',
      body: JSON.stringify({ XML: ubl_xml, FileName: `factuur-${factuur.nummer}.xml` }),
    })
    if (!sendRes.ok) {
      const tekst = (await sendRes.text()).slice(0, 300)
      const fout = `Access point weigerde de UBL (${sendRes.status}). ${tekst}`.trim()
      await supabaseAdmin.from('facturen').update({ peppol_status: 'mislukt', peppol_fout: fout.slice(0, 500) }).eq('id', factuur.id)
      Sentry.captureMessage('Peppol sendXml mislukt', { level: 'warning', extra: { factuur_id, status: sendRes.status } })
      return res.status(200).json({ peppol_status: 'mislukt', waarschuwing: fout })
    }
    const body = await sendRes.json().catch(() => null) as Record<string, unknown> | null
    const berichtId = body && (body.OrderID ?? body.MessageID ?? body.ID)
    await supabaseAdmin.from('facturen').update({
      peppol_status: 'verzonden',
      peppol_verzonden_op: new Date().toISOString(),
      peppol_fout: null,
      ...(berichtId != null ? { peppol_bericht_id: String(berichtId) } : {}),
    }).eq('id', factuur.id)

    return res.status(200).json({ peppol_status: 'verzonden' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[peppol-verzend-xml] error:', message)
    Sentry.captureException(err, { tags: { route: 'peppol-verzend-xml' } })
    return res.status(500).json({ error: message })
  }
}
