import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
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
    await verifyUser(req)

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'Anthropic API key niet geconfigureerd. Voeg ANTHROPIC_API_KEY toe aan environment variables.',
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
