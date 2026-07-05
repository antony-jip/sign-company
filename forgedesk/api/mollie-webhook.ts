import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
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
const MOLLIE_WEBHOOK_SECRET = process.env.MOLLIE_WEBHOOK_SECRET || ''

const MOLLIE_API_BASE = 'https://api.mollie.com/v2/payments'

// -- Integration credential decryption (copied from api/save-integration-settings.ts) --
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''
function decryptSecret(text: string): string {
  if (!text || !text.includes(':') || text.length < 34) return text
  if (!INT_KEY) { console.warn('[encryption] INTEGRATION_ENCRYPTION_KEY not set'); return text }
  try {
    const key = crypto.scryptSync(INT_KEY, 'integration', 32)
    const [ivHex, enc] = text.split(':')
    if (!ivHex || ivHex.length !== 32 || !enc) return text
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
    return decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8')
  } catch { console.warn('[encryption] decrypt failed, treating as plaintext'); return text }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Verifieer webhook signature — verplicht (fail-closed)
    if (!MOLLIE_WEBHOOK_SECRET) {
      console.error('MOLLIE_WEBHOOK_SECRET is niet geconfigureerd — webhook geweigerd')
      return res.status(500).json({ error: 'Webhook verificatie niet geconfigureerd' })
    }
    const signature = req.headers['x-mollie-signature'] as string | undefined
    const expectedSignature = crypto
      .createHmac('sha256', MOLLIE_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex')
    if (!signature || signature !== expectedSignature) {
      console.warn('Mollie webhook: ongeldige signature')
      return res.status(401).json({ error: 'Ongeldige webhook signature' })
    }

    // Valideer altijd dat het een geldig Mollie payment ID formaat is
    const paymentIdPattern = /^tr_[a-zA-Z0-9]+$/

    const { id: paymentId } = req.body as { id?: string }

    if (!paymentId || !paymentIdPattern.test(paymentId)) {
      return res.status(400).json({ error: 'Ongeldig of ontbrekend Payment ID' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Supabase not configured for mollie webhook')
      return res.status(500).json({ error: 'Database niet geconfigureerd' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Zoek de factuur met dit mollie_payment_id om de user_id te achterhalen
    const { data: factuur, error: factuurLookupError } = await supabase
      .from('facturen')
      .select('id, user_id, organisatie_id, totaal, betaald_bedrag, status')
      .eq('mollie_payment_id', paymentId)
      .single()

    // PGRST116 = no rows; alle andere error-codes zijn echte DB-failures
    if (factuurLookupError && factuurLookupError.code !== 'PGRST116') {
      console.error(`Mollie webhook: factuur lookup faalde voor payment ${paymentId}`, factuurLookupError)
      Sentry.captureException(factuurLookupError, { extra: { paymentId } })
      return res.status(500).json({ error: 'Database lookup failed' })
    }

    if (!factuur) {
      console.warn(`Mollie webhook: geen factuur gevonden voor payment ${paymentId}`)
      // Truly not-found — 200 zodat Mollie niet blijft retrien
      return res.status(200).json({ received: true })
    }

    // Haal mollie_api_key op uit app_settings — org-first met user_id-fallback
    // voor legacy rijen zonder organisatie_id.
    let mollieApiKey = ''
    const factuurOrgId = (factuur.organisatie_id as string | null) ?? null
    let settings: { mollie_api_key: string | null } | null = null
    if (factuurOrgId) {
      const { data, error: settingsLookupError } = await supabase
        .from('app_settings')
        .select('mollie_api_key')
        .eq('organisatie_id', factuurOrgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (settingsLookupError && settingsLookupError.code !== 'PGRST116') {
        console.warn(`Mollie webhook: org settings lookup faalde voor org ${factuurOrgId}`, settingsLookupError)
        Sentry.captureException(settingsLookupError, { extra: { paymentId, organisatieId: factuurOrgId } })
      }
      settings = data
    }
    if (!settings && factuur.user_id) {
      const { data, error: settingsLookupError } = await supabase
        .from('app_settings')
        .select('mollie_api_key')
        .eq('user_id', factuur.user_id)
        .maybeSingle()
      if (settingsLookupError && settingsLookupError.code !== 'PGRST116') {
        console.warn(`Mollie webhook: user settings lookup faalde voor user ${factuur.user_id}`, settingsLookupError)
        Sentry.captureException(settingsLookupError, { extra: { paymentId, userId: factuur.user_id } })
      }
      settings = data
    }
    if (settings?.mollie_api_key) {
      mollieApiKey = decryptSecret(settings.mollie_api_key)
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

    // Non-actionable statussen — geen DB-werk, 200 zodat Mollie niet blijft retrien
    if (
      payment.status === 'expired' ||
      payment.status === 'canceled' ||
      payment.status === 'failed' ||
      payment.status === 'open'
    ) {
      console.log(`Mollie webhook: payment ${paymentId} status=${payment.status}, no-op`)
      return res.status(200).json({ received: true, status: payment.status })
    }

    if (payment.status === 'paid') {
      // Idempotency: skip als factuur al betaald is
      if (factuur.status === 'betaald') {
        console.log(`Factuur ${factuur.id} is al betaald — webhook skip`)
        return res.status(200).json({ received: true, already_paid: true })
      }

      // Bedrag-verificatie: vertrouw het betaalde bedrag van Mollie, niet de
      // aanname dat elke 'paid'-webhook de volledige factuur dekt. Voorkomt dat
      // een onderbetaling (bv. €0,01) de factuur als volledig voldaan markeert.
      const betaaldNu = Number(payment.amount?.value) || 0
      const totaal = Number(factuur.totaal) || 0
      const reedsBetaald = Number(factuur.betaald_bedrag) || 0
      const nieuwBetaald = Math.round((reedsBetaald + betaaldNu) * 100) / 100
      const volledigVoldaan = nieuwBetaald + 0.01 >= totaal

      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('facturen')
        .update({
          status: volledigVoldaan ? 'betaald' : factuur.status,
          betaaldatum: volledigVoldaan ? now.split('T')[0] : null,
          betaald_bedrag: nieuwBetaald,
          updated_at: now,
        })
        .eq('id', factuur.id)

      if (updateError) {
        console.error(`Mollie webhook: UPDATE faalde voor factuur ${factuur.id}, payment ${paymentId}`, updateError)
        Sentry.captureException(updateError, { extra: { paymentId, factuurId: factuur.id } })
        return res.status(500).json({ error: 'Database update failed' })
      }

      if (volledigVoldaan) {
        console.log(`Factuur ${factuur.id} gemarkeerd als betaald via Mollie`)
      } else {
        console.warn(`Mollie webhook: deelbetaling €${betaaldNu} op factuur ${factuur.id} (totaal €${totaal}), niet als voldaan gemarkeerd`)
        Sentry.captureMessage(`Mollie deelbetaling: factuur ${factuur.id} betaald €${nieuwBetaald} van €${totaal}`, 'warning')
      }
    }

    return res.status(200).json({ received: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Mollie webhook error:', message)
    Sentry.captureException(error)
    // 500 zodat Mollie retried — bij transient DB-failures willen we niet
    // permanent de webhook verliezen.
    return res.status(500).json({ error: message })
  }
}
