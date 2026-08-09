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

async function bepaalUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && token === cronSecret) {
    const serviceUser = req.body?.service_user_id
    if (typeof serviceUser !== 'string' || !serviceUser) throw new Error('Niet geautoriseerd')
    return serviceUser
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

interface PushLading {
  titel: string
  tekst: string
  url?: string
  tag?: string
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!vapidGereed()) {
    return res.status(503).json({ error: 'Meldingen zijn niet geconfigureerd (VAPID-sleutels ontbreken).' })
  }

  try {
    const userId = await bepaalUser(req)
    const lading: PushLading = {
      titel: String(req.body?.titel || 'doen.').slice(0, 80),
      tekst: String(req.body?.tekst || '').slice(0, 200),
      url: typeof req.body?.url === 'string' ? req.body.url : '/',
      tag: typeof req.body?.tag === 'string' ? req.body.tag : undefined,
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
