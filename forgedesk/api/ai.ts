import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  if (process.env.VERCEL_ENV === 'production') console.error('ratelimit niet geconfigureerd: api/ai.ts')
  else console.warn('[ratelimit] UPSTASH env vars missing for ai, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '3600 s'), prefix: 'rl:ai', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] ai id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] ai id=${identifier} err=${(err as Error).message}`)
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

const MAANDEN_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december']

function resetTekst(): string {
  const nu = new Date()
  const volgende = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() + 1, 1))
  return `1 ${MAANDEN_NL[volgende.getUTCMonth()]}`
}

// Houd gelijk aan de DEFAULT van ai_usage_org.maandlimiet (migratie 161).
const STANDAARD_MAANDLIMIET_EUR = 15.0
const USD_NAAR_EUR = 0.92
// Sonnet 5: $2/M input, $10/M output.
const SONNET_INPUT_USD = 2
const SONNET_OUTPUT_USD = 10

function kolomOntbreekt(fout: { code?: string }): boolean {
  return fout.code === '42703' || fout.code === 'PGRST204'
}

async function haalMaandlimiet(
  organisatieId: string,
  maand: string
): Promise<{ limiet: number; betrouwbaar: boolean }> {
  const { data: org, error: orgFout } = await supabase
    .from('organisaties')
    .select('ai_maandlimiet')
    .eq('id', organisatieId)
    .maybeSingle()
  if (orgFout && !kolomOntbreekt(orgFout)) {
    console.error('haalMaandlimiet: organisatie onleesbaar', organisatieId, orgFout)
    return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: false }
  }
  const uitStaffel = Number(org?.ai_maandlimiet ?? NaN)
  if (Number.isFinite(uitStaffel) && uitStaffel >= 0) {
    return { limiet: uitStaffel, betrouwbaar: true }
  }

  const { data: rijen, error: rijenFout } = await supabase
    .from('ai_usage_org')
    .select('maandlimiet')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  if (rijenFout) {
    console.error('haalMaandlimiet: ai_usage_org onleesbaar', organisatieId, rijenFout)
    return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: false }
  }
  if (rijen && rijen.length > 0) {
    return {
      limiet: Math.max(...rijen.map(r => Number(r.maandlimiet ?? STANDAARD_MAANDLIMIET_EUR))),
      betrouwbaar: true,
    }
  }
  return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: true }
}

async function checkAIBudget(
  organisatieId: string,
  geschatteKosten: number
): Promise<{ geblokkeerd: boolean; reden?: string }> {
  const maand = getCurrentMonth()
  const { data: rows, error: verbruikFout } = await supabase
    .from('ai_usage_org')
    .select('geschatte_kosten')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  if (verbruikFout) {
    console.error('checkAIBudget: verbruik onleesbaar', organisatieId, verbruikFout)
  }
  const huidig = (rows ?? []).reduce((s, r) => s + Number(r.geschatte_kosten ?? 0), 0)
  const { limiet, betrouwbaar } = await haalMaandlimiet(organisatieId, maand)
  if (!verbruikFout && betrouwbaar && huidig + geschatteKosten > limiet) {
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

async function resolveOrgId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()
  return (data?.organisatie_id as string | null) ?? null
}

async function logOrgUsage(
  organisatieId: string,
  route: string,
  inputTokens: number,
  outputTokens: number,
  inputPrice: number,
  outputPrice: number
): Promise<void> {
  const maand = getCurrentMonth()
  const kostenDelta = ((inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice) * USD_NAAR_EUR
  const { error } = await supabase.rpc('ai_usage_org_bijschrijf', {
    p_organisatie_id: organisatieId,
    p_route: route,
    p_maand: maand,
    p_kosten: Number(kostenDelta.toFixed(4)),
    p_calls: 1,
  })
  if (error) console.error('logOrgUsage: bijschrijven mislukt', organisatieId, route, error)
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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

    const { messages, max_tokens: maxTokensRaw = 2000 } = req.body as { messages: ChatMessage[]; max_tokens?: number }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is verplicht' })
    }

    // max_tokens komt uit de client: server-side clampen zodat een trial-account
    // niet met een torenhoge waarde het Anthropic-tegoed kan leegtrekken.
    const max_tokens = Math.min(Math.max(1, Number(maxTokensRaw) || 2000), 2000)

    const orgIdForBudget = await resolveOrgId(userId)
    if (orgIdForBudget) {
      const budget = await checkAIBudget(orgIdForBudget, 0.01)
      if (budget.geblokkeerd) {
        return res.status(403).json({
          error: 'ai_budget_bereikt',
          bericht: `Het gedeelde AI-budget van je organisatie is op voor deze maand. Op ${resetTekst()} staat de teller weer op nul.`,
          redirect: '/instellingen?tab=daan-ai',
        })
      }
    }

    // Extract system prompt from messages
    const systemMessages = messages.filter((m: ChatMessage) => m.role === 'system')
    const nonSystemMessages = messages.filter((m: ChatMessage) => m.role !== 'system')
    const systemPrompt = systemMessages.map((m: ChatMessage) => m.content).join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        // Sonnet 5 zet adaptive thinking standaard aan; dat zou hier uit
        // hetzelfde max_tokens-budget komen en het antwoord afkappen.
        thinking: { type: 'disabled' },
        max_tokens,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: nonSystemMessages.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
      }),
      // AI-calls duren echt lang, dus ruim genomen: het doel is een hangende
      // verbinding afkappen, niet een langzaam-maar-werkend antwoord afbreken.
      signal: AbortSignal.timeout(90_000),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>
      if (response.status === 429) {
        const anthropicType = (errorData?.error as { type?: string } | undefined)?.type
        if (anthropicType === 'enforced_spend_limit') {
          console.error('[anthropic-spend-limit] ai: Anthropic-budget van doen. bereikt')
          return res.status(429).json({ error: 'AI-budget van doen. is bereikt, we zijn ermee bezig.', type: anthropicType })
        }
        return res.status(429).json({ error: 'Te veel verzoeken, probeer zo opnieuw.', type: anthropicType ?? 'rate_limit_error' })
      }
      if (response.status === 401) {
        return res.status(500).json({ error: 'Ongeldige Anthropic API key.' })
      }
      return res.status(response.status).json({
        error: (errorData?.error as Record<string, string>)?.message || 'Anthropic API fout',
      })
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
      usage: { input_tokens: number; output_tokens: number }
    }
    const resultText = data.content?.[0]?.text || ''

    if (orgIdForBudget && data.usage) {
      try {
        await logOrgUsage(orgIdForBudget, 'ai', data.usage.input_tokens, data.usage.output_tokens, SONNET_INPUT_USD, SONNET_OUTPUT_USD)
      } catch {
        // Org-usage tracking is niet-kritiek
      }
    }

    // Sla chat op in database (compatibel formaat)
    const lastUserMsg = messages[messages.length - 1]
    if (lastUserMsg?.role === 'user') {
      try {
        await supabase.from('ai_chats').insert([
          { user_id: userId, rol: 'user', bericht: lastUserMsg.content },
          { user_id: userId, rol: 'assistant', bericht: resultText },
        ])
      } catch {
        // Niet-kritiek als dit faalt
      }
    }

    // Return in compatible format for aiService.ts (choices array)
    return res.status(200).json({
      choices: [{ message: { content: resultText } }],
    })
  } catch (error: unknown) {
    console.error('AI API fout:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI verzoek mislukt' })
  }
}
