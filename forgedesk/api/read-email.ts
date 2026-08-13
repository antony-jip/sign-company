import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Canonical version: src/utils/storageHelpers.ts — api/ kan geen src/ importeren (Vercel serverless constraint)
function sanitizeStorageFilename(naam: string, maxLength = 100): string {
  if (!naam || typeof naam !== 'string') return 'bestand'
  const lastDot = naam.lastIndexOf('.')
  const heeftExtensie = lastDot > 0 && lastDot < naam.length - 1
  const rawBase = heeftExtensie ? naam.slice(0, lastDot) : naam
  const rawExt = heeftExtensie ? naam.slice(lastDot + 1) : ''
  const sanitize = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[­​-‏﻿]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[._-]+|[._-]+$/g, '')
  const ext = sanitize(rawExt).toLowerCase().slice(0, 10)
  let base = sanitize(rawBase)
  if (!base) base = 'bestand'
  if (base.length > maxLength) base = base.slice(0, maxLength)
  return ext ? `${base}.${ext}` : base
}
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
    console.error('[decryptPassword] EMAIL_ENCRYPTION_KEY niet geconfigureerd')
    throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd — sla je wachtwoord opnieuw op in Instellingen > Email > Verbinding')
  }
  // g1: AES-256-GCM met willekeurige salt en auth-tag. Het oude CBC-formaat
  // gebruikte een vaste salt ('salt') en had geen integriteitscontrole, dus
  // geknoei aan de ciphertext viel niet op. Beide oude vormen blijven
  // leesbaar zodat niemand buitengesloten raakt.
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
  } catch (err) {
    console.error('[decryptPassword] AES decryptie mislukt:', err)
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

// ───── Folder-resolutie (gelijk aan api/fetch-emails.ts) ─────
// De client stuurt een logische mapnaam ('verzonden'), niet de echte
// IMAP-naam. Die verschilt per server: Gmail-NL heeft
// '[Gmail]/Verzonden berichten', Outlook 'Sent Items'. Een vaste tabel
// dekt daarom alleen Gmail; daarbuiten faalt de mailboxOpen.
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

// Special-use flags per logische folder. IMAP servers exposen deze via
// LIST extension (RFC 6154). Gmail, Outlook, FastMail e.a. ondersteunen het.
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

// Naam-fallback patterns als special-use ontbreekt
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
  flags?: Set<string> | string[]
}

async function resolveImapFolder(client: ImapFlow, folder: string): Promise<string> {
  const lower = folder.toLowerCase()

  // 1. INBOX is universeel
  if (lower === 'inbox') return 'INBOX'

  // 2. Probeer eerst de hardcoded mapping (werkt op Gmail-NL)
  const mapped = FOLDER_MAP[lower]
  if (mapped) {
    try {
      const status = await client.status(mapped, { messages: true })
      if (status) return mapped
    } catch {
      // mailbox bestaat niet, ga door naar dynamische fallback
    }
  }

  // 3. Dynamische fallback: list alle folders en zoek op special-use of naam
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
    console.error('[read-email] folder list lookup failed:', err)
  }

  // 4. Last resort: gebruik de input zoals hij is
  return folder
}

// ───── Persistent attachment-cache (sprint 3) ─────
const STORAGE_BUCKET = 'email-attachments'
const SIGNED_URL_TTL = 60 * 60 // 1 uur — voldoende voor reading-sessie
const MAX_CACHE_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_CACHE_PDF_BYTES = 25 * 1024 * 1024

interface RawAttachmentBuffer {
  filename: string
  contentType: string
  size: number
  buffer: Buffer
  isInlineCid: boolean
}

function isCacheableAttachment(rb: RawAttachmentBuffer): boolean {
  if (rb.isInlineCid || !rb.filename) return false
  if (!rb.buffer.length) return false
  const contentType = rb.contentType.toLowerCase()
  const ext = rb.filename.split('.').pop()?.toLowerCase() || ''
  const isImage = contentType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
  const isPdf = contentType === 'application/pdf' || ext === 'pdf'
  return (isImage && rb.size <= MAX_CACHE_IMAGE_BYTES) || (isPdf && rb.size <= MAX_CACHE_PDF_BYTES)
}

async function cacheAttachmentsToStorage(
  user_id: string,
  email_uuid: string,
  rawBuffers: RawAttachmentBuffer[],
): Promise<Map<string, string>> {
  const signedMap = new Map<string, string>()
  const cacheable = rawBuffers.filter(isCacheableAttachment)
  if (cacheable.length === 0) return signedMap

  const uploadResults = await Promise.all(cacheable.map(async (rb) => {
    const path = `${user_id}/${email_uuid}/${sanitizeStorageFilename(rb.filename)}`
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(path, rb.buffer, { contentType: rb.contentType, upsert: true })
    if (error) {
      console.warn('[email-attachment-cache] upload mislukt voor', rb.filename, error.message)
      return null
    }
    return { filename: rb.filename, content_type: rb.contentType, size: rb.buffer.length, storage_path: path }
  }))

  const uploaded = uploadResults.filter((r): r is NonNullable<typeof r> => r !== null)
  if (uploaded.length === 0) return signedMap

  const { error: insertErr } = await supabaseAdmin
    .from('email_attachment_cache')
    .upsert(
      uploaded.map((u) => ({
        user_id,
        email_uuid,
        filename: u.filename,
        content_type: u.content_type,
        size: u.size,
        storage_path: u.storage_path,
        cached_at: new Date().toISOString(),
      })),
      { onConflict: 'email_uuid,filename' },
    )
  if (insertErr) {
    console.warn('[email-attachment-cache] insert mislukt:', insertErr.message)
  }

  await Promise.all(uploaded.map(async (u) => {
    const { data } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(u.storage_path, SIGNED_URL_TTL)
    if (data?.signedUrl) signedMap.set(u.filename, data.signedUrl)
  }))
  return signedMap
}

async function readCachedSignedUrls(user_id: string, email_uuid: string): Promise<Map<string, string>> {
  const signedMap = new Map<string, string>()
  const { data: rows } = await supabaseAdmin
    .from('email_attachment_cache')
    .select('filename, storage_path')
    .eq('user_id', user_id)
    .eq('email_uuid', email_uuid)
  if (!rows?.length) return signedMap
  await Promise.all(rows.map(async (row) => {
    const { data } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL)
    if (data?.signedUrl) signedMap.set(row.filename, data.signedUrl)
  }))
  return signedMap
}

export const config = { maxDuration: 30 }

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for read-email, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(60, '60 s'), prefix: 'rl:read-email', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] read-email id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] read-email id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const {
      uid,
      folder = 'INBOX',
      markSeenOnly = false,
    } = req.body

    // Haal user_id uit JWT en credentials uit database (fallback naar request body)
    const user_id = await verifyUser(req)
    if (!(await enforceRateLimit(user_id, res))) return
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
        return res.status(400).json({ error: 'Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.' })
      }
    }

    if (!uid) {
      return res.status(400).json({ error: 'Email UID is verplicht' })
    }

    // `map` houdt de logische mapnaam vast, `imap_folder` de server-specifieke.
    // Die laatste kennen we pas ná een IMAP-verbinding, dus zoeken we rijen op
    // `map` — anders mist het cache-pad buiten INBOX altijd.
    const mapValue = folder.toUpperCase() === 'INBOX' ? 'inbox' : folder.toLowerCase()

    // Alleen markeren, geen body. De client heeft de body meestal al uit de
    // prefetch-cache; het lezen zelf raakt de vlaggen niet meer aan, dus een
    // echte klik zet \Seen via deze route.
    if (markSeenOnly) {
      await markeerGelezenOpImap({
        gmail_address, app_password, uid, folder, imap_host, imap_port,
      })
      return res.status(200).json({ ok: true })
    }

    // Step 1: Check Supabase cache first
    {

      const { data: cached } = await supabaseAdmin
        .from('emails')
        .select('id, van, aan, onderwerp, datum, gelezen, body_html, body_text, attachment_meta, message_id')
        .eq('user_id', user_id)
        .eq('uid', Number(uid))
        .eq('map', mapValue)
        .limit(1)
        .maybeSingle()

      // body_html NULL betekent: nog nooit volledig geparsed. Een lege string
      // betekent wél geparsed, maar de mail heeft geen HTML-deel. Alleen op
      // body_text afgaan was fout: de aanvraag-classifier vult die kolom ook,
      // en dan bleef de reader de kale tekstversie van een HTML-mail tonen.
      if (cached && cached.body_html !== null) {
        // Lookup gecachde bijlagen voor signed URLs (instant previews/downloads).
        const cachedSigned = await readCachedSignedUrls(user_id, cached.id)
        let meta = (cached.attachment_meta as Array<{ filename: string; contentType: string; size: number; isInlineCid?: boolean }> | null) || []

        // Meta van vóór de inline-detectie mist isInlineCid, waardoor
        // handtekening-logo's tussen de echte bijlagen blijven staan. De vlag
        // is niet af te leiden uit de opgeslagen body — daarin zijn de
        // cid:-verwijzingen al vervangen door data-URI's — dus eenmalig
        // opnieuw parsen en wegschrijven. Alleen bij ontbrekende vlag; een
        // mail zonder bijlagen raakt dit pad nooit.
        const metaOnvolledig = meta.length > 0 && meta.some((a) => typeof a?.isInlineCid !== 'boolean')
        if (metaOnvolledig) {
          try {
            const vers = await fetchFromIMAP({
              gmail_address, app_password, uid, folder, imap_host, imap_port,
            })
            meta = vers.attachments.map(({ filename, contentType, size, isInlineCid }) => ({
              filename, contentType, size, isInlineCid,
            }))
            // Teller en zoekfilter mee, zelfde reden als op het koude pad.
            const echteBijlagen = meta.filter((a) => !a.isInlineCid).length
            await supabaseAdmin
              .from('emails')
              .update({
                attachment_meta: meta.length > 0 ? meta : null,
                bijlagen: echteBijlagen,
                has_attachments: echteBijlagen > 0,
              })
              .eq('id', cached.id)
          } catch (err) {
            // Mail kan van de server verdwenen zijn; de cache blijft leesbaar.
            console.warn('[read-email] meta-aanvulling mislukt:', err)
          }
        }

        const attachmentsOut = meta.map((a) => ({
          ...a,
          storage_url: cachedSigned.get(a.filename),
        }))

        return res.status(200).json({
          uid,
          from: cached.van || '',
          to: cached.aan || '',
          cc: '',
          subject: cached.onderwerp || '',
          date: cached.datum || '',
          bodyHtml: cached.body_html || '',
          bodyText: cached.body_text || '',
          attachments: attachmentsOut,
          messageId: cached.message_id || '',
          inReplyTo: '',
          fromCache: true,
        })
      }

      // Step 2: Not in cache or no body — fetch from IMAP
      const result = await fetchFromIMAP({
        gmail_address, app_password, uid, folder, imap_host, imap_port,
      })

      // Step 3: Cache the result in Supabase. Strip inline image-bytes uit
      // attachment_meta — die zijn alleen voor de directe response, niet
      // bedoeld om in de DB-row te persisten (zou rijen onnodig opblazen).
      const attachmentMetaForDb = result.attachments.map(({ filename, contentType, size, isInlineCid }) => ({
        filename, contentType, size, isInlineCid,
      }))
      // De paperclip in de lijst hoort hetzelfde te tellen als de reader
      // toont: handtekening-logo's zijn geen bijlage. De sync kent dat
      // onderscheid niet (bodyStructure alleen), wij nu wel.
      // has_attachments gaat bewust mee: dat is de kolom waar het zoekfilter
      // `bijlage:ja` op draait. Corrigeren we alleen `bijlagen`, dan spreekt
      // de zoekbalk de lijst tegen. Hier weten we het zeker omdat de mail
      // geparsed is — nooit gokken op bodyStructure, dat blijft aan de sync.
      const echteBijlagen = attachmentMetaForDb.filter((a) => !a.isInlineCid).length
      let email_uuid: string | null = null
      if (cached) {
        // Update existing row with body
        await supabaseAdmin
          .from('emails')
          .update({
            body_html: result.bodyHtml,
            body_text: result.bodyText || null,
            attachment_meta: attachmentMetaForDb.length > 0 ? attachmentMetaForDb : null,
            bijlagen: echteBijlagen,
            has_attachments: echteBijlagen > 0,
            cached_at: new Date().toISOString(),
          })
          .eq('id', cached.id)
        email_uuid = cached.id
      } else {
        // Insert new row + select id terug voor de cache-FK
        const from = result.from
        const fromMatch = from.match(/^([^<]*)<([^>]+)>/)
        // Org-stempel bij ingest, gelijk aan fetch-emails: org-brede lezers
        // filteren op organisatie_id en de 168-backfill is eenmalig.
        const { data: orgProfiel } = await supabaseAdmin
          .from('profiles')
          .select('organisatie_id')
          .eq('id', user_id)
          .maybeSingle()
        const { data: upserted } = await supabaseAdmin
          .from('emails')
          .upsert({
            user_id,
            organisatie_id: (orgProfiel?.organisatie_id as string | null) ?? null,
            uid: Number(uid),
            message_id: result.messageId || null,
            imap_folder: result.imapFolder,
            map: mapValue,
            from_address: fromMatch ? fromMatch[2].trim() : from,
            from_name: fromMatch ? fromMatch[1].trim() : '',
            van: from,
            aan: result.to,
            onderwerp: result.subject || '(geen onderwerp)',
            datum: result.date || new Date().toISOString(),
            // Leesstatus komt van de server, niet van het feit dat wij de
            // body ophalen — dat gebeurt ook bij prefetch en hover.
            gelezen: result.seen,
            bijlagen: echteBijlagen,
            has_attachments: echteBijlagen > 0,
            attachment_meta: attachmentMetaForDb.length > 0 ? attachmentMetaForDb : null,
            body_html: result.bodyHtml,
            body_text: result.bodyText || null,
            inhoud: result.bodyHtml || result.bodyText || '',
            gmail_id: String(uid),
            cached_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,message_id',
            ignoreDuplicates: false,
          })
          .select('id')
          .maybeSingle()
        email_uuid = upserted?.id || null
        // Fallback: als upsert geen id terug gaf (bijv. message_id NULL),
        // doe een gerichte SELECT zodat we alsnog kunnen cachen.
        if (!email_uuid) {
          const { data: refetched } = await supabaseAdmin
            .from('emails')
            .select('id')
            .eq('user_id', user_id)
            .eq('uid', Number(uid))
            .eq('map', mapValue)
            .limit(1)
            .maybeSingle()
          email_uuid = refetched?.id || null
        }
        // Silently ignore cache write failures — user still gets the email
      }

      // Step 4: Cache binaries naar Storage (parallel) — alleen images < 10MB
      // en PDFs < 25MB. Bouw signed URLs voor de response.
      let signedMap = new Map<string, string>()
      if (email_uuid) {
        signedMap = await cacheAttachmentsToStorage(user_id, email_uuid, result.rawBuffers)
      }

      // Strip inline base64-`content` zodra storage_url beschikbaar is —
      // anders levert de response twee paden voor dezelfde bytes en
      // overschrijdt het de Vercel 4.5 MB body-limit (truncate → malformed JSON).
      const attachmentsOut = result.attachments.map((a) => {
        const storage_url = signedMap.get(a.filename)
        if (storage_url) {
          return { filename: a.filename, contentType: a.contentType, size: a.size, isInlineCid: a.isInlineCid, storage_url }
        }
        return a
      })

      return res.status(200).json({
        uid: result.uid,
        from: result.from,
        to: result.to,
        cc: result.cc,
        subject: result.subject,
        date: result.date,
        bodyHtml: result.bodyHtml,
        bodyText: result.bodyText,
        attachments: attachmentsOut,
        messageId: result.messageId,
        inReplyTo: result.inReplyTo,
      })
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Email ophalen mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ error: msg })
    }
    console.error('Email lezen mislukt:', error)
    return res.status(500).json({ error: msg })
  }
}

async function markeerGelezenOpImap(opts: {
  gmail_address: string
  app_password: string
  uid: number | string
  folder: string
  imap_host: string
  imap_port: number
}): Promise<void> {
  const client = new ImapFlow({
    host: opts.imap_host,
    port: opts.imap_port,
    secure: opts.imap_port === 993,
    auth: { user: opts.gmail_address, pass: opts.app_password },
    logger: false,
    emitLogs: false,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  })

  await client.connect()
  try {
    const imapFolder = await resolveImapFolder(client, opts.folder)
    await client.mailboxOpen(imapFolder)
    await client.messageFlagsAdd({ uid: `${opts.uid}:${opts.uid}` }, ['\\Seen'])
  } finally {
    try { await client.logout() } catch { /* al gesloten */ }
  }
}

async function fetchFromIMAP(opts: {
  gmail_address: string
  app_password: string
  uid: number | string
  folder: string
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
    greetingTimeout: 10000,
    socketTimeout: 30000,
  })

  await client.connect()

  // Finally, zodat een mislukte mailboxOpen of fetch geen IMAP-verbinding
  // laat hangen tot de socket-timeout.
  let message = null
  let imapFolder = opts.folder
  try {
    imapFolder = await resolveImapFolder(client, opts.folder)
    await client.mailboxOpen(imapFolder)

    // imapflow haalt de source op met BODY.PEEK, dus dit laat de \Seen-vlag
    // ongemoeid. Markeren gebeurt uitsluitend via markeerGelezenOpImap, want
    // dit pad draait ook op prefetch en hover — mail die de gebruiker nooit
    // opende mag niet gelezen raken in zijn echte mailbox.
    for await (const msg of client.fetch(
      { uid: `${opts.uid}:${opts.uid}` },
      { envelope: true, source: true, flags: true }
    )) {
      message = msg
      break
    }
  } finally {
    try { await client.logout() } catch { /* al gesloten */ }
  }

  if (!message || !('source' in message) || !message.source) {
    throw new Error('Email niet gevonden')
  }

  // Parse de email — we hebben de hele bytes al in handen. Body + meta voor
  // alle bijlagen, en optioneel inline base64-content voor image-bijlagen
  // onder 5 MB zodat de reader meteen thumbnails kan tonen zonder een tweede
  // IMAP-roundtrip via /api/email-attachment.
  const parsed = await simpleParser(message.source as Buffer, {
    skipImageLinks: true,
    skipTextLinks: true,
    skipTextToHtml: true,
  })

  const MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024
  const inlineImageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  const attachments = (parsed.attachments || []).map((a) => {
    const filename = a.filename || 'bijlage'
    const contentType = a.contentType || 'application/octet-stream'
    const size = a.size || 0
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const isImage = contentType.toLowerCase().startsWith('image/') || inlineImageExts.includes(ext)
    // CID-inline images (logo's in HTML-mails) zitten al in body_html als
    // data-URI; nogmaals meesturen blaast de response op tot tientallen MB
    // bij newsletters met veel inline beeldjes.
    // Alleen echt inline: er is een contentId én de body verwijst er ook
    // naar met cid:. Op alleen contentDisposition==='inline' afgaan is te
    // breed — iOS Mail en Outlook zetten dat ook op foto's die de afzender
    // wel degelijk als bijlage bedoelde, en die zou je dan verbergen.
    const cidNaam = a.contentId ? a.contentId.replace(/^<|>$/g, '') : ''
    const isInlineCid = !!cidNaam && (parsed.html || '').includes(`cid:${cidNaam}`)
    let inlineContent: string | undefined
    if (isImage && !isInlineCid && size > 0 && size <= MAX_INLINE_IMAGE_BYTES && a.content) {
      const buf = Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content)
      inlineContent = buf.toString('base64')
    }
    return inlineContent
      ? { filename, contentType, size, isInlineCid, content: inlineContent }
      : { filename, contentType, size, isInlineCid }
  })

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

  // Raw buffers voor de handler-laag (Storage-cache). Niet in de JSON-response;
  // wordt gestript voor we naar de client serializen.
  const rawBuffers = (parsed.attachments || []).map((a) => ({
    filename: a.filename || 'bijlage',
    contentType: a.contentType || 'application/octet-stream',
    size: a.size || 0,
    buffer: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content || ''),
    isInlineCid: !!a.contentId || a.contentDisposition === 'inline',
  }))

  const flags = message.flags as Set<string> | undefined

  return {
    uid: opts.uid,
    imapFolder,
    seen: flags?.has('\\Seen') ?? false,
    from: parsed.from?.text || '',
    to: Array.isArray(parsed.to) ? parsed.to.map(a => a.text).join(', ') : (parsed.to?.text || ''),
    cc: Array.isArray(parsed.cc) ? parsed.cc.map(a => a.text).join(', ') : (parsed.cc?.text || ''),
    subject: parsed.subject || '',
    date: parsed.date?.toISOString() || '',
    bodyHtml,
    bodyText: parsed.text || '',
    attachments,
    rawBuffers,
    messageId: parsed.messageId || '',
    inReplyTo: parsed.inReplyTo || '',
  }
}
