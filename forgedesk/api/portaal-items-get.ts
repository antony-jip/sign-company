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
  console.warn('[ratelimit] UPSTASH env vars missing for portaal-items-get, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(20, '60 s'), prefix: 'rl:portaal-items-get', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] portaal-items-get id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] portaal-items-get id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

/**
 * Authenticated endpoint: haalt portaal items + reacties + bestanden op.
 * Alles apart opgehaald en samengevoegd (geen PostgREST nested select).
 * Gebruikt service role om RLS te omzeilen.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Auth check
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' })
    }
    const jwt = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt)
    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' })
    }

    if (!(await enforceRateLimit(user.id, res))) return

    const portaalId = req.query.portaal_id as string
    if (!portaalId) {
      return res.status(400).json({ error: 'portaal_id is verplicht' })
    }

    // Toegangscheck (eigenaar of org-lid)
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, user_id, organisatie_id')
      .eq('id', portaalId)
      .single()

    if (!portaal) {
      return res.status(404).json({ error: 'Portaal niet gevonden' })
    }

    let hasAccess = portaal.user_id === user.id
    if (!hasAccess && portaal.organisatie_id) {
      const { data: membership } = await supabaseAdmin
        .from('profiles')
        .select('organisatie_id')
        .eq('id', user.id)
        .single()
      hasAccess = membership?.organisatie_id === portaal.organisatie_id
    }
    if (!hasAccess) {
      return res.status(403).json({ error: 'Geen toegang tot dit portaal' })
    }

    // ── Stap 1: items ophalen ────────────────────────────────────────
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('portaal_items')
      .select('*')
      .eq('portaal_id', portaalId)
      .order('created_at', { ascending: false })

    if (itemsErr) {
      console.error('[portaal-items-get] items error:', itemsErr)
      return res.status(500).json({ error: 'Kon items niet ophalen' })
    }

    const itemIds = (items || []).map((i: { id: string }) => i.id)

    // ── Stap 2: bestanden + reacties apart ophalen ───────────────────
    const [bestandenRes, reactiesRes] = itemIds.length > 0
      ? await Promise.all([
          supabaseAdmin.from('portaal_bestanden').select('*').in('portaal_item_id', itemIds),
          supabaseAdmin.from('portaal_reacties').select('*').in('portaal_item_id', itemIds).order('created_at', { ascending: true }),
        ])
      : [{ data: [], error: null }, { data: [], error: null }]

    const bestanden = bestandenRes.data || []
    const reacties = reactiesRes.data || []

    console.log('[portaal-items-get]', {
      items: items.length,
      bestanden: bestanden.length,
      reacties: reacties.length,
    })

    // Offerte publiek tokens ophalen
    const offerteIds = items
      .filter((i: Record<string, unknown>) => i.type === 'offerte' && i.offerte_id)
      .map((i: Record<string, unknown>) => i.offerte_id as string)

    let offerteTokenMap: Record<string, string> = {}
    if (offerteIds.length > 0) {
      const { data: offertes } = await supabaseAdmin
        .from('offertes')
        .select('id, publiek_token')
        .in('id', offerteIds)
      if (offertes) {
        offerteTokenMap = Object.fromEntries(
          offertes.filter((o: Record<string, unknown>) => o.publiek_token).map((o: Record<string, unknown>) => [o.id, o.publiek_token])
        )
      }
    }

    // ── Samenvoegen ───────────────────────────────────────────────────
    const enrichedItems = items.map((item: Record<string, unknown>) => ({
      ...item,
      portaal_bestanden: bestanden.filter((b: Record<string, unknown>) => b.portaal_item_id === item.id),
      portaal_reacties: reacties.filter((r: Record<string, unknown>) => r.portaal_item_id === item.id),
      offerte_publiek_token: item.offerte_id ? offerteTokenMap[item.offerte_id as string] || null : null,
    }))

    return res.status(200).json({ items: enrichedItems })
  } catch (error) {
    console.error('[portaal-items-get] error:', error)
    return res.status(500).json({ error: 'Er ging iets mis' })
  }
}
