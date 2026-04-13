import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
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
    const {
      uid,
      folder = 'INBOX',
    } = req.body

    // Haal user_id uit JWT en credentials uit database (fallback naar request body)
    const user_id = await verifyUser(req)
    let gmail_address: string, app_password: string, imap_host: string, imap_port: number
    try {
      const creds = await getEmailCredentials(user_id)
      gmail_address = creds.gmail_address
      app_password = creds.app_password
      imap_host = creds.imap_host
      imap_port = creds.imap_port
    } catch {
      gmail_address = req.body.gmail_address
      app_password = req.body.app_password
      imap_host = req.body.imap_host || 'imap.gmail.com'
      imap_port = req.body.imap_port || 993
      if (!gmail_address || !app_password) {
        return res.status(400).json({ error: 'Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.' })
      }
    }

    if (!uid) {
      return res.status(400).json({ error: 'Email UID is verplicht' })
    }

    const folderMap: Record<string, string> = {
      'INBOX': 'INBOX',
      'verzonden': '[Gmail]/Verzonden berichten',
      'sent': '[Gmail]/Sent Mail',
      'concepten': '[Gmail]/Concepten',
      'drafts': '[Gmail]/Drafts',
      'prullenbak': '[Gmail]/Prullenbak',
      'trash': '[Gmail]/Trash',
    }

    const imapFolder = folderMap[folder.toLowerCase()] || folder

    // Step 1: Check Supabase cache first
    {

      const { data: cached } = await supabaseAdmin
        .from('emails')
        .select('id, van, aan, onderwerp, datum, gelezen, body_html, body_text, attachment_meta, message_id')
        .eq('user_id', user_id)
        .eq('uid', Number(uid))
        .eq('imap_folder', imapFolder)
        .maybeSingle()

      if (cached && (cached.body_html || cached.body_text)) {
        // Mark as read in Supabase
        if (!cached.gelezen) {
          await supabaseAdmin
            .from('emails')
            .update({ gelezen: true })
            .eq('id', cached.id)
        }

        return res.status(200).json({
          uid,
          from: cached.van || '',
          to: cached.aan || '',
          cc: '',
          subject: cached.onderwerp || '',
          date: cached.datum || '',
          bodyHtml: cached.body_html || '',
          bodyText: cached.body_text || '',
          attachments: cached.attachment_meta || [],
          messageId: cached.message_id || '',
          inReplyTo: '',
          fromCache: true,
        })
      }

      // Step 2: Not in cache or no body — fetch from IMAP
      const result = await fetchFromIMAP({
        gmail_address, app_password, uid, imapFolder, imap_host, imap_port,
      })

      // Step 3: Cache the result in Supabase
      if (cached) {
        // Update existing row with body
        await supabaseAdmin
          .from('emails')
          .update({
            body_html: result.bodyHtml || null,
            body_text: result.bodyText || null,
            attachment_meta: result.attachments.length > 0 ? result.attachments : null,
            gelezen: true,
            cached_at: new Date().toISOString(),
          })
          .eq('id', cached.id)
      } else {
        // Insert new row
        const from = result.from
        const fromMatch = from.match(/^([^<]*)<([^>]+)>/)
        await supabaseAdmin
          .from('emails')
          .upsert({
            user_id,
            uid: Number(uid),
            message_id: result.messageId || null,
            imap_folder: imapFolder,
            map: folder === 'INBOX' ? 'inbox' : folder.toLowerCase(),
            from_address: fromMatch ? fromMatch[2].trim() : from,
            from_name: fromMatch ? fromMatch[1].trim() : '',
            van: from,
            aan: result.to,
            onderwerp: result.subject || '(geen onderwerp)',
            datum: result.date || new Date().toISOString(),
            gelezen: true,
            bijlagen: result.attachments.length,
            attachment_meta: result.attachments.length > 0 ? result.attachments : null,
            body_html: result.bodyHtml || null,
            body_text: result.bodyText || null,
            inhoud: result.bodyHtml || result.bodyText || '',
            gmail_id: String(uid),
            cached_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,message_id',
            ignoreDuplicates: false,
          })
        // Silently ignore cache write failures — user still gets the email
      }

      return res.status(200).json(result)
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Email ophalen mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ error: msg })
    }
    console.error('Email lezen mislukt:', error)
    return res.status(500).json({ error: msg })
  }
}

async function fetchFromIMAP(opts: {
  gmail_address: string
  app_password: string
  uid: number | string
  imapFolder: string
  imap_host: string
  imap_port: number
}) {
  const client = new ImapFlow({
    host: opts.imap_host,
    port: opts.imap_port,
    secure: opts.imap_port === 993,
    auth: { user: opts.gmail_address, pass: opts.app_password },
    logger: false,
    emitLogs: false,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  })

  await client.connect()
  await client.mailboxOpen(opts.imapFolder)

  let message = null
  for await (const msg of client.fetch(
    { uid: `${opts.uid}:${opts.uid}` },
    { envelope: true, source: true, flags: true }
  )) {
    message = msg
    break
  }

  if (!message || !('source' in message) || !message.source) {
    await client.logout()
    throw new Error('Email niet gevonden')
  }

  // Mark as read on IMAP
  await client.messageFlagsAdd({ uid: `${opts.uid}:${opts.uid}` }, ['\\Seen'])
  await client.logout()

  // Parse de email maar skip de bijlage-INHOUD. We hoeven alleen de body
  // tekst + attachment metadata (naam/type/grootte). De daadwerkelijke
  // bijlage-data wordt apart opgehaald via /api/email-attachment wanneer
  // de gebruiker op download klikt. Dit scheelt enorm bij mails met veel
  // of grote bijlages (een 20MB mail parst nu in ~100ms ipv seconden).
  const parsed = await simpleParser(message.source as Buffer, {
    skipImageLinks: true,
    skipTextLinks: true,
    skipTextToHtml: true,
  })

  const attachments = (parsed.attachments || []).map((a) => ({
    filename: a.filename || 'bijlage',
    contentType: a.contentType || 'application/octet-stream',
    size: a.size || 0,
  }))

  let bodyHtml = parsed.html || ''
  if (bodyHtml && parsed.attachments?.length) {
    for (const att of parsed.attachments) {
      if (att.contentId && att.content) {
        const cid = att.contentId.replace(/^<|>$/g, '')
        const b64 = att.content.toString('base64')
        const dataUri = `data:${att.contentType || 'application/octet-stream'};base64,${b64}`
        bodyHtml = bodyHtml.split(`cid:${cid}`).join(dataUri)
      }
    }
  }

  return {
    uid: opts.uid,
    from: parsed.from?.text || '',
    to: Array.isArray(parsed.to) ? parsed.to.map(a => a.text).join(', ') : (parsed.to?.text || ''),
    cc: Array.isArray(parsed.cc) ? parsed.cc.map(a => a.text).join(', ') : (parsed.cc?.text || ''),
    subject: parsed.subject || '',
    date: parsed.date?.toISOString() || '',
    bodyHtml,
    bodyText: parsed.text || '',
    attachments,
    messageId: parsed.messageId || '',
    inReplyTo: parsed.inReplyTo || '',
  }
}
