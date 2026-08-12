import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import * as Sentry from '@sentry/node'

if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  const SENS = /password|app_password|encrypted_app_password|betaal_token|payment_token|access_token|refresh_token|mollie_api_key|authorization|cookie|secret|api_key|to|cc|bcc|email/i
  const scrub = (v: unknown, d = 0): unknown => {
    if (d > 6 || v == null) return v
    if (Array.isArray(v)) return v.map(x => scrub(x, d + 1))
    if (typeof v === 'object') {
      const o: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) o[k] = SENS.test(k) ? '[Filtered]' : scrub(val, d + 1)
      return o
    }
    return v
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) for (const k of Object.keys(event.request.headers)) if (/authorization|cookie/i.test(k)) (event.request.headers as Record<string, string>)[k] = '[Filtered]'
      if (event.request?.data) event.request.data = scrub(event.request.data) as typeof event.request.data
      if (event.user) { delete event.user.ip_address; delete event.user.email }
      return event
    },
  })
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Anthropic factureert in dollars; doen. rekent en toont in euro's. Alles wat
// in geschatte_kosten belandt is dus EUR, zodat de maandlimiet, de meter in
// Instellingen en de blokkade-melding dezelfde eenheid hebben. Zelfde koers
// als de Visualizer gebruikt (utils/visualizerDefaults.ts).
const USD_NAAR_EUR = 0.92

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
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ROUTE_NAME = 'analyze-inkoop-offerte'
const INKOOP_OFFERTE_MONTHLY_CAP = 100

// Anthropic pricing per 1M tokens — Sonnet 4.6 (verifieer bij prijswijziging)
// Bron: https://www.anthropic.com/pricing — laatst gecheckt: 2026-05-10
const SONNET_46_INPUT_PRICE = 3
const SONNET_46_OUTPUT_PRICE = 15

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for analyze-inkoop-offerte, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:analyze-inkoop-offerte', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] analyze-inkoop-offerte id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] analyze-inkoop-offerte id=${identifier} err=${(err as Error).message}`)
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

async function checkOrgCap(orgId: string): Promise<{ allowed: boolean; current: number; cap: number }> {
  const maand = getCurrentMonth()
  const { data } = await supabase
    .from('ai_usage_org')
    .select('aantal_calls')
    .eq('organisatie_id', orgId)
    .eq('route', ROUTE_NAME)
    .eq('maand', maand)
    .maybeSingle()
  const current = data?.aantal_calls ?? 0
  return { allowed: current < INKOOP_OFFERTE_MONTHLY_CAP, current, cap: INKOOP_OFFERTE_MONTHLY_CAP }
}

async function incrementOrgUsage(orgId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const maand = getCurrentMonth()
  const kosten = ((inputTokens / 1_000_000) * SONNET_46_INPUT_PRICE + (outputTokens / 1_000_000) * SONNET_46_OUTPUT_PRICE) * USD_NAAR_EUR
  // Atomair bijschrijven via de RPC (migratie 174). Een read-modify-write laat
  // twee gelijktijdige calls over elkaar heen schrijven, en dat verlies is
  // altijd in het nadeel van doen.: de teller loopt achter en de rem grijpt
  // te laat in.
  const { error } = await supabase.rpc('ai_usage_org_bijschrijf', {
    p_organisatie_id: orgId,
    p_route: ROUTE_NAME,
    p_maand: maand,
    p_kosten: Number(kosten.toFixed(4)),
    p_calls: 1,
  })
  if (error) console.error('incrementOrgUsage: bijschrijven mislukt', orgId, ROUTE_NAME, error)
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

async function markCapHit(orgId: string): Promise<void> {
  const maand = getCurrentMonth()
  const { data: updated } = await supabase
    .from('ai_usage_org')
    .update({ eerste_cap_hit_op: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('organisatie_id', orgId)
    .eq('route', ROUTE_NAME)
    .eq('maand', maand)
    .is('eerste_cap_hit_op', null)
    .select('id')

  if (updated && updated.length > 0) {
    try {
      Sentry.captureMessage('inkoop_ai_cap_hit', {
        level: 'warning',
        tags: { route: ROUTE_NAME, organisatie_id: orgId, maand },
      })
    } catch {
      // Sentry-fout mag de cap-flow niet breken
    }
  }
}

interface GeextraheerdeRegel {
  omschrijving: string
  aantal: number
  eenheid?: string
  prijs_per_stuk: number
  totaal: number
  confidence: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!(await enforceRateLimit(userId, res))) return

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'Anthropic API key niet geconfigureerd. Voeg ANTHROPIC_API_KEY toe aan environment variables.',
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisatie_id')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.organisatie_id) {
      return res.status(403).json({ error: 'Geen organisatie gevonden' })
    }

    const orgId = profile.organisatie_id

    const budget = await checkAIBudget(orgId, 0.01)
    if (budget.geblokkeerd) {
      return res.status(403).json({
        error: 'ai_budget_bereikt',
        bericht: `Het gedeelde AI-budget van je organisatie is op voor deze maand. Op ${resetTekst()} staat de teller weer op nul.`,
        redirect: '/instellingen?tab=daan-ai',
      })
    }

    const cap = await checkOrgCap(orgId)
    if (!cap.allowed) {
      await markCapHit(orgId).catch(() => { /* niet-kritiek */ })
      return res.status(429).json({
        error: 'AI-limiet bereikt',
        message: `Je organisatie heeft de maandlimiet (${cap.cap}) voor AI-analyse van offertes bereikt. Vraag een hogere limiet aan via doen.team/contact.`,
      })
    }

    const { bestand_base64, bestand_type, leverancier } = req.body as {
      bestand_base64: string
      bestand_type: 'pdf' | 'image'
      leverancier?: string
    }

    if (!bestand_base64 || !bestand_type) {
      return res.status(400).json({ error: 'bestand_base64 en bestand_type zijn verplicht' })
    }

    // Strip data URI prefix if present
    const base64Data = bestand_base64.includes(',')
      ? bestand_base64.split(',')[1]
      : bestand_base64

    // Controleer bestandsgrootte (base64 is ~33% groter dan binair)
    const estimatedBytes = Math.ceil(base64Data.length * 3 / 4)
    if (estimatedBytes > MAX_FILE_SIZE) {
      return res.status(400).json({ error: `Bestand is te groot (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` })
    }

    const systemPrompt =
      'Je bent een expert in het uitlezen van leveranciers offertes. ' +
      'Extraheer alle regelitems en geef ALLEEN een JSON array terug zonder uitleg: ' +
      '[{ "omschrijving": string, "aantal": number, "eenheid": string, "prijs_per_stuk": number, "totaal": number, "confidence": number }] ' +
      'confidence is een getal tussen 0 en 1 — gebruik <0.7 als de prijs onduidelijk is. ' +
      'Alle bedragen zijn exclusief BTW.'

    // Build content block based on file type
    let contentBlock: Record<string, unknown>
    if (bestand_type === 'image') {
      // Detect mime type from base64 header or default to jpeg
      let mediaType = 'image/jpeg'
      if (bestand_base64.startsWith('data:')) {
        const match = bestand_base64.match(/^data:(image\/\w+);/)
        if (match) mediaType = match[1]
      }
      contentBlock = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      }
    } else {
      contentBlock = {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64Data,
        },
      }
    }

    const userMessage = leverancier
      ? `Lees deze offerte van leverancier "${leverancier}" uit en extraheer alle regels.`
      : 'Lees deze offerte uit en extraheer alle regels.'

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
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              { type: 'text', text: userMessage },
            ],
          },
        ],
      }),
      // Documentanalyse duurt echt lang, dus ruim genomen: het doel is een
      // hangende verbinding afkappen, niet een traag antwoord afbreken.
      signal: AbortSignal.timeout(90_000),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>
      return res.status(response.status).json({
        error: (errorData?.error as Record<string, string>)?.message || 'Anthropic API fout',
      })
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
      usage?: { input_tokens: number; output_tokens: number }
    }

    if (data.usage) {
      try {
        await incrementOrgUsage(orgId, data.usage.input_tokens, data.usage.output_tokens)
      } catch (err) {
        console.warn(`[analyze-inkoop-offerte] Usage tracking faalde: ${(err as Error).message}`)
      }
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text || '[]'

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = textContent.trim()
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    let regels: GeextraheerdeRegel[]
    try {
      regels = JSON.parse(jsonStr)
    } catch {
      return res.status(500).json({ error: 'Kon de response niet als JSON verwerken', raw: textContent })
    }

    await schrijfSpoor(orgId, userId, ROUTE_NAME, {
      resultaat_kern: {
        aantal_regels: regels.length,
        leverancier: (leverancier || '').slice(0, 200) || null,
      },
    })

    return res.status(200).json({
      regels,
      leverancier_naam: leverancier || '',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return res.status(500).json({ error: message })
  }
}
