import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
async function isRateLimited(ip: string, endpoint: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('check_rate_limit', { p_key: `${endpoint}:${ip}`, p_max_count: maxCount, p_window_seconds: windowSeconds })
  return data === true
}

// ---- Inline email template (Vercel bundelt geen lokale imports in api/) ----
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildPortalEmailHtml(params: {
  heading: string; itemTitel?: string; beschrijving?: string; ctaLabel?: string
  ctaUrl?: string; bedrijfsnaam?: string; quote?: string; logoUrl?: string; primaireKleur?: string
}): string {
  const { heading, itemTitel, beschrijving, ctaLabel = 'Bekijk in Doen. →', ctaUrl, bedrijfsnaam, quote, logoUrl, primaireKleur } = params
  const sage = primaireKleur || '#5A8264'
  const sageLight = primaireKleur ? `${primaireKleur}18` : '#E4EBE6'
  const bgOuter = '#F4F3F0', bgCard = '#FFFFFF', textDark = '#1A1A1A', textMuted = '#5A5A55', textLight = '#8A8A85', borderLight = '#E8E8E3'
  const itemBlock = itemTitel ? `<tr><td style="padding: 0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${borderLight}; border-radius: 8px;"><tr><td style="padding: 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; color: ${textDark};">${escapeHtml(itemTitel)}</td></tr>${beschrijving ? `<tr><td style="padding: 0 20px 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.6;">${escapeHtml(beschrijving)}</td></tr>` : ''}</table></td></tr>` : ''
  const quoteBlock = quote ? `<tr><td style="padding: 0 0 20px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${sageLight}; border-radius: 8px; border-left: 4px solid ${sage};"><tr><td style="padding: 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textDark}; font-style: italic; line-height: 1.6;">&ldquo;${escapeHtml(quote)}&rdquo;</td></tr></table></td></tr>` : ''
  const groetBlock = bedrijfsnaam ? `<tr><td style="padding: 16px 0 0 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.8;">Met vriendelijke groet,<br/><strong style="color: ${textDark};">${escapeHtml(bedrijfsnaam)}</strong></td></tr>` : ''
  const ctaBlock = ctaUrl ? `<tr><td style="padding: 8px 0 0 0;" align="center"><a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background-color: ${sage}; color: #FFFFFF; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">${escapeHtml(ctaLabel)}</a></td></tr>` : ''
  const footerText = bedrijfsnaam ? `Verzonden via Doen. namens ${escapeHtml(bedrijfsnaam)}` : 'Verzonden via Doen.'
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(bedrijfsnaam || '')}" style="max-height: 48px; max-width: 200px; object-fit: contain;" />`
    : `<span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 22px; color: ${textDark}; letter-spacing: -0.5px;"><strong>Doen.</strong></span>`
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: ${bgOuter}; -webkit-font-smoothing: antialiased;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgOuter}; padding: 40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 0 0 24px 0; text-align: center;">${logoHtml}</td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: ${bgCard}; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 40px 40px 36px 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0 0 24px 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: ${textDark}; line-height: 1.3;">${escapeHtml(heading)}</td></tr>${itemBlock}${quoteBlock}${groetBlock}${ctaBlock}</table></td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 24px 0 0 0; text-align: center; font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: ${textLight}; line-height: 1.6;">${footerText}</td></tr></table></td></tr></table></body></html>`
}
// ---- Einde inline email template ----

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (await isRateLimited(clientIp, 'goedkeuring-reactie', 10, 3600)) {
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
  }

  try {
    const { token, status, goedgekeurd_door, revisie_opmerkingen } = req.body as {
      token: string
      status: 'goedgekeurd' | 'revisie'
      goedgekeurd_door?: string
      revisie_opmerkingen?: string
    }

    if (!token || !status) {
      return res.status(400).json({ error: 'Token en status zijn verplicht' })
    }

    if (!['goedgekeurd', 'revisie'].includes(status)) {
      return res.status(400).json({ error: 'Ongeldige status' })
    }

    if (status === 'goedgekeurd' && (!goedgekeurd_door || !goedgekeurd_door.trim())) {
      return res.status(400).json({ error: 'Naam is verplicht bij goedkeuring' })
    }

    if (status === 'revisie' && (!revisie_opmerkingen || !revisie_opmerkingen.trim())) {
      return res.status(400).json({ error: 'Opmerkingen zijn verplicht bij revisie' })
    }

    // Haal goedkeuring op
    const { data: gk, error: gkError } = await supabaseAdmin
      .from('tekening_goedkeuringen')
      .select('*')
      .eq('token', token)
      .single()

    if (gkError || !gk) {
      return res.status(404).json({ error: 'Goedkeuring niet gevonden' })
    }

    // Idempotency: skip als al goedgekeurd
    if (gk.status === 'goedgekeurd' && status === 'goedgekeurd') {
      return res.status(200).json({ success: true, already_approved: true })
    }

    // Update goedkeuring
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (status === 'goedgekeurd') {
      updates.goedgekeurd_door = goedgekeurd_door!.trim()
      updates.goedgekeurd_op = new Date().toISOString()
    } else {
      updates.revisie_opmerkingen = revisie_opmerkingen!.trim()
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('tekening_goedkeuringen')
      .update(updates)
      .eq('token', token)
      .select()
      .single()

    if (updateError) {
      console.error('goedkeuring update error:', updateError)
      return res.status(500).json({ error: 'Kon goedkeuring niet bijwerken' })
    }

    // --- Notificatie + Email (niet-blokkerend) ---
    try {
      const displayNaam = goedgekeurd_door?.trim() || 'Klant'

      // Haal project en klant info
      const { data: project } = await supabaseAdmin
        .from('projecten')
        .select('naam, klant_id')
        .eq('id', gk.project_id)
        .single()

      const { data: klant } = project?.klant_id
        ? await supabaseAdmin
            .from('klanten')
            .select('bedrijfsnaam, contactpersoon')
            .eq('id', project.klant_id)
            .single()
        : { data: null }

      const klantNaam = klant?.bedrijfsnaam || klant?.contactpersoon || displayNaam

      // Maak in-app notificatie
      const notifType = status === 'goedgekeurd' ? 'portaal_goedkeuring' : 'portaal_revisie'
      const actieLabel = status === 'goedgekeurd' ? 'goedgekeurd' : 'revisie gevraagd'

      await supabaseAdmin.from('notificaties').insert({
        user_id: gk.user_id,
        type: notifType,
        titel: `Tekening ${actieLabel} door ${klantNaam}`,
        bericht: status === 'revisie'
          ? `"${revisie_opmerkingen!.trim()}" — ${project?.naam || 'Project'}`
          : `${displayNaam} heeft de tekeningen goedgekeurd — ${project?.naam || 'Project'}`,
        link: `/projecten/${gk.project_id}`,
        project_id: gk.project_id,
        klant_id: project?.klant_id || null,
        actie_genomen: false,
        gelezen: false,
      })

      // Stuur email naar gebruiker
      const { data: emailSettings } = await supabaseAdmin
        .from('app_settings')
        .select('email_instellingen')
        .eq('user_id', gk.user_id)
        .maybeSingle()

      const emailConfig = emailSettings?.email_instellingen as {
        gmail_address?: string
        app_password?: string
        smtp_host?: string
        smtp_port?: number
      } | null

      if (emailConfig?.gmail_address && emailConfig?.app_password) {
        const onderwerp = status === 'goedgekeurd'
          ? `Tekening goedgekeurd door ${klantNaam}`
          : `Revisie gevraagd door ${klantNaam}`

        const appUrl = process.env.VITE_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://forgedesk.nl')

        // Haal profiel op voor branding
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('bedrijfsnaam, logo_url')
          .eq('id', gk.user_id)
          .maybeSingle()

        const { data: docStyle } = await supabaseAdmin
          .from('document_styles')
          .select('primaire_kleur')
          .eq('user_id', gk.user_id)
          .maybeSingle()

        const emailBody = [
          `${klantNaam} heeft de tekening ${actieLabel}:`,
          status === 'revisie' ? `\nOpmerkingen: "${revisie_opmerkingen!.trim()}"` : '',
          `\nProject: ${project?.naam || 'Project'}`,
          gk.revisie_nummer > 1 ? `Revisie nummer: ${gk.revisie_nummer}` : '',
          `\nBekijk in Doen.: ${appUrl}/projecten/${gk.project_id}`,
        ].filter(Boolean).join('\n')

        const emailHtml = buildPortalEmailHtml({
          heading: `Tekening ${actieLabel} door ${klantNaam}`,
          itemTitel: project?.naam || 'Project',
          beschrijving: gk.revisie_nummer > 1 ? `Revisie nummer: ${gk.revisie_nummer}` : undefined,
          quote: status === 'revisie' ? revisie_opmerkingen!.trim() : undefined,
          ctaLabel: 'Bekijk in Doen. →',
          ctaUrl: `${appUrl}/projecten/${gk.project_id}`,
          bedrijfsnaam: profile?.bedrijfsnaam || undefined,
          logoUrl: profile?.logo_url || undefined,
          primaireKleur: docStyle?.primaire_kleur || undefined,
        })

        fetch(`${appUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gmail_address: emailConfig.gmail_address,
            app_password: emailConfig.app_password,
            smtp_host: emailConfig.smtp_host,
            smtp_port: emailConfig.smtp_port,
            to: emailConfig.gmail_address,
            subject: onderwerp,
            body: emailBody,
            html: emailHtml,
          }),
        }).catch(err => console.warn('Email naar gebruiker mislukt:', err))
      }
    } catch (notifErr) {
      console.warn('Notificatie/email bij goedkeuring mislukt:', notifErr)
    }

    return res.status(200).json({ goedkeuring: updated })
  } catch (error) {
    console.error('goedkeuring-reactie error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het bijwerken van de goedkeuring' })
  }
}
