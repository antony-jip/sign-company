import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// ---- Inline email template (Vercel bundelt geen lokale imports in api/) ----
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildPortalEmailHtml(params: {
  heading: string; itemTitel?: string; beschrijving?: string; ctaLabel?: string
  ctaUrl?: string; bedrijfsnaam?: string; quote?: string; logoUrl?: string; primaireKleur?: string
}): string {
  const { heading, itemTitel, beschrijving, ctaLabel = 'Bekijk in FORGEdesk \u2192', ctaUrl, bedrijfsnaam, quote, logoUrl, primaireKleur } = params
  const sage = primaireKleur || '#5A8264'
  const sageLight = primaireKleur ? `${primaireKleur}18` : '#E4EBE6'
  const bgOuter = '#F4F3F0', bgCard = '#FFFFFF', textDark = '#1A1A1A', textMuted = '#5A5A55', textLight = '#8A8A85', borderLight = '#E8E8E3'
  const itemBlock = itemTitel ? `<tr><td style="padding: 0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${borderLight}; border-radius: 8px;"><tr><td style="padding: 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; color: ${textDark};">${escapeHtml(itemTitel)}</td></tr>${beschrijving ? `<tr><td style="padding: 0 20px 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.6;">${escapeHtml(beschrijving)}</td></tr>` : ''}</table></td></tr>` : ''
  const quoteBlock = quote ? `<tr><td style="padding: 0 0 20px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${primaireKleur ? sageLight : '#E4EBE6'}; border-radius: 8px; border-left: 4px solid ${sage};"><tr><td style="padding: 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textDark}; font-style: italic; line-height: 1.6;">&ldquo;${escapeHtml(quote)}&rdquo;</td></tr></table></td></tr>` : ''
  const ctaBlock = ctaUrl ? `<tr><td style="padding: 8px 0 0 0;" align="center"><a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background-color: ${sage}; color: #FFFFFF; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">${escapeHtml(ctaLabel)}</a></td></tr>` : ''
  const footerText = bedrijfsnaam ? `Verzonden via FORGEdesk namens ${escapeHtml(bedrijfsnaam)}` : 'Verzonden via FORGEdesk'
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(bedrijfsnaam || '')}" style="max-height: 48px; max-width: 200px; object-fit: contain;" />`
    : `<span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 22px; color: ${textDark}; letter-spacing: -0.5px;"><strong>FORGE</strong><span style="font-weight: 300;">desk</span></span>`
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: ${bgOuter}; -webkit-font-smoothing: antialiased;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgOuter}; padding: 40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 0 0 24px 0; text-align: center;">${logoHtml}</td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: ${bgCard}; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 40px 40px 36px 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0 0 24px 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: ${textDark}; line-height: 1.3;">${escapeHtml(heading)}</td></tr>${itemBlock}${quoteBlock}${ctaBlock}</table></td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 24px 0 0 0; text-align: center; font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: ${textLight}; line-height: 1.6;">${footerText}</td></tr></table></td></tr></table></body></html>`
}
// ---- Einde inline email template ----

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Rate limiting: 10 reacties per uur per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 3_600_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
  }

  try {
    const { token, portaal_item_id, type, bericht, klant_naam, bestanden } = req.body as {
      token: string
      portaal_item_id: string
      type: 'goedkeuring' | 'revisie' | 'bericht'
      bericht?: string
      klant_naam?: string
      bestanden?: string[] // URLs van geüploade bestanden
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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Valideer token
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, actief, verloopt_op, user_id, project_id')
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
      .select('id, type, status, portaal_id, zichtbaar_voor_klant')
      .eq('id', portaal_item_id)
      .eq('portaal_id', portaal.id)
      .single()

    if (!item || !item.zichtbaar_voor_klant) {
      return res.status(404).json({ error: 'Item niet gevonden' })
    }

    // Sla reactie op
    const { data: reactie, error: reactieError } = await supabaseAdmin
      .from('portaal_reacties')
      .insert({
        portaal_item_id,
        type,
        bericht: bericht?.trim() || null,
        klant_naam: klant_naam?.trim() || null,
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

      // Maak in-app notificatie aan
      await supabaseAdmin.from('notificaties').insert({
        user_id: portaal.user_id,
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
      })

      // Stuur email naar gebruiker
      const { data: emailSettings } = await supabaseAdmin
        .from('app_settings')
        .select('email_instellingen')
        .eq('user_id', portaal.user_id)
        .maybeSingle()

      const emailConfig = emailSettings?.email_instellingen as { gmail_address?: string; app_password?: string; smtp_host?: string; smtp_port?: number } | null

      // Haal branding info op voor email
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('logo_url, bedrijfsnaam')
        .eq('id', portaal.user_id)
        .maybeSingle()

      const { data: docStyleData } = await supabaseAdmin
        .from('document_styles')
        .select('primaire_kleur')
        .eq('user_id', portaal.user_id)
        .maybeSingle()

      if (emailConfig?.gmail_address && emailConfig?.app_password) {
        const onderwerp = type === 'goedkeuring'
          ? `Goedgekeurd: ${fullItem?.titel || 'Item'} — ${displayNaam}`
          : type === 'revisie'
          ? `Revisie gevraagd: ${fullItem?.titel || 'Item'} — ${displayNaam}`
          : `Nieuw bericht: ${fullItem?.titel || 'Item'} — ${displayNaam}`

        const appUrl = process.env.VITE_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.forgedesk.io')

        const emailBody = [
          `${displayNaam} heeft ${actieLabel}:`,
          bericht?.trim() ? `\n"${bericht.trim()}"` : '',
          `\nItem: ${fullItem?.titel || 'Item'}`,
          `Project: ${project?.naam || 'Project'}`,
          `\nBekijk in FORGEdesk: ${appUrl}/projecten/${portaal.project_id}`,
        ].filter(Boolean).join('\n')

        const emailHtml = buildPortalEmailHtml({
          heading: `${displayNaam} heeft ${actieLabel}`,
          itemTitel: fullItem?.titel || 'Item',
          beschrijving: `Project: ${project?.naam || 'Project'}`,
          quote: bericht?.trim() || undefined,
          ctaLabel: 'Bekijk in FORGEdesk \u2192',
          ctaUrl: `${appUrl}/projecten/${portaal.project_id}`,
          logoUrl: profileData?.logo_url || undefined,
          primaireKleur: docStyleData?.primaire_kleur || undefined,
        })

        // Fire-and-forget email
        fetch(`${appUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gmail_address: emailConfig.gmail_address,
            app_password: emailConfig.app_password,
            smtp_host: emailConfig.smtp_host,
            smtp_port: emailConfig.smtp_port,
            to: emailConfig.gmail_address, // Naar de gebruiker zelf
            subject: onderwerp,
            body: emailBody,
            html: emailHtml,
          }),
        }).catch(err => console.warn('Email naar gebruiker mislukt:', err))
      }
    } catch (notifErr) {
      console.warn('Notificatie/email bij reactie mislukt:', notifErr)
    }

    return res.status(201).json({ reactie })
  } catch (error) {
    console.error('portaal-reactie error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het opslaan van de reactie' })
  }
}
