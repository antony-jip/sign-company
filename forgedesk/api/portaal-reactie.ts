import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { tasks } from '@trigger.dev/sdk'
import type { logPortaalActiviteit } from '../src/trigger/portaal-activiteit-log'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
async function isRateLimited(ip: string, endpoint: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('check_rate_limit', { p_key: `${endpoint}:${ip}`, p_max_count: maxCount, p_window_seconds: windowSeconds })
  return data === true
}
import { createTransport } from 'nodemailer'
import * as Sentry from '@sentry/node'

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
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) for (const k of Object.keys(event.request.headers)) if (/authorization|cookie/i.test(k)) (event.request.headers as Record<string, string>)[k] = '[Filtered]'
      if (event.request?.data) event.request.data = scrub(event.request.data) as typeof event.request.data
      if (event.user) { delete event.user.ip_address; delete event.user.email }
      return event
    },
  })
}


// Spiegel van DEFAULT_INSTELLINGEN in api/portaal-get.ts voor de velden die
// hier gehandhaafd worden — berichten staan standaard UIT.
const INSTELLINGEN_DEFAULTS = {
  klant_kan_offerte_goedkeuren: true,
  klant_kan_tekening_goedkeuren: true,
  klant_kan_bestanden_uploaden: true,
  klant_kan_berichten_sturen: false,
  max_bestandsgrootte_mb: 10,
}

// Org-first via portaal.organisatie_id, met order+limit omdat een org
// meerdere app_settings-rijen kan hebben (zelfde patroon als portaal-get).
async function getPortaalInstellingen(orgId: string | null, userId: string): Promise<Record<string, unknown>> {
  let rij: { portaal_instellingen: unknown } | null = null
  if (orgId) {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('portaal_instellingen')
      .eq('organisatie_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    rij = data
  }
  if (!rij) {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('portaal_instellingen')
      .eq('user_id', userId)
      .maybeSingle()
    rij = data
  }
  return { ...INSTELLINGEN_DEFAULTS, ...((rij?.portaal_instellingen as Record<string, unknown>) || {}) }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // x-real-ip is door Vercel gezet (niet client-spoofbaar); anders de LAATSTE
  // x-forwarded-for-waarde, nooit de eerste, zodat de rate-limit-key niet te faken is
  const clientIp = (req.headers['x-real-ip'] as string)?.trim() || (req.headers['x-forwarded-for'] as string)?.split(',').pop()?.trim() || 'unknown'
  if (await isRateLimited(clientIp, 'portaal-reactie', 10, 3600)) {
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
  }

  try {
    const { token, portaal_item_id, type, bericht, klant_naam, bestanden, foto_url } = req.body as {
      token: string
      portaal_item_id: string
      type: 'goedkeuring' | 'revisie' | 'bericht'
      bericht?: string
      klant_naam?: string
      bestanden?: string[] // URLs van geüploade bestanden
      foto_url?: string
    }

    if (!token || !portaal_item_id || !type) {
      return res.status(400).json({ error: 'Token, portaal_item_id en type zijn verplicht' })
    }

    if (!['goedkeuring', 'revisie', 'bericht'].includes(type)) {
      return res.status(400).json({ error: 'Ongeldig reactie type' })
    }

    if (type === 'revisie' && (!bericht || !bericht.trim())) {
      return res.status(400).json({ error: 'Bij een revisie is een bericht verplicht' })
    }

    // Valideer token
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, actief, verloopt_op, user_id, project_id, organisatie_id')
      .eq('token', token)
      .single()

    if (!portaal) {
      return res.status(404).json({ error: 'Portaal niet gevonden' })
    }

    if (!portaal.actief) {
      return res.status(403).json({ error: 'Dit portaal is niet meer actief' })
    }

    if (new Date(portaal.verloopt_op) < new Date()) {
      return res.status(403).json({ error: 'Dit portaal is verlopen' })
    }

    // Valideer dat item bestaat en zichtbaar is
    const { data: item } = await supabaseAdmin
      .from('portaal_items')
      .select('id, type, status, portaal_id, zichtbaar_voor_klant, offerte_id')
      .eq('id', portaal_item_id)
      .eq('portaal_id', portaal.id)
      .single()

    if (!item || !item.zichtbaar_voor_klant) {
      return res.status(404).json({ error: 'Item niet gevonden' })
    }

    // Portaal-instellingen server-side afdwingen — de capaciteit-toggles
    // werden voorheen alleen deels client-side gerespecteerd.
    const instellingen = await getPortaalInstellingen(portaal.organisatie_id ?? null, portaal.user_id)
    if (type === 'bericht' && instellingen.klant_kan_berichten_sturen === false) {
      return res.status(403).json({ error: 'Berichten sturen is uitgeschakeld voor dit portaal.' })
    }
    if ((foto_url || (bestanden && bestanden.length > 0)) && instellingen.klant_kan_bestanden_uploaden === false) {
      return res.status(403).json({ error: 'Bestanden meesturen is uitgeschakeld voor dit portaal.' })
    }
    if (type === 'goedkeuring' && item.type === 'offerte' && instellingen.klant_kan_offerte_goedkeuren === false) {
      return res.status(403).json({ error: 'Offertes goedkeuren via het portaal is uitgeschakeld.' })
    }
    if ((type === 'goedkeuring' || type === 'revisie') && item.type === 'tekening' && instellingen.klant_kan_tekening_goedkeuren === false) {
      return res.status(403).json({ error: 'Tekeningen goedkeuren via het portaal is uitgeschakeld.' })
    }

    // Goedkeuring-guards: zelfde regels als /api/offerte-accepteren, zodat
    // de portaal-route geen verlopen of al-afgehandelde offertes goedkeurt.
    if (type === 'goedkeuring' && item.status === 'goedgekeurd') {
      return res.status(409).json({ error: 'Dit item is al goedgekeurd.' })
    }

    // Een offerte met een eigen offertepagina krijgt alleen dáár akkoord. Die
    // route legt de keuzes uit de opties vast, rekent het totaal opnieuw uit,
    // vraagt naam en handtekening en zet project en klant door. Een akkoord via
    // deze route sloeg dat allemaal over, en viel op de laatste geldige dag al
    // om als verlopen omdat de datum als UTC-middernacht werd gelezen.
    if (type === 'goedkeuring' && item.type === 'offerte' && item.offerte_id) {
      const { data: gekoppeldeOfferte } = await supabaseAdmin
        .from('offertes')
        .select('id')
        .eq('id', item.offerte_id)
        .maybeSingle()
      if (gekoppeldeOfferte) {
        return res.status(409).json({
          error: 'Open de offerte om akkoord te geven. Daar zie je de volledige offerte en onderteken je.',
          offerte_pagina: true,
        })
      }
    }

    // Een akkoord op een opdrachtbevestiging of losse offerte zonder naam is
    // geen akkoord waar je later iets mee kunt.
    if (type === 'goedkeuring' && (item.type === 'offerte' || item.type === 'opdrachtbevestiging')
      && (!klant_naam || klant_naam.trim().length < 2)) {
      return res.status(400).json({ error: 'Vul je naam in om akkoord te geven.' })
    }

    // Sla reactie op
    const { data: reactie, error: reactieError } = await supabaseAdmin
      .from('portaal_reacties')
      .insert({
        portaal_item_id,
        type,
        bericht: bericht?.trim() || null,
        klant_naam: klant_naam?.trim() || null,
        foto_url: foto_url || null,
      })
      .select()
      .single()

    if (reactieError || !reactie) {
      console.error('portaal-reactie insert error:', reactieError)
      return res.status(500).json({ error: 'Kon reactie niet opslaan' })
    }

    // Update item status
    const newStatus = type === 'goedkeuring' ? 'goedgekeurd' : type === 'revisie' ? 'revisie' : item.status
    if (newStatus !== item.status) {
      await supabaseAdmin
        .from('portaal_items')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', portaal_item_id)
    }

    // Koppel eventuele bestanden aan de reactie
    if (bestanden && bestanden.length > 0) {
      for (const url of bestanden) {
        await supabaseAdmin
          .from('portaal_bestanden')
          .update({ portaal_reactie_id: reactie.id })
          .eq('portaal_item_id', portaal_item_id)
          .eq('url', url)
          .eq('uploaded_by', 'klant')
      }
    }

    // --- Notificatie + Email naar gebruiker (niet-blokkerend) ---
    try {
      const displayNaam = klant_naam?.trim() || 'Klant'
      const notifType = type === 'goedkeuring' ? 'portaal_goedkeuring' : type === 'revisie' ? 'portaal_revisie' : 'portaal_bericht'
      const actieLabel = type === 'goedkeuring' ? 'goedgekeurd' : type === 'revisie' ? 'revisie gevraagd' : 'een bericht gestuurd'

      // Haal project info voor context
      const { data: project } = await supabaseAdmin
        .from('projecten')
        .select('naam, klant_id')
        .eq('id', portaal.project_id)
        .single()

      // Haal item titel
      const { data: fullItem } = await supabaseAdmin
        .from('portaal_items')
        .select('titel')
        .eq('id', portaal_item_id)
        .single()

      // In-app notificatie voor maker, offerte-eigenaar en alle org-admins:
      // in een team van 25 mag een klant-reactie niet onzichtbaar blijven
      // omdat de maker toevallig afwezig is.
      const ontvangers = new Set<string>([portaal.user_id])
      const { data: makerProfiel } = await supabaseAdmin
        .from('profiles')
        .select('organisatie_id')
        .eq('id', portaal.user_id)
        .maybeSingle()
      if (makerProfiel?.organisatie_id) {
        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('organisatie_id', makerProfiel.organisatie_id)
          .eq('rol', 'admin')
          .or('status.is.null,status.neq.gedeactiveerd')
        for (const a of admins || []) ontvangers.add(a.id)
      }
      await supabaseAdmin.from('notificaties').insert([...ontvangers].map((ontvangerId) => ({
        user_id: ontvangerId,
        type: notifType,
        titel: `${displayNaam} heeft ${actieLabel}`,
        bericht: bericht?.trim()
          ? `"${bericht.trim()}" — ${fullItem?.titel || 'Item'} (${project?.naam || 'Project'})`
          : `${fullItem?.titel || 'Item'} — ${project?.naam || 'Project'}`,
        link: `/projecten/${portaal.project_id}`,
        project_id: portaal.project_id,
        klant_id: project?.klant_id || null,
        actie_genomen: false,
        gelezen: false,
      })))

      // Haal user email op voor notificatie
      const { data: emailSettings } = await supabaseAdmin
        .from('user_email_settings')
        .select('gmail_address')
        .eq('user_id', portaal.user_id)
        .maybeSingle()

      const userEmail = emailSettings?.gmail_address
      if (userEmail) {
        const onderwerp = type === 'goedkeuring'
          ? `Goedgekeurd: ${fullItem?.titel || 'Item'} — ${displayNaam}`
          : type === 'revisie'
          ? `Revisie gevraagd: ${fullItem?.titel || 'Item'} — ${displayNaam}`
          : `Nieuw bericht: ${fullItem?.titel || 'Item'} — ${displayNaam}`

        const appUrl = process.env.APP_URL || 'https://app.doen.team'

        // Stuur via Resend (doen. systeem-notificatie) — inline want Vercel bundelt geen lokale imports
        console.log('[portaal-reactie] sending resend email to:', userEmail, 'subject:', onderwerp)
        try {
          const { Resend } = await import('resend')
          const resendClient = new Resend(process.env.RESEND_API_KEY)
          const notifHeading = `${displayNaam} heeft ${actieLabel}`
          const notifItemTitel = fullItem?.titel || 'Item'
          const notifProjectNaam = project?.naam || 'Project'
          const notifQuote = bericht?.trim() || undefined
          const notifCtaUrl = `${appUrl}/projecten/${portaal.project_id}`

          const itemBlock = `<tr><td style="padding: 0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #EBEBEB; border-radius: 8px;"><tr><td style="padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: #1A1A1A;">${escapeHtml(notifItemTitel)}</td></tr><tr><td style="padding: 0 20px 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #6B6B66;">Project: ${escapeHtml(notifProjectNaam)}</td></tr></table></td></tr>`
          const quoteBlock = notifQuote ? `<tr><td style="padding: 0 0 20px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F7F5; border-radius: 8px; border-left: 4px solid #1A535C;"><tr><td style="padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #1A1A1A; font-style: italic; line-height: 1.6;">&ldquo;${escapeHtml(notifQuote)}&rdquo;</td></tr></table></td></tr>` : ''
          const ctaBlock = `<tr><td style="padding: 8px 0 0 0;" align="center"><a href="${escapeHtml(notifCtaUrl)}" target="_blank" style="display: inline-block; background-color: #1A535C; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">Bekijk in doen. &rarr;</a></td></tr>`

          const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: #F5F4F1;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;"><tr><td style="padding: 0 0 24px 0; text-align: center;"><span style="font-size: 24px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.5px;">doen</span><span style="font-size: 24px; font-weight: 800; color: #D24620;">.</span></td></tr><tr><td><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 36px 36px 32px 36px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A; line-height: 1.3;">${escapeHtml(notifHeading)}</td></tr>${itemBlock}${quoteBlock}${ctaBlock}</table></td></tr></table></td></tr><tr><td style="padding: 20px 0 0 0; text-align: center;"><div style="height: 3px; border-radius: 2px; background: linear-gradient(90deg, #1A535C, #D24620); margin-bottom: 16px;"></div><span style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #9B9B95;"><span style="font-weight: 700;">doen</span><span style="color: #D24620; font-weight: 700;">.</span> slim gedaan.</span></td></tr></table></td></tr></table></body></html>`

          const recipients = [userEmail]

          for (const recipient of recipients) {
            await resendClient.emails.send({
              from: 'doen. <noreply@doen.team>',
              to: recipient,
              subject: onderwerp,
              html,
            })
            console.log('[portaal-reactie] resend email sent to:', recipient)
          }
        } catch (resendErr) {
          console.warn('[portaal-reactie] resend notify failed:', resendErr)
        }
      }
    } catch (notifErr) {
      console.error('[portaal-reactie] notificatie/email error:', notifErr)
    }

    // --- Trigger.dev: log activiteit (fire-and-forget, fallback naar directe insert) ---
    const logActie = type === 'goedkeuring' ? 'item_goedgekeurd' : type === 'revisie' ? 'item_revisie' : 'bericht_verstuurd'
    const logPayload = { portaal_id: portaal.id, actie: logActie, metadata: { klant_naam: klant_naam, item_id: portaal_item_id } }
    try {
      await tasks.trigger<typeof logPortaalActiviteit>("log-portaal-activiteit", {
        portaalId: portaal.id,
        actie: logActie,
        metadata: logPayload.metadata,
      });
    } catch {
      // Fallback: directe insert (lokale dev zonder Trigger.dev)
      await supabaseAdmin.from('portaal_activiteiten').insert(logPayload).then(() => {}, () => {})
    }

    return res.status(201).json({ reactie })
  } catch (error) {
    console.error('portaal-reactie error:', error)
    // Een klant die goedkeurt en een foutmelding krijgt, probeert het meestal
    // niet opnieuw. Dan blijft de offerte 'wacht op reactie' en weet niemand
    // dat het aan ons lag.
    Sentry.captureException(error, { tags: { route: 'portaal-reactie' } })
    return res.status(500).json({ error: 'Er ging iets mis bij het opslaan van de reactie' })
  }
}
