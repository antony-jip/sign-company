import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Whitelist: velden die de klant mag zien
const OFFERTE_VELDEN = [
  'id', 'nummer', 'titel', 'status', 'subtotaal', 'btw_bedrag', 'totaal',
  'geldig_tot', 'notities', 'voorwaarden', 'intro_tekst', 'outro_tekst',
  'klant_naam', 'klant_id', 'created_at', 'updated_at',
  'geaccepteerd_door', 'geaccepteerd_op',
  'wijziging_opmerking', 'wijziging_ingediend_op',
  'publieke_link_geopend_op', 'publieke_link_views',
  'afrondingskorting_excl_btw', 'aangepast_totaal',
] as const

const ITEM_VELDEN = [
  'id', 'offerte_id', 'beschrijving', 'aantal', 'eenheidsprijs',
  'btw_percentage', 'korting_percentage', 'totaal', 'volgorde',
  'soort', 'extra_velden', 'detail_regels', 'is_optioneel',
  'breedte_mm', 'hoogte_mm', 'oppervlakte_m2', 'afmeting_vrij',
  'foto_url', 'foto_op_offerte', 'bijlage_url', 'bijlage_type', 'bijlage_naam',
  'prijs_varianten', 'actieve_variant_id',
] as const

// Eenvoudige in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function isRateLimited(token: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(token)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(token, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

function pick<T extends Record<string, unknown>>(obj: T, keys: readonly string[]): Partial<T> {
  const result: Record<string, unknown> = {}
  for (const key of keys) {
    if (key in obj) result[key] = obj[key]
  }
  return result as Partial<T>
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = req.query.token as string
    if (!token) return res.status(400).json({ error: 'Token is verplicht' })

    if (isRateLimited(token)) {
      return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie ontbreekt' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Zoek offerte op publiek_token
    const { data: offerte, error: offerteError } = await supabase
      .from('offertes')
      .select('*')
      .eq('publiek_token', token)
      .single()

    if (offerteError || !offerte) {
      return res.status(404).json({ error: 'Offerte niet gevonden' })
    }

    // Increment views + zet eerste geopend
    const updates: Record<string, unknown> = {
      publieke_link_views: (offerte.publieke_link_views || 0) + 1,
      bekeken_door_klant: true,
      laatst_bekeken_op: new Date().toISOString(),
      aantal_keer_bekeken: (offerte.aantal_keer_bekeken || 0) + 1,
    }

    if (!offerte.publieke_link_geopend_op) {
      updates.publieke_link_geopend_op = new Date().toISOString()
      updates.eerste_bekeken_op = offerte.eerste_bekeken_op || new Date().toISOString()
    }

    // Status → bekeken als nog verzonden
    if (offerte.status === 'verzonden') {
      updates.status = 'bekeken'
    }

    await supabase.from('offertes').update(updates).eq('id', offerte.id)

    // Haal items op
    const { data: rawItems } = await supabase
      .from('offerte_items')
      .select('*')
      .eq('offerte_id', offerte.id)
      .order('volgorde', { ascending: true })

    const items = (rawItems || []).map((item: Record<string, unknown>) => pick(item, ITEM_VELDEN))

    // Haal bedrijfsgegevens op via user_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('bedrijfsnaam, bedrijfs_adres, bedrijfs_telefoon, bedrijfs_email, bedrijfs_website, kvk_nummer, btw_nummer, iban, logo_url')
      .eq('id', offerte.user_id)
      .single()

    // Haal klant gegevens
    const { data: klant } = await supabase
      .from('klanten')
      .select('bedrijfsnaam, contactpersoon, email, adres, postcode, stad')
      .eq('id', offerte.klant_id)
      .single()

    // Merge status update in return data
    const safeOfferte = pick({ ...offerte, ...updates }, OFFERTE_VELDEN)

    return res.status(200).json({
      offerte: safeOfferte,
      items,
      bedrijf: profile || null,
      klant: klant || null,
    })
  } catch (error: unknown) {
    console.error('offerte-publiek error:', error)
    return res.status(500).json({ error: 'Er ging iets mis' })
  }
}
