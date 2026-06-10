/**
 * Synct een doen.-factuur naar Moneybird als external_sales_invoice.
 *
 * doen. blijft het facturatiesysteem: eigen nummer (via reference), eigen PDF
 * (als attachment geüpload). Moneybird krijgt de boeking voor omzet/BTW.
 *
 * Flow: idempotency-check (boekhoud_extern_id) → contact-upsert op
 * debiteurennummer (Moneybird customer_id) → external_sales_invoice aanmaken →
 * PDF-bijlage uploaden (best-effort) → sync-state terugschrijven op facturen.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// -- Integration credential decryption (copied from api/save-integration-settings.ts) --
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''
function decryptSecret(text: string): string {
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

// ─── Inline org-aware app_settings helpers (copied from api/exact-sync-factuur.ts) ───
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
    if (data) return data as Record<string, unknown>
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

const MONEYBIRD_API_BASE = 'https://moneybird.com/api/v2'

interface MoneybirdSettings {
  moneybird_api_token: string | null
  moneybird_administration_id: string | null
  moneybird_ledger_account_id: string | null
  moneybird_tax_rate_hoog: string | null
  moneybird_tax_rate_laag: string | null
  moneybird_tax_rate_nul: string | null
}

interface FactuurItemRij {
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  totaal: number
}

function bepaalTaxRateId(btwPercentage: number, s: MoneybirdSettings): string | null {
  if (btwPercentage >= 21) return s.moneybird_tax_rate_hoog
  if (btwPercentage >= 9) return s.moneybird_tax_rate_laag
  return s.moneybird_tax_rate_nul
}

async function moneybirdFetch(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${MONEYBIRD_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)
    const { factuur_id } = req.body as { factuur_id?: string }
    if (!factuur_id) {
      return res.status(400).json({ error: 'factuur_id is verplicht' })
    }

    // 1. Factuur + items + klant ophalen — org-scoped (service-role client
    // omzeilt RLS, dus eigendom expliciet afdwingen; zelfde principe als
    // de eigendoms-check in api/mollie-create-payment.ts)
    const orgId = await getOrgIdForUser(supabaseAdmin, user_id)
    let factuurQuery = supabaseAdmin
      .from('facturen')
      .select('*')
      .eq('id', factuur_id)
    factuurQuery = orgId
      ? factuurQuery.eq('organisatie_id', orgId)
      : factuurQuery.eq('user_id', user_id)
    const { data: factuur, error: factuurError } = await factuurQuery.maybeSingle()
    if (factuurError || !factuur) {
      return res.status(404).json({ error: 'Factuur niet gevonden of geen toegang.' })
    }

    // Server-side idempotency: dubbel-klik of retry mag geen tweede boeking maken
    if (factuur.boekhoud_extern_id) {
      return res.status(409).json({ error: 'Deze factuur is al gesynchroniseerd met de boekhouding.' })
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

    let klantQuery = supabaseAdmin
      .from('klanten')
      .select('bedrijfsnaam, email, telefoon, adres, postcode, stad, land, btw_nummer, debiteurennummer')
      .eq('id', factuur.klant_id)
    if (orgId) klantQuery = klantQuery.eq('organisatie_id', orgId)
    const { data: klant } = await klantQuery.maybeSingle()

    // 2. Instellingen
    const settingsRaw = await loadAppSettingsOrgFirst(
      supabaseAdmin,
      user_id,
      'boekhoud_pakket, moneybird_api_token, moneybird_administration_id, moneybird_ledger_account_id, moneybird_tax_rate_hoog, moneybird_tax_rate_laag, moneybird_tax_rate_nul',
    )
    if ((settingsRaw?.boekhoud_pakket as string | null) !== 'moneybird') {
      return res.status(400).json({ error: 'Moneybird is niet het actieve boekhoudpakket. Controleer Instellingen > Integraties.' })
    }
    const settings = (settingsRaw ?? {}) as unknown as MoneybirdSettings
    const token = decryptSecret(settings.moneybird_api_token ?? '')
    const administratieId = settings.moneybird_administration_id ?? ''

    if (!token || !administratieId) {
      return res.status(400).json({ error: 'Moneybird is niet verbonden. Koppel eerst via Instellingen > Integraties.' })
    }
    if (!settings.moneybird_ledger_account_id) {
      return res.status(400).json({ error: 'Configureer eerst een omzetrekening bij de Moneybird-instellingen.' })
    }
    const ontbrekendTarief = items.find((i) => !bepaalTaxRateId(i.btw_percentage, settings))
    if (ontbrekendTarief) {
      return res.status(400).json({
        error: `Geen Moneybird BTW-tarief geconfigureerd voor ${ontbrekendTarief.btw_percentage}%. Vul de BTW-tarieven in bij Instellingen > Integraties.`,
      })
    }

    const adminPath = `/${administratieId}`
    const klantNaam = (klant?.bedrijfsnaam as string | null) || (factuur.klant_naam as string | null) || 'Onbekende klant'
    const debiteurennummer = ((klant?.debiteurennummer as string | null) ?? '').trim()

    // 3. Contact opzoeken (op customer_id = debiteurennummer), anders aanmaken
    let contactId: string | null = null

    if (debiteurennummer) {
      const lookupRes = await moneybirdFetch(token, `${adminPath}/contacts/customer_id/${encodeURIComponent(debiteurennummer)}.json`)
      if (lookupRes.ok) {
        const contact = await lookupRes.json() as { id: number | string }
        contactId = String(contact.id)
      } else if (lookupRes.status !== 404) {
        if (lookupRes.status === 401) {
          return res.status(401).json({ error: 'Moneybird-token is niet meer geldig. Verbind opnieuw via Instellingen > Integraties.' })
        }
        const body = await lookupRes.text()
        console.error('[moneybird-sync] contact lookup fout:', lookupRes.status, body)
        return res.status(502).json({ error: `Moneybird gaf een fout bij het opzoeken van de klant (${lookupRes.status}).` })
      }
    } else {
      // Geen debiteurennummer (legacy klant): zoek op exacte bedrijfsnaam
      const zoekRes = await moneybirdFetch(token, `${adminPath}/contacts.json?query=${encodeURIComponent(klantNaam)}&per_page=100`)
      if (zoekRes.ok) {
        const kandidaten = await zoekRes.json() as Array<{ id: number | string; company_name: string | null }>
        const match = kandidaten.find((c) => (c.company_name ?? '').toLowerCase() === klantNaam.toLowerCase())
        if (match) contactId = String(match.id)
      }
    }

    if (!contactId) {
      const land = ((klant?.land as string | null) ?? '').trim()
      const createRes = await moneybirdFetch(token, `${adminPath}/contacts.json`, {
        method: 'POST',
        body: JSON.stringify({
          contact: {
            company_name: klantNaam,
            ...(debiteurennummer ? { customer_id: debiteurennummer } : {}),
            address1: (klant?.adres as string | null) || undefined,
            zipcode: (klant?.postcode as string | null) || undefined,
            city: (klant?.stad as string | null) || undefined,
            // Moneybird verwacht ISO-landcode; doen. slaat vrije tekst op.
            // Alleen meesturen als het al een ISO-code is, anders pakt
            // Moneybird het land van de administratie.
            ...(/^[A-Za-z]{2}$/.test(land) ? { country: land.toUpperCase() } : {}),
            send_invoices_to_email: (klant?.email as string | null) || undefined,
            phone: (klant?.telefoon as string | null) || undefined,
            tax_number: (klant?.btw_nummer as string | null) || undefined,
          },
        }),
      })
      if (!createRes.ok) {
        if (createRes.status === 401) {
          return res.status(401).json({ error: 'Moneybird-token is niet meer geldig. Verbind opnieuw via Instellingen > Integraties.' })
        }
        const body = await createRes.text()
        console.error('[moneybird-sync] contact aanmaken fout:', createRes.status, body)
        return res.status(502).json({ error: `Klant aanmaken in Moneybird mislukt (${createRes.status}).` })
      }
      const nieuwContact = await createRes.json() as { id: number | string }
      contactId = String(nieuwContact.id)
    }

    // 4. External sales invoice aanmaken.
    // Per regel: price = regel-totaal (excl. BTW, korting al verwerkt) met
    // amount 1, zodat het geboekte totaal exact gelijk is aan doen.'s totaal
    // ondanks korting/afronding — zelfde aanpak als de Exact-sync (AmountDC).
    const isCredit = factuur.factuur_type === 'creditnota' || factuur.factuur_type === 'credit'
    const invoiceRes = await moneybirdFetch(token, `${adminPath}/external_sales_invoices.json`, {
      method: 'POST',
      body: JSON.stringify({
        external_sales_invoice: {
          contact_id: contactId,
          reference: factuur.nummer,
          date: factuur.factuurdatum,
          due_date: factuur.vervaldatum || undefined,
          currency: 'EUR',
          prices_are_incl_tax: false,
          source: 'doen.',
          details_attributes: items.map((item) => ({
            description: [
              isCredit ? `Creditnota: ${item.beschrijving}` : item.beschrijving,
              item.aantal !== 1 ? `(${item.aantal} × €${item.eenheidsprijs.toFixed(2)})` : null,
              item.korting_percentage > 0 ? `(${item.korting_percentage}% korting)` : null,
            ].filter(Boolean).join(' '),
            price: item.totaal.toFixed(2),
            amount: '1',
            tax_rate_id: bepaalTaxRateId(item.btw_percentage, settings),
            ledger_account_id: settings.moneybird_ledger_account_id,
          })),
        },
      }),
    })

    if (!invoiceRes.ok) {
      if (invoiceRes.status === 401) {
        return res.status(401).json({ error: 'Moneybird-token is niet meer geldig. Verbind opnieuw via Instellingen > Integraties.' })
      }
      if (invoiceRes.status === 429) {
        return res.status(429).json({ error: 'Moneybird API-limiet bereikt. Probeer het over enkele minuten opnieuw.' })
      }
      const body = await invoiceRes.text()
      console.error('[moneybird-sync] invoice aanmaken fout:', invoiceRes.status, body)
      return res.status(502).json({ error: `Factuur aanmaken in Moneybird mislukt (${invoiceRes.status}).` })
    }

    const invoice = await invoiceRes.json() as { id: number | string }
    const externId = String(invoice.id)

    // 5. PDF-bijlage uploaden (best-effort, zelfde soft-fail als Exact-sync)
    let bijlageSynced = false
    if (factuur.pdf_storage_path) {
      try {
        const { data: pdfBlob, error: dlError } = await supabaseAdmin.storage
          .from('facturen')
          .download(factuur.pdf_storage_path as string)
        if (dlError || !pdfBlob) {
          console.warn('[moneybird-sync] PDF download uit storage.facturen mislukt:', dlError)
        } else {
          const formData = new FormData()
          formData.append(
            'file',
            new Blob([await pdfBlob.arrayBuffer()], { type: 'application/pdf' }),
            `Factuur-${factuur.nummer}.pdf`,
          )
          const uploadRes = await moneybirdFetch(token, `${adminPath}/external_sales_invoices/${externId}/attachment`, {
            method: 'POST',
            body: formData,
          })
          if (uploadRes.ok) {
            bijlageSynced = true
          } else {
            console.warn('[moneybird-sync] PDF upload mislukt:', uploadRes.status, await uploadRes.text())
          }
        }
      } catch (uploadErr) {
        console.warn('[moneybird-sync] PDF upload exception:', uploadErr)
      }
    }

    // 6. Sync-state terugschrijven. De .is()-guard voorkomt dat een race
    // (twee gelijktijdige syncs) elkaars extern_id overschrijft.
    const syncedAt = new Date().toISOString()
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('facturen')
      .update({
        boekhoud_pakket: 'moneybird',
        boekhoud_extern_id: externId,
        boekhoud_synced_at: syncedAt,
      })
      .eq('id', factuur_id)
      .is('boekhoud_extern_id', null)
      .select('id')
    if (updateError || !updatedRows || updatedRows.length === 0) {
      // Invoice bestaat in Moneybird maar de state-write faalde óf een
      // gelijktijdige sync won de race — meld het extern_id zodat de
      // gebruiker niet blind opnieuw synct (= dubbele boeking).
      console.error('[moneybird-sync] sync-state opslaan mislukt:', updateError?.message ?? 'race verloren (0 rijen geüpdatet)')
      return res.status(200).json({
        success: true,
        extern_id: externId,
        bijlage_synced: bijlageSynced,
        waarschuwing: `Factuur is geboekt in Moneybird (id ${externId}), maar de sync-status kon niet worden opgeslagen. Niet opnieuw syncen; neem contact op met support.`,
      })
    }

    return res.status(200).json({
      success: true,
      extern_id: externId,
      bijlage_synced: bijlageSynced,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[moneybird-sync] error:', message)
    return res.status(500).json({ error: message })
  }
}
