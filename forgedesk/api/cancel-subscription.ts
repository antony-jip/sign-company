import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY_LIVE || process.env.MOLLIE_API_KEY_TEST || ''
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function verifyUser(req: VercelRequest): Promise<{ id: string }> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return { id: user.id }
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
      .select('mollie_customer_id, mollie_subscription_id')
      .eq('id', organisatie_id)
      .single()

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organisatie niet gevonden' })
    }

    const subscriptionId = org.mollie_subscription_id as string | null
    if (!subscriptionId || subscriptionId.startsWith('pending_') || !org.mollie_customer_id) {
      return res.status(400).json({ error: 'Geen lopend abonnement gevonden' })
    }

    const subscriptionUrl = `https://api.mollie.com/v2/customers/${org.mollie_customer_id}/subscriptions/${subscriptionId}`
    const mollieHeaders = { 'Authorization': `Bearer ${MOLLIE_API_KEY}` }

    // nextPaymentDate = einde van de al betaalde periode; tot die datum
    // houdt de organisatie toegang (cron zet daarna de status om).
    let actiefTot: string | null = null
    let subscriptionBestaat = true
    const getResponse = await fetch(subscriptionUrl, { headers: mollieHeaders })
    if (getResponse.ok) {
      const subscription = await getResponse.json() as { nextPaymentDate?: string }
      if (subscription.nextPaymentDate) {
        actiefTot = new Date(`${subscription.nextPaymentDate}T00:00:00Z`).toISOString()
      }
    } else if (getResponse.status === 404 || getResponse.status === 410) {
      subscriptionBestaat = false
    } else {
      // Zonder nextPaymentDate zou de betaalde restperiode verloren gaan;
      // bij een Mollie-storing dus niet doorzetten
      const errorBody = await getResponse.text()
      console.error('Mollie subscription ophalen mislukt:', getResponse.status, errorBody)
      return res.status(502).json({ error: 'Opzeggen bij Mollie mislukt, probeer het later opnieuw' })
    }

    if (subscriptionBestaat) {
      const deleteResponse = await fetch(subscriptionUrl, { method: 'DELETE', headers: mollieHeaders })
      if (!deleteResponse.ok && deleteResponse.status !== 404 && deleteResponse.status !== 410) {
        const errorBody = await deleteResponse.text()
        console.error('Mollie subscription opzeggen mislukt:', deleteResponse.status, errorBody)
        return res.status(502).json({ error: 'Opzeggen bij Mollie mislukt' })
      }
    }

    const eindeNu = !actiefTot || new Date(actiefTot).getTime() <= Date.now()
    const { error: updateError } = await supabaseAdmin
      .from('organisaties')
      .update(
        eindeNu
          ? { mollie_subscription_id: null, abonnement_actief_tot: null, abonnement_status: 'opgezegd', is_betaald: false }
          : { mollie_subscription_id: null, abonnement_actief_tot: actiefTot }
      )
      .eq('id', organisatie_id)

    if (updateError) {
      console.error('Opzegging opslaan mislukt:', updateError)
      return res.status(500).json({ error: 'Opzegging opslaan mislukt' })
    }

    console.log(`Abonnement opgezegd: org=${organisatie_id}, actief tot ${actiefTot || 'nu'}`)
    return res.status(200).json({ actief_tot: eindeNu ? null : actiefTot })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('Cancel subscription error:', message)
    return res.status(500).json({ error: `Mollie fout: ${message}` })
  }
}
