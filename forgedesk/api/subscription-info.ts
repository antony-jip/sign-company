import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY_LIVE || process.env.MOLLIE_API_KEY_TEST || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Leest de lopende incasso rechtstreeks bij Mollie in plaats van de datum in
// onze eigen database te dupliceren: Mollie is hier de bron van waarheid en
// schuift de datum zelf op na elke geslaagde incasso.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Niet ingelogd' })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Niet ingelogd' })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id')
      .eq('id', user.id)
      .maybeSingle()

    const organisatieId = profile?.organisatie_id
    if (!organisatieId) return res.status(403).json({ error: 'Geen organisatie' })

    const { data: org } = await supabaseAdmin
      .from('organisaties')
      .select('mollie_customer_id, mollie_subscription_id')
      .eq('id', organisatieId)
      .maybeSingle()

    if (!org?.mollie_customer_id || !org?.mollie_subscription_id || org.mollie_subscription_id.startsWith('pending_')) {
      return res.status(200).json({ actief: false })
    }

    if (!MOLLIE_API_KEY) return res.status(200).json({ actief: false })

    const response = await fetch(
      `https://api.mollie.com/v2/customers/${org.mollie_customer_id}/subscriptions/${org.mollie_subscription_id}`,
      { headers: { 'Authorization': `Bearer ${MOLLIE_API_KEY}` } }
    )

    if (!response.ok) {
      console.warn('[subscription-info] ophalen mislukt:', response.status)
      return res.status(200).json({ actief: false })
    }

    const sub = await response.json() as {
      status?: string
      amount?: { value?: string; currency?: string }
      interval?: string
      nextPaymentDate?: string
    }

    return res.status(200).json({
      actief: sub.status === 'active',
      status: sub.status,
      bedrag: sub.amount?.value ?? null,
      interval: sub.interval ?? null,
      volgendeIncasso: sub.nextPaymentDate ?? null,
    })
  } catch (error: unknown) {
    console.error('[subscription-info] fout:', error instanceof Error ? error.message : error)
    return res.status(500).json({ error: 'Kon abonnementsgegevens niet ophalen' })
  }
}
