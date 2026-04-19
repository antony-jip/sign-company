import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { fal } from '@fal-ai/client'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const FAL_API_KEY = process.env.FAL_AI_API_KEY || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for generate-signing-mockup, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(2, '3600 s'), prefix: 'rl:generate-signing-mockup', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] generate-signing-mockup id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] generate-signing-mockup id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Credits per resolutie
const CREDITS_PER_RESOLUTIE: Record<string, number> = {
  '1K': 1,
  '2K': 1,
  '4K': 2,
}

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

// Resolution multipliers
const RESOLUTIE_BASES: Record<string, number> = {
  '1K': 1024,
  '2K': 2048,
  '4K': 4096,
}

// Ratio presets → returns pixel sizes based on resolution
function getRatioSize(ratio: string, resolutie: string): { width: number; height: number } {
  const base = RESOLUTIE_BASES[resolutie] || 2048
  const ratios: Record<string, [number, number]> = {
    '1:1':  [1, 1],
    '4:3':  [4, 3],
    '3:4':  [3, 4],
    '16:9': [16, 9],
    '9:16': [9, 16],
    '3:2':  [3, 2],
    '2:3':  [2, 3],
    '21:9': [21, 9],
  }
  const [rw, rh] = ratios[ratio] || [1, 1]
  const maxDim = base
  if (rw >= rh) {
    return { width: maxDim, height: Math.round(maxDim * rh / rw) }
  }
  return { width: Math.round(maxDim * rw / rh), height: maxDim }
}

interface ChatMessage {
  rol: 'user' | 'assistant'
  tekst: string
}

// ============ SERVER-SIDE CREDIT CHECK ============

async function verifyUserAndCredits(
  req: VercelRequest,
  resolutie: string
): Promise<{ userId: string; creditsNodig: number } | { error: string; status: number }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // Geen Supabase = geen credit enforcement (lokale dev)
    return { userId: 'local', creditsNodig: 0 }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Verifieer gebruiker via auth token
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Niet geautoriseerd', status: 401 }
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { error: 'Ongeldige sessie', status: 401 }
  }

  const creditsNodig = CREDITS_PER_RESOLUTIE[resolutie] || 1

  // Check saldo
  const { data: credits } = await supabase
    .from('visualizer_credits')
    .select('saldo')
    .eq('user_id', user.id)
    .single()

  const huidigSaldo = credits?.saldo ?? 0

  if (huidigSaldo < creditsNodig) {
    return {
      error: `Onvoldoende credits — je hebt ${huidigSaldo} credit${huidigSaldo !== 1 ? 's' : ''}, maar ${resolutie} kost ${creditsNodig} credit${creditsNodig !== 1 ? 's' : ''}. Koop meer credits via Instellingen.`,
      status: 402,
    }
  }

  return { userId: user.id, creditsNodig }
}

async function deductCredits(userId: string, creditsNodig: number, resolutie: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || userId === 'local') return

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Atomisch saldo verlagen
  const { data: credits } = await supabase
    .from('visualizer_credits')
    .select('saldo, totaal_gebruikt')
    .eq('user_id', userId)
    .single()

  if (!credits) return

  const nieuwSaldo = credits.saldo - creditsNodig
  if (nieuwSaldo < 0) return // Extra veiligheid

  await supabase
    .from('visualizer_credits')
    .update({
      saldo: nieuwSaldo,
      totaal_gebruikt: credits.totaal_gebruikt + creditsNodig,
      laatst_bijgewerkt: new Date().toISOString(),
    })
    .eq('user_id', userId)

  await supabase.from('credit_transacties').insert({
    user_id: userId,
    type: 'gebruik',
    aantal: -creditsNodig,
    saldo_na: nieuwSaldo,
    beschrijving: creditsNodig > 1
      ? `${creditsNodig} credits gebruikt (${resolutie} visualisatie)`
      : 'Credit gebruikt voor visualisatie',
  })
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
      resolutie,
      chat_geschiedenis,
    } = req.body as {
      gebouw_foto_base64: string
      logo_base64?: string
      beschrijving: string
      ratio?: string
      resolutie?: string
      chat_geschiedenis?: ChatMessage[]
    }

    if (!gebouw_foto_base64 || !beschrijving) {
      return res.status(400).json({ error: 'Foto en beschrijving zijn verplicht' })
    }

    const effectieveResolutie = resolutie || '2K'

    // Server-side credit check VOOR de API call
    const creditCheck = await verifyUserAndCredits(req, effectieveResolutie)
    if ('error' in creditCheck) {
      return res.status(creditCheck.status).json({ error: creditCheck.error })
    }

    if (!(await enforceRateLimit(creditCheck.userId, res))) return

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

    // Step 3: Determine image size from ratio + resolution
    const imageSize = getRatioSize(ratio || '1:1', effectieveResolutie)

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

    // Credits AFSCHRIJVEN na succesvolle generatie (niet ervoor!)
    await deductCredits(creditCheck.userId, creditCheck.creditsNodig, effectieveResolutie)

    return res.status(200).json({
      url: resultaatUrl,
      fal_request_id: result.requestId,
      generatie_tijd_ms: generatieTijdMs,
      api_kosten_usd: 0.12,
      prompt_gebruikt: optimizedPrompt,
      credits_gebruikt: creditCheck.creditsNodig,
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
