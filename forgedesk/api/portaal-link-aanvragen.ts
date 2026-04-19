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
  console.warn('[ratelimit] UPSTASH env vars missing for portaal-link-aanvragen, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(3, '3600 s'), prefix: 'rl:portaal-link-aanvragen' })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
  if (success) return true
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  console.warn(`[ratelimit-hit] portaal-link-aanvragen id=${identifier} limit=${limit}`)
  res.setHeader('Retry-After', String(retryAfter))
  res.setHeader('X-RateLimit-Limit', String(limit))
  res.setHeader('X-RateLimit-Remaining', String(remaining))
  res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
  return false
}

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  if (Array.isArray(fwd)) return fwd[0]
  return 'unknown'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!(await enforceRateLimit(getClientIp(req), res))) return

  try {
    const { token, email } = req.body as { token: string; email: string }

    if (!token || !email) {
      return res.status(400).json({ error: 'Token en email zijn verplicht' })
    }

    // Basis email validatie
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Ongeldig email adres' })
    }

    // Zoek portaal op basis van token
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, project_id, user_id')
      .eq('token', token)
      .single()

    if (!portaal) {
      // Geef altijd succes terug om geen info te lekken
      return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
    }

    // Haal klant email op via project
    const { data: project } = await supabaseAdmin
      .from('projecten')
      .select('klant_id')
      .eq('id', portaal.project_id)
      .single()

    if (!project?.klant_id) {
      return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
    }

    // Controleer of email overeenkomt met klant
    const { data: klant } = await supabaseAdmin
      .from('klanten')
      .select('email')
      .eq('id', project.klant_id)
      .single()

    if (!klant || klant.email?.toLowerCase() !== email.toLowerCase()) {
      // Geef altijd succes terug om geen info te lekken
      return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
    }

    // Email matcht — maak notificatie aan voor de eigenaar
    await supabaseAdmin
      .from('app_notificaties')
      .insert({
        user_id: portaal.user_id,
        type: 'herinnering',
        titel: 'Nieuwe portaallink aangevraagd',
        bericht: `Een klant (${email}) heeft een nieuwe portaallink aangevraagd.`,
        link: `/projecten/${portaal.project_id}?tab=portaal`,
        project_id: portaal.project_id,
      })

    return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
  } catch (error) {
    console.error('portaal-link-aanvragen error:', error)
    return res.status(500).json({ error: 'Er ging iets mis. Probeer het later opnieuw.' })
  }
}
