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
      folder = 'INBOX',
      limit = 50,
      offset = 0,
    } = req.body

    // Haal user_id uit JWT en credentials uit database (fallback naar request body voor backward compatibility)
    const user_id = await verifyUser(req)
    let gmail_address: string, app_password: string, imap_host: string, imap_port: number
    try {
      const creds = await getEmailCredentials(user_id)
      gmail_address = creds.gmail_address
      app_password = creds.app_password
      imap_host = creds.imap_host
      imap_port = creds.imap_port
    } catch {
      // Fallback: credentials uit request body (legacy clients)
      gmail_address = req.body.gmail_address
      app_password = req.body.app_password
      imap_host = req.body.imap_host || 'imap.gmail.com'
      imap_port = req.body.imap_port || 993
      if (!gmail_address || !app_password) {
        return res.status(400).json({ error: 'Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.' })
      }
    }

    // Map folder names
    const folderMap: Record<string, string> = {
      'INBOX': 'INBOX',
      'verzonden': '[Gmail]/Verzonden berichten',
      'sent': '[Gmail]/Sent Mail',
      'concepten': '[Gmail]/Concepten',
      'drafts': '[Gmail]/Drafts',
      'prullenbak': '[Gmail]/Prullenbak',
      'trash': '[Gmail]/Trash',
      'spam': '[Gmail]/Spam',
      'alle': '[Gmail]/Alle berichten',
      'all': '[Gmail]/All Mail',
    }

    const imapFolder = folderMap[folder.toLowerCase()] || folder

    // Get highest cached UID for this user+folder to only fetch new mails
    const { data: maxUidRow } = await supabaseAdmin
      .from('emails')
      .select('uid')
      .eq('user_id', user_id)
      .eq('imap_folder', imapFolder)
      .order('uid', { ascending: false })
      .limit(1)
      .maybeSingle()

    const highestCachedUid = maxUidRow?.uid || 0

    const client = new ImapFlow({
      host: imap_host,
      port: imap_port,
      secure: imap_port === 993,
      auth: { user: gmail_address, pass: app_password },
      logger: false,
      emitLogs: false,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    })

    await client.connect()
    const mailbox = await client.mailboxOpen(imapFolder)
    const total = mailbox.exists

    if (total === 0) {
      await client.logout()
      return res.status(200).json({ synced: 0, total: 0 })
    }

    // Determine what to fetch
    let fetchRange: string
    let fetchLimit: number

    if (highestCachedUid === 0) {
      // First sync: fetch last 200 mails by sequence number
      fetchLimit = Math.min(200, total)
      const startSeq = Math.max(1, total - fetchLimit + 1)
      fetchRange = `${startSeq}:${total}`
    } else {
      // Incremental sync: fetch UIDs higher than cached
      fetchRange = `${highestCachedUid + 1}:*`
      fetchLimit = 500 // safety cap
    }

    const newEmails: Array<Record<string, unknown>> = []
    let count = 0

    const fetchOptions = highestCachedUid === 0
      ? { seq: fetchRange }
      : fetchRange

    for await (const message of client.fetch(
      fetchOptions,
      { envelope: true, flags: true, bodyStructure: true, source: true }
    )) {
      if (!message.envelope) continue
      if (count >= fetchLimit) break
      count++

      const from = message.envelope.from?.[0]
      const toAddresses = (message.envelope.to || []).map((t: { address?: string; name?: string }) => ({
        email: t.address || '',
        name: t.name || '',
      }))
      const ccAddresses = (message.envelope.cc || []).map((c: { address?: string; name?: string }) => ({
        email: c.address || '',
        name: c.name || '',
      }))

      // Parse body from source — skip large messages to prevent memory issues
      let bodyHtml = ''
      let bodyText = ''
      let attachmentMeta: Array<{ filename: string; size: number; content_type: string }> = []
      let messageId = message.envelope.messageId || ''

      if (message.source) {
        // Skip parsing messages larger than 2MB to prevent serverless memory issues
        const sourceBuffer = message.source as Buffer
        if (sourceBuffer.length > 2 * 1024 * 1024) {
          // For large messages, only extract messageId from headers
          const headerEnd = sourceBuffer.indexOf('\r\n\r\n')
          const headerStr = sourceBuffer.subarray(0, headerEnd > 0 ? headerEnd : 1024).toString('utf8')
          const msgIdMatch = headerStr.match(/Message-ID:\s*<?([^>\r\n]+)>?/i)
          if (msgIdMatch) messageId = msgIdMatch[1]
          bodyText = '[Bericht te groot om in te laden — open in je email client]'
        } else {
          try {
            const parsed = await simpleParser(sourceBuffer)
            bodyHtml = (typeof parsed.html === 'string' ? parsed.html : '') || ''
            bodyText = parsed.text || ''
            messageId = parsed.messageId || messageId
            attachmentMeta = (parsed.attachments || []).map((a) => ({
              filename: a.filename || 'bijlage',
              size: a.size || 0,
              content_type: a.contentType || 'application/octet-stream',
            }))
          } catch {
            // Parse failed, continue with empty body
          }
        }
      }

      newEmails.push({
        user_id,
        uid: message.uid,
        message_id: messageId || null,
        imap_folder: imapFolder,
        map: folder === 'INBOX' ? 'inbox' : folder.toLowerCase(),
        from_address: from?.address || '',
        from_name: from?.name || '',
        van: from?.name ? `${from.name} <${from.address}>` : (from?.address || ''),
        aan: toAddresses.map((t: { email: string }) => t.email).join(', '),
        to_addresses: toAddresses,
        cc_addresses: ccAddresses.length > 0 ? ccAddresses : null,
        onderwerp: message.envelope.subject || '(geen onderwerp)',
        datum: message.envelope.date?.toISOString() || new Date().toISOString(),
        gelezen: message.flags?.has('\\Seen') || false,
        bijlagen: attachmentMeta.length,
        attachment_meta: attachmentMeta.length > 0 ? attachmentMeta : null,
        body_html: bodyHtml || null,
        body_text: bodyText || null,
        inhoud: bodyHtml || bodyText || '',
        gmail_id: String(message.uid),
        has_attachments: hasAttachmentParts(message.bodyStructure),
        cached_at: new Date().toISOString(),
      })
    }

    await client.logout()

    // Upsert into Supabase (batch)
    let synced = 0
    if (newEmails.length > 0) {
      // Upsert in batches of 50
      for (let i = 0; i < newEmails.length; i += 50) {
        const batch = newEmails.slice(i, i + 50)
        const { error } = await supabaseAdmin
          .from('emails')
          .upsert(batch, {
            onConflict: 'user_id,message_id',
            ignoreDuplicates: false,
          })
        if (error) {
          console.error('Email upsert error:', error)
          // Try individual inserts as fallback for rows without message_id
          for (const email of batch) {
            if (!email.message_id) {
              // Insert without upsert for emails without message_id
              const { error: insertErr } = await supabaseAdmin.from('emails').insert(email)
              if (insertErr) { /* silently ignore duplicate inserts */ }
            }
          }
        } else {
          synced += batch.length
        }
      }
    }

    return res.status(200).json({ synced, total })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Emails sync mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ synced: 0, total: 0, error: msg })
    }
    console.error('Emails sync mislukt:', error)
    return res.status(500).json({ synced: 0, total: 0, error: msg })
  }
}

/**
 * Fallback: original IMAP-only flow (no Supabase caching)
 */
async function fallbackImapOnly(req: VercelRequest, res: VercelResponse) {
  const {
    gmail_address, app_password, folder = 'INBOX', limit = 50, offset = 0,
    imap_host = 'imap.gmail.com', imap_port = 993,
  } = req.body

  const client = new ImapFlow({
    host: imap_host, port: imap_port, secure: imap_port === 993,
    auth: { user: gmail_address, pass: app_password },
    logger: false, emitLogs: false, greetingTimeout: 5000, socketTimeout: 10000,
  })

  await client.connect()

  const folderMap: Record<string, string> = {
    'INBOX': 'INBOX', 'verzonden': '[Gmail]/Verzonden berichten', 'sent': '[Gmail]/Sent Mail',
    'concepten': '[Gmail]/Concepten', 'drafts': '[Gmail]/Drafts',
    'prullenbak': '[Gmail]/Prullenbak', 'trash': '[Gmail]/Trash',
    'spam': '[Gmail]/Spam', 'alle': '[Gmail]/Alle berichten', 'all': '[Gmail]/All Mail',
  }

  const imapFolder = folderMap[folder.toLowerCase()] || folder
  const mailbox = await client.mailboxOpen(imapFolder)
  const total = mailbox.exists

  if (total === 0) {
    await client.logout()
    return res.status(200).json({ emails: [], total: 0 })
  }

  const endSeq = Math.max(1, total - offset)
  const startSeq = Math.max(1, endSeq - limit + 1)

  const emails: Array<{
    uid: number; from: string; fromName: string; to: string; subject: string;
    date: string; isRead: boolean; hasAttachments: boolean
  }> = []

  for await (const message of client.fetch(
    { seq: `${startSeq}:${endSeq}` },
    { envelope: true, flags: true, bodyStructure: true }
  )) {
    if (!message.envelope) continue
    const from = message.envelope.from?.[0]
    emails.push({
      uid: message.uid,
      from: from?.address || '',
      fromName: from?.name || '',
      to: (message.envelope.to || []).map((t: { address?: string }) => t.address || '').join(', '),
      subject: message.envelope.subject || '(geen onderwerp)',
      date: message.envelope.date?.toISOString() || '',
      isRead: message.flags?.has('\\Seen') || false,
      hasAttachments: hasAttachmentParts(message.bodyStructure),
    })
  }

  await client.logout()
  emails.reverse()

  return res.status(200).json({ emails, total })
}

function hasAttachmentParts(structure: unknown): boolean {
  if (!structure || typeof structure !== 'object') return false
  const s = structure as Record<string, unknown>
  if (s.disposition === 'attachment') return true
  if (Array.isArray(s.childNodes)) {
    for (const child of s.childNodes) {
      if (hasAttachmentParts(child)) return true
    }
  }
  return false
}
