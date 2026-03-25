import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const MONTHLY_LIMIT = 5.0

const SYSTEM_PROMPT = `Je bent een zakelijke email assistent voor een Nederlands bedrijf in de sign/reclame industrie.
Schrijf een follow-up email voor een openstaande offerte.
Regels:
- Schrijf in het Nederlands, professioneel maar warm en persoonlijk
- Spreek de contactpersoon aan bij voornaam als die bekend is
- Verwijs naar het project en de offerte specifiek (niet vaag)
- Pas de toon aan op basis van het aantal dagen open:
  - 3-7 dagen: Vriendelijke check-in, "heeft u de offerte kunnen bekijken?"
  - 7-14 dagen: Iets directer, bied aan om vragen te beantwoorden
  - 14-21 dagen: Urgenter, verwijs naar geldigheid, vraag of er wijzigingen nodig zijn
  - 21+ dagen: Laatste poging, kort en krachtig, bied alternatief aan
- Als het de 2e of 3e follow-up is, verwijs subtiel naar eerdere berichten
- Eindig ALTIJD met een duidelijke call-to-action:
  - "Wilt u de offerte goedkeuren? Dat kan direct via deze link: [PORTAAL_LINK]"
  - Of: "Laat me weten of u nog vragen heeft, dan bel ik u graag even."
- Houd de mail kort: max 6-8 zinnen
- Geen "Hierbij stuur ik u een herinnering" of andere saaie openers
- Geen "Met vriendelijke groet" boilerplate — alleen de naam

Geef het resultaat als JSON:
{
  "onderwerp": "...",
  "body": "..."
}`

interface FollowUpContext {
  klantnaam: string
  contactpersoon: string
  projectnaam?: string
  offerte_nummer: string
  offerte_titel: string
  bedrag: number
  dagen_open: number
  geldig_tot: string
  dagen_tot_verlopen: number
  aantal_eerdere_followups: number
  status: string
  bedrijfsnaam_afzender: string
  afzender_naam: string
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

export const config = { maxDuration: 30 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI niet geconfigureerd', configured: false })
    }

    const { context } = req.body as { context: FollowUpContext }
    if (!context || !context.offerte_nummer) {
      return res.status(400).json({ error: 'Context met offerte gegevens is verplicht' })
    }

    const withinLimit = await checkUsageLimit(userId)
    if (!withinLimit) {
      return res.status(429).json({
        error: 'AI limiet bereikt',
        message: 'Je hebt het maximum van €5 aan AI-gebruik bereikt deze maand.',
      })
    }

    const userPrompt = `Genereer een follow-up email voor deze offerte:

Klant: ${context.klantnaam}
Contactpersoon: ${context.contactpersoon || 'onbekend'}
Project: ${context.projectnaam || 'niet opgegeven'}
Offerte nummer: ${context.offerte_nummer}
Offerte omschrijving: ${context.offerte_titel}
Bedrag: €${context.bedrag?.toLocaleString('nl-NL') || '0'}
Dagen open: ${context.dagen_open}
Geldig tot: ${context.geldig_tot}
Dagen tot verlopen: ${context.dagen_tot_verlopen}
Aantal eerdere follow-ups: ${context.aantal_eerdere_followups}
Status: ${context.status}
Afzender bedrijf: ${context.bedrijfsnaam_afzender}
Afzender naam: ${context.afzender_naam}`

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
        system: SYSTEM_PROMPT,
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
        error: (errorData?.error as Record<string, string>)?.message || 'Anthropic API fout',
      })
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
      usage: { input_tokens: number; output_tokens: number }
    }
    const resultText = data.content?.[0]?.text || ''

    // Parse JSON response from AI
    let onderwerp = `Opvolging offerte ${context.offerte_nummer}`
    let body = resultText

    try {
      // Extract JSON from the response (may be wrapped in markdown code blocks)
      const jsonMatch = resultText.match(/\{[\s\S]*"onderwerp"[\s\S]*"body"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { onderwerp: string; body: string }
        onderwerp = parsed.onderwerp || onderwerp
        body = parsed.body || body
      }
    } catch {
      // If JSON parsing fails, use the raw text as body
    }

    // Update usage tracking (non-critical)
    try {
      await updateUsage(userId, data.usage.input_tokens, data.usage.output_tokens)
    } catch {
      // Usage tracking is niet-kritiek
    }

    return res.status(200).json({ onderwerp, body })
  } catch (error: unknown) {
    console.error('AI Follow-up Email API fout:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI verzoek mislukt' })
  }
}
