/**
 * Wekt gesnoozede mail. Elke minuut: rijen met snoozed_until <= now() gaan
 * terug naar de inbox, ongelezen, en de gebruiker krijgt een push als hij
 * meldingen voor nieuwe mail aan heeft.
 *
 * Voorheen deed alleen de open client dit (EmailLayout, elke 30 s). Wie de
 * app dicht had, zag zijn "morgenochtend" pas bij de volgende keer openen en
 * kreeg geen melding.
 *
 * snoozed_until is een TEXT-kolom met een ISO-tijd (migratie 001/005). De
 * vergelijking is dus tekstueel; dat klopt zolang de client volledige
 * ISO-strings in UTC schrijft, wat toISOString() doet.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET}.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/node'

// ── Sentry init (inline; Vercel bundelt geen lokale modules in api/) ──
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

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const BATCH = 200
const MAX_BATCHES = 5
const DEADLINE_MS = 40_000

function basisUrl(): string {
  if (process.env.CRON_SELF_URL) return process.env.CRON_SELF_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://app.doen.team'
}

interface GewekteMail {
  id: string
  user_id: string
  van: string | null
  from_name: string | null
  onderwerp: string | null
}

/**
 * Eén melding per gebruiker per ronde, zelfde toon als de nieuwe-mail-melding
 * in cron-mailsync-werker. Faalt stil: de mail staat al terug in de inbox.
 */
async function meldGewekt(userId: string, mails: GewekteMail[], cronSecret: string) {
  try {
    const { data: profiel } = await supabaseAdmin
      .from('profiles')
      .select('push_nieuwe_mail')
      .eq('id', userId)
      .maybeSingle()
    if (!profiel?.push_nieuwe_mail) return

    const eerste = mails[0]
    const afzender = eerste.from_name || eerste.van || 'Mail'
    const onderwerp = eerste.onderwerp || ''
    const titel = mails.length > 1 ? `${mails.length} gesnoozede mails terug` : `Terug in je inbox: ${afzender}`
    const tekst = mails.length > 1 ? `Onder andere: ${afzender} · ${onderwerp}` : onderwerp

    await fetch(`${basisUrl()}/api/push-verstuur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ service_user_id: userId, titel, tekst, url: '/email', tag: 'doen-mail-snooze' }),
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    console.warn('[cron-mail-snooze] melding niet verstuurd', { userId, err: err instanceof Error ? err.message : err })
  }
}

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const gestart = Date.now()
  let gewekt = 0
  const perUser = new Map<string, GewekteMail[]>()

  try {
    for (let ronde = 0; ronde < MAX_BATCHES && Date.now() - gestart < DEADLINE_MS; ronde++) {
      const nu = new Date().toISOString()
      const { data: rijen, error } = await supabaseAdmin
        .from('emails')
        .select('id, user_id, van, from_name, onderwerp')
        .not('snoozed_until', 'is', null)
        .lte('snoozed_until', nu)
        .order('snoozed_until', { ascending: true })
        .limit(BATCH)
      if (error) throw new Error(error.message)
      if (!rijen?.length) break

      const ids = rijen.map((r) => r.id as string)
      const { error: updateErr } = await supabaseAdmin
        .from('emails')
        .update({ map: 'inbox', snoozed_until: null, gelezen: false })
        .in('id', ids)
      if (updateErr) throw new Error(updateErr.message)

      gewekt += ids.length
      for (const rij of rijen as GewekteMail[]) {
        const lijst = perUser.get(rij.user_id) ?? []
        lijst.push(rij)
        perUser.set(rij.user_id, lijst)
      }
      if (rijen.length < BATCH) break
    }

    for (const [userId, mails] of perUser) {
      if (Date.now() - gestart > DEADLINE_MS + 10_000) break
      await meldGewekt(userId, mails, cronSecret)
    }

    return res.status(200).json({ gewekt, gebruikers: perUser.size, duurMs: Date.now() - gestart })
  } catch (err) {
    console.error('[cron-mail-snooze] Fatal:', err)
    Sentry.captureException(err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Snooze-wekker mislukt', gewekt })
  }
}
