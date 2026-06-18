import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(40, '3600 s'), prefix: 'rl:visualizer-chat', timeout: 2000 })
  : null

interface ChatMessage {
  rol: 'user' | 'assistant'
  tekst: string
}

async function verifyUser(req: VercelRequest): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return 'local'
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY niet geconfigureerd' })
  }

  const userId = await verifyUser(req)
  if (!userId) return res.status(401).json({ error: 'Niet geautoriseerd' })

  if (ratelimit) {
    try {
      const { success } = await ratelimit.limit(userId)
      if (!success) return res.status(429).json({ error: 'Te veel berichten. Probeer het later opnieuw.' })
    } catch { /* rate limiter down — laat door */ }
  }

  const { berichten } = req.body as { berichten: ChatMessage[] }
  if (!Array.isArray(berichten) || berichten.length === 0) {
    return res.status(400).json({ error: 'Geen berichten meegegeven' })
  }

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `Je bent de visualisatie-assistent binnen doen., de bedrijfssoftware van een professioneel signing/reclamebedrijf (sinds 1983). Je helpt de gebruiker meedenken over signing- en reclame-ideeën: gevelletters, lichtreclame (LED doosletters, neon, lichtbakken), freesletters, voertuigbestickering, banners en interieur-signing.

Stijl: Nederlands, vlot en to-the-point, geen onnodige opsommingen. Geen emoji. Denk mee als een ervaren vakman: stel waar nuttig één gerichte verduidelijkende vraag.

Belangrijk: als de gebruiker het ontwerp wil zíén, leg dan uit dat ze een foto kunnen toevoegen (met de +-knop) — dan genereer je een realistische visualisatie. Verzin zelf geen afbeeldingen; jij geeft hier alleen advies in tekst.`,
      messages: berichten.map(b => ({
        role: b.rol === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: b.tekst,
      })),
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const tekst = (textBlock && 'text' in textBlock ? textBlock.text : '').trim()
    return res.status(200).json({ tekst: tekst || 'Sorry, ik kon even geen antwoord formuleren. Probeer het opnieuw.' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Visualizer chat error:', message)
    return res.status(502).json({ error: `Fout bij antwoord: ${message}` })
  }
}
