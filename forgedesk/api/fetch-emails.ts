import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
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
  } catch {
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

// Folder name mapping
const FOLDER_MAP: Record<string, string> = {
  'inbox': 'INBOX',
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

export const config = { maxDuration: 30 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let client: ImapFlow | null = null

  try {
    const { folder = 'INBOX', limit = 100 } = req.body

    const user_id = await verifyUser(req)

    // Get credentials (DB first, fallback to request body)
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
        return res.status(400).json({ error: 'Geen email instellingen gevonden.' })
      }
    }

    const imapFolder = FOLDER_MAP[folder.toLowerCase()] || folder
    const mapValue = folder.toUpperCase() === 'INBOX' ? 'inbox' : folder.toLowerCase()

    // ─── Connect to IMAP ───
    client = new ImapFlow({
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
      return res.status(200).json({ synced: 0, total: 0, fetched: 0 })
    }

    // ─── Always fetch last N by sequence number ───
    // This is simpler and more reliable than UID-based incremental sync.
    // No source download — bodies are fetched on-demand via read-email API.
    const fetchCount = Math.min(limit, total)
    const startSeq = Math.max(1, total - fetchCount + 1)
    const fetchRange = `${startSeq}:${total}`

    const newEmails: Array<Record<string, unknown>> = []

    for await (const message of client.fetch(
      { seq: fetchRange },
      { envelope: true, flags: true, uid: true, bodyStructure: true }
    )) {
      if (!message.envelope) continue

      const from = message.envelope.from?.[0]
      const toAddresses = (message.envelope.to || []).map((t: { address?: string; name?: string }) => ({
        email: t.address || '',
        name: t.name || '',
      }))
      const ccAddresses = (message.envelope.cc || []).map((c: { address?: string; name?: string }) => ({
        email: c.address || '',
        name: c.name || '',
      }))

      const messageId = message.envelope.messageId || ''
      const hasAttachments = hasAttachmentParts(message.bodyStructure)

      newEmails.push({
        user_id,
        uid: message.uid,
        message_id: messageId || null,
        imap_folder: imapFolder,
        map: mapValue,
        from_address: from?.address || '',
        from_name: from?.name || '',
        van: from?.name ? `${from.name} <${from.address}>` : (from?.address || ''),
        aan: toAddresses.map((t: { email: string }) => t.email).join(', '),
        to_addresses: toAddresses,
        cc_addresses: ccAddresses.length > 0 ? ccAddresses : null,
        onderwerp: message.envelope.subject || '(geen onderwerp)',
        datum: message.envelope.date?.toISOString() || new Date().toISOString(),
        gelezen: message.flags?.has('\\Seen') || false,
        bijlagen: hasAttachments ? 1 : 0,
        has_attachments: hasAttachments,
        gmail_id: String(message.uid),
        cached_at: new Date().toISOString(),
      })
    }

    await client.logout()
    client = null

    // ─── Upsert into Supabase ───
    // Strategy: batch upsert first, individual insert fallback on error
    let synced = 0
    const errors: string[] = []

    if (newEmails.length > 0) {
      for (let i = 0; i < newEmails.length; i += 50) {
        const batch = newEmails.slice(i, i + 50)

        // Try batch upsert with onConflict
        const { error } = await supabaseAdmin
          .from('emails')
          .upsert(batch, {
            onConflict: 'user_id,message_id',
            ignoreDuplicates: true,
          })

        if (!error) {
          synced += batch.length
          continue
        }

        // Batch upsert failed — try individual inserts
        console.error('[fetch-emails] Batch upsert failed:', error.message)
        errors.push(`batch ${i}: ${error.message}`)

        for (const email of batch) {
          // For emails with message_id: check if exists, then insert or update
          if (email.message_id) {
            const { data: existing } = await supabaseAdmin
              .from('emails')
              .select('id')
              .eq('user_id', user_id)
              .eq('message_id', email.message_id)
              .maybeSingle()

            if (existing) {
              // Update existing — only update flags (gelezen) and uid
              const { error: updateErr } = await supabaseAdmin
                .from('emails')
                .update({ gelezen: email.gelezen, uid: email.uid, cached_at: email.cached_at })
                .eq('id', existing.id)
              if (!updateErr) synced++
            } else {
              // Insert new
              const { error: insertErr } = await supabaseAdmin
                .from('emails')
                .insert(email)
              if (!insertErr) synced++
              else errors.push(`insert ${email.message_id}: ${insertErr.message}`)
            }
          } else {
            // No message_id: check by uid + folder to avoid duplicates
            const { data: existing } = await supabaseAdmin
              .from('emails')
              .select('id')
              .eq('user_id', user_id)
              .eq('uid', email.uid)
              .eq('imap_folder', email.imap_folder)
              .maybeSingle()

            if (!existing) {
              const { error: insertErr } = await supabaseAdmin
                .from('emails')
                .insert(email)
              if (!insertErr) synced++
            } else {
              synced++ // Already exists
            }
          }
        }
      }
    }

    return res.status(200).json({
      synced,
      total,
      fetched: newEmails.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Emails sync mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ synced: 0, total: 0, error: msg })
    }
    console.error('[fetch-emails] Fatal error:', error)
    return res.status(500).json({ synced: 0, total: 0, error: msg })
  } finally {
    // Ensure IMAP connection is always closed
    if (client) {
      try { await client.logout() } catch { /* ignore */ }
    }
  }
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
