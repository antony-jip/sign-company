import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createTransport } from 'nodemailer'
import { createDecipheriv, createCipheriv, randomBytes } from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
)

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || ''

function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  const [ivHex, encrypted] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  const iv = randomBytes(16)
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

async function getUserEmailSettings(userId: string) {
  const { data, error } = await supabase
    .from('user_email_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new Error('Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.')
  }

  return {
    host: data.smtp_host || 'smtp.gmail.com',
    port: data.smtp_port || 587,
    email: data.gmail_address,
    password: decrypt(data.encrypted_app_password),
  }
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Niet geautoriseerd')
  }
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const { to, cc, subject, body, html, scheduledAt } = req.body

    if (!to || !subject) {
      return res.status(400).json({ error: 'Ontvanger en onderwerp zijn verplicht' })
    }

    const emailSettings = await getUserEmailSettings(userId)

    const transporter = createTransport({
      host: emailSettings.host,
      port: emailSettings.port,
      secure: emailSettings.port === 465,
      auth: { user: emailSettings.email, pass: emailSettings.password },
    })

    const mailOptions: Record<string, unknown> = {
      from: emailSettings.email,
      to,
      subject,
      text: body,
    }
    if (cc) mailOptions.cc = cc
    if (html) mailOptions.html = html

    if (scheduledAt) {
      await supabase.from('emails').insert({
        user_id: userId, gmail_id: '', van: emailSettings.email, aan: to,
        onderwerp: subject, inhoud: body || '', datum: new Date().toISOString(),
        gelezen: true, starred: false, labels: ['gepland'], bijlagen: 0,
        map: 'gepland', scheduled_at: scheduledAt,
      })
      return res.status(200).json({ success: true, message: `Email ingepland`, scheduled: true })
    }

    await transporter.sendMail(mailOptions)

    await supabase.from('emails').insert({
      user_id: userId, gmail_id: '', van: emailSettings.email, aan: to,
      onderwerp: subject, inhoud: body || '', datum: new Date().toISOString(),
      gelezen: true, starred: false, labels: ['verzonden'], bijlagen: 0, map: 'verzonden',
    })

    return res.status(200).json({ success: true, message: 'Email verzonden' })
  } catch (error: any) {
    console.error('Email verzenden mislukt:', error)
    return res.status(500).json({ error: error.message || 'Email verzenden mislukt' })
  }
}
