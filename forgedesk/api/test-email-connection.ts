import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { createTransport } from 'nodemailer'
import { verifyUser } from './_shared'

export const config = { maxDuration: 30 }

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

    // Test IMAP en SMTP parallel (sneller, past binnen Vercel timeout)
    const [imapResult, smtpResult] = await Promise.allSettled([
      testImap({ gmail_address, app_password, imap_host, imap_port }),
      testSmtp({ gmail_address, app_password, smtp_host, smtp_port }),
    ])

    const imap_ok = imapResult.status === 'fulfilled' && imapResult.value === true
    const smtp_ok = smtpResult.status === 'fulfilled' && smtpResult.value === true

    const errors: string[] = []
    if (imapResult.status === 'rejected') {
      errors.push(`IMAP: ${imapResult.reason?.message || 'Onbekende fout'}`)
    }
    if (smtpResult.status === 'rejected') {
      errors.push(`SMTP: ${smtpResult.reason?.message || 'Onbekende fout'}`)
    }

    return res.status(200).json({
      imap_ok,
      smtp_ok,
      error: errors.length > 0 ? errors.join('. ') : undefined,
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

async function testImap(opts: {
  gmail_address: string
  app_password: string
  imap_host: string
  imap_port: number
}): Promise<boolean> {
  const client = new ImapFlow({
    host: opts.imap_host,
    port: opts.imap_port,
    secure: opts.imap_port === 993,
    auth: { user: opts.gmail_address, pass: opts.app_password },
    logger: false,
    emitLogs: false,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  })
  await client.connect()
  await client.logout()
  return true
}

async function testSmtp(opts: {
  gmail_address: string
  app_password: string
  smtp_host: string
  smtp_port: number
}): Promise<boolean> {
  const transporter = createTransport({
    host: opts.smtp_host,
    port: opts.smtp_port,
    secure: opts.smtp_port === 465,
    auth: { user: opts.gmail_address, pass: opts.app_password },
    connectionTimeout: 8000,
    socketTimeout: 8000,
  })
  await transporter.verify()
  return true
}
