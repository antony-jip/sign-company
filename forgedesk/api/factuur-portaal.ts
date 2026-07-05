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
  console.warn('[ratelimit] UPSTASH env vars missing for factuur-portaal, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:factuur-portaal', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] factuur-portaal id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] factuur-portaal id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  if (Array.isArray(fwd)) return fwd[0]
  return 'unknown'
}

export const config = { maxDuration: 15 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (!(await enforceRateLimit(getClientIp(req), res))) return

  try {
    const portaalToken = req.query.token as string
    const factuurId = req.query.factuur_id as string
    const betaalToken = req.query.betaal_token as string

    // Twee paden: ofwel portaal token + factuur_id, ofwel betaal_token
    let factuur: Record<string, unknown> | null = null
    let userId: string | null = null

    if (betaalToken) {
      // Via betaal-token: zoek factuur direct
      const { data } = await supabaseAdmin
        .from('facturen')
        .select('*')
        .eq('betaal_token', betaalToken)
        .maybeSingle()
      factuur = data
      userId = factuur?.user_id as string || null

      const verloopt = factuur?.betaal_token_verloopt_op as string | null | undefined
      if (verloopt && new Date(verloopt) < new Date()) {
        return res.status(410).json({ error: 'Deze betaallink is verlopen' })
      }

      // Telemetrie: markeer eerste view (idempotent — alleen als nog niet eerder bekeken)
      if (factuur && !factuur.online_bekeken_op) {
        await supabaseAdmin
          .from('facturen')
          .update({ online_bekeken: true, online_bekeken_op: new Date().toISOString() })
          .eq('id', factuur.id)
          .is('online_bekeken_op', null)
      }
    } else if (portaalToken && factuurId) {
      // Via portaal token + factuur_id
      const { data: portaal } = await supabaseAdmin
        .from('project_portalen')
        .select('id, user_id, project_id, organisatie_id, actief, verloopt_op')
        .eq('token', portaalToken)
        .eq('actief', true)
        .maybeSingle()

      if (!portaal) {
        return res.status(404).json({ error: 'Portaal niet gevonden of verlopen' })
      }

      // Expiry server-side afdwingen (consistent met portaal-get/reactie/upload/bekeken).
      const portaalVerloopt = portaal.verloopt_op as string | null | undefined
      if (portaalVerloopt && new Date(portaalVerloopt) < new Date()) {
        return res.status(410).json({ error: 'Deze portaallink is verlopen' })
      }
      userId = portaal.user_id

      // Resolve org via portaal; voor legacy portalen vóór migratie 047 zonder
      // organisatie_id valt terug op de owner-profile lookup. Geen org → 403.
      let portaalOrgId = (portaal.organisatie_id as string | null) ?? null
      if (!portaalOrgId) {
        const { data: ownerProfile } = await supabaseAdmin
          .from('profiles')
          .select('organisatie_id')
          .eq('id', portaal.user_id)
          .maybeSingle()
        portaalOrgId = (ownerProfile?.organisatie_id as string | null) ?? null
      }
      if (!portaalOrgId) {
        return res.status(403).json({ error: 'Portaal organisatie kan niet vastgesteld worden' })
      }

      const { data } = await supabaseAdmin
        .from('facturen')
        .select('*')
        .eq('id', factuurId)
        .eq('organisatie_id', portaalOrgId)
        .eq('project_id', portaal.project_id)
        .maybeSingle()
      factuur = data
    } else {
      return res.status(400).json({ error: 'token+factuur_id of betaal_token is verplicht' })
    }

    if (!factuur) {
      return res.status(404).json({ error: 'Factuur niet gevonden' })
    }
    if (!userId) userId = factuur.user_id as string

    const factuurDbId = factuur.id as string

    // Factuur items
    const { data: factuurItems } = await supabaseAdmin
      .from('factuur_items')
      .select('*')
      .eq('factuur_id', factuurDbId)
      .order('volgorde', { ascending: true })

    // Bedrijfsprofiel — org-breed: lees het profiel van de organisatie-eigenaar
    // i.p.v. de maker, zodat elk teamlid dezelfde bedrijfs-/betaalgegevens stuurt.
    let bedrijfUserId = userId
    const bedrijfOrgId = (factuur.organisatie_id as string | null) ?? null
    if (bedrijfOrgId) {
      const { data: org } = await supabaseAdmin
        .from('organisaties')
        .select('eigenaar_id')
        .eq('id', bedrijfOrgId)
        .maybeSingle()
      if (org?.eigenaar_id) bedrijfUserId = org.eigenaar_id as string
    }
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('bedrijfsnaam, bedrijfs_adres, bedrijfs_telefoon, bedrijfs_email, bedrijfs_website, kvk_nummer, btw_nummer, iban, logo_url')
      .eq('id', bedrijfUserId)
      .maybeSingle()

    // Klant
    const klantId = factuur.klant_id as string | null
    const { data: klant } = klantId
      ? await supabaseAdmin
          .from('klanten')
          .select('bedrijfsnaam, contactpersoon, email, adres, postcode, stad')
          .eq('id', klantId)
          .maybeSingle()
      : { data: null }

    // Document style — org-first met user_id-fallback voor legacy rijen
    const factuurOrgId = (factuur.organisatie_id as string | null) ?? null
    let docStyle: Record<string, unknown> | null = null
    if (factuurOrgId) {
      const { data } = await supabaseAdmin
        .from('document_styles')
        .select('*')
        .eq('organisatie_id', factuurOrgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      docStyle = data
    }
    if (!docStyle) {
      const { data } = await supabaseAdmin
        .from('document_styles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      docStyle = data
    }

    // App settings — alleen Mollie-vlag exposen (default-deny bij failure)
    let appSettings: { mollie_enabled: boolean | null } | null = null
    if (factuurOrgId) {
      const { data } = await supabaseAdmin
        .from('app_settings')
        .select('mollie_enabled')
        .eq('organisatie_id', factuurOrgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      appSettings = data
    }
    if (!appSettings) {
      const { data } = await supabaseAdmin
        .from('app_settings')
        .select('mollie_enabled')
        .eq('user_id', userId)
        .maybeSingle()
      appSettings = data
    }

    // betaal_token niet meeteruggeven: het portaal-token-pad hoort de betaallink
    // niet te lekken, en de betaalpagina leest de token uit de eigen URL. Rest
    // van de factuur blijft ongemoeid zodat de portaal-weergave niets mist.
    const { betaal_token: _bt, betaal_token_verloopt_op: _bte, ...factuurPubliek } = factuur as Record<string, unknown>

    return res.status(200).json({
      factuur: factuurPubliek,
      items: factuurItems || [],
      bedrijf: profile || null,
      klant: klant || null,
      docStyle: docStyle || null,
      app_settings: { mollie_enabled: appSettings?.mollie_enabled ?? false },
    })
  } catch (error: unknown) {
    console.error('factuur-portaal error:', error)
    return res.status(500).json({ error: 'Interne fout' })
  }
}
