/**
 * Billit-synchronisatie voor elke organisatie met Billit als boekhoudpakket:
 *  1. afleverstatus ophalen van facturen die via Peppol onderweg zijn
 *     (peppol_status in_wachtrij/verzonden → afgeleverd/mislukt);
 *  2. inkomende Peppol-facturen (Billit-orders met OrderDirection Cost)
 *     inlezen in inkoopfacturen, met regels, de originele UBL en een door
 *     doen. gerenderde PDF (Billit maakt voor Peppol-inbox geen PDF).
 *
 * Draait elke 15 minuten (vercel.json) én wordt door api/billit-webhook.ts
 * voor één organisatie aangeroepen zodra Billit een update meldt, met
 * ?org=<id>. Webhook of niet, dit is de bron van waarheid.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET}.
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
    if (!INT_KEY) throw new Error('Server-encryptie is niet geconfigureerd (INTEGRATION_ENCRYPTION_KEY).')
    try {
      const raw = Buffer.from(text.slice(3), 'base64')
      const key = crypto.scryptSync(INT_KEY, raw.subarray(0, 16), 32)
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(16, 28))
      decipher.setAuthTag(raw.subarray(28, 44))
      return Buffer.concat([decipher.update(raw.subarray(44)), decipher.final()]).toString('utf8')
    } catch {
      throw new Error('Integratie-token kan niet ontsleuteld worden (encryptie-key gewijzigd?).')
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

interface BillitSettings {
  id: string
  organisatie_id: string | null
  billit_access_token: string | null
  billit_refresh_token: string | null
  billit_api_key?: string | null
  billit_client_id?: string | null
  billit_client_secret?: string | null
  billit_token_expires_at: string | null
  billit_party_id: string | null
  billit_omgeving: Omgeving | null
  billit_inbox_gesynct_op: string | null
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
  if (!refresh) throw new Error('Billit-token verlopen en geen refresh-token')
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
  if (!res.ok) throw new Error(`Billit-token refresh mislukt (${res.status})`)
  const tokens = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!tokens.access_token) throw new Error('Billit gaf geen nieuw token terug')
  await supabase.from('app_settings').update({
    billit_access_token: encryptSecret(tokens.access_token),
    ...(tokens.refresh_token ? { billit_refresh_token: encryptSecret(tokens.refresh_token) } : {}),
    billit_token_expires_at: new Date(Date.now() + Math.max(60, Number(tokens.expires_in ?? 3600) - 60) * 1000).toISOString(),
  }).eq('id', s.id)
  return tokens.access_token
}

async function billitFetch(base: string, token: string, partyId: string, path: string): Promise<Response> {
  const auth = token.startsWith('apikey:') ? { apikey: token.slice(7) } : { Authorization: `Bearer ${token}` }
  return fetch(`${base}${path}`, {
    headers: { ...auth, partyID: partyId, Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  })
}

// ── Tolerante lezers: de veldnamen van Billit worden in fase 0 tegen de
// sandbox bevestigd; tot die tijd accepteren we de gangbare varianten. ──
type Obj = Record<string, unknown>
function veld(o: unknown, ...namen: string[]): unknown {
  if (!o || typeof o !== 'object') return undefined
  for (const n of namen) {
    const v = (o as Obj)[n]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}
function tekst(o: unknown, ...namen: string[]): string | null {
  const v = veld(o, ...namen)
  return v === undefined ? null : String(v)
}
function getal(o: unknown, ...namen: string[]): number | null {
  const v = veld(o, ...namen)
  if (v === undefined) return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
function datum(o: unknown, ...namen: string[]): string | null {
  const t = tekst(o, ...namen)
  return t ? t.slice(0, 10) : null
}

// Peppol-afleverstatus uit een Billit-order. Alleen expliciete signalen
// veranderen de status; een onbekende waarde laat hem staan.
function peppolStatusUitOrder(order: unknown): 'afgeleverd' | 'mislukt' | 'verzonden' | null {
  // Bewust zonder OrderStatus: dat is de boekhoudstatus (ToSend/Sent/Paid),
  // geen transportstatus, en zou een hangende wachtrij ten onrechte op
  // 'verzonden' zetten.
  const kandidaten = [
    tekst(order, 'PeppolStatus', 'TransportStatus', 'EInvoiceStatus', 'LastSendStatus', 'SendStatus'),
    tekst(veld(order, 'LastTransport', 'Transport'), 'Status', 'TransportStatus'),
  ].filter((s): s is string => !!s).map((s) => s.toLowerCase())
  for (const s of kandidaten) {
    if (/deliver|received|accepted|acknowledg/.test(s)) return 'afgeleverd'
    if (/fail|reject|error|refus|bounce/.test(s)) return 'mislukt'
  }
  for (const s of kandidaten) if (/\b(sent|sending|pending|processing|queued|submitted)\b/.test(s)) return 'verzonden'
  return null
}

async function verwerkOrganisatie(supabase: SupabaseClient, s: BillitSettings): Promise<{ statussen: number; inkomend: number; fouten: string[] }> {
  const fouten: string[] = []
  const orgId = s.organisatie_id
  if (!orgId || !s.billit_party_id) return { statussen: 0, inkomend: 0, fouten: ['geen organisatie of party'] }
  const omgeving: Omgeving = s.billit_omgeving === 'sandbox' ? 'sandbox' : 'productie'
  const base = BILLIT_BASE[omgeving]
  const token = await billitAccessToken(supabase, s)
  const partyId = s.billit_party_id

  // 1. Uitgaand: afleverstatus van facturen die via Peppol onderweg zijn.
  let statussen = 0
  const sinds = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString()
  const { data: onderweg } = await supabase
    .from('facturen')
    .select('id, boekhoud_extern_id, peppol_status')
    .eq('organisatie_id', orgId)
    .eq('boekhoud_pakket', 'billit')
    .in('peppol_status', ['in_wachtrij', 'verzonden', 'mislukt'])
    .gte('updated_at', sinds)
    .limit(100)
  for (const f of (onderweg ?? []) as Array<{ id: string; boekhoud_extern_id: string | null; peppol_status: string }>) {
    if (!f.boekhoud_extern_id) continue
    try {
      const res = await billitFetch(base, token, partyId, `/v1/orders/${encodeURIComponent(f.boekhoud_extern_id)}`)
      if (!res.ok) { fouten.push(`order ${f.boekhoud_extern_id}: ${res.status}`); continue }
      const nieuw = peppolStatusUitOrder(await res.json())
      if (nieuw && nieuw !== f.peppol_status) {
        await supabase.from('facturen').update({ peppol_status: nieuw, ...(nieuw === 'mislukt' ? { peppol_fout: 'Billit meldt dat de Peppol-aflevering is mislukt' } : {}) }).eq('id', f.id)
        statussen++
      }
    } catch (err) {
      fouten.push(`order ${f.boekhoud_extern_id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 2. Inkomend: Cost-orders die we nog niet kennen.
  let inkomend = 0
  const lijstRes = await billitFetch(base, token, partyId, `/v1/orders?$filter=${encodeURIComponent("OrderDirection eq 'Cost'")}&$orderby=${encodeURIComponent('OrderID desc')}&$top=50`)
  if (!lijstRes.ok) {
    fouten.push(`inbox ophalen: ${lijstRes.status}`)
    return { statussen, inkomend, fouten }
  }
  const lijstBody = await lijstRes.json().catch(() => null)
  const lijst = (Array.isArray(lijstBody) ? lijstBody : (veld(lijstBody, 'Items', 'Orders', 'value') as unknown[] | undefined) ?? []) as unknown[]
  const orderIds = lijst.map((o) => tekst(o, 'OrderID', 'OrderId', 'ID')).filter((id): id is string => !!id)
  if (orderIds.length > 0) {
    const { data: bekend } = await supabase
      .from('inkoopfacturen')
      .select('billit_order_id')
      .eq('organisatie_id', orgId)
      .in('billit_order_id', orderIds)
    const bekendeIds = new Set(((bekend ?? []) as Array<{ billit_order_id: string }>).map((r) => r.billit_order_id))
    for (const orderId of orderIds) {
      if (bekendeIds.has(orderId)) continue
      try {
        await verwerkInkomendeOrder(supabase, base, token, partyId, orgId, orderId)
        inkomend++
      } catch (err) {
        fouten.push(`inkomend ${orderId}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  await supabase.from('app_settings').update({ billit_inbox_gesynct_op: new Date().toISOString() }).eq('id', s.id)
  return { statussen, inkomend, fouten }
}

async function haalBestand(base: string, token: string, partyId: string, fileId: string): Promise<{ inhoud: Buffer; mime: string; naam: string } | null> {
  const res = await billitFetch(base, token, partyId, `/v1/files/${encodeURIComponent(fileId)}`)
  if (!res.ok) return null
  const body = await res.json().catch(() => null)
  const b64 = tekst(body, 'FileContent', 'Content', 'Base64')
  if (!b64) return null
  return {
    inhoud: Buffer.from(b64, 'base64'),
    mime: tekst(body, 'MimeType', 'ContentType') ?? 'application/octet-stream',
    naam: tekst(body, 'FileName', 'Name') ?? fileId,
  }
}

async function renderInkoopPdf(o: {
  leverancier: string; nummer: string | null; datum: string | null; vervaldatum: string | null
  subtotaal: number; btw: number; totaal: number
  regels: Array<{ omschrijving: string; aantal: number; eenheidsprijs: number; btw_tarief: number; regel_totaal: number }>
}): Promise<Buffer> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const euro = (n: number) => `€ ${n.toFixed(2).replace('.', ',')}`
  let y = 20
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Inkoopfactuur (ontvangen via Peppol)', 20, y); y += 10
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(`Leverancier: ${o.leverancier}`, 20, y); y += 6
  if (o.nummer) { doc.text(`Factuurnummer: ${o.nummer}`, 20, y); y += 6 }
  if (o.datum) { doc.text(`Factuurdatum: ${o.datum}`, 20, y); y += 6 }
  if (o.vervaldatum) { doc.text(`Vervaldatum: ${o.vervaldatum}`, 20, y); y += 6 }
  y += 6
  doc.setFont('helvetica', 'bold'); doc.text('Omschrijving', 20, y); doc.text('Aantal', 120, y, { align: 'right' }); doc.text('Prijs', 150, y, { align: 'right' }); doc.text('Totaal', 190, y, { align: 'right' }); y += 6
  doc.setFont('helvetica', 'normal')
  for (const r of o.regels) {
    if (y > 270) { doc.addPage(); y = 20 }
    const oms = doc.splitTextToSize(r.omschrijving || '-', 90) as string[]
    doc.text(oms, 20, y)
    doc.text(String(r.aantal), 120, y, { align: 'right' })
    doc.text(euro(r.eenheidsprijs), 150, y, { align: 'right' })
    doc.text(euro(r.regel_totaal), 190, y, { align: 'right' })
    y += 6 * Math.max(1, oms.length)
  }
  y += 6
  doc.text(`Subtotaal excl. btw: ${euro(o.subtotaal)}`, 190, y, { align: 'right' }); y += 6
  doc.text(`Btw: ${euro(o.btw)}`, 190, y, { align: 'right' }); y += 6
  doc.setFont('helvetica', 'bold'); doc.text(`Totaal: ${euro(o.totaal)}`, 190, y, { align: 'right' }); y += 10
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text('Deze weergave is door doen. gemaakt uit de gestructureerde e-factuur (UBL). De originele XML staat naast dit bestand.', 20, y)
  return Buffer.from(doc.output('arraybuffer'))
}

async function verwerkInkomendeOrder(supabase: SupabaseClient, base: string, token: string, partyId: string, orgId: string, orderId: string): Promise<void> {
  const res = await billitFetch(base, token, partyId, `/v1/orders/${encodeURIComponent(orderId)}`)
  if (!res.ok) throw new Error(`order ophalen: ${res.status}`)
  const order = await res.json() as Obj

  // Alleen wat via Peppol binnenkwam; wat de klant zelf in Billit inboekt
  // hoort niet nog eens in de reviewflow van doen. Zonder kanaalveld (fase 0
  // legt de naam vast) laten we het document door.
  const kanaal = tekst(order, 'Transporttype', 'TransportType', 'Source', 'Channel', 'ImportSource', 'Origin')
  if (kanaal && !/peppol/i.test(kanaal)) return

  const supplier = veld(order, 'Supplier', 'Party', 'Customer') as Obj | undefined
  const leverancier = tekst(supplier, 'Name', 'CompanyName') ?? tekst(order, 'SupplierName', 'PartyName') ?? 'Onbekende leverancier'
  const nummer = tekst(order, 'OrderNumber', 'InvoiceNumber', 'Number')
  const factuurDatum = datum(order, 'OrderDate', 'InvoiceDate', 'Date')
  const vervaldatum = datum(order, 'ExpiryDate', 'DueDate')
  const lijnen = ((veld(order, 'OrderLines', 'Lines') as unknown[] | undefined) ?? []).map((l, i) => {
    const aantal = getal(l, 'Quantity') ?? 1
    const eenheidsprijs = getal(l, 'UnitPriceExcl', 'UnitPrice') ?? 0
    const regelTotaal = getal(l, 'TotalExcl', 'LineTotalExcl', 'TotalPriceExcl') ?? Math.round(aantal * eenheidsprijs * 100) / 100
    return {
      volgorde: i,
      omschrijving: tekst(l, 'Description', 'Name') ?? '',
      aantal,
      eenheidsprijs,
      btw_tarief: getal(l, 'VATPercentage', 'VATPercent', 'VAT') ?? 21,
      regel_totaal: regelTotaal,
    }
  })
  // Een inkomende creditnota verlaagt wat we de leverancier schuldig zijn:
  // negatief opslaan, zoals doen. creditregels zelf ook negatief bewaart.
  const isCreditnota = /credit/i.test(tekst(order, 'OrderType', 'DocumentType') ?? '')
  const teken = isCreditnota ? -1 : 1
  for (const l of lijnen) {
    l.eenheidsprijs = Math.abs(l.eenheidsprijs) * teken
    l.regel_totaal = Math.abs(l.regel_totaal) * teken
  }
  const subtotaal = teken * Math.abs(getal(order, 'TotalExcl', 'AmountExcl', 'TotalExclVAT') ?? Math.round(lijnen.reduce((s, l) => s + Math.abs(l.regel_totaal), 0) * 100) / 100)
  const totaal = teken * Math.abs(getal(order, 'TotalIncl', 'AmountIncl', 'TotalInclVAT') ?? Math.abs(subtotaal))
  const btw = teken * Math.abs(getal(order, 'TotalVAT', 'VATAmount', 'TotalVat') ?? Math.round((Math.abs(totaal) - Math.abs(subtotaal)) * 100) / 100)

  const fileId = crypto.randomUUID()
  let pdfPad: string | null = null
  let ublPad: string | null = null

  // Billit levert bij Peppol-inbox de originele UBL en geen PDF; als er tóch
  // een PDF hangt (bv. een leverancier die hem als bijlage meestuurt) nemen we die.
  const bestandIds = [
    tekst(veld(order, 'OrderPDF', 'OrderPdf'), 'FileID', 'FileId'),
    ...(((veld(order, 'Attachments', 'Files') as unknown[] | undefined) ?? []).map((a) => tekst(a, 'FileID', 'FileId'))),
  ].filter((id): id is string => !!id)
  for (const id of bestandIds) {
    const bestand = await haalBestand(base, token, partyId, id)
    if (!bestand) continue
    const isPdf = bestand.mime.includes('pdf') || bestand.naam.toLowerCase().endsWith('.pdf')
    const isXml = bestand.mime.includes('xml') || bestand.naam.toLowerCase().endsWith('.xml')
    if (isPdf && !pdfPad) {
      pdfPad = `${orgId}/${fileId}.pdf`
      const { error } = await supabase.storage.from('inkoopfacturen').upload(pdfPad, bestand.inhoud, { contentType: 'application/pdf', upsert: false })
      if (error) { pdfPad = null; console.warn('[billit-inbox] pdf upload mislukt:', error.message) }
    } else if (isXml && !ublPad) {
      ublPad = `${orgId}/${fileId}.xml`
      const { error } = await supabase.storage.from('inkoopfacturen').upload(ublPad, bestand.inhoud, { contentType: 'application/xml', upsert: false })
      if (error) { ublPad = null; console.warn('[billit-inbox] ubl upload mislukt:', error.message) }
    }
  }
  if (!pdfPad) {
    pdfPad = `${orgId}/${fileId}.pdf`
    const pdf = await renderInkoopPdf({ leverancier, nummer, datum: factuurDatum, vervaldatum, subtotaal, btw, totaal, regels: lijnen })
    const { error } = await supabase.storage.from('inkoopfacturen').upload(pdfPad, pdf, { contentType: 'application/pdf', upsert: false })
    if (error) throw new Error(`pdf opslaan: ${error.message}`)
  }

  const { data: rij, error: insertError } = await supabase
    .from('inkoopfacturen')
    .insert({
      organisatie_id: orgId,
      bron: 'peppol',
      billit_order_id: orderId,
      leverancier_naam: leverancier,
      factuur_nummer: nummer,
      factuur_datum: factuurDatum,
      vervaldatum,
      subtotaal,
      btw_bedrag: btw,
      totaal,
      valuta: tekst(order, 'Currency', 'CurrencyCode') ?? 'EUR',
      pdf_storage_path: pdfPad,
      ubl_storage_path: ublPad,
      email_van: tekst(supplier, 'Email') ?? null,
      email_ontvangen_op: tekst(order, 'Created', 'CreatedDate', 'LastModified') ?? new Date().toISOString(),
      status: 'nieuw',
      extractie_vertrouwen: 'hoog',
      extractie_opmerkingen: `Gestructureerde e-factuur via Peppol (Billit)${isCreditnota ? ' · creditnota' : ''}; geen AI-extractie nodig.`,
      raw_extractie_json: order,
    })
    .select('id')
    .single()
  if (insertError) {
    // 23505: webhook en cron waren tegelijk bezig; de ander heeft hem al.
    if (insertError.code === '23505') return
    throw new Error(`insert: ${insertError.message}`)
  }
  if (lijnen.length > 0) {
    const { error: regelsError } = await supabase
      .from('inkoopfactuur_regels')
      .insert(lijnen.map((l) => ({ ...l, inkoopfactuur_id: (rij as { id: string }).id })))
    if (regelsError) console.warn('[billit-inbox] regels opslaan mislukt:', regelsError.message)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const alleenOrg = typeof req.query.org === 'string' ? req.query.org : null

  // Een claim die nooit is afgerond (functie gestorven of timeout na
  // in_wachtrij) mag de factuur niet blokkeren: na 30 minuten terug naar
  // 'mislukt'. Voor álle organisaties, ook die zonder Billit die via
  // api/peppol-verzend-xml versturen.
  await supabase
    .from('facturen')
    .update({ peppol_status: 'mislukt', peppol_fout: 'Peppol-verzending is niet afgerond; probeer opnieuw' })
    .eq('peppol_status', 'in_wachtrij')
    .lt('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
  let query = supabase
    .from('app_settings')
    .select('id, organisatie_id, billit_access_token, billit_refresh_token, billit_api_key, billit_client_id, billit_client_secret, billit_token_expires_at, billit_party_id, billit_omgeving, billit_inbox_gesynct_op')
    .eq('boekhoud_pakket', 'billit')
    .or('billit_access_token.not.is.null,billit_api_key.not.is.null')
  if (alleenOrg) query = query.eq('organisatie_id', alleenOrg)
  const { data: rijen, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const resultaat: Record<string, unknown> = {}
  for (const s of (rijen ?? []) as BillitSettings[]) {
    try {
      resultaat[s.organisatie_id ?? s.id] = await verwerkOrganisatie(supabase, s)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      resultaat[s.organisatie_id ?? s.id] = { fout: message }
      console.error('[billit-inbox] organisatie mislukt:', s.organisatie_id, message)
      Sentry.captureException(err, { tags: { route: 'cron-billit-inbox' }, extra: { organisatie_id: s.organisatie_id } })
    }
  }
  return res.status(200).json({ ok: true, organisaties: Object.keys(resultaat).length, resultaat })
}
