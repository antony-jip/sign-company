import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const INKOOP_EXTRACT_MONTHLY_CAP = 500
const INKOOP_OFFERTE_MONTHLY_CAP = 100
const WARNING_THRESHOLD_PERCENT = 90

const EXTRACT_ROUTE = 'inkoopfactuur-extract'
const ANALYZE_ROUTE = 'analyze-inkoop-offerte'

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

interface RouteUsage {
  used: number
  cap: number
  remaining: number
  percent: number
  warning: boolean
  blocked: boolean
}

function buildRouteUsage(used: number, cap: number): RouteUsage {
  const clampedUsed = Math.max(0, used)
  const remaining = Math.max(0, cap - clampedUsed)
  const percent = cap > 0 ? Math.floor((clampedUsed / cap) * 100) : 0
  return {
    used: clampedUsed,
    cap,
    remaining,
    percent,
    warning: percent >= WARNING_THRESHOLD_PERCENT,
    blocked: percent >= 100,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisatie_id')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.organisatie_id) {
      return res.status(403).json({ error: 'Geen organisatie gevonden' })
    }

    const orgId = profile.organisatie_id
    const maand = getCurrentMonth()

    const { data: rows, error: queryError } = await supabase
      .from('ai_usage_org')
      .select('route, aantal_calls')
      .eq('organisatie_id', orgId)
      .eq('maand', maand)
      .in('route', [EXTRACT_ROUTE, ANALYZE_ROUTE])

    if (queryError) {
      console.error(`[inkoop-ai-usage] Query fout: ${queryError.message}`)
      return res.status(500).json({ error: 'Kon usage niet ophalen' })
    }

    const extractRow = rows?.find(r => r.route === EXTRACT_ROUTE)
    const analyzeRow = rows?.find(r => r.route === ANALYZE_ROUTE)

    return res.status(200).json({
      extract: buildRouteUsage(extractRow?.aantal_calls ?? 0, INKOOP_EXTRACT_MONTHLY_CAP),
      analyze: buildRouteUsage(analyzeRow?.aantal_calls ?? 0, INKOOP_OFFERTE_MONTHLY_CAP),
      maand,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error(`[inkoop-ai-usage] Uncaught: ${message}`)
    return res.status(500).json({ error: message })
  }
}
