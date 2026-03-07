import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
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

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'Anthropic API key niet geconfigureerd. Voeg ANTHROPIC_API_KEY toe aan environment variables.',
      })
    }

    const { messages, max_tokens = 2000 } = req.body as { messages: ChatMessage[]; max_tokens?: number }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is verplicht' })
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
        model: 'claude-sonnet-4-20250514',
        max_tokens,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: nonSystemMessages.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>
      if (response.status === 429) {
        return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
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
