import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || ''
const APP_URL = process.env.VITE_APP_URL || 'https://app.doen.team'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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
    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'STRIPE_SECRET_KEY niet geconfigureerd' })
    }
    if (!STRIPE_PRICE_ID) {
      return res.status(500).json({ error: 'STRIPE_PRICE_ID niet geconfigureerd' })
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY)
    const user = await verifyUser(req)

    const { organisatie_id } = req.body as { organisatie_id: string }
    if (!organisatie_id) {
      return res.status(400).json({ error: 'organisatie_id is verplicht' })
    }

    // Verify user belongs to this organisation
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.organisatie_id !== organisatie_id) {
      return res.status(403).json({ error: 'Geen toegang tot deze organisatie' })
    }

    // Haal organisatie op
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organisaties')
      .select('stripe_customer_id')
      .eq('id', organisatie_id)
      .single()

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organisatie niet gevonden' })
    }

    // Maak Stripe Customer aan als die nog niet bestaat
    let customerId = org.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { organisatie_id, user_id: user.id },
      })
      customerId = customer.id

      // Sla customer ID op
      await supabaseAdmin
        .from('organisaties')
        .update({ stripe_customer_id: customerId })
        .eq('id', organisatie_id)
    }

    // Maak Checkout Session aan voor subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${APP_URL}/instellingen?tab=abonnement&abonnement=success`,
      cancel_url: `${APP_URL}/instellingen?tab=abonnement&abonnement=canceled`,
      metadata: { organisatie_id },
    })

    return res.status(200).json({ url: session.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('Create subscription error:', message)
    return res.status(500).json({ error: `Stripe fout: ${message}` })
  }
}
