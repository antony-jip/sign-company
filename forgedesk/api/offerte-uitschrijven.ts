import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Offerte uitschrijven vanuit een specificatiedocument van de klant.
//
// Twee fases, bewust gescheiden:
//   splitsen    — knipt het document in posten en neemt specs letterlijk over.
//                 Verzint niets; wat ontbreekt gaat naar open_punten.
//   formuleren  — schrijft per post de offerteregel, met eerdere regels uit
//                 de eigen offertes als voorbeeld.
//
// Eén prompt die tegelijk extraheert en formuleert vult gaten met verzonnen
// maten. Gescheiden kan het formuleren ook per post opnieuw, zonder de
// extractie (en de PDF-tokens) over te doen.
//
// Prijzen komen hier nooit uit: de calculatie blijft handwerk.

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const ROUTE_NAME = 'offerte-uitschrijven'
const MODEL = 'claude-sonnet-5'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_POSTEN = 40

// Anthropic factureert in dollars; doen. rekent en toont in euro's.
const USD_NAAR_EUR = 0.92
const SONNET_INPUT_PRICE = 3
const SONNET_OUTPUT_PRICE = 15
const STANDAARD_MAANDLIMIET_EUR = 15.0

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:offerte-uitschrijven', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch {
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
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function kolomOntbreekt(fout: { code?: string }): boolean {
  return fout.code === '42703' || fout.code === 'PGRST204'
}

async function haalMaandlimiet(organisatieId: string, maand: string): Promise<{ limiet: number; betrouwbaar: boolean }> {
  const { data: org, error: orgFout } = await supabase
    .from('organisaties')
    .select('ai_maandlimiet')
    .eq('id', organisatieId)
    .maybeSingle()
  if (orgFout && !kolomOntbreekt(orgFout)) return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: false }
  const uitStaffel = Number(org?.ai_maandlimiet ?? NaN)
  if (Number.isFinite(uitStaffel) && uitStaffel >= 0) return { limiet: uitStaffel, betrouwbaar: true }

  const { data: rijen, error: rijenFout } = await supabase
    .from('ai_usage_org')
    .select('maandlimiet')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  if (rijenFout) return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: false }
  if (rijen && rijen.length > 0) {
    return { limiet: Math.max(...rijen.map((r) => Number(r.maandlimiet ?? STANDAARD_MAANDLIMIET_EUR))), betrouwbaar: true }
  }
  return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: true }
}

async function budgetGeblokkeerd(organisatieId: string, geschatteKosten: number): Promise<boolean> {
  const maand = getCurrentMonth()
  const { data: rows, error: verbruikFout } = await supabase
    .from('ai_usage_org')
    .select('geschatte_kosten')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  const huidig = (rows ?? []).reduce((s, r) => s + Number(r.geschatte_kosten ?? 0), 0)
  const { limiet, betrouwbaar } = await haalMaandlimiet(organisatieId, maand)
  return !verbruikFout && betrouwbaar && huidig + geschatteKosten > limiet
}

async function boekUsage(orgId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const kosten = ((inputTokens / 1_000_000) * SONNET_INPUT_PRICE + (outputTokens / 1_000_000) * SONNET_OUTPUT_PRICE) * USD_NAAR_EUR
  const { error } = await supabase.rpc('ai_usage_org_bijschrijf', {
    p_organisatie_id: orgId,
    p_route: ROUTE_NAME,
    p_maand: getCurrentMonth(),
    p_kosten: Number(kosten.toFixed(4)),
    p_calls: 1,
  })
  if (error) console.error('boekUsage: bijschrijven mislukt', orgId, error)
}

// ───── Fase 1: splitsen ─────

const SPLITS_PROMPT = `Je leest een specificatiedocument van een klant voor een signbedrijf (doeken, borden, belettering, bestickering, drukwerk).

Zo'n document beschrijft per onderdeel wat er gemaakt moet worden. Jouw werk: het document opknippen in losse posten en per post de specificaties overnemen zoals ze er staan.

Regels:
- Eén post per te leveren onderdeel. Staan er meerdere onderdelen op een pagina, dan worden het meerdere posten.
- Neem maten, materialen, oplages en afwerking LETTERLIJK over. Reken niets om, vul niets aan, verzin niets.
- Reken nooit aantallen bij elkaar op. Vul aantal alleen als de hele post uit identieke stuks bestaat, bijvoorbeeld een oplage of één maat met een aantal erbij. Bestaat de post uit verschillende maten of versies, zet aantal dan op 1 en laat de stuksaantallen staan waar ze staan, in de specs.
- Vul breedte_cm en hoogte_cm alleen als de post één maat heeft. Bij meerdere maten laat je ze weg.
- "PM", "pm", "nader te bepalen", een leeg veld of een keuze zonder besluit ("3 mm / 5 mm") horen in open_punten, niet in de specs als aanname.
- Labels kort houden: Afmeting, Materiaal, Afwerking, Omvang, Oplage, Bedrukking, Montage, Levering, Bestanden.
- Regels die over de hele opdracht gaan (bijvoorbeeld "montage extern tenzij anders vermeld") zijn geen post; zet die in algemene_opmerkingen.

Beschrijf niets in eigen woorden. Dit is overtypen met structuur, niet formuleren.`

const SPLITS_TOOL = {
  name: 'posten',
  description: 'De posten uit het specificatiedocument.',
  input_schema: {
    type: 'object' as const,
    properties: {
      posten: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            titel: { type: 'string', description: 'Naam van de post zoals in het document.' },
            pagina: { type: 'integer', description: 'Paginanummer waar de post staat.' },
            specs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  waarde: { type: 'string' },
                },
                required: ['label', 'waarde'],
              },
            },
            aantal: { type: 'number', description: 'Alleen bij identieke stuks: de oplage of het aantal. In alle andere gevallen 1. Nooit zelf optellen.' },
            eenheid: { type: 'string', description: 'stuks, m2, set. Leeg als onduidelijk.' },
            breedte_cm: { type: 'number', description: 'Breedte in cm. Alleen invullen als de post precies één maat heeft; anders weglaten.' },
            hoogte_cm: { type: 'number', description: 'Hoogte in cm. Alleen invullen als de post precies één maat heeft; anders weglaten.' },
            open_punten: {
              type: 'array',
              items: { type: 'string' },
              description: 'Wat nog bepaald moet worden voordat dit te calculeren is.',
            },
          },
          required: ['titel', 'pagina', 'specs', 'aantal', 'open_punten'],
        },
      },
      algemene_opmerkingen: {
        type: 'array',
        items: { type: 'string' },
        description: 'Voorwaarden die over de hele opdracht gaan.',
      },
    },
    required: ['posten', 'algemene_opmerkingen'],
  },
}

// ───── Fase 2: formuleren ─────

const FORMULEER_PROMPT = `Je schrijft offerteregels voor een signbedrijf. Je krijgt per post de specificaties uit het document van de klant, plus regels uit eerdere offertes van dit bedrijf als voorbeeld van de schrijfstijl.

Schrijf per post één omschrijving:
- Eén zin, of twee als het niet anders kan. Vakjargon mag, verkooppraat niet.
- Begin met wat het is (doek, bord, belettering, drukwerk), daarna hoe het gemaakt wordt.
- Maten, materialen en aantallen staan al in de specregels eronder. Herhaal ze alleen als de zin zonder betekenisloos wordt.
- Geen prijzen, geen levertijden, geen aannames over montage die er niet staan.
- Nederlands, geen gedachtestreepjes, geen uitroeptekens.
- Volg de toon van de voorbeeldregels. Zijn er geen voorbeelden, schrijf dan zakelijk en concreet.

Lever voor elke post een omschrijving, in dezelfde volgorde als je ze krijgt.`

const FORMULEER_TOOL = {
  name: 'omschrijvingen',
  description: 'De offerteregels per post.',
  input_schema: {
    type: 'object' as const,
    properties: {
      regels: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer', description: 'Volgnummer van de post, beginnend bij 0.' },
            beschrijving: { type: 'string' },
          },
          required: ['index', 'beschrijving'],
        },
      },
    },
    required: ['regels'],
  },
}

/**
 * Het model levert het tool-antwoord soms als JSON-tekst in plaats van als
 * object: `{ posten: "{\"posten\": [...], \"algemene_opmerkingen\": [...]}" }`.
 * De inhoud klopt dan gewoon. Eerst het hele antwoord uitpakken en pas daarna
 * per veld lezen, anders vind je wel de posten maar verdwijnen de velden die
 * in dezelfde tekst zaten zonder dat iemand het merkt.
 */
export function pakAntwoordUit(ruw: unknown): Record<string, unknown> {
  let waarde: unknown = ruw
  for (let poging = 0; poging < 3; poging++) {
    if (typeof waarde === 'string') {
      try {
        waarde = JSON.parse(waarde)
      } catch {
        return {}
      }
      continue
    }
    if (!waarde || typeof waarde !== 'object' || Array.isArray(waarde)) return {}
    const obj = waarde as Record<string, unknown>
    const sleutels = Object.keys(obj)
    if (sleutels.length === 1 && typeof obj[sleutels[0]] === 'string') {
      waarde = obj[sleutels[0]]
      continue
    }
    return obj
  }
  return {}
}

/**
 * Zelfde verhaal een niveau lager: één veld dat als JSON-tekst binnenkomt.
 */
export function pakLijstUit(ruw: unknown, sleutel: string): unknown[] {
  let waarde = ruw
  for (let poging = 0; poging < 3; poging++) {
    if (Array.isArray(waarde)) return waarde
    if (typeof waarde === 'string') {
      try {
        waarde = JSON.parse(waarde)
      } catch {
        return []
      }
      continue
    }
    if (waarde && typeof waarde === 'object') {
      waarde = (waarde as Record<string, unknown>)[sleutel]
      continue
    }
    return []
  }
  return Array.isArray(waarde) ? waarde : []
}

export function normaliseerRegels(ruw: unknown): Array<{ index: number; beschrijving: string }> {
  return pakLijstUit(ruw, 'regels')
    .filter((r): r is { index: number; beschrijving: string } =>
      !!r && typeof r === 'object' && typeof (r as { beschrijving?: unknown }).beschrijving === 'string')
    .map((r) => ({ index: Number(r.index) || 0, beschrijving: String(r.beschrijving) }))
}

interface AnthropicAntwoord {
  content?: Array<{ type: string; name?: string; input?: unknown }>
  usage?: { input_tokens?: number; output_tokens?: number }
}

async function roepClaude(body: Record<string, unknown>, timeoutMs: number): Promise<AnthropicAntwoord> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const tekst = await response.text()
      throw new Error(`Claude gaf ${response.status}: ${tekst.slice(0, 200)}`)
    }
    return await response.json() as AnthropicAntwoord
  } finally {
    clearTimeout(timer)
  }
}

function toolResultaat(data: AnthropicAntwoord): Record<string, unknown> | null {
  const blok = (data.content || []).find((c) => c.type === 'tool_use')
  if (!blok?.input) return null
  const uitgepakt = pakAntwoordUit(blok.input)
  return Object.keys(uitgepakt).length ? uitgepakt : null
}

/** Eerdere offerteregels als stijlvoorbeeld. Van deze klant als die er zijn. */
async function haalVoorbeeldregels(orgId: string, klantId?: string): Promise<string[]> {
  const gezien = new Set<string>()
  const uit: string[] = []

  const voegToe = (rijen: Array<{ beschrijving?: string | null }> | null) => {
    for (const rij of rijen || []) {
      const tekst = (rij.beschrijving || '').trim()
      if (tekst.length < 12 || tekst.length > 300) continue
      const sleutel = tekst.toLowerCase()
      if (gezien.has(sleutel)) continue
      gezien.add(sleutel)
      uit.push(tekst)
    }
  }

  if (klantId) {
    const { data: offertes } = await supabase
      .from('offertes')
      .select('id')
      .eq('organisatie_id', orgId)
      .eq('klant_id', klantId)
      .order('created_at', { ascending: false })
      .limit(5)
    const ids = (offertes || []).map((o) => o.id as string)
    if (ids.length) {
      const { data } = await supabase
        .from('offerte_items')
        .select('beschrijving')
        .in('offerte_id', ids)
        .order('created_at', { ascending: false })
        .limit(40)
      voegToe(data)
    }
  }

  if (uit.length < 12) {
    const { data } = await supabase
      .from('offerte_items')
      .select('beschrijving')
      .eq('organisatie_id', orgId)
      .neq('beschrijving', '')
      .order('created_at', { ascending: false })
      .limit(120)
    voegToe(data)
  }

  return uit.slice(0, 14)
}

// ───── Handler ─────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    if (!(await enforceRateLimit(userId, res))) return
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Anthropic API key niet geconfigureerd' })

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisatie_id')
      .eq('id', userId)
      .maybeSingle()
    const orgId = profile?.organisatie_id as string | undefined
    if (!orgId) return res.status(403).json({ error: 'Geen organisatie gevonden' })

    if (await budgetGeblokkeerd(orgId, 0.2)) {
      return res.status(403).json({
        error: 'ai_budget_bereikt',
        bericht: 'Het gedeelde AI-budget van je organisatie is op voor deze maand.',
        redirect: '/instellingen?tab=daan-ai',
      })
    }

    const { fase } = req.body as { fase?: string }

    if (fase === 'splitsen') {
      const { bestand_base64 } = req.body as { bestand_base64?: string }
      if (!bestand_base64) return res.status(400).json({ error: 'bestand_base64 is verplicht' })

      const base64Data = bestand_base64.includes(',') ? bestand_base64.split(',')[1] : bestand_base64
      if (Math.ceil(base64Data.length * 3 / 4) > MAX_FILE_SIZE) {
        return res.status(400).json({ error: `Bestand is te groot (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` })
      }

      const data = await roepClaude({
        model: MODEL,
        thinking: { type: 'disabled' },
        max_tokens: 8192,
        system: SPLITS_PROMPT,
        tools: [SPLITS_TOOL],
        tool_choice: { type: 'tool', name: 'posten' },
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
            { type: 'text', text: 'Knip dit document op in posten.' },
          ],
        }],
      }, 240000)

      if (data.usage) {
        await boekUsage(orgId, data.usage.input_tokens || 0, data.usage.output_tokens || 0).catch(() => { /* niet-kritiek */ })
      }

      const resultaat = toolResultaat(data)
      if (!resultaat) return res.status(502).json({ error: 'Geen bruikbaar antwoord van Claude' })

      const posten = pakLijstUit(resultaat.posten, 'posten').slice(0, MAX_POSTEN)
      if (!posten.length) return res.status(502).json({ error: 'Geen posten uit dit document gekregen' })
      return res.status(200).json({
        posten,
        algemene_opmerkingen: pakLijstUit(resultaat.algemene_opmerkingen, 'algemene_opmerkingen')
          .filter((o): o is string => typeof o === 'string'),
      })
    }

    if (fase === 'formuleren') {
      const { posten, klant_id } = req.body as { posten?: unknown[]; klant_id?: string }
      if (!Array.isArray(posten) || posten.length === 0) {
        return res.status(400).json({ error: 'posten is verplicht' })
      }

      const voorbeelden = await haalVoorbeeldregels(orgId, klant_id)
      const invoer = [
        voorbeelden.length
          ? `Voorbeeldregels uit eerdere offertes:\n${voorbeelden.map((v) => `- ${v}`).join('\n')}`
          : 'Er zijn nog geen eerdere offerteregels om op te varen.',
        '',
        'Posten:',
        JSON.stringify(posten.slice(0, MAX_POSTEN), null, 1),
      ].join('\n')

      const data = await roepClaude({
        model: MODEL,
        thinking: { type: 'disabled' },
        max_tokens: 4096,
        system: FORMULEER_PROMPT,
        tools: [FORMULEER_TOOL],
        tool_choice: { type: 'tool', name: 'omschrijvingen' },
        messages: [{ role: 'user', content: invoer }],
      }, 120000)

      if (data.usage) {
        await boekUsage(orgId, data.usage.input_tokens || 0, data.usage.output_tokens || 0).catch(() => { /* niet-kritiek */ })
      }

      const resultaat = toolResultaat(data)
      if (!resultaat) return res.status(502).json({ error: 'Geen bruikbaar antwoord van Claude' })

      return res.status(200).json({ regels: normaliseerRegels(resultaat.regels) })
    }

    return res.status(400).json({ error: 'fase moet splitsen of formuleren zijn' })
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Onbekende fout'
    const timeout = bericht.includes('abort')
    console.error('[offerte-uitschrijven] mislukt:', bericht)
    return res.status(500).json({ error: timeout ? 'Het document duurde te lang om te lezen. Probeer het in delen.' : bericht })
  }
}
