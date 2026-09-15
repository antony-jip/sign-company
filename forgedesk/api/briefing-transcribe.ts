import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Schrijft een ingesproken briefing-memo uit met OpenAI gpt-4o-transcribe.
 * Claude neemt geen audio aan, dus alleen deze stap loopt via OpenAI; de
 * bullets maakt Daan daarna via /api/ai.
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const USD_NAAR_EUR = 0.92
const STANDAARD_MAANDLIMIET_EUR = 15
const USD_PER_MINUUT = 0.006
const MAX_AUDIO_BYTES = 3_500_000
const MAX_SECONDEN = 600

// Woorden die spraakherkenning in de signbranche structureel verkeerd hoort.
// De prompt stuurt de spelling, niet de inhoud.
const VAKTERMEN_PROMPT =
  'Briefing voor een reclame- en signingbedrijf. Dibond, forex, plexiglas, acrylaat, alucobond, trespa, PVC, vinyl, folie, carwrap, belettering, doorlichtende letters, freesletters, opbouwletters, lichtbak, gevelbord, spandoek, banner, mesh, raamfolie, etsfolie, zandstraalfolie, laminaat, RAL 7016, Pantone, CMYK, LED, montage, hoogwerker, steiger, drukproef, vectorbestand, huisstijl.'

const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  if (process.env.VERCEL_ENV === 'production') console.error('ratelimit niet geconfigureerd: api/briefing-transcribe.ts')
  else console.warn('[ratelimit] UPSTASH env vars missing for briefing-transcribe, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(20, '60 s'), prefix: 'rl:briefing-transcribe', timeout: 1000 })
  : null

async function verifyUser(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user.id
}

function getCurrentMonth(): string {
  const nu = new Date()
  return `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, '0')}`
}

async function orgStatus(userId: string): Promise<{ orgId: string | null; geblokkeerd: boolean }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()
  const orgId = (profile?.organisatie_id as string | null) ?? null
  if (!orgId) return { orgId, geblokkeerd: false }

  const { data: rijen, error } = await supabase
    .from('ai_usage_org')
    .select('geschatte_kosten, maandlimiet')
    .eq('organisatie_id', orgId)
    .eq('maand', getCurrentMonth())
  // Een leesfout is geen bewijs dat het budget op is.
  if (error || !rijen || rijen.length === 0) return { orgId, geblokkeerd: false }
  const verbruikt = rijen.reduce((s, r) => s + Number(r.geschatte_kosten ?? 0), 0)
  const limiet = Math.max(...rijen.map(r => Number(r.maandlimiet ?? STANDAARD_MAANDLIMIET_EUR)))
  return { orgId, geblokkeerd: verbruikt >= limiet }
}

function extensieVoor(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
  // iOS neemt op als audio/mp4 (AAC); OpenAI herkent dat als m4a.
  return 'm4a'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    if (!userId) return res.status(401).json({ error: 'Log opnieuw in om in te spreken' })

    if (ratelimit) {
      try {
        const { success } = await ratelimit.limit(userId)
        if (!success) return res.status(429).json({ error: 'Even rustig aan, probeer het zo opnieuw' })
      } catch (err) {
        console.warn(`[ratelimit-error] briefing-transcribe err=${(err as Error).message}`)
      }
    }

    if (!OPENAI_API_KEY) {
      console.error('[briefing-transcribe] OPENAI_API_KEY ontbreekt')
      return res.status(503).json({ error: 'Inspreken is nog niet ingesteld' })
    }

    const body = (req.body ?? {}) as { audio?: string; mimeType?: string; seconden?: number }
    if (typeof body.audio !== 'string' || !body.audio) {
      return res.status(400).json({ error: 'Geen opname ontvangen' })
    }
    const audio = Buffer.from(body.audio, 'base64')
    if (audio.length === 0) return res.status(400).json({ error: 'Geen opname ontvangen' })
    if (audio.length > MAX_AUDIO_BYTES) return res.status(413).json({ error: 'Memo te lang, houd het onder de vijf minuten' })

    const { orgId, geblokkeerd } = await orgStatus(userId)
    if (geblokkeerd) return res.status(402).json({ error: 'De AI-maandlimiet van je organisatie is bereikt' })

    const mimeType = String(body.mimeType || 'audio/mp4').split(';')[0]
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), `memo.${extensieVoor(mimeType)}`)
    form.append('model', 'gpt-4o-transcribe')
    form.append('language', 'nl')
    form.append('prompt', VAKTERMEN_PROMPT)
    form.append('response_format', 'json')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(55_000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('[briefing-transcribe] OpenAI', response.status, detail.slice(0, 500))
      return res.status(502).json({ error: 'Uitschrijven mislukt, probeer het opnieuw' })
    }

    const data = await response.json() as { text?: string }
    const tekst = (data.text || '').trim()
    res.status(200).json({ tekst })

    // OpenAI rekent per minuut audio; de duur komt van de client en is
    // begrensd, zodat een verkeerde waarde de teller niet kan opblazen.
    if (orgId) {
      const seconden = Math.min(Math.max(Number(body.seconden) || 60, 1), MAX_SECONDEN)
      const kosten = (seconden / 60) * USD_PER_MINUUT * USD_NAAR_EUR
      const { error } = await supabase.rpc('ai_usage_org_bijschrijf', {
        p_organisatie_id: orgId,
        p_route: 'briefing-transcribe',
        p_maand: getCurrentMonth(),
        p_kosten: Number(kosten.toFixed(6)),
        p_calls: 1,
      })
      if (error) console.error('[briefing-transcribe] verbruik bijschrijven mislukt', orgId, error)
    }
    return
  } catch (error: unknown) {
    console.error('[briefing-transcribe] fout', error)
    if (!res.headersSent) return res.status(500).json({ error: 'Uitschrijven mislukt, probeer het opnieuw' })
    return
  }
}
