import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createTransport } from 'nodemailer'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}
interface EmailCredentials {
  gmail_address: string
  app_password: string
  smtp_host: string
  smtp_port: number
  imap_host: string
  imap_port: number
}

function decryptPassword(encrypted: string): string {
  if (encrypted.startsWith('b64:')) {
    return Buffer.from(encrypted.slice(4), 'base64').toString('utf8')
  }
  const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
  if (!ENCRYPTION_KEY) {
    console.error('[decryptPassword] EMAIL_ENCRYPTION_KEY niet geconfigureerd')
    throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd — sla je wachtwoord opnieuw op in Instellingen > Email > Verbinding')
  }
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const [ivHex, encryptedHex] = encrypted.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('[decryptPassword] AES decryptie mislukt:', err)
    throw new Error('Wachtwoord ontsleutelen mislukt — sla je wachtwoord opnieuw op')
  }
}

async function getEmailCredentials(userId: string): Promise<EmailCredentials> {
  const { data, error } = await supabaseAdmin
    .from('user_email_settings')
    .select('gmail_address, encrypted_app_password, smtp_host, smtp_port, imap_host, imap_port')
    .eq('user_id', userId)
    .single()

  if (error || !data?.gmail_address || !data?.encrypted_app_password) {
    throw new Error('Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.')
  }

  return {
    gmail_address: data.gmail_address,
    app_password: decryptPassword(data.encrypted_app_password),
    smtp_host: data.smtp_host || 'smtp.gmail.com',
    smtp_port: data.smtp_port || 587,
    imap_host: data.imap_host || 'imap.gmail.com',
    imap_port: data.imap_port || 993,
  }
}

export const config = { maxDuration: 30 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)
    let gmail_address: string, app_password: string, smtp_host: string, smtp_port: number
    try {
      const creds = await getEmailCredentials(user_id)
      gmail_address = creds.gmail_address
      app_password = creds.app_password
      smtp_host = creds.smtp_host
      smtp_port = creds.smtp_port
    } catch {
      gmail_address = req.body.gmail_address
      app_password = req.body.app_password
      smtp_host = req.body.smtp_host || 'smtp.gmail.com'
      smtp_port = req.body.smtp_port || 587
      if (!gmail_address || !app_password) {
        return res.status(400).json({ error: 'Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.' })
      }
    }

    const {
      to,
      cc,
      subject,
      body,
      html,
      attachments,
      opvolging_id,
    } = req.body as {
      to: string
      cc?: string
      subject: string
      body?: string
      html?: string
      attachments?: Array<{ filename: string; content: string; encoding: 'base64' }>
      opvolging_id?: string
    }

    if (!to || !subject) {
      return res.status(400).json({ error: 'Ontvanger en onderwerp zijn verplicht' })
    }

    // Haal bedrijfsnaam op voor afzendernaam
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('bedrijfsnaam')
      .eq('id', user_id)
      .maybeSingle()

    const fromAddress = profile?.bedrijfsnaam
      ? `"${profile.bedrijfsnaam.replace(/"/g, '')}" <${gmail_address}>`
      : gmail_address

    const transporter = createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_port === 465,
      auth: { user: gmail_address, pass: app_password },
    })

    const mailOptions: Record<string, unknown> = {
      from: fromAddress,
      to,
      subject,
      text: body,
    }
    if (cc) mailOptions.cc = cc
    if (html) mailOptions.html = html
    if (attachments?.length) {
      mailOptions.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64'),
      }))
    }

    console.log('[send-email] html present:', !!html, 'html length:', html?.length || 0)

    await transporter.sendMail(mailOptions)

    // Trigger auto-opvolging task als opvolging_id meegegeven is
    if (opvolging_id) {
      try {
        const { tasks } = await import("@trigger.dev/sdk/v3")
        await tasks.trigger("email-opvolging", { opvolgingId: opvolging_id })
        console.log('[send-email] Auto-opvolging task getriggerd:', opvolging_id)
      } catch (triggerErr) {
        // Niet fataal — email is al verstuurd, log de fout
        console.error('[send-email] Trigger.dev task starten mislukt:', triggerErr)
      }
    }

    return res.status(200).json({ success: true, message: 'Email verzonden' })
  } catch (error: unknown) {
    if ((error as Error).message === 'Niet geautoriseerd' || (error as Error).message === 'Ongeldige sessie') {
      return res.status(401).json({ error: (error as Error).message })
    }
    console.error('Email verzenden mislukt:', error)
    const msg = error instanceof Error ? error.message : 'Email verzenden mislukt'
    return res.status(500).json({ error: msg })
  }
}
