import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { createTransport } from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    await verifyUser(req)
    const {
      gmail_address,
      app_password,
      smtp_host = 'smtp.gmail.com',
      smtp_port = 587,
      imap_host = 'imap.gmail.com',
      imap_port = 993,
    } = req.body

    if (!gmail_address || !app_password) {
      return res.status(400).json({ error: 'E-mailadres en app-wachtwoord zijn verplicht' })
    }

    let imap_ok = false
    let smtp_ok = false
    let error = ''

    // Test IMAP
    try {
      const client = new ImapFlow({
        host: imap_host,
        port: imap_port,
        secure: imap_port === 993,
        auth: { user: gmail_address, pass: app_password },
        logger: false,
      })
      await client.connect()
      await client.logout()
      imap_ok = true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Onbekende IMAP fout'
      error += `IMAP: ${msg}. `
    }

    // Test SMTP
    try {
      const transporter = createTransport({
        host: smtp_host,
        port: smtp_port,
        secure: smtp_port === 465,
        auth: { user: gmail_address, pass: app_password },
      })
      await transporter.verify()
      smtp_ok = true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Onbekende SMTP fout'
      error += `SMTP: ${msg}. `
    }

    return res.status(200).json({
      imap_ok,
      smtp_ok,
      error: error || undefined,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Verbindingstest mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ imap_ok: false, smtp_ok: false, error: msg })
    }
    console.error('Email verbindingstest mislukt:', error)
    return res.status(500).json({ imap_ok: false, smtp_ok: false, error: msg })
  }
}
