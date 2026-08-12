import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

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

/**
 * Vangnet per gebruiker. Dit is bedoeld voor mensen zonder organisatie: die
 * kunnen niet door de org-check heen, want die heeft een organisatie nodig.
 *
 * De limiet moet daarom meebewegen met de staffel. Stond hier de vaste 15 terwijl
 * de organisatie op 30 zit, dan loopt één zware gebruiker vast op 15 terwijl het
 * bedrijf nog de helft van zijn budget over heeft, en de org-check die dat had
 * moeten toestaan wordt niet eens bereikt. Dat was het geval sinds migratie 172
 * de staffel invoerde.
 */
async function checkUsageLimit(userId: string, organisatieId: string | null): Promise<boolean> {
  const maand = getCurrentMonth()
  const limiet = organisatieId
    ? (await haalMaandlimiet(organisatieId, maand)).limiet
    : STANDAARD_MAANDLIMIET_EUR
  const { data, error } = await supabase
    .from('ai_usage')
    .select('geschatte_kosten')
    .eq('user_id', userId)
    .eq('maand', maand)
    .maybeSingle()
  // Onleesbaar eigen verbruik: niet blokkeren op een getal dat we niet kennen.
  // De org-check hierna is de echte rem.
  if (error) {
    console.error('checkUsageLimit: eigen verbruik onleesbaar', userId, error)
    return true
  }
  return !data || (data.geschatte_kosten ?? 0) < limiet
}

async function updateUsage(userId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const maand = getCurrentMonth()
  const kosten = ((inputTokens / 1_000_000 * 3) + (outputTokens / 1_000_000 * 15)) * USD_NAAR_EUR
  // Atomair bijschrijven via de RPC (migratie 178), zelfde reden als bij de
  // org-teller: een read-modify-write laat twee gelijktijdige calls over elkaar
  // heen schrijven en de teller loopt structureel achter.
  const { error } = await supabase.rpc('ai_usage_bijschrijf', {
    p_user_id: userId,
    p_maand: maand,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
    p_kosten: Number(kosten.toFixed(4)),
    p_calls: 1,
  })
  if (error) console.error('updateUsage: bijschrijven mislukt', userId, error)
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

// Inline helpers — niet verplaatsen naar helper-bestand (Vercel constraint)

/**
 * De maandlimiet hoort bij het abonnement, niet bij een verbruiksrij. Volgorde:
 * de staffel op de organisatie (migratie 172), anders de oude waarde op
 * ai_usage_org, anders de constante.
 *
 * betrouwbaar=false betekent: we konden de limiet niet vaststellen. De aanroeper
 * blokkeert dan niet. Eén call doorlaten kost centen, een organisatie die 30
 * betaalt ten onrechte op 15 vastzetten kost een klant. Een ontbrekende kolom
 * (migratie 172 nog niet gedraaid) telt niet als storing: dat is de oude
 * situatie en daar hoort de oude terugval bij.
 */
async function haalMaandlimiet(
  organisatieId: string,
  maand: string
): Promise<{ limiet: number; betrouwbaar: boolean }> {
  const { data: org, error: orgFout } = await supabase
    .from('organisaties')
    .select('ai_maandlimiet')
    .eq('id', organisatieId)
    .maybeSingle()
  if (orgFout && !kolomOntbreekt(orgFout)) {
    console.error('haalMaandlimiet: organisatie onleesbaar', organisatieId, orgFout)
    return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: false }
  }
  const uitStaffel = Number(org?.ai_maandlimiet ?? NaN)
  if (Number.isFinite(uitStaffel) && uitStaffel >= 0) {
    return { limiet: uitStaffel, betrouwbaar: true }
  }

  const { data: rijen, error: rijenFout } = await supabase
    .from('ai_usage_org')
    .select('maandlimiet')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  if (rijenFout) {
    console.error('haalMaandlimiet: ai_usage_org onleesbaar', organisatieId, rijenFout)
    return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: false }
  }
  if (rijen && rijen.length > 0) {
    return {
      limiet: Math.max(...rijen.map(r => Number(r.maandlimiet ?? STANDAARD_MAANDLIMIET_EUR))),
      betrouwbaar: true,
    }
  }
  return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: true }
}

/**
 * 42703 is undefined_column; PGRST204 is dezelfde situatie via de schema-cache.
 * Bewust alleen op foutcode en niet op de tekst van de melding: een RLS- of
 * permissiefout die de kolomnaam echoot zou anders als "niet gemigreerd" gelezen
 * worden, en dan valt een organisatie stilletjes terug naar de standaardlimiet.
 */
function kolomOntbreekt(fout: { code?: string }): boolean {
  return fout.code === '42703' || fout.code === 'PGRST204'
}

async function checkAIBudget(
  organisatieId: string,
  geschatteKosten: number
): Promise<{ geblokkeerd: boolean; reden?: string }> {
  const maand = getCurrentMonth()
  const { data: rows, error: verbruikFout } = await supabase
    .from('ai_usage_org')
    .select('geschatte_kosten')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  if (verbruikFout) {
    console.error('checkAIBudget: verbruik onleesbaar', organisatieId, verbruikFout)
  }
  const huidig = (rows ?? []).reduce((s, r) => s + Number(r.geschatte_kosten ?? 0), 0)
  const { limiet, betrouwbaar } = await haalMaandlimiet(organisatieId, maand)
  // Een onleesbaar verbruik geeft huidig = 0. Daar niet op blokkeren is juist,
  // maar er ook niet op doorlaten alsof het klopt: beide kanten van de
  // vergelijking moeten kloppen voordat we iemand tegenhouden.
  if (!verbruikFout && betrouwbaar && huidig + geschatteKosten > limiet) {
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
  // Atomair bijschrijven via de RPC (migratie 174). Een read-modify-write laat
  // twee gelijktijdige calls over elkaar heen schrijven, en dat verlies is
  // altijd in het nadeel van doen.: de teller loopt achter en de rem grijpt
  // te laat in.
  const { error } = await supabase.rpc('ai_usage_org_bijschrijf', {
    p_organisatie_id: organisatieId,
    p_route: route,
    p_maand: maand,
    p_kosten: Number(kostenDelta.toFixed(4)),
    p_calls: 1,
  })
  if (error) console.error('logOrgUsage: bijschrijven mislukt', organisatieId, route, error)
}

export const config = { maxDuration: 30 }

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for ai-followup-email, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(20, '60 s'), prefix: 'rl:ai-followup-email', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] ai-followup-email id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] ai-followup-email id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    if (!(await enforceRateLimit(userId, res))) return

    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI niet geconfigureerd', configured: false })
    }

    const { context } = req.body as { context: FollowUpContext }
    if (!context || !context.offerte_nummer) {
      return res.status(400).json({ error: 'Context met offerte gegevens is verplicht' })
    }

    const orgIdForBudget = await resolveOrgId(userId)
    const withinLimit = await checkUsageLimit(userId, orgIdForBudget)
    if (!withinLimit) {
      return res.status(429).json({
        error: 'AI limiet bereikt',
        message: `Je hebt deze maand voor \u20ac${MONTHLY_LIMIT} aan Daan-gebruik bereikt.`,
      })
    }
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
      // Dit endpoint heeft maxDuration 30; ruim eronder blijven zodat de fout
      // als nette JSON terugkomt in plaats van als een gekilde functie.
      signal: AbortSignal.timeout(25_000),
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
