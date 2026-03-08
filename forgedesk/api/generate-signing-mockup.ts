import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { fal } from '@fal-ai/client'

const FAL_API_KEY = process.env.FAL_AI_API_KEY || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function getMimeType(base64Header: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  if (base64Header.includes('image/png')) return 'image/png'
  if (base64Header.includes('image/webp')) return 'image/webp'
  if (base64Header.includes('image/gif')) return 'image/gif'
  return 'image/jpeg'
}

function extractBase64Data(input: string): { data: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' } {
  if (input.startsWith('data:')) {
    const [header, data] = input.split(',')
    return { data, mimeType: getMimeType(header) }
  }
  return { data: input, mimeType: 'image/jpeg' }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType })
}

// Step 1: Claude analyzes photos + user description → creates optimized fal.ai prompt
async function generatePromptWithClaude(
  gebouwBase64: string,
  gebouwMime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
  logoBase64: string | null,
  logoMime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | null,
  beschrijving: string,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  const imageContent: Anthropic.ImageBlockParam[] = [
    {
      type: 'image',
      source: { type: 'base64', media_type: gebouwMime, data: gebouwBase64 },
    },
  ]

  if (logoBase64 && logoMime) {
    imageContent.push({
      type: 'image',
      source: { type: 'base64', media_type: logoMime, data: logoBase64 },
    })
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: `Je bent een expert signing/reclame specialist. Je helpt een reclamemaker een AI-mockup te genereren.

${logoBase64 ? 'De eerste foto is het gebouw/pand waar de signing op moet komen. De tweede foto is het logo/artwork dat geplaatst moet worden.' : 'De foto is het gebouw/pand waar de signing op moet komen.'}

De klant wil dit: "${beschrijving}"

Analyseer de foto('s) en maak een gedetailleerde prompt voor een AI image editor (fal.ai Nano Banana 2) die de signing realistisch op het gebouw plaatst.

Regels voor je prompt:
- Schrijf in het Engels (de AI werkt het best in Engels)
- Beschrijf EXACT waar op het gebouw de signing moet komen (boven de deur, op de gevel, etc.)
- Beschrijf het type signing (LED doosletters, neon, freesletters, lichtbak, etc.)
- Beschrijf de kleur, materiaal en stijl
- Zorg dat de belichting matched met de foto
- Het resultaat moet eruitzien als een professionele architectuurvisualisatie
- Houd het gebouw 100% intact, alleen de signing toevoegen
- Als er een logo is, beschrijf hoe het logo wordt weergegeven

Geef ALLEEN de prompt terug, geen uitleg of andere tekst.`,
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  return textBlock?.text || ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!FAL_API_KEY) {
      return res.status(500).json({
        error: 'FAL_AI_API_KEY niet geconfigureerd. Voeg FAL_AI_API_KEY toe aan Vercel Environment Variables.',
      })
    }

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'ANTHROPIC_API_KEY niet geconfigureerd. Voeg ANTHROPIC_API_KEY toe aan Vercel Environment Variables.',
      })
    }

    fal.config({ credentials: FAL_API_KEY })

    const { gebouw_foto_base64, logo_base64, beschrijving } = req.body as {
      gebouw_foto_base64: string
      logo_base64?: string
      beschrijving: string
    }

    if (!gebouw_foto_base64 || !beschrijving) {
      return res.status(400).json({ error: 'Foto en beschrijving zijn verplicht' })
    }

    // Extract base64 data
    const gebouwData = extractBase64Data(gebouw_foto_base64)
    const gebouwBlob = base64ToBlob(gebouwData.data, gebouwData.mimeType)
    if (gebouwBlob.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'Foto is groter dan 10MB' })
    }

    let logoData: { data: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' } | null = null
    if (logo_base64) {
      logoData = extractBase64Data(logo_base64)
      const logoBlob = base64ToBlob(logoData.data, logoData.mimeType)
      if (logoBlob.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'Logo is groter dan 10MB' })
      }
    }

    const startTime = Date.now()

    // Step 1: Claude generates optimized prompt
    const optimizedPrompt = await generatePromptWithClaude(
      gebouwData.data,
      gebouwData.mimeType,
      logoData?.data || null,
      logoData?.mimeType || null,
      beschrijving,
    )

    if (!optimizedPrompt) {
      return res.status(502).json({ error: 'Claude kon geen prompt genereren' })
    }

    // Step 2: Upload images to fal storage
    const gebouwUrl = await fal.storage.upload(gebouwBlob)
    const imageUrls = [gebouwUrl]

    if (logo_base64 && logoData) {
      const logoBlob = base64ToBlob(logoData.data, logoData.mimeType)
      const logoUrl = await fal.storage.upload(logoBlob)
      imageUrls.push(logoUrl)
    }

    // Step 3: Generate mockup with fal.ai
    const result = await fal.subscribe('fal-ai/nano-banana-2/edit', {
      input: {
        prompt: optimizedPrompt,
        image_urls: imageUrls,
        image_size: { width: 2048, height: 2048 },
      },
      logs: true,
    })

    const generatieTijdMs = Date.now() - startTime

    // Extract result URL
    const outputImages = result.data.images as Array<{ url: string }> | undefined
    const resultaatUrl = outputImages?.[0]?.url
      || (result.data.image as { url: string } | undefined)?.url
      || ''

    if (!resultaatUrl) {
      return res.status(502).json({ error: 'Geen resultaat ontvangen van fal.ai' })
    }

    return res.status(200).json({
      url: resultaatUrl,
      fal_request_id: result.requestId,
      generatie_tijd_ms: generatieTijdMs,
      api_kosten_usd: 0.12,
      prompt_gebruikt: optimizedPrompt,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Signing mockup generation error:', message)

    if (message.includes('timeout') || message.includes('Timeout')) {
      return res.status(504).json({ error: 'Generatie timeout — probeer het opnieuw' })
    }

    return res.status(502).json({
      error: `Fout bij generatie: ${message}`,
    })
  }
}
