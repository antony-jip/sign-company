import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import * as Sentry from '@sentry/node'

// ── Sentry init (inline; Vercel bundelt geen lokale modules in api/) ──
if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  const SENS = /password|app_password|encrypted_app_password|betaal_token|payment_token|access_token|refresh_token|mollie_api_key|authorization|cookie|secret|api_key|to|cc|bcc|email/i
  const scrub = (v: unknown, d = 0): unknown => {
    if (d > 6 || v == null) return v
    if (Array.isArray(v)) return v.map(x => scrub(x, d + 1))
    if (typeof v === 'object') {
      const o: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) o[k] = SENS.test(k) ? '[Filtered]' : scrub(val, d + 1)
      return o
    }
    return v
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) for (const k of Object.keys(event.request.headers)) if (/authorization|cookie/i.test(k)) (event.request.headers as Record<string, string>)[k] = '[Filtered]'
      if (event.request?.data) event.request.data = scrub(event.request.data) as typeof event.request.data
      if (event.user) { delete event.user.ip_address; delete event.user.email }
      return event
    },
  })
}

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

  // Service-modus voor cron-mailsync-werker, gelijk aan fetch-emails: alleen
  // met het cron-secret, en dat secret moet gezet zijn.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && token === cronSecret) {
    const serviceUser = req.body?.service_user_id
    if (typeof serviceUser !== 'string' || !serviceUser) throw new Error('Niet geautoriseerd')
    return serviceUser
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

// ───── Bodies in email_bodies (migratie 244), kopie van api/read-email.ts ─────
const MAX_BODY_TEXT = 20_000

// ── CITAAT-SPLITSING: letterlijke kopie van src/lib/mail/quoted.ts ──
// api/ importeert niets uit src; wijzig je daar iets, wijzig het hier en in
// api/read-email.ts mee, anders splitsen server en client anders.
const SPECIFIEKE_MARKERS: RegExp[] = [
  /<div[^>]*\bclass\s*=\s*["'][^"']*\bgmail_quote\b/i,
  /<div[^>]*\bid\s*=\s*["']divRplyFwdMsg["']/i,
  /<div[^>]*\bid\s*=\s*["']appendonsend["']/i,
  /<hr[^>]*\bid\s*=\s*["']stopSpelling["']/i,
  /-{2,}\s*(?:Original Message|Oorspronkelijk bericht|Ursprüngliche Nachricht|Message d'origine)\s*-{2,}/i,
  /(?:^|>|\n)\s*(?:<(?:b|strong|span)[^>]*>\s*)*(?:From|Van)\s*(?:<\/(?:b|strong|span)>\s*)*:[\s\S]{0,200}?(?:Sent|Verzonden|Date|Datum)\s*(?:<\/(?:b|strong|span)>\s*)*:/i,
  /\bOp\s[\s\S]{4,200}?\sschreef\s[\s\S]{0,300}?:/i,
  /\bOp\s[\s\S]{4,200}?\sheeft\s[\s\S]{0,300}?geschreven\s*:/i,
  /\bOn\s[\s\S]{4,200}?\swrote\s*:/i,
]

const BLOCKQUOTE = /<blockquote\b/i

const BLOK_TAGS = ['<div', '<p', '<blockquote', '<table', '<hr']
const IS_BLOK_TAG = /^<(?:div|p|blockquote|table|hr)[\s>/]/i
const OMSLUITENDE_OPENER = /<(?:div|blockquote|table|tbody|tr|td|th|section)\b[^>]*>\s*$/i
const MAX_TERUG = 400

function eersteTreffer(html: string, patronen: RegExp[]): number {
  let beste = -1
  for (const patroon of patronen) {
    const m = patroon.exec(html)
    if (!m) continue
    let index = m.index
    if (/^[>\n]/.test(m[0])) index += 1
    if (beste === -1 || index < beste) beste = index
  }
  return beste
}

function naarBlokStart(html: string, index: number): number {
  let pos = index
  if (!IS_BLOK_TAG.test(html.slice(index, index + 12))) {
    let dichtstbij = -1
    for (const tag of BLOK_TAGS) {
      const q = html.lastIndexOf(tag, index)
      if (q === -1 || index - q > MAX_TERUG) continue
      if (!IS_BLOK_TAG.test(html.slice(q, q + 12))) continue
      if (q > dichtstbij) dichtstbij = q
    }
    if (dichtstbij !== -1) pos = dichtstbij
  }
  for (;;) {
    const voor = html.slice(Math.max(0, pos - MAX_TERUG), pos)
    const m = OMSLUITENDE_OPENER.exec(voor)
    if (!m) break
    pos -= m[0].length
  }
  return pos
}

function heeftTekst(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
}

function splitsCitaat(html: string): { eigen: string; geciteerd: string | null } {
  if (!html) return { eigen: html || '', geciteerd: null }
  let index = eersteTreffer(html, SPECIFIEKE_MARKERS)
  if (index === -1) {
    const bq = BLOCKQUOTE.exec(html)
    index = bq ? bq.index : -1
  }
  if (index === -1) return { eigen: html, geciteerd: null }
  const knip = naarBlokStart(html, index)
  const eigen = html.slice(0, knip)
  const geciteerd = html.slice(knip)
  if (!heeftTekst(eigen)) return { eigen: html, geciteerd: null }
  return { eigen, geciteerd }
}
// ── EINDE KOPIE ──

/**
 * Kandidaten: rijen met uid in deze map zonder rij in email_bodies, nieuwste
 * eerst. PostgREST kent geen NOT EXISTS, dus in pagina's van 100 en per
 * pagina tegen email_bodies afstrepen; hoogstens vijf pagina's.
 */
async function zoekKandidaten(user_id: string, mapValue: string, gewenst: number): Promise<{ rijen: Rij[]; meer: boolean }> {
  const rijen: Rij[] = []
  const PAGINA = 100
  for (let pagina = 0; pagina < 5 && rijen.length <= gewenst; pagina++) {
    const { data: blok, error } = await supabaseAdmin
      .from('emails')
      .select('id, uid')
      .eq('user_id', user_id)
      .eq('map', mapValue)
      .not('uid', 'is', null)
      .order('datum', { ascending: false })
      .range(pagina * PAGINA, pagina * PAGINA + PAGINA - 1)
    if (error) throw new Error(error.message)
    if (!blok?.length) break

    const ids = blok.map((r) => r.id as string)
    const { data: metBody } = await supabaseAdmin
      .from('email_bodies')
      .select('email_id')
      .in('email_id', ids)
    const heeftBody = new Set((metBody || []).map((b) => b.email_id as string))
    for (const r of blok) {
      if (!heeftBody.has(r.id as string)) rijen.push({ id: r.id as string, uid: Number(r.uid) })
    }
    if (blok.length < PAGINA) break
  }
  return { rijen: rijen.slice(0, gewenst), meer: rijen.length > gewenst }
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

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for prefetch-email-bodies, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(30, '60 s'), prefix: 'rl:prefetch-email-bodies', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] prefetch-email-bodies id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] prefetch-email-bodies id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const gestart = Date.now()

  try {
    const { folder = 'INBOX', limit = 25 } = req.body || {}
    const user_id = await verifyUser(req)
    if (!(await enforceRateLimit(user_id, res))) return
    const creds = await getEmailCredentials(user_id)

    const mapValue = String(folder).toUpperCase() === 'INBOX' ? 'inbox' : String(folder).toLowerCase()
    const batchGrootte = Math.min(Math.max(Number(limit) || 25, 1), MAX_BATCH)

    // Nieuwste eerst: dat is wat de gebruiker zo gaat openen.
    const { rijen, meer: meerBeschikbaar } = await zoekKandidaten(user_id, mapValue, batchGrootte)

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

          const bodyText = (parsed.text || '').slice(0, MAX_BODY_TEXT)
          const { eigen, geciteerd } = splitsCitaat(bodyHtml)
          // De rij in email_bodies is de marker "geparsed", ook bij een mail
          // zonder HTML-deel (body_html leeg). emails.body_html blijft NULL.
          const { error: bodyErr } = await supabaseAdmin
            .from('email_bodies')
            .upsert({
              email_id: rijId,
              user_id,
              body_html: eigen,
              body_text: bodyText || null,
              quoted_html: geciteerd,
              bijgewerkt_op: new Date().toISOString(),
            }, { onConflict: 'email_id' })
          const { error: updateErr } = bodyErr ? { error: bodyErr } : await supabaseAdmin
            .from('emails')
            .update({
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
    Sentry.captureException(error)
    return res.status(500).json({ error: msg })
  }
}
