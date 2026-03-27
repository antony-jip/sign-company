import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createTransport } from 'nodemailer'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
async function isRateLimited(ip: string, endpoint: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('check_rate_limit', { p_key: `${endpoint}:${ip}`, p_max_count: maxCount, p_window_seconds: windowSeconds })
  return data === true
}

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || ''
const APP_URL = process.env.VITE_APP_URL || 'https://forgedesk-ten.vercel.app'

function decrypt(encrypted: string): string {
  if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const [ivHex, encHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// ---- Inline email template (Vercel bundelt geen lokale imports in api/) ----
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildPortalEmailHtml(params: {
  heading: string; itemTitel?: string; beschrijving?: string; ctaLabel?: string
  ctaUrl?: string; bedrijfsnaam?: string; quote?: string; logoUrl?: string; primaireKleur?: string
  extraHtml?: string
}): string {
  const { heading, itemTitel, beschrijving, ctaLabel = 'Bekijk in Doen. →', ctaUrl, bedrijfsnaam, quote, logoUrl, primaireKleur, extraHtml } = params
  const sage = primaireKleur || '#5A8264'
  const sageLight = primaireKleur ? `${primaireKleur}18` : '#E4EBE6'
  const bgOuter = '#F4F3F0', bgCard = '#FFFFFF', textDark = '#1A1A1A', textMuted = '#5A5A55', textLight = '#8A8A85', borderLight = '#E8E8E3'
  const itemBlock = itemTitel ? `<tr><td style="padding: 0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${borderLight}; border-radius: 8px;"><tr><td style="padding: 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; color: ${textDark};">${escapeHtml(itemTitel)}</td></tr>${beschrijving ? `<tr><td style="padding: 0 20px 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.6;">${escapeHtml(beschrijving)}</td></tr>` : ''}</table></td></tr>` : ''
  const quoteBlock = quote ? `<tr><td style="padding: 0 0 20px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${sageLight}; border-radius: 8px; border-left: 4px solid ${sage};"><tr><td style="padding: 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textDark}; font-style: italic; line-height: 1.6;">&ldquo;${escapeHtml(quote)}&rdquo;</td></tr></table></td></tr>` : ''
  const extra = extraHtml ? `<tr><td style="padding: 0 0 16px 0;">${extraHtml}</td></tr>` : ''
  const groetBlock = bedrijfsnaam ? `<tr><td style="padding: 16px 0 0 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.8;">Met vriendelijke groet,<br/><strong style="color: ${textDark};">${escapeHtml(bedrijfsnaam)}</strong></td></tr>` : ''
  const ctaBlock = ctaUrl ? `<tr><td style="padding: 8px 0 0 0;" align="center"><a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background-color: ${sage}; color: #FFFFFF; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">${escapeHtml(ctaLabel)}</a></td></tr>` : ''
  const footerText = bedrijfsnaam ? `Verzonden via Doen. namens ${escapeHtml(bedrijfsnaam)}` : 'Verzonden via Doen.'
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(bedrijfsnaam || '')}" style="max-height: 48px; max-width: 200px; object-fit: contain;" />`
    : `<span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 22px; color: ${textDark}; letter-spacing: -0.5px;"><strong>Doen.</strong></span>`
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: ${bgOuter}; -webkit-font-smoothing: antialiased;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgOuter}; padding: 40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 0 0 24px 0; text-align: center;">${logoHtml}</td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: ${bgCard}; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 40px 40px 36px 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0 0 24px 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: ${textDark}; line-height: 1.3;">${escapeHtml(heading)}</td></tr>${itemBlock}${extra}${quoteBlock}${groetBlock}${ctaBlock}</table></td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 24px 0 0 0; text-align: center; font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: ${textLight}; line-height: 1.6;">${footerText}</td></tr></table></td></tr></table></body></html>`
}
// ---- Einde inline email template ----

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (await isRateLimited(clientIp, 'offerte-accepteren', 10, 3600)) {
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
  }

  try {
    const { token, naam, gekozen_items, gekozen_varianten } = req.body as {
      token: string
      naam: string
      gekozen_items?: string[]
      gekozen_varianten?: Record<string, string>
    }

    if (!token) return res.status(400).json({ error: 'Token is verplicht' })
    if (!naam || naam.trim().length < 2) {
      return res.status(400).json({ error: 'Naam is verplicht (minimaal 2 tekens)' })
    }

    const { data: offerte, error } = await supabaseAdmin
      .from('offertes')
      .select('*')
      .eq('publiek_token', token)
      .single()

    if (error || !offerte) {
      return res.status(404).json({ error: 'Offerte niet gevonden' })
    }

    // Validaties
    if (offerte.status === 'goedgekeurd') {
      return res.status(400).json({ error: 'Deze offerte is al geaccepteerd' })
    }
    if (offerte.status === 'afgewezen' || offerte.status === 'gefactureerd') {
      return res.status(400).json({ error: 'Deze offerte kan niet meer worden geaccepteerd' })
    }
    if (offerte.geldig_tot && offerte.geldig_tot < new Date().toISOString().split('T')[0]) {
      return res.status(400).json({ error: 'Deze offerte is verlopen' })
    }

    const nu = new Date().toISOString()

    // Update offerte status + opslaan van klant-keuzes
    const updateData: Record<string, unknown> = {
      status: 'goedgekeurd',
      geaccepteerd_door: naam.trim(),
      geaccepteerd_op: nu,
      akkoord_op: nu,
      updated_at: nu,
    }
    if (gekozen_items) updateData.gekozen_items = gekozen_items
    if (gekozen_varianten) updateData.gekozen_varianten = gekozen_varianten

    await supabaseAdmin.from('offertes').update(updateData).eq('id', offerte.id)

    // Update gekoppeld portaal item + maak reactie aan
    const { data: portaalItems } = await supabaseAdmin
      .from('portaal_items')
      .select('id, portaal_id')
      .eq('offerte_id', offerte.id)
    if (portaalItems && portaalItems.length > 0) {
      for (const pi of portaalItems) {
        await supabaseAdmin
          .from('portaal_items')
          .update({ status: 'goedgekeurd', updated_at: nu })
          .eq('id', pi.id)
        await supabaseAdmin
          .from('portaal_reacties')
          .insert({
            portaal_item_id: pi.id,
            type: 'goedkeuring',
            klant_naam: naam.trim(),
            bericht: null,
          })
      }
    }

    // Maak notificaties aan — offerte + portaal
    const projectId = portaalItems?.[0]
      ? (await supabaseAdmin.from('portaal_items').select('project_id').eq('id', portaalItems[0].id).single()).data?.project_id
      : null

    await supabaseAdmin.from('notificaties').insert([
      {
        id: crypto.randomUUID(),
        user_id: offerte.user_id,
        type: 'offerte_geaccepteerd',
        titel: 'Offerte geaccepteerd',
        bericht: `${naam.trim()} heeft offerte ${offerte.nummer} geaccepteerd`,
        link: `/offertes/${offerte.id}/detail`,
        gelezen: false,
        created_at: nu,
      },
      ...(projectId ? [{
        id: crypto.randomUUID(),
        user_id: offerte.user_id,
        type: 'portaal_goedkeuring' as const,
        titel: `${naam.trim()} heeft goedgekeurd`,
        bericht: `${offerte.titel || offerte.nummer}`,
        link: `/projecten/${projectId}`,
        project_id: projectId,
        actie_genomen: false,
        gelezen: false,
        created_at: nu,
      }] : []),
    ])

    // Stuur response direct terug — email async (fire-and-forget)
    res.status(200).json({
      success: true,
      bericht: 'Offerte succesvol geaccepteerd',
    })

    // Email na response via Resend — blokkeert de klant niet
    try {
      const { data: emailSettings } = await supabaseAdmin.from('user_email_settings')
        .select('gmail_address')
        .eq('user_id', offerte.user_id).single()

      if (emailSettings?.gmail_address) {
        const { sendDoenNotification } = await import('./resend-notify')
        await sendDoenNotification({
          to: emailSettings.gmail_address,
          subject: `Offerte ${offerte.nummer} geaccepteerd — ${offerte.klant_naam || 'Klant'}`,
          heading: `Offerte ${offerte.nummer} geaccepteerd`,
          itemTitel: offerte.titel || offerte.nummer,
          projectNaam: `Geaccepteerd door ${naam.trim()} — ${formatCurrency(offerte.totaal)}`,
          ctaUrl: `${APP_URL}/offertes/${offerte.id}/detail`,
          ctaLabel: 'Bekijk offerte in doen. →',
        })
      }
    } catch (emailErr) {
      console.error('Email notificatie mislukt (niet blokkerend):', emailErr)
    }
    return
  } catch (error: unknown) {
    console.error('offerte-accepteren error:', error)
    const msg = error instanceof Error ? error.message : 'Er ging iets mis'
    return res.status(500).json({ error: msg })
  }
}
