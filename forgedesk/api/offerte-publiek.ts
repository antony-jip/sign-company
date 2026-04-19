import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for offerte-publiek, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:offerte-publiek', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] offerte-publiek id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] offerte-publiek id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  if (Array.isArray(fwd)) return fwd[0]
  return 'unknown'
}

// Whitelist: velden die de klant mag zien
const OFFERTE_VELDEN = [
  'id', 'nummer', 'titel', 'status', 'subtotaal', 'btw_bedrag', 'totaal',
  'geldig_tot', 'notities', 'voorwaarden', 'intro_tekst', 'outro_tekst',
  'klant_naam', 'klant_id', 'created_at', 'updated_at',
  'geaccepteerd_door', 'geaccepteerd_op',
  'wijziging_opmerking', 'wijziging_ingediend_op',
  'publieke_link_geopend_op', 'publieke_link_views',
  'afrondingskorting_excl_btw', 'aangepast_totaal',
  'gekozen_items', 'gekozen_varianten',
] as const

const ITEM_VELDEN = [
  'id', 'offerte_id', 'beschrijving', 'aantal', 'eenheidsprijs',
  'btw_percentage', 'korting_percentage', 'totaal', 'volgorde',
  'soort', 'extra_velden', 'detail_regels', 'is_optioneel',
  'breedte_mm', 'hoogte_mm', 'oppervlakte_m2', 'afmeting_vrij',
  'foto_url', 'foto_op_offerte', 'bijlage_url', 'bijlage_type', 'bijlage_naam',
  'prijs_varianten', 'actieve_variant_id',
] as const

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

    if (!(await enforceRateLimit(getClientIp(req), res))) return

    // Zoek offerte op publiek_token
    const { data: offerte, error: offerteError } = await supabaseAdmin
      .from('offertes')
      .select('*')
      .eq('publiek_token', token)
      .single()

    if (offerteError || !offerte) {
      return res.status(404).json({ error: 'Offerte niet gevonden' })
    }

    if (offerte.publiek_token_verloopt_op && new Date(offerte.publiek_token_verloopt_op) < new Date()) {
      return res.status(410).json({ error: 'Deze publieke link is verlopen' })
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

    await supabaseAdmin.from('offertes').update(updates).eq('id', offerte.id)

    // Haal items op
    const { data: rawItems } = await supabaseAdmin
      .from('offerte_items')
      .select('*')
      .eq('offerte_id', offerte.id)
      .order('volgorde', { ascending: true })

    const items = (rawItems || []).map((item: Record<string, unknown>) => pick(item, ITEM_VELDEN))

    // Haal bedrijfsgegevens op via user_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('bedrijfsnaam, bedrijfs_adres, bedrijfs_telefoon, bedrijfs_email, bedrijfs_website, kvk_nummer, btw_nummer, iban, logo_url')
      .eq('id', offerte.user_id)
      .single()

    // Haal klant gegevens
    const { data: klant } = await supabaseAdmin
      .from('klanten')
      .select('bedrijfsnaam, contactpersoon, email, adres, postcode, stad')
      .eq('id', offerte.klant_id)
      .single()

    // Haal document style op (voor briefpapier, kleuren, etc. in de PDF)
    const { data: docStyle } = await supabaseAdmin
      .from('document_styles')
      .select('*')
      .eq('user_id', offerte.user_id)
      .maybeSingle()

    // Merge status update in return data
    const safeOfferte = pick({ ...offerte, ...updates }, OFFERTE_VELDEN)

    return res.status(200).json({
      offerte: safeOfferte,
      items,
      bedrijf: profile || null,
      klant: klant || null,
      docStyle: docStyle || null,
    })
  } catch (error: unknown) {
    console.error('offerte-publiek error:', error)
    return res.status(500).json({ error: 'Er ging iets mis' })
  }
}
