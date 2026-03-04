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
    } = req.body

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

    await transporter.sendMail(mailOptions)

    return res.status(200).json({ success: true, message: 'Email verzonden' })
  } catch (error: unknown) {
    console.error('Email verzenden mislukt:', error)
    const msg = error instanceof Error ? error.message : 'Email verzenden mislukt'
    return res.status(500).json({ error: msg })
  }
}
