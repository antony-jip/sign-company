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

interface EmailCredentials {
  gmail_address: string
  app_password: string
  imap_host: string
  imap_port: number
}

async function getEmailCredentials(userId: string): Promise<EmailCredentials> {
  const { data, error } = await supabaseAdmin
    .from('user_email_settings')
    .select('gmail_address, encrypted_app_password, imap_host, imap_port')
    .eq('user_id', userId)
    .single()

  if (error || !data?.gmail_address || !data?.encrypted_app_password) {
    throw new Error('Geen email instellingen gevonden')
  }

  return {
    gmail_address: data.gmail_address,
    app_password: decryptPassword(data.encrypted_app_password),
    imap_host: data.imap_host || 'imap.gmail.com',
    imap_port: data.imap_port || 993,
  }
}

// ───── Persistent attachment-cache (sprint 3) ─────
const STORAGE_BUCKET = 'email-attachments'
const SIGNED_URL_TTL = 60 * 60 // 1 uur
const MAX_CACHE_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_CACHE_PDF_BYTES = 25 * 1024 * 1024

function isCacheable(filename: string, contentType: string, size: number, isInlineCid: boolean): boolean {
  if (isInlineCid || !filename || size === 0) return false
  const ct = contentType.toLowerCase()
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const isImage = ct.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
  const isPdf = ct === 'application/pdf' || ext === 'pdf'
  return (isImage && size <= MAX_CACHE_IMAGE_BYTES) || (isPdf && size <= MAX_CACHE_PDF_BYTES)
}

async function writeAttachmentToCache(
  user_id: string,
  email_uuid: string,
  filename: string,
  contentType: string,
  buffer: Buffer,
): Promise<void> {
  const path = `${user_id}/${email_uuid}/${filename}`
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType, upsert: true })
  if (uploadErr) {
    console.warn('[email-attachment-cache] upload mislukt voor', filename, uploadErr.message)
    return
  }
  await supabaseAdmin
    .from('email_attachment_cache')
    .upsert({
      user_id,
      email_uuid,
      filename,
      content_type: contentType,
      size: buffer.length,
      storage_path: path,
      cached_at: new Date().toISOString(),
    }, { onConflict: 'email_uuid,filename' })
}

export const config = { maxDuration: 30 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { uid, folder = 'INBOX', filename, all } = req.body as {
      uid?: number | string
      folder?: string
      filename?: string
      all?: boolean
    }
    if (!uid || (!all && !filename)) {
      return res.status(400).json({ error: 'uid en filename (of all=true) zijn verplicht' })
    }

    const user_id = await verifyUser(req)

    // Resolve email_uuid voor cache-lookup (snel pad bij hits).
    const { data: emailRow } = await supabaseAdmin
      .from('emails')
      .select('id')
      .eq('user_id', user_id)
      .eq('uid', Number(uid))
      .eq('imap_folder', folder)
      .maybeSingle()
    const email_uuid = emailRow?.id || null

    // Cache-shortcut: single-filename via signed URL als attachment in cache zit.
    if (email_uuid && filename && !all) {
      const { data: row } = await supabaseAdmin
        .from('email_attachment_cache')
        .select('content_type, size, storage_path')
        .eq('user_id', user_id)
        .eq('email_uuid', email_uuid)
        .eq('filename', filename)
        .maybeSingle()
      if (row) {
        const { data: signed } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(row.storage_path, SIGNED_URL_TTL)
        if (signed?.signedUrl) {
          return res.status(200).json({
            filename,
            contentType: row.content_type,
            size: row.size,
            storage_url: signed.signedUrl,
          })
        }
      }
    }

    // IMAP-fallback: bestaande pad + cache-write voor volgende keer.
    const creds = await getEmailCredentials(user_id)

    const client = new ImapFlow({
      host: creds.imap_host,
      port: creds.imap_port,
      secure: creds.imap_port === 993,
      auth: { user: creds.gmail_address, pass: creds.app_password },
      logger: false,
      emitLogs: false,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    })

    await client.connect()
    await client.mailboxOpen(folder)

    let message = null
    for await (const msg of client.fetch(
      { uid: `${uid}:${uid}` },
      { source: true }
    )) {
      message = msg
      break
    }

    await client.logout()

    if (!message || !('source' in message) || !message.source) {
      return res.status(404).json({ error: 'Email niet gevonden' })
    }

    const parsed = await simpleParser(message.source as Buffer)
    const allAttachments = parsed.attachments || []

    if (all) {
      const payload = allAttachments
        .filter((a) => a.content)
        .map((a) => {
          const buf = Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content)
          return {
            filename: a.filename || 'bijlage',
            contentType: a.contentType || 'application/octet-stream',
            size: buf.length,
            content: buf.toString('base64'),
            buffer: buf,
            isInlineCid: !!a.contentId || a.contentDisposition === 'inline',
          }
        })

      // Cache-write moet voltooien voordat we de response sluiten: Vercel
      // freezet de Node-runtime na res.end() waardoor fire-and-forget halverwege
      // kan stoppen en partial-objects in Storage achterlaat.
      if (email_uuid) {
        const cacheable = payload.filter((p) => isCacheable(p.filename, p.contentType, p.size, p.isInlineCid))
        try {
          await Promise.all(cacheable.map((p) =>
            writeAttachmentToCache(user_id, email_uuid!, p.filename, p.contentType, p.buffer),
          ))
        } catch (err) {
          console.warn('[email-attachment-cache] bulk-write mislukt:', err)
        }
      }

      return res.status(200).json({
        attachments: payload.map(({ filename, contentType, size, content }) => ({
          filename, contentType, size, content,
        })),
      })
    }

    const attachment = allAttachments.find((a) => a.filename === filename)

    if (!attachment || !attachment.content) {
      return res.status(404).json({ error: 'Bijlage niet gevonden' })
    }

    const contentBuffer = Buffer.isBuffer(attachment.content)
      ? attachment.content
      : Buffer.from(attachment.content)
    const ct = attachment.contentType || 'application/octet-stream'
    const fname = attachment.filename || filename!
    const isInlineCid = !!attachment.contentId || attachment.contentDisposition === 'inline'

    // Cache-write voor volgende keer — await zodat Vercel het proces niet
    // halverwege freezet en signed URLs straks daadwerkelijk werken.
    if (email_uuid && isCacheable(fname, ct, contentBuffer.length, isInlineCid)) {
      try {
        await writeAttachmentToCache(user_id, email_uuid, fname, ct, contentBuffer)
      } catch (err) {
        console.warn('[email-attachment-cache] single-write mislukt:', err)
      }
    }

    return res.status(200).json({
      filename: fname,
      contentType: ct,
      size: contentBuffer.length,
      content: contentBuffer.toString('base64'),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('[email-attachment] error:', message)
    return res.status(500).json({ error: message })
  }
}
