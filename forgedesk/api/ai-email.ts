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
  hasContext: boolean
}

const DAAN_CONTEXT_TIMEOUT_MS = 3000
const LEGE_DAAN_CONTEXT: DaanContext = { bedrijfscontext: '', schrijfstijl: '', hasContext: false }

async function buildDaanContext(client: SupabaseClient, userId: string): Promise<DaanContext> {
  if (!userId) return LEGE_DAAN_CONTEXT
  return Promise.race([
    loadDaanContext(client, userId),
    new Promise<DaanContext>(resolve => setTimeout(() => resolve(LEGE_DAAN_CONTEXT), DAAN_CONTEXT_TIMEOUT_MS)),
  ])
}

async function loadDaanContext(client: SupabaseClient, userId: string): Promise<DaanContext> {
  let bedrijfscontext = ''
  let schrijfstijl = ''

  const { data: profile } = await client
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()

  const orgId = (profile?.organisatie_id as string | null) ?? null

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

  return { bedrijfscontext, schrijfstijl, hasContext: !!(bedrijfscontext || schrijfstijl) }
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const MONTHLY_LIMIT = 5.0

const PROMPTS: Record<string, string> = {
  'rewrite-professional': 'Herschrijf deze email professioneler en zakelijker. Behoud de boodschap. Antwoord alleen met de herschreven tekst.\n\nEmail:\n{text}',
  'rewrite-shorter': 'Maak deze email korter en bondiger. Behoud de kernboodschap. Antwoord alleen met de kortere versie.\n\nEmail:\n{text}',
  'formalize': 'Herschrijf deze informele tekst als een zakelijke email in het Nederlands met aanhef en afsluiting. Antwoord alleen met de email tekst.\n\nInformele tekst:\n{text}',
  'write-followup': 'Schrijf een korte, beleefde follow-up email in het Nederlands. Er is {context} dagen geen reactie geweest. Niet opdringerig maar wel duidelijk. Antwoord alleen met de email tekst.\n\nOriginele email:\n{text}',
  'summarize': 'Vat deze email samen in 2-3 korte zinnen in het Nederlands. Antwoord alleen met de samenvatting.\n\nEmail:\n{text}',
  'summarize-thread': 'Je vat een e-mailconversatie samen voor het projectteam van een signing-bedrijf. Focus op: (1) wat de klant heeft gevraagd of bevestigd, (2) welke afspraken zijn gemaakt — data, prijzen, leveringen, materialen, (3) welke openstaande vragen er nog zijn, (4) huidige status. Schrijf maximaal 5 korte bullets, in het Nederlands. Begin elke bullet met een gedachtenstreepje. Antwoord alleen met de bullets, geen aanhef of slotzin.\n\nConversatie (chronologisch, oudste eerst):\n{text}',
  'translate-en': 'Vertaal deze email naar het Engels. Behoud de toon. Antwoord alleen met de vertaling.\n\nEmail:\n{text}',
  'translate-nl': 'Vertaal deze email naar het Nederlands. Behoud de toon. Antwoord alleen met de vertaling.\n\nEmail:\n{text}',
  'generate-reply': 'Schrijf een kort en professioneel antwoord op deze email in het Nederlands. Antwoord alleen met de reply-tekst.\n\nEmail:\n{text}',
  'write-email': 'Schrijf een volledige, professionele e-mail in het Nederlands op basis van de opdracht van de gebruiker. Gebruik een passende aanhef en afsluiting en schrijf zo uitgebreid en informatief als de opdracht vraagt. Antwoord alleen met de e-mailtekst, zonder onderwerp-regel.\n\nContext (onderwerp en ontvanger):\n{context}\n\nOpdracht van de gebruiker:\n{text}',
  // Koude outreach naar de SIBON-ledenlijst. Van de lead is alleen naam, plaats
  // en bron bekend, dus het verbod op aannames staat er nadrukkelijk in: zonder
  // dat verzint het model wat het bedrijf maakt of welke software het gebruikt.
  // Het verbod op "we kwamen elkaar tegen" staat er om dezelfde reden: er is
  // geen eerder contact geweest, alleen een naam in een ledenlijst.
  'write-lead-email': 'Je schrijft een eerste, koude e-mail aan een collega-signbedrijf. Doel: doen. laten zien, de software die we bij Sign Company zelf hebben ontwikkeld en zelf dagelijks gebruiken voor offertes, projecten, werkbonnen en facturatie.\n\nEr is nog nooit contact geweest met dit bedrijf. Je hebt de naam alleen in de SIBON-ledenlijst zien staan. Suggereer dus NOOIT een ontmoeting, kennismaking of eerder contact. Schrijf niet "we kwamen elkaar tegen", "we spraken elkaar", "naar aanleiding van" of iets van die strekking. Je mag het adressenbestand ook helemaal niet noemen. De aanleiding is simpel en die mag je gewoon zo zeggen: je bent zelf signmaker, je hebt iets gebouwd voor je eigen bedrijf, en je laat het aan een vakgenoot zien.\n\nDe kern van de mail, in deze geest:\n- Vertel het vanuit eigen ervaring: we liepen zelf tegen het gedoe aan, dus hebben we het gebouwd. Wat het vooral oplevert is overzicht: je ziet in één oogopslag waar elk project staat.\n- Zeg expliciet dat dit geen salespitch is. Je laat gewoon zien wat bij ons goed werkt, meer niet.\n- Verwijs naar de video in de bijlage als de makkelijkste manier om te zien wat het is.\n\nSchrijf als ondernemer tegen ondernemer. Maximaal 120 woorden. Noem concreet wat het oplost in plaats van wat het "biedt". Geen superlatieven, geen opsommingstekens, geen onderwerpregel en geen ondertekening: de handtekening staat er al onder. Schrijf in volle zinnen, zonder gedachtestreepjes of pijltjes om woorden aan elkaar te knopen. Sluit af met een lage drempel: laat merken dat een reactie niet hoeft, geen harde call-to-action.\n\nJe weet verder niets over dit bedrijf. Doe daarom GEEN aannames over wat ze maken, hoe groot ze zijn, welke software ze nu gebruiken of hoe hun werk loopt. Gebruik uitsluitend de gegevens hieronder; als een gegeven ontbreekt, laat je het weg in plaats van het in te vullen.\n\nGegevens van de lead:\n{context}\n\nExtra aanwijzing van de gebruiker (leeg = geen):\n{text}\n\nAntwoord alleen met de e-mailtekst.',
}

// Outreach is kwaliteitsgevoelig en gaat naar echte bedrijven; de overige
// acties blijven op Sonnet staan.
const MODEL_PER_ACTIE: Record<string, string> = {
  'write-lead-email': 'claude-opus-4-8',
}
const STANDAARD_MODEL = 'claude-sonnet-4-6'

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

// Tarief per miljoen tokens, per model. Zonder deze splitsing werd een
// Opus-call op Sonnet-tarief geteld en liep het maandbudget stil te ver door.
const TARIEVEN: Record<string, { in: number; uit: number }> = {
  'claude-opus-4-8': { in: 5, uit: 25 },
  'claude-sonnet-4-6': { in: 3, uit: 15 },
}

async function updateUsage(userId: string, inputTokens: number, outputTokens: number, model: string): Promise<void> {
  const maand = getCurrentMonth()
  const tarief = TARIEVEN[model] || TARIEVEN['claude-sonnet-4-6']
  const kosten = (inputTokens / 1_000_000 * tarief.in) + (outputTokens / 1_000_000 * tarief.uit)

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

function buildSystemPrompt(action: string, context: DaanContext): string {
  if (!context.hasContext) return ''
  if (action === 'translate-en' || action === 'translate-nl') return ''

  const onderdelen: string[] = []
  if (context.bedrijfscontext) onderdelen.push(`Over het bedrijf: ${context.bedrijfscontext}`)
  if (context.schrijfstijl) onderdelen.push(`Schrijfstijl van de gebruiker (overneem):\n${context.schrijfstijl}`)
  return onderdelen.join('\n\n')
}

async function getUsage(userId: string): Promise<{ geschatte_kosten: number }> {
  const maand = getCurrentMonth()
  const { data } = await supabase
    .from('ai_usage')
    .select('geschatte_kosten')
    .eq('user_id', userId)
    .eq('maand', maand)
    .single()
  return { geschatte_kosten: data?.geschatte_kosten ?? 0 }
}

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
    ? Math.max(...rows.map(r => Number(r.maandlimiet ?? 10)))
    : 10
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
  const kostenDelta = (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI niet geconfigureerd', configured: false })
    }

    const { action, text, context, user_id: _uid } = req.body

    // GET usage action
    if (action === 'get-usage') {
      const usage = await getUsage(userId)
      return res.status(200).json({ usage: usage.geschatte_kosten, limiet: MONTHLY_LIMIT })
    }

    // Bij een lead-opzetje zit alles in {context}; een eigen aanwijzing is optioneel.
    if (!action || (!text && action !== 'write-lead-email')) {
      return res.status(400).json({ error: 'Action en text zijn verplicht' })
    }

    const promptTemplate = PROMPTS[action]
    if (!promptTemplate) {
      return res.status(400).json({ error: `Onbekende actie: ${action}` })
    }

    // Check usage limit
    const withinLimit = await checkUsageLimit(userId)
    if (!withinLimit) {
      return res.status(429).json({
        error: 'Daan limiet bereikt',
        message: 'Je hebt het maximum van €5 aan Daan-gebruik bereikt deze maand.',
      })
    }

    const orgIdForBudget = await resolveOrgId(userId)
    if (orgIdForBudget) {
      const budget = await checkAIBudget(orgIdForBudget, 0.01)
      if (budget.geblokkeerd) {
        return res.status(403).json({
          error: 'ai_budget_bereikt',
          bericht: 'Je maandbudget voor AI is bereikt. Koop extra credits om door te gaan.',
          redirect: '/instellingen?tab=daan-ai',
        })
      }
    }

    // Build prompt
    // Vervangen via een functie: anders expandeert String.replace patronen als
    // $& en $` in de gebruikersinvoer, die dan stukken prompt terugplakken.
    const prompt = promptTemplate
      .replace('{text}', () => text || '')
      .replace('{context}', () => context || '7')

    const daanContext = await buildDaanContext(supabase, userId)
    const systemPrompt = buildSystemPrompt(action, daanContext)
    const model = MODEL_PER_ACTIE[action] || STANDAARD_MODEL

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        // Adaptive thinking staat expliciet aan: met thinking uit schrijft
        // Opus 4.8 zijn afwegingen soms in het zichtbare antwoord, en dat
        // komt hier ongefilterd in de mailtekst terecht.
        ...(MODEL_PER_ACTIE[action]
          ? { max_tokens: 4000, thinking: { type: 'adaptive' }, output_config: { effort: 'low' } }
          : { max_tokens: 1024 }),
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: 'user', content: prompt }],
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
    // Niet content[0]: met adaptive thinking staat er een thinking-blok voor.
    const resultText = (data.content || []).find(blok => blok.type === 'text')?.text || ''

    // Update usage tracking
    try {
      await updateUsage(userId, data.usage.input_tokens, data.usage.output_tokens, model)
    } catch {
      // Usage tracking is niet-kritiek
    }

    if (orgIdForBudget) {
      try {
        await logOrgUsage(orgIdForBudget, 'ai-email', data.usage.input_tokens, data.usage.output_tokens, 3, 15)
      } catch {
        // Org-usage tracking is niet-kritiek
      }
    }

    const currentUsage = await getUsage(userId).catch(() => ({ geschatte_kosten: 0 }))

    return res.status(200).json({
      result: resultText,
      usage: {
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens,
        geschatte_kosten: currentUsage.geschatte_kosten,
        limiet: MONTHLY_LIMIT,
      },
    })
  } catch (error: unknown) {
    console.error('AI Email API fout:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI verzoek mislukt' })
  }
}
