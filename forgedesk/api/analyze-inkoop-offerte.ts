import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import * as Sentry from '@sentry/node'

if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  })
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ROUTE_NAME = 'analyze-inkoop-offerte'
const INKOOP_OFFERTE_MONTHLY_CAP = 100

// Anthropic pricing per 1M tokens — Sonnet 4.6 (verifieer bij prijswijziging)
// Bron: https://www.anthropic.com/pricing — laatst gecheckt: 2026-05-10
const SONNET_46_INPUT_PRICE = 3
const SONNET_46_OUTPUT_PRICE = 15

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for analyze-inkoop-offerte, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:analyze-inkoop-offerte', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] analyze-inkoop-offerte id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] analyze-inkoop-offerte id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

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

async function checkOrgCap(orgId: string): Promise<{ allowed: boolean; current: number; cap: number }> {
  const maand = getCurrentMonth()
  const { data } = await supabase
    .from('ai_usage_org')
    .select('aantal_calls')
    .eq('organisatie_id', orgId)
    .eq('route', ROUTE_NAME)
    .eq('maand', maand)
    .maybeSingle()
  const current = data?.aantal_calls ?? 0
  return { allowed: current < INKOOP_OFFERTE_MONTHLY_CAP, current, cap: INKOOP_OFFERTE_MONTHLY_CAP }
}

async function incrementOrgUsage(orgId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const maand = getCurrentMonth()
  const kosten = (inputTokens / 1_000_000) * SONNET_46_INPUT_PRICE + (outputTokens / 1_000_000) * SONNET_46_OUTPUT_PRICE

  const { data: existing } = await supabase
    .from('ai_usage_org')
    .select('id, aantal_calls, geschatte_kosten')
    .eq('organisatie_id', orgId)
    .eq('route', ROUTE_NAME)
    .eq('maand', maand)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('ai_usage_org')
      .update({
        aantal_calls: (existing.aantal_calls || 0) + 1,
        geschatte_kosten: Number((Number(existing.geschatte_kosten || 0) + kosten).toFixed(4)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('ai_usage_org')
      .insert({
        organisatie_id: orgId,
        route: ROUTE_NAME,
        maand,
        aantal_calls: 1,
        geschatte_kosten: Number(kosten.toFixed(4)),
      })
  }
}

// Inline budget-check — niet verplaatsen naar helper (Vercel constraint)
async function checkAIBudget(
  organisatieId: string,
  geschatteKosten: number
): Promise<{ geblokkeerd: boolean; reden?: string }> {
  const maand = getCurrentMonth()
  const { data: rows } = await supabase
    .from('ai_usage_org')
    .select('geschatte_kosten, maandlimiet')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  const huidig = (rows ?? []).reduce((s, r) => s + Number(r.geschatte_kosten ?? 0), 0)
  const limiet = rows && rows.length > 0
    ? Math.max(...rows.map(r => Number(r.maandlimiet ?? 10)))
    : 10
  if (huidig + geschatteKosten > limiet) {
    await supabase
      .from('ai_usage_org')
      .update({ geblokkeerd_op: new Date().toISOString() })
      .eq('organisatie_id', organisatieId)
      .eq('maand', maand)
      .is('geblokkeerd_op', null)
    return { geblokkeerd: true, reden: 'maandlimiet_bereikt' }
  }
  return { geblokkeerd: false }
}

async function markCapHit(orgId: string): Promise<void> {
  const maand = getCurrentMonth()
  const { data: updated } = await supabase
    .from('ai_usage_org')
    .update({ eerste_cap_hit_op: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('organisatie_id', orgId)
    .eq('route', ROUTE_NAME)
    .eq('maand', maand)
    .is('eerste_cap_hit_op', null)
    .select('id')

  if (updated && updated.length > 0) {
    try {
      Sentry.captureMessage('inkoop_ai_cap_hit', {
        level: 'warning',
        tags: { route: ROUTE_NAME, organisatie_id: orgId, maand },
      })
    } catch {
      // Sentry-fout mag de cap-flow niet breken
    }
  }
}

interface GeextraheerdeRegel {
  omschrijving: string
  aantal: number
  eenheid?: string
  prijs_per_stuk: number
  totaal: number
  confidence: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!(await enforceRateLimit(userId, res))) return

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'Anthropic API key niet geconfigureerd. Voeg ANTHROPIC_API_KEY toe aan environment variables.',
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisatie_id')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.organisatie_id) {
      return res.status(403).json({ error: 'Geen organisatie gevonden' })
    }

    const orgId = profile.organisatie_id

    const budget = await checkAIBudget(orgId, 0.01)
    if (budget.geblokkeerd) {
      return res.status(403).json({
        error: 'ai_budget_bereikt',
        bericht: 'Je maandbudget voor AI is bereikt. Koop extra credits om door te gaan.',
        redirect: '/instellingen?tab=daan-ai',
      })
    }

    const cap = await checkOrgCap(orgId)
    if (!cap.allowed) {
      await markCapHit(orgId).catch(() => { /* niet-kritiek */ })
      return res.status(429).json({
        error: 'AI-limiet bereikt',
        message: `Je organisatie heeft de maandlimiet (${cap.cap}) voor AI-analyse van offertes bereikt. Mail hello@doen.team om te verhogen.`,
      })
    }

    const { bestand_base64, bestand_type, leverancier } = req.body as {
      bestand_base64: string
      bestand_type: 'pdf' | 'image'
      leverancier?: string
    }

    if (!bestand_base64 || !bestand_type) {
      return res.status(400).json({ error: 'bestand_base64 en bestand_type zijn verplicht' })
    }

    // Strip data URI prefix if present
    const base64Data = bestand_base64.includes(',')
      ? bestand_base64.split(',')[1]
      : bestand_base64

    // Controleer bestandsgrootte (base64 is ~33% groter dan binair)
    const estimatedBytes = Math.ceil(base64Data.length * 3 / 4)
    if (estimatedBytes > MAX_FILE_SIZE) {
      return res.status(400).json({ error: `Bestand is te groot (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` })
    }

    const systemPrompt =
      'Je bent een expert in het uitlezen van leveranciers offertes. ' +
      'Extraheer alle regelitems en geef ALLEEN een JSON array terug zonder uitleg: ' +
      '[{ "omschrijving": string, "aantal": number, "eenheid": string, "prijs_per_stuk": number, "totaal": number, "confidence": number }] ' +
      'confidence is een getal tussen 0 en 1 — gebruik <0.7 als de prijs onduidelijk is. ' +
      'Alle bedragen zijn exclusief BTW.'

    // Build content block based on file type
    let contentBlock: Record<string, unknown>
    if (bestand_type === 'image') {
      // Detect mime type from base64 header or default to jpeg
      let mediaType = 'image/jpeg'
      if (bestand_base64.startsWith('data:')) {
        const match = bestand_base64.match(/^data:(image\/\w+);/)
        if (match) mediaType = match[1]
      }
      contentBlock = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      }
    } else {
      contentBlock = {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64Data,
        },
      }
    }

    const userMessage = leverancier
      ? `Lees deze offerte van leverancier "${leverancier}" uit en extraheer alle regels.`
      : 'Lees deze offerte uit en extraheer alle regels.'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              { type: 'text', text: userMessage },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>
      return res.status(response.status).json({
        error: (errorData?.error as Record<string, string>)?.message || 'Anthropic API fout',
      })
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
      usage?: { input_tokens: number; output_tokens: number }
    }

    if (data.usage) {
      try {
        await incrementOrgUsage(orgId, data.usage.input_tokens, data.usage.output_tokens)
      } catch (err) {
        console.warn(`[analyze-inkoop-offerte] Usage tracking faalde: ${(err as Error).message}`)
      }
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text || '[]'

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = textContent.trim()
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    let regels: GeextraheerdeRegel[]
    try {
      regels = JSON.parse(jsonStr)
    } catch {
      return res.status(500).json({ error: 'Kon de response niet als JSON verwerken', raw: textContent })
    }

    return res.status(200).json({
      regels,
      leverancier_naam: leverancier || '',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return res.status(500).json({ error: message })
  }
}
