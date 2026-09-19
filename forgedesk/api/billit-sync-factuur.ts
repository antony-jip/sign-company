/**
 * Boekt een factuur in Billit en verstuurt hem optioneel via Peppol.
 *
 * POST { factuur_id, peppol?: boolean }
 *  → { success, extern_id, peppol_status?, waarschuwing? }
 *
 * Zelfde patroon als api/moneybird-sync-factuur.ts: org-scoped ophalen,
 * regels valideren, één order per factuur (boekhoud_extern_id = Billit
 * OrderID, met .is()-guard tegen races). Peppol is een tweede stap op een
 * bestaande order, dus een factuur die al in Billit staat kan later alsnog
 * via Peppol de deur uit.
 *
 * Billit-API (fase 0 van PLAN_PEPPOL_BILLIT.md verifieert de veldnamen tegen
 * de sandbox):
 *   POST /v1/orders                              → OrderID
 *   GET  /v1/peppol/participantInformation/{id}  → is de ontvanger bereikbaar
 *   POST /v1/orders/commands/send                → { Transporttype, OrderIDs }
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

interface BillitSettings {
  id: string
  boekhoud_pakket: string | null
  billit_access_token: string | null
  billit_refresh_token: string | null
  billit_token_expires_at: string | null
  billit_party_id: string | null
  billit_omgeving: Omgeving | null
  peppol_verzenden_standaard: boolean | null
}
const BILLIT_KOLOMMEN = 'id, boekhoud_pakket, billit_access_token, billit_refresh_token, billit_token_expires_at, billit_party_id, billit_omgeving, peppol_verzenden_standaard'

// Geeft een geldig access token; ververst hem een minuut vóór het verlopen
// en schrijft het nieuwe paar terug. Inline in elk Billit-bestand (api/ deelt
// geen helpers).
async function billitAccessToken(supabase: SupabaseClient, s: BillitSettings): Promise<string> {
  const huidig = decryptSecret(s.billit_access_token ?? '')
  const verlooptOp = s.billit_token_expires_at ? new Date(s.billit_token_expires_at).getTime() : 0
  if (huidig && verlooptOp > Date.now() + 60_000) return huidig
  const refresh = decryptSecret(s.billit_refresh_token ?? '')
  if (!refresh) throw new Error('Billit-token is verlopen en kan niet ververst worden. Verbind opnieuw via Instellingen > Integraties.')
  const omgeving: Omgeving = s.billit_omgeving === 'sandbox' ? 'sandbox' : 'productie'
  const creds = clientCredentials(omgeving)
  const res = await fetch(tokenUrl(omgeving), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refresh, client_id: creds.id, client_secret: creds.secret }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    console.error('[billit] token refresh mislukt:', res.status, (await res.text()).slice(0, 200))
    throw new Error('Billit-token kon niet ververst worden. Verbind opnieuw via Instellingen > Integraties.')
  }
  const tokens = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!tokens.access_token) throw new Error('Billit gaf geen nieuw token terug. Verbind opnieuw via Instellingen > Integraties.')
  await supabase.from('app_settings').update({
    billit_access_token: encryptSecret(tokens.access_token),
    ...(tokens.refresh_token ? { billit_refresh_token: encryptSecret(tokens.refresh_token) } : {}),
    billit_token_expires_at: new Date(Date.now() + Math.max(60, Number(tokens.expires_in ?? 3600) - 60) * 1000).toISOString(),
  }).eq('id', s.id)
  return tokens.access_token
}

async function billitFetch(base: string, token: string, partyId: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      partyID: partyId,
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    // De order-POST is schrijvend; een te vroege abort laat in het ongewisse
    // of de order toch bestaat, dus ruim (zelfde afweging als Moneybird).
    signal: AbortSignal.timeout(25_000),
  })
}

function leesOrderId(body: unknown): string | null {
  if (typeof body === 'number' || (typeof body === 'string' && body.trim())) return String(body).trim()
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    for (const k of [b.OrderID, b.orderID, b.OrderId, b.ID, b.id]) {
      if (typeof k === 'number' || (typeof k === 'string' && k.trim())) return String(k)
    }
  }
  return null
}

// Peppol-identifier zonder schema, zoals participantInformation hem wil:
// België het 10-cijferige ondernemingsnummer, elders het btw-nummer.
// Spiegel van src/lib/peppol.ts.
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

interface FactuurItemRij {
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  totaal: number
}

export interface BillitOrderInvoer {
  nummer: string
  factuurdatum?: string | null
  vervaldatum?: string | null
  klant_referentie?: string | null
  isCredit: boolean
  klantNaam: string
  klant: {
    btw_nummer?: string | null
    email?: string | null
    telefoon?: string | null
    debiteurennummer?: string | null
    adres?: string | null
    stad?: string | null
    postcode?: string | null
    land?: string | null
  } | null
  items: FactuurItemRij[]
}

// Per regel: UnitPriceExcl = regeltotaal met Quantity 1, zodat het geboekte
// bedrag exact gelijk is aan doen.'s totaal ondanks korting en afronding
// (zelfde truc als Moneybird/Exact). Creditnota's gaan met positieve bedragen
// op een CreditNote. Geëxporteerd voor tests/api/billitPayload.test.ts.
export function bouwBillitOrder(invoer: BillitOrderInvoer): Record<string, unknown> {
  const rond2 = (n: number) => Math.round(n * 100) / 100
  const { klant, klantNaam, isCredit } = invoer
  // klanten.land is sinds migratie 252 een ISO-code, oudere rijen kunnen
  // nog een naam bevatten (spiegel van landNaarIso in src/lib/landen.ts).
  const landRuw = (klant?.land ?? '').trim().toLowerCase()
  const landCode = !landRuw || ['nederland', 'netherlands', 'nl'].includes(landRuw) ? 'NL'
    : ['belgië', 'belgie', 'belgium', 'be'].includes(landRuw) ? 'BE'
    : ['duitsland', 'germany', 'deutschland', 'de'].includes(landRuw) ? 'DE'
    : /^[a-z]{2}$/.test(landRuw) ? landRuw.toUpperCase() : 'NL'
  return {
    OrderType: isCredit ? 'CreditNote' : 'Invoice',
    OrderDirection: 'Income',
    OrderNumber: invoer.nummer,
    OrderDate: String(invoer.factuurdatum ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    ...(invoer.vervaldatum && !isCredit ? { ExpiryDate: String(invoer.vervaldatum).slice(0, 10) } : {}),
    ...(invoer.klant_referentie ? { OrderReference: String(invoer.klant_referentie) } : {}),
    Customer: {
      Name: klantNaam,
      PartyType: 'Customer',
      ...(klant?.btw_nummer ? { VATNumber: String(klant.btw_nummer).replace(/[\s.\-]/g, '').toUpperCase() } : {}),
      ...(klant?.email ? { Email: klant.email } : {}),
      ...(klant?.telefoon ? { Phone: klant.telefoon } : {}),
      ...(klant?.debiteurennummer ? { Nr: String(klant.debiteurennummer) } : {}),
      Language: 'NL',
      Addresses: [{
        AddressType: 'InvoiceAddress',
        Name: klantNaam,
        Street: klant?.adres || '',
        City: klant?.stad || '',
        Zipcode: klant?.postcode || '',
        CountryCode: landCode,
      }],
    },
    // Echte aantallen en stuksprijs als die exact op het regeltotaal
    // uitkomen (de ontvanger ziet dan dezelfde regel als op de PDF); bij
    // korting of afrondingsverschil de 1×-truc, dan blijft het bedrag leidend.
    OrderLines: invoer.items.map((item) => {
      const totaal = rond2(isCredit ? Math.abs(item.totaal) : item.totaal)
      const aantal = Math.abs(Number(item.aantal ?? 1))
      const prijs = Math.abs(Number(item.eenheidsprijs ?? 0))
      const exact = !(item.korting_percentage > 0) && aantal > 0 && rond2(aantal * prijs) === totaal
      return {
        Quantity: exact ? aantal : 1,
        UnitPriceExcl: exact ? prijs : totaal,
        Description: [
          item.beschrijving,
          !exact && typeof item.aantal === 'number' && item.aantal !== 1 ? `(${item.aantal} × €${Number(item.eenheidsprijs ?? 0).toFixed(2)})` : null,
          item.korting_percentage > 0 ? `(${item.korting_percentage}% korting)` : null,
        ].filter(Boolean).join(' '),
        VATPercentage: item.btw_percentage,
      }
    }),
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let peppolGeclaimd: string | null = null
  try {
    const user_id = await verifyUser(req)
    const { factuur_id, peppol } = req.body as { factuur_id?: string; peppol?: boolean }
    if (!factuur_id) return res.status(400).json({ error: 'factuur_id is verplicht' })

    const orgId = await getOrgIdForUser(supabaseAdmin, user_id)
    let factuurQuery = supabaseAdmin.from('facturen').select('*').eq('id', factuur_id)
    factuurQuery = orgId ? factuurQuery.eq('organisatie_id', orgId) : factuurQuery.eq('user_id', user_id)
    const { data: factuur, error: factuurError } = await factuurQuery.maybeSingle()
    if (factuurError || !factuur) return res.status(404).json({ error: 'Factuur niet gevonden of geen toegang.' })

    if (factuur.boekhoud_extern_id && factuur.boekhoud_pakket && factuur.boekhoud_pakket !== 'billit') {
      return res.status(409).json({ error: 'Deze factuur is al gesynchroniseerd met een ander boekhoudpakket.' })
    }

    const { data: factuurItems, error: itemsError } = await supabaseAdmin
      .from('factuur_items')
      .select('beschrijving, aantal, eenheidsprijs, btw_percentage, korting_percentage, totaal')
      .eq('factuur_id', factuur_id)
      .order('volgorde', { ascending: true })
    if (itemsError || !factuurItems || factuurItems.length === 0) {
      return res.status(400).json({ error: 'Factuur heeft geen regels om te synchroniseren.' })
    }
    const items = factuurItems as FactuurItemRij[]

    const ongeldigeIndex = items.findIndex(
      (i) => typeof i.totaal !== 'number' || !Number.isFinite(i.totaal)
        || typeof i.btw_percentage !== 'number' || !Number.isFinite(i.btw_percentage),
    )
    if (ongeldigeIndex !== -1) {
      return res.status(400).json({ error: `Factuurregel ${ongeldigeIndex + 1} heeft geen geldig bedrag of BTW-percentage. Controleer de factuur.` })
    }

    const rond2 = (n: number) => Math.round(n * 100) / 100
    const somRegels = rond2(items.reduce((acc, i) => acc + i.totaal, 0))
    const verwachtExcl = rond2(Number(factuur.totaal) - Number(factuur.btw_bedrag))
    if (Math.abs(somRegels - verwachtExcl) > 0.05) {
      return res.status(400).json({
        error: `De som van de factuurregels (€${somRegels.toFixed(2)}) wijkt af van het factuurtotaal excl. BTW (€${verwachtExcl.toFixed(2)}). Controleer de factuur.`,
      })
    }
    const isCredit = factuur.factuur_type === 'creditnota' || factuur.factuur_type === 'credit'
    if (isCredit && somRegels > 0) {
      return res.status(400).json({ error: 'De regels van een creditnota moeten negatief zijn; deze creditnota heeft een positief regeltotaal.' })
    }

    let klantQuery = supabaseAdmin
      .from('klanten')
      .select('id, bedrijfsnaam, email, telefoon, adres, postcode, stad, land, btw_nummer, kvk_nummer, debiteurennummer, btw_verlegd, peppol_id, peppol_status')
      .eq('id', factuur.klant_id)
    if (orgId) klantQuery = klantQuery.eq('organisatie_id', orgId)
    const { data: klant } = await klantQuery.maybeSingle()

    const settingsRaw = await loadAppSettingsOrgFirst(supabaseAdmin, user_id, BILLIT_KOLOMMEN)
    const settings = (settingsRaw ?? {}) as unknown as BillitSettings
    if (settings.boekhoud_pakket !== 'billit') {
      return res.status(400).json({ error: 'Billit is niet het actieve boekhoudpakket. Controleer Instellingen > Integraties.' })
    }
    if (!settings.billit_access_token || !settings.billit_party_id) {
      return res.status(400).json({ error: 'Billit is niet verbonden. Koppel eerst via Instellingen > Integraties.' })
    }
    const omgeving: Omgeving = settings.billit_omgeving === 'sandbox' ? 'sandbox' : 'productie'
    const base = BILLIT_BASE[omgeving]
    const partyId = settings.billit_party_id
    const token = await billitAccessToken(supabaseAdmin, settings)

    const klantNaam = (klant?.bedrijfsnaam as string | null) || (factuur.klant_naam as string | null) || 'Onbekende klant'
    // Btw verlegd is een eigenschap van de factuur zoals hij is opgeslagen
    // (regels op 0%); Billit krijgt exact wat doen. zelf boekt en mailt.
    if (klant?.btw_verlegd === true && Math.abs(Number(factuur.btw_bedrag)) >= 0.005) {
      return res.status(400).json({ error: 'Deze klant staat op btw verlegd, maar de factuur bevat btw. Zet de regels op 0% en sla de factuur op.' })
    }

    // 1. Order aanmaken (tenzij deze factuur al in Billit staat)
    let orderId: string | null = factuur.boekhoud_pakket === 'billit' && factuur.boekhoud_extern_id ? String(factuur.boekhoud_extern_id) : null
    let nieuwAangemaakt = false
    if (!orderId) {
      const orderBody = bouwBillitOrder({
        nummer: String(factuur.nummer),
        factuurdatum: factuur.factuurdatum,
        vervaldatum: factuur.vervaldatum,
        klant_referentie: factuur.klant_referentie,
        isCredit,
        klantNaam,
        klant: klant ?? null,
        items,
      })

      const createRes = await billitFetch(base, token, partyId, '/v1/orders', { method: 'POST', body: JSON.stringify(orderBody) })
      if (!createRes.ok) {
        if (createRes.status === 401) {
          return res.status(401).json({ error: 'Billit-token is niet meer geldig. Verbind opnieuw via Instellingen > Integraties.' })
        }
        const tekst = await createRes.text()
        console.error('[billit-sync] order aanmaken fout:', createRes.status, tekst.slice(0, 500))
        return res.status(502).json({ error: `Factuur aanmaken in Billit mislukt (${createRes.status}). ${tekst.slice(0, 200)}` })
      }
      orderId = leesOrderId(await createRes.json().catch(async () => null))
      if (!orderId) {
        return res.status(502).json({ error: 'Billit gaf geen OrderID terug. Controleer in Billit of de factuur is aangemaakt voordat je opnieuw synct.' })
      }
      nieuwAangemaakt = true

      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('facturen')
        .update({ boekhoud_pakket: 'billit', boekhoud_extern_id: orderId, boekhoud_synced_at: new Date().toISOString() })
        .eq('id', factuur_id)
        .is('boekhoud_extern_id', null)
        .select('id')
      if (updateError || !updatedRows || updatedRows.length === 0) {
        console.error('[billit-sync] sync-state opslaan mislukt:', updateError?.message ?? 'race verloren (0 rijen geüpdatet)')
        return res.status(200).json({
          success: true,
          extern_id: orderId,
          waarschuwing: `Factuur is aangemaakt in Billit (order ${orderId}), maar de sync-status kon niet worden opgeslagen. Niet opnieuw syncen; neem contact op met support.`,
        })
      }
    }

    if (!peppol) {
      return res.status(200).json({ success: true, extern_id: orderId, peppol_status: factuur.peppol_status ?? null })
    }

    // 2. Peppol: eerst kijken of de ontvanger bereikbaar is, dan versturen.
    if (factuur.peppol_status === 'verzonden' || factuur.peppol_status === 'afgeleverd') {
      return res.status(200).json({ success: true, extern_id: orderId, peppol_status: factuur.peppol_status, waarschuwing: 'Deze factuur is al via Peppol verstuurd.' })
    }

    const identifier = klant ? peppolIdentifier(klant as { land?: string | null; btw_nummer?: string | null; kvk_nummer?: string | null; peppol_id?: string | null }) : null
    if (!identifier) {
      await supabaseAdmin.from('facturen').update({ peppol_status: 'niet_verzonden', peppol_fout: 'Geen btw-nummer of Peppol-identifier bij de klant' }).eq('id', factuur_id)
      return res.status(200).json({
        success: true,
        extern_id: orderId,
        peppol_status: 'niet_verzonden',
        waarschuwing: `${nieuwAangemaakt ? 'Factuur staat in Billit. ' : ''}Niet via Peppol verstuurd: vul het btw-nummer (of een Peppol-identifier) van de klant in.`,
      })
    }

    const checkRes = await billitFetch(base, token, partyId, `/v1/peppol/participantInformation/${encodeURIComponent(identifier)}`)
    const registratie = leesRegistratie(checkRes.status, await checkRes.json().catch(() => null))
    if (klant?.id && registratie !== 'onbekend') {
      await supabaseAdmin.from('klanten').update({ peppol_status: registratie, peppol_gecheckt_op: new Date().toISOString() }).eq('id', klant.id)
    }
    if (registratie === 'niet_geregistreerd') {
      await supabaseAdmin.from('facturen').update({ peppol_status: 'niet_verzonden', peppol_fout: 'Klant is niet geregistreerd op het Peppol-netwerk' }).eq('id', factuur_id)
      return res.status(200).json({
        success: true,
        extern_id: orderId,
        peppol_status: 'niet_verzonden',
        waarschuwing: `${nieuwAangemaakt ? 'Factuur staat in Billit. ' : ''}${klantNaam} is niet geregistreerd op Peppol; verstuur de factuur per e-mail.`,
      })
    }

    // De claim: alleen wie de status van leeg/niet_verzonden/mislukt naar
    // in_wachtrij zet mag versturen. Twee gelijktijdige aanroepen (keten +
    // knop, dubbelklik, retry) leveren zo nooit twee Peppol-berichten op.
    const { data: claim } = await supabaseAdmin
      .from('facturen')
      .update({ peppol_status: 'in_wachtrij', peppol_fout: null })
      .eq('id', factuur_id)
      .or('peppol_status.is.null,peppol_status.in.(niet_verzonden,mislukt)')
      .select('id')
    if (!claim || claim.length === 0) {
      return res.status(200).json({ success: true, extern_id: orderId, peppol_status: 'in_wachtrij', waarschuwing: 'De Peppol-verzending van deze factuur loopt al of is al gedaan.' })
    }
    peppolGeclaimd = factuur_id
    let sendRes: Response
    try {
      sendRes = await billitFetch(base, token, partyId, '/v1/orders/commands/send', {
        method: 'POST',
        body: JSON.stringify({ Transporttype: 'Peppol', OrderIDs: [Number.isFinite(Number(orderId)) ? Number(orderId) : orderId] }),
      })
    } catch (err) {
      // Timeout of netwerkfout: onbekend of Billit hem tóch verstuurd heeft.
      // De claim blijft staan zodat niemand direct opnieuw verstuurt; de cron
      // haalt de echte transportstatus op en zet een claim die na 30 minuten
      // nog hangt terug op 'mislukt'.
      const fout = `Geen antwoord van Billit bij het versturen: ${err instanceof Error ? err.message : String(err)}. De status wordt automatisch bijgewerkt.`
      await supabaseAdmin.from('facturen').update({ peppol_fout: fout.slice(0, 500) }).eq('id', factuur_id).eq('peppol_status', 'in_wachtrij')
      peppolGeclaimd = null
      return res.status(200).json({ success: true, extern_id: orderId, peppol_status: 'in_wachtrij', waarschuwing: fout })
    }
    if (!sendRes.ok) {
      const tekst = (await sendRes.text()).slice(0, 300)
      console.error('[billit-sync] peppol verzenden fout:', sendRes.status, tekst)
      const fout = `Billit weigerde de Peppol-verzending (${sendRes.status}). ${tekst}`.trim()
      await supabaseAdmin.from('facturen').update({ peppol_status: 'mislukt', peppol_fout: fout.slice(0, 500) }).eq('id', factuur_id)
      peppolGeclaimd = null
      Sentry.captureMessage('Peppol-verzending via Billit mislukt', { level: 'warning', extra: { factuur_id, status: sendRes.status } })
      return res.status(200).json({ success: true, extern_id: orderId, peppol_status: 'mislukt', waarschuwing: fout })
    }

    const berichtId = leesOrderId(await sendRes.json().catch(() => null))
    await supabaseAdmin.from('facturen').update({
      peppol_status: 'verzonden',
      peppol_verzonden_op: new Date().toISOString(),
      peppol_fout: null,
      ...(berichtId && berichtId !== orderId ? { peppol_bericht_id: berichtId } : {}),
    }).eq('id', factuur_id)
    peppolGeclaimd = null

    return res.status(200).json({ success: true, extern_id: orderId, peppol_status: 'verzonden' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (peppolGeclaimd) {
      // Onverwachte fout ná de claim: de wachtrij-status mag de factuur niet
      // voor altijd blokkeren.
      await supabaseAdmin.from('facturen').update({ peppol_status: 'mislukt', peppol_fout: message.slice(0, 500) }).eq('id', peppolGeclaimd).eq('peppol_status', 'in_wachtrij')
    }
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[billit-sync] error:', message)
    Sentry.captureException(err, { tags: { route: 'billit-sync-factuur' } })
    return res.status(500).json({ error: message })
  }
}
