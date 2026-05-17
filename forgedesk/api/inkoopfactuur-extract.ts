import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import * as Sentry from '@sentry/node'

if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  })
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

const ROUTE_NAME = 'inkoopfactuur-extract'
const INKOOP_EXTRACT_MONTHLY_CAP = 500

// Anthropic pricing per 1M tokens — Sonnet 4.6 (verifieer bij prijswijziging)
// Bron: https://www.anthropic.com/pricing — laatst gecheckt: 2026-05-10
const SONNET_46_INPUT_PRICE = 3
const SONNET_46_OUTPUT_PRICE = 15

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for inkoopfactuur-extract, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(30, '60 s'), prefix: 'rl:inkoopfactuur-extract', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] inkoopfactuur-extract id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] inkoopfactuur-extract id=${identifier} err=${(err as Error).message}`)
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
  return { allowed: current < INKOOP_EXTRACT_MONTHLY_CAP, current, cap: INKOOP_EXTRACT_MONTHLY_CAP }
}

async function incrementOrgUsage(orgId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const maand = getCurrentMonth()
  const kosten = (inputTokens / 1_000_000) * SONNET_46_INPUT_PRICE + (outputTokens / 1_000_000) * SONNET_46_OUTPUT_PRICE

  const { data: existing } = await supabase
    .from('ai_usage_org')
    .select('id, aantal_calls, geschatte_kosten')
    .eq('organisatie_id', orgId)
    .eq('route', ROUTE_NAME)
    .eq('maand', maand)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('ai_usage_org')
      .update({
        aantal_calls: (existing.aantal_calls || 0) + 1,
        geschatte_kosten: Number((Number(existing.geschatte_kosten || 0) + kosten).toFixed(4)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('ai_usage_org')
      .insert({
        organisatie_id: orgId,
        route: ROUTE_NAME,
        maand,
        aantal_calls: 1,
        geschatte_kosten: Number(kosten.toFixed(4)),
      })
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

const SYSTEM_PROMPT = `Je bent een Nederlandse inkoopfactuur extractor. Analyseer de PDF en geef UITSLUITEND valide JSON terug, geen markdown codeblokken, geen uitleg. Schema:
{
  "leverancier_naam": "string",
  "factuur_nummer": "string | null",
  "factuur_datum": "YYYY-MM-DD | null",
  "vervaldatum": "YYYY-MM-DD | null",
  "subtotaal": number,
  "btw_bedrag": number,
  "totaal": number,
  "valuta": "EUR",
  "regels": [
    {
      "omschrijving": "string",
      "aantal": number,
      "eenheidsprijs": number,
      "btw_tarief": number,
      "regel_totaal": number
    }
  ],
  "vertrouwen": "hoog" | "midden" | "laag",
  "opmerkingen": ""
}
Als totaal niet matcht met subtotaal + btw: zet vertrouwen op "laag" en beschrijf in opmerkingen.
Als geen factuurnummer vindbaar: null.
Bedragen altijd als number, niet string met comma.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!(await enforceRateLimit(userId, res))) return

    if (!ANTHROPIC_API_KEY) {
      return res.status(200).json({ success: false, error: 'ANTHROPIC_API_KEY niet geconfigureerd op Vercel.' })
    }

    const { inkoopfactuur_id } = req.body as { inkoopfactuur_id: string }
    if (!inkoopfactuur_id) {
      return res.status(200).json({ success: false, error: 'inkoopfactuur_id ontbreekt' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisatie_id')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.organisatie_id) {
      return res.status(200).json({ success: false, error: 'Geen organisatie gevonden' })
    }

    const orgId = profile.organisatie_id

    const budget = await checkAIBudget(orgId, 0.01)
    if (budget.geblokkeerd) {
      return res.status(403).json({
        error: 'ai_budget_bereikt',
        bericht: 'Je maandbudget voor AI is bereikt. Koop extra credits om door te gaan.',
        redirect: '/instellingen?tab=daan-ai',
      })
    }

    const cap = await checkOrgCap(orgId)
    if (!cap.allowed) {
      await markCapHit(orgId).catch(() => { /* niet-kritiek */ })
      return res.status(429).json({
        error: 'AI-limiet bereikt',
        message: `Je organisatie heeft de maandlimiet (${cap.cap}) voor AI-extractie van inkoopfacturen bereikt. Mail hello@doen.team om te verhogen.`,
      })
    }

    const { data: factuur, error: fetchError } = await supabase
      .from('inkoopfacturen')
      .select('id, pdf_storage_path, status')
      .eq('id', inkoopfactuur_id)
      .eq('organisatie_id', orgId)
      .single()

    if (fetchError || !factuur) {
      return res.status(200).json({ success: false, error: `Factuur niet gevonden: ${fetchError?.message || 'onbekend'}` })
    }

    if (!factuur.pdf_storage_path) {
      return res.status(200).json({ success: false, error: 'Geen PDF pad in database' })
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('inkoopfacturen')
      .download(factuur.pdf_storage_path)

    if (downloadError || !fileData) {
      return res.status(200).json({ success: false, error: `PDF download mislukt: ${downloadError?.message || 'bestand niet gevonden'}` })
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    console.log(`[extract] Starting Anthropic call for factuur ${inkoopfactuur_id}, PDF size: ${base64Data.length} chars`)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120000)

    let anthropicResponse: Response | undefined
    try {
      anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        signal: controller.signal,
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Data,
                },
              },
              { type: 'text', text: 'Extraheer alle factuurgegevens uit deze PDF.' },
            ],
          },
        ],
      }),
      })
    } catch (fetchErr: unknown) {
      clearTimeout(timeout)
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      const isTimeout = msg.includes('abort')
      console.error(`[extract] Fetch fout: ${msg}`)
      await supabase.from('inkoopfacturen').update({
        extractie_opmerkingen: isTimeout ? 'Timeout bij Claude API (>120s). Probeer opnieuw.' : `API fout: ${msg.slice(0, 300)}`,
        updated_at: new Date().toISOString(),
      }).eq('id', inkoopfactuur_id)
      return res.status(200).json({ success: false, error: isTimeout ? 'Claude API timeout. Probeer opnieuw.' : msg })
    } finally {
      clearTimeout(timeout)
    }

    if (!anthropicResponse || !anthropicResponse.ok) {
      const errBody = anthropicResponse ? await anthropicResponse.text() : 'Geen response'
      console.error(`[extract] Anthropic error: ${anthropicResponse?.status} ${errBody.slice(0, 500)}`)
      return res.status(200).json({ success: false, error: `Claude API fout (${anthropicResponse?.status || '?'}): ${errBody.slice(0, 200)}` })
    }

    const anthropicData = await anthropicResponse.json() as {
      content?: Array<{ type: string; text: string }>
      usage?: { input_tokens: number; output_tokens: number }
    }
    const textContent = anthropicData.content?.find((c) => c.type === 'text')?.text || ''

    if (anthropicData.usage) {
      try {
        await incrementOrgUsage(orgId, anthropicData.usage.input_tokens, anthropicData.usage.output_tokens)
      } catch (err) {
        console.warn(`[extract] Usage tracking faalde: ${(err as Error).message}`)
      }
    }

    console.log(`[extract] Anthropic response length: ${textContent.length}`)

    let cleaned = textContent.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      await supabase
        .from('inkoopfacturen')
        .update({
          extractie_opmerkingen: `JSON parse fout. Ruwe response: ${textContent.slice(0, 500)}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inkoopfactuur_id)

      return res.status(200).json({ success: false, error: 'Claude gaf geen geldige JSON terug', raw: textContent.slice(0, 300) })
    }

    console.log(`[extract] Parsed: leverancier=${parsed.leverancier_naam}, totaal=${parsed.totaal}`)

    const { error: updateError } = await supabase
      .from('inkoopfacturen')
      .update({
        leverancier_naam: parsed.leverancier_naam || '',
        factuur_nummer: parsed.factuur_nummer || null,
        factuur_datum: parsed.factuur_datum || null,
        vervaldatum: parsed.vervaldatum || null,
        subtotaal: parsed.subtotaal || 0,
        btw_bedrag: parsed.btw_bedrag || 0,
        totaal: parsed.totaal || 0,
        valuta: parsed.valuta || 'EUR',
        status: 'verwerkt',
        extractie_vertrouwen: parsed.vertrouwen || 'laag',
        extractie_opmerkingen: parsed.opmerkingen || null,
        raw_extractie_json: parsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inkoopfactuur_id)

    if (updateError) {
      if (updateError.message.includes('duplicate key') || updateError.message.includes('unique constraint')) {
        await supabase.from('inkoopfacturen')
          .update({ status: 'afgewezen', afgewezen_reden: 'Duplicaat factuur — zelfde leverancier en factuurnummer bestaat al', updated_at: new Date().toISOString() })
          .eq('id', inkoopfactuur_id)
        return res.status(200).json({ success: true, duplicate: true })
      }
      return res.status(200).json({ success: false, error: `Database update mislukt: ${updateError.message}` })
    }

    const regels = Array.isArray(parsed.regels) ? parsed.regels : []
    if (regels.length > 0) {
      await supabase.from('inkoopfactuur_regels').delete().eq('inkoopfactuur_id', inkoopfactuur_id)
      await supabase.from('inkoopfactuur_regels').insert(
        regels.map((r: Record<string, unknown>, i: number) => ({
          inkoopfactuur_id,
          volgorde: i,
          omschrijving: (r.omschrijving as string) || '',
          aantal: (r.aantal as number) || 1,
          eenheidsprijs: (r.eenheidsprijs as number) || 0,
          btw_tarief: (r.btw_tarief as number) || 21,
          regel_totaal: (r.regel_totaal as number) || 0,
        }))
      )
    }

    return res.status(200).json({ success: true, vertrouwen: parsed.vertrouwen })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error(`[extract] Uncaught error: ${message}`)
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(200).json({ success: false, error: message })
    }
    return res.status(200).json({ success: false, error: message })
  }
}
