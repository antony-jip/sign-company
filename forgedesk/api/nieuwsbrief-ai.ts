import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const config = { maxDuration: 60 }

const OWNER_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const MAX_AFBEELDINGEN = 6

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

async function verifyOwner(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return false
  return user.id === OWNER_USER_ID
}

// Daan-bedrijfscontext (inline; Vercel bundelt geen api/_helpers/ imports).
async function loadDaanContext(client: SupabaseClient, userId: string): Promise<{ bedrijfscontext: string; schrijfstijl: string }> {
  let bedrijfscontext = ''
  let schrijfstijl = ''
  const { data: profile } = await client.from('profiles').select('organisatie_id').eq('id', userId).maybeSingle()
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
  return { bedrijfscontext, schrijfstijl }
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

const isHttpUrl = (u: string) => /^https?:\/\/\S+$/i.test(u.trim())

function buildSystemPrompt(bedrijfscontext: string, schrijfstijl: string): string {
  let p = `Je bent Daan, de assistent van signbedrijf Sign Company. Je schrijft een e-mailnieuwsbrief en levert die als kant-en-klare HTML.

STRICTE OUTPUT-REGELS:
- Antwoord UITSLUITEND met HTML, geen uitleg, geen markdown, geen \`\`\`-blokken.
- Lever ALLEEN de inhoud die binnen de mailbody komt: GEEN <html>, <head>, <body> of buitenste container (die wordt automatisch toegevoegd).
- Gebruik e-mail-veilige HTML: <table>-layout waar nodig, ALLE styling inline (style="..."), geen <style>-blok, geen externe CSS, geen JavaScript.
- Breedte maximaal 536px; afbeeldingen responsive met style="max-width:100%;height:auto;display:block;border-radius:8px;".
- Huisstijl-kleuren: tekst #1A1A1A, secundair #57574F, accent/knoppen #F15025 (flame), links/koppen mogen #1A535C (petrol). Achtergrond van de kaart is wit.
- Knoppen "bulletproof": een <table> met achtergrondkleur en een <a> met inline padding, geen CSS-only knoppen.
- Nederlands. Gebruik GEEN em-dashes (—); gebruik puntkomma's, komma's of een middelpunt (·).
- Sluit af met een nette ondertekening namens Sign Company.`
  if (bedrijfscontext) p += `\n\nOver het bedrijf:\n${bedrijfscontext}`
  if (schrijfstijl) p += `\n\nSchrijfstijl / tone of voice om aan te houden:\n${schrijfstijl}`
  return p
}

// Blokken-modus: Daan levert het document van de bouwer (src/components/
// nieuwsbrief/nieuwsbriefBlokken.ts) als JSON; de client rendert de HTML.
function buildBlokkenPrompt(bedrijfscontext: string, schrijfstijl: string): string {
  let p = `Je bent Daan, de assistent van signbedrijf Sign Company. Je schrijft een e-mailnieuwsbrief als een lijst BLOKKEN in JSON, voor een drag-and-drop-bouwer.

STRICTE OUTPUT-REGELS:
- Antwoord UITSLUITEND met een JSON-array van blokken. Geen uitleg, geen markdown, geen \`\`\`-blokken.
- Elk blok is een object met "type" en de velden van dat type. Gebruik alleen deze types:
  {"type":"header","naam":"Sign Company","tagline":"korte onderregel of leeg","uitlijning":"links"}
  {"type":"kop","tekst":"...","niveau":1|2|3,"uitlijning":"links"|"midden"}
  {"type":"tekst","html":"<p>...</p><p>...</p>","grootte":"normaal"|"klein"|"groot","uitlijning":"links"}
  {"type":"afbeelding","url":"https://...","alt":"beschrijving","bijschrift":"optioneel","link":"","breedte":"vol"}
  {"type":"knop","tekst":"...","url":"https://...","uitlijning":"links"|"midden","stijl":"vol"|"omlijnd","breedte":"auto"|"vol"}
  {"type":"afbeelding_tekst","url":"https://...","alt":"...","kop":"...","html":"<p>...</p>","positie":"links"|"rechts","knopTekst":"","knopUrl":""}
  {"type":"kolommen","kolommen":[{"kop":"...","html":"<p>...</p>","url":"","knopTekst":"","knopUrl":""},{"kop":"...","html":"<p>...</p>","url":"","knopTekst":"","knopUrl":""}]}
  {"type":"quote","tekst":"...","bron":"naam, bedrijf"}
  {"type":"highlight","kop":"...","html":"<p>...</p>","variant":"zacht"|"accent"|"donker","knopTekst":"...","knopUrl":"https://..."}
  {"type":"lijn"}
  {"type":"ruimte","hoogte":24}
  {"type":"footer","bedrijfsnaam":"Antony · Sign Company","adres":"","telefoon":"","website":"https://signcompany.nl","linkedin":"","instagram":"","facebook":""}
- In "html"-velden alleen <p>, <strong>, <em>, <a href>, <ul>, <ol>, <li>, <br>. Geen inline styles.
- Begin met een header-blok, eindig met een footer-blok. Gebruik 5 tot 10 blokken. Wissel tekst af met beeld, een quote of een uitgelicht vlak; maximaal één knop per onderwerp.
- Spreek de lezer aan met {{{contact.first_name|relatie}}} in de eerste tekstregel ("Beste {{{contact.first_name|relatie}}},").
- Plaats gegeven foto-URL's in afbeelding- of afbeelding_tekst-blokken, met een alt-tekst die beschrijft wat erop staat. Verzin geen URL's.
- Knoppen en links alleen naar https://signcompany.nl, een pagina daarvan, of mailto:antony@signcompany.nl, tenzij de briefing een andere link geeft.
- Nederlands. Actieve, concrete taal. Geen em-dashes (—); gebruik komma's, punten of een middelpunt (·). Geen emoji's.`
  if (bedrijfscontext) p += `\n\nOver het bedrijf:\n${bedrijfscontext}`
  if (schrijfstijl) p += `\n\nSchrijfstijl / tone of voice om aan te houden:\n${schrijfstijl}`
  return p
}

// Chat-modus: Daan bewerkt het bestaande document in kleine stappen. Hij
// krijgt de blokken met id's en geeft acties terug; de client past ze één
// voor één toe, zodat je de nieuwsbrief ziet veranderen terwijl je praat.
function buildChatPrompt(bedrijfscontext: string, schrijfstijl: string): string {
  let p = `Je bent Daan, de assistent van signbedrijf Sign Company. Je zit naast Antony in de nieuwsbrief-bouwer en past de nieuwsbrief aan op basis van wat hij in de chat zegt.

Je krijgt het HUIDIGE DOCUMENT als JSON-lijst van blokken, elk met een "id". Gebruik die id's in je acties.

STRICTE OUTPUT-REGELS:
- Antwoord UITSLUITEND met één JSON-object: {"antwoord":"...","acties":[...]}. Geen uitleg buiten de JSON, geen markdown, geen \`\`\`-blokken.
- "antwoord": één of twee korte zinnen in gewoon Nederlands, alsof je het hardop zegt ("Ik heb de intro korter gemaakt en een knop naar de projectenpagina gezet."). Stel hooguit één wedervraag als iets echt onduidelijk is. Geen opsommingen.
- "acties": lijst met wijzigingen, in de volgorde waarin ze moeten gebeuren. Leeg als er niets te wijzigen is (bv. bij een vraag). Beschikbaar:
  {"actie":"vervang","id":"<bestaand id>","blok":{<volledig blok, zelfde type en id, met alle velden>}}
  {"actie":"voeg_toe","na":"<id van het blok waarna het komt, of null voor bovenaan>","blok":{<nieuw blok zonder id>}}
  {"actie":"verwijder","id":"<id>"}
  {"actie":"verplaats","id":"<id>","na":"<id of null voor bovenaan>"}
  {"actie":"onderwerp","onderwerp":"...","preheader":"..."}
  {"actie":"alles","blokken":[<volledige nieuwe lijst blokken>]}  (alleen als Antony expliciet om een heel nieuwe nieuwsbrief vraagt)
- Wijzig alleen wat gevraagd is. Raak andere blokken niet aan. Bij "vervang" kopieer je de velden die niet veranderen letterlijk over.
- Bloktypes en velden:
  {"type":"header","naam":"Sign Company","tagline":"","uitlijning":"links"}
  {"type":"kop","tekst":"...","niveau":1|2|3,"uitlijning":"links"|"midden"}
  {"type":"tekst","html":"<p>...</p>","grootte":"normaal"|"klein"|"groot","uitlijning":"links"}
  {"type":"afbeelding","url":"https://...","alt":"...","bijschrift":"","link":"","breedte":"vol"}
  {"type":"knop","tekst":"...","url":"https://...","uitlijning":"links"|"midden","stijl":"vol"|"omlijnd","breedte":"auto"|"vol"}
  {"type":"afbeelding_tekst","url":"https://...","alt":"...","kop":"...","html":"<p>...</p>","positie":"links"|"rechts","knopTekst":"","knopUrl":""}
  {"type":"kolommen","kolommen":[{"kop":"...","html":"<p>...</p>","url":"","knopTekst":"","knopUrl":""},{"kop":"...","html":"<p>...</p>","url":"","knopTekst":"","knopUrl":""}]}
  {"type":"quote","tekst":"...","bron":"naam, bedrijf"}
  {"type":"highlight","kop":"...","html":"<p>...</p>","variant":"zacht"|"accent"|"donker","knopTekst":"","knopUrl":""}
  {"type":"lijn"}
  {"type":"ruimte","hoogte":24}
  {"type":"footer","bedrijfsnaam":"Antony · Sign Company","adres":"","telefoon":"","website":"https://signcompany.nl","linkedin":"","instagram":"","facebook":""}
- In "html"-velden alleen <p>, <strong>, <em>, <a href>, <ul>, <ol>, <li>, <br>. Geen inline styles.
- Foto's: alleen URL's die Antony geeft of die al in het document staan. Verzin geen URL's.
- Links alleen naar https://signcompany.nl (of een pagina daarvan) of mailto:antony@signcompany.nl, tenzij Antony een andere link geeft.
- Nederlands, actief en concreet. Geen em-dashes (—); gebruik komma's, punten of een middelpunt (·). Geen emoji's.`
  if (bedrijfscontext) p += `\n\nOver het bedrijf:\n${bedrijfscontext}`
  if (schrijfstijl) p += `\n\nSchrijfstijl / tone of voice om aan te houden:\n${schrijfstijl}`
  return p
}

const ACTIE_TYPES = new Set(['vervang', 'voeg_toe', 'verwijder', 'verplaats', 'onderwerp', 'alles'])

const ONDERWERP_PROMPT = `Je bent Daan, de assistent van signbedrijf Sign Company. Je bedenkt onderwerpregels voor een e-mailnieuwsbrief.

Antwoord UITSLUITEND met JSON: {"suggesties":[{"onderwerp":"...","preheader":"..."},...]} met precies 4 suggesties.
- Onderwerp: 25 tot 55 tekens, concreet, nieuwsgierig makend, geen hoofdletterwoorden, geen uitroeptekens, geen emoji's, geen em-dashes.
- Preheader: 40 tot 90 tekens, vult het onderwerp aan (herhaalt het niet).
- Varieer: één nieuwsgierig, één concreet voordeel, één persoonlijk, één kort en zakelijk.
- Nederlands.`

const BLOK_TYPES = new Set(['header', 'kop', 'tekst', 'afbeelding', 'knop', 'afbeelding_tekst', 'kolommen', 'quote', 'highlight', 'lijn', 'ruimte', 'footer', 'html'])

function parseJson<T>(tekst: string): T | null {
  const schoon = tekst.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try { return JSON.parse(schoon) as T } catch { /* val door naar substring */ }
  const start = Math.min(...['[', '{'].map(c => schoon.indexOf(c)).filter(i => i >= 0))
  const eind = Math.max(schoon.lastIndexOf(']'), schoon.lastIndexOf('}'))
  if (!isFinite(start) || eind <= start) return null
  try { return JSON.parse(schoon.slice(start, eind + 1)) as T } catch { return null }
}

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

async function vraagClaude(system: string, content: Array<Record<string, unknown>>, maxTokens: number, berichten?: Array<{ role: 'user' | 'assistant'; content: unknown }>): Promise<{ ok: true; tekst: string } | { ok: false; status: number; fout: string }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      thinking: { type: 'disabled' },
      max_tokens: maxTokens,
      system,
      messages: berichten ?? [{ role: 'user', content }],
    }),
    signal: AbortSignal.timeout(50_000),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as Record<string, unknown>
    console.error('[nieuwsbrief-ai] Anthropic fout:', response.status, err)
    return { ok: false, status: response.status, fout: (err?.error as Record<string, string>)?.message || 'AI-generatie mislukt' }
  }
  const data = await response.json() as { content: Array<{ type: string; text?: string }> }
  return { ok: true, tekst: data.content?.filter(b => b.type === 'text').map(b => b.text || '').join('').trim() || '' }
}

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for nieuwsbrief-ai, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:nieuwsbrief-ai', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] nieuwsbrief-ai id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] nieuwsbrief-ai id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'AI is niet geconfigureerd' })

  try {
    if (!(await verifyOwner(req))) return res.status(403).json({ error: 'Geen toegang' })
    if (!(await enforceRateLimit(OWNER_USER_ID, res))) return

    const { brief, afbeeldingen, modus, html: bestaandeHtml, huidig, berichten, blokken: huidigeBlokken, onderwerp, preheader } = (req.body ?? {}) as {
      brief?: string; afbeeldingen?: string[]; modus?: 'html' | 'blokken' | 'onderwerp' | 'chat'; html?: string; huidig?: string
      berichten?: Array<{ rol?: string; tekst?: string }>; blokken?: unknown[]; onderwerp?: string; preheader?: string
    }

    if (modus === 'chat') {
      const gesprek = (Array.isArray(berichten) ? berichten : [])
        .filter(b => b && typeof b.tekst === 'string' && b.tekst.trim())
        .slice(-12)
        .map(b => ({ role: (b.rol === 'daan' ? 'assistant' : 'user') as 'user' | 'assistant', tekst: String(b.tekst).trim().slice(0, 4000) }))
      if (gesprek.length === 0 || gesprek[gesprek.length - 1].role !== 'user') return res.status(400).json({ error: 'Zeg eerst wat Daan moet doen' })
      const lijst = Array.isArray(huidigeBlokken) ? huidigeBlokken.filter(b => !!b && typeof b === 'object' && BLOK_TYPES.has(String((b as { type?: unknown }).type))).slice(0, 60) : []
      const urls = Array.isArray(afbeeldingen) ? afbeeldingen.map(u => String(u).trim()).filter(isHttpUrl).slice(0, MAX_AFBEELDINGEN) : []

      const { bedrijfscontext, schrijfstijl } = await loadDaanContext(supabase, OWNER_USER_ID)
      const kop = `HUIDIG DOCUMENT\nOnderwerp: ${String(onderwerp || '').slice(0, 200) || '(leeg)'}\nPreheader: ${String(preheader || '').slice(0, 300) || '(leeg)'}\nBlokken:\n${JSON.stringify(lijst)}${urls.length ? `\n\nFoto's die Antony aanbiedt:\n${urls.map(u => `- ${u}`).join('\n')}` : ''}`
      // Het document gaat mee in het laatste user-bericht; eerdere beurten
      // alleen als tekst, anders groeit elke beurt met het hele document.
      const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = gesprek.map((b, i) => {
        if (i < gesprek.length - 1) return { role: b.role, content: b.tekst }
        const content: Array<Record<string, unknown>> = [{ type: 'text', text: `${kop}\n\nANTONY ZEGT:\n${b.tekst}` }]
        for (const url of urls) content.push({ type: 'image', source: { type: 'url', url } })
        return { role: 'user', content }
      })
      // Anthropic eist afwisselende rollen; plak opeenvolgende gelijke rollen aan elkaar.
      const samengevoegd: typeof messages = []
      for (const m of messages) {
        const vorige = samengevoegd[samengevoegd.length - 1]
        if (vorige && vorige.role === m.role && typeof vorige.content === 'string' && typeof m.content === 'string') vorige.content = `${vorige.content}\n\n${m.content}`
        else samengevoegd.push(m)
      }
      const r = await vraagClaude(buildChatPrompt(bedrijfscontext, schrijfstijl), [], 6000, samengevoegd)
      if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: r.status === 429 ? 'Te veel verzoeken. Probeer het later opnieuw.' : r.fout })
      const parsed = parseJson<{ antwoord?: unknown; acties?: unknown }>(r.tekst)
      if (!parsed || typeof parsed !== 'object') return res.status(502).json({ error: 'Daan gaf geen bruikbaar antwoord. Probeer het nog eens.' })
      const antwoord = typeof parsed.antwoord === 'string' ? parsed.antwoord.trim().slice(0, 1200) : ''
      const acties = (Array.isArray(parsed.acties) ? parsed.acties : [])
        .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object' && ACTIE_TYPES.has(String((a as { actie?: unknown }).actie)))
        .slice(0, 40)
      const { data: profiel } = await supabase.from('profiles').select('organisatie_id').eq('id', OWNER_USER_ID).maybeSingle()
      await schrijfSpoor((profiel?.organisatie_id as string | null) ?? null, OWNER_USER_ID, 'nieuwsbrief-ai', {
        opdracht: gesprek[gesprek.length - 1].tekst.slice(0, 600),
        resultaat: `${antwoord} · ${acties.length} acties`.slice(0, 600),
      })
      return res.status(200).json({ antwoord: antwoord || (acties.length ? 'Aangepast.' : 'Ik heb niets gewijzigd.'), acties })
    }

    if (modus === 'onderwerp') {
      const inhoud = stripHtml(String(bestaandeHtml || '')).slice(0, 4000)
      if (!inhoud) return res.status(400).json({ error: 'Schrijf eerst wat inhoud, dan kan Daan een onderwerp bedenken' })
      const vraag = `Inhoud van de nieuwsbrief:\n\n${inhoud}${huidig?.trim() ? `\n\nHuidig onderwerp (mag beter): ${huidig.trim()}` : ''}`
      const r = await vraagClaude(ONDERWERP_PROMPT, [{ type: 'text', text: vraag }], 800)
      if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: r.status === 429 ? 'Te veel verzoeken. Probeer het later opnieuw.' : r.fout })
      const parsed = parseJson<{ suggesties?: Array<{ onderwerp?: string; preheader?: string }> }>(r.tekst)
      const suggesties = (parsed?.suggesties ?? [])
        .filter(s => typeof s?.onderwerp === 'string' && s.onderwerp.trim())
        .slice(0, 4)
        .map(s => ({ onderwerp: String(s.onderwerp).trim().slice(0, 120), preheader: String(s.preheader || '').trim().slice(0, 200) }))
      return res.status(200).json({ suggesties })
    }

    if (!brief?.trim()) return res.status(400).json({ error: 'Geef een korte briefing op' })

    const urls = Array.isArray(afbeeldingen)
      ? afbeeldingen.map(u => String(u).trim()).filter(isHttpUrl).slice(0, MAX_AFBEELDINGEN)
      : []

    const { bedrijfscontext, schrijfstijl } = await loadDaanContext(supabase, OWNER_USER_ID)
    const blokkenModus = modus === 'blokken'
    const systemPrompt = blokkenModus ? buildBlokkenPrompt(bedrijfscontext, schrijfstijl) : buildSystemPrompt(bedrijfscontext, schrijfstijl)

    let tekst = `Maak een e-mailnieuwsbrief op basis van deze briefing:\n\n${brief.trim()}`
    if (urls.length > 0) {
      tekst += blokkenModus
        ? `\n\nGebruik deze foto's (precies deze URL's) in afbeelding- of afbeelding_tekst-blokken op een logische plek:\n${urls.map(u => `- ${u}`).join('\n')}`
        : `\n\nGebruik deze afbeeldingen in de nieuwsbrief (embed ze als <img> met precies deze URL's, op een logische plek):\n${urls.map(u => `- ${u}`).join('\n')}`
    }

    const content: Array<Record<string, unknown>> = [{ type: 'text', text: tekst }]
    for (const url of urls) content.push({ type: 'image', source: { type: 'url', url } })

    // Onder de maxDuration van 60s van dit endpoint, zodat de fout als nette
    // JSON terugkomt in plaats van als een gekilde functie.
    const r = await vraagClaude(systemPrompt, content, 6000)
    if (!r.ok) {
      if (r.status === 429) return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
      return res.status(502).json({ error: r.fout })
    }

    let blokken: Array<Record<string, unknown>> | null = null
    let html = ''
    if (blokkenModus) {
      const parsed = parseJson<unknown>(r.tekst)
      const lijst = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { blokken?: unknown }).blokken) ? (parsed as { blokken: unknown[] }).blokken : null)
      blokken = (lijst ?? []).filter((b): b is Record<string, unknown> => !!b && typeof b === 'object' && BLOK_TYPES.has(String((b as { type?: unknown }).type)))
      if (blokken.length === 0) return res.status(502).json({ error: 'Daan gaf geen bruikbare blokken terug. Probeer het nog eens.' })
    } else {
      html = r.tekst.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim()
      if (!html) return res.status(502).json({ error: 'Daan gaf geen bruikbare HTML terug' })
    }

    const { data: profiel } = await supabase
      .from('profiles')
      .select('organisatie_id')
      .eq('id', OWNER_USER_ID)
      .maybeSingle()
    await schrijfSpoor((profiel?.organisatie_id as string | null) ?? null, OWNER_USER_ID, 'nieuwsbrief-ai', {
      opdracht: brief.trim().slice(0, 600),
      resultaat: (blokken ? JSON.stringify(blokken) : html).slice(0, 600),
    })

    return blokken ? res.status(200).json({ blokken }) : res.status(200).json({ html })
  } catch (err) {
    console.error('[nieuwsbrief-ai] fout:', err)
    return res.status(500).json({ error: (err as Error).message || 'AI-generatie mislukt' })
  }
}
