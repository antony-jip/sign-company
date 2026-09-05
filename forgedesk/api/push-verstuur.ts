/**
 * Verstuurt een webpush-melding naar alle toestellen van één gebruiker.
 *
 * Twee ingangen:
 *  - Service-modus (Authorization: Bearer ${CRON_SECRET} + service_user_id):
 *    gebruikt door cron-email-sync om te melden dat er mail binnen is.
 *  - Gebruikersmodus (gewone sessie-token): stuurt een testmelding naar je
 *    eigen toestellen, zodat je in Instellingen kunt zien dat het werkt.
 *
 * Verlopen abonnementen (404/410) worden meteen opgeruimd; zonder dat groeit
 * de tabel vol met toestellen die niet meer bestaan en blijft elke ronde
 * vergeefse verzoeken doen.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

function vapidGereed(): boolean {
  const publiek = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
  const prive = process.env.VAPID_PRIVATE_KEY
  if (!publiek || !prive) return false
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:antony@signcompany.nl',
    publiek,
    prive
  )
  return true
}

async function bepaalUser(req: VercelRequest): Promise<{ userId: string; service: boolean }> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && token === cronSecret) {
    const serviceUser = req.body?.service_user_id
    if (typeof serviceUser !== 'string' || !serviceUser) throw new Error('Niet geautoriseerd')
    return { userId: serviceUser, service: true }
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return { userId: user.id, service: false }
}

interface PushLading {
  titel: string
  tekst: string
  url?: string
  tag?: string
  /** Categorie uit src/lib/meldingsvoorkeuren.ts; zonder categorie gaat de push altijd door. */
  categorie?: string
}

/**
 * Meldingsvoorkeuren (migratie 239, profiles.meldingsvoorkeuren): heeft de
 * ontvanger push voor deze categorie uitgezet, dan slaan we over. Staat de
 * schakelaar meldingen_voorkeuren voor de organisatie uit, dan tellen de
 * voorkeuren niet. Leest inline omdat api/ niets uit src importeert.
 */
async function pushToegestaan(userId: string, categorie: string | undefined): Promise<boolean> {
  if (!categorie) return true
  const { data: profiel } = await supabaseAdmin
    .from('profiles')
    .select('organisatie_id, meldingsvoorkeuren')
    .eq('id', userId)
    .maybeSingle()
  const voorkeuren = (profiel?.meldingsvoorkeuren ?? {}) as Record<string, { push?: boolean } | undefined>
  if (voorkeuren[categorie]?.push !== false) return true
  if (!profiel?.organisatie_id) return false
  const { data: instellingen } = await supabaseAdmin
    .from('app_settings')
    .select('functies')
    .eq('organisatie_id', profiel.organisatie_id)
    .maybeSingle()
  const functies = (instellingen?.functies ?? {}) as Record<string, unknown>
  return functies.meldingen_voorkeuren === false
}

// Niet geëxporteerd: api/-bestanden staan op zichzelf (zie CLAUDE.md). De cron
// roept deze endpoint over HTTP aan, net als bij fetch-emails.
async function stuurNaarGebruiker(userId: string, lading: PushLading): Promise<number> {
  const { data: abonnementen } = await supabaseAdmin
    .from('push_abonnementen')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (!abonnementen?.length) return 0

  const payload = JSON.stringify(lading)
  let bezorgd = 0
  const dood: string[] = []

  await Promise.all(abonnementen.map(async (ab) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: ab.endpoint as string,
          keys: { p256dh: ab.p256dh as string, auth: ab.auth as string },
        },
        payload,
        { TTL: 900 } // Een kwartier: mail die ouder is meldt zichzelf wel bij openen.
      )
      bezorgd++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) dood.push(ab.id as string)
      else console.warn('[push-verstuur] mislukt', { status, endpoint: String(ab.endpoint).slice(0, 60) })
    }
  }))

  if (dood.length > 0) {
    await supabaseAdmin.from('push_abonnementen').delete().in('id', dood)
  }
  return bezorgd
}

export const config = { maxDuration: 30 }

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for push-verstuur, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(30, '60 s'), prefix: 'rl:push-verstuur', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] push-verstuur id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] push-verstuur id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!vapidGereed()) {
    return res.status(503).json({ error: 'Meldingen zijn niet geconfigureerd (VAPID-sleutels ontbreken).' })
  }

  try {
    const { userId, service } = await bepaalUser(req)
    if (!(await enforceRateLimit(userId, res))) return
    const lading: PushLading = {
      titel: String(req.body?.titel || 'doen.').slice(0, 80),
      tekst: String(req.body?.tekst || '').slice(0, 200),
      url: typeof req.body?.url === 'string' ? req.body.url : '/',
      tag: typeof req.body?.tag === 'string' ? req.body.tag : undefined,
      categorie: typeof req.body?.categorie === 'string' ? req.body.categorie.slice(0, 40) : undefined,
    }

    if (service && !(await pushToegestaan(userId, lading.categorie))) {
      return res.status(200).json({ bezorgd: 0, overgeslagen: 'voorkeur' })
    }

    const bezorgd = await stuurNaarGebruiker(userId, lading)
    return res.status(200).json({ bezorgd })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Versturen mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ error: msg })
    }
    console.error('[push-verstuur] Fatal:', err)
    return res.status(500).json({ error: msg })
  }
}
