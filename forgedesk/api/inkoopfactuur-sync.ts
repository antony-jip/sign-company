import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createDecipheriv, createHash } from 'crypto'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ENCRYPTION_KEY = process.env.INKOOPFACTUUR_ENCRYPTION_KEY || ''

function decrypt(encrypted: string): string {
  const buf = Buffer.from(encrypted, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  const key = createHash('sha256').update(ENCRYPTION_KEY).digest()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!ENCRYPTION_KEY) {
      return res.status(200).json({ success: false, error: 'INKOOPFACTUUR_ENCRYPTION_KEY niet geconfigureerd', verwerkt: 0, nieuwe_ids: [] })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisatie_id')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.organisatie_id) {
      return res.status(200).json({ success: false, error: 'Geen organisatie gevonden', verwerkt: 0, nieuwe_ids: [] })
    }

    const orgId = profile.organisatie_id

    const { data: config } = await supabase
      .from('inkoopfactuur_inbox_config')
      .select('*')
      .eq('organisatie_id', orgId)
      .eq('actief', true)
      .maybeSingle()

    if (!config) {
      return res.status(200).json({ success: false, error: 'Geen actieve inbox configuratie', verwerkt: 0, nieuwe_ids: [] })
    }

    let password: string
    try {
      password = decrypt(config.imap_password_encrypted)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      await supabase.from('inkoopfactuur_inbox_config').update({ laatste_error: `Decrypt mislukt: ${msg}`, updated_at: new Date().toISOString() }).eq('id', config.id)
      return res.status(200).json({ success: false, error: `Wachtwoord decryptie mislukt. Sla het wachtwoord opnieuw op. (${msg})`, verwerkt: 0, nieuwe_ids: [] })
    }

    const client = new ImapFlow({
      host: config.imap_host,
      port: config.imap_port,
      secure: config.imap_port === 993,
      auth: { user: config.imap_user, pass: password },
      logger: false,
      emitLogs: false,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    })

    const nieuweIds: string[] = []
    let hoogsteUid = config.laatste_uid

    try {
      await client.connect()

      const folder = config.gmail_label || 'INBOX'
      try {
        await client.mailboxOpen(folder, { readOnly: true })
      } catch {
        let beschikbaar = ''
        try {
          const mailboxes = await client.list()
          beschikbaar = mailboxes.map((m: { path: string }) => m.path).filter((p: string) => !p.startsWith('[Gmail]')).join(', ')
        } catch { /* ignore */ }
        await client.logout()
        await supabase.from('inkoopfactuur_inbox_config').update({ laatste_error: `Map "${folder}" niet gevonden`, updated_at: new Date().toISOString() }).eq('id', config.id)
        return res.status(200).json({ success: false, error: `Map "${folder}" niet gevonden.${beschikbaar ? ` Beschikbaar: ${beschikbaar}` : ''}`, verwerkt: 0, nieuwe_ids: [] })
      }

      const searchCriteria: Record<string, unknown> = config.laatste_uid > 0
        ? { uid: `${config.laatste_uid + 1}:*` }
        : { all: true }

      for await (const msg of client.fetch(searchCriteria, { uid: true, envelope: true, source: true })) {
        if (msg.uid <= config.laatste_uid) continue
        if (!msg.source) continue

        const parsed = await simpleParser(msg.source as Buffer)
        const pdfAttachments = (parsed.attachments || []).filter(
          (a: { contentType: string }) => a.contentType === 'application/pdf'
        )

        if (pdfAttachments.length === 0) {
          if (msg.uid > hoogsteUid) hoogsteUid = msg.uid
          continue
        }

        const messageId = (parsed as any).messageId || msg.envelope?.messageId || null

        if (messageId) {
          const { data: existing } = await supabase
            .from('inkoopfacturen')
            .select('id')
            .eq('organisatie_id', orgId)
            .eq('email_message_id', messageId)
            .limit(1)
          if (existing && existing.length > 0) {
            if (msg.uid > hoogsteUid) hoogsteUid = msg.uid
            continue
          }
        }

        for (const pdf of pdfAttachments) {
          const fileId = crypto.randomUUID()
          const storagePath = `${orgId}/${fileId}.pdf`

          const { error: uploadError } = await supabase.storage
            .from('inkoopfacturen')
            .upload(storagePath, pdf.content, { contentType: 'application/pdf', upsert: false })

          if (uploadError) {
            console.error(`[sync] PDF upload fout: ${uploadError.message}`)
            continue
          }

          const { data: factuur, error: insertError } = await supabase
            .from('inkoopfacturen')
            .insert({
              organisatie_id: orgId,
              pdf_storage_path: storagePath,
              email_subject: (parsed as any).subject || null,
              email_van: (parsed as any).from?.text || null,
              email_message_id: messageId,
              email_ontvangen_op: (parsed as any).date?.toISOString() || new Date().toISOString(),
              status: 'nieuw',
            })
            .select('id')
            .single()

          if (insertError) {
            console.error(`[sync] Insert fout: ${insertError.message}`)
            continue
          }

          nieuweIds.push(factuur.id)
        }

        if (msg.uid > hoogsteUid) hoogsteUid = msg.uid
      }
    } finally {
      try { await client.logout() } catch { /* best-effort */ }
    }

    await supabase.from('inkoopfactuur_inbox_config').update({
      laatste_uid: Math.max(hoogsteUid, config.laatste_uid),
      laatst_gecheckt_op: new Date().toISOString(),
      laatste_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', config.id)

    return res.status(200).json({ success: true, verwerkt: nieuweIds.length, nieuwe_ids: nieuweIds })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error(`[sync] Fout: ${message}`)
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(200).json({ success: false, error: message, verwerkt: 0, nieuwe_ids: [] })
    }
    return res.status(200).json({ success: false, error: message, verwerkt: 0, nieuwe_ids: [] })
  }
}
