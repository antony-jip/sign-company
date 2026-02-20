import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
)

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'OpenAI API key niet geconfigureerd. Voeg OPENAI_API_KEY toe aan environment variables.',
      })
    }

    const { messages, model = 'gpt-4o-mini', max_tokens = 2000 } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is verplicht' })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, max_tokens, temperature: 0.7 }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (response.status === 429) {
        return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
      }
      if (response.status === 401) {
        return res.status(500).json({ error: 'Ongeldige OpenAI API key.' })
      }
      return res.status(response.status).json({
        error: (errorData as any)?.error?.message || 'OpenAI API fout',
      })
    }

    const data = await response.json()

    // Sla chat op in database
    const lastUserMsg = messages[messages.length - 1]
    if (lastUserMsg?.role === 'user') {
      await supabase.from('ai_chats').insert([
        { user_id: userId, rol: 'user', bericht: lastUserMsg.content },
        { user_id: userId, rol: 'assistant', bericht: data.choices?.[0]?.message?.content || '' },
      ]).catch(() => {}) // Niet-kritiek als dit faalt
    }

    return res.status(200).json(data)
  } catch (error: any) {
    console.error('AI API fout:', error)
    return res.status(500).json({ error: error.message || 'AI verzoek mislukt' })
  }
}
