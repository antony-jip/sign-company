import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { ImapFlow } from 'imapflow'
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
    const { folder = 'INBOX', limit = 50, offset = 0 } = req.body

    const settings = await getUserEmailSettings(userId)

    const client = new ImapFlow({
      host: settings.imap_host,
      port: settings.imap_port,
      secure: settings.imap_port === 993,
      auth: { user: settings.email, pass: settings.password },
      logger: false,
    })

    await client.connect()

    // Map folder names to Gmail IMAP folders
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
    const mailbox = await client.mailboxOpen(imapFolder)
    const total = mailbox.exists

    if (total === 0) {
      await client.logout()
      return res.status(200).json({ emails: [], total: 0 })
    }

    // Calculate range: fetch newest emails first
    const endSeq = Math.max(1, total - offset)
    const startSeq = Math.max(1, endSeq - limit + 1)

    const emails: Array<{
      uid: number
      from: string
      fromName: string
      to: string
      subject: string
      date: string
      isRead: boolean
      hasAttachments: boolean
    }> = []

    for await (const message of client.fetch(
      { seq: `${startSeq}:${endSeq}` },
      { envelope: true, flags: true, bodyStructure: true }
    )) {
      const from = message.envelope.from?.[0]
      const toAddresses = message.envelope.to || []

      emails.push({
        uid: message.uid,
        from: from?.address || '',
        fromName: from?.name || '',
        to: toAddresses.map((t: { address?: string }) => t.address || '').join(', '),
        subject: message.envelope.subject || '(geen onderwerp)',
        date: message.envelope.date?.toISOString() || '',
        isRead: message.flags?.has('\\Seen') || false,
        hasAttachments: hasAttachmentParts(message.bodyStructure),
      })
    }

    await client.logout()

    // Newest first
    emails.reverse()

    return res.status(200).json({ emails, total })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Emails ophalen mislukt'
    console.error('Emails ophalen mislukt:', error)
    return res.status(500).json({ emails: [], total: 0, error: msg })
  }
}

/**
 * Recursively check bodyStructure for attachment parts.
 */
function hasAttachmentParts(structure: unknown): boolean {
  if (!structure || typeof structure !== 'object') return false
  const s = structure as Record<string, unknown>

  // Check disposition
  if (s.disposition === 'attachment') return true

  // Check child parts
  if (Array.isArray(s.childNodes)) {
    for (const child of s.childNodes) {
      if (hasAttachmentParts(child)) return true
    }
  }

  return false
}
