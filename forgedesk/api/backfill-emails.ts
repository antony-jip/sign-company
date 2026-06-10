/**
 * Historie-backfill: haalt OUDERE mail binnen dan de eerste bootstrap-sync,
 * één UID-batch per call, van backfill_low_uid omlaag richting UID 1.
 *
 * De frontend roept dit herhaald aan (na de gewone sync) tot `done: true`.
 * Hoe ver terug bepaalt email_sync_state.backfill_target:
 * '1jaar' | '5jaar' | 'alles'. Zodra een batch volledig vóór de cutoff-datum
 * valt, stopt de backfill (backfill_done = true).
 *
 * Vereist migratie 131 (email_sync_state) en een eerdere bootstrap-sync
 * (fetch-emails zet backfill_low_uid).
 */
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

async function getEmailCredentials(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_email_settings')
    .select('gmail_address, encrypted_app_password, imap_host, imap_port')
    .eq('user_id', userId)
    .single()

  if (error || !data?.gmail_address || !data?.encrypted_app_password) {
    throw new Error('Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.')
  }

  return {
    gmail_address: data.gmail_address,
    app_password: decryptPassword(data.encrypted_app_password),
    imap_host: data.imap_host || 'imap.gmail.com',
    imap_port: data.imap_port || 993,
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

function cutoffVoorTarget(target: string): Date | null {
  if (target === '1jaar') return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  if (target === '5jaar') return new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
  return null // 'alles'
}

const BATCH_SIZE = 300

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let client: ImapFlow | null = null

  try {
    const { folder = 'inbox' } = req.body
    const user_id = await verifyUser(req)
    const mapValue = String(folder).toUpperCase() === 'INBOX' ? 'inbox' : String(folder).toLowerCase()

    const { data: state, error: stateErr } = await supabaseAdmin
      .from('email_sync_state')
      .select('id, imap_folder, uidvalidity, backfill_low_uid, backfill_done, backfill_target')
      .eq('user_id', user_id)
      .eq('folder', mapValue)
      .maybeSingle()

    if (stateErr) {
      return res.status(503).json({ error: 'Sync-state niet beschikbaar — is migratie 131 gedraaid?', done: false })
    }
    if (!state || !state.imap_folder || !state.backfill_low_uid) {
      // Nog geen bootstrap geweest — eerst gewoon syncen
      return res.status(200).json({ done: false, pending: true, synced: 0 })
    }
    if (state.backfill_done) {
      return res.status(200).json({ done: true, synced: 0 })
    }

    const lowUid = Number(state.backfill_low_uid)
    if (lowUid <= 1) {
      await supabaseAdmin.from('email_sync_state')
        .update({ backfill_done: true, updated_at: new Date().toISOString() })
        .eq('id', state.id)
      return res.status(200).json({ done: true, synced: 0 })
    }

    const creds = await getEmailCredentials(user_id)
    client = new ImapFlow({
      host: creds.imap_host,
      port: creds.imap_port,
      secure: creds.imap_port === 993,
      auth: { user: creds.gmail_address, pass: creds.app_password },
      logger: false,
      emitLogs: false,
      greetingTimeout: 5000,
      socketTimeout: 30000,
    })

    await client.connect()
    const mailbox = await client.mailboxOpen(state.imap_folder)

    // UIDVALIDITY gewijzigd sinds de bootstrap? Dan zijn alle UIDs ongeldig;
    // fetch-emails her-bootstrapt bij de volgende gewone sync.
    if (Number(mailbox.uidValidity ?? 0) !== Number(state.uidvalidity)) {
      await client.logout()
      return res.status(200).json({ done: false, pending: true, synced: 0, uidvalidityChanged: true })
    }

    const vanUid = Math.max(1, lowUid - BATCH_SIZE)
    const totUid = lowUid - 1

    const newEmails: Array<Record<string, unknown>> = []
    let oudsteDatum: Date | null = null

    for await (const message of client.fetch(
      { uid: `${vanUid}:${totUid}` },
      { envelope: true, flags: true, uid: true, bodyStructure: true }
    )) {
      if (!message.envelope) continue
      // IMAP-quirk: een uid-range kan de allerlaatste mail bevatten als de
      // mailbox kleiner is dan de range — filter strikt op het venster.
      if (!message.uid || message.uid < vanUid || message.uid > totUid) continue

      const from = message.envelope.from?.[0]
      const toAddresses = (message.envelope.to || []).map((t: { address?: string; name?: string }) => ({
        email: t.address || '',
        name: t.name || '',
      }))
      const ccAddresses = (message.envelope.cc || []).map((c: { address?: string; name?: string }) => ({
        email: c.address || '',
        name: c.name || '',
      }))
      const datum = message.envelope.date || new Date()
      if (!oudsteDatum || datum < oudsteDatum) oudsteDatum = datum
      const hasAttachments = hasAttachmentParts(message.bodyStructure)

      newEmails.push({
        user_id,
        uid: message.uid,
        message_id: message.envelope.messageId || null,
        in_reply_to: message.envelope.inReplyTo || null,
        imap_folder: state.imap_folder,
        map: mapValue,
        from_address: from?.address || '',
        from_name: from?.name || '',
        van: from?.name ? `${from.name} <${from.address}>` : (from?.address || ''),
        aan: toAddresses.map((t: { email: string }) => t.email).join(', '),
        to_addresses: toAddresses,
        cc_addresses: ccAddresses.length > 0 ? ccAddresses : null,
        onderwerp: message.envelope.subject || '(geen onderwerp)',
        datum: datum.toISOString(),
        gelezen: message.flags?.has('\\Seen') || false,
        bijlagen: hasAttachments ? 1 : 0,
        has_attachments: hasAttachments,
        gmail_id: String(message.uid),
        cached_at: new Date().toISOString(),
      })
    }

    await client.logout()
    client = null

    // Threading: oude mails kunnen parents zijn van al-gesyncte replies én
    // zelf replies op nog oudere mail. Eén pass zoals fetch-emails: parent
    // in DB → zelfde thread, anders nieuw thread_id.
    const inReplyTos = newEmails.filter((e) => e.in_reply_to).map((e) => e.in_reply_to as string)
    const threadMap = new Map<string, string>()
    if (inReplyTos.length > 0) {
      const { data: parentRows } = await supabaseAdmin
        .from('emails')
        .select('message_id, thread_id')
        .eq('user_id', user_id)
        .in('message_id', inReplyTos)
        .not('thread_id', 'is', null)
      for (const row of parentRows || []) {
        if (row.message_id && row.thread_id) threadMap.set(row.message_id, row.thread_id)
      }
    }
    // Oud → nieuw zodat replies binnen de batch hun parent vinden
    newEmails.sort((a, b) => String(a.datum).localeCompare(String(b.datum)))
    for (const email of newEmails) {
      const parentReply = email.in_reply_to as string | null
      if (parentReply && threadMap.has(parentReply)) {
        email.thread_id = threadMap.get(parentReply)
      } else {
        email.thread_id = crypto.randomUUID()
      }
      if (email.message_id && email.thread_id) {
        threadMap.set(email.message_id as string, email.thread_id as string)
      }
    }

    let synced = 0
    let fataleFout: string | null = null
    for (let i = 0; i < newEmails.length; i += 50) {
      const batch = newEmails.slice(i, i + 50)
      const { error } = await supabaseAdmin
        .from('emails')
        .upsert(batch, { onConflict: 'user_id,message_id', ignoreDuplicates: true })
      if (error) {
        fataleFout = error.message
        break
      }
      synced += batch.length
    }

    if (fataleFout) {
      // backfill_low_uid NIET opschuiven — volgende call probeert dit venster opnieuw
      return res.status(500).json({ error: `Opslaan mislukt: ${fataleFout}`, done: false, synced })
    }

    // Klaar met dit venster — grens omlaag, en check of we de cutoff voorbij zijn
    const cutoff = cutoffVoorTarget(state.backfill_target || '1jaar')
    const cutoffBereikt = !!cutoff && !!oudsteDatum && oudsteDatum < cutoff
    const klaar = vanUid <= 1 || cutoffBereikt

    await supabaseAdmin
      .from('email_sync_state')
      .update({
        backfill_low_uid: vanUid,
        backfill_done: klaar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.id)

    return res.status(200).json({
      done: klaar,
      synced,
      backfillLowUid: vanUid,
      oudsteDatum: oudsteDatum?.toISOString() ?? null,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Backfill mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ error: msg, done: false })
    }
    console.error('[backfill-emails] Fatal error:', error)
    return res.status(500).json({ error: msg, done: false })
  } finally {
    if (client) {
      try { await client.logout() } catch { /* al gesloten */ }
    }
  }
}
