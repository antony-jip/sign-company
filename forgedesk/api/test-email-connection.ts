import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { createTransport } from 'nodemailer'
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

export const config = { maxDuration: 30 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    await verifyUser(req)
  } catch (authErr: unknown) {
    const msg = authErr instanceof Error ? authErr.message : 'Auth fout'
    console.error('[test-email-connection] Auth mislukt:', msg)
    return res.status(401).json({ imap_ok: false, smtp_ok: false, error: msg })
  }

  try {
    const body = req.body || {}
    const gmail_address = body.gmail_address
    const app_password = body.app_password
    const smtp_host = body.smtp_host || 'smtp.gmail.com'
    const smtp_port = body.smtp_port || 587
    const imap_host = body.imap_host || 'imap.gmail.com'
    const imap_port = body.imap_port || 993

    if (!gmail_address || !app_password) {
      return res.status(400).json({
        imap_ok: false,
        smtp_ok: false,
        error: 'E-mailadres en app-wachtwoord zijn verplicht',
      })
    }

    console.log(`[test-email-connection] Testing ${gmail_address} — IMAP: ${imap_host}:${imap_port}, SMTP: ${smtp_host}:${smtp_port}`)

    // Test IMAP en SMTP parallel (sneller, past binnen Vercel timeout)
    const [imapResult, smtpResult] = await Promise.allSettled([
      testImap({ gmail_address, app_password, imap_host, imap_port }),
      testSmtp({ gmail_address, app_password, smtp_host, smtp_port }),
    ])

    const imap_ok = imapResult.status === 'fulfilled' && imapResult.value === true
    const smtp_ok = smtpResult.status === 'fulfilled' && smtpResult.value === true

    const errors: string[] = []
    if (imapResult.status === 'rejected') {
      const imapErr = imapResult.reason?.message || String(imapResult.reason) || 'Onbekende fout'
      console.error('[test-email-connection] IMAP fout:', imapErr)
      errors.push(`IMAP: ${imapErr}`)
    }
    if (smtpResult.status === 'rejected') {
      const smtpErr = smtpResult.reason?.message || String(smtpResult.reason) || 'Onbekende fout'
      console.error('[test-email-connection] SMTP fout:', smtpErr)
      errors.push(`SMTP: ${smtpErr}`)
    }

    if (imap_ok && smtp_ok) {
      console.log('[test-email-connection] Beide tests geslaagd')
    }

    return res.status(200).json({
      imap_ok,
      smtp_ok,
      error: errors.length > 0 ? errors.join('. ') : undefined,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Verbindingstest mislukt'
    console.error('[test-email-connection] Onverwachte fout:', error)
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
