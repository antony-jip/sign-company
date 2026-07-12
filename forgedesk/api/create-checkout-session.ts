import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY_LIVE || process.env.MOLLIE_API_KEY_TEST || ''
const APP_URL = process.env.VITE_APP_URL || 'https://app.doen.team'

function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const appHost = new URL(APP_URL).hostname
    return parsed.hostname === appHost || parsed.hostname === 'localhost'
  } catch {
    return false
  }
}

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function verifyUser(req: VercelRequest): Promise<{ id: string; email?: string }> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return { id: user.id, email: user.email }
}

// Bedragen in centen, zoals afgerekend via Mollie
const PAKKET_PRIJZEN: Record<string, { amount: number; credits: number; naam: string }> = {
  starter: { amount: 990, credits: 10, naam: 'Starter · 10 credits' },
  professional: { amount: 3950, credits: 50, naam: 'Professional · 50 credits' },
  enterprise: { amount: 11900, credits: 200, naam: 'Enterprise · 200 credits' },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!MOLLIE_API_KEY) {
      return res.status(500).json({
        error: 'MOLLIE_API_KEY niet geconfigureerd. Voeg MOLLIE_API_KEY_LIVE toe aan Vercel Environment Variables.',
      })
    }

    const user = await verifyUser(req)

    const { pakket_id, success_url } = req.body as {
      pakket_id: string
      success_url: string
    }

    if (!pakket_id || !success_url) {
      return res.status(400).json({ error: 'pakket_id en success_url zijn verplicht' })
    }

    if (!isAllowedRedirectUrl(success_url)) {
      return res.status(400).json({ error: 'Ongeldige redirect URL' })
    }

    const pakket = PAKKET_PRIJZEN[pakket_id]
    if (!pakket) {
      return res.status(400).json({ error: 'Ongeldig pakket' })
    }

    const host = req.headers.host || new URL(APP_URL).host
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const webhookUrl = `${protocol}://${host}/api/billing-webhook`

    const mollieResponse = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOLLIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: { currency: 'EUR', value: (pakket.amount / 100).toFixed(2) },
        description: `doen. Studio · ${pakket.naam}`,
        redirectUrl: success_url,
        webhookUrl,
        metadata: {
          type: 'credits',
          user_id: user.id,
          pakket_id,
          credits: pakket.credits.toString(),
        },
      }),
    })

    if (!mollieResponse.ok) {
      const errorBody = await mollieResponse.text()
      console.error('Mollie payment aanmaken mislukt:', mollieResponse.status, errorBody)
      return res.status(502).json({ error: 'Betaling aanmaken bij Mollie mislukt' })
    }

    const payment = await mollieResponse.json() as {
      id: string
      _links?: { checkout?: { href?: string } }
    }

    const checkoutUrl = payment._links?.checkout?.href
    if (!checkoutUrl) {
      console.error('Mollie payment zonder checkout URL:', payment.id)
      return res.status(502).json({ error: 'Geen checkout URL ontvangen van Mollie' })
    }

    return res.status(200).json({ payment_id: payment.id, url: checkoutUrl })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('Mollie checkout error:', message)
    return res.status(500).json({ error: `Mollie fout: ${message}` })
  }
}
