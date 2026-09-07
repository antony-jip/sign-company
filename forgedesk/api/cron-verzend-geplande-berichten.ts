/**
 * Verstuurt geplande emails uit de queue.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET} header.
 * Vercel Cron stuurt deze automatisch mee op basis van vercel.json.
 *
 * Handmatig testen (na deploy):
 * curl -H "Authorization: Bearer $CRON_SECRET" \
 *   https://app.doen.team/api/cron-verzend-geplande-berichten
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import nodemailer from 'nodemailer'
import { ImapFlow } from 'imapflow'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
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

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

function decryptPassword(encrypted: string): string {
  if (encrypted.startsWith('b64:')) {
    return Buffer.from(encrypted.slice(4), 'base64').toString('utf8')
  }
  const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
  if (!ENCRYPTION_KEY) {
    throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  }
  // g1: AES-256-GCM met willekeurige salt en auth-tag. Het oude CBC-formaat
  // had een vaste salt en geen integriteitscontrole. Beide oude vormen blijven
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
  } catch {
    throw new Error('Wachtwoord ontsleutelen mislukt — sla je wachtwoord opnieuw op')
  }
}

// ── GEDEELD-MET-API: insert met account-terugval ──────────────────────────
// account_id komt uit migratie 245. Zolang die niet gedraaid is faalt een
// insert met dat veld in zijn geheel op 42703, en dan zou een mail die al
// verstuurd is niet meer opgeslagen worden. Eén keer opnieuw zonder het veld.
function isAccountKolomFout(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  return fout.code === '42703' || fout.code === 'PGRST204'
    || /column .* does not exist|could not find the .* column/i.test(fout.message || '')
}

async function insertMetAccountTerugval(tabel: string, rij: Record<string, unknown>) {
  const eerste = await supabaseAdmin.from(tabel).insert(rij).select('id').single()
  if (!eerste.error || !('account_id' in rij) || !isAccountKolomFout(eerste.error)) return eerste
  const zonder = { ...rij }
  delete zonder.account_id
  return await supabaseAdmin.from(tabel).insert(zonder).select('id').single()
}
// ── GEDEELD-MET-API EINDE: insert met account-terugval ────────────────────

function extractBareEmail(address: string): string {
  const trimmed = address.trim()
  const match = trimmed.match(/<([^>]+)>/)
  return (match?.[1] || trimmed).toLowerCase()
}

// ── GEDEELD-MET-API: credentials per postvak ──────────────────────────────
// Een gebruiker kan meer postvakken hebben (migratie 245, activering in 246),
// dus `.single()` op user_id klapt zodra er een tweede rij bijkomt en meldt dan
// misleidend dat er geen instellingen zijn. Volgorde: het meegestuurde
// account_id, anders het postvak met `is_standaard`, anders de enige rij.
// auth_type en de drie oauth-kolommen komen uit migratie 244; ontbreken die,
// dan antwoordt PostgREST met 42703 of PGRST204 en faalt de HELE select, dus
// blijft de terugval op de kolommen van vóór 244 staan.
// Dezelfde helper hoort in fetch-emails, read-email, prefetch-email-bodies,
// email-imap-action, backfill-emails, test-email-connection, email-settings,
// send-email, mail-oauth-token en cron-verzend-geplande-berichten.
interface CredentialRij {
  id?: string | null
  user_id?: string | null
  /** 'persoonlijk' of 'gedeeld' (migratie 245). Ontbreekt de kolom, dan persoonlijk. */
  soort?: string | null
  organisatie_id?: string | null
  gmail_address: string | null
  encrypted_app_password: string | null
  smtp_host: string | null
  smtp_port: number | null
  imap_host: string | null
  imap_port: number | null
  auth_type: string | null
  oauth_refresh_token_enc: string | null
  oauth_access_token_enc: string | null
  oauth_token_verloopt_op: string | null
}

const CREDENTIAL_KOLOMMEN_VOOR_244 = 'id, user_id, gmail_address, encrypted_app_password, smtp_host, smtp_port, imap_host, imap_port'
const CREDENTIAL_KOLOMMEN = `${CREDENTIAL_KOLOMMEN_VOOR_244}, auth_type, oauth_refresh_token_enc, oauth_access_token_enc, oauth_token_verloopt_op, soort, organisatie_id`

function isKolomFout(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  if (fout.code === '42703' || fout.code === 'PGRST204') return true
  return /column .* does not exist|could not find the .* column/i.test(fout.message || '')
}

// ── GEDEELD-POSTVAK-TOEGANG BEGIN ─────────────────────────────────────────
// Een gedeeld postvak (migratie 245, `soort = 'gedeeld'`) hoort bij de
// organisatie en niet bij één persoon. Een collega mag er dus bij, en dat kan
// niet met een blind filter op user_id: dan is een gedeeld postvak alleen te
// gebruiken door degene die het gekoppeld heeft.
//
// Daarom zoeken we bij een expliciet postvak op id en beoordelen we de toegang
// daarna. De regel is streng: je eigen rij mag altijd, die van een ander alleen
// als hij gedeeld is én bij jouw organisatie hoort. Ontbreekt `soort` (database
// zonder 245), dan is er geen gedeeld postvak en blijft het antwoord nee.
async function magBijPostvak(
  rij: { user_id?: unknown; soort?: unknown; organisatie_id?: unknown },
  userId: string,
): Promise<boolean> {
  if (rij.user_id === userId) return true
  if (rij.soort !== 'gedeeld' || !rij.organisatie_id) return false
  const { data } = await supabaseAdmin.from('profiles').select('organisatie_id').eq('id', userId).maybeSingle()
  const eigenOrg = (data as { organisatie_id?: string | null } | null)?.organisatie_id
  return !!eigenOrg && eigenOrg === rij.organisatie_id
}
// ── GEDEELD-POSTVAK-TOEGANG EINDE ─────────────────────────────────────────

async function leesCredentialRij(userId: string, accountId?: string | null): Promise<CredentialRij | null> {
  async function haalRij(keuze: 'account' | 'standaard' | 'enige') {
    const bouw = (kolommen: string) => {
      // Bij een expliciet postvak zoeken we op id, niet op user_id: een gedeeld
      // postvak staat op naam van een collega. magBijPostvak beslist daarna.
      let vraag = keuze === 'account'
        ? supabaseAdmin.from('user_email_settings').select(kolommen).eq('id', accountId as string)
        : supabaseAdmin.from('user_email_settings').select(kolommen).eq('user_id', userId)
      if (keuze === 'standaard') vraag = vraag.eq('is_standaard', true)
      return vraag.maybeSingle()
    }
    const volledig = await bouw(CREDENTIAL_KOLOMMEN)
    if (!isKolomFout(volledig.error)) {
      return { rij: (volledig.data as unknown as CredentialRij | null) ?? null, fout: volledig.error }
    }
    const oud = await bouw(CREDENTIAL_KOLOMMEN_VOOR_244)
    const rij = (oud.data as unknown as CredentialRij | null) ?? null
    return {
      rij: rij ? { ...rij, auth_type: 'wachtwoord', oauth_refresh_token_enc: null, oauth_access_token_enc: null, oauth_token_verloopt_op: null } : null,
      fout: oud.error,
    }
  }

  if (accountId) {
    const uitkomst = await haalRij('account')
    if (uitkomst.fout || !uitkomst.rij) {
      throw new Error('Dit postvak bestaat niet of hoort niet bij jou. Kies een ander postvak onder Instellingen > E-mail.')
    }
    if (!(await magBijPostvak(uitkomst.rij as unknown as Record<string, unknown>, userId))) {
      throw new Error('Dit postvak bestaat niet of hoort niet bij jou. Kies een ander postvak onder Instellingen > E-mail.')
    }
    return uitkomst.rij
  }
  // is_standaard bestaat pas sinds migratie 245; ontbreekt de kolom of staan er
  // meer standaard-rijen, dan beslist de volgende poging.
  const standaard = await haalRij('standaard')
  if (!standaard.fout && standaard.rij) return standaard.rij
  const enige = await haalRij('enige')
  if (enige.fout) {
    throw new Error('Er zijn meer postvakken gekoppeld en geen ervan is de standaard. Kies een postvak onder Instellingen > E-mail.')
  }
  return enige.rij
}
// ── GEDEELD-MET-API EINDE: credentials per postvak ────────────────────────

interface UserCreds {
  /** Rij-id van het postvak; pas gevuld als migratie 245 gedraaid is. */
  account_id: string | null
  gmail_address: string
  password: string
  smtp_host: string
  smtp_port: number
  imap_host: string
  imap_port: number
  fromName?: string
}

// Deze cron kent geen OAuth-pad: zonder app-wachtwoord blijft het bericht
// wachten, precies zoals voorheen.
async function getUserCreds(userId: string, accountId?: string | null): Promise<UserCreds | null> {
  let settings: CredentialRij | null = null
  try {
    settings = await leesCredentialRij(userId, accountId)
  } catch (err) {
    console.warn('[cron-verzend] postvak niet gevonden:', err instanceof Error ? err.message : err)
    return null
  }

  if (!settings?.gmail_address || !settings?.encrypted_app_password) return null

  // Afzendernaam staat per-user op profiles (migratie 091); bedrijfsnaam als fallback.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('bedrijfsnaam, afzender_naam')
    .eq('id', userId)
    .maybeSingle()

  const afzenderNaam = (profile?.afzender_naam || '').trim() || null
  const fromName = afzenderNaam || profile?.bedrijfsnaam?.trim() || undefined

  return {
    account_id: (settings.id as string) ?? null,
    gmail_address: settings.gmail_address,
    password: decryptPassword(settings.encrypted_app_password),
    smtp_host: settings.smtp_host || 'smtp.gmail.com',
    smtp_port: settings.smtp_port || 587,
    imap_host: settings.imap_host || 'imap.gmail.com',
    imap_port: settings.imap_port || 993,
    fromName,
  }
}

// ── Verzonden naar de server (kopie van api/send-email.ts) ────────────────
// Gmail bewaart bij verzenden via smtp.gmail.com zelf een kopie; daar zou een
// APPEND een dubbel opleveren en haalt de Verzonden-sync de uid op.
interface ImapMailbox {
  path: string
  name?: string
  specialUse?: string
}

const VERZONDEN_KANDIDATEN = ['[Gmail]/Verzonden berichten', '[Gmail]/Sent Mail', 'Sent', 'Sent Items', 'Verzonden items', 'INBOX.Sent']
const VERZONDEN_PATROON = /sent|verzonden|gesendet|envoy/i

async function zoekVerzondenMap(client: ImapFlow): Promise<string | null> {
  try {
    const mailboxen = (await client.list()) as ImapMailbox[]
    const opSpecialUse = mailboxen.find((m) => m.specialUse === '\\Sent')
    if (opSpecialUse) return opSpecialUse.path
    for (const kandidaat of VERZONDEN_KANDIDATEN) {
      if (mailboxen.some((m) => m.path === kandidaat)) return kandidaat
    }
    const opNaam = mailboxen.filter((m) => VERZONDEN_PATROON.test(m.path) || VERZONDEN_PATROON.test(m.name || ''))
    if (opNaam.length > 0) {
      const gmailVariant = opNaam.find((m) => m.path.startsWith('[Gmail]/'))
      return (gmailVariant || opNaam[0]).path
    }
  } catch (err) {
    console.warn('[cron-verzend] mappenlijst ophalen mislukt:', err instanceof Error ? err.message : err)
  }
  return null
}

function isGmailHost(host: string): boolean {
  return /gmail\.com$|googlemail\.com$/i.test(host)
}

async function verzondenNaarServerAan(userId: string): Promise<boolean> {
  try {
    const { data: profiel } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id')
      .eq('id', userId)
      .maybeSingle()
    const orgId = (profiel?.organisatie_id as string | null) ?? null
    if (!orgId) return true
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('functies')
      .eq('organisatie_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const functies = (data?.functies ?? {}) as Record<string, unknown>
    return functies.mail_verzonden_naar_server !== false
  } catch {
    return true
  }
}

async function bewaarInVerzonden(opts: {
  raw: Buffer
  gmail_address: string
  app_password: string
  imap_host: string
  imap_port: number
}): Promise<{ uid: number | null; imapFolder: string | null }> {
  if (isGmailHost(opts.imap_host)) return { uid: null, imapFolder: null }
  const client = new ImapFlow({
    host: opts.imap_host,
    port: opts.imap_port,
    secure: opts.imap_port === 993,
    auth: { user: opts.gmail_address, pass: opts.app_password },
    logger: false,
    emitLogs: false,
    greetingTimeout: 8000,
    socketTimeout: 20000,
  })
  try {
    await client.connect()
    const map = await zoekVerzondenMap(client)
    if (!map) {
      console.warn('[cron-verzend] geen Verzonden-map gevonden, APPEND overgeslagen')
      return { uid: null, imapFolder: null }
    }
    const uitkomst = await client.append(map, opts.raw, ['\\Seen'], new Date())
    if (!uitkomst) return { uid: null, imapFolder: map }
    return { uid: uitkomst.uid ?? null, imapFolder: uitkomst.destination || map }
  } catch (err) {
    console.error('[cron-verzend] APPEND in Verzonden mislukt:', err instanceof Error ? err.message : err)
    Sentry.captureException(err, { tags: { phase: 'imap-append-sent' } })
    return { uid: null, imapFolder: null }
  } finally {
    try { await client.logout() } catch { /* al gesloten */ }
  }
}

export const config = { maxDuration: 60 }

// Spiegel van attachmentToegestaan in api/send-email.ts. api/-bestanden mogen
// niets delen (Vercel serverless), dus dit staat er bewust dubbel in.
//
// Zonder deze controle downloadde de cron elk pad dat in de rij stond. Die rij
// wordt door de client geschreven, dus je kon een bericht aan jezelf inplannen
// met het pad van een ander bedrijf erin en kreeg het bestand gemaild. Erger:
// cleanupAfter stond standaard aan, dus daarna werd het ook nog verwijderd.
async function bijlageToegestaan(
  bucket: string,
  path: string,
  orgId: string | null,
  userId: string,
): Promise<boolean> {
  if (!path || path.includes('..') || path.startsWith('/') || path.includes('\\')) return false

  if (bucket === 'documenten-prive') {
    const seg = path.split('/')
    if (seg[0] === 'email-bijlagen' || seg[0] === 'email-bijlagen-groot') return seg[1] === userId
    if (!orgId) return false
    const { data } = await supabaseAdmin
      .from('documenten')
      .select('id')
      .eq('storage_path', path)
      .eq('organisatie_id', orgId)
      .maybeSingle()
    return !!data
  }

  if (bucket === 'facturen') {
    if (!orgId) return false
    const { data } = await supabaseAdmin
      .from('facturen').select('id')
      .eq('pdf_storage_path', path).eq('organisatie_id', orgId).maybeSingle()
    return !!data
  }

  if (bucket === 'factuur-bijlagen') {
    if (!orgId) return false
    const { data } = await supabaseAdmin
      .from('factuur_bijlagen').select('id')
      .eq('storage_path', path).eq('organisatie_id', orgId).maybeSingle()
    return !!data
  }

  return false
}

/**
 * De rauwe MIME-boodschap voor de IMAP-APPEND naar Verzonden.
 *
 * Hier stond `new MailComposer(...)` uit 'nodemailer/lib/mail-composer'. Dat is
 * een greep in de binnenkant van het pakket, buiten de openbare API om, en
 * precies de twee bestanden met die import waren de twee functies die op Vercel
 * niet meer wilden laden: elk verzoek eindigde in FUNCTION_INVOCATION_FAILED,
 * nog voor de eerste regel van de handler. De gewone API doet hetzelfde werk:
 * een transport in stream-modus verstuurt niets en geeft de opgebouwde
 * boodschap terug.
 */
async function bouwRuweMail(opties: Record<string, unknown>): Promise<Buffer> {
  const bouwer = nodemailer.createTransport({ streamTransport: true, buffer: true })
  const info = await bouwer.sendMail(opties as Parameters<typeof bouwer.sendMail>[0])
  const boodschap = (info as { message?: unknown }).message
  if (Buffer.isBuffer(boodschap)) return boodschap
  if (typeof boodschap === 'string') return Buffer.from(boodschap)
  throw new Error('MIME-boodschap kon niet worden opgebouwd')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const nu = new Date().toISOString()

    // Opruimer: een run die halverwege stierf (timeout, deploy) laat rijen op
    // 'verwerken' achter en niemand pakt die nog op. De tabel heeft geen
    // claim-tijdstip, dus scheduled_at is de ondergrens: tien minuten na het
    // geplande moment nog 'verwerken' betekent vast. Niet opnieuw versturen
    // (de mail kan al weg zijn), wel de gebruiker laten weten.
    const vastGrens = new Date(Date.now() - 10 * 60_000).toISOString()
    const { data: vast } = await supabaseAdmin
      .from('ingeplande_berichten')
      .update({ status: 'mislukt', foutmelding: 'Verzending bleef hangen; controleer of het bericht is aangekomen en plan het zo nodig opnieuw.' })
      .eq('status', 'verwerken')
      .lt('scheduled_at', vastGrens)
      .select('id, user_id, onderwerp')
    if (vast && vast.length > 0) {
      console.warn(`[cron] ${vast.length} hangende berichten op mislukt gezet`)
      const { error: notifFout } = await supabaseAdmin.from('notificaties').insert(
        vast.map(b => ({
          user_id: b.user_id,
          type: 'algemeen',
          titel: 'Gepland bericht niet verzonden',
          bericht: `"${b.onderwerp || 'Zonder onderwerp'}" bleef hangen tijdens het verzenden. Controleer je verzonden items en plan het zo nodig opnieuw.`,
          link: '/email',
          gelezen: false,
        }))
      )
      if (notifFout) console.error('[cron] notificatie voor hangende berichten mislukt:', notifFout)
    }

    const { data: due, error: fetchError } = await supabaseAdmin
      .from('ingeplande_berichten')
      .select('*')
      .eq('status', 'wachtend')
      .lte('scheduled_at', nu)
      .limit(50)

    if (fetchError) {
      console.error('[cron] Wachtende berichten ophalen mislukt:', fetchError)
      return res.status(500).json({ error: fetchError.message })
    }

    if (!due || due.length === 0) {
      return res.status(200).json({ processed: 0 })
    }

    console.log(`[cron] ${due.length} berichten te verwerken`)

    let verzonden = 0
    let mislukt = 0

    for (const bericht of due) {
      try {
        // Atomic claim: alleen verwerken als deze run de 'wachtend'-rij pakt.
        // Voorkomt dubbel verzenden bij overlappende cron-runs of wanneer de
        // status-update na verzenden faalt (rij is dan geen 'wachtend' meer).
        const { data: claimed } = await supabaseAdmin
          .from('ingeplande_berichten')
          .update({ status: 'verwerken' })
          .eq('id', bericht.id)
          .eq('status', 'wachtend')
          .select('id')
          .maybeSingle()
        if (!claimed) continue

        // account_id staat op de rij sinds migratie 245; ontbreekt de kolom of
        // is de rij ouder, dan valt getUserCreds terug op het standaardpostvak.
        const creds = await getUserCreds(bericht.user_id, (bericht.account_id as string | null) ?? null)
        if (!creds) {
          throw new Error('Geen email instellingen gevonden voor user')
        }

        const transporter = nodemailer.createTransport({
          host: creds.smtp_host,
          port: creds.smtp_port,
          secure: creds.smtp_port === 465,
          auth: { user: creds.gmail_address, pass: creds.password },
        })

        const fromAddress = creds.fromName
          ? `"${creds.fromName.replace(/"/g, '')}" <${creds.gmail_address}>`
          : creds.gmail_address

        const mailOptions: Record<string, unknown> = {
          from: fromAddress,
          to: bericht.ontvanger,
          subject: bericht.onderwerp,
        }

        if (bericht.in_reply_to) {
          mailOptions.inReplyTo = bericht.in_reply_to
          mailOptions.references = bericht.in_reply_to
        }

        // Inline base64-afbeeldingen -> CID-attachments (multipart/related),
        // gelijk aan api/send-email.ts. Voorkomt grote/afgewezen mails.
        const inlineAttachments: Array<{ filename: string; content: Buffer; cid: string; contentType: string; contentDisposition: 'inline' }> = []
        if (bericht.html) {
          let imgIndex = 0
          const processedHtml = (bericht.html as string).replace(
            /<img([^>]*)src=["']data:(image\/([a-z0-9.+-]+));base64,([^"']+)["']([^>]*)>/gi,
            (_m: string, before: string, mimeType: string, ext: string, b64Data: string, after: string) => {
              const cid = `inline-${crypto.randomUUID()}@forgedesk`
              const extension = ext.replace('+xml', '').replace('jpeg', 'jpg')
              inlineAttachments.push({
                filename: `inline-${imgIndex++}.${extension}`,
                content: Buffer.from(b64Data, 'base64'),
                cid,
                contentType: mimeType,
                contentDisposition: 'inline',
              })
              return `<img${before}src="cid:${cid}"${after}>`
            }
          )
          mailOptions.html = processedHtml
          mailOptions.text = bericht.body || bericht.onderwerp
        } else {
          mailOptions.text = bericht.body
        }

        if (bericht.cc) mailOptions.cc = bericht.cc
        if (bericht.bcc) mailOptions.bcc = bericht.bcc

        const bijlagen = (bericht.bijlagen || []) as Array<{
          filename: string
          content?: string
          encoding?: 'base64'
          storagePath?: string
          bucket?: string
          cleanupAfter?: boolean
        }>
        const cleanupTargets: Array<{ bucket: string; path: string }> = []
        const built: Array<{ filename: string; content: Buffer; cid?: string; contentType?: string; contentDisposition?: 'inline' }> = [...inlineAttachments]
        const { data: afzenderProfiel } = await supabaseAdmin
          .from('profiles').select('organisatie_id').eq('id', bericht.user_id).maybeSingle()
        const afzenderOrg = (afzenderProfiel?.organisatie_id as string | null) ?? null

        for (const a of bijlagen) {
          if (a.storagePath) {
            const bucket = a.bucket ?? 'documenten-prive'
            if (!(await bijlageToegestaan(bucket, a.storagePath, afzenderOrg, bericht.user_id))) {
              throw new Error(`Geen toegang tot bijlage "${a.filename}"`)
            }
            const { data, error: dlError } = await supabaseAdmin.storage.from(bucket).download(a.storagePath)
            if (dlError || !data) {
              throw new Error(`Bijlage "${a.filename}" kon niet worden opgehaald`)
            }
            built.push({ filename: a.filename, content: Buffer.from(await data.arrayBuffer()) })
            const shouldCleanup = a.cleanupAfter ?? (bucket === 'documenten-prive')
            if (shouldCleanup) cleanupTargets.push({ bucket, path: a.storagePath })
          } else if (a.content) {
            built.push({ filename: a.filename, content: Buffer.from(a.content, 'base64') })
          }
        }
        if (built.length) mailOptions.attachments = built

        mailOptions.date = new Date()
        const sendResult = await transporter.sendMail(mailOptions)
        const sentMessageId = (sendResult as { messageId?: string }).messageId || null

        let verzondenUid: number | null = null
        let verzondenMap: string | null = null
        if (await verzondenNaarServerAan(bericht.user_id)) {
          try {
            if (sentMessageId) mailOptions.messageId = sentMessageId
            const raw = await bouwRuweMail(mailOptions as unknown as Record<string, unknown>)
            const bewaard = await bewaarInVerzonden({
              raw, gmail_address: creds.gmail_address, app_password: creds.password,
              imap_host: creds.imap_host, imap_port: creds.imap_port,
            })
            verzondenUid = bewaard.uid
            verzondenMap = bewaard.imapFolder
          } catch (appendErr) {
            console.error('[cron-verzend] MIME voor Verzonden opbouwen mislukt:', appendErr)
            Sentry.captureException(appendErr, { tags: { phase: 'imap-append-sent' } })
          }
        }

        await supabaseAdmin
          .from('ingeplande_berichten')
          .update({
            status: 'verzonden',
            verzonden_op: new Date().toISOString(),
          })
          .eq('id', bericht.id)

        // Spiegel van api/send-email.ts: een verstuurde mail zet de lead op
        // 'benaderd'. Zonder dit blijft een ingeplande mail de lead op 'nieuw'
        // laten staan, waarna dezelfde lead opnieuw in de wachtrij belandt.
        // Alleen vooruit vanaf 'nieuw'; gereageerd blijft gereageerd.
        try {
          const naarAdres = (bericht.ontvanger || '').split(',')[0].trim().toLowerCase()
          if (naarAdres) {
            const { error: leadFout } = await supabaseAdmin
              .from('leads')
              .update({ status: 'benaderd', status_sinds: new Date().toISOString() })
              .eq('user_id', bericht.user_id)
              .eq('status', 'nieuw')
              .ilike('email', naarAdres)
            if (leadFout) console.error('[cron-verzend] leadstatus benaderd zetten mislukt:', leadFout)
          }
        } catch (leadFout) {
          console.error('[cron-verzend] leadstatus-update mislukt:', leadFout)
        }

        // Persist verzonden mail zodat ie in de conversatie-thread verschijnt
        // (gelijk aan de directe-verzendroute in api/send-email.ts).
        try {
          const effectiveThreadId = bericht.thread_id || crypto.randomUUID()
          const wachtOpReactie = bericht.wacht_op_reactie ?? false
          // Org-stempel bij ingest, gelijk aan send-email: org-brede lezers
          // filteren op organisatie_id en de 168-backfill is eenmalig.
          const { data: orgProfiel } = await supabaseAdmin
            .from('profiles')
            .select('organisatie_id')
            .eq('id', bericht.user_id)
            .maybeSingle()
          const { data: insertedMail } = await insertMetAccountTerugval('emails', {
            user_id: bericht.user_id,
            organisatie_id: (orgProfiel?.organisatie_id as string | null) ?? null,
            // Zonder account_id is verzonden mail uit een gedeeld postvak
            // onzichtbaar voor het team (migratie 245).
            ...(creds.account_id ? { account_id: creds.account_id } : {}),
            message_id: sentMessageId,
            in_reply_to: bericht.in_reply_to || null,
            thread_id: effectiveThreadId,
            map: 'verzonden',
            uid: verzondenUid,
            imap_folder: verzondenMap || 'SENT',
            from_address: creds.gmail_address,
            from_name: creds.fromName || '',
            van: fromAddress,
            aan: bericht.ontvanger,
            onderwerp: bericht.onderwerp,
            body_html: bericht.html || null,
            body_text: bericht.body || bericht.onderwerp,
            inhoud: bericht.html || bericht.body || '',
            datum: new Date().toISOString(),
            gelezen: true,
            bijlagen: bijlagen.length,
            has_attachments: bijlagen.length > 0,
            gmail_id: verzondenUid ? String(verzondenUid) : '',
            cached_at: new Date().toISOString(),
            wacht_op_reactie: wachtOpReactie,
            beantwoord: false,
          })

          // Sales Inbox: vervangen-niet-stapelen — sluit eerdere openstaande
          // wacht-mails naar hetzelfde adres af (gelijk aan api/send-email.ts).
          if (wachtOpReactie && insertedMail?.id) {
            const bareEmail = extractBareEmail(bericht.ontvanger)
            if (bareEmail) {
              await supabaseAdmin
                .from('emails')
                .update({ wacht_op_reactie: false, vervangen_door_email_id: insertedMail.id })
                .eq('user_id', bericht.user_id)
                .eq('wacht_op_reactie', true)
                .eq('beantwoord', false)
                .neq('id', insertedMail.id)
                .ilike('aan', `%${bareEmail}%`)
            }
          }
        } catch (saveErr) {
          console.error('[cron] Verzonden mail opslaan mislukt:', bericht.id, saveErr)
        }

        // Tijdelijke bijlagen opruimen (gelijk aan api/send-email.ts). Niet fataal:
        // mail is al verstuurd, maar hangende bestanden lekken storage.
        if (cleanupTargets.length > 0) {
          const byBucket = new Map<string, string[]>()
          for (const t of cleanupTargets) {
            const list = byBucket.get(t.bucket) ?? []
            list.push(t.path)
            byBucket.set(t.bucket, list)
          }
          for (const [bucket, paths] of byBucket) {
            supabaseAdmin.storage.from(bucket).remove(paths).catch((cleanupErr) => {
              console.error(`[cron] Storage cleanup mislukt voor bucket ${bucket}:`, cleanupErr)
            })
          }
        }

        verzonden++
        console.log('[cron] Bericht verzonden:', bericht.id)
      } catch (err) {
        const foutmelding = err instanceof Error ? err.message : String(err)

        // Outbox-retry met backoff (1m, 5m, 15m); daarna definitief mislukt.
        // Valt terug op direct 'mislukt' zolang migratie 130 (retry_count)
        // nog niet gedraaid is — de update faalt dan op de onbekende kolom.
        const retryCount = (bericht as { retry_count?: number }).retry_count ?? 0
        const RETRY_DELAYS_MIN = [1, 5, 15]
        let geretried = false
        if (retryCount < RETRY_DELAYS_MIN.length) {
          const { error: retryErr } = await supabaseAdmin
            .from('ingeplande_berichten')
            .update({
              status: 'wachtend',
              retry_count: retryCount + 1,
              foutmelding,
              scheduled_at: new Date(Date.now() + RETRY_DELAYS_MIN[retryCount] * 60_000).toISOString(),
            })
            .eq('id', bericht.id)
          geretried = !retryErr
          if (geretried) {
            console.warn(`[cron] Bericht ${bericht.id} mislukt, retry ${retryCount + 1}/${RETRY_DELAYS_MIN.length} over ${RETRY_DELAYS_MIN[retryCount]}m:`, foutmelding)
          }
        }

        if (!geretried) {
          mislukt++
          await supabaseAdmin
            .from('ingeplande_berichten')
            .update({ status: 'mislukt', foutmelding })
            .eq('id', bericht.id)
          console.error('[cron] Bericht verzenden definitief mislukt:', bericht.id, foutmelding)
          Sentry.captureException(err, { extra: { berichtId: bericht.id } })
        }
      }
    }

    return res.status(200).json({ processed: due.length, verzonden, mislukt })
  } catch (err) {
    console.error('[cron] Fatale fout:', err)
    Sentry.captureException(err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Cron mislukt' })
  }
}
