/**
 * Ruimt vergeten inklok-sessies op.
 *
 * Een sessie die langer dan MAX_SESSIE_UREN loopt is niet gewerkt maar
 * vergeten. Er wordt bewust GEEN tijdregistratie geboekt: een nacht van
 * veertien uur in de nacalculatie is erger dan een gat in de urenlijst. De
 * medewerker krijgt een notificatie om de uren zelf aan te vullen.
 *
 * De client hanteert dezelfde grens bij het lezen (zie tijdSessieService), dus
 * een vergeten sessie wordt ook zonder deze cron nooit als gewerkte tijd
 * geboekt. Dit is het opruimwerk, niet de correctheid.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET} header.
 * Schedule: dagelijks 03:30 UTC.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
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

const MAX_SESSIE_UREN = 12

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

interface VergetenSessie {
  id: string
  user_id: string
  project_id: string
  project_naam: string | null
  gestart_op: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const grens = new Date(Date.now() - MAX_SESSIE_UREN * 3600 * 1000).toISOString()

    const { data, error } = await supabaseAdmin
      .from('tijd_sessies')
      .select('id, user_id, project_id, project_naam, gestart_op')
      .lt('gestart_op', grens)

    if (error) {
      Sentry.captureException(error)
      console.error('[cron-tijd-sessies] Ophalen vergeten sessies mislukt:', error)
      return res.status(500).json({ error: error.message })
    }

    const sessies = (data || []) as VergetenSessie[]
    if (sessies.length === 0) {
      return res.status(200).json({ opgeruimd: 0 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('tijd_sessies')
      .delete()
      .in('id', sessies.map((s) => s.id))

    if (deleteError) {
      Sentry.captureException(deleteError)
      console.error('[cron-tijd-sessies] Opruimen mislukt:', deleteError)
      return res.status(500).json({ error: deleteError.message })
    }

    // Notificaties zijn best-effort: het opruimen is al gelukt en mag niet
    // alsnog als mislukt gerapporteerd worden.
    const { error: notifError } = await supabaseAdmin.from('notificaties').insert(
      sessies.map((s) => ({
        user_id: s.user_id,
        type: 'herinnering',
        titel: 'Vergeten uit te klokken',
        bericht: `Je stond sinds ${new Date(s.gestart_op).toLocaleString('nl-NL')} ingeklokt op ${s.project_naam || 'een project'}. Er zijn geen uren geboekt; vul ze handmatig aan als je eraan gewerkt hebt.`,
        link: `/projecten/${s.project_id}`,
        gelezen: false,
      }))
    )
    if (notifError) {
      console.warn('[cron-tijd-sessies] Notificaties aanmaken mislukt:', notifError.message)
      Sentry.captureMessage(`cron-tijd-sessies: notificaties mislukt: ${notifError.message}`, 'warning')
    }

    console.log(`[cron-tijd-sessies] ${sessies.length} vergeten sessie(s) opgeruimd`)
    return res.status(200).json({ opgeruimd: sessies.length })
  } catch (err) {
    Sentry.captureException(err)
    console.error('[cron-tijd-sessies] Fatale fout:', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Cron mislukt' })
  }
}
