import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fal } from '@fal-ai/client'

const FAL_API_KEY = process.env.FAL_AI_API_KEY || ''

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const KOSTEN_PER_RESOLUTIE_USD: Record<string, number> = {
  '1K': 0.08,
  '2K': 0.12,
  '4K': 0.16,
}

const RESOLUTIE_MAP: Record<string, { width: number; height: number }> = {
  '1K': { width: 1024, height: 1024 },
  '2K': { width: 2048, height: 2048 },
  '4K': { width: 4096, height: 4096 },
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType })
}

function getMimeType(base64Header: string): string {
  if (base64Header.includes('image/png')) return 'image/png'
  if (base64Header.includes('image/webp')) return 'image/webp'
  if (base64Header.includes('image/jpeg') || base64Header.includes('image/jpg')) return 'image/jpeg'
  return 'image/jpeg'
}

function extractBase64Data(input: string): { data: string; mimeType: string } {
  if (input.startsWith('data:')) {
    const [header, data] = input.split(',')
    return { data, mimeType: getMimeType(header) }
  }
  return { data: input, mimeType: 'image/jpeg' }
}

function validateImageType(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
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

    fal.config({ credentials: FAL_API_KEY })

    const { gebouw_foto_base64, logo_base64, prompt, resolutie = '2K' } = req.body as {
      gebouw_foto_base64: string
      logo_base64?: string
      prompt: string
      resolutie: '1K' | '2K' | '4K'
    }

    if (!gebouw_foto_base64 || !prompt) {
      return res.status(400).json({ error: 'gebouw_foto_base64 en prompt zijn verplicht' })
    }

    // Validate & extract base64 data
    const gebouwData = extractBase64Data(gebouw_foto_base64)
    if (!validateImageType(gebouwData.mimeType)) {
      return res.status(400).json({ error: 'Ongeldig bestandstype. Alleen JPG, PNG en WEBP zijn toegestaan.' })
    }

    // Check file size
    const gebouwBlob = base64ToBlob(gebouwData.data, gebouwData.mimeType)
    if (gebouwBlob.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'Bestandsgrootte overschrijdt 10MB limiet.' })
    }

    const startTime = Date.now()

    // Upload images to fal storage
    const gebouwUrl = await fal.storage.upload(gebouwBlob)

    const imageUrls = [gebouwUrl]

    if (logo_base64) {
      const logoData = extractBase64Data(logo_base64)
      if (!validateImageType(logoData.mimeType)) {
        return res.status(400).json({ error: 'Ongeldig logo bestandstype. Alleen JPG, PNG en WEBP zijn toegestaan.' })
      }
      const logoBlob = base64ToBlob(logoData.data, logoData.mimeType)
      if (logoBlob.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'Logo bestandsgrootte overschrijdt 10MB limiet.' })
      }
      const logoUrl = await fal.storage.upload(logoBlob)
      imageUrls.push(logoUrl)
    }

    const imageSize = RESOLUTIE_MAP[resolutie] || RESOLUTIE_MAP['2K']

    // Generate via fal.ai
    const result = await fal.subscribe('fal-ai/nano-banana-2/edit', {
      input: {
        prompt,
        image_urls: imageUrls,
        image_size: imageSize,
      },
      logs: true,
    })

    const generatieTijdMs = Date.now() - startTime
    const apiKostenUsd = KOSTEN_PER_RESOLUTIE_USD[resolutie] || KOSTEN_PER_RESOLUTIE_USD['2K']

    // Extract result URL from response
    const outputImages = result.data.images as Array<{ url: string }> | undefined
    const resultaatUrl = outputImages?.[0]?.url
      || (result.data.image as { url: string } | undefined)?.url
      || ''

    if (!resultaatUrl) {
      return res.status(502).json({ error: 'Geen resultaat ontvangen van fal.ai API' })
    }

    return res.status(200).json({
      resultaat_url: resultaatUrl,
      fal_request_id: result.requestId,
      generatie_tijd_ms: generatieTijdMs,
      api_kosten_usd: apiKostenUsd,
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
