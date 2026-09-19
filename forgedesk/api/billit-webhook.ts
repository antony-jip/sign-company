/**
 * Webhook-ontvanger voor Billit (geregistreerd in api/billit-callback.ts).
 *
 * URL: /api/billit-webhook?org=<organisatie_id>&secret=<billit_webhook_secret>
 *
 * We vertrouwen de payload zelf niet: hij is alleen het sein om voor deze
 * organisatie de Billit-sync te draaien (api/cron-billit-inbox.ts, die
 * de afleverstatussen én de Peppol-inbox bijwerkt). Zo maakt het niet uit
 * welke velden Billit precies meestuurt, en is de cron de enige plek met
 * order-logica.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createHash, timingSafeEqual } from 'node:crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const APP_URL = 'https://app.doen.team'

function veilig(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const org = typeof req.query.org === 'string' ? req.query.org : ''
  const secret = typeof req.query.secret === 'string' ? req.query.secret : ''
  if (!org || !secret) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: rij } = await supabase
    .from('app_settings')
    .select('billit_webhook_secret, boekhoud_pakket')
    .eq('organisatie_id', org)
    .maybeSingle()
  const verwacht = (rij as { billit_webhook_secret?: string | null } | null)?.billit_webhook_secret ?? ''
  if (!verwacht || !veilig(createHash('sha256').update(secret).digest('hex'), verwacht)) return res.status(401).json({ error: 'Unauthorized' })
  if ((rij as { boekhoud_pakket?: string | null } | null)?.boekhoud_pakket !== 'billit') {
    // Ontkoppeld maar webhook nog actief bij Billit: netjes bevestigen zodat
    // Billit niet blijft herhalen.
    return res.status(200).json({ ok: true, genegeerd: true })
  }

  // Billit's registratie-handshake (GET) hoeft alleen een 200.
  if (req.method === 'GET') return res.status(200).json({ ok: true })

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return res.status(500).json({ error: 'CRON_SECRET ontbreekt' })

  try {
    const sync = await fetch(`${APP_URL}/api/cron-billit-inbox?org=${encodeURIComponent(org)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(50_000),
    })
    const body = await sync.json().catch(() => null)
    if (!sync.ok) console.error('[billit-webhook] sync mislukt:', sync.status, body)
    return res.status(200).json({ ok: true, gesynct: sync.ok })
  } catch (err) {
    // Billit herhaalt bij een fout; de cron pakt het sowieso binnen 15 minuten op.
    console.error('[billit-webhook] sync exception:', err)
    return res.status(200).json({ ok: true, gesynct: false })
  }
}
