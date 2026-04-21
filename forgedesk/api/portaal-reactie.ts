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
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY

function decrypt(encrypted: string): string {
  if (!ENCRYPTION_KEY) throw new Error('No encryption key')
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const [ivHex, encHex] = encrypted.split(':')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
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
}): string {
  const { heading, itemTitel, beschrijving, ctaLabel = 'Bekijk in portaal \u2192', ctaUrl, bedrijfsnaam, quote, logoUrl, primaireKleur } = params
  const sage = primaireKleur || '#5A8264'
  const sageLight = primaireKleur ? `${primaireKleur}18` : '#E4EBE6'
  const bgOuter = '#F4F3F0', bgCard = '#FFFFFF', textDark = '#1A1A1A', textMuted = '#5A5A55', textLight = '#8A8A85', borderLight = '#E8E8E3'
  const itemBlock = itemTitel ? `<tr><td style="padding: 0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${borderLight}; border-radius: 8px;"><tr><td style="padding: 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; color: ${textDark};">${escapeHtml(itemTitel)}</td></tr>${beschrijving ? `<tr><td style="padding: 0 20px 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.6;">${escapeHtml(beschrijving)}</td></tr>` : ''}</table></td></tr>` : ''
  const quoteBlock = quote ? `<tr><td style="padding: 0 0 20px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${primaireKleur ? sageLight : '#E4EBE6'}; border-radius: 8px; border-left: 4px solid ${sage};"><tr><td style="padding: 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textDark}; font-style: italic; line-height: 1.6;">&ldquo;${escapeHtml(quote)}&rdquo;</td></tr></table></td></tr>` : ''
  const groetBlock = bedrijfsnaam ? `<tr><td style="padding: 16px 0 0 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.8;">Met vriendelijke groet,<br/><strong style="color: ${textDark};">${escapeHtml(bedrijfsnaam)}</strong></td></tr>` : ''
  const ctaBlock = ctaUrl ? `<tr><td style="padding: 8px 0 0 0;" align="center"><a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background-color: ${sage}; color: #FFFFFF; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">${escapeHtml(ctaLabel)}</a></td></tr>` : ''
  const footerText = bedrijfsnaam ? `Verzonden namens ${escapeHtml(bedrijfsnaam)}` : ''
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(bedrijfsnaam || '')}" style="max-height: 48px; max-width: 200px; object-fit: contain;" />`
    : bedrijfsnaam
    ? `<span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 22px; color: ${textDark}; letter-spacing: -0.5px;"><strong>${escapeHtml(bedrijfsnaam)}</strong></span>`
    : ''
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: ${bgOuter}; -webkit-font-smoothing: antialiased;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgOuter}; padding: 40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 0 0 24px 0; text-align: center;">${logoHtml}</td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: ${bgCard}; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 40px 40px 36px 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0 0 24px 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: ${textDark}; line-height: 1.3;">${escapeHtml(heading)}</td></tr>${itemBlock}${quoteBlock}${groetBlock}${ctaBlock}</table></td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 24px 0 0 0; text-align: center; font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: ${textLight}; line-height: 1.6;">${footerText}</td></tr></table></td></tr></table></body></html>`
}
// ---- Einde inline email template ----

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (await isRateLimited(clientIp, 'portaal-reactie', 10, 3600)) {
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
  }

  try {
    const { token, portaal_item_id, type, bericht, klant_naam, bestanden, gekozen_items, gekozen_varianten, foto_url } = req.body as {
      token: string
      portaal_item_id: string
      type: 'goedkeuring' | 'revisie' | 'bericht'
      bericht?: string
      klant_naam?: string
      bestanden?: string[] // URLs van geüploade bestanden
      gekozen_items?: string[]
      gekozen_varianten?: Record<string, string>
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

    // Bij offerte goedkeuring: offerte status + keuzes bijwerken
    let offerteUserId: string | null = null
    if (type === 'goedkeuring' && item.type === 'offerte') {
      const { data: fullPortaalItem } = await supabaseAdmin
        .from('portaal_items')
        .select('offerte_id')
        .eq('id', portaal_item_id)
        .single()

      if (fullPortaalItem?.offerte_id) {
        const offerteUpdate: Record<string, unknown> = {
          status: 'goedgekeurd',
          geaccepteerd_door: klant_naam?.trim() || null,
          geaccepteerd_op: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        if (gekozen_items) offerteUpdate.gekozen_items = gekozen_items
        if (gekozen_varianten) offerteUpdate.gekozen_varianten = gekozen_varianten
        await supabaseAdmin.from('offertes').update(offerteUpdate).eq('id', fullPortaalItem.offerte_id)

        // Haal offerte-eigenaar op voor notificatie (kan verschillen van portaal-aanmaker)
        const { data: offerte } = await supabaseAdmin
          .from('offertes')
          .select('user_id')
          .eq('id', fullPortaalItem.offerte_id)
          .single()
        if (offerte?.user_id && offerte.user_id !== portaal.user_id) {
          offerteUserId = offerte.user_id
        }
      }
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

          const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: #F5F4F1;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;"><tr><td style="padding: 0 0 24px 0; text-align: center;"><span style="font-size: 24px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.5px;">doen</span><span style="font-size: 24px; font-weight: 800; color: #F15025;">.</span></td></tr><tr><td><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 36px 36px 32px 36px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A; line-height: 1.3;">${escapeHtml(notifHeading)}</td></tr>${itemBlock}${quoteBlock}${ctaBlock}</table></td></tr></table></td></tr><tr><td style="padding: 20px 0 0 0; text-align: center;"><div style="height: 3px; border-radius: 2px; background: linear-gradient(90deg, #1A535C, #F15025); margin-bottom: 16px;"></div><span style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #9B9B95;"><span style="font-weight: 700;">doen</span><span style="color: #F15025; font-weight: 700;">.</span> slim gedaan.</span></td></tr></table></td></tr></table></body></html>`

          const recipients = [userEmail]

          // Fix 2: ook offerte-eigenaar notificeren als die verschilt van portaal-aanmaker
          if (offerteUserId) {
            const { data: ownerEmail } = await supabaseAdmin
              .from('user_email_settings')
              .select('gmail_address')
              .eq('user_id', offerteUserId)
              .maybeSingle()
            if (ownerEmail?.gmail_address && ownerEmail.gmail_address !== userEmail) {
              recipients.push(ownerEmail.gmail_address)
            }
            // In-app notificatie voor offerte-eigenaar
            await supabaseAdmin.from('notificaties').insert({
              user_id: offerteUserId,
              type: notifType,
              titel: `${displayNaam} heeft ${actieLabel}`,
              bericht: `${notifItemTitel} — ${notifProjectNaam}`,
              link: `/projecten/${portaal.project_id}`,
              project_id: portaal.project_id,
              actie_genomen: false,
              gelezen: false,
            })
          }

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
    return res.status(500).json({ error: 'Er ging iets mis bij het opslaan van de reactie' })
  }
}
