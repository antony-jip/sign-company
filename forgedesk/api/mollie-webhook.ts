import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const MOLLIE_API_BASE = 'https://api.mollie.com/v2/payments'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Mollie stuurt geen auth header — webhook moet open staan
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { id: paymentId } = req.body as { id?: string }

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID ontbreekt' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Supabase not configured for mollie webhook')
      return res.status(500).json({ error: 'Database niet geconfigureerd' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Zoek de factuur met dit mollie_payment_id om de user_id te achterhalen
    const { data: factuur } = await supabase
      .from('facturen')
      .select('id, user_id, totaal, betaald_bedrag')
      .eq('mollie_payment_id', paymentId)
      .single()

    if (!factuur) {
      console.warn(`Mollie webhook: geen factuur gevonden voor payment ${paymentId}`)
      // Toch 200 teruggeven zodat Mollie niet blijft retrien
      return res.status(200).json({ received: true })
    }

    // Haal mollie_api_key op uit app_settings voor die user
    let mollieApiKey = ''
    if (factuur.user_id) {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('mollie_api_key')
        .eq('user_id', factuur.user_id)
        .single()
      if (settings?.mollie_api_key) {
        mollieApiKey = settings.mollie_api_key
      }
    }

    // Fallback naar env vars
    if (!mollieApiKey) {
      mollieApiKey = process.env.MOLLIE_API_KEY_LIVE || process.env.MOLLIE_API_KEY_TEST || ''
    }

    if (!mollieApiKey) {
      console.error('Geen Mollie API key beschikbaar voor verificatie')
      return res.status(500).json({ error: 'Mollie niet geconfigureerd' })
    }

    // Verifieer betaling bij Mollie
    const mollieResponse = await fetch(`${MOLLIE_API_BASE}/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mollieApiKey}` },
    })

    if (!mollieResponse.ok) {
      console.error('Mollie payment verification failed:', mollieResponse.status)
      return res.status(502).json({ error: 'Kon betaling niet verifiëren bij Mollie' })
    }

    const payment = await mollieResponse.json()

    console.log(`Mollie webhook: payment ${paymentId} status=${payment.status}`)

    if (payment.status === 'paid') {
      const now = new Date().toISOString()
      await supabase
        .from('facturen')
        .update({
          status: 'betaald',
          betaaldatum: now.split('T')[0],
          betaald_bedrag: factuur.totaal,
          updated_at: now,
        })
        .eq('id', factuur.id)

      console.log(`Factuur ${factuur.id} gemarkeerd als betaald via Mollie`)
    }

    return res.status(200).json({ received: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Mollie webhook error:', message)
    // Altijd 200 teruggeven om Mollie retries te voorkomen bij onze fout
    return res.status(200).json({ received: true, error: message })
  }
}
