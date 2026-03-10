import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createTransport } from 'nodemailer'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const {
      gmail_address,
      app_password,
      smtp_host = 'smtp.gmail.com',
      smtp_port = 587,
      to,
      cc,
      subject,
      body,
      html,
      attachments,
    } = req.body as {
      gmail_address: string
      app_password: string
      smtp_host?: string
      smtp_port?: number
      to: string
      cc?: string
      subject: string
      body?: string
      html?: string
      attachments?: Array<{ filename: string; content: string; encoding: 'base64' }>
    }

    if (!gmail_address || !app_password) {
      return res.status(400).json({ error: 'E-mailadres en app-wachtwoord zijn verplicht' })
    }

    if (!to || !subject) {
      return res.status(400).json({ error: 'Ontvanger en onderwerp zijn verplicht' })
    }

    const transporter = createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_port === 465,
      auth: { user: gmail_address, pass: app_password },
    })

    const mailOptions: Record<string, unknown> = {
      from: gmail_address,
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

    return res.status(200).json({ success: true, message: 'Email verzonden' })
  } catch (error: unknown) {
    console.error('Email verzenden mislukt:', error)
    const msg = error instanceof Error ? error.message : 'Email verzenden mislukt'
    return res.status(500).json({ error: msg })
  }
}
