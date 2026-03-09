import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const MONTHLY_LIMIT = 5.0

const PROMPTS: Record<string, string> = {
  'rewrite-professional': 'Herschrijf deze email professioneler en zakelijker. Behoud de boodschap. Antwoord alleen met de herschreven tekst.\n\nEmail:\n{text}',
  'rewrite-shorter': 'Maak deze email korter en bondiger. Behoud de kernboodschap. Antwoord alleen met de kortere versie.\n\nEmail:\n{text}',
  'formalize': 'Herschrijf deze informele tekst als een zakelijke email in het Nederlands met aanhef en afsluiting. Antwoord alleen met de email tekst.\n\nInformele tekst:\n{text}',
  'write-followup': 'Schrijf een korte, beleefde follow-up email in het Nederlands. Er is {context} dagen geen reactie geweest. Niet opdringerig maar wel duidelijk. Antwoord alleen met de email tekst.\n\nOriginele email:\n{text}',
  'summarize': 'Vat deze email samen in 2-3 korte zinnen in het Nederlands. Antwoord alleen met de samenvatting.\n\nEmail:\n{text}',
  'translate-en': 'Vertaal deze email naar het Engels. Behoud de toon. Antwoord alleen met de vertaling.\n\nEmail:\n{text}',
  'translate-nl': 'Vertaal deze email naar het Nederlands. Behoud de toon. Antwoord alleen met de vertaling.\n\nEmail:\n{text}',
  'generate-reply': 'Schrijf een kort en professioneel antwoord op deze email in het Nederlands. Antwoord alleen met de reply-tekst.\n\nEmail:\n{text}',
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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

async function checkUsageLimit(userId: string): Promise<boolean> {
  const maand = getCurrentMonth()
  const { data } = await supabase
    .from('ai_usage')
    .select('geschatte_kosten')
    .eq('user_id', userId)
    .eq('maand', maand)
    .single()
  return !data || (data.geschatte_kosten ?? 0) < MONTHLY_LIMIT
}

async function updateUsage(userId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const maand = getCurrentMonth()
  const kosten = (inputTokens / 1_000_000 * 3) + (outputTokens / 1_000_000 * 15)

  const { data: existing } = await supabase
    .from('ai_usage')
    .select('id, aantal_calls, input_tokens, output_tokens, geschatte_kosten')
    .eq('user_id', userId)
    .eq('maand', maand)
    .single()

  if (existing) {
    await supabase
      .from('ai_usage')
      .update({
        aantal_calls: (existing.aantal_calls || 0) + 1,
        input_tokens: (existing.input_tokens || 0) + inputTokens,
        output_tokens: (existing.output_tokens || 0) + outputTokens,
        geschatte_kosten: Number(((existing.geschatte_kosten || 0) + kosten).toFixed(4)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('ai_usage')
      .insert({
        user_id: userId,
        maand,
        aantal_calls: 1,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        geschatte_kosten: Number(kosten.toFixed(4)),
      })
  }
}

async function getUsage(userId: string): Promise<{ geschatte_kosten: number }> {
  const maand = getCurrentMonth()
  const { data } = await supabase
    .from('ai_usage')
    .select('geschatte_kosten')
    .eq('user_id', userId)
    .eq('maand', maand)
    .single()
  return { geschatte_kosten: data?.geschatte_kosten ?? 0 }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI niet geconfigureerd', configured: false })
    }

    const { action, text, context, user_id: _uid } = req.body

    // GET usage action
    if (action === 'get-usage') {
      const usage = await getUsage(userId)
      return res.status(200).json({ usage: usage.geschatte_kosten, limiet: MONTHLY_LIMIT })
    }

    if (!action || !text) {
      return res.status(400).json({ error: 'Action en text zijn verplicht' })
    }

    const promptTemplate = PROMPTS[action]
    if (!promptTemplate) {
      return res.status(400).json({ error: `Onbekende actie: ${action}` })
    }

    // Check usage limit
    const withinLimit = await checkUsageLimit(userId)
    if (!withinLimit) {
      return res.status(429).json({
        error: 'Forgie limiet bereikt',
        message: 'Je hebt het maximum van €5 aan Forgie-gebruik bereikt deze maand.',
      })
    }

    // Build prompt
    const prompt = promptTemplate
      .replace('{text}', text)
      .replace('{context}', context || '7')

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>
      console.error('Anthropic API fout:', response.status, errorData)
      if (response.status === 429) {
        return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
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

    // Update usage tracking
    try {
      await updateUsage(userId, data.usage.input_tokens, data.usage.output_tokens)
    } catch {
      // Usage tracking is niet-kritiek
    }

    const currentUsage = await getUsage(userId).catch(() => ({ geschatte_kosten: 0 }))

    return res.status(200).json({
      result: resultText,
      usage: {
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens,
        geschatte_kosten: currentUsage.geschatte_kosten,
        limiet: MONTHLY_LIMIT,
      },
    })
  } catch (error: unknown) {
    console.error('AI Email API fout:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI verzoek mislukt' })
  }
}
