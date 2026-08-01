import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Waarom dit endpoint bestaat: api/fetch-emails.ts synct alleen ENVELOPE +
// bodyStructure, dus elke mail miste zijn body tot je 'm opende. Openen kostte
// daardoor een verse serverless-start plus een eigen IMAP-login — de traagheid
// die je op de telefoon voelt. Hier halen we tientallen bodies over ÉÉN
// verbinding op en schrijven ze weg, zodat de client ze uit Supabase leest en
// een tik geen netwerk meer kost.
//
// Bijlage-binaries gaan hier bewust NIET naar Storage: dat is het dure deel en
// het is pas nodig zodra iemand de mail echt opent. api/read-email.ts doet dat
// dan alsnog op de gecachte rij.

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
  if (encrypted.startsWith('g1:')) {
    try {
      const raw = Buffer.from(encrypted.slice(3), 'base64')
      const salt = raw.subarray(0, 16)
      const iv = raw.subarray(16, 28)
      const tag = raw.subarray(28, 44)
      const ct = raw.subarray(44)
      const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32)
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
    } catch {
      throw new Error('Wachtwoord ontsleutelen mislukt — sla je wachtwoord opnieuw op')
    }
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

// ───── Folder-resolutie (gelijk aan api/read-email.ts) ─────
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

const SPECIAL_USE_MAP: Record<string, string> = {
  inbox: '\\Inbox',
  verzonden: '\\Sent',
  sent: '\\Sent',
  concepten: '\\Drafts',
  drafts: '\\Drafts',
  prullenbak: '\\Trash',
  trash: '\\Trash',
  spam: '\\Junk',
  alle: '\\All',
  all: '\\All',
}

const NAME_PATTERNS: Record<string, RegExp> = {
  verzonden: /sent|verzonden|gesendet|envoy/i,
  sent: /sent|verzonden|gesendet|envoy/i,
  concepten: /draft|concept|brouillon|entwurf/i,
  drafts: /draft|concept|brouillon|entwurf/i,
  prullenbak: /trash|deleted|prullen|corbeille|papierkorb/i,
  trash: /trash|deleted|prullen|corbeille|papierkorb/i,
  spam: /spam|junk|ongewenst/i,
  alle: /all\s*mail|alle\s*berichten|all messages/i,
  all: /all\s*mail|alle\s*berichten|all messages/i,
}

interface ImapMailbox {
  path: string
  name?: string
  specialUse?: string
}

async function resolveImapFolder(client: ImapFlow, folder: string): Promise<string> {
  const lower = folder.toLowerCase()
  if (lower === 'inbox') return 'INBOX'

  const mapped = FOLDER_MAP[lower]
  if (mapped) {
    try {
      const status = await client.status(mapped, { messages: true })
      if (status) return mapped
    } catch {
      // mailbox bestaat niet, ga door naar dynamische fallback
    }
  }

  try {
    const mailboxes = (await client.list()) as ImapMailbox[]
    const wantedSpecialUse = SPECIAL_USE_MAP[lower]
    if (wantedSpecialUse) {
      const bySpecialUse = mailboxes.find((m) => m.specialUse === wantedSpecialUse)
      if (bySpecialUse) return bySpecialUse.path
    }
    const namePattern = NAME_PATTERNS[lower]
    if (namePattern) {
      const candidates = mailboxes.filter((m) => namePattern.test(m.path) || namePattern.test(m.name || ''))
      if (candidates.length > 0) {
        const gmailVariant = candidates.find((m) => m.path.startsWith('[Gmail]/'))
        return (gmailVariant || candidates[0]).path
      }
    }
  } catch (err) {
    console.error('[prefetch-email-bodies] folder list lookup failed:', err)
  }

  return folder
}

// Serverless heeft een harde limiet; we stoppen ruim daarvoor en melden hoeveel
// er nog open staat, zodat de client desgewenst nog een ronde vraagt.
export const config = { maxDuration: 60 }
const TIJDSBUDGET_MS = 45_000
const MAX_BATCH = 40

interface Rij {
  id: string
  uid: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const gestart = Date.now()

  try {
    const { folder = 'INBOX', limit = 25 } = req.body || {}
    const user_id = await verifyUser(req)
    const creds = await getEmailCredentials(user_id)

    const mapValue = String(folder).toUpperCase() === 'INBOX' ? 'inbox' : String(folder).toLowerCase()
    const batchGrootte = Math.min(Math.max(Number(limit) || 25, 1), MAX_BATCH)

    // Nieuwste eerst: dat is wat de gebruiker zo gaat openen.
    const { data: kandidaten, error: selectErr } = await supabaseAdmin
      .from('emails')
      .select('id, uid')
      .eq('user_id', user_id)
      .eq('map', mapValue)
      .is('body_html', null)
      .not('uid', 'is', null)
      .order('datum', { ascending: false })
      .limit(batchGrootte + 1)

    if (selectErr) throw new Error(selectErr.message)

    const rijen = ((kandidaten || []) as Rij[]).slice(0, batchGrootte)
    // De extra rij uit de query vertelt of er nog meer werk ligt zonder een
    // tweede count-query.
    const meerBeschikbaar = (kandidaten || []).length > batchGrootte

    if (rijen.length === 0) {
      return res.status(200).json({ verwerkt: 0, mislukt: 0, resterend: false })
    }

    const uidPerRij = new Map<number, string>()
    for (const r of rijen) uidPerRij.set(Number(r.uid), r.id)

    const client = new ImapFlow({
      host: creds.imap_host,
      port: creds.imap_port,
      secure: creds.imap_port === 993,
      auth: { user: creds.gmail_address, pass: creds.app_password },
      logger: false,
      emitLogs: false,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    })

    let verwerkt = 0
    let mislukt = 0
    let afgebrokenOpTijd = false

    await client.connect()
    try {
      const imapFolder = await resolveImapFolder(client, String(folder))
      await client.mailboxOpen(imapFolder, { readOnly: true })

      const uidLijst = [...uidPerRij.keys()].sort((a, b) => b - a).join(',')

      // BODY.PEEK: het ophalen van een body mag de \Seen-vlag niet zetten —
      // dit draait op mail die de gebruiker nog niet geopend heeft.
      for await (const message of client.fetch({ uid: uidLijst }, { uid: true, source: true, flags: true })) {
        if (Date.now() - gestart > TIJDSBUDGET_MS) {
          afgebrokenOpTijd = true
          break
        }

        const rijId = uidPerRij.get(Number(message.uid))
        if (!rijId || !message.source) continue

        try {
          const parsed = await simpleParser(message.source as Buffer, {
            skipImageLinks: true,
            skipTextLinks: true,
            skipTextToHtml: true,
          })

          // Inline cid:-afbeeldingen als data-URI inbakken, gelijk aan
          // read-email — anders toont de reader kapotte logo's.
          let bodyHtml = parsed.html || ''
          if (bodyHtml && parsed.attachments?.length) {
            for (const att of parsed.attachments) {
              if (att.contentId && att.content) {
                const cid = att.contentId.replace(/^<|>$/g, '')
                const b64 = att.content.toString('base64')
                const dataUri = `data:${att.contentType || 'application/octet-stream'};base64,${b64}`
                bodyHtml = bodyHtml.split(`cid:${cid}`).join(dataUri)
              }
            }
          }

          const attachmentMeta = (parsed.attachments || []).map((a) => {
            const filename = a.filename || 'bijlage'
            const cidNaam = a.contentId ? a.contentId.replace(/^<|>$/g, '') : ''
            const isInlineCid = !!cidNaam && (parsed.html || '').includes(`cid:${cidNaam}`)
            return {
              filename,
              contentType: a.contentType || 'application/octet-stream',
              size: a.size || 0,
              isInlineCid,
            }
          })
          const echteBijlagen = attachmentMeta.filter((a) => !a.isInlineCid).length

          const bodyText = parsed.text || ''
          const { error: updateErr } = await supabaseAdmin
            .from('emails')
            .update({
              // Lege string, niet null: null betekent "nooit geparsed" en zou
              // read-email opnieuw de IMAP-route in sturen.
              body_html: bodyHtml,
              body_text: bodyText || null,
              attachment_meta: attachmentMeta.length > 0 ? attachmentMeta : null,
              bijlagen: echteBijlagen,
              has_attachments: echteBijlagen > 0,
              cached_at: new Date().toISOString(),
            })
            .eq('id', rijId)

          if (updateErr) {
            mislukt++
            console.warn('[prefetch-email-bodies] update mislukt voor', rijId, updateErr.message)
          } else {
            verwerkt++
          }
        } catch (parseErr) {
          mislukt++
          console.warn('[prefetch-email-bodies] parsen mislukt voor uid', message.uid, parseErr instanceof Error ? parseErr.message : parseErr)
        }
      }
    } finally {
      try { await client.logout() } catch { /* al gesloten */ }
    }

    return res.status(200).json({
      verwerkt,
      mislukt,
      resterend: meerBeschikbaar || afgebrokenOpTijd,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Bodies voorladen mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ error: msg })
    }
    console.error('[prefetch-email-bodies] mislukt:', error)
    return res.status(500).json({ error: msg })
  }
}
