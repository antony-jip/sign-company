import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const {
      gmail_address,
      app_password,
      folder = 'INBOX',
      limit = 50,
      offset = 0,
      imap_host = 'imap.gmail.com',
      imap_port = 993,
    } = req.body

    if (!gmail_address || !app_password) {
      return res.status(400).json({ error: 'E-mailadres en app-wachtwoord zijn verplicht' })
    }

    const client = new ImapFlow({
      host: imap_host,
      port: imap_port,
      secure: imap_port === 993,
      auth: { user: gmail_address, pass: app_password },
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
      if (!message.envelope) continue

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
