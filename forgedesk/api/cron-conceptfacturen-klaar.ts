/**
 * Conceptfacturen klaar: op de eerste werkdag van de maand één melding aan de
 * beheerders van elke organisatie die de schakelaar conceptfacturen_maandelijks
 * aan heeft, met het aantal conceptfacturen dat klaarstaat. Verstuurt niets
 * zelf; dat blijft een bewuste klik in Facturen.
 *
 * De schakelaar staat in app_settings.functies (JSONB); de standaard is uit,
 * dus zonder rij gebeurt er niets. api/ importeert niets uit src, vandaar
 * inline.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET}.
 * Schedule: dagelijks 07:30 UTC (vercel.json); de cron zelf kijkt of vandaag
 * de eerste werkdag van de maand is in Europe/Amsterdam.
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

const TIJDZONE = 'Europe/Amsterdam'

function amsterdamDatum(nu = new Date()): { jaar: number; maand: number; dag: number; weekdag: number } {
  const delen = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIJDZONE, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(nu)
  const get = (t: string) => delen.find((d) => d.type === t)?.value ?? ''
  const weekdagen: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { jaar: Number(get('year')), maand: Number(get('month')), dag: Number(get('day')), weekdag: weekdagen[get('weekday')] ?? 0 }
}

/** Eerste werkdag (ma t/m vr) van de maand, als dagnummer. */
function eersteWerkdag(jaar: number, maand: number): number {
  for (let dag = 1; dag <= 7; dag++) {
    const wd = new Date(Date.UTC(jaar, maand - 1, dag)).getUTCDay()
    if (wd >= 1 && wd <= 5) return dag
  }
  return 1
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const forceer = req.query.forceer === '1'
  const vandaag = amsterdamDatum()
  if (!forceer && vandaag.dag !== eersteWerkdag(vandaag.jaar, vandaag.maand)) {
    return res.status(200).json({ overgeslagen: 'niet de eerste werkdag' })
  }

  try {
    const { data: instellingen, error } = await supabaseAdmin
      .from('app_settings')
      .select('organisatie_id, functies')
      .not('organisatie_id', 'is', null)
      .eq('functies->>conceptfacturen_maandelijks', 'true')
    if (error) {
      console.error('[cron-conceptfacturen] instellingen ophalen mislukt:', error.message)
      return res.status(500).json({ error: error.message })
    }

    const orgIds = Array.from(new Set((instellingen || []).map((r) => r.organisatie_id as string)))
    if (orgIds.length === 0) return res.status(200).json({ organisaties: 0, meldingen: 0 })

    const dagStartUtc = new Date(Date.UTC(vandaag.jaar, vandaag.maand - 1, vandaag.dag) - 2 * 3600 * 1000).toISOString()
    let meldingen = 0

    for (const orgId of orgIds) {
      const { count } = await supabaseAdmin
        .from('facturen')
        .select('id', { count: 'exact', head: true })
        .eq('organisatie_id', orgId)
        .eq('status', 'concept')
      const aantal = count ?? 0
      if (aantal === 0) continue

      const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('organisatie_id', orgId)
        .eq('rol', 'admin')
      const adminIds = (admins || []).map((a) => a.id as string)
      if (adminIds.length === 0) continue

      // Eén melding per beheerder per dag: bestaande melding van vandaag telt als gedaan.
      const { data: bestaand } = await supabaseAdmin
        .from('notificaties')
        .select('user_id')
        .in('user_id', adminIds)
        .eq('type', 'conceptfacturen_klaar')
        .gte('created_at', dagStartUtc)
      const alGemeld = new Set((bestaand || []).map((b) => b.user_id as string))
      const doelen = adminIds.filter((id) => !alGemeld.has(id))
      if (doelen.length === 0) continue

      const meervoud = aantal === 1 ? 'staat 1 conceptfactuur' : `staan ${aantal} conceptfacturen`
      const { error: insertError } = await supabaseAdmin.from('notificaties').insert(
        doelen.map((userId) => ({
          user_id: userId,
          organisatie_id: orgId,
          type: 'conceptfacturen_klaar',
          titel: 'Conceptfacturen klaar om te versturen',
          bericht: `Er ${meervoud} klaar. Eerste werkdag van de maand: verwerk en verstuur ze vanuit Facturen.`,
          link: '/facturen?filter=concept',
          gelezen: false,
        }))
      )
      if (insertError) {
        console.warn('[cron-conceptfacturen] melding mislukt voor org', orgId, insertError.message)
        continue
      }
      meldingen += doelen.length
    }

    return res.status(200).json({ organisaties: orgIds.length, meldingen })
  } catch (err) {
    console.error('[cron-conceptfacturen] fatale fout:', err)
    Sentry.captureException(err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Cron mislukt' })
  }
}
