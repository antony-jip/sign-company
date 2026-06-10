/**
 * Synct een doen.-factuur naar SnelStart als verkoopboeking.
 *
 * doen. blijft het facturatiesysteem: eigen nummer (factuurnummer). SnelStart
 * krijgt de financiële boeking (geen opgemaakte factuur/PDF).
 *
 * Flow: idempotency-check (boekhoud_extern_id) → token mint (clientkey flow) →
 * relatie-upsert op relatiecode (debiteurennummer) → verkoopboeking met
 * BTW-groepering per tarief → sync-state terugschrijven.
 *
 * NB: payload-shapes zijn gebaseerd op de SnelStart B2B API v2 docs; bij de
 * eerste test tegen een echte Ontwikkeling&Test-administratie de veldnamen
 * verifiëren (Swagger zit achter developer-portal login).
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

const SNELSTART_AUTH_URL = 'https://auth.snelstart.nl/b2b/token'
const SNELSTART_API_BASE = 'https://b2bapi.snelstart.nl/v2'

interface FactuurItemRij {
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  totaal: number
}

type BtwSoort = 'Hoog' | 'Laag' | 'Geen'

function bepaalBtwSoort(btwPercentage: number): BtwSoort {
  if (btwPercentage >= 21) return 'Hoog'
  if (btwPercentage >= 9) return 'Laag'
  return 'Geen'
}

function rond2(n: number): number {
  return Math.round(n * 100) / 100
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

    const subscriptionKey = process.env.SNELSTART_SUBSCRIPTION_KEY
    if (!subscriptionKey) {
      return res.status(500).json({ error: 'SnelStart subscription key is niet geconfigureerd op de server (SNELSTART_SUBSCRIPTION_KEY).' })
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
      'boekhoud_pakket, snelstart_koppelsleutel, snelstart_grootboek_id',
    )
    if ((settingsRaw?.boekhoud_pakket as string | null) !== 'snelstart') {
      return res.status(400).json({ error: 'SnelStart is niet het actieve boekhoudpakket. Controleer Instellingen > Integraties.' })
    }
    const sleutel = decryptSecret((settingsRaw?.snelstart_koppelsleutel as string | null) ?? '')
    const grootboekId = (settingsRaw?.snelstart_grootboek_id as string | null) ?? ''

    if (!sleutel) {
      return res.status(400).json({ error: 'SnelStart is niet verbonden. Koppel eerst via Instellingen > Integraties.' })
    }
    if (!grootboekId) {
      return res.status(400).json({ error: 'Configureer eerst een omzetgrootboek bij de SnelStart-instellingen.' })
    }

    // 3. Access token minten (clientkey flow, ~1 uur geldig — per request is genoeg)
    const tokenRes = await fetch(SNELSTART_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'clientkey', clientkey: sleutel }).toString(),
    })
    if (!tokenRes.ok) {
      return res.status(401).json({ error: 'SnelStart koppelsleutel is niet meer geldig. Verbind opnieuw via Instellingen > Integraties.' })
    }
    const tokenBody = await tokenRes.json() as { access_token?: string }
    if (!tokenBody?.access_token) {
      return res.status(502).json({ error: 'SnelStart gaf geen access token terug.' })
    }
    const apiHeaders = {
      Authorization: `Bearer ${tokenBody.access_token}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/json',
    }

    const klantNaam = (klant?.bedrijfsnaam as string | null) || (factuur.klant_naam as string | null) || 'Onbekende klant'
    const debiteurennummer = ((klant?.debiteurennummer as string | null) ?? '').trim()
    // SnelStart relatiecodes zijn numeriek; niet-numerieke debiteurennummers
    // kunnen niet als filter of code gebruikt worden. Normaliseren via
    // Number() zodat voorloopnullen ("007" → "7") correct matchen.
    const relatiecode = /^\d+$/.test(debiteurennummer) ? String(Number(debiteurennummer)) : ''

    // 4. Relatie opzoeken (op relatiecode, anders exacte naam), anders aanmaken
    let relatieId: string | null = null

    const odataNaam = klantNaam.replace(/'/g, "''")
    const filter = relatiecode
      ? `Relatiecode eq ${relatiecode}`
      : `Naam eq '${odataNaam}'`
    const lookupRes = await fetch(
      `${SNELSTART_API_BASE}/relaties?$filter=${encodeURIComponent(filter)}`,
      { headers: apiHeaders },
    )
    if (lookupRes.ok) {
      const kandidaten = await lookupRes.json() as Array<{ id: string; relatiecode?: number; naam?: string }>
      if (Array.isArray(kandidaten) && kandidaten.length > 0) {
        const match = relatiecode
          ? kandidaten.find((r) => String(r.relatiecode ?? '') === relatiecode)
          : kandidaten.find((r) => (r.naam ?? '').toLowerCase() === klantNaam.toLowerCase())
        if (match) relatieId = match.id
      }
    } else if (lookupRes.status === 401 || lookupRes.status === 403) {
      return res.status(401).json({ error: 'SnelStart-toegang geweigerd. Controleer de koppelsleutel en subscription key.' })
    } else {
      const body = await lookupRes.text()
      console.error('[snelstart-sync] relatie lookup fout:', lookupRes.status, body)
      return res.status(502).json({ error: `SnelStart gaf een fout bij het opzoeken van de klant (${lookupRes.status}).` })
    }

    if (!relatieId) {
      // Land-id opzoeken: SnelStart verwijst naar landen via interne id's,
      // niet via ISO-codes. Soft-fail: zonder land geen vestigingsAdres.
      let landId: string | null = null
      try {
        const landenRes = await fetch(`${SNELSTART_API_BASE}/landen`, { headers: apiHeaders })
        if (landenRes.ok) {
          const landen = await landenRes.json() as Array<{ id: string; landcodeISO?: string; naam?: string }>
          const klantLand = (((klant?.land as string | null) ?? '') || 'NL').trim()
          const gezocht = klantLand.length === 2 ? klantLand.toUpperCase() : 'NL'
          const land = landen.find((l) => (l.landcodeISO ?? '').toUpperCase() === gezocht)
            ?? landen.find((l) => (l.naam ?? '').toLowerCase() === 'nederland')
          if (land) landId = land.id
        }
      } catch (landErr) {
        console.warn('[snelstart-sync] landen lookup mislukt, relatie zonder adres:', landErr)
      }

      const createRes = await fetch(`${SNELSTART_API_BASE}/relaties`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          naam: klantNaam,
          relatiesoort: ['Klant'],
          ...(relatiecode ? { relatiecode: Number(relatiecode) } : {}),
          ...(landId && (klant?.adres || klant?.postcode || klant?.stad)
            ? {
                vestigingsAdres: {
                  straat: (klant?.adres as string | null) || undefined,
                  postcode: (klant?.postcode as string | null) || undefined,
                  plaats: (klant?.stad as string | null) || undefined,
                  land: { id: landId },
                },
              }
            : {}),
          email: (klant?.email as string | null) || undefined,
          telefoon: (klant?.telefoon as string | null) || undefined,
          btwNummer: (klant?.btw_nummer as string | null) || undefined,
        }),
      })
      if (!createRes.ok) {
        const body = await createRes.text()
        console.error('[snelstart-sync] relatie aanmaken fout:', createRes.status, body)
        return res.status(502).json({ error: `Klant aanmaken in SnelStart mislukt (${createRes.status}).` })
      }
      const nieuweRelatie = await createRes.json() as { id: string }
      relatieId = nieuweRelatie.id
    }

    // 5. Verkoopboeking aanmaken.
    // Regels: factuur_items.totaal is al excl. BTW met korting verwerkt.
    // BTW-array: som per tarief, laatste tarief reconciliëren tegen
    // facturen.btw_bedrag zodat centafronding nooit een verschil geeft.
    const isCredit = factuur.factuur_type === 'creditnota' || factuur.factuur_type === 'credit'

    const btwPerSoort = new Map<BtwSoort, number>()
    for (const item of items) {
      const soort = bepaalBtwSoort(item.btw_percentage)
      if (soort === 'Geen') continue
      const btwBedrag = item.totaal * (item.btw_percentage / 100)
      btwPerSoort.set(soort, (btwPerSoort.get(soort) ?? 0) + btwBedrag)
    }
    const btwGroepen = Array.from(btwPerSoort.entries()).map(([soort, bedrag]) => ({
      btwSoort: soort,
      btwBedrag: rond2(bedrag),
    }))
    if (btwGroepen.length > 0) {
      const somAfgerond = btwGroepen.reduce((acc, g) => acc + g.btwBedrag, 0)
      const verschil = rond2((factuur.btw_bedrag as number) - somAfgerond)
      if (Math.abs(verschil) > 0.05) {
        // Meer dan centafronding: factuur is intern inconsistent — niet
        // doorboeken naar SnelStart, maar het echte dataprobleem melden.
        return res.status(400).json({
          error: `BTW-bedrag van de factuur (€${(factuur.btw_bedrag as number).toFixed(2)}) wijkt meer dan 5 cent af van de som van de regels (€${somAfgerond.toFixed(2)}). Controleer de factuurregels.`,
        })
      }
      if (verschil !== 0) {
        btwGroepen[btwGroepen.length - 1].btwBedrag = rond2(btwGroepen[btwGroepen.length - 1].btwBedrag + verschil)
      }
    }

    const boekingRes = await fetch(`${SNELSTART_API_BASE}/verkoopboekingen`, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({
        factuurnummer: factuur.nummer,
        klant: { id: relatieId },
        factuurdatum: factuur.factuurdatum,
        omschrijving: isCredit
          ? `Creditnota ${factuur.nummer}${factuur.titel ? ` — ${factuur.titel}` : ''}`
          : (factuur.titel || `Factuur ${factuur.nummer}`),
        factuurbedrag: factuur.totaal,
        boekingsregels: items.map((item) => ({
          omschrijving: [
            item.beschrijving,
            item.aantal !== 1 ? `(${item.aantal} × €${item.eenheidsprijs.toFixed(2)})` : null,
            item.korting_percentage > 0 ? `(${item.korting_percentage}% korting)` : null,
          ].filter(Boolean).join(' '),
          grootboek: { id: grootboekId },
          bedrag: item.totaal,
          btwSoort: bepaalBtwSoort(item.btw_percentage),
        })),
        btw: btwGroepen,
      }),
    })

    if (!boekingRes.ok) {
      const body = await boekingRes.text()
      console.error('[snelstart-sync] verkoopboeking fout:', boekingRes.status, body)
      return res.status(502).json({ error: `Boeking aanmaken in SnelStart mislukt (${boekingRes.status}).` })
    }

    const boeking = await boekingRes.json() as { id: string }
    const externId = String(boeking.id)

    // 6. Sync-state terugschrijven. De .is()-guard voorkomt dat een race
    // (twee gelijktijdige syncs) elkaars extern_id overschrijft.
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('facturen')
      .update({
        boekhoud_pakket: 'snelstart',
        boekhoud_extern_id: externId,
        boekhoud_synced_at: new Date().toISOString(),
      })
      .eq('id', factuur_id)
      .is('boekhoud_extern_id', null)
      .select('id')
    if (updateError || !updatedRows || updatedRows.length === 0) {
      console.error('[snelstart-sync] sync-state opslaan mislukt:', updateError?.message ?? 'race verloren (0 rijen geüpdatet)')
      return res.status(200).json({
        success: true,
        extern_id: externId,
        waarschuwing: `Boeking staat in SnelStart (id ${externId}), maar de sync-status kon niet worden opgeslagen. Niet opnieuw syncen; neem contact op met support.`,
      })
    }

    return res.status(200).json({ success: true, extern_id: externId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[snelstart-sync] error:', message)
    return res.status(500).json({ error: message })
  }
}
