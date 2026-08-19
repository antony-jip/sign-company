import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Inline schrijfsuggestie voor het mailvenster: maakt de lopende zin af in
 * het Nederlands. Deze route wordt véél vaker aangeroepen dan de andere
 * AI-routes (elke schrijfpauze), dus alles is op snelheid gezet: kleine
 * prompt, 40 outputtokens, en de org-checks staan in een geheugencache per
 * lambda in plaats van een databasevraag per toetsaanslag.
 */

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const USD_NAAR_EUR = 0.92
const STANDAARD_MAANDLIMIET_EUR = 25

// Grenzen op wat de client mag meesturen; een suggestie hoeft geen halve
// mailbox als context en een grote prompt kost alleen maar tijd.
const MAX_VOOR = 800
const MAX_REPLY = 1200
const MAX_STIJL = 600
const MIN_VOOR = 12
const MAX_SUGGESTIE = 90

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for ai-suggestie, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(120, '60 s'), prefix: 'rl:ai-suggestie', timeout: 1000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    res.setHeader('Retry-After', String(retryAfter))
    // Stil aflopen: een suggestie die er niet is mag nooit een foutmelding
    // in beeld duwen terwijl iemand aan het typen is.
    res.status(200).json({ suggestie: '' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] ai-suggestie err=${(err as Error).message}`)
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
  const nu = new Date()
  return `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, '0')}`
}

// ── Org-gegevens uit het geheugen van de lambda ──────────────────────────
// Zonder cache kost elke suggestie drie databasevragen (org opzoeken,
// verbruik, limiet) vóór het model ook maar begint. Een warme lambda
// hergebruikt de uitkomst een minuut; het budget kan daardoor hooguit een
// minuut te laat dichtklappen, en dat is bij €0,0001 per suggestie geen geld.
const ORG_CACHE_MS = 60_000
const orgCache = new Map<string, { orgId: string | null; geblokkeerd: boolean; tot: number }>()

async function orgStatus(userId: string): Promise<{ orgId: string | null; geblokkeerd: boolean }> {
  const gecached = orgCache.get(userId)
  if (gecached && gecached.tot > Date.now()) {
    return { orgId: gecached.orgId, geblokkeerd: gecached.geblokkeerd }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()
  const orgId = (profile?.organisatie_id as string | null) ?? null

  let geblokkeerd = false
  if (orgId) {
    const maand = getCurrentMonth()
    const { data: rijen, error } = await supabase
      .from('ai_usage_org')
      .select('geschatte_kosten, maandlimiet')
      .eq('organisatie_id', orgId)
      .eq('maand', maand)
    // Alleen blokkeren op cijfers die we echt gelezen hebben; een leesfout
    // is geen bewijs dat het budget op is.
    if (!error && rijen && rijen.length > 0) {
      const verbruikt = rijen.reduce((s, r) => s + Number(r.geschatte_kosten ?? 0), 0)
      const limiet = Math.max(...rijen.map(r => Number(r.maandlimiet ?? STANDAARD_MAANDLIMIET_EUR)))
      geblokkeerd = verbruikt >= limiet
    }
  }

  orgCache.set(userId, { orgId, geblokkeerd, tot: Date.now() + ORG_CACHE_MS })
  return { orgId, geblokkeerd }
}

async function logOrgUsage(orgId: string, inputTokens: number, outputTokens: number): Promise<void> {
  // Haiku: $1/M input, $5/M output.
  const kosten = ((inputTokens / 1_000_000) * 1 + (outputTokens / 1_000_000) * 5) * USD_NAAR_EUR
  const { error } = await supabase.rpc('ai_usage_org_bijschrijf', {
    p_organisatie_id: orgId,
    p_route: 'ai-suggestie',
    p_maand: getCurrentMonth(),
    p_kosten: Number(kosten.toFixed(6)),
    p_calls: 1,
  })
  if (error) console.error('logOrgUsage: bijschrijven mislukt', orgId, error)
}

/**
 * Wat de gebruiker overneemt is precies de formulering die hij zelf zou
 * kiezen. Dat is de beste grondstof voor het nachtelijke geheugen, dus
 * geaccepteerde suggesties gaan als spoor mee.
 */
async function schrijfSpoor(orgId: string | null, userId: string, inhoud: Record<string, unknown>): Promise<void> {
  if (!orgId) return
  try {
    await supabase.from('ai_sporen').insert({
      organisatie_id: orgId,
      user_id: userId,
      agent: 'ai-suggestie',
      inhoud,
    })
  } catch {
    // Sporen zijn niet-kritiek.
  }
}

/**
 * Het model levert soms een halve alinea, aanhalingstekens of een herhaling
 * van het laatste woord. Hier blijft alleen de staart van de lopende zin over.
 */
export function schoonSuggestie(ruw: string, voor: string): string {
  let s = ruw.replace(/\r/g, '')

  // Alleen de eerste regel; een suggestie loopt nooit over een witregel heen.
  const nieuweRegel = s.indexOf('\n')
  if (nieuweRegel !== -1) s = s.slice(0, nieuweRegel)

  // Modellen zetten hun antwoord graag tussen aanhalingstekens.
  s = s.replace(/^\s*["'`]/, '').replace(/["'`]\s*$/, '')

  // Kapt af na het eerste zinseinde: de afspraak is "de lopende zin af",
  // niet de rest van de mail.
  const einde = s.search(/[.!?](\s|$)/)
  if (einde !== -1) s = s.slice(0, einde + 1)

  if (s.length > MAX_SUGGESTIE) {
    // Liever op een woordgrens afkappen dan midden in een woord.
    const geknipt = s.slice(0, MAX_SUGGESTIE)
    const spatie = geknipt.lastIndexOf(' ')
    s = spatie > 20 ? geknipt.slice(0, spatie) : geknipt
  }

  // Herhaalt het model het laatste getypte woord, dan zou accepteren
  // "de deofferte" opleveren. Zo'n suggestie gaat de prullenbak in.
  const laatsteWoord = voor.match(/(\S+)$/)?.[1]
  if (laatsteWoord && laatsteWoord.length > 2 && s.trimStart().toLowerCase().startsWith(laatsteWoord.toLowerCase())) {
    return ''
  }

  // Dubbele spatie op de naad voorkomen.
  if (/\s$/.test(voor)) s = s.replace(/^\s+/, '')

  return s.trimEnd() === '' ? '' : s
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    const body = (req.body ?? {}) as {
      voor?: string
      onderwerp?: string
      ontvanger?: string
      replyTekst?: string
      schrijfstijl?: string
      geaccepteerd?: string
    }

    // Terugmelding dat een suggestie overgenomen is: geen AI-call, alleen
    // een spoor voor het geheugen.
    if (typeof body.geaccepteerd === 'string' && body.geaccepteerd.trim()) {
      const { orgId } = await orgStatus(userId)
      await schrijfSpoor(orgId, userId, {
        actie: 'geaccepteerd',
        onderwerp: String(body.onderwerp || '').slice(0, 200),
        voor: String(body.voor || '').slice(0, 300),
        tekst: body.geaccepteerd.slice(0, 200),
      })
      return res.status(200).json({ ok: true })
    }

    if (!(await enforceRateLimit(userId, res))) return

    if (!ANTHROPIC_API_KEY) return res.status(200).json({ suggestie: '' })

    const voor = String(body.voor || '').slice(-MAX_VOOR)
    if (voor.trim().length < MIN_VOOR) return res.status(200).json({ suggestie: '' })

    const { orgId, geblokkeerd } = await orgStatus(userId)
    // Budget op: gewoon geen suggesties meer. De zichtbare melding daarover
    // hoort bij de knoppen die iemand bewust indrukt, niet hier.
    if (geblokkeerd) return res.status(200).json({ suggestie: '' })

    const onderwerp = String(body.onderwerp || '').slice(0, 200)
    const ontvanger = String(body.ontvanger || '').slice(0, 200)
    const replyTekst = String(body.replyTekst || '').slice(0, MAX_REPLY)
    const schrijfstijl = String(body.schrijfstijl || '').slice(0, MAX_STIJL)

    let systemPrompt = [
      'Je maakt de zin af die een Nederlandse ondernemer aan het typen is in een zakelijke e-mail.',
      '',
      'Regels:',
      '- Antwoord ALLEEN met de letterlijke voortzetting van de tekst, zonder uitleg, zonder aanhalingstekens.',
      '- Schrijf Nederlands, ook als er losse Engelse woorden in de tekst staan.',
      '- Maak hooguit de lopende zin af. Maximaal twaalf woorden. Nooit een tweede zin.',
      '- Begin je antwoord exact zoals het verder getypt moet worden: begint er een nieuw woord, zet er dan een spatie voor. Staat de gebruiker midden in een woord, maak dat woord dan af zonder spatie.',
      '- Herhaal nooit tekst die er al staat.',
      '- Weet je het niet, of is de zin al af? Antwoord dan met een leeg bericht.',
      '- Verzin geen feiten: geen bedragen, data, levertijden of namen die niet in de context staan.',
    ].join('\n')

    if (schrijfstijl) {
      systemPrompt += `\n\nDe schrijfstijl van de gebruiker:\n${schrijfstijl}`
    }

    const contextDelen: string[] = []
    if (onderwerp) contextDelen.push(`Onderwerp: ${onderwerp}`)
    if (ontvanger) contextDelen.push(`Aan: ${ontvanger}`)
    if (replyTekst) contextDelen.push(`Dit is een antwoord op:\n${replyTekst}`)

    const userPrompt = [
      contextDelen.length ? `${contextDelen.join('\n')}\n` : '',
      'De tekst tot aan de cursor:',
      voor,
    ].join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 40,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      // Duurt het langer dan dit, dan is de gebruiker allang verder getypt
      // en heeft de suggestie geen waarde meer.
      signal: AbortSignal.timeout(6_000),
    })

    if (!response.ok) {
      console.warn('[ai-suggestie] Anthropic', response.status)
      return res.status(200).json({ suggestie: '' })
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
      usage: { input_tokens: number; output_tokens: number }
    }

    const suggestie = schoonSuggestie(data.content?.[0]?.text || '', voor)
    res.status(200).json({ suggestie })

    // Boekhouding pas ná het antwoord: de gebruiker wacht op de suggestie,
    // niet op de teller.
    if (orgId && data.usage) {
      try {
        await logOrgUsage(orgId, data.usage.input_tokens, data.usage.output_tokens)
      } catch {
        // Verbruik bijschrijven is niet-kritiek.
      }
    }
    return
  } catch (error: unknown) {
    console.error('[ai-suggestie] fout', error)
    // Ook bij een fout een leeg antwoord: dit mag het typen nooit storen.
    return res.status(200).json({ suggestie: '' })
  }
}
