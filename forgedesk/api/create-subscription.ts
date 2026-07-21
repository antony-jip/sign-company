import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY_LIVE || process.env.MOLLIE_API_KEY_TEST || ''
const APP_URL = process.env.VITE_APP_URL || 'https://app.doen.team'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// €79 ex btw, afgeschreven bedrag is incl 21% btw
const ABONNEMENT_BEDRAG = '95.59'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function verifyUser(req: VercelRequest): Promise<{ id: string; email?: string }> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return { id: user.id, email: user.email }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!MOLLIE_API_KEY) {
      return res.status(500).json({ error: 'MOLLIE_API_KEY niet geconfigureerd' })
    }

    const user = await verifyUser(req)

    const { organisatie_id } = req.body as { organisatie_id: string }
    if (!organisatie_id) {
      return res.status(400).json({ error: 'organisatie_id is verplicht' })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.organisatie_id !== organisatie_id) {
      return res.status(403).json({ error: 'Geen toegang tot deze organisatie' })
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organisaties')
      .select('naam, mollie_customer_id, mollie_subscription_id, abonnement_status')
      .eq('id', organisatie_id)
      .single()

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organisatie niet gevonden' })
    }

    const mollieHeaders = {
      'Authorization': `Bearer ${MOLLIE_API_KEY}`,
      'Content-Type': 'application/json',
    }

    const heeftEchteSubscription = !!org.mollie_subscription_id && !org.mollie_subscription_id.startsWith('pending_')

    if (heeftEchteSubscription && org.abonnement_status === 'actief') {
      return res.status(400).json({ error: 'Er loopt al een abonnement voor deze organisatie' })
    }

    // Verlopen/opgezegd met achtergebleven subscription-id (bijv. na een
    // mislukte incasso of chargeback): oude subscription bij Mollie opruimen
    // zodat opnieuw activeren mogelijk is zonder dubbele incasso's.
    if (heeftEchteSubscription && org.mollie_customer_id) {
      const deleteResponse = await fetch(
        `https://api.mollie.com/v2/customers/${org.mollie_customer_id}/subscriptions/${org.mollie_subscription_id}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${MOLLIE_API_KEY}` } }
      )
      if (!deleteResponse.ok && deleteResponse.status !== 404 && deleteResponse.status !== 410) {
        const errorBody = await deleteResponse.text()
        console.error('Oude subscription opruimen mislukt:', deleteResponse.status, errorBody)
        return res.status(502).json({ error: 'Bestaand abonnement opruimen bij Mollie mislukt, probeer het later opnieuw' })
      }
      await supabaseAdmin
        .from('organisaties')
        .update({ mollie_subscription_id: null })
        .eq('id', organisatie_id)
        .eq('mollie_subscription_id', org.mollie_subscription_id)
    } else if (heeftEchteSubscription) {
      // Subscription-id zonder customer-id kan niet bij Mollie bestaan;
      // wees-id opruimen zodat de webhook straks kan activeren
      await supabaseAdmin
        .from('organisaties')
        .update({ mollie_subscription_id: null })
        .eq('id', organisatie_id)
        .eq('mollie_subscription_id', org.mollie_subscription_id)
    }

    let customerId = org.mollie_customer_id as string | null

    // Een opgeslagen klant-id kan onbruikbaar zijn: verwijderd bij Mollie, of
    // aangemaakt op het andere account bij een wissel tussen test en live.
    // Zonder deze controle loopt de klant tegen een harde 502 aan in plaats van
    // gewoon te kunnen betalen.
    if (customerId) {
      const checkResponse = await fetch(`https://api.mollie.com/v2/customers/${customerId}`, {
        headers: { 'Authorization': `Bearer ${MOLLIE_API_KEY}` },
      })
      if (checkResponse.status === 404 || checkResponse.status === 410) {
        console.warn(`Mollie kent klant ${customerId} niet meer voor org ${organisatie_id}; nieuwe wordt aangemaakt`)
        customerId = null
        await supabaseAdmin
          .from('organisaties')
          .update({ mollie_customer_id: null })
          .eq('id', organisatie_id)
      } else if (!checkResponse.ok) {
        const errorBody = await checkResponse.text()
        console.error('Mollie klant controleren mislukt:', checkResponse.status, errorBody)
        return res.status(502).json({ error: 'Klantgegevens ophalen bij Mollie mislukt' })
      }
    }

    if (!customerId) {
      const customerResponse = await fetch('https://api.mollie.com/v2/customers', {
        method: 'POST',
        headers: mollieHeaders,
        body: JSON.stringify({
          name: org.naam || undefined,
          email: user.email || undefined,
          metadata: { organisatie_id, user_id: user.id },
        }),
      })

      if (!customerResponse.ok) {
        const errorBody = await customerResponse.text()
        console.error('Mollie customer aanmaken mislukt:', customerResponse.status, errorBody)
        return res.status(502).json({ error: 'Klant aanmaken bij Mollie mislukt' })
      }

      const customer = await customerResponse.json() as { id: string }
      customerId = customer.id

      await supabaseAdmin
        .from('organisaties')
        .update({ mollie_customer_id: customerId })
        .eq('id', organisatie_id)
    }

    const host = req.headers.host || new URL(APP_URL).host
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const webhookUrl = `${protocol}://${host}/api/billing-webhook`

    // Eerste betaling: maand 1 + incasso-mandaat in één. De webhook maakt na
    // 'paid' de maandelijkse Mollie-subscription aan.
    const paymentResponse = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: mollieHeaders,
      body: JSON.stringify({
        amount: { currency: 'EUR', value: ABONNEMENT_BEDRAG },
        description: 'doen. abonnement · eerste maand, daarna maandelijks',
        customerId,
        sequenceType: 'first',
        redirectUrl: `${APP_URL}/instellingen?tab=abonnement&abonnement=klaar`,
        webhookUrl,
        metadata: { type: 'abonnement', organisatie_id },
      }),
    })

    if (!paymentResponse.ok) {
      const errorBody = await paymentResponse.text()
      console.error('Mollie eerste betaling aanmaken mislukt:', paymentResponse.status, errorBody)
      return res.status(502).json({ error: 'Betaling aanmaken bij Mollie mislukt' })
    }

    const payment = await paymentResponse.json() as {
      id: string
      _links?: { checkout?: { href?: string } }
    }

    const checkoutUrl = payment._links?.checkout?.href
    if (!checkoutUrl) {
      console.error('Mollie payment zonder checkout URL:', payment.id)
      return res.status(502).json({ error: 'Geen checkout URL ontvangen van Mollie' })
    }

    return res.status(200).json({ url: checkoutUrl })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('Create subscription error:', message)
    return res.status(500).json({ error: `Mollie fout: ${message}` })
  }
}
