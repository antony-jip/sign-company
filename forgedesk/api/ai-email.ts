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

const PROMPTS: Record<string, string> = {
  'summarize': 'Vat deze email samen in 2-3 korte zinnen in het Nederlands. Antwoord alleen met de samenvatting.\n\nEmail:\n{text}',
  'summarize-thread': 'Je vat een e-mailconversatie samen voor het projectteam van een signing-bedrijf. Focus op: (1) wat de klant heeft gevraagd of bevestigd, (2) welke afspraken zijn gemaakt — data, prijzen, leveringen, materialen, (3) welke openstaande vragen er nog zijn, (4) huidige status. Schrijf maximaal 5 korte bullets, in het Nederlands. Begin elke bullet met een gedachtenstreepje. Antwoord alleen met de bullets, geen aanhef of slotzin.\n\nConversatie (chronologisch, oudste eerst):\n{text}',
  'translate-nl': 'Vertaal deze email naar het Nederlands. Behoud de toon. Antwoord alleen met de vertaling.\n\nEmail:\n{text}',
  'generate-reply': 'Schrijf een kort en professioneel antwoord op deze email in het Nederlands. Antwoord alleen met de reply-tekst.\n\nEmail:\n{text}',
  'write-email': 'Schrijf een volledige, professionele e-mail in het Nederlands op basis van de opdracht van de gebruiker. Gebruik een passende aanhef en afsluiting en schrijf zo uitgebreid en informatief als de opdracht vraagt. Antwoord alleen met de e-mailtekst, zonder onderwerp-regel.\n\nContext (onderwerp en ontvanger):\n{context}\n\nOpdracht van de gebruiker:\n{text}',
  // Koude outreach naar de SIBON-ledenlijst. Van de lead zelf is alleen naam,
  // plaats en bron bekend; daarom zoekt het model eerst op wat het bedrijf
  // maakt (web_search staat aan voor deze actie), zodat de openingszin ergens
  // over gaat in plaats van een algemeenheid te zijn. Alles buiten de
  // zoekresultaten en {context} blijft verboden terrein: zonder die grens
  // verzint het model wat ze maken en welke software ze gebruiken.
  'write-lead-email': 'Je schrijft een eerste, koude e-mail aan een collega-signbedrijf uit de ledenlijst van SIBON. Doel: doen. introduceren, de software die we zelf gebruiken voor offertes, projecten, werkbonnen en facturatie.\n\nEr is nog nooit contact geweest met dit bedrijf. Suggereer dus NOOIT een ontmoeting, kennismaking of eerder contact: schrijf niet \"we kwamen elkaar tegen\", \"we spraken elkaar\" of \"naar aanleiding van\". Noem de ledenlijst ook niet als aanleiding.\n\nZOEK EERST OP. Gebruik de webzoektool om dit bedrijf op te zoeken (bedrijfsnaam plus plaats) voordat je begint te schrijven. Je wilt één ding weten: wat voor werk doen ze? Gevelreclame, autobelettering, lichtreclame, interieurbouw, textiel, grootformaat print, bewegwijzering, wagenparken, evenementen, of iets anders. Maximaal twee zoekopdrachten. Weet je het daarna nog niet zeker, dan schrijf je de mail zonder die kennis en verzin je niets.\n\nBouw de mail zo op, als korte lopende alinea\'s:\n1. DE OPENING. Benoem in een halve zin wat voor werk zij doen, op basis van wat je gevonden hebt, en stel daar meteen een herkenbare vraag over uit het dagelijkse signwerk: offertes die openstaan zonder dat iemand het overzicht heeft, werkbonnen die pas achteraf terugkomen, een factuur die erbij inschiet, niet weten welke klus waar staat. Terloops en feitelijk, geen complimenten en geen samenvatting van hun website. Een vraag stelt niets vast over hun bedrijf; formuleer het dus als vraag, nooit als bewering over hoe het bij hen gaat. Heb je niets gevonden, open dan met de vraag alleen.\n2. ONS VERHAAL IN TWEE OF DRIE ZINNEN. Wij werkten zelf jaren met James Pro, maar liepen daarin vast. Daarom hebben we naast ons signbedrijf zelf iets gebouwd: doen. Eén plek waar offerte, project, werkbon en factuur aan elkaar hangen. Blijf feitelijk over James Pro: niet afkraken, en neem niet aan dat de ontvanger het ook gebruikt.\n3. DE AI, IN ÉÉN ZIN. Er zit een assistent in die Daan heet. Kies precies één ding dat Daan doet en noem dat concreet: hij leest de mailbox mee en geeft aan welke binnengekomen mail een aanvraag is, hij vat een lange mailwisseling met een klant samen, of hij schrijft mee aan een offerte of een mail. Eén zin, geen tweede. Geen beloftes over wat het ooit gaat kunnen, en nooit de woorden \"AI-gedreven\", \"slim\" of \"intelligent\".\n4. PERSOONLIJK EN LAGE DREMPEL. Zeg dat we er binnenkort breed mee de branche in gaan, maar dat je dit bedrijf nu even persoonlijk benadert. Verwijs naar de demofilm als de makkelijkste manier om in twee minuten te zien wat het is, en gebruik daarbij letterlijk het woord demofilm. Schrijf nooit een URL of link uit; het woord demofilm wordt na het schrijven automatisch klikbaar gemaakt. Verwijs verder nergens naar. Sluit af met de boodschap dat reageren niet hoeft; is het herkenbaar, dan hoor je het graag. Geen harde call-to-action.\n\nSchrijf als ondernemer tegen ondernemer, in de je-vorm. Maximaal 120 woorden voor de mailtekst, korte alinea\'s, geen tussenkopjes, geen opsommingstekens, geen superlatieven en geen gedachtestreepjes. Geen ondertekening; de handtekening staat er al onder.\n\nWat je over dit bedrijf zegt komt uit de zoekresultaten of uit de gegevens hieronder, en verder nergens vandaan. Doe GEEN aannames over hoe groot ze zijn, welke software ze nu gebruiken of hoe hun werk loopt. Ontbreekt een gegeven, laat het dan weg in plaats van het in te vullen.\n\nAntwoord in precies dit formaat: eerst drie regels die elk beginnen met \"Onderwerp: \" gevolgd door een korte onderwerpregel (maximaal 45 tekens, nuchter, geen uitroeptekens en geen hoofdletters-geschreeuw), dan een lege regel, dan de e-mailtekst. Begin je antwoord direct met de eerste Onderwerp-regel en schrijf niets over wat je gezocht of gevonden hebt.\n\nGegevens van de lead:\n{context}\n\nExtra aanwijzing van de gebruiker (leeg = geen):\n{text}',
}

// Outreach is kwaliteitsgevoelig en gaat naar echte bedrijven; de overige
// acties blijven op Sonnet staan.
const MODEL_PER_ACTIE: Record<string, string> = {
  'write-lead-email': 'claude-opus-4-8',
}
const STANDAARD_MODEL = 'claude-sonnet-5'

// Opus slaat de zoektool bij lage effort vaak over; dan valt de opening terug
// op een algemeenheid en is de web-search voor niets aangezet.
const LEAD_EFFORT: Record<string, string> = {
  'write-lead-email': 'medium',
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

// Tarief per miljoen tokens, per model. Zonder deze splitsing werd een
// Opus-call op Sonnet-tarief geteld en liep het maandbudget stil te ver door.
// Sonnet 5 staat tot 31-08-2026 op introductieprijs ($2/$10); we rekenen met
// het reguliere tarief zodat het maandbudget niet te laag wordt ingeschat.
// Let op: Sonnet 5 gebruikt een nieuwe tokenizer die ~30% meer tokens telt
// voor dezelfde tekst, dus de schatting moet op echte data geijkt worden.
const TARIEVEN: Record<string, { in: number; uit: number }> = {
  'claude-opus-4-8': { in: 5, uit: 25 },
  'claude-sonnet-5': { in: 3, uit: 15 },
  'claude-haiku-4-5-20251001': { in: 1, uit: 5 },
}

// Web-search wordt per zoekopdracht afgerekend ($10 per 1000), niet per token.
// Zonder deze post telt een lead-opzetje structureel te laag mee in de meter.
const WEB_SEARCH_TARIEF_USD = 0.01

async function updateUsage(userId: string, inputTokens: number, outputTokens: number, model: string, zoekopdrachten = 0): Promise<void> {
  const maand = getCurrentMonth()
  const tarief = TARIEVEN[model] || TARIEVEN['claude-sonnet-5']
  const kosten = ((inputTokens / 1_000_000 * tarief.in) + (outputTokens / 1_000_000 * tarief.uit) + (zoekopdrachten * WEB_SEARCH_TARIEF_USD)) * USD_NAAR_EUR

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
  if (action === 'translate-nl') return ''

  const onderdelen: string[] = []
  if (context.bedrijfscontext) onderdelen.push(`Over het bedrijf: ${context.bedrijfscontext}`)
  if (context.schrijfstijl) onderdelen.push(`Schrijfstijl van de gebruiker (overneem):\n${context.schrijfstijl}`)
  const kennisBlok = daanKennisBlok(context)
  if (kennisBlok) onderdelen.push(kennisBlok)
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

/** Eerste dag van de volgende maand: het moment waarop de teller op nul gaat. */
function volgendeReset(): string {
  const nu = new Date()
  return new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() + 1, 1)).toISOString()
}

/**
 * Het verbruik van de hele organisatie. Dit is wat je daadwerkelijk blokkeert,
 * dus dit hoort de gebruiker te zien — niet zijn eigen aandeel. Anders staat de
 * meter op een derde terwijl Daan al dicht zit door het gebruik van collega's.
 */
async function getOrgUsage(organisatieId: string): Promise<{
  gebruikt: number
  limiet: number
  aantal_calls: number
}> {
  const maand = getCurrentMonth()
  const { data: rows } = await supabase
    .from('ai_usage_org')
    .select('geschatte_kosten, maandlimiet, aantal_calls')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  const lijst = rows ?? []
  return {
    gebruikt: lijst.reduce((s, r) => s + Number(r.geschatte_kosten ?? 0), 0),
    limiet: lijst.length > 0
      ? Math.max(...lijst.map(r => Number(r.maandlimiet ?? STANDAARD_MAANDLIMIET_EUR)))
      : STANDAARD_MAANDLIMIET_EUR,
    aantal_calls: lijst.reduce((s, r) => s + Number(r.aantal_calls ?? 0), 0),
  }
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
  outputPrice: number,
  zoekopdrachten = 0
): Promise<void> {
  const maand = getCurrentMonth()
  const kostenDelta = ((inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice + (zoekopdrachten * WEB_SEARCH_TARIEF_USD)) * USD_NAAR_EUR
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
      const orgId = await resolveOrgId(userId)
      const org = orgId ? await getOrgUsage(orgId) : null
      return res.status(200).json({
        // usage/limiet blijven de waarden waar de meter op staat: het
        // organisatiebudget, want dat is wat blokkeert. eigen_verbruik staat
        // ernaast zodat zichtbaar is welk deel van jou komt.
        usage: org ? org.gebruikt : usage.geschatte_kosten,
        limiet: org ? org.limiet : MONTHLY_LIMIT,
        aantal_calls: org?.aantal_calls ?? 0,
        eigen_verbruik: usage.geschatte_kosten,
        gedeeld: !!org,
        reset_op: volgendeReset(),
        valuta: 'EUR',
      })
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
        //
        // De korte acties zetten thinking expliciet UIT. Op Sonnet 4.6
        // betekende een ontbrekend thinking-veld vanzelf "niet nadenken",
        // maar op Sonnet 5 is adaptive de default: dan moeten denken en
        // antwoord samen in 1024 tokens en kapt het antwoord midden in een
        // zin af. Weglaten van dit veld is dus geen optie meer.
        ...(MODEL_PER_ACTIE[action]
          ? { max_tokens: 4000, thinking: { type: 'adaptive' }, output_config: { effort: LEAD_EFFORT[action] || 'low' } }
          : { max_tokens: 1024, thinking: { type: 'disabled' } }),
        // Zonder web-search kent het model alleen naam en plaats van de lead en
        // blijft de openingszin een algemeenheid over signwerk.
        ...(action === 'write-lead-email'
          ? { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }] }
          : {}),
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
      content: Array<{ type: string; text?: string }>
      usage: {
        input_tokens: number
        output_tokens: number
        server_tool_use?: { web_search_requests?: number }
      }
    }
    // Niet content[0]: met adaptive thinking staat er een thinking-blok voor, en
    // bij een lead-opzetje zoekt het model eerst, met tussentijdse tekst erbij.
    // Alleen wat ná het laatste tool-blok komt is het antwoord zelf; anders
    // begint het niet met "Onderwerp:" en loopt parseOpzet mis.
    const blokken = data.content || []
    let eersteAntwoordBlok = 0
    blokken.forEach((blok, i) => {
      if (blok.type !== 'text' && blok.type !== 'thinking') eersteAntwoordBlok = i + 1
    })
    const resultText = blokken
      .slice(eersteAntwoordBlok)
      .filter(blok => blok.type === 'text')
      .map(blok => blok.text || '')
      .join('\n\n')
      .trim()

    const zoekopdrachten = data.usage.server_tool_use?.web_search_requests ?? 0

    // Update usage tracking
    try {
      await updateUsage(userId, data.usage.input_tokens, data.usage.output_tokens, model, zoekopdrachten)
    } catch {
      // Usage tracking is niet-kritiek
    }

    if (orgIdForBudget) {
      try {
        // Tarief van het model dat écht draaide. Vast op 3/15 boekte een
        // lead-mail (Opus) 40% te laag, waardoor de org-rem te laat ingreep.
        const orgTarief = TARIEVEN[model] || TARIEVEN[STANDAARD_MODEL]
        await logOrgUsage(orgIdForBudget, 'ai-email', data.usage.input_tokens, data.usage.output_tokens, orgTarief.in, orgTarief.uit, zoekopdrachten)
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
