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

function extractBareEmail(address: string): string {
  const trimmed = address.trim()
  const match = trimmed.match(/<([^>]+)>/)
  return (match?.[1] || trimmed).toLowerCase()
}

interface UserCreds {
  gmail_address: string
  password: string
  smtp_host: string
  smtp_port: number
  fromName?: string
}

async function getUserCreds(userId: string): Promise<UserCreds | null> {
  const { data: settings } = await supabaseAdmin
    .from('user_email_settings')
    .select('gmail_address, encrypted_app_password, smtp_host, smtp_port')
    .eq('user_id', userId)
    .maybeSingle()

  if (!settings?.gmail_address || !settings?.encrypted_app_password) return null

  // Afzendernaam staat per-user op profiles (migratie 091); bedrijfsnaam als fallback.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('bedrijfsnaam, afzender_naam')
    .eq('id', userId)
    .maybeSingle()

  const afzenderNaam = (profile?.afzender_naam || '').trim() || null
  const fromName = afzenderNaam || profile?.bedrijfsnaam?.trim() || undefined

  return {
    gmail_address: settings.gmail_address,
    password: decryptPassword(settings.encrypted_app_password),
    smtp_host: settings.smtp_host || 'smtp.gmail.com',
    smtp_port: settings.smtp_port || 587,
    fromName,
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
        // Atomic claim: alleen verwerken als deze run de 'wachtend'-rij pakt.
        // Voorkomt dubbel verzenden bij overlappende cron-runs of wanneer de
        // status-update na verzenden faalt (rij is dan geen 'wachtend' meer).
        const { data: claimed } = await supabaseAdmin
          .from('ingeplande_berichten')
          .update({ status: 'verwerken' })
          .eq('id', bericht.id)
          .eq('status', 'wachtend')
          .select('id')
          .maybeSingle()
        if (!claimed) continue

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

        const fromAddress = creds.fromName
          ? `"${creds.fromName.replace(/"/g, '')}" <${creds.gmail_address}>`
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

        // Inline base64-afbeeldingen -> CID-attachments (multipart/related),
        // gelijk aan api/send-email.ts. Voorkomt grote/afgewezen mails.
        const inlineAttachments: Array<{ filename: string; content: Buffer; cid: string; contentType: string; contentDisposition: 'inline' }> = []
        if (bericht.html) {
          let imgIndex = 0
          const processedHtml = (bericht.html as string).replace(
            /<img([^>]*)src="data:(image\/(png|jpeg|jpg|gif|webp|svg\+xml));base64,([^"]+)"([^>]*)>/gi,
            (_m: string, before: string, mimeType: string, ext: string, b64Data: string, after: string) => {
              const cid = `inline-${crypto.randomUUID()}@forgedesk`
              const extension = ext.replace('+xml', '').replace('jpeg', 'jpg')
              inlineAttachments.push({
                filename: `inline-${imgIndex++}.${extension}`,
                content: Buffer.from(b64Data, 'base64'),
                cid,
                contentType: mimeType,
                contentDisposition: 'inline',
              })
              return `<img${before}src="cid:${cid}"${after}>`
            }
          )
          mailOptions.html = processedHtml
          mailOptions.text = bericht.body || bericht.onderwerp
        } else {
          mailOptions.text = bericht.body
        }

        if (bericht.cc) mailOptions.cc = bericht.cc
        if (bericht.bcc) mailOptions.bcc = bericht.bcc

        const bijlagen = (bericht.bijlagen || []) as Array<{
          filename: string
          content?: string
          encoding?: 'base64'
          storagePath?: string
          bucket?: string
        }>
        const built: Array<{ filename: string; content: Buffer; cid?: string; contentType?: string; contentDisposition?: 'inline' }> = [...inlineAttachments]
        for (const a of bijlagen) {
          if (a.storagePath) {
            const bucket = a.bucket ?? 'documenten'
            const { data, error: dlError } = await supabaseAdmin.storage.from(bucket).download(a.storagePath)
            if (dlError || !data) {
              throw new Error(`Bijlage "${a.filename}" kon niet worden opgehaald`)
            }
            built.push({ filename: a.filename, content: Buffer.from(await data.arrayBuffer()) })
          } else if (a.content) {
            built.push({ filename: a.filename, content: Buffer.from(a.content, 'base64') })
          }
        }
        if (built.length) mailOptions.attachments = built

        const sendResult = await transporter.sendMail(mailOptions)
        const sentMessageId = (sendResult as { messageId?: string }).messageId || null

        await supabaseAdmin
          .from('ingeplande_berichten')
          .update({
            status: 'verzonden',
            verzonden_op: new Date().toISOString(),
          })
          .eq('id', bericht.id)

        // Persist verzonden mail zodat ie in de conversatie-thread verschijnt
        // (gelijk aan de directe-verzendroute in api/send-email.ts).
        try {
          const effectiveThreadId = bericht.thread_id || crypto.randomUUID()
          const wachtOpReactie = bericht.wacht_op_reactie ?? false
          const { data: insertedMail } = await supabaseAdmin.from('emails').insert({
            user_id: bericht.user_id,
            message_id: sentMessageId,
            in_reply_to: bericht.in_reply_to || null,
            thread_id: effectiveThreadId,
            map: 'verzonden',
            imap_folder: 'SENT',
            from_address: creds.gmail_address,
            from_name: creds.fromName || '',
            van: fromAddress,
            aan: bericht.ontvanger,
            onderwerp: bericht.onderwerp,
            body_html: bericht.html || null,
            body_text: bericht.body || bericht.onderwerp,
            inhoud: bericht.html || bericht.body || '',
            datum: new Date().toISOString(),
            gelezen: true,
            bijlagen: bijlagen.length,
            has_attachments: bijlagen.length > 0,
            gmail_id: '',
            cached_at: new Date().toISOString(),
            wacht_op_reactie: wachtOpReactie,
            beantwoord: false,
          }).select('id').single()

          // Sales Inbox: vervangen-niet-stapelen — sluit eerdere openstaande
          // wacht-mails naar hetzelfde adres af (gelijk aan api/send-email.ts).
          if (wachtOpReactie && insertedMail?.id) {
            const bareEmail = extractBareEmail(bericht.ontvanger)
            if (bareEmail) {
              await supabaseAdmin
                .from('emails')
                .update({ wacht_op_reactie: false, vervangen_door_email_id: insertedMail.id })
                .eq('user_id', bericht.user_id)
                .eq('wacht_op_reactie', true)
                .eq('beantwoord', false)
                .neq('id', insertedMail.id)
                .ilike('aan', `%${bareEmail}%`)
            }
          }
        } catch (saveErr) {
          console.error('[cron] Verzonden mail opslaan mislukt:', bericht.id, saveErr)
        }

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
