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

const MOLLIE_API_BASE = 'https://api.mollie.com/v2/payments'

// ---- Inline betaalbevestiging-email (Vercel bundelt geen lokale imports in api/) ----
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildBetaalbevestigingHtml(params: {
  bedrijfsnaam?: string; logoUrl?: string; factuurNummer?: string; bedrag: string
}): string {
  const { bedrijfsnaam, logoUrl, factuurNummer, bedrag } = params
  const textDark = '#1A1A1A', textMuted = '#5A5A55', textLight = '#8A8A85', borderLight = '#E8E8E3'
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(bedrijfsnaam || '')}" style="max-height: 48px; max-width: 200px; object-fit: contain;" />`
    : bedrijfsnaam
    ? `<span style="font-family: Arial, sans-serif; font-size: 22px; color: ${textDark}; letter-spacing: -0.5px;"><strong>${escapeHtml(bedrijfsnaam)}</strong></span>`
    : ''
  const itemBlock = `<tr><td style="padding: 0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${borderLight}; border-radius: 8px;"><tr><td style="padding: 16px 20px; font-family: Arial, sans-serif; font-size: 15px; font-weight: 600; color: ${textDark};">${factuurNummer ? `Factuur ${escapeHtml(factuurNummer)}` : 'Uw factuur'}</td></tr><tr><td style="padding: 0 20px 16px 20px; font-family: Arial, sans-serif; font-size: 14px; color: ${textMuted};">Ontvangen bedrag: <strong style="color: ${textDark};">${escapeHtml(bedrag)}</strong></td></tr></table></td></tr>`
  const groetBlock = bedrijfsnaam ? `<tr><td style="padding: 16px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.8;">Met vriendelijke groet,<br/><strong style="color: ${textDark};">${escapeHtml(bedrijfsnaam)}</strong></td></tr>` : ''
  const footerText = bedrijfsnaam ? `Verzonden namens ${escapeHtml(bedrijfsnaam)}` : ''
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: #F4F3F0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F4F3F0; padding: 40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 0 0 24px 0; text-align: center;">${logoHtml}</td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 40px 40px 36px 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0 0 24px 0; font-family: Arial, sans-serif; font-size: 20px; font-weight: 700; color: ${textDark}; line-height: 1.3;">Betaling ontvangen</td></tr><tr><td style="padding: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.6;">Hartelijk dank voor uw betaling. Hieronder vindt u de bevestiging.</td></tr>${itemBlock}${groetBlock}</table></td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 24px 0 0 0; text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: ${textLight}; line-height: 1.6;">${footerText}</td></tr></table></td></tr></table></body></html>`
}
// ---- Einde inline email template ----

// -- Integration credential decryption (copied from api/save-integration-settings.ts) --
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''
function decryptSecret(text: string): string {
  if (text && text.startsWith('g1:')) {
    if (!INT_KEY) throw new Error('Server-encryptie is niet geconfigureerd (INTEGRATION_ENCRYPTION_KEY). Neem contact op met support.')
    try {
      const raw = Buffer.from(text.slice(3), 'base64')
      const key = crypto.scryptSync(INT_KEY, raw.subarray(0, 16), 32)
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(16, 28))
      decipher.setAuthTag(raw.subarray(28, 44))
      return Buffer.concat([decipher.update(raw.subarray(44)), decipher.final()]).toString('utf8')
    } catch {
      throw new Error('Integratie-token kan niet ontsleuteld worden (encryptie-key gewijzigd?). Verbind opnieuw via Instellingen > Integraties.')
    }
  }
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
    // hieronder bij Mollie opvragen met de API-key van de organisatie en de
    // status daarvan volgen. Een vervalste POST kan dus nooit een factuur op
    // betaald zetten, hooguit een echte betaling opnieuw laten verwerken.

    // Valideer altijd dat het een geldig Mollie payment ID formaat is
    const paymentIdPattern = /^tr_[a-zA-Z0-9]+$/

    const paymentId = leesPaymentId(req.body)

    if (!paymentId || !paymentIdPattern.test(paymentId)) {
      return res.status(400).json({ error: 'Ongeldig of ontbrekend Payment ID' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Supabase not configured for mollie webhook')
      return res.status(500).json({ error: 'Database niet geconfigureerd' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Zoek de factuur met dit mollie_payment_id om de user_id te achterhalen
    let { data: factuur, error: factuurLookupError } = await supabase
      .from('facturen')
      .select('id, user_id, organisatie_id, totaal, betaald_bedrag, status, nummer, klant_id')
      .eq('mollie_payment_id', paymentId)
      .maybeSingle()

    if (factuurLookupError && factuurLookupError.code !== 'PGRST116') {
      console.error(`Mollie webhook: factuur lookup faalde voor payment ${paymentId}`, factuurLookupError)
      Sentry.captureException(factuurLookupError, { extra: { paymentId } })
      return res.status(500).json({ error: 'Database lookup failed' })
    }

    // facturen.mollie_payment_id is één kolom die bij elke nieuwe checkout
    // wordt overschreven. Een webhook van een oudere payment (bv. een refund
    // op een eerdere deelbetaling) vindt de factuur alleen nog via de
    // betalingsregistratie.
    if (!factuur) {
      const { data: eerdereBetaling } = await supabase
        .from('factuur_betalingen')
        .select('factuur_id')
        .eq('bron', 'mollie')
        .eq('bron_referentie', paymentId)
        .maybeSingle()
      if (eerdereBetaling?.factuur_id) {
        const { data: viaBetaling } = await supabase
          .from('facturen')
          .select('id, user_id, organisatie_id, totaal, betaald_bedrag, status, nummer, klant_id')
          .eq('id', eerdereBetaling.factuur_id)
          .maybeSingle()
        factuur = viaBetaling ?? null
      }
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
      // Read-only verificatie. Mollie hanteert korte webhook-deadlines en
      // stuurt de webhook opnieuw als wij niet snel 200 teruggeven.
      signal: AbortSignal.timeout(15_000),
    })

    if (!mollieResponse.ok) {
      console.error('Mollie payment verification failed:', mollieResponse.status)
      return res.status(502).json({ error: 'Kon betaling niet verifiëren bij Mollie' })
    }

    const payment = (await mollieResponse.json()) as {
      status?: string
      amount?: { value?: string }
      amountRefunded?: { value?: string }
      amountChargedBack?: { value?: string }
      paidAt?: string
    }

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
      // Bedrag-verificatie: vertrouw het betaalde bedrag van Mollie, niet de
      // aanname dat elke 'paid'-webhook de volledige factuur dekt. Refunds en
      // chargebacks houden status 'paid' maar verlagen het effectieve bedrag.
      const bruto = Number(payment.amount?.value) || 0
      const terugbetaald = Number(payment.amountRefunded?.value) || 0
      const chargeback = Number(payment.amountChargedBack?.value) || 0
      const effectief = Math.round((bruto - terugbetaald - chargeback) * 100) / 100
      const totaal = Number(factuur.totaal) || 0

      // De RPC lockt de factuurrij, registreert deze payment onder zijn
      // tr_-id en past alleen de delta toe: een herlevering van dezelfde
      // webhook is daarmee een no-op, een refund een negatieve delta.
      const { data: verwerkingRows, error: rpcError } = await supabase.rpc('factuur_betaling_verwerk', {
        p_factuur_id: factuur.id,
        p_bron: 'mollie',
        p_bron_referentie: paymentId,
        p_bedrag: effectief,
        p_betaald_op: typeof payment.paidAt === 'string' ? payment.paidAt.split('T')[0] : null,
      })

      if (rpcError) {
        const functieOntbreekt = rpcError.code === 'PGRST202' || /factuur_betaling_verwerk/.test(rpcError.message || '')
        if (functieOntbreekt) {
          // Migratie 210 is nog niet gedraaid. Betalingen mogen niet stilvallen
          // op een deploy-volgorde, dus val terug op het oude additieve pad.
          // Dat pad is niet idempotent voor deelbetalingen en stuurt geen
          // betaalbevestiging; de Sentry-melding houdt dit venster zichtbaar.
          Sentry.captureMessage('mollie-webhook: migratie 210 ontbreekt, legacy betaalpad actief', 'warning')
          if (factuur.status === 'betaald') {
            return res.status(200).json({ received: true, already_paid: true })
          }
          const reedsBetaald = Number(factuur.betaald_bedrag) || 0
          const nieuwBetaaldLegacy = Math.round((reedsBetaald + bruto) * 100) / 100
          const voldaanLegacy = nieuwBetaaldLegacy + 0.01 >= totaal
          const nowIso = new Date().toISOString()
          const { error: legacyError } = await supabase
            .from('facturen')
            .update({
              status: voldaanLegacy ? 'betaald' : factuur.status,
              betaaldatum: voldaanLegacy ? nowIso.split('T')[0] : null,
              betaald_bedrag: nieuwBetaaldLegacy,
              updated_at: nowIso,
            })
            .eq('id', factuur.id)
          if (legacyError) {
            console.error(`Mollie webhook: legacy UPDATE faalde voor factuur ${factuur.id}, payment ${paymentId}`, legacyError)
            Sentry.captureException(legacyError, { extra: { paymentId, factuurId: factuur.id } })
            return res.status(500).json({ error: 'Database update failed' })
          }
          return res.status(200).json({ received: true, legacy: true })
        }
        console.error(`Mollie webhook: factuur_betaling_verwerk faalde voor factuur ${factuur.id}, payment ${paymentId}`, rpcError)
        Sentry.captureException(rpcError, { extra: { paymentId, factuurId: factuur.id } })
        return res.status(500).json({ error: 'Database update failed' })
      }

      const verwerking = (Array.isArray(verwerkingRows) ? verwerkingRows[0] : verwerkingRows) as {
        delta: number
        nieuw_betaald: number
        volledig_voldaan: boolean
        vorige_status: string
        nieuwe_status: string
      } | undefined

      if (!verwerking || Number(verwerking.delta) === 0) {
        console.log(`Mollie webhook: payment ${paymentId} al verwerkt (delta 0), skip`)
        return res.status(200).json({ received: true, already_processed: true })
      }

      const delta = Number(verwerking.delta)
      const nieuwBetaald = Number(verwerking.nieuw_betaald)
      const werdBetaald = verwerking.nieuwe_status === 'betaald' && verwerking.vorige_status !== 'betaald'
      const werdTeruggedraaid = delta < 0

      if (werdTeruggedraaid) {
        console.warn(`Mollie webhook: refund/chargeback €${Math.abs(delta)} op factuur ${factuur.id} (payment ${paymentId}), status nu ${verwerking.nieuwe_status}`)
        Sentry.captureMessage(`Mollie terugboeking: factuur ${factuur.id} €${Math.abs(delta)} teruggedraaid, betaald nu €${nieuwBetaald}`, 'warning')
        try {
          await supabase.from('notificaties').insert({
            user_id: factuur.user_id,
            type: 'betaling_teruggedraaid',
            titel: factuur.nummer ? `Betaling factuur ${factuur.nummer} teruggedraaid` : 'Betaling teruggedraaid',
            bericht: `${new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(Math.abs(delta))} terugbetaald of gestorneerd via Mollie`,
            link: '/facturen',
            gelezen: false,
          })
        } catch (notifErr) {
          console.warn('Mollie webhook: terugboek-notificatie aanmaken mislukt:', notifErr)
        }
        return res.status(200).json({ received: true, reversed: true })
      }

      const betaaldNu = delta

      if (werdBetaald) {
        console.log(`Factuur ${factuur.id} gemarkeerd als betaald via Mollie`)

        // In-app notificatie voor het bedrijf (niet-blokkerend)
        try {
          await supabase.from('notificaties').insert({
            user_id: factuur.user_id,
            type: 'betaling_ontvangen',
            titel: factuur.nummer ? `Factuur ${factuur.nummer} betaald` : 'Factuur betaald',
            bericht: `${new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(betaaldNu)} ontvangen via Mollie`,
            link: '/facturen',
            gelezen: false,
          })
        } catch (notifErr) {
          console.warn('Mollie webhook: notificatie aanmaken mislukt:', notifErr)
        }

        // Betaalbevestiging naar de klant, branded namens het bedrijf (niet-blokkerend)
        try {
          let klantEmail: string | null = null
          if (factuur.klant_id) {
            const { data: klant } = await supabase
              .from('klanten')
              .select('email')
              .eq('id', factuur.klant_id)
              .maybeSingle()
            klantEmail = klant?.email || null
          }

          if (klantEmail) {
            let bedrijfUserId = factuur.user_id
            if (factuurOrgId) {
              const { data: org } = await supabase
                .from('organisaties')
                .select('eigenaar_id')
                .eq('id', factuurOrgId)
                .maybeSingle()
              if (org?.eigenaar_id) bedrijfUserId = org.eigenaar_id
            }
            const { data: bedrijfsProfiel } = await supabase
              .from('profiles')
              .select('bedrijfsnaam, logo_url, bedrijfs_email')
              .eq('id', bedrijfUserId)
              .maybeSingle()
            const bedrijfsnaam = bedrijfsProfiel?.bedrijfsnaam || ''

            const html = buildBetaalbevestigingHtml({
              bedrijfsnaam: bedrijfsnaam || undefined,
              logoUrl: bedrijfsProfiel?.logo_url || undefined,
              factuurNummer: factuur.nummer || undefined,
              bedrag: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(betaaldNu),
            })

            const { Resend } = await import('resend')
            const resendClient = new Resend(process.env.RESEND_API_KEY)
            await resendClient.emails.send({
              from: `"${(bedrijfsnaam || 'doen.').replace(/"/g, '')}" <noreply@doen.team>`,
              to: klantEmail,
              replyTo: bedrijfsProfiel?.bedrijfs_email || undefined,
              subject: factuur.nummer
                ? `Betaalbevestiging factuur ${factuur.nummer}`
                : 'Betaalbevestiging',
              html,
            })
            console.log('Mollie webhook: betaalbevestiging verzonden')
          }
        } catch (mailErr) {
          console.warn('Mollie webhook: betaalbevestiging mislukt:', mailErr)
        }
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
