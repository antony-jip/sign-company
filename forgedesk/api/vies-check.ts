/**
 * Controleert een EU-btw-nummer bij VIES (Europese Commissie) en legt het
 * resultaat vast.
 *
 * POST { btw_nummer, doel: 'profiel' | 'klant', klant_id? }
 *  → { geldig, naam?, adres?, gevalideerd_op? }
 *
 * doel 'profiel': het eigen bedrijf; bij geldig wordt
 *   profiles.btw_nummer_gevalideerd_op gezet (voorwaarde voor btw-verlegging
 *   op het abonnement). Alleen een admin mag dat.
 * doel 'klant': zet klanten.btw_nummer_gevalideerd_op en geeft naam/adres
 *   terug zodat het formulier ze kan invullen (voor Belgische nummers is dit
 *   het equivalent van de KvK-autocomplete).
 *
 * VIES-REST: GET https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{land}/vat/{nummer}
 * Rate-limited per organisatie; VIES is een publieke dienst met eigen limieten.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const VIES_BASE = process.env.VIES_BASE || 'https://ec.europa.eu/taxation_customs/vies/rest-api'
const EU_LANDEN = new Set(['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'XI'])

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
  if (error) console.error('[vies-check] check_rate_limit faalde:', error)
  return data === true
}

// Griekenland heet in VIES 'EL'; verder land + nummer zonder spaties/punten.
function splitsBtw(btw: string): { land: string; nummer: string } | null {
  const schoon = btw.replace(/[\s.\-]/g, '').toUpperCase()
  const m = schoon.match(/^([A-Z]{2})([A-Z0-9]{2,12})$/)
  if (!m) return null
  const land = m[1] === 'GR' ? 'EL' : m[1]
  return EU_LANDEN.has(land) ? { land, nummer: m[2] } : null
}

// VIES geeft adres als één string met regeleinden: "Straat 1\n2000 Antwerpen".
function splitsAdres(adres: string | null | undefined): { straat: string; postcode: string; stad: string } {
  const regels = (adres || '').split(/\r?\n/).map((r) => r.trim()).filter(Boolean)
  if (regels.length === 0) return { straat: '', postcode: '', stad: '' }
  const laatste = regels[regels.length - 1]
  const m = laatste.match(/^(\d{4}\s?[A-Z]{0,2})\s+(.+)$/)
  return {
    straat: regels.slice(0, -1).join(', ') || (m ? '' : laatste),
    postcode: m ? m[1] : '',
    stad: m ? m[2] : (regels.length > 1 ? laatste : ''),
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)
    const { btw_nummer, doel, klant_id } = req.body as { btw_nummer?: string; doel?: string; klant_id?: string }
    if (!btw_nummer || (doel !== 'profiel' && doel !== 'klant')) {
      return res.status(400).json({ error: 'btw_nummer en doel (profiel|klant) zijn verplicht' })
    }
    const gesplitst = splitsBtw(btw_nummer)
    if (!gesplitst) return res.status(400).json({ error: 'Dit is geen EU-btw-nummer (landcode + nummer, bv. BE0437299999).' })

    const { data: profiel } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id, rol')
      .eq('id', user_id)
      .maybeSingle()
    const orgId = (profiel as { organisatie_id?: string } | null)?.organisatie_id
    if (!orgId) return res.status(403).json({ error: 'Geen organisatie gevonden' })
    if (doel === 'profiel' && (profiel as { rol?: string } | null)?.rol !== 'admin') {
      return res.status(403).json({ error: 'Alleen een beheerder kan het btw-nummer van het bedrijf valideren' })
    }
    if (doel === 'klant' && !klant_id) return res.status(400).json({ error: 'klant_id is verplicht' })
    if (await isRateLimited(`vies:${orgId}`, 60, 3600)) {
      return res.status(429).json({ error: 'Te veel btw-controles in korte tijd. Probeer het over een uur opnieuw.' })
    }

    const viesRes = await fetch(`${VIES_BASE}/ms/${gesplitst.land}/vat/${encodeURIComponent(gesplitst.nummer)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!viesRes.ok) {
      console.warn('[vies-check] VIES antwoordde', viesRes.status)
      return res.status(502).json({ error: `VIES is niet bereikbaar (${viesRes.status}). Probeer het later opnieuw.` })
    }
    const body = await viesRes.json().catch(() => null) as { isValid?: boolean; valid?: boolean; name?: string; address?: string; userError?: string } | null
    if (!body) return res.status(502).json({ error: 'VIES gaf een onleesbaar antwoord.' })
    if (body.userError && body.userError !== 'VALID' && body.userError !== 'INVALID') {
      return res.status(502).json({ error: `VIES kon het nummer nu niet controleren (${body.userError}). Probeer het later opnieuw.` })
    }
    const geldig = body.isValid === true || body.valid === true
    const naam = (body.name || '').trim()
    const adres = splitsAdres(body.address)
    const gevalideerdOp = geldig ? new Date().toISOString() : null

    if (doel === 'profiel') {
      // De abonnements-api's lezen land en btw-nummer van het profiel van de
      // eigenaar; de validatie moet dus dáár landen, en bij de aanroeper zelf
      // voor de weergave. Alleen als het nummer op dat profiel hetzelfde is.
      const { data: org } = await supabaseAdmin.from('organisaties').select('eigenaar_id').eq('id', orgId).maybeSingle()
      const eigenaarId = (org as { eigenaar_id?: string | null } | null)?.eigenaar_id ?? null
      const schoonNummer = (v: string | null | undefined) => (v || '').replace(/[\s.\-]/g, '').toUpperCase()
      // De stempel hoort bij het nummer: alleen profielen waarop precies dit
      // nummer staat krijgen hem; andere profielen blijven ongemoeid (de
      // trigger uit migratie 257 wist de stempel zelf bij een ander nummer).
      const doelIds = [user_id, ...(eigenaarId && eigenaarId !== user_id ? [eigenaarId] : [])]
      const { data: profielen } = await supabaseAdmin.from('profiles').select('id, btw_nummer').in('id', doelIds)
      const gevalideerdNummer = `${gesplitst.land === 'EL' ? 'GR' : gesplitst.land}${gesplitst.nummer}`
      for (const pr of (profielen ?? []) as Array<{ id: string; btw_nummer: string | null }>) {
        if (schoonNummer(pr.btw_nummer) !== gevalideerdNummer) continue
        await supabaseAdmin.from('profiles').update({ btw_nummer_gevalideerd_op: gevalideerdOp, btw_nummer_vies_naam: geldig ? (naam && naam !== '---' ? naam : null) : null }).eq('id', pr.id)
      }
    } else {
      await supabaseAdmin.from('klanten').update({ btw_nummer_gevalideerd_op: gevalideerdOp }).eq('id', klant_id).eq('organisatie_id', orgId)
    }

    return res.status(200).json({
      geldig,
      btw_nummer: `${gesplitst.land === 'EL' ? 'GR' : gesplitst.land}${gesplitst.nummer}`,
      naam: naam && naam !== '---' ? naam : null,
      adres: adres.straat || adres.stad ? adres : null,
      gevalideerd_op: gevalideerdOp,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[vies-check] error:', message)
    return res.status(500).json({ error: message })
  }
}
