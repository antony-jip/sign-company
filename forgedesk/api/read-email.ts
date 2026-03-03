import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { createDecipheriv } from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
)

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || ''

function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  const [ivHex, encrypted] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

async function getUserEmailSettings(userId: string) {
  const { data, error } = await supabase
    .from('user_email_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new Error('Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.')
  }

  return {
    email: data.gmail_address,
    password: decrypt(data.encrypted_app_password),
    imap_host: data.imap_host || 'imap.gmail.com',
    imap_port: data.imap_port || 993,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const { uid, folder = 'INBOX' } = req.body

    if (!uid) {
      return res.status(400).json({ error: 'Email UID is verplicht' })
    }

    const settings = await getUserEmailSettings(userId)

    const client = new ImapFlow({
      host: settings.imap_host,
      port: settings.imap_port,
      secure: settings.imap_port === 993,
      auth: { user: settings.email, pass: settings.password },
      logger: false,
    })

    await client.connect()

    // Map folder names
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
    await client.mailboxOpen(imapFolder)

    // Fetch full email source by UID
    const message = await client.fetchOne(String(uid), {
      envelope: true,
      source: true,
      flags: true,
    })

    if (!message?.source) {
      await client.logout()
      return res.status(404).json({ error: 'Email niet gevonden' })
    }

    // Mark as read
    await client.messageFlagsAdd(String(uid), ['\\Seen'])

    await client.logout()

    // Parse with mailparser
    const parsed = await simpleParser(message.source)

    const attachments = (parsed.attachments || []).map((a) => ({
      filename: a.filename || 'bijlage',
      contentType: a.contentType || 'application/octet-stream',
      size: a.size || 0,
    }))

    return res.status(200).json({
      uid,
      from: parsed.from?.text || '',
      to: parsed.to?.text || '',
      cc: parsed.cc?.text || '',
      subject: parsed.subject || '',
      date: parsed.date?.toISOString() || '',
      bodyHtml: parsed.html || '',
      bodyText: parsed.text || '',
      attachments,
      messageId: parsed.messageId || '',
      inReplyTo: parsed.inReplyTo || '',
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Email ophalen mislukt'
    console.error('Email lezen mislukt:', error)
    return res.status(500).json({ error: msg })
  }
}
