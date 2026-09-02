/**
 * Geeft een bezoeker een sessie in de demo-omgeving, zonder account en zonder
 * wachtwoord. De /demo-pagina roept dit aan en wisselt het token in voor een
 * sessie.
 *
 * We genereren server-side een magic-link-token in plaats van in te loggen met
 * een wachtwoord. Zo staat er geen inloggegeven in de client-bundel en wordt er
 * ook geen mail verstuurd: alleen het token gaat over de lijn.
 *
 * Iedereen deelt dezelfde demo-organisatie, dus bezoekers zien elkaars
 * wijzigingen. Dat is bewust: het houdt de demo levend. De nachtelijke reset
 * (api/cron-demo-reset.ts) zet alles weer terug.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const DEMO_EMAIL = 'hello@doen.team'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Zonder rem kan iemand hier ongelimiteerd sessies uit trekken. Vijf per IP per
// uur is ruim voor een mens die de demo bekijkt en krap voor een script.
const limiter =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(5, '1 h'),
        prefix: 'demo-sessie',
      })
    : null

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    (req.socket?.remoteAddress ?? 'onbekend')

  if (limiter) {
    const { success } = await limiter.limit(ip)
    if (!success) {
      return res.status(429).json({ error: 'Te veel aanvragen. Probeer het over een uur opnieuw.' })
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Demo is niet geconfigureerd' })
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: DEMO_EMAIL,
    })

    if (error || !data?.properties?.hashed_token) {
      return res.status(500).json({ error: 'Demo-sessie aanmaken mislukt' })
    }

    return res.status(200).json({
      token_hash: data.properties.hashed_token,
      email: DEMO_EMAIL,
    })
  } catch {
    return res.status(500).json({ error: 'Demo-sessie aanmaken mislukt' })
  }
}
