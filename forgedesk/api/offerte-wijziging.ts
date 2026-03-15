import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createTransport } from 'nodemailer'
import crypto from 'crypto'
import { supabaseAdmin, isRateLimited } from './_shared'

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY environment variable is required')
const APP_URL = process.env.VITE_APP_URL || 'https://app.forgedesk.io'

function decrypt(encrypted: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const [ivHex, encHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (await isRateLimited(clientIp, 'offerte-wijziging', 10, 3600)) {
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
  }

  try {
    const { token, naam, opmerking } = req.body as { token: string; naam?: string; opmerking: string }

    if (!token) return res.status(400).json({ error: 'Token is verplicht' })
    if (!opmerking || opmerking.trim().length < 10) {
      return res.status(400).json({ error: 'Opmerking is verplicht (minimaal 10 tekens)' })
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
      return res.status(400).json({ error: 'Deze offerte is al geaccepteerd en kan niet meer gewijzigd worden' })
    }
    if (offerte.status === 'afgewezen' || offerte.status === 'gefactureerd') {
      return res.status(400).json({ error: 'Deze offerte kan niet meer worden gewijzigd' })
    }
    if (offerte.geldig_tot && offerte.geldig_tot < new Date().toISOString().split('T')[0]) {
      return res.status(400).json({ error: 'Deze offerte is verlopen' })
    }

    const nu = new Date().toISOString()
    const afzender = naam?.trim() || 'Klant'

    // Update offerte
    await supabaseAdmin.from('offertes').update({
      status: 'wijziging_gevraagd',
      wijziging_opmerking: opmerking.trim(),
      wijziging_ingediend_op: nu,
      updated_at: nu,
    }).eq('id', offerte.id)

    // Maak notificatie aan
    await supabaseAdmin.from('notificaties').insert({
      id: crypto.randomUUID(),
      user_id: offerte.user_id,
      type: 'offerte_wijziging',
      titel: 'Wijziging aangevraagd',
      bericht: `${afzender} heeft een wijziging aangevraagd voor offerte ${offerte.nummer}`,
      link: `/offertes/${offerte.id}/detail`,
      gelezen: false,
      created_at: nu,
    })

    // Stuur response direct terug — email async (fire-and-forget)
    res.status(200).json({
      success: true,
      bericht: 'Wijziging aanvraag succesvol verstuurd',
    })

    // Email na response — blokkeert de klant niet
    try {
      const [{ data: emailSettings }, { data: profile }] = await Promise.all([
        supabaseAdmin.from('user_email_settings')
          .select('gmail_address, encrypted_app_password, smtp_host, smtp_port')
          .eq('user_id', offerte.user_id).single(),
        supabaseAdmin.from('profiles')
          .select('bedrijfsnaam, email, logo_url')
          .eq('id', offerte.user_id).single(),
      ])

      if (emailSettings?.gmail_address && emailSettings?.encrypted_app_password) {
        const password = decrypt(emailSettings.encrypted_app_password)
        const transporter = createTransport({
          host: emailSettings.smtp_host || 'smtp.gmail.com',
          port: emailSettings.smtp_port || 587,
          secure: emailSettings.smtp_port === 465,
          auth: { user: emailSettings.gmail_address, pass: password },
        })

        const deeplink = `${APP_URL}/offertes/${offerte.id}/detail`
        const logoHtml = profile?.logo_url
          ? `<img src="${profile.logo_url}" alt="${profile?.bedrijfsnaam || ''}" style="height:48px;margin-bottom:16px;" /><br/>`
          : ''

        await transporter.sendMail({
          from: emailSettings.gmail_address,
          to: emailSettings.gmail_address,
          subject: `Wijziging aangevraagd voor offerte ${offerte.nummer} — ${offerte.klant_naam || 'Klant'}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              ${logoHtml}
              <h2 style="color:#ea580c;margin:0 0 16px;">Wijziging aangevraagd</h2>
              <p>Beste ${profile?.bedrijfsnaam || 'team'},</p>
              <p><strong>${afzender}</strong> heeft een wijziging aangevraagd voor offerte <strong>${offerte.nummer}</strong>.</p>
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0;color:#9a3412;font-style:italic;">"${opmerking.trim()}"</p>
              </div>
              <a href="${deeplink}" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
                Bekijk offerte in FORGEdesk →
              </a>
            </div>
          `,
        })
      }
    } catch (emailErr) {
      console.error('Email notificatie mislukt (niet blokkerend):', emailErr)
    }
    return
  } catch (error: unknown) {
    console.error('offerte-wijziging error:', error)
    const msg = error instanceof Error ? error.message : 'Er ging iets mis'
    return res.status(500).json({ error: msg })
  }
}
