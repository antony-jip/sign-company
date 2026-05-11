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

const MOLLIE_API_URL = 'https://api.mollie.com/v2/payments'

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
const DEFAULT_REDIRECT = 'https://app.doen.team'

function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const appHost = new URL(DEFAULT_REDIRECT).hostname
    return parsed.hostname === appHost || parsed.hostname === 'localhost'
  } catch {
    return false
  }
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function verifyUser(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { factuur_id, bedrag, omschrijving, redirect_url, betaal_token } = req.body as {
      factuur_id: string
      bedrag: number
      omschrijving: string
      redirect_url?: string
      betaal_token?: string
    }

    if (!factuur_id || !bedrag) {
      return res.status(400).json({ error: 'factuur_id en bedrag zijn verplicht' })
    }

    // Twee auth-paden: JWT (interne gebruiker) of betaal_token (publieke klant)
    const jwt_user_id = await verifyUser(req)
    let user_id: string
    let organisatie_id: string | null = null
    let factuurStatus: string | null = null
    let existingPaymentId: string | null = null

    if (jwt_user_id) {
      // Interne flow: verifieer dat factuur toebehoort aan ingelogde gebruiker
      const { data: eigenFactuur } = await supabaseAdmin
        .from('facturen')
        .select('id, user_id, organisatie_id, status, mollie_payment_id')
        .eq('id', factuur_id)
        .eq('user_id', jwt_user_id)
        .maybeSingle()
      if (!eigenFactuur) {
        return res.status(403).json({ error: 'Factuur niet gevonden of geen toegang' })
      }
      user_id = jwt_user_id
      organisatie_id = (eigenFactuur.organisatie_id as string | null) ?? null
      factuurStatus = eigenFactuur.status ?? null
      existingPaymentId = eigenFactuur.mollie_payment_id ?? null
    } else if (betaal_token) {
      // Publieke flow: verifieer factuur via betaal_token
      const { data: factuur } = await supabaseAdmin
        .from('facturen')
        .select('id, user_id, organisatie_id, betaal_token_verloopt_op, status, mollie_payment_id')
        .eq('id', factuur_id)
        .eq('betaal_token', betaal_token)
        .maybeSingle()
      if (!factuur || !factuur.user_id) {
        return res.status(403).json({ error: 'Ongeldige betaallink' })
      }
      if (factuur.betaal_token_verloopt_op && new Date(factuur.betaal_token_verloopt_op) < new Date()) {
        return res.status(410).json({ error: 'Deze betaallink is verlopen' })
      }
      user_id = factuur.user_id
      organisatie_id = (factuur.organisatie_id as string | null) ?? null
      factuurStatus = factuur.status ?? null
      existingPaymentId = factuur.mollie_payment_id ?? null
    } else {
      return res.status(401).json({ error: 'Niet geautoriseerd' })
    }

    // Status-guard: factuur al voldaan → blokkeer nieuwe payment
    if (factuurStatus === 'betaald') {
      return res.status(409).json({
        error: 'Deze factuur is al voldaan',
        factuur_status: 'betaald',
      })
    }

    // Haal mollie_api_key op uit app_settings — org-first met user_id-fallback
    // voor legacy rijen zonder organisatie_id.
    let mollieApiKey = ''

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      let settings: { mollie_api_key: string | null; mollie_enabled: boolean | null } | null = null

      if (organisatie_id) {
        const { data } = await supabase
          .from('app_settings')
          .select('mollie_api_key, mollie_enabled')
          .eq('organisatie_id', organisatie_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        settings = data
      }
      if (!settings) {
        const { data } = await supabase
          .from('app_settings')
          .select('mollie_api_key, mollie_enabled')
          .eq('user_id', user_id)
          .maybeSingle()
        settings = data
      }

      if (settings?.mollie_enabled && settings?.mollie_api_key) {
        mollieApiKey = decryptSecret(settings.mollie_api_key)
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

    const redirectAfterPayment = (redirect_url && isAllowedRedirectUrl(redirect_url))
      ? redirect_url
      : `${DEFAULT_REDIRECT}/betaald?factuur_id=${factuur_id}`

    // Hergebruik bestaande open Mollie payment indien beschikbaar — voorkomt dat
    // een tweede klik (race tussen klant-actie en webhook-landing) een tweede
    // payment aanmaakt waar de klant per ongeluk dubbel zou kunnen betalen.
    if (existingPaymentId) {
      try {
        const existingResp = await fetch(`${MOLLIE_API_URL}/${existingPaymentId}`, {
          headers: { 'Authorization': `Bearer ${mollieApiKey}` },
        })
        if (existingResp.ok) {
          const existing = await existingResp.json()
          const expiresAt = existing.expiresAt ? new Date(existing.expiresAt) : null
          const stillValid = expiresAt ? expiresAt.getTime() > Date.now() : false
          if (existing.status === 'open' && stillValid) {
            return res.status(200).json({
              payment_url: existing._links?.checkout?.href || '',
              payment_id: existing.id,
              reused: true,
            })
          }
          // expired/canceled/failed → door naar nieuwe payment-create
        } else {
          const errorBody = await existingResp.text()
          console.error('[mollie-create-payment] reuse GET faalde:', existingResp.status, errorBody)
          Sentry.captureException(new Error(`Mollie GET ${existingPaymentId} returned ${existingResp.status}`), {
            extra: { factuur_id, existingPaymentId, status: existingResp.status },
          })
          // graceful degradation — door naar nieuwe payment-create
        }
      } catch (err) {
        console.error('[mollie-create-payment] reuse fetch threw:', err)
        Sentry.captureException(err, { extra: { factuur_id, existingPaymentId } })
        // graceful degradation — door naar nieuwe payment-create
      }
    }

    // Webhook URL — Vercel detecteert automatisch de juiste host
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'app.doen.team'
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

    // Sla mollie_payment_id op in factuur.
    // betaal_link NIET overschrijven — dit veld bevat de doen.-eigen URL
    // /betalen/{token} en moet stabiel blijven over meerdere mails/herinneringen.
    // Mollie checkout URL is per-payment en heeft korte TTL; staat in response,
    // niet in DB.
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const { error: updateError } = await supabase
        .from('facturen')
        .update({
          mollie_payment_id: payment.id,
        })
        .eq('id', factuur_id)
        .eq('user_id', user_id)
      if (updateError) {
        // Mollie payment is aangemaakt, maar mollie_payment_id niet opgeslagen → webhook
        // kan niet matchen. Beter de user 500 geven dan een payment_url die tot een
        // "verloren" betaling leidt; Mollie rolt unsubmitted payments zelf op.
        console.error('[mollie-create-payment] DB update failed for payment.id=', payment.id, updateError)
        return res.status(500).json({ error: 'Kon betaling niet opslaan. Probeer opnieuw.' })
      }
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
