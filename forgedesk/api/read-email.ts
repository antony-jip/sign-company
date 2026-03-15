import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { supabaseAdmin, verifyUser, getEmailCredentials } from './_shared'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const {
      uid,
      folder = 'INBOX',
    } = req.body

    // Haal user_id uit JWT en credentials uit database
    const user_id = await verifyUser(req)
    const { gmail_address, app_password, imap_host, imap_port } = await getEmailCredentials(user_id)

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
        .select('*')
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
          .catch(() => {
            // Silently fail cache write — user still gets the email
          })
      }

      return res.status(200).json(result)
    }

    // No Supabase — direct IMAP fetch (original behavior)
    const result = await fetchFromIMAP({
      gmail_address, app_password, uid, imapFolder, imap_host, imap_port,
    })
    return res.status(200).json(result)
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
    greetingTimeout: 5000,
    socketTimeout: 10000,
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

  const parsed = await simpleParser(message.source as Buffer)

  const attachments = (parsed.attachments || []).map((a) => ({
    filename: a.filename || 'bijlage',
    contentType: a.contentType || 'application/octet-stream',
    size: a.size || 0,
  }))

  return {
    uid: opts.uid,
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
  }
}
