import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ── Daan context helper (inline; Vercel bundelt geen api/_helpers/ imports) ──
interface DaanContext {
  bedrijfscontext: string
  schrijfstijl: string
  conventies: Array<{ categorie: string; inhoud: string }>
  geheugen: Array<{ onderwerp_type: string; onderwerp_id: string | null; inhoud: string }>
  hasContext: boolean
}

const DAAN_CONTEXT_TIMEOUT_MS = 3000
const LEGE_DAAN_CONTEXT: DaanContext = { bedrijfscontext: '', schrijfstijl: '', conventies: [], geheugen: [], hasContext: false }

async function buildDaanContext(client: SupabaseClient, userId: string, klantId: string | null = null): Promise<DaanContext> {
  if (!userId) return LEGE_DAAN_CONTEXT
  return Promise.race([
    loadDaanContext(client, userId, klantId),
    new Promise<DaanContext>(resolve => setTimeout(() => resolve(LEGE_DAAN_CONTEXT), DAAN_CONTEXT_TIMEOUT_MS)),
  ])
}

async function loadDaanContext(client: SupabaseClient, userId: string, klantId: string | null): Promise<DaanContext> {
  const { data: profile } = await client
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()

  const orgId = (profile?.organisatie_id as string | null) ?? null

  if (orgId) {
    // Eén RPC als contextbron voor alle AI-endpoints (migratie 164). Faalt
    // hij (bijv. migratie nog niet gedraaid), dan pakt het pad hieronder
    // de directe app_settings-queries van vóór de RPC.
    const { data, error } = await client.rpc('daan_context', {
      p_organisatie_id: orgId,
      p_klant_id: klantId,
      p_user_id: userId,
    })
    if (!error && data) {
      const ctx = data as {
        bedrijfscontext?: string
        schrijfstijl?: string
        conventies?: Array<{ categorie: string; inhoud: string }>
        geheugen?: Array<{ onderwerp_type: string; onderwerp_id: string | null; inhoud: string }>
      }
      let bedrijfscontext = ctx.bedrijfscontext || ''
      let schrijfstijl = ctx.schrijfstijl || ''
      const conventies = Array.isArray(ctx.conventies) ? ctx.conventies : []
      const geheugen = Array.isArray(ctx.geheugen) ? ctx.geheugen : []
      // De RPC kent alleen de org-rij van app_settings. Legacy-accounts met
      // hun context op een user-rij hielden die via het oude pad; dezelfde
      // fallback hier, anders verliezen ze context zodra de RPC bestaat.
      if (!bedrijfscontext || !schrijfstijl) {
        const { data: legacy } = await client
          .from('app_settings')
          .select('forgie_bedrijfscontext, ai_tone_of_voice')
          .eq('user_id', userId)
          .maybeSingle()
        if (!bedrijfscontext) bedrijfscontext = (legacy?.forgie_bedrijfscontext as string | null) || ''
        if (!schrijfstijl) schrijfstijl = (legacy?.ai_tone_of_voice as string | null) || ''
      }
      return {
        bedrijfscontext,
        schrijfstijl,
        conventies,
        geheugen,
        hasContext: !!(bedrijfscontext || schrijfstijl || conventies.length || geheugen.length),
      }
    }
  }

  let bedrijfscontext = ''
  let schrijfstijl = ''

  if (orgId) {
    const { data } = await client
      .from('app_settings')
      .select('forgie_bedrijfscontext, ai_tone_of_voice')
      .eq('organisatie_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    bedrijfscontext = (data?.forgie_bedrijfscontext as string | null) || ''
    schrijfstijl = (data?.ai_tone_of_voice as string | null) || ''
  }

  if (!bedrijfscontext || !schrijfstijl) {
    const { data } = await client
      .from('app_settings')
      .select('forgie_bedrijfscontext, ai_tone_of_voice')
      .eq('user_id', userId)
      .maybeSingle()
    if (!bedrijfscontext) bedrijfscontext = (data?.forgie_bedrijfscontext as string | null) || ''
    if (!schrijfstijl) schrijfstijl = (data?.ai_tone_of_voice as string | null) || ''
  }

  return { bedrijfscontext, schrijfstijl, conventies: [], geheugen: [], hasContext: !!(bedrijfscontext || schrijfstijl) }
}

/** Conventies + actief geheugen als promptblok; lege string als er niets is. */
function daanKennisBlok(context: DaanContext): string {
  const delen: string[] = []
  if (context.conventies.length) {
    delen.push(`Zo werkt dit bedrijf (vaste regels; bij tegenspraak wint de bovenste):\n${context.conventies.map(c => `- ${c.inhoud}`).join('\n')}`)
  }
  if (context.geheugen.length) {
    delen.push(`Eerder geleerd over dit bedrijf en zijn klanten:\n${context.geheugen.map(g => `- ${g.inhoud}`).join('\n')}`)
  }
  return delen.join('\n\n')
}

// ── Daan spoor (inline; grondstof voor de nachtelijke consolidatie) ──
async function schrijfSpoor(
  orgId: string | null,
  userId: string | null,
  agent: string,
  inhoud: Record<string, unknown>,
  klantId: string | null = null
): Promise<void> {
  if (!orgId) return
  try {
    await supabase.from('ai_sporen').insert({
      organisatie_id: orgId,
      user_id: userId,
      agent,
      klant_id: klantId,
      inhoud,
    })
  } catch {
    // Sporen zijn niet-kritiek; het antwoord gaat gewoon door.
  }
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
// Anthropic factureert in dollars; doen. rekent en toont in euro's. Alles wat
// in geschatte_kosten belandt is dus EUR, zodat de maandlimiet, de meter in
// Instellingen en de blokkade-melding dezelfde eenheid hebben. Zelfde koers
// als de Visualizer gebruikt (utils/visualizerDefaults.ts).
const USD_NAAR_EUR = 0.92

// Vangnet per gebruiker, in euro's. Deze check draait onvoorwaardelijk, dus
// ook mét organisatie; normaal bijt hij nooit omdat het eigen verbruik per
// definitie kleiner is dan het org-totaal. Hij is er voor gebruikers zonder
// organisatie, want dan kan de org-check niet draaien. Gelijk aan de
// org-limiet: een eenpitter mag niet op een derde van zijn budget stoppen.
const MONTHLY_LIMIT = 15.0

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
- Voeg geen afsluiting toe ("Met vriendelijke groet", naam, bedrijfsnaam). De afsluiting wordt apart door het systeem als handtekening-tekst of -afbeelding toegevoegd. Eindig de email-body op de call-to-action zonder afsluit-regel.

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
  // UTC, niet lokaal: migratie 093 legt de maandsleutel als UTC vast. Zou de
  // runtime ooit op Europe/Amsterdam staan, dan schrijven routes rond de
  // maandwisseling anders naar twee verschillende maandrijen voor dezelfde org.
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
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
  const kosten = ((inputTokens / 1_000_000 * 3) + (outputTokens / 1_000_000 * 15)) * USD_NAAR_EUR

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

const MAANDEN_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december']

/** "1 augustus" — wanneer de teller weer op nul gaat. Geen Intl, want de
 *  ICU-data op de serverless-runtime is niet gegarandeerd volledig. */
function resetTekst(): string {
  const nu = new Date()
  const volgende = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() + 1, 1))
  return `1 ${MAANDEN_NL[volgende.getUTCMonth()]}`
}

// Valt terug op dit bedrag als een organisatie nog geen rij voor deze maand
// heeft. Houd gelijk aan de DEFAULT van ai_usage_org.maandlimiet (migratie 161).
const STANDAARD_MAANDLIMIET_EUR = 15.0

// Inline budget-check — niet verplaatsen naar helper (Vercel constraint)
async function checkAIBudget(
  organisatieId: string,
  geschatteKosten: number
): Promise<{ geblokkeerd: boolean; reden?: string }> {
  const maand = getCurrentMonth()
  const { data: rows } = await supabase
    .from('ai_usage_org')
    .select('geschatte_kosten, maandlimiet')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  const huidig = (rows ?? []).reduce((s, r) => s + Number(r.geschatte_kosten ?? 0), 0)
  const limiet = rows && rows.length > 0
    ? Math.max(...rows.map(r => Number(r.maandlimiet ?? STANDAARD_MAANDLIMIET_EUR)))
    : STANDAARD_MAANDLIMIET_EUR
  if (huidig + geschatteKosten > limiet) {
    await supabase
      .from('ai_usage_org')
      .update({ geblokkeerd_op: new Date().toISOString() })
      .eq('organisatie_id', organisatieId)
      .eq('maand', maand)
      .is('geblokkeerd_op', null)
    return { geblokkeerd: true, reden: 'maandlimiet_bereikt' }
  }
  return { geblokkeerd: false }
}

async function resolveOrgId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()
  return (data?.organisatie_id as string | null) ?? null
}

async function logOrgUsage(
  organisatieId: string,
  route: string,
  inputTokens: number,
  outputTokens: number,
  inputPrice: number,
  outputPrice: number
): Promise<void> {
  const maand = getCurrentMonth()
  const kostenDelta = ((inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice) * USD_NAAR_EUR
  const { data: existing } = await supabase
    .from('ai_usage_org')
    .select('id, aantal_calls, geschatte_kosten')
    .eq('organisatie_id', organisatieId)
    .eq('route', route)
    .eq('maand', maand)
    .maybeSingle()
  if (existing) {
    await supabase
      .from('ai_usage_org')
      .update({
        aantal_calls: (existing.aantal_calls ?? 0) + 1,
        geschatte_kosten: Number((Number(existing.geschatte_kosten ?? 0) + kostenDelta).toFixed(4)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('ai_usage_org')
      .insert({
        organisatie_id: organisatieId,
        route,
        maand,
        aantal_calls: 1,
        geschatte_kosten: Number(kostenDelta.toFixed(4)),
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
        message: `Je hebt deze maand voor \u20ac${MONTHLY_LIMIT} aan Daan-gebruik bereikt.`,
      })
    }

    const orgIdForBudget = await resolveOrgId(userId)
    if (orgIdForBudget) {
      const budget = await checkAIBudget(orgIdForBudget, 0.01)
      if (budget.geblokkeerd) {
        return res.status(403).json({
          error: 'ai_budget_bereikt',
          bericht: `Het gedeelde AI-budget van je organisatie is op voor deze maand. Op ${resetTekst()} staat de teller weer op nul.`,
          redirect: '/instellingen?tab=daan-ai',
        })
      }
    }

    const userPrompt = `Genereer een follow-up email voor deze offerte:

Klant: ${context.klantnaam}
Contactpersoon: ${context.contactpersoon || 'onbekend'}
Project: ${context.projectnaam || 'niet opgegeven'}
Offerte nummer: ${context.offerte_nummer}
Offerte omschrijving: ${context.offerte_titel}
Bedrag: €${context.bedrag?.toLocaleString('nl-NL') || '0'} exclusief btw (noem het bedrag altijd met "excl. btw" erbij)
Dagen open: ${context.dagen_open}
Geldig tot: ${context.geldig_tot}
Dagen tot verlopen: ${context.dagen_tot_verlopen}
Aantal eerdere follow-ups: ${context.aantal_eerdere_followups}
Status: ${context.status}
Afzender bedrijf: ${context.bedrijfsnaam_afzender}
Afzender naam: ${context.afzender_naam}`

    const daanContext = await buildDaanContext(supabase, userId)
    const { bedrijfscontext, schrijfstijl } = daanContext
    const contextBlokken: string[] = []
    if (bedrijfscontext) contextBlokken.push(`Over het bedrijf: ${bedrijfscontext}`)
    if (schrijfstijl) contextBlokken.push(`Schrijfstijl van de afzender (overneem):\n${schrijfstijl}`)
    const kennisBlok = daanKennisBlok(daanContext)
    if (kennisBlok) contextBlokken.push(kennisBlok)
    const systemPrompt = contextBlokken.length > 0
      ? `${contextBlokken.join('\n\n')}\n\n${SYSTEM_PROMPT}`
      : SYSTEM_PROMPT

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        // Sonnet 5 zet adaptive thinking standaard aan; dat zou hier uit
        // hetzelfde max_tokens-budget komen en het antwoord afkappen.
        thinking: { type: 'disabled' },
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

    if (orgIdForBudget) {
      try {
        await logOrgUsage(orgIdForBudget, 'ai-followup-email', data.usage.input_tokens, data.usage.output_tokens, 3, 15)
      } catch {
        // Org-usage tracking is niet-kritiek
      }
    }

    await schrijfSpoor(orgIdForBudget, userId, 'ai-followup-email', {
      klantnaam: String(context.klantnaam ?? '').slice(0, 200),
      offerte: String(context.offerte_nummer ?? '').slice(0, 60),
      dagen_open: context.dagen_open,
      resultaat: `${onderwerp}\n${body}`.slice(0, 600),
    })

    return res.status(200).json({ onderwerp, body })
  } catch (error: unknown) {
    console.error('AI Follow-up Email API fout:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI verzoek mislukt' })
  }
}
