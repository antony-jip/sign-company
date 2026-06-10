/**
 * Synct een doen.-factuur naar e-Boekhouden als mutatie type 2 (FactuurVerstuurd).
 *
 * doen. blijft het facturatiesysteem: eigen nummer (invoiceNumber), eigen PDF
 * (e-Boekhouden heeft geen upload-endpoint — alleen de boeking gaat over).
 *
 * Flow: idempotency-check (boekhoud_extern_id) → sessie openen → relatie-upsert
 * op code (debiteurennummer) → mutatie type 2 → sync-state terugschrijven.
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

const EBOEKHOUDEN_API_BASE = 'https://api.e-boekhouden.nl/v1'
const EBOEKHOUDEN_SOURCE = 'doen'

interface FactuurItemRij {
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  totaal: number
}

function bepaalVatCode(btwPercentage: number): string {
  if (btwPercentage >= 21) return 'HOOG_VERK_21'
  if (btwPercentage >= 9) return 'LAAG_VERK_9'
  return 'GEEN'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let sessieToken: string | null = null

  try {
    const user_id = await verifyUser(req)
    const { factuur_id } = req.body as { factuur_id?: string }
    if (!factuur_id) {
      return res.status(400).json({ error: 'factuur_id is verplicht' })
    }

    // 1. Factuur + items + klant ophalen — org-scoped (service-role client
    // omzeilt RLS, dus eigendom expliciet afdwingen)
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
      'boekhoud_pakket, eboekhouden_api_token, eboekhouden_debiteuren_ledger_id, eboekhouden_omzet_ledger_id',
    )
    if ((settingsRaw?.boekhoud_pakket as string | null) !== 'eboekhouden') {
      return res.status(400).json({ error: 'e-Boekhouden is niet het actieve boekhoudpakket. Controleer Instellingen > Integraties.' })
    }
    const apiToken = decryptSecret((settingsRaw?.eboekhouden_api_token as string | null) ?? '')
    const debiteurenLedgerId = (settingsRaw?.eboekhouden_debiteuren_ledger_id as string | null) ?? ''
    const omzetLedgerId = (settingsRaw?.eboekhouden_omzet_ledger_id as string | null) ?? ''

    if (!apiToken) {
      return res.status(400).json({ error: 'e-Boekhouden is niet verbonden. Koppel eerst via Instellingen > Integraties.' })
    }
    if (!debiteurenLedgerId || !omzetLedgerId) {
      return res.status(400).json({ error: 'Configureer eerst de debiteuren- en omzetrekening bij de e-Boekhouden-instellingen.' })
    }

    // 3. Sessie openen
    const sessieRes = await fetch(`${EBOEKHOUDEN_API_BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: apiToken, source: EBOEKHOUDEN_SOURCE }),
    })
    if (!sessieRes.ok) {
      return res.status(401).json({ error: 'e-Boekhouden-token is niet meer geldig. Verbind opnieuw via Instellingen > Integraties.' })
    }
    const sessie = await sessieRes.json() as { token?: string }
    if (!sessie?.token) {
      return res.status(502).json({ error: 'e-Boekhouden gaf geen sessietoken terug.' })
    }
    sessieToken = sessie.token
    const authHeaders = { Authorization: `Bearer ${sessieToken}`, 'Content-Type': 'application/json' }

    const klantNaam = (klant?.bedrijfsnaam as string | null) || (factuur.klant_naam as string | null) || 'Onbekende klant'
    const debiteurennummer = ((klant?.debiteurennummer as string | null) ?? '').trim()

    // 4. Relatie opzoeken (op code = debiteurennummer), anders aanmaken
    let relatieId: number | null = null

    if (debiteurennummer) {
      const lookupRes = await fetch(
        `${EBOEKHOUDEN_API_BASE}/relation?code=${encodeURIComponent(debiteurennummer)}`,
        { headers: authHeaders },
      )
      if (lookupRes.ok) {
        const body = await lookupRes.json() as
          | Array<{ id: number; code?: string }>
          | { items?: Array<{ id: number; code?: string }> }
        const kandidaten = Array.isArray(body) ? body : (body.items ?? [])
        // Alleen exacte code-match telt — als de API-filter fuzzy matcht mag
        // er niet op een willekeurige relatie geboekt worden.
        const match = kandidaten.find((r) => (r.code ?? '').trim() === debiteurennummer)
        if (match) relatieId = match.id
      } else if (lookupRes.status !== 404) {
        if (lookupRes.status === 401) {
          return res.status(401).json({ error: 'e-Boekhouden-sessie is niet meer geldig. Verbind opnieuw via Instellingen > Integraties.' })
        }
        const body = await lookupRes.text()
        console.error('[eboekhouden-sync] relatie lookup fout:', lookupRes.status, body)
        return res.status(502).json({ error: `e-Boekhouden gaf een fout bij het opzoeken van de klant (${lookupRes.status}).` })
      }
    } else {
      // Geen debiteurennummer (legacy klant): exacte naam-match, conform de
      // Moneybird/SnelStart-flow — voorkomt duplicaat-relaties per factuur.
      const lookupRes = await fetch(
        `${EBOEKHOUDEN_API_BASE}/relation?name=${encodeURIComponent(klantNaam)}`,
        { headers: authHeaders },
      )
      if (lookupRes.ok) {
        const body = await lookupRes.json() as
          | Array<{ id: number; name?: string }>
          | { items?: Array<{ id: number; name?: string }> }
        const kandidaten = Array.isArray(body) ? body : (body.items ?? [])
        const match = kandidaten.find((r) => (r.name ?? '').trim().toLowerCase() === klantNaam.toLowerCase())
        if (match) relatieId = match.id
      }
    }

    if (relatieId == null) {
      const createRes = await fetch(`${EBOEKHOUDEN_API_BASE}/relation`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'B',
          name: klantNaam,
          ...(debiteurennummer ? { code: debiteurennummer } : {}),
          address: (klant?.adres as string | null) || undefined,
          postalCode: (klant?.postcode as string | null) || undefined,
          city: (klant?.stad as string | null) || undefined,
          emailAddress: (klant?.email as string | null) || undefined,
          phoneNumber: (klant?.telefoon as string | null) || undefined,
          vatNumber: (klant?.btw_nummer as string | null) || undefined,
        }),
      })
      if (!createRes.ok) {
        const body = await createRes.text()
        console.error('[eboekhouden-sync] relatie aanmaken fout:', createRes.status, body)
        return res.status(502).json({ error: `Klant aanmaken in e-Boekhouden mislukt (${createRes.status}).` })
      }
      const nieuweRelatie = await createRes.json() as { id: number }
      relatieId = nieuweRelatie.id
    }

    // 5. Mutatie type 2 (FactuurVerstuurd) aanmaken.
    // Bedragen per regel: factuur_items.totaal is al excl. BTW met korting
    // verwerkt; creditnota's hebben negatieve regels en gaan as-is door.
    const isCredit = factuur.factuur_type === 'creditnota' || factuur.factuur_type === 'credit'
    const mutatieRes = await fetch(`${EBOEKHOUDEN_API_BASE}/mutation`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 2,
        date: factuur.factuurdatum,
        ledgerId: Number(debiteurenLedgerId),
        relationId: relatieId,
        invoiceNumber: factuur.nummer,
        description: isCredit
          ? `Creditnota ${factuur.nummer}${factuur.titel ? ` — ${factuur.titel}` : ''}`
          : (factuur.titel || `Factuur ${factuur.nummer}`),
        inExVat: 'EX',
        rows: items.map((item) => ({
          ledgerId: Number(omzetLedgerId),
          vatCode: bepaalVatCode(item.btw_percentage),
          amount: item.totaal,
          description: [
            item.beschrijving,
            item.aantal !== 1 ? `(${item.aantal} × €${item.eenheidsprijs.toFixed(2)})` : null,
            item.korting_percentage > 0 ? `(${item.korting_percentage}% korting)` : null,
          ].filter(Boolean).join(' '),
        })),
      }),
    })

    if (!mutatieRes.ok) {
      const body = await mutatieRes.text()
      console.error('[eboekhouden-sync] mutatie aanmaken fout:', mutatieRes.status, body)
      return res.status(502).json({ error: `Boeking aanmaken in e-Boekhouden mislukt (${mutatieRes.status}).` })
    }

    const mutatie = await mutatieRes.json() as { id: number | string }
    const externId = String(mutatie.id)

    // 6. Sync-state terugschrijven. De .is()-guard voorkomt dat een race
    // (twee gelijktijdige syncs) elkaars extern_id overschrijft.
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('facturen')
      .update({
        boekhoud_pakket: 'eboekhouden',
        boekhoud_extern_id: externId,
        boekhoud_synced_at: new Date().toISOString(),
      })
      .eq('id', factuur_id)
      .is('boekhoud_extern_id', null)
      .select('id')
    if (updateError || !updatedRows || updatedRows.length === 0) {
      console.error('[eboekhouden-sync] sync-state opslaan mislukt:', updateError?.message ?? 'race verloren (0 rijen geüpdatet)')
      return res.status(200).json({
        success: true,
        extern_id: externId,
        waarschuwing: `Boeking staat in e-Boekhouden (id ${externId}), maar de sync-status kon niet worden opgeslagen. Niet opnieuw syncen; neem contact op met support.`,
      })
    }

    return res.status(200).json({ success: true, extern_id: externId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[eboekhouden-sync] error:', message)
    return res.status(500).json({ error: message })
  } finally {
    if (sessieToken) {
      fetch(`${EBOEKHOUDEN_API_BASE}/session`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessieToken}` },
      }).catch(() => {})
    }
  }
}
