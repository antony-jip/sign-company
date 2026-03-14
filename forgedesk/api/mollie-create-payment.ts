import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const MOLLIE_API_URL = 'https://api.mollie.com/v2/payments'
const DEFAULT_REDIRECT = process.env.VITE_APP_URL || 'https://app.forgedesk.io'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)

    const { factuur_id, bedrag, omschrijving, redirect_url } = req.body as {
      factuur_id: string
      bedrag: number
      omschrijving: string
      redirect_url?: string
    }

    if (!factuur_id || !bedrag) {
      return res.status(400).json({ error: 'factuur_id en bedrag zijn verplicht' })
    }

    // Haal mollie_api_key op uit app_settings voor de user_id
    let mollieApiKey = ''

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const { data: settings } = await supabase
        .from('app_settings')
        .select('mollie_api_key, mollie_enabled')
        .eq('user_id', user_id)
        .single()

      if (settings?.mollie_enabled && settings?.mollie_api_key) {
        mollieApiKey = settings.mollie_api_key
      }
    }

    // Fallback naar Vercel environment variables
    if (!mollieApiKey) {
      mollieApiKey = process.env.MOLLIE_API_KEY_LIVE || process.env.MOLLIE_API_KEY_TEST || ''
    }

    if (!mollieApiKey) {
      return res.status(400).json({
        error: 'Mollie is niet geconfigureerd. Voeg je API key toe in Instellingen > Integraties.',
      })
    }

    const redirectAfterPayment = redirect_url || `${DEFAULT_REDIRECT}/betaald?factuur_id=${factuur_id}`

    // Webhook URL — Vercel detecteert automatisch de juiste host
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'app.forgedesk.io'
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const webhookUrl = `${protocol}://${host}/api/mollie-webhook`

    const mollieResponse = await fetch(MOLLIE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mollieApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          currency: 'EUR',
          value: bedrag.toFixed(2),
        },
        description: omschrijving || `Factuur ${factuur_id}`,
        redirectUrl: redirectAfterPayment,
        webhookUrl,
        metadata: {
          factuur_id,
          user_id,
        },
      }),
    })

    if (!mollieResponse.ok) {
      const errorBody = await mollieResponse.text()
      console.error('Mollie API error:', mollieResponse.status, errorBody)
      return res.status(502).json({ error: `Mollie fout: ${mollieResponse.status}` })
    }

    const payment = await mollieResponse.json()

    // Sla mollie_payment_id en betaal_link op in factuur
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      await supabase
        .from('facturen')
        .update({
          mollie_payment_id: payment.id,
          betaal_link: payment._links?.checkout?.href || '',
        })
        .eq('id', factuur_id)
    }

    return res.status(200).json({
      payment_url: payment._links?.checkout?.href || '',
      payment_id: payment.id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Mollie create payment error:', message)
    return res.status(500).json({ error: message })
  }
}
