import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''

// Map pakket IDs to Stripe price amounts (in cents)
const PAKKET_PRIJZEN: Record<string, { amount: number; credits: number; naam: string }> = {
  starter: { amount: 990, credits: 10, naam: 'Starter — 10 credits' },
  professional: { amount: 3950, credits: 50, naam: 'Professional — 50 credits' },
  enterprise: { amount: 11900, credits: 200, naam: 'Enterprise — 200 credits' },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: 'STRIPE_SECRET_KEY niet geconfigureerd. Voeg STRIPE_SECRET_KEY toe aan Vercel Environment Variables.',
      })
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY)

    const { pakket_id, user_id, user_email, success_url, cancel_url } = req.body as {
      pakket_id: string
      user_id: string
      user_email?: string
      success_url: string
      cancel_url: string
    }

    if (!pakket_id || !user_id || !success_url || !cancel_url) {
      return res.status(400).json({ error: 'pakket_id, user_id, success_url en cancel_url zijn verplicht' })
    }

    const pakket = PAKKET_PRIJZEN[pakket_id]
    if (!pakket) {
      return res.status(400).json({ error: 'Ongeldig pakket' })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: pakket.naam,
              description: `${pakket.credits} AI Visualizer credits voor FORGEdesk`,
            },
            unit_amount: pakket.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url,
      customer_email: user_email || undefined,
      metadata: {
        user_id,
        pakket_id,
        credits: pakket.credits.toString(),
      },
    })

    return res.status(200).json({
      session_id: session.id,
      url: session.url,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Stripe checkout error:', message)
    return res.status(500).json({ error: `Stripe fout: ${message}` })
  }
}
