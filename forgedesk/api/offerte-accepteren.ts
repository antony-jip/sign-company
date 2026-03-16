import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createTransport } from 'nodemailer'
import crypto from 'crypto'
import { supabaseAdmin, isRateLimited } from './_shared'

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY environment variable is required')
const APP_URL = process.env.VITE_APP_URL || 'https://forgedesk-ten.vercel.app'

function decrypt(encrypted: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const [ivHex, encHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

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
    const { token, naam } = req.body as { token: string; naam: string }

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

    // Update offerte status
    await supabaseAdmin.from('offertes').update({
      status: 'goedgekeurd',
      geaccepteerd_door: naam.trim(),
      geaccepteerd_op: nu,
      akkoord_op: nu,
      updated_at: nu,
    }).eq('id', offerte.id)

    // Maak notificatie aan
    await supabaseAdmin.from('notificaties').insert({
      id: crypto.randomUUID(),
      user_id: offerte.user_id,
      type: 'offerte_geaccepteerd',
      titel: 'Offerte geaccepteerd',
      bericht: `${naam.trim()} heeft offerte ${offerte.nummer} geaccepteerd`,
      link: `/offertes/${offerte.id}/detail`,
      gelezen: false,
      created_at: nu,
    })

    // Stuur response direct terug — email async (fire-and-forget)
    res.status(200).json({
      success: true,
      bericht: 'Offerte succesvol geaccepteerd',
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
          subject: `Offerte ${offerte.nummer} geaccepteerd — ${offerte.klant_naam || 'Klant'}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              ${logoHtml}
              <h2 style="color:#16a34a;margin:0 0 16px;">Offerte geaccepteerd</h2>
              <p>Beste ${profile?.bedrijfsnaam || 'team'},</p>
              <p><strong>${naam.trim()}</strong> heeft offerte <strong>${offerte.nummer}</strong> geaccepteerd op ${formatDate(new Date())}.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px 0;color:#666;">Offerte</td><td style="padding:8px 0;font-weight:600;">${offerte.titel || offerte.nummer}</td></tr>
                <tr><td style="padding:8px 0;color:#666;">Bedrag</td><td style="padding:8px 0;font-weight:600;">${formatCurrency(offerte.totaal)}</td></tr>
                <tr><td style="padding:8px 0;color:#666;">Geaccepteerd door</td><td style="padding:8px 0;font-weight:600;">${naam.trim()}</td></tr>
              </table>
              <a href="${deeplink}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
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
    console.error('offerte-accepteren error:', error)
    const msg = error instanceof Error ? error.message : 'Er ging iets mis'
    return res.status(500).json({ error: msg })
  }
}
