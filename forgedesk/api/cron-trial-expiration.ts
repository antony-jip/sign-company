/**
 * Zet trial-abonnementen om naar 'verlopen' zodra trial_einde gepasseerd is.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET} header.
 * Vercel Cron stuurt deze automatisch mee op basis van vercel.json.
 *
 * Schedule: dagelijks 03:00 UTC.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/node'

if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  })
}

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const nu = new Date().toISOString()

    const { data: verlopen, error: fetchError } = await supabaseAdmin
      .from('organisaties')
      .select('id, trial_einde')
      .eq('abonnement_status', 'trial')
      .lt('trial_einde', nu)

    if (fetchError) {
      Sentry.captureException(fetchError)
      console.error('[cron-trial] Ophalen verlopen trials mislukt:', fetchError)
      return res.status(500).json({ error: fetchError.message })
    }

    if (!verlopen || verlopen.length === 0) {
      return res.status(200).json({ processed: 0 })
    }

    const ids = verlopen.map((o) => o.id)
    const { error: updateError } = await supabaseAdmin
      .from('organisaties')
      .update({ abonnement_status: 'verlopen' })
      .in('id', ids)

    if (updateError) {
      Sentry.captureException(updateError)
      console.error('[cron-trial] Update verlopen status mislukt:', updateError)
      return res.status(500).json({ error: updateError.message })
    }

    console.log(`[cron-trial] ${ids.length} organisatie(s) naar verlopen gezet`)
    return res.status(200).json({ processed: ids.length, ids })
  } catch (err) {
    Sentry.captureException(err)
    console.error('[cron-trial] Fatale fout:', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Cron mislukt' })
  }
}
