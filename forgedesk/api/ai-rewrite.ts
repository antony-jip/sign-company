import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const MONTHLY_LIMIT = 5.0

// Rewrite actions with Dutch prompts
const ACTIONS: Record<string, { label: string; prompt: string }> = {
  'beknopt': {
    label: 'Maak beknopt',
    prompt: 'Maak deze tekst korter en bondiger. Behoud de kernboodschap. Antwoord ALLEEN met de herschreven tekst, geen uitleg.',
  },
  'uitgebreid': {
    label: 'Maak uitgebreider',
    prompt: 'Maak deze tekst uitgebreider met meer detail en context. Antwoord ALLEEN met de herschreven tekst, geen uitleg.',
  },
  'professioneel': {
    label: 'Professioneler',
    prompt: 'Herschrijf deze tekst professioneler en zakelijker. Antwoord ALLEEN met de herschreven tekst, geen uitleg.',
  },
  'informeel': {
    label: 'Informeler',
    prompt: 'Herschrijf deze tekst informeler en persoonlijker, maar nog steeds respectvol. Antwoord ALLEEN met de herschreven tekst, geen uitleg.',
  },
  'humor': {
    label: 'Voeg humor toe',
    prompt: 'Herschrijf deze tekst met een vleugje humor, maar houd het professioneel. Antwoord ALLEEN met de herschreven tekst, geen uitleg.',
  },
  'informatief': {
    label: 'Meer informatief',
    prompt: 'Herschrijf deze tekst zodat het informatiever en leerzamer is. Voeg relevante details toe. Antwoord ALLEEN met de herschreven tekst, geen uitleg.',
  },
  'taalcheck': {
    label: 'Verbeter taal',
    prompt: 'Corrigeer spelling, grammatica en zinsbouw in deze tekst. Verbeter de leesbaarheid. Antwoord ALLEEN met de gecorrigeerde tekst, geen uitleg.',
  },
  'vertaal-en': {
    label: 'Vertaal naar Engels',
    prompt: 'Vertaal deze tekst naar het Engels. Behoud de toon en stijl. Antwoord ALLEEN met de vertaling, geen uitleg.',
  },
  'vertaal-nl': {
    label: 'Vertaal naar Nederlands',
    prompt: 'Vertaal deze tekst naar het Nederlands. Behoud de toon en stijl. Antwoord ALLEEN met de vertaling, geen uitleg.',
  },
  'custom': {
    label: 'Eigen instructie',
    prompt: '', // filled dynamically
  },
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

async function getToneOfVoice(userId: string): Promise<string> {
  const { data } = await supabase
    .from('app_settings')
    .select('ai_tone_of_voice')
    .eq('user_id', userId)
    .single()
  return data?.ai_tone_of_voice || ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI niet geconfigureerd', configured: false })
    }

    const { action, text, customInstruction } = req.body

    if (!action || !text) {
      return res.status(400).json({ error: 'Action en text zijn verplicht' })
    }

    const actionConfig = ACTIONS[action]
    if (!actionConfig) {
      return res.status(400).json({ error: `Onbekende actie: ${action}` })
    }

    const withinLimit = await checkUsageLimit(userId)
    if (!withinLimit) {
      return res.status(429).json({
        error: 'AI limiet bereikt',
        message: 'Je hebt het maximum van €5 aan AI-gebruik bereikt deze maand.',
      })
    }

    // Get user tone of voice
    const toneOfVoice = await getToneOfVoice(userId)

    // Build system prompt
    let systemPrompt = 'Je bent een schrijfassistent voor een Nederlands bedrijf. Je herschrijft teksten exact zoals gevraagd. Antwoord ALLEEN met de herschreven tekst, geen uitleg of inleiding.'
    if (toneOfVoice) {
      systemPrompt += `\n\nDe gebruiker heeft de volgende schrijfstijl/tone of voice:\n${toneOfVoice}\n\nPas deze stijl toe bij het herschrijven.`
    }

    // Build user prompt
    let userPrompt: string
    if (action === 'custom' && customInstruction) {
      userPrompt = `Pas de volgende instructie toe op de tekst: "${customInstruction}"\n\nTekst:\n${text}`
    } else {
      userPrompt = `${actionConfig.prompt}\n\nTekst:\n${text}`
    }

    // Use Haiku for fast, cheap rewrites
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>
      console.error('Anthropic API fout:', response.status, errorData)
      if (response.status === 429) {
        return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
      }
      return res.status(response.status).json({
        error: (errorData?.error as Record<string, string>)?.message || 'AI fout',
      })
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
      usage: { input_tokens: number; output_tokens: number }
    }
    const resultText = data.content?.[0]?.text || ''

    // Track usage (Haiku pricing: $1/1M input, $5/1M output)
    try {
      const haikuInputCost = data.usage.input_tokens / 1_000_000 * 1
      const haikuOutputCost = data.usage.output_tokens / 1_000_000 * 5
      const totalCost = haikuInputCost + haikuOutputCost
      // Store with actual cost calculation (override the generic updateUsage)
      const maand = getCurrentMonth()
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
            input_tokens: (existing.input_tokens || 0) + data.usage.input_tokens,
            output_tokens: (existing.output_tokens || 0) + data.usage.output_tokens,
            geschatte_kosten: Number(((existing.geschatte_kosten || 0) + totalCost).toFixed(4)),
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
            input_tokens: data.usage.input_tokens,
            output_tokens: data.usage.output_tokens,
            geschatte_kosten: Number(totalCost.toFixed(4)),
          })
      }
    } catch {
      // Usage tracking is niet-kritiek
    }

    return res.status(200).json({ result: resultText })
  } catch (error: unknown) {
    console.error('AI Rewrite API fout:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI verzoek mislukt' })
  }
}
