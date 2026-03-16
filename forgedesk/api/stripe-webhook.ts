import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const config = {
  api: {
    bodyParser: false, // Stripe needs raw body for signature verification
  },
}

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ─── Credits: checkout.session.completed (one-time payment) ───
async function handleCreditsCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const pakketId = session.metadata?.pakket_id
  const credits = parseInt(session.metadata?.credits || '0', 10)

  if (!userId || !credits) {
    console.log('Checkout session without credits metadata, skipping credits logic:', session.id)
    return
  }

  console.log(`Credits payment completed: user=${userId}, pakket=${pakketId}, credits=${credits}`)

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn(`Supabase not configured — credits NOT added for user ${userId}`)
    return
  }

  const supabase = getSupabase()

  const { data: existing } = await supabase
    .from('visualizer_credits')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existing) {
    await supabase
      .from('visualizer_credits')
      .update({
        saldo: existing.saldo + credits,
        totaal_gekocht: existing.totaal_gekocht + credits,
        laatst_bijgewerkt: new Date().toISOString(),
      })
      .eq('user_id', userId)
  } else {
    await supabase
      .from('visualizer_credits')
      .insert({
        user_id: userId,
        saldo: credits,
        totaal_gekocht: credits,
        totaal_gebruikt: 0,
        laatst_bijgewerkt: new Date().toISOString(),
      })
  }

  await supabase.from('credit_transacties').insert({
    user_id: userId,
    type: 'aankoop',
    aantal: credits,
    saldo_na: (existing?.saldo || 0) + credits,
    beschrijving: `Stripe betaling — ${pakketId} pakket (${credits} credits)`,
    stripe_session_id: session.id,
    stripe_payment_intent: session.payment_intent as string,
  })

  console.log(`Credits added: user=${userId}, +${credits}, new_saldo=${(existing?.saldo || 0) + credits}`)
}

// ─── Subscription: checkout.session.completed (subscription mode) ───
async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const organisatieId = session.metadata?.organisatie_id
  if (!organisatieId) {
    console.log('Subscription checkout without organisatie_id, skipping:', session.id)
    return
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn(`Supabase not configured — subscription NOT activated for org ${organisatieId}`)
    return
  }

  const supabase = getSupabase()

  await supabase
    .from('organisaties')
    .update({
      is_betaald: true,
      abonnement_status: 'actief',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
    })
    .eq('id', organisatieId)

  console.log(`Subscription activated: org=${organisatieId}, customer=${session.customer}`)
}

// ─── invoice.payment_failed ───
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  if (!customerId || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return

  const supabase = getSupabase()

  await supabase
    .from('organisaties')
    .update({ abonnement_status: 'verlopen' })
    .eq('stripe_customer_id', customerId)

  console.log(`Payment failed: customer=${customerId}, status set to verlopen`)
}

// ─── customer.subscription.deleted ───
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  if (!customerId || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return

  const supabase = getSupabase()

  await supabase
    .from('organisaties')
    .update({ abonnement_status: 'opgezegd', is_betaald: false })
    .eq('stripe_customer_id', customerId)

  console.log(`Subscription deleted: customer=${customerId}, status set to opgezegd`)
}

// ─── customer.subscription.updated ───
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  if (!customerId || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return

  const supabase = getSupabase()

  if (subscription.status === 'active') {
    await supabase
      .from('organisaties')
      .update({ abonnement_status: 'actief', is_betaald: true })
      .eq('stripe_customer_id', customerId)

    console.log(`Subscription reactivated: customer=${customerId}`)
  }
}

// ─── Main handler ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error('Stripe keys not configured')
      return res.status(500).json({ error: 'Stripe niet geconfigureerd' })
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY)
    const rawBody = await getRawBody(req)
    const signature = req.headers['stripe-signature'] as string

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      console.error('Webhook signature verification failed:', msg)
      return res.status(400).json({ error: `Webhook signature ongeldig: ${msg}` })
    }

    console.log(`Stripe webhook received: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription') {
          await handleSubscriptionCheckout(session)
        } else {
          await handleCreditsCheckout(session)
        }
        break
      }
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return res.status(200).json({ received: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Stripe webhook error:', message)
    return res.status(500).json({ error: message })
  }
}
