import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ── Productkennis (inline; Vercel bundelt geen api/_helpers/ imports) ──
// Bron-document: docs/DAAN_KNOWLEDGE.md. Houd beide in sync bij wijzigingen.
// Statisch en gelijk voor elke gebruiker, dus geschikt voor prompt-caching.
const DAAN_PRODUCTKENNIS = `PRODUCTKENNIS — gebruik dit om vragen te beantwoorden over hoe de app doen. werkt en waar gebruikers iets vinden. Verwijs naar menu-items en knoppen met hun exacte naam.

OVER DOEN.
doen. is een all-in-one platform voor signmakers en reclamebedrijven (3 tot 30 medewerkers): klanten, offertes, facturen, projecten, montageplanning, werkbonnen, voorraad, inkoopfacturen, e-mail, klantportaal, 3D-visualizer en de AI-assistent Daan op één plek.
- De app heet doen. (kleine letters, met punt). De assistent heet Daan.
- doen. is transparant binnen een bedrijf: iedereen in dezelfde organisatie ziet en plant alles van iedereen (taken, klanten, projecten, planning). Bewuste keuze, geen instelling.
- Tarief: 79 euro per maand, vast bedrag, geen verborgen kosten, maandelijks opzegbaar.
- Eerste 30 dagen gratis (proefperiode met volledige toegang).
- Officieel contactadres: hello@doen.team.
- Navigatie: hoofdmenu links (op mobiel achter het menu-icoon), meerdere tabbladen tegelijk, Cmd/Ctrl+K opent snelzoeken.

KLIKBARE LINKS (belangrijk)
- Verwijs je naar een plek in de app, maak er dan een klikbare Markdown-link van: [Zichtbare naam](/route). De gebruiker kan er dan op klikken om er direct naartoe te gaan.
- Gebruik UITSLUITEND de routes die hieronder bij de modules staan. Verzin nooit een route. Weet je de exacte route niet, noem dan gewoon de naam zonder link.
- Een instellingen-tab link je met /instellingen?tab=ID. Beschikbare tab-ID's: profiel, bedrijf, weergave (= Voorkeuren), teamleden, abonnement, grootboek, btw-codes, kortingen, calculatie, sidebar, email, communicatie, inkoopfactuur-inbox, briefpapier (= Huisstijl/briefpapier), tekeningen, documenten, integraties (= Exact en koppelingen), portaal, beveiliging, import, forgie (= Daan AI).
- Voorbeelden: [Offertes](/offertes), [Nieuwe offerte](/offertes/nieuw), [Klanten](/klanten), [Planning](/planning), [Huisstijl](/instellingen?tab=briefpapier), [Bedrijfsgegevens](/instellingen?tab=bedrijf), [Exact koppelen](/instellingen?tab=integraties), [Team](/instellingen?tab=teamleden).
- Schrijf de naam in de link gewoon als tekst, niet vetgedrukt; zet niet de hele zin in een link, alleen de plek-naam.

MODULES (route -> wat het doet)
- Dashboard (/) : startpunt voor de dag. Blokken Vandaag (montages en taken) en Opvolgen (klanten die aandacht vragen), cijferstrook met openstaande offertes/facturen/werkbonnen, activiteitenlog, en een zwevende plusknop voor snelle acties.
- Klanten (/klanten) : register van klanten en contactpersonen. Per klant tabs voor projecten, deals, offertes, facturen, e-mail en historie. Klanten toevoegen, zoeken/filteren, importeren en exporteren (Excel/CSV), meerdere contactpersonen en vestigingen per bedrijf.
- Deals (/deals) : verkooppijplijn als kanban-bord. Deals tussen fases slepen, waarde/winkans/eigenaar/bron bijhouden. Gewogen waarde = waarde maal winkans. Bij akkoord op een offerte schuift de deal naar gewonnen.
- Leads (/leads) : zelf webformulieren maken die klanten invullen (openbare link /formulier/:token, geen inloggen). Inzendingen bekijken en op status zetten (Nieuw, Bekeken, Verwerkt).
- Projecten (/projecten) : alle werk voor één klus, van offerte tot factuur. Het project-cockpit toont een fasebalk, een wat-nu-suggestie, een acties-kaart (offerte, werkbon, montage, factuur), taken en offertes, montage, klantgegevens, bestanden en een portaal-paneel. Filter Met aandacht = projecten die op jou wachten. Eén project hoort bij één klant.
- Offertes (/offertes) : offertes maken, versturen en beheren via een kanban-bord (concept, verstuurd, bekeken, akkoord, gefactureerd; plus afgewezen, verlopen, wijziging gevraagd). Regels met prijs/btw/korting, prijsopbouw met de calculator, prijsvarianten en optionele regels, versturen per e-mail (met pdf) of via openbare portaallink. In de app reken je met bedragen EXCLUSIEF btw; de klant ziet bedragen INCLUSIEF btw. Wijzigingen worden automatisch bewaard en je kunt versies opslaan en terugdraaien. Verstuurde offerte aanpassen = nieuwe versie maken.
- Inkoopoffertes (/inkoopoffertes) : offertes van leveranciers verzamelen; de app leest de regels uit de pdf, jij controleert ze en gebruikt de inkoopprijzen voor je eigen offerte en marge.
- Facturen (/facturen) : verkoopfacturen maken (handmatig of vanuit een geaccepteerde offerte), versturen, betalingen bijhouden, herinneringen sturen, creditnota's en voorschot-/eindafrekeningen maken. Downloaden als pdf of als UBL (e-factuur). Statussen: concept, verstuurd, betaald, vervallen. Betaald-status zet je zelf.
- Inkoopfacturen (/facturen, tab Inkoop) : leveranciersfacturen komen automatisch binnen via een gekoppelde e-mailinbox; AI leest bedrag, datum, nummer en leverancier uit de pdf. Jij controleert en keurt goed of af. Het uitlezen kent een maandlimiet.
- Werkbonnen (/werkbonnen) : werkinstructie voor de monteur op locatie (klant, locatie, wat te doen, foto's/tekeningen, terugkoppeling en handtekening). Maken los of vanuit een project; foto's, logo of pdf plaatsen met formaat klein/normaal/groot. Op de telefoon een vereenvoudigde monteursweergave.
- Bestelbonnen (/bestelbonnen) : inkoopbestelling naar een leverancier, koppelbaar aan een project, met statussen van concept tot ontvangen; downloaden als pdf.
- Leveringsbonnen (/leveringsbonnen) : pakbon, bewijs van wat bij de klant geleverd is, door de klant af te tekenen. Werkbon = instructie voor monteur; leveringsbon = bewijs van levering.
- Planning (/planning) : UITSLUITEND voor montage (fysieke klussen op locatie). Week- en maandweergave, afspraken verslepen per monteur, conflictwaarschuwing bij dubbele boeking, weer en sluitingsdagen, weekplanning afdrukken, vanuit een afspraak een werkbon maken.
- Taken (/taken) : al het werk ROND de montage (offertes opvolgen, inkoop, administratie, terugbellen). Week-, maand- en baanweergave, prioriteiten, toewijzen aan jezelf of een collega (standaardfilter Iedereen). Verwijderde taak is 5 seconden ongedaan te maken. LET OP het verschil: montage hoort in Planning, al het andere in Taken.
- Team (/team) : teamleden uitnodigen via e-mail, rollen instellen (admin, medewerker, monteur, verkoop, productie), medewerkers (de)activeren, verlof en beschikbaarheid bijhouden.
- Booking (/booking) : klanten zelf online laten boeken via een openbare link (/boeken/:userId). Tijdsloten instellen, link delen, binnengekomen afspraken bevestigen of annuleren.
- Email (/email) : volwaardige e-mailclient met je eigen mailaccount (IMAP/SMTP). Lezen, beantwoorden, schrijven, inplannen, sjablonen. Sales Inbox met tabblad Opvolgen voor mail waar je nog een reactie op verwacht; binnenkomende reacties worden zo goed mogelijk automatisch gekoppeld (op afzender, niet waterdicht). Daan kan e-mail herschrijven (korter, formeler, vertalen).
- Klantportaal : beheer op /portalen, voor de klant op een openbare link /portaal/:token (geen inloggen). De klant ziet een tijdlijn van zijn project (berichten, offertes, facturen, afbeeldingen, tekeningen), kan offertes en tekeningen goedkeuren of een wijziging vragen, reageren en facturen online betalen. Huisstijl van het portaal: header-achtergrond en logo aanpasbaar, de rest blijft doen.-stijl.
- Documenten (/documenten) : centraal bestandsarchief en briefpapier/sjablonen.
- Kennisbank (/kennisbank) : interne artikelen met uitleg en tips; Daan gebruikt deze ook.
- Visualizer (/visualizer) : realistische voorbeeldafbeeldingen (mockups) van signing-ontwerpen maken op basis van een beschrijving of afbeelding, met een gekozen beeldverhouding. Werkt met credits; mockups koppelbaar aan project of offerte.
- Financieel (/financieel) : kerncijfers, plus beheer van uitgaven, leveranciers (met KvK-zoekfunctie) en voorraad (artikelen, mutaties, minimumvoorraad met waarschuwing). Voorraad ook via /voorraad.
- Rapportages (/rapportages) : overzichten van omzet, marge, uren, klanten en projecten over een gekozen periode; exporteren naar Excel/CSV.
- Forecast (/forecast) : omzetprognose op basis van historie en openstaande deals; toont pijplijnwaarde en gewogen waarde.
- Nacalculatie (/nacalculatie) : na afronding offertebedrag vergelijken met werkelijke kosten (uren, materiaal, uitgaven) en de marge per project zien.
- Tijdregistratie (/tijdregistratie) : uren per project registreren met timer of handmatig, factureerbaar markeren, en geselecteerde uren in één keer op een factuur zetten.
- Instellingen (/instellingen) : tabbladen voor Profiel, Bedrijf, Team, Huisstijl/briefpapier (logo, kleuren, opmaak van documenten), Portaal, Integraties (waaronder Exact), Kennisbank, Calculatie, Kostenplaatsen, Abonnement, Daan, Visualizer, Beveiliging, Weergave en E-mail/communicatie (eigen mailaccount koppelen, handtekening, sjablonen, opvolging).
- Importeren (/importeren) : in één keer bestaande klanten, contactpersonen en historische gegevens inladen via Excel/CSV; importgeschiedenis toont verwerkt/overgeslagen/fouten.
- Onboarding : welkomstpagina en instelwizard direct na registratie (bedrijfsgegevens en logo, team uitnodigen, eerste offerte) met de belofte van je eerste offerte binnen ongeveer een half uur.

VEELGESTELDE HOW-TO'S
- Eerste offerte: vul logo en bedrijfsgegevens in (Instellingen), ga naar Offertes, Nieuwe offerte, kies klant, voeg regels toe, controleer de pdf-preview, verstuur per e-mail en/of portaallink.
- Collega uitnodigen: Team (of Instellingen, Team), e-mailadres invoeren, rol kiezen; de collega krijgt een uitnodiging per e-mail.
- Exact Online koppelen: Instellingen, Integraties. De koppeling is EENRICHTING (doen. naar Exact). De betaald-status vink je in doen. zelf af. Een in doen. verwijderde factuur verdwijnt niet vanzelf uit Exact.
- Huisstijl: Instellingen, Huisstijl/briefpapier (logo, kleuren, documentopmaak); bedrijfsgegevens onder Instellingen, Bedrijf.
- Prijs: 79 euro per maand, vast, geen verborgen kosten. Voor exact aantal inbegrepen gebruikers of afspraken bij grote teams: pagina Abonnement of hello@doen.team.
- Proefperiode: 30 dagen gratis met volledige toegang; daarna blijven gegevens bewaard en activeer je een abonnement om door te werken.
- Data exporteren: veel modules hebben een exportknop (klanten Excel/CSV, rapporten en nacalculatie Excel/CSV, facturen pdf of UBL). Volledige uitvoer daarbuiten: hello@doen.team.
- Mobiel: werkt via de browser, sommige modules hebben een mobiele weergave; volledige offline is nog in ontwikkeling.

WAT JE NIET DOET (belangrijk)
- Geen beloftes over toekomstige functies of prijzen. Alleen praten over wat er nu is. Prijsvragen buiten de 79 euro per maand: verwijs naar Abonnement of hello@doen.team.
- Geen toezeggingen over data-migratie buiten de standaard importfunctie; verwijs anders naar Medewerker spreken of hello@doen.team.
- Geen juridisch advies (AVG, privacy, voorwaarden); verwijs naar de documenten of een medewerker.
- Raad geen wijzigingen aan account- of bedrijfsinstellingen aan zonder bevestiging van de gebruiker.
- Bij bugs, foutmeldingen of dingen die je niet zeker weet: verzin niets, zeg eerlijk dat je het niet zeker weet en verwijs naar de knop Medewerker spreken.
- Doe geen uitspraken over de interne werking, database of code van de app.`

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

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for ai-chat, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(20, '60 s'), prefix: 'rl:ai-chat', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] ai-chat id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] ai-chat id=${identifier} err=${(err as Error).message}`)
    return true
  }
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

// ============ CONTEXT RETRIEVAL ============

interface ContextBlock {
  type: string
  [key: string]: unknown
}

async function getRelevantContext(userId: string, question: string): Promise<ContextBlock[]> {
  const q = question.toLowerCase()
  const context: ContextBlock[] = []

  // Zoek specifieke klantnaam in de vraag
  const { data: alleKlanten } = await supabase
    .from('klanten')
    .select('id, bedrijfsnaam')
    .eq('user_id', userId)

  const gevondenKlant = alleKlanten?.find(k =>
    q.includes(k.bedrijfsnaam.toLowerCase())
  )

  if (gevondenKlant) {
    const [projecten, offertes, facturen] = await Promise.all([
      supabase
        .from('projecten')
        .select('naam, status, budget, start_datum, eind_datum')
        .eq('klant_id', gevondenKlant.id),
      supabase
        .from('offertes')
        .select('nummer, titel, totaal, status, geldig_tot')
        .eq('klant_id', gevondenKlant.id),
      supabase
        .from('facturen')
        .select('nummer, titel, totaal, status, factuurdatum')
        .eq('klant_id', gevondenKlant.id),
    ])

    context.push({
      type: 'klant_detail',
      klant: gevondenKlant.bedrijfsnaam,
      projecten: projecten.data,
      offertes: offertes.data,
      facturen: facturen.data,
    })
  }

  // Klanten — als de vraag over klanten gaat
  if (q.includes('klant') || q.includes('contact') || q.includes('wie')) {
    const { data: klanten } = await supabase
      .from('klanten')
      .select('bedrijfsnaam, contactpersoon, email, telefoon, stad')
      .eq('user_id', userId)
      .limit(20)
    if (klanten?.length) context.push({ type: 'klanten', data: klanten })
  }

  // Facturen — als het over geld/omzet/facturen gaat
  if (q.includes('omzet') || q.includes('factuur') || q.includes('betaald') || q.includes('openstaand') || q.includes('geld') || q.includes('inkomsten')) {
    const { data: facturen } = await supabase
      .from('facturen')
      .select('nummer, klant_naam, totaal, status, factuurdatum')
      .eq('user_id', userId)
      .order('factuurdatum', { ascending: false })
      .limit(30)
    if (facturen?.length) context.push({ type: 'facturen', data: facturen })
  }

  // Offertes
  if (q.includes('offerte') || q.includes('pipeline') || q.includes('marge') || q.includes('open')) {
    const { data: offertes } = await supabase
      .from('offertes')
      .select('nummer, klant_naam, totaal, status, geldig_tot')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (offertes?.length) context.push({ type: 'offertes', data: offertes })
  }

  // Projecten
  if (q.includes('project') || q.includes('planning') || q.includes('deadline') || q.includes('werk')) {
    const { data: projecten } = await supabase
      .from('projecten')
      .select('naam, klant_naam, status, eind_datum, budget')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (projecten?.length) context.push({ type: 'projecten', data: projecten })
  }

  // Als niks specifieks gevonden: haal recente activiteit
  if (context.length === 0) {
    const [recenteFacturen, recenteOffertes] = await Promise.all([
      supabase
        .from('facturen')
        .select('nummer, klant_naam, totaal, status')
        .eq('user_id', userId)
        .order('factuurdatum', { ascending: false })
        .limit(10),
      supabase
        .from('offertes')
        .select('nummer, klant_naam, totaal, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    context.push({
      type: 'recent',
      facturen: recenteFacturen.data,
      offertes: recenteOffertes.data,
    })
  }

  // Laad ALTIJD alle geïmporteerde CSV data als context
  const { data: allCsvData } = await supabase
    .from('ai_imported_data')
    .select('data, bestandsnaam')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (allCsvData?.length) {
    // Groepeer per bestandsnaam voor overzichtelijkheid
    const grouped: Record<string, unknown[]> = {}
    for (const row of allCsvData) {
      const key = row.bestandsnaam || 'onbekend'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(row.data)
    }
    context.push({ type: 'geimporteerde_csv_data', bestanden: grouped })
  }

  // Zoek ook specifiek op zoekwoorden voor extra relevantie
  const searchWords = question.split(' ').filter(w => w.length > 3).join(' & ')
  if (searchWords) {
    const { data: csvResults } = await supabase
      .from('ai_imported_data')
      .select('data, bestandsnaam')
      .eq('user_id', userId)
      .textSearch('zoek_tekst', searchWords, { type: 'plain' })
      .limit(15)

    if (csvResults?.length) {
      context.push({ type: 'csv_zoekresultaten', data: csvResults.map(r => r.data) })
    }
  }

  return context
}

// ============ HANDLER ============

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!(await enforceRateLimit(userId, res))) return

    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI niet geconfigureerd', configured: false })
    }

    const { action, question, history } = req.body as {
      action: 'chat' | 'get-history' | 'clear-history' | 'import-csv' | 'get-imports' | 'delete-import'
      question?: string
      history?: Array<{ role: string; content: string }>
      // import-csv fields
      bestandsnaam?: string
      rows?: Array<Record<string, unknown>>
      // delete-import
      importId?: string
    }

    // === GET CHAT HISTORY ===
    if (action === 'get-history') {
      const { data } = await supabase
        .from('ai_chat_history')
        .select('role, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50)
      return res.status(200).json({ messages: data || [] })
    }

    // === CLEAR CHAT HISTORY ===
    if (action === 'clear-history') {
      await supabase
        .from('ai_chat_history')
        .delete()
        .eq('user_id', userId)
      return res.status(200).json({ ok: true })
    }

    // === IMPORT CSV DATA ===
    if (action === 'import-csv') {
      const { bestandsnaam, rows } = req.body as { bestandsnaam?: string; rows?: Array<Record<string, unknown>> }
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Geen data om te importeren' })
      }

      const records = rows.map(row => ({
        user_id: userId,
        bestandsnaam: bestandsnaam || 'onbekend.csv',
        bron: 'csv',
        data: row,
        zoek_tekst: Object.values(row).filter(Boolean).join(' '),
      }))

      const { error } = await supabase
        .from('ai_imported_data')
        .insert(records)

      if (error) {
        console.error('Import fout:', error)
        return res.status(500).json({ error: 'Importeren mislukt' })
      }

      return res.status(200).json({ ok: true, count: records.length })
    }

    // === GET IMPORTS LIST ===
    if (action === 'get-imports') {
      const { data } = await supabase
        .from('ai_imported_data')
        .select('id, bestandsnaam, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Group by bestandsnaam
      const grouped: Record<string, { bestandsnaam: string; count: number; created_at: string; ids: string[] }> = {}
      for (const row of data || []) {
        const key = row.bestandsnaam || 'onbekend'
        if (!grouped[key]) {
          grouped[key] = { bestandsnaam: key, count: 0, created_at: row.created_at, ids: [] }
        }
        grouped[key].count++
        grouped[key].ids.push(row.id)
      }

      return res.status(200).json({ imports: Object.values(grouped) })
    }

    // === DELETE IMPORT ===
    if (action === 'delete-import') {
      const { bestandsnaam: delName } = req.body as { bestandsnaam?: string }
      if (!delName) return res.status(400).json({ error: 'Bestandsnaam is verplicht' })

      await supabase
        .from('ai_imported_data')
        .delete()
        .eq('user_id', userId)
        .eq('bestandsnaam', delName)

      return res.status(200).json({ ok: true })
    }

    // === CHAT ===
    if (action !== 'chat' || !question) {
      return res.status(400).json({ error: 'Action "chat" en question zijn verplicht' })
    }

    // Check usage limit
    const withinLimit = await checkUsageLimit(userId)
    if (!withinLimit) {
      return res.status(429).json({
        error: 'Daan limiet bereikt',
        message: 'Je hebt het maximum van \u20AC5 aan Daan-gebruik bereikt deze maand.',
      })
    }

    // Org-level AI budget check (\u20AC10/maand cap)
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

    const { bedrijfscontext, schrijfstijl } = await buildDaanContext(supabase, userId)

    // Get relevant data context
    const dataContext = await getRelevantContext(userId, question)

    // Build system prompt.
    // Statisch deel (persona + productkennis + regels): identiek voor elke
    // gebruiker en elk gesprek, dus als cache-baar prefix gemarkeerd zodat de
    // extra productkennis de tokenkosten nauwelijks raakt.
    const systemStatic = `Je bent Daan, de AI-assistent van Doen. Je bent het bedrijfsgeheugen van de gebruiker. Je bent direct, behulpzaam en een beetje eigenwijs — net als de vakmensen die je helpt.

${DAAN_PRODUCTKENNIS}

REGELS:
- Antwoord kort en bondig in het Nederlands
- Gebruik concrete getallen, namen en datums uit de data
- Als je het antwoord niet weet op basis van de beschikbare data, zeg dat eerlijk
- Kijk ALTIJD ook in de geïmporteerde CSV data (type: geimporteerde_csv_data) — dit bevat historische klant-, project- en facturatiegegevens
- Als data uit een CSV import komt, vermeld dat het historische/geïmporteerde data betreft
- Geef bedragen altijd in euro's met twee decimalen
- Bij opsommingen: maximaal 10 items, daarna "en nog X meer"
- Gebruik **dikgedrukt** voor belangrijke getallen en namen
- Geen emoji's. Gebruik de je-vorm. Bij vragen over hoe de app werkt: gebruik de PRODUCTKENNIS hierboven en verwijs naar menu-items en knoppen met hun exacte naam. Bij een complexe uitleg: stap-voor-stap met een genummerde lijst.

VRAAG OF OPDRACHT (belangrijk):
- Een VRAAG over data ("hoeveel offertes had ik?", "wat staat er open?") beantwoord je gewoon in tekst. Roep dan GEEN tool aan.
- Een duidelijke OPDRACHT om iets aan te maken ("maak een project/klant/taak voor…") handel je af met de tool 'stel_actie_voor': geef het type en de velden die de gebruiker noemt. Verzin GEEN waarden die je niet hebt en reken NIETS uit. Zet bij een tool-aanroep ook altijd een korte, leesbare bevestigingszin in je tekst, bv. "Ik zou nu een project aanmaken voor KWS Vegetables — klopt dat?". Vraagt de gebruiker om een offerte, stel dan een PROJECT voor; de app biedt daarna zelf aan om er een offerte bij te maken.
- TWIJFEL je of een bericht een vraag of een opdracht is (bv. alleen een losse naam zonder werkwoord)? Roep dan GEEN tool aan, maar stel een korte verhelderende wedervraag in tekst, bv. "Bedoel je dat ik die offerte moet aanmaken?".
- Je voert zelf niets uit en slaat niets op; je stelt alleen een actie voor die de gebruiker daarna zelf bevestigt.`

    // Dynamisch deel (per gebruiker en per vraag): bedrijfscontext en de actuele
    // bedrijfsdata. Niet cache-baar, dus als los systemblok na het statische deel.
    const systemDynamic = `${bedrijfscontext ? `Over het bedrijf: ${bedrijfscontext}\n` : ''}${schrijfstijl ? `\nSchrijfstijl van de gebruiker (overneem in je antwoorden):\n${schrijfstijl}\n` : ''}
Je hebt toegang tot de volgende bedrijfsdata:

${JSON.stringify(dataContext, null, 2)}`

    // Build messages with conversation history
    const messages: Array<{ role: string; content: string }> = []
    if (history && Array.isArray(history)) {
      // Include last 4 messages for context
      const recentHistory = history.slice(-4)
      for (const msg of recentHistory) {
        messages.push({ role: msg.role === 'forgie' ? 'assistant' : msg.role, content: msg.content })
      }
    }
    messages.push({ role: 'user', content: question })

    // Tool waarmee Daan een actie kan VOORSTELLEN (niet uitvoeren). De vorm
    // { type, data } sluit aan op de bestaande ForgieActieKaart in de frontend.
    const actieTool = {
      name: 'stel_actie_voor',
      description:
        'Stel voor om een record aan te maken wanneer de gebruiker daar een duidelijke opdracht toe geeft. ' +
        'Voer niets uit en sla niets op; dit is alleen een voorstel dat de gebruiker daarna zelf bevestigt. ' +
        'Verwachte velden in "data" per type: ' +
        'klant: bedrijfsnaam, contactpersoon, email, telefoon. ' +
        'project: naam, klant_naam, beschrijving, status. ' +
        'taak: titel, beschrijving, project_naam, prioriteit, deadline. ' +
        'Vul alleen velden die de gebruiker noemt; verzin niets en reken niets uit. ' +
        'Voor een project: gebruik de projectnaam die de gebruiker noemt; noemt hij er geen, ' +
        'stel er dan een voor op basis van het werk in de opdracht (bv. "Beachflag + montage"). ' +
        'Gebruik NOOIT de klantnaam als projectnaam, en laat "naam" leeg als er niets bruikbaars is. ' +
        'Een offerte stel je NOOIT los voor: vraagt de gebruiker om een offerte, stel dan een project voor — ' +
        'de app biedt daarna zelf aan om er een offerte bij te maken.',
      input_schema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['klant', 'project', 'taak'] },
          data: { type: 'object', description: 'De ingevulde velden voor dit type, leesbaar (namen, geen ids).' },
        },
        required: ['type', 'data'],
      },
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: [
          { type: 'text', text: systemStatic, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: systemDynamic },
        ],
        messages,
        tools: [actieTool],
        tool_choice: { type: 'auto' },
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
      content: Array<{ type: string; text?: string; name?: string; input?: unknown }>
      usage: { input_tokens: number; output_tokens: number }
    }
    const blocks = data.content || []

    // Verzamel alle tekstblokken (gedrag blijft gelijk als er geen tool_use is).
    const textParts = blocks.filter((b) => b.type === 'text' && b.text).map((b) => b.text as string)

    // Verzamel voorgestelde acties uit tool_use-blokken; { type, data } sluit aan op ForgieActieKaart.
    const acties = blocks
      .filter((b) => b.type === 'tool_use' && b.name === 'stel_actie_voor')
      .map((b) => b.input as { type?: string; data?: Record<string, unknown> })
      .filter((input) => input && typeof input.type === 'string' && input.data && typeof input.data === 'object')
      .map((input) => ({ type: input.type as string, data: input.data as Record<string, unknown> }))

    const resultText =
      textParts.join('\n').trim() ||
      (acties.length > 0 ? 'Ik heb een actie voor je klaargezet.' : '')

    // Update usage tracking
    try {
      await updateUsage(userId, data.usage.input_tokens, data.usage.output_tokens)
    } catch {
      // Usage tracking is niet-kritiek
    }

    if (orgIdForBudget) {
      try {
        await logOrgUsage(orgIdForBudget, 'ai-chat', data.usage.input_tokens, data.usage.output_tokens, 3, 15)
      } catch {
        // Org-usage tracking is niet-kritiek
      }
    }

    // Save chat messages to history
    try {
      await supabase.from('ai_chat_history').insert([
        { user_id: userId, role: 'user', content: question },
        { user_id: userId, role: 'forgie', content: resultText },
      ])
    } catch {
      // Niet-kritiek
    }

    const currentUsage = await getUsage(userId).catch(() => ({ geschatte_kosten: 0 }))

    return res.status(200).json({
      answer: resultText,
      usage: currentUsage.geschatte_kosten,
      limiet: MONTHLY_LIMIT,
      ...(acties.length > 0 ? { acties } : {}),
    })
  } catch (error: unknown) {
    console.error('AI Chat API fout:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI verzoek mislukt' })
  }
}
