import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const {
      gmail_address,
      app_password,
      uid,
      folder = 'INBOX',
      imap_host = 'imap.gmail.com',
      imap_port = 993,
    } = req.body

    if (!gmail_address || !app_password) {
      return res.status(400).json({ error: 'E-mailadres en app-wachtwoord zijn verplicht' })
    }

    if (!uid) {
      return res.status(400).json({ error: 'Email UID is verplicht' })
    }

    const client = new ImapFlow({
      host: imap_host,
      port: imap_port,
      secure: imap_port === 993,
      auth: { user: gmail_address, pass: app_password },
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

    if (!message || !('source' in message) || !message.source) {
      await client.logout()
      return res.status(404).json({ error: 'Email niet gevonden' })
    }

    // Mark as read
    await client.messageFlagsAdd(String(uid), ['\\Seen'])

    await client.logout()

    // Parse with mailparser
    const parsed = await simpleParser(message.source as Buffer)

    const attachments = (parsed.attachments || []).map((a) => ({
      filename: a.filename || 'bijlage',
      contentType: a.contentType || 'application/octet-stream',
      size: a.size || 0,
    }))

    return res.status(200).json({
      uid,
      from: parsed.from?.text || '',
      to: Array.isArray(parsed.to) ? parsed.to.map(a => a.text).join(', ') : (parsed.to?.text || ''),
      cc: Array.isArray(parsed.cc) ? parsed.cc.map(a => a.text).join(', ') : (parsed.cc?.text || ''),
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
