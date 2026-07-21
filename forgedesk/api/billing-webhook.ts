import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/node'

// ── Sentry init (inline; Vercel bundelt geen lokale modules in api/) ──
if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  const SENS = /password|app_password|encrypted_app_password|betaal_token|payment_token|access_token|refresh_token|mollie_api_key|authorization|cookie|secret|api_key|to|cc|bcc|email/i
  const scrub = (v: unknown, d = 0): unknown => {
    if (d > 6 || v == null) return v
    if (Array.isArray(v)) return v.map(x => scrub(x, d + 1))
    if (typeof v === 'object') {
      const o: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) o[k] = SENS.test(k) ? '[Filtered]' : scrub(val, d + 1)
      return o
    }
    return v
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) for (const k of Object.keys(event.request.headers)) if (/authorization|cookie/i.test(k)) (event.request.headers as Record<string, string>)[k] = '[Filtered]'
      if (event.request?.data) event.request.data = scrub(event.request.data) as typeof event.request.data
      if (event.user) { delete event.user.ip_address; delete event.user.email }
      return event
    },
  })
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY_LIVE || process.env.MOLLIE_API_KEY_TEST || ''

// €79 ex btw, afgeschreven bedrag is incl 21% btw
const ABONNEMENT_BEDRAG = '95.59'

interface MolliePayment {
  id: string
  status: string
  paidAt?: string
  customerId?: string
  subscriptionId?: string
  metadata?: {
    type?: string
    user_id?: string
    pakket_id?: string
    credits?: string
    organisatie_id?: string
  } | null
}

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Eén maand vooruit, geklemd op de laatste dag van de doelmaand
// (31 jan → 28/29 feb), als YYYY-MM-DD voor Mollie's startDate.
function eenMaandLater(vanaf: Date): string {
  const jaar = vanaf.getUTCFullYear()
  const maand = vanaf.getUTCMonth()
  const dag = vanaf.getUTCDate()
  const laatsteDagDoelmaand = new Date(Date.UTC(jaar, maand + 2, 0)).getUTCDate()
  const doel = new Date(Date.UTC(jaar, maand + 1, Math.min(dag, laatsteDagDoelmaand)))
  return doel.toISOString().slice(0, 10)
}

// ─── Credits: eenmalige Studio-aankoop ───
async function handleCredits(payment: MolliePayment, res: VercelResponse) {
  if (payment.status !== 'paid') {
    console.log(`[billing-webhook] credits payment ${payment.id} status=${payment.status}, geen actie`)
    return res.status(200).json({ received: true })
  }

  const userId = payment.metadata?.user_id
  const pakketId = payment.metadata?.pakket_id
  const credits = parseInt(payment.metadata?.credits || '0', 10)

  if (!userId || !credits) {
    console.warn(`[billing-webhook] credits payment ${payment.id} zonder user/credits metadata`)
    return res.status(200).json({ received: true })
  }

  const supabase = getSupabase()

  // Atomair + idempotent: de RPC claimt het payment-id (UNIQUE-index), telt de
  // credits bij en logt de transactie in één transactie. Bij een duplicate
  // webhook is het id al geclaimd → RPC geeft null terug, geen dubbele credits.
  const { data: nieuwSaldo, error: koopError } = await supabase.rpc('visualizer_credits_koop', {
    p_user: userId,
    p_credits: credits,
    p_session_id: payment.id,
    p_payment_intent: null,
    p_beschrijving: `Mollie betaling · ${pakketId} pakket (${credits} credits)`,
  })

  if (koopError) {
    console.error(`[billing-webhook] credits bijschrijven mislukt voor user ${userId}, payment ${payment.id}:`, koopError)
    Sentry.captureException(koopError, { extra: { paymentId: payment.id } })
    return res.status(500).json({ error: 'Credits bijschrijven mislukt' })
  }

  if (nieuwSaldo === null) {
    console.log(`[billing-webhook] payment ${payment.id} al verwerkt, skip`)
  } else {
    console.log(`[billing-webhook] credits bijgeschreven: user=${userId}, +${credits}, saldo=${nieuwSaldo}`)
  }
  return res.status(200).json({ received: true })
}

// ─── Abonnement: eerste betaling (mandaat + maand 1) ───
async function handleAbonnementStart(payment: MolliePayment, webhookUrl: string, res: VercelResponse) {
  const organisatieId = payment.metadata?.organisatie_id
  if (!organisatieId) {
    console.warn(`[billing-webhook] abonnement payment ${payment.id} zonder organisatie_id`)
    return res.status(200).json({ received: true })
  }

  if (payment.status !== 'paid') {
    console.log(`[billing-webhook] eerste betaling ${payment.id} status=${payment.status} voor org ${organisatieId}, geen actie`)
    return res.status(200).json({ received: true })
  }

  if (!payment.customerId) {
    console.error(`[billing-webhook] eerste betaling ${payment.id} zonder customerId`)
    Sentry.captureException(new Error('Mollie first payment zonder customerId'), { extra: { paymentId: payment.id } })
    return res.status(200).json({ received: true })
  }

  const supabase = getSupabase()
  const claim = `pending_${payment.id}`

  // Claim de subscription-slot vóór het aanmaken: Mollie levert webhooks
  // at-least-once en een dubbele subscription betekent dubbele incasso's.
  // Een achtergebleven pending-claim van een eerdere (gecrashte) poging mag
  // overgenomen worden; alleen een echt subscription-id blokkeert.
  const { data: geclaimd, error: claimError } = await supabase
    .from('organisaties')
    .update({ mollie_subscription_id: claim })
    .eq('id', organisatieId)
    .or('mollie_subscription_id.is.null,mollie_subscription_id.like.pending*')
    .select('id')

  if (claimError) {
    console.error(`[billing-webhook] claim mislukt voor org ${organisatieId}:`, claimError)
    Sentry.captureException(claimError, { extra: { paymentId: payment.id } })
    return res.status(500).json({ error: 'Database update mislukt' })
  }

  if (!geclaimd || geclaimd.length === 0) {
    // Org heeft al een echt subscription-id: dubbele betaling zonder activering.
    // Geld is geïnd; alert zodat er handmatig gerefund kan worden.
    console.warn(`[billing-webhook] org ${organisatieId} heeft al een subscription, dubbele eerste betaling ${payment.id}`)
    Sentry.captureMessage('Dubbele eerste abonnementsbetaling zonder activering', {
      level: 'warning',
      extra: { paymentId: payment.id, organisatieId },
    })
    return res.status(200).json({ received: true })
  }

  const mollieHeaders = {
    'Authorization': `Bearer ${MOLLIE_API_KEY}`,
    'Content-Type': 'application/json',
  }

  // Adopteer een al bestaande lopende subscription (eerdere run die na de
  // create crashte, of een parallelle duplicate delivery) in plaats van een
  // tweede aan te maken.
  let subscriptionId: string | null = null
  const bestaandeResponse = await fetch(
    `https://api.mollie.com/v2/customers/${payment.customerId}/subscriptions?limit=250`,
    { headers: mollieHeaders }
  )
  if (bestaandeResponse.ok) {
    const bestaande = await bestaandeResponse.json() as {
      _embedded?: { subscriptions?: Array<{ id: string; status: string; metadata?: { organisatie_id?: string } | null }> }
    }
    const lopend = bestaande._embedded?.subscriptions?.find(
      s => ['active', 'pending'].includes(s.status) && s.metadata?.organisatie_id === organisatieId
    )
    if (lopend) {
      console.log(`[billing-webhook] bestaande subscription ${lopend.id} geadopteerd voor org ${organisatieId}`)
      subscriptionId = lopend.id
    }
  } else {
    console.error(`[billing-webhook] subscriptions ophalen mislukt: ${bestaandeResponse.status}`)
    return res.status(502).json({ error: 'Subscriptions ophalen bij Mollie mislukt' })
  }

  if (!subscriptionId) {
    const startDatum = eenMaandLater(payment.paidAt ? new Date(payment.paidAt) : new Date())

    const subscriptionResponse = await fetch(
      `https://api.mollie.com/v2/customers/${payment.customerId}/subscriptions`,
      {
        method: 'POST',
        // Mollie dedupliceert hiermee parallelle duplicate deliveries van
        // dezelfde payment
        headers: { ...mollieHeaders, 'Idempotency-Key': `sub_${payment.id}` },
        body: JSON.stringify({
          amount: { currency: 'EUR', value: ABONNEMENT_BEDRAG },
          interval: '1 month',
          startDate: startDatum,
          description: 'doen. abonnement',
          webhookUrl,
          metadata: { type: 'abonnement_termijn', organisatie_id: organisatieId },
        }),
      }
    )

    if (!subscriptionResponse.ok) {
      const errorBody = await subscriptionResponse.text()
      console.error(`[billing-webhook] subscription aanmaken mislukt voor org ${organisatieId}:`, subscriptionResponse.status, errorBody)
      Sentry.captureException(new Error(`Mollie subscription aanmaken faalde: ${subscriptionResponse.status}`), {
        extra: { paymentId: payment.id, organisatieId },
      })
      // Claim vrijgeven zodat de Mollie-retry opnieuw kan proberen
      await supabase
        .from('organisaties')
        .update({ mollie_subscription_id: null })
        .eq('id', organisatieId)
        .eq('mollie_subscription_id', claim)
      return res.status(500).json({ error: 'Subscription aanmaken mislukt' })
    }

    const subscription = await subscriptionResponse.json() as { id: string }
    subscriptionId = subscription.id
  }

  const { error: updateError } = await supabase
    .from('organisaties')
    .update({
      abonnement_status: 'actief',
      is_betaald: true,
      mollie_customer_id: payment.customerId,
      mollie_subscription_id: subscriptionId,
      abonnement_actief_tot: null,
    })
    .eq('id', organisatieId)

  if (updateError) {
    // Subscription bestaat al bij Mollie; de retry adopteert hem en probeert
    // deze update opnieuw
    console.error(`[billing-webhook] activeren mislukt voor org ${organisatieId}:`, updateError)
    Sentry.captureException(updateError, { extra: { paymentId: payment.id, subscriptionId } })
    return res.status(500).json({ error: 'Abonnement activeren mislukt' })
  }

  console.log(`[billing-webhook] abonnement actief: org=${organisatieId}, subscription=${subscriptionId}`)
  return res.status(200).json({ received: true })
}

// ─── Abonnement: maandelijkse termijn-incasso ───
async function handleAbonnementTermijn(payment: MolliePayment, res: VercelResponse) {
  const subscriptionId = payment.subscriptionId
  if (!subscriptionId) {
    console.warn(`[billing-webhook] termijn payment ${payment.id} zonder subscriptionId`)
    return res.status(200).json({ received: true })
  }

  const supabase = getSupabase()

  if (payment.status === 'paid') {
    const { error } = await supabase
      .from('organisaties')
      .update({ abonnement_status: 'actief', is_betaald: true })
      .eq('mollie_subscription_id', subscriptionId)
    if (error) {
      Sentry.captureException(error, { extra: { paymentId: payment.id, subscriptionId } })
      return res.status(500).json({ error: 'Database update mislukt' })
    }
    console.log(`[billing-webhook] termijn betaald: subscription=${subscriptionId}`)
  } else if (['failed', 'expired', 'canceled', 'charged_back'].includes(payment.status)) {
    const { error } = await supabase
      .from('organisaties')
      .update({ abonnement_status: 'verlopen', is_betaald: false })
      .eq('mollie_subscription_id', subscriptionId)
    if (error) {
      Sentry.captureException(error, { extra: { paymentId: payment.id, subscriptionId } })
      return res.status(500).json({ error: 'Database update mislukt' })
    }
    console.warn(`[billing-webhook] termijn mislukt (${payment.status}): subscription=${subscriptionId}, status naar verlopen`)
  } else {
    console.log(`[billing-webhook] termijn payment ${payment.id} status=${payment.status}, geen actie`)
  }

  return res.status(200).json({ received: true })
}

// Mollie post `id=tr_...` als application/x-www-form-urlencoded. Vercel parst
// dat normaal naar een object, maar bij een afwijkende content-type komt de
// body als string binnen. Beide afhandelen, want dit pad mag niet stilvallen.
function leesPaymentId(body: unknown): string | null {
  if (typeof body === 'string') {
    const params = new URLSearchParams(body)
    return params.get('id')
  }
  if (body && typeof body === 'object') {
    const id = (body as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Mollie's payment-webhook stuurt geen signature: de body is alleen
    // `id=tr_...` en verder niets. De beveiliging zit erin dat we die id
    // hieronder bij Mollie opvragen met onze eigen API-key en de status
    // daarvan volgen. Een vervalste POST kan dus nooit iets op betaald zetten,
    // hooguit een echte betaling opnieuw laten verwerken (en dat is idempotent).

    const paymentId = leesPaymentId(req.body)
    if (!paymentId || !/^tr_[a-zA-Z0-9]+$/.test(paymentId)) {
      return res.status(400).json({ error: 'Ongeldig of ontbrekend Payment ID' })
    }

    if (!MOLLIE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[billing-webhook] Mollie of Supabase niet geconfigureerd')
      return res.status(500).json({ error: 'Webhook niet geconfigureerd' })
    }

    // De payload is alleen een id; de payment zelf is de bron van waarheid
    const paymentResponse = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MOLLIE_API_KEY}` },
    })

    if (paymentResponse.status === 404) {
      console.warn(`[billing-webhook] payment ${paymentId} niet gevonden bij Mollie`)
      return res.status(200).json({ received: true })
    }
    if (!paymentResponse.ok) {
      const errorBody = await paymentResponse.text()
      console.error(`[billing-webhook] payment ophalen mislukt: ${paymentResponse.status}`, errorBody)
      return res.status(502).json({ error: 'Payment ophalen bij Mollie mislukt' })
    }

    const payment = await paymentResponse.json() as MolliePayment

    const host = req.headers.host || 'app.doen.team'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const webhookUrl = `${protocol}://${host}/api/billing-webhook`

    switch (payment.metadata?.type) {
      case 'credits':
        return await handleCredits(payment, res)
      case 'abonnement':
        return await handleAbonnementStart(payment, webhookUrl, res)
      case 'abonnement_termijn':
        return await handleAbonnementTermijn(payment, res)
      default:
        console.log(`[billing-webhook] payment ${payment.id} zonder bekend metadata.type, skip`)
        return res.status(200).json({ received: true })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('[billing-webhook] fout:', message)
    Sentry.captureException(error)
    return res.status(500).json({ error: message })
  }
}
