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

const PROMPTS: Record<string, string> = {
  'summarize': 'Vat deze email samen in 2-3 korte zinnen in het Nederlands. Antwoord alleen met de samenvatting.\n\nEmail:\n{text}',
  'summarize-thread': 'Je vat een e-mailconversatie samen voor het projectteam van een signing-bedrijf. Focus op: (1) wat de klant heeft gevraagd of bevestigd, (2) welke afspraken zijn gemaakt — data, prijzen, leveringen, materialen, (3) welke openstaande vragen er nog zijn, (4) huidige status. Schrijf maximaal 5 korte bullets, in het Nederlands. Begin elke bullet met een gedachtenstreepje. Antwoord alleen met de bullets, geen aanhef of slotzin.\n\nConversatie (chronologisch, oudste eerst):\n{text}',
  'translate-nl': 'Vertaal deze email naar het Nederlands. Behoud de toon. Antwoord alleen met de vertaling.\n\nEmail:\n{text}',
  // Deze actie ging structureel mis op één punt: Daan vroeg om gegevens die al in de mail stonden. Een aanvraag met specificaties, bijlagen en een leverdatum kreeg een antwoord terug dat om het vectorbestand, het materiaal en een foto vroeg, terwijl alle drie waren meegestuurd. Vandaar dat de instructie begint met inventariseren en pas daarna met schrijven.
  'generate-reply': 'Je schrijft namens een signbedrijf een antwoord op een binnengekomen e-mail.\n\nWERK IN DEZE VOLGORDE.\n1. Lees de hele mail, inclusief de lijst met bijlagen onderaan de context. Ga na welke gegevens de afzender al heeft gegeven: afmetingen, kleuren, materiaal, aantallen, montagesituatie, leverdatum, bestemming, en welke bestanden zijn meegestuurd.\n2. Bepaal wat er dan nog ECHT ontbreekt om een offerte te kunnen maken.\n3. Schrijf pas daarna je antwoord.\n\nVRAAG NOOIT OM IETS DAT AL IN DE MAIL OF IN DE BIJLAGEN STAAT. Dat is de belangrijkste regel: een klant die alles netjes heeft aangeleverd en dan dezelfde vragen terugkrijgt, voelt zich niet gelezen. Twijfel je of iets gegeven is, ga er dan van uit dat het gegeven is en vraag er niet naar. Ontbreekt er niets, stel dan geen enkele vraag en bevestig gewoon dat de offerte eraan komt.\n\nVraag ook niet naar zaken waarover de klant juist ONS advies vraagt. Vraagt hij om advies over materiaal of dikte, dan geef je advies of je zegt dat je erop terugkomt in de offerte; je stelt die vraag niet aan hem terug.\n\nBevestig kort en concreet wat je begrepen hebt, in je eigen woorden en met de gegevens uit de mail, zodat de klant ziet dat het gelezen is. Herhaal niet de hele specificatielijst.\n\nVerzin niets. Noem geen prijzen, levertijden, materialen of maten die niet in de mail staan, tenzij je ze expliciet als advies of voorbehoud formuleert. Beloof geen datum die je niet kent; zeg dan dat je in de offerte laat weten of de gevraagde datum haalbaar is.\n\nAntwoord in de taal van de binnengekomen mail. Hou het compact, hooguit een korte alinea plus eventueel een paar punten, en gebruik geen gedachtestreepjes. Antwoord alleen met de tekst van het antwoord, zonder onderwerpregel en zonder ondertekening; de handtekening staat er al onder.\n\nDe binnengekomen mail:\n{text}',
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

// Acties waarbij het model eerst moet begrijpen wat er al gezegd is voordat
// het schrijft. De overige acties (samenvatten, vertalen) zijn mechanisch
// genoeg om zonder denkstap te draaien.
const DENKENDE_ACTIES = new Set(['generate-reply'])

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
  betrouwbaar: boolean
}> {
  const maand = getCurrentMonth()
  const { data: rows, error: verbruikFout } = await supabase
    .from('ai_usage_org')
    .select('geschatte_kosten, maandlimiet, aantal_calls')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  if (verbruikFout) {
    console.error('getOrgUsage: verbruik onleesbaar', organisatieId, verbruikFout)
  }
  const lijst = rows ?? []
  const { limiet, betrouwbaar } = await haalMaandlimiet(organisatieId, maand)
  return {
    gebruikt: lijst.reduce((s, r) => s + Number(r.geschatte_kosten ?? 0), 0),
    limiet,
    aantal_calls: lijst.reduce((s, r) => s + Number(r.aantal_calls ?? 0), 0),
    betrouwbaar: !verbruikFout && betrouwbaar,
  }
}

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
  outputPrice: number,
  zoekopdrachten = 0
): Promise<void> {
  const maand = getCurrentMonth()
  const kostenDelta = ((inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice + (zoekopdrachten * WEB_SEARCH_TARIEF_USD)) * USD_NAAR_EUR
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

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for ai-email, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(20, '60 s'), prefix: 'rl:ai-email', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] ai-email id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] ai-email id=${identifier} err=${(err as Error).message}`)
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
        onbekend: org ? !org.betrouwbaar : false,
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
    const orgIdForBudget = await resolveOrgId(userId)
    const withinLimit = await checkUsageLimit(userId, orgIdForBudget)
    if (!withinLimit) {
      const { limiet } = orgIdForBudget
        ? await haalMaandlimiet(orgIdForBudget, getCurrentMonth())
        : { limiet: MONTHLY_LIMIT }
      return res.status(429).json({
        error: 'Daan limiet bereikt',
        message: `Je hebt deze maand voor \u20ac${limiet} aan Daan-gebruik bereikt.`,
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
          : DENKENDE_ACTIES.has(action)
            // Een antwoord schrijven begint met uitpluizen wat de afzender al
            // heeft verteld. Met thinking uit leest het model de mail vluchtig
            // en vraagt het om gegevens die er al staan. Ruimer token-budget,
            // want denken en antwoord moeten er samen in passen.
            ? { max_tokens: 3000, thinking: { type: 'adaptive' }, output_config: { effort: 'low' } }
            : { max_tokens: 1024, thinking: { type: 'disabled' } }),
        // Zonder web-search kent het model alleen naam en plaats van de lead en
        // blijft de openingszin een algemeenheid over signwerk.
        ...(action === 'write-lead-email'
          ? { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }] }
          : {}),
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
      // Ruim genomen: write-lead-email doet server-side web_search (max 3
      // rondjes) bovenop adaptive thinking, en dat mag niet halverwege
      // afgekapt worden. Dit vangt alleen een echt hangende verbinding.
      signal: AbortSignal.timeout(120_000),
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

    await schrijfSpoor(orgIdForBudget, userId, 'ai-email', {
      actie: action,
      invoer: String(text || context || '').slice(0, 600),
      resultaat: resultText.slice(0, 600),
    })

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
