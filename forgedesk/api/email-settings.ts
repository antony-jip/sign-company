import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { verifyUser, supabaseAdmin } from './_shared'

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || ''

function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const [ivHex, encrypted] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET: haal opgeslagen email instellingen op (met ontsleuteld wachtwoord)
  if (req.method === 'GET') {
    try {
      const userId = await verifyUser(req)
      const { data, error } = await supabaseAdmin
        .from('user_email_settings')
        .select('gmail_address, encrypted_app_password, smtp_host, smtp_port, imap_host, imap_port')
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        return res.status(404).json({ error: 'Geen email instellingen gevonden' })
      }

      let app_password = ''
      try {
        app_password = decrypt(data.encrypted_app_password)
      } catch {
        return res.status(500).json({ error: 'Kon wachtwoord niet ontsleutelen' })
      }

      return res.status(200).json({
        gmail_address: data.gmail_address,
        app_password,
        smtp_host: data.smtp_host,
        smtp_port: data.smtp_port,
        imap_host: data.imap_host,
        imap_port: data.imap_port,
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Fout bij ophalen'
      return res.status(401).json({ error: msg })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const { gmail_address, app_password, smtp_host, smtp_port, imap_host, imap_port } = req.body

    if (!gmail_address || !app_password) {
      return res.status(400).json({ error: 'Email adres en app wachtwoord zijn verplicht' })
    }

    const encryptedPassword = encrypt(app_password)

    const { error } = await supabaseAdmin
      .from('user_email_settings')
      .upsert({
        user_id: userId,
        gmail_address,
        encrypted_app_password: encryptedPassword,
        smtp_host: smtp_host || 'smtp.gmail.com',
        smtp_port: smtp_port || 587,
        imap_host: imap_host || 'imap.gmail.com',
        imap_port: imap_port || 993,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase upsert fout:', JSON.stringify(error))
      return res.status(500).json({ error: `Kon email instellingen niet opslaan: ${error.message || error.code || JSON.stringify(error)}` })
    }

    return res.status(200).json({ success: true, message: 'Email instellingen opgeslagen' })
  } catch (error: unknown) {
    console.error('Email settings fout:', error)
    const msg = error instanceof Error ? error.message : 'Fout bij opslaan'
    // Specifieke foutmeldingen voor bekende problemen
    if (msg.includes('EMAIL_ENCRYPTION_KEY')) {
      return res.status(500).json({ error: 'Server configuratiefout: EMAIL_ENCRYPTION_KEY is niet ingesteld. Neem contact op met de beheerder.' })
    }
    return res.status(500).json({ error: msg })
  }
}
