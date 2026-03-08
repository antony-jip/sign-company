import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { fal } from '@fal-ai/client'

const FAL_API_KEY = process.env.FAL_AI_API_KEY || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

type MimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

function getMimeType(base64Header: string): MimeType {
  if (base64Header.includes('image/png')) return 'image/png'
  if (base64Header.includes('image/webp')) return 'image/webp'
  if (base64Header.includes('image/gif')) return 'image/gif'
  return 'image/jpeg'
}

function extractBase64Data(input: string): { data: string; mimeType: MimeType } {
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

// Ratio presets → pixel sizes voor fal.ai
const RATIO_SIZES: Record<string, { width: number; height: number }> = {
  '1:1':   { width: 2048, height: 2048 },
  '4:3':   { width: 2048, height: 1536 },
  '3:4':   { width: 1536, height: 2048 },
  '16:9':  { width: 2048, height: 1152 },
  '9:16':  { width: 1152, height: 2048 },
  '3:2':   { width: 2048, height: 1365 },
  '2:3':   { width: 1365, height: 2048 },
  '21:9':  { width: 2048, height: 878 },
}

interface ChatMessage {
  rol: 'user' | 'assistant'
  tekst: string
}

// Claude analyzes photos + description → creates optimized fal.ai prompt
// Now supports: signing on buildings, vehicle wraps, design-to-photo, etc.
async function generatePromptWithClaude(
  fotoBase64: string,
  fotoMime: MimeType,
  logoBase64: string | null,
  logoMime: MimeType | null,
  beschrijving: string,
  chatGeschiedenis: ChatMessage[],
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  const imageContent: Anthropic.ImageBlockParam[] = [
    {
      type: 'image',
      source: { type: 'base64', media_type: fotoMime, data: fotoBase64 },
    },
  ]

  if (logoBase64 && logoMime) {
    imageContent.push({
      type: 'image',
      source: { type: 'base64', media_type: logoMime, data: logoBase64 },
    })
  }

  // Build chat context for refinements
  let chatContext = ''
  if (chatGeschiedenis.length > 0) {
    chatContext = `\n\nEERDERE CONVERSATIE (de gebruiker verfijnt het ontwerp iteratief):\n`
    for (const msg of chatGeschiedenis) {
      chatContext += `${msg.rol === 'user' ? 'Gebruiker' : 'AI'}: ${msg.tekst}\n`
    }
    chatContext += `\nDe gebruiker wil nu deze aanpassing: "${beschrijving}"\nHoud rekening met alle eerdere feedback en pas het ontwerp aan.\n`
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
            text: `Je bent een expert signing/reclame specialist bij een professioneel reclamebureau (sinds 1983). Je helpt AI-visualisaties te genereren voor klanten.

ANALYSEER EERST de aangeleverde foto('s) en bepaal het type opdracht:

A) GEBOUW/PAND SIGNING — Er is een foto van een gebouw/winkel/kantoor en de klant wil signing (gevelletters, lichtreclame, etc.) visualiseren
B) VOERTUIGBESTICKERING — Er is een foto van een voertuig (bus, auto, vrachtwagen) of een ontwerp/wrap-design dat op een voertuig geplaatst moet worden
C) ONTWERP-NAAR-FOTO — Er is een technische tekening, schets, of ontwerp (bijv. een voertuigwrap-mockup van meerdere kanten) dat tot leven gebracht moet worden als realistische foto
D) OVERIG — Andere signing/reclame visualisatie (vlaggen, banners, beursstands, interieur signing, etc.)

${logoBase64 ? 'De eerste foto is de referentie/huidige situatie. De tweede foto is het logo/artwork dat gebruikt moet worden.' : 'Er is één foto aangeleverd.'}

De klant wil dit: "${beschrijving}"${chatContext}

Maak een gedetailleerde prompt voor een AI image editor (fal.ai Nano Banana 2) die het gewenste resultaat realistisch genereert.

Regels voor je prompt:
- Schrijf in het Engels (de AI werkt het best in Engels)
- Bij type A: beschrijf exact waar op het gebouw de signing moet komen, het type (LED doosletters, neon, freesletters, lichtbak, etc.), kleur, materiaal en stijl. Houd het gebouw 100% intact.
- Bij type B: beschrijf de bestickering, positie op het voertuig, kleuren, en zorg voor een fotorealistische weergave
- Bij type C: beschrijf de scène alsof het een professionele productfoto is — het voertuig/object in een realistische omgeving, met correcte belichting en perspectief. Maak van het platte ontwerp een fotorealistische 3D weergave.
- Bij type D: pas de regels toe die het meest logisch zijn voor het type opdracht
- Zorg altijd dat de belichting en schaduwen realistisch zijn
- Het resultaat moet eruitzien als een professionele reclame/architectuurvisualisatie
- Als er een logo/artwork is, beschrijf hoe dat wordt geïntegreerd

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

    const {
      gebouw_foto_base64,
      logo_base64,
      beschrijving,
      ratio,
      chat_geschiedenis,
    } = req.body as {
      gebouw_foto_base64: string
      logo_base64?: string
      beschrijving: string
      ratio?: string
      chat_geschiedenis?: ChatMessage[]
    }

    if (!gebouw_foto_base64 || !beschrijving) {
      return res.status(400).json({ error: 'Foto en beschrijving zijn verplicht' })
    }

    // Extract base64 data
    const fotoData = extractBase64Data(gebouw_foto_base64)
    const fotoBlob = base64ToBlob(fotoData.data, fotoData.mimeType)
    if (fotoBlob.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'Foto is groter dan 10MB' })
    }

    let logoData: { data: string; mimeType: MimeType } | null = null
    if (logo_base64) {
      logoData = extractBase64Data(logo_base64)
      const logoBlob = base64ToBlob(logoData.data, logoData.mimeType)
      if (logoBlob.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'Logo is groter dan 10MB' })
      }
    }

    const startTime = Date.now()

    // Step 1: Claude generates optimized prompt (with chat history for refinements)
    const optimizedPrompt = await generatePromptWithClaude(
      fotoData.data,
      fotoData.mimeType,
      logoData?.data || null,
      logoData?.mimeType || null,
      beschrijving,
      chat_geschiedenis || [],
    )

    if (!optimizedPrompt) {
      return res.status(502).json({ error: 'Claude kon geen prompt genereren' })
    }

    // Step 2: Upload images to fal storage
    const fotoUrl = await fal.storage.upload(fotoBlob)
    const imageUrls = [fotoUrl]

    if (logo_base64 && logoData) {
      const logoBlob = base64ToBlob(logoData.data, logoData.mimeType)
      const logoUrl = await fal.storage.upload(logoBlob)
      imageUrls.push(logoUrl)
    }

    // Step 3: Determine image size from ratio
    const imageSize = RATIO_SIZES[ratio || ''] || RATIO_SIZES['1:1']

    // Step 4: Generate mockup with fal.ai
    const result = await fal.subscribe('fal-ai/nano-banana-2/edit', {
      input: {
        prompt: optimizedPrompt,
        image_urls: imageUrls,
        image_size: imageSize,
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
