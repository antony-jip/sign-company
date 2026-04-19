/**
 * Verstuurt geplande emails uit de queue.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET} header.
 * Vercel Cron stuurt deze automatisch mee op basis van vercel.json.
 *
 * Handmatig testen (na deploy):
 * curl -H "Authorization: Bearer $CRON_SECRET" \
 *   https://app.doen.team/api/cron-verzend-geplande-berichten
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

function decryptPassword(encrypted: string): string {
  if (encrypted.startsWith('b64:')) {
    return Buffer.from(encrypted.slice(4), 'base64').toString('utf8')
  }
  const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
  if (!ENCRYPTION_KEY) {
    throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  }
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const [ivHex, encryptedHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

interface UserCreds {
  gmail_address: string
  password: string
  smtp_host: string
  smtp_port: number
  bedrijfsnaam?: string
}

async function getUserCreds(userId: string): Promise<UserCreds | null> {
  const { data: settings } = await supabaseAdmin
    .from('user_email_settings')
    .select('gmail_address, encrypted_app_password, smtp_host, smtp_port')
    .eq('user_id', userId)
    .maybeSingle()

  if (!settings?.gmail_address || !settings?.encrypted_app_password) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('bedrijfsnaam')
    .eq('id', userId)
    .maybeSingle()

  return {
    gmail_address: settings.gmail_address,
    password: decryptPassword(settings.encrypted_app_password),
    smtp_host: settings.smtp_host || 'smtp.gmail.com',
    smtp_port: settings.smtp_port || 587,
    bedrijfsnaam: profile?.bedrijfsnaam || undefined,
  }
}

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const nu = new Date().toISOString()

    const { data: due, error: fetchError } = await supabaseAdmin
      .from('ingeplande_berichten')
      .select('*')
      .eq('status', 'wachtend')
      .lte('scheduled_at', nu)
      .limit(50)

    if (fetchError) {
      console.error('[cron] Wachtende berichten ophalen mislukt:', fetchError)
      return res.status(500).json({ error: fetchError.message })
    }

    if (!due || due.length === 0) {
      return res.status(200).json({ processed: 0 })
    }

    console.log(`[cron] ${due.length} berichten te verwerken`)

    let verzonden = 0
    let mislukt = 0

    for (const bericht of due) {
      try {
        const creds = await getUserCreds(bericht.user_id)
        if (!creds) {
          throw new Error('Geen email instellingen gevonden voor user')
        }

        const transporter = nodemailer.createTransport({
          host: creds.smtp_host,
          port: creds.smtp_port,
          secure: creds.smtp_port === 465,
          auth: { user: creds.gmail_address, pass: creds.password },
        })

        const fromAddress = creds.bedrijfsnaam
          ? `"${creds.bedrijfsnaam.replace(/"/g, '')}" <${creds.gmail_address}>`
          : creds.gmail_address

        const mailOptions: Record<string, unknown> = {
          from: fromAddress,
          to: bericht.ontvanger,
          subject: bericht.onderwerp,
        }

        if (bericht.in_reply_to) {
          mailOptions.inReplyTo = bericht.in_reply_to
          mailOptions.references = bericht.in_reply_to
        }

        if (bericht.html) {
          mailOptions.html = bericht.html
          mailOptions.text = bericht.body || bericht.onderwerp
        } else {
          mailOptions.text = bericht.body
        }

        if (bericht.cc) mailOptions.cc = bericht.cc
        if (bericht.bcc) mailOptions.bcc = bericht.bcc

        const bijlagen = (bericht.bijlagen || []) as Array<{
          filename: string
          content: string
          encoding: 'base64'
        }>
        if (bijlagen.length) {
          mailOptions.attachments = bijlagen.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content, 'base64'),
          }))
        }

        await transporter.sendMail(mailOptions)

        await supabaseAdmin
          .from('ingeplande_berichten')
          .update({
            status: 'verzonden',
            verzonden_op: new Date().toISOString(),
          })
          .eq('id', bericht.id)

        verzonden++
        console.log('[cron] Bericht verzonden:', bericht.id)
      } catch (err) {
        mislukt++
        const foutmelding = err instanceof Error ? err.message : String(err)
        await supabaseAdmin
          .from('ingeplande_berichten')
          .update({ status: 'mislukt', foutmelding })
          .eq('id', bericht.id)
        console.error('[cron] Bericht verzenden mislukt:', bericht.id, foutmelding)
      }
    }

    return res.status(200).json({ processed: due.length, verzonden, mislukt })
  } catch (err) {
    console.error('[cron] Fatale fout:', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Cron mislukt' })
  }
}
