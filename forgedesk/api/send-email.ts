import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createTransport } from 'nodemailer'
import MailComposer from 'nodemailer/lib/mail-composer'
import { ImapFlow } from 'imapflow'
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

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for send-email, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(20, '60 s'), prefix: 'rl:send-email', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] send-email id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] send-email id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

// Valideert dat een uit de body opgegeven storage-object bij de caller hoort.
// DB-gebaseerd (convention-onafhankelijk): het pad moet als storage_path in de
// org-gescopete brontabel staan. Tijdelijke offerte/mail-uploads leven onder
// email-bijlagen/{user_id}/ en worden op user_id gecheckt.
async function attachmentToegestaan(
  bucket: string,
  path: string,
  orgId: string | null,
  userId: string,
): Promise<boolean> {
  // Path-traversal / absolute paden altijd weigeren.
  if (!path || path.includes('..') || path.startsWith('/') || path.includes('\\')) return false

  if (bucket === 'documenten-prive') {
    const seg = path.split('/')
    // Tijdelijke mail-/offerte-uploads: email-bijlagen[-groot]/{user_id}/...
    if (seg[0] === 'email-bijlagen' || seg[0] === 'email-bijlagen-groot') return seg[1] === userId
    if (!orgId) return false
    const { data } = await supabaseAdmin
      // De TABEL documenten, niet de bucket. Die twee heten bijna hetzelfde en
      // een eerdere hernoeming haalde ze door elkaar, waardoor elke persistente
      // bijlage 403 kreeg.
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
      .from('facturen')
      .select('id')
      .eq('pdf_storage_path', path)
      .eq('organisatie_id', orgId)
      .maybeSingle()
    return !!data
  }

  if (bucket === 'factuur-bijlagen') {
    if (!orgId) return false
    const { data } = await supabaseAdmin
      .from('factuur_bijlagen')
      .select('id')
      .eq('storage_path', path)
      .eq('organisatie_id', orgId)
      .maybeSingle()
    return !!data
  }

  // Onbekende bucket: fail-closed.
  return false
}
interface EmailCredentials {
  gmail_address: string
  app_password: string
  user_id: string
  auth_type: string
  oauth_refresh_token_enc: string | null
  oauth_access_token_enc: string | null
  oauth_token_verloopt_op: string | null
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

// ── GEDEELD-MET-API BEGIN: OAuth-toegangstoken ────────────────────────────
// Letterlijke kopie in api/mail-oauth-token.ts, api/fetch-emails.ts,
// api/read-email.ts, api/prefetch-email-bodies.ts, api/email-imap-action.ts,
// api/send-email.ts en api/test-email-connection.ts. Wijzig je er één, wijzig
// dan alle zeven: zoek op "GEDEELD-MET-API: OAuth-toegangstoken".
// api/mail-oauth-callback.ts heeft alleen versleutelToken uit dit blok.
// Bewust gekopieerd en niet gedeeld: api/* is standalone, een import uit src/
// of api/_lib bundelt Vercel niet mee. Leunt op `crypto`, `supabaseAdmin` en
// `decryptPassword` uit het bestand zelf.

interface OauthRij {
  user_id?: string | null
  auth_type?: string | null
  oauth_refresh_token_enc?: string | null
  oauth_access_token_enc?: string | null
  oauth_token_verloopt_op?: string | null
}

function isOauthKoppeling(authType?: string | null): boolean {
  return authType === 'google' || authType === 'microsoft'
}

/** Zelfde g1-vorm als api/email-settings.ts: AES-256-GCM, salt per waarde. */
function versleutelToken(tekst: string): string {
  const sleutel = process.env.EMAIL_ENCRYPTION_KEY
  if (!sleutel) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(sleutel, salt, 32)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(tekst, 'utf8'), cipher.final()])
  return 'g1:' + Buffer.concat([salt, iv, cipher.getAuthTag(), ct]).toString('base64')
}

function oauthTokenUrl(provider: string): string {
  if (provider === 'microsoft') {
    const tenant = process.env.MAIL_OAUTH_MICROSOFT_TENANT || 'common'
    return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`
  }
  return 'https://oauth2.googleapis.com/token'
}

function oauthClient(provider: string): { id: string; secret: string } | null {
  const id = provider === 'microsoft'
    ? process.env.MAIL_OAUTH_MICROSOFT_CLIENT_ID
    : process.env.MAIL_OAUTH_GOOGLE_CLIENT_ID
  const secret = provider === 'microsoft'
    ? process.env.MAIL_OAUTH_MICROSOFT_CLIENT_SECRET
    : process.env.MAIL_OAUTH_GOOGLE_CLIENT_SECRET
  if (!id || !secret) return null
  return { id, secret }
}

/**
 * Een geldig access-token voor XOAUTH2, of een fout die zegt dat de gebruiker
 * opnieuw moet koppelen.
 *
 * Ververst zodra het token binnen vijf minuten verloopt, en schrijft het
 * nieuwe token versleuteld terug zodat de volgende aanroep hem gewoon leest.
 * `forceer` is voor de tweede poging na een 401 van de mailserver: het token
 * kan ingetrokken zijn terwijl de vervaldatum nog in de toekomst ligt.
 */
async function haalToegangstoken(rij: OauthRij, opties?: { forceer?: boolean }): Promise<string> {
  const provider = rij.auth_type || ''
  if (!isOauthKoppeling(provider)) throw new Error('Geen OAuth-koppeling op deze mailbox')

  const nu = Date.now()
  const verlooptOp = rij.oauth_token_verloopt_op ? Date.parse(rij.oauth_token_verloopt_op) : 0
  if (!opties?.forceer && rij.oauth_access_token_enc && verlooptOp - nu > 5 * 60_000) {
    return decryptPassword(rij.oauth_access_token_enc)
  }

  if (!rij.oauth_refresh_token_enc) throw new Error('Toegang ingetrokken, koppel opnieuw')
  const client = oauthClient(provider)
  if (!client) throw new Error('OAuth is niet geconfigureerd op de server')

  const respons = await fetch(oauthTokenUrl(provider), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: client.id,
      client_secret: client.secret,
      refresh_token: decryptPassword(rij.oauth_refresh_token_enc),
      grant_type: 'refresh_token',
    }).toString(),
    signal: AbortSignal.timeout(10_000),
  })
  const antwoord = (await respons.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    refresh_token?: string
    error?: string
  }
  if (!respons.ok || !antwoord.access_token) {
    throw new Error(`Toegang ingetrokken, koppel opnieuw (${antwoord.error || respons.status})`)
  }

  const nieuwVerlooptOp = new Date(nu + (Number(antwoord.expires_in) || 3600) * 1000).toISOString()
  const patch: Record<string, unknown> = {
    oauth_access_token_enc: versleutelToken(antwoord.access_token),
    oauth_token_verloopt_op: nieuwVerlooptOp,
    updated_at: new Date().toISOString(),
  }
  // Microsoft rouleert de refresh-token bij elke verversing, Google niet.
  if (antwoord.refresh_token) patch.oauth_refresh_token_enc = versleutelToken(antwoord.refresh_token)

  if (rij.user_id) {
    const { error } = await supabaseAdmin.from('user_email_settings').update(patch).eq('user_id', rij.user_id)
    if (error) console.warn('[oauth] nieuw token niet opgeslagen:', error.message)
  }
  rij.oauth_access_token_enc = patch.oauth_access_token_enc as string
  rij.oauth_token_verloopt_op = nieuwVerlooptOp
  return antwoord.access_token
}

/** Een 401 van IMAP of SMTP, in de bewoordingen die de servers gebruiken. */
function isToegangGeweigerd(fout: unknown): boolean {
  const melding = fout instanceof Error ? fout.message : String(fout)
  return /authenticationfailed|invalid credentials|invalid_grant|authentication failed|\b401\b|EAUTH|535/i.test(melding)
}

/**
 * De mailbox uitzetten met de melding die de gebruiker moet zien. Alleen na
 * een tweede 401: de eerste kan een verlopen token zijn en die ververst
 * haalToegangstoken zelf.
 */
async function meldToegangIngetrokken(userId: string): Promise<void> {
  const nu = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('email_sync_state')
    .upsert({
      user_id: userId,
      folder: 'inbox',
      status: 'uitgezet',
      laatste_fout: 'Toegang ingetrokken, koppel opnieuw',
      laatste_fout_op: nu,
      updated_at: nu,
    }, { onConflict: 'user_id,folder' })
  if (error) console.warn('[oauth] status uitgezet schrijven mislukt:', error.message)
}
// ── GEDEELD-MET-API EINDE: OAuth-toegangstoken ────────────────────────────

/**
 * Het postvak waarmee verzonden wordt. `.single()` op user_id klapte zodra er
 * een tweede postvak bijkwam (migratie 245 en 246 laten dat toe), en gaf dan
 * de misleidende melding dat er geen instellingen zijn. Volgorde: het
 * meegestuurde account_id, anders het postvak met `is_standaard`, anders de
 * enige rij.
 */
async function getEmailCredentials(userId: string, accountId?: string | null): Promise<EmailCredentials> {
  const kolommen = 'gmail_address, encrypted_app_password, smtp_host, smtp_port, imap_host, imap_port, auth_type, oauth_refresh_token_enc, oauth_access_token_enc, oauth_token_verloopt_op'
  type Rij = Record<string, unknown>

  async function haalRij(keuze: 'account' | 'standaard' | 'enige') {
    let vraag = supabaseAdmin.from('user_email_settings').select(kolommen).eq('user_id', userId)
    if (keuze === 'account') vraag = vraag.eq('id', accountId as string)
    if (keuze === 'standaard') vraag = vraag.eq('is_standaard', true)
    const { data, error } = await vraag.maybeSingle()
    return { rij: (data as Rij | null) ?? null, fout: error }
  }

  let data: Rij | null = null
  if (accountId) {
    const uitkomst = await haalRij('account')
    if (uitkomst.fout || !uitkomst.rij) {
      throw new Error('Dit postvak bestaat niet of hoort niet bij jou. Kies een ander postvak onder Instellingen > E-mail.')
    }
    data = uitkomst.rij
  }
  if (!data) {
    // is_standaard bestaat pas sinds migratie 245; ontbreekt de kolom of staan
    // er meer standaard-rijen, dan beslist de volgende poging.
    const uitkomst = await haalRij('standaard')
    if (!uitkomst.fout) data = uitkomst.rij
  }
  if (!data) {
    const uitkomst = await haalRij('enige')
    if (uitkomst.fout) {
      throw new Error('Er zijn meer postvakken gekoppeld en geen ervan is de standaard. Kies een postvak onder Instellingen > E-mail.')
    }
    data = uitkomst.rij
  }

  if (!data?.gmail_address) {
    throw new Error('Geen email instellingen gevonden. Koppel je mailbox onder Instellingen > Koppelingen > E-mail.')
  }
  // Een OAuth-mailbox heeft geen app-wachtwoord: de tokens staan in
  // oauth_refresh_token_enc en oauth_access_token_enc.
  const oauthKoppeling = isOauthKoppeling(data.auth_type as string | null)
  if (!oauthKoppeling && !data.encrypted_app_password) {
    throw new Error('Geen email instellingen gevonden. Koppel je mailbox onder Instellingen > E-mail > Verbinding.')
  }
  if (oauthKoppeling && !data.oauth_refresh_token_enc) {
    throw new Error('Toegang ingetrokken, koppel opnieuw')
  }

  return {
    gmail_address: data.gmail_address as string,
    app_password: data.encrypted_app_password ? decryptPassword(data.encrypted_app_password as string) : '',
    user_id: userId,
    auth_type: (data.auth_type as string) || 'wachtwoord',
    oauth_refresh_token_enc: (data.oauth_refresh_token_enc as string) ?? null,
    oauth_access_token_enc: (data.oauth_access_token_enc as string) ?? null,
    oauth_token_verloopt_op: (data.oauth_token_verloopt_op as string) ?? null,
    smtp_host: (data.smtp_host as string) || 'smtp.gmail.com',
    smtp_port: (data.smtp_port as number) || 587,
    imap_host: (data.imap_host as string) || 'imap.gmail.com',
    imap_port: (data.imap_port as number) || 993,
  }
}

function extractBareEmail(address: string): string {
  const trimmed = address.trim()
  const match = trimmed.match(/<([^>]+)>/)
  return (match?.[1] || trimmed).toLowerCase()
}

// ── Verzonden naar de server (contract sectie 5) ──────────────────────────
// Zonder APPEND bestond een via doen. verstuurde mail alleen in onze database;
// op de telefoon of in webmail ontbrak hij in Verzonden. Gmail slaat een kopie
// zelf op bij verzenden via smtp.gmail.com, dus daar zou een APPEND een dubbel
// opleveren; de Verzonden-sync in fetch-emails haalt daar de uid op.
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
    console.warn('[send-email] mappenlijst ophalen mislukt:', err instanceof Error ? err.message : err)
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

/**
 * Zet de verstuurde MIME in de Verzonden-map van de gebruiker. Geeft de uid en
 * de echte mapnaam terug zodat de emails-rij meteen naar de server wijst.
 * Mag nooit gooien: de mail is al verstuurd, dit is administratie.
 */
async function bewaarInVerzonden(opts: {
  raw: Buffer
  gmail_address: string
  app_password: string
  access_token?: string
  imap_host: string
  imap_port: number
}): Promise<{ uid: number | null; imapFolder: string | null }> {
  if (isGmailHost(opts.imap_host)) return { uid: null, imapFolder: null }
  const client = new ImapFlow({
    host: opts.imap_host,
    port: opts.imap_port,
    secure: opts.imap_port === 993,
    auth: opts.access_token
      ? { user: opts.gmail_address, accessToken: opts.access_token }
      : { user: opts.gmail_address, pass: opts.app_password },
    logger: false,
    emitLogs: false,
    greetingTimeout: 8000,
    socketTimeout: 20000,
  })
  try {
    await client.connect()
    const map = await zoekVerzondenMap(client)
    if (!map) {
      console.warn('[send-email] geen Verzonden-map gevonden, APPEND overgeslagen')
      return { uid: null, imapFolder: null }
    }
    const uitkomst = await client.append(map, opts.raw, ['\\Seen'], new Date())
    if (!uitkomst) return { uid: null, imapFolder: map }
    return { uid: uitkomst.uid ?? null, imapFolder: uitkomst.destination || map }
  } catch (err) {
    console.error('[send-email] APPEND in Verzonden mislukt:', err instanceof Error ? err.message : err)
    Sentry.captureException(err, { tags: { phase: 'imap-append-sent' } })
    return { uid: null, imapFolder: null }
  } finally {
    try { await client.logout() } catch { /* al gesloten */ }
  }
}

// ── Outbox (contract sectie 5) ───────────────────────────────────────────
type SmtpFoutSoort = 'auth' | 'tijdelijk' | 'definitief'

// nodemailer zet code EAUTH bij een geweigerde login en responseCode op de
// SMTP-statuscode. 4xx is per RFC 5321 tijdelijk, 5xx definitief; 535 is de
// uitzondering die auth betekent.
function classificeerSmtpFout(err: unknown): SmtpFoutSoort {
  const e = (err ?? {}) as { code?: string; responseCode?: number; message?: string }
  const melding = e.message || ''
  if (e.responseCode === 535 || e.code === 'EAUTH' || /invalid credentials|username and password not accepted|authentication failed|invalid login/i.test(melding)) {
    return 'auth'
  }
  if (e.code === 'ECONNECTION' || e.code === 'ETIMEDOUT' || e.code === 'ESOCKET' || e.code === 'EDNS' || e.code === 'ECONNRESET') {
    return 'tijdelijk'
  }
  if (typeof e.responseCode === 'number' && e.responseCode >= 400 && e.responseCode < 500) return 'tijdelijk'
  if (/timeout|timed out|econnrefused|enotfound|econnreset|socket|greeting/i.test(melding)) return 'tijdelijk'
  return 'definitief'
}

async function schrijfOutboxRij(rij: {
  user_id: string
  to: string
  cc?: string
  bcc?: string
  subject: string
  body?: string
  html?: string
  bijlagen: unknown[]
  in_reply_to?: string
  thread_id?: string
  wacht_op_reactie: boolean
}): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('ingeplande_berichten')
      .insert({
        user_id: rij.user_id,
        ontvanger: rij.to,
        cc: rij.cc || null,
        bcc: rij.bcc || null,
        onderwerp: rij.subject,
        body: rij.body || null,
        html: rij.html || null,
        bijlagen: rij.bijlagen,
        scheduled_at: new Date().toISOString(),
        status: 'verwerken',
        bron: 'outbox',
        in_reply_to: rij.in_reply_to || null,
        thread_id: rij.thread_id || null,
        wacht_op_reactie: rij.wacht_op_reactie,
      })
      .select('id')
      .single()
    if (error) {
      console.warn('[send-email] outbox-rij schrijven mislukt:', error.message)
      return null
    }
    return (data?.id as string) || null
  } catch (err) {
    console.warn('[send-email] outbox-rij schrijven gooide:', err instanceof Error ? err.message : err)
    return null
  }
}

async function werkOutboxBij(id: string | null, patch: Record<string, unknown>): Promise<void> {
  if (!id) return
  const { error } = await supabaseAdmin.from('ingeplande_berichten').update(patch).eq('id', id)
  if (error) console.warn('[send-email] outbox-rij bijwerken mislukt:', error.message)
}

export const config = { maxDuration: 30 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)

    if (!(await enforceRateLimit(user_id, res))) return

    let gmail_address: string, app_password: string, smtp_host: string, smtp_port: number
    let imap_host: string, imap_port: number
    // Bij auth_type google of microsoft gaat er een access-token over de lijn
    // in plaats van een wachtwoord (XOAUTH2), zowel naar SMTP als naar de
    // IMAP-APPEND in Verzonden.
    let oauthCreds: EmailCredentials | null = null
    let access_token: string | undefined
    let creds: EmailCredentials | null = null
    let credsFout: string | null = null
    try {
      creds = await getEmailCredentials(user_id, typeof req.body?.account_id === 'string' ? req.body.account_id : null)
    } catch (err) {
      credsFout = err instanceof Error ? err.message : null
      creds = null
    }
    if (creds) {
      gmail_address = creds.gmail_address
      app_password = creds.app_password
      smtp_host = creds.smtp_host
      smtp_port = creds.smtp_port
      imap_host = creds.imap_host
      imap_port = creds.imap_port
      if (isOauthKoppeling(creds.auth_type)) {
        oauthCreds = creds
        access_token = await haalToegangstoken(creds)
      }
    } else {
      gmail_address = req.body.gmail_address
      app_password = req.body.app_password
      smtp_host = req.body.smtp_host || 'smtp.gmail.com'
      smtp_port = req.body.smtp_port || 587
      imap_host = req.body.imap_host || 'imap.gmail.com'
      imap_port = req.body.imap_port || 993
      if (!gmail_address || !app_password) {
        return res.status(400).json({ error: credsFout || 'Geen email instellingen gevonden. Koppel je mailbox onder Instellingen > Koppelingen > E-mail.' })
      }
    }

    const {
      to,
      cc,
      bcc,
      subject,
      body,
      html,
      attachments,
      scheduledAt,
      wacht_op_reactie = false,
      // Threading: meegegeven door de frontend bij reply/forward
      in_reply_to,
      references,
      thread_id,
    } = req.body as {
      to: string
      cc?: string
      bcc?: string
      subject: string
      body?: string
      html?: string
      attachments?: Array<{ filename: string; content?: string; encoding?: 'base64'; storagePath?: string; bucket?: string; cleanupAfter?: boolean; size?: number }>
      scheduledAt?: string
      wacht_op_reactie?: boolean
      in_reply_to?: string
      references?: string[]
      thread_id?: string
    }

    if (!to || !subject) {
      return res.status(400).json({ error: 'Ontvanger en onderwerp zijn verplicht' })
    }

    if (scheduledAt) {
      const verzendDatum = new Date(scheduledAt)
      if (Number.isNaN(verzendDatum.getTime())) {
        return res.status(400).json({ error: 'Ongeldige scheduledAt waarde' })
      }
      if (verzendDatum.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'scheduledAt moet in de toekomst liggen' })
      }

      const { data: ingepland, error: insertError } = await supabaseAdmin
        .from('ingeplande_berichten')
        .insert({
          user_id,
          ontvanger: to,
          cc: cc || null,
          bcc: bcc || null,
          onderwerp: subject,
          body: body || null,
          html: html || null,
          bijlagen: attachments || [],
          scheduled_at: verzendDatum.toISOString(),
          status: 'wachtend',
          in_reply_to: in_reply_to || null,
          thread_id: thread_id || null,
          wacht_op_reactie,
        })
        .select('id')
        .single()

      if (insertError || !ingepland) {
        console.error('[send-email] Ingepland bericht aanmaken mislukt:', insertError)
        return res.status(500).json({ error: 'Email inplannen mislukt' })
      }

      console.log('[send-email] Bericht ingepland:', ingepland.id, scheduledAt)
      return res.status(200).json({ success: true, message: 'Email ingepland', id: ingepland.id })
    }

    // Afzendernaam staat per-user op profiles (migratie 091); bedrijfsnaam als fallback.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('bedrijfsnaam, afzender_naam')
      .eq('id', user_id)
      .maybeSingle()

    const afzenderNaam = (profile?.afzender_naam || '').trim() || null
    const fromName = afzenderNaam || profile?.bedrijfsnaam?.trim() || null
    const fromAddress = fromName
      ? `"${fromName.replace(/"/g, '')}" <${gmail_address}>`
      : gmail_address

    const maakTransporter = (token?: string) => createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_port === 465,
      auth: token
        ? { type: 'OAuth2' as const, user: gmail_address, accessToken: token }
        : { user: gmail_address, pass: app_password },
    })
    let transporter = maakTransporter(access_token)

    // Extraheer inline base64 data URIs uit de HTML en converteer ze naar
    // CID-attachments. Dit maakt de mail RFC-conform (multipart/related) en
    // voorkomt problemen met SMTP grootte-limieten.
    let processedHtml = html || ''
    const inlineAttachments: Array<{ filename: string; content: Buffer; cid: string; contentType: string; contentDisposition: 'inline' }> = []

    if (processedHtml) {
      let imgIndex = 0
      processedHtml = processedHtml.replace(
        /<img([^>]*)src=["']data:(image\/([a-z0-9.+-]+));base64,([^"']+)["']([^>]*)>/gi,
        (_match, before, mimeType, ext, b64Data, after) => {
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
    }

    const mailOptions: Record<string, unknown> = {
      from: fromAddress,
      to,
      subject,
    }
    // Threading SMTP headers zodat ontvangers de mail correct threaden. De
    // References-keten komt van de composer; ontbreekt hij, dan is de ouder
    // zelf de keten.
    if (in_reply_to) {
      mailOptions.inReplyTo = in_reply_to
    }
    const referentieKeten = Array.isArray(references)
      ? references.filter((r): r is string => typeof r === 'string' && r.length > 0)
      : []
    if (in_reply_to && !referentieKeten.includes(in_reply_to)) referentieKeten.push(in_reply_to)
    if (referentieKeten.length > 0) mailOptions.references = referentieKeten.join(' ')
    // Als er HTML is, gebruik die als primaire content. Plain text alleen als fallback.
    if (processedHtml) {
      mailOptions.html = processedHtml
      // Minimale plain text voor email clients zonder HTML support
      mailOptions.text = body || subject
    } else {
      mailOptions.text = body
    }
    if (cc) mailOptions.cc = cc
    if (bcc) mailOptions.bcc = bcc

    // Verwerk bijlagen: download van Supabase Storage of gebruik base64.
    // Per attachment kan een bucket meegegeven worden (default 'documenten-prive' voor
    // backwards compat met portaal-upload flow). cleanupAfter regelt of het
    // storage-object na verzending verwijderd wordt — standaard alleen voor
    // documenten-bucket (tijdelijke portaal-uploads). Persistente bijlagen
    // (bv factuur-bijlagen, facturen) moeten NIET na verzending gewist worden.
    const cleanupTargets: Array<{ bucket: string; path: string }> = []
    const fileAttachments: Array<{ filename: string; content: Buffer }> = []
    if (attachments?.length) {
      // Ownership-check: storagePath/bucket komen uit de request-body. Zonder
      // validatie kan een geauthenticeerde user via service-role elk pad in elke
      // bucket downloaden (cross-tenant exfiltratie). We valideren daarom per
      // bucket dat het object bij de organisatie/user van de caller hoort.
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles')
        .select('organisatie_id')
        .eq('id', user_id)
        .maybeSingle()
      const callerOrgId = (callerProfile?.organisatie_id as string | null) ?? null

      for (const a of attachments) {
        if (a.storagePath) {
          const bucket = a.bucket ?? 'documenten-prive'
          if (!(await attachmentToegestaan(bucket, a.storagePath, callerOrgId, user_id))) {
            console.warn(`[send-email] Bijlage geweigerd: geen toegang tot ${bucket}/${a.storagePath}`)
            return res.status(403).json({ error: `Geen toegang tot bijlage "${a.filename}"` })
          }
          const { data, error: dlError } = await supabaseAdmin.storage
            .from(bucket)
            .download(a.storagePath)
          if (dlError || !data) {
            console.error(`[send-email] Storage download mislukt voor ${bucket}/${a.storagePath}:`, dlError)
            throw new Error(`Bijlage "${a.filename}" kon niet worden opgehaald`)
          }
          const buffer = Buffer.from(await data.arrayBuffer())
          fileAttachments.push({ filename: a.filename, content: buffer })
          const shouldCleanup = a.cleanupAfter ?? (bucket === 'documenten-prive')
          if (shouldCleanup) cleanupTargets.push({ bucket, path: a.storagePath })
        } else if (a.content) {
          fileAttachments.push({ filename: a.filename, content: Buffer.from(a.content, 'base64') })
        }
      }
    }

    const allAttachments = [...inlineAttachments, ...fileAttachments]
    if (allAttachments.length) {
      mailOptions.attachments = allAttachments
    }

    // ─── Outbox: de verzending zichtbaar maken vóór hij begint ───
    // Een rij in ingeplande_berichten met bron 'outbox'. Status 'verwerken'
    // (de check-constraint van migratie 120 kent geen 'verzenden'); blijft
    // hij hangen, dan zet cron-verzend-geplande-berichten hem na tien minuten
    // op 'mislukt' met een melding. Bijlage-inhoud gaat niet mee: deze rij
    // wordt nooit door de cron opnieuw verstuurd, hij is administratie.
    const outboxId = await schrijfOutboxRij({
      user_id, to, cc, bcc, subject, body, html,
      bijlagen: (attachments || []).map(({ content: _content, ...rest }) => rest),
      in_reply_to, thread_id, wacht_op_reactie,
    })

    // Vaste datum en, na verzending, hetzelfde Message-ID: de MIME voor de
    // Verzonden-map wordt apart opgebouwd en moet byte voor byte dezelfde
    // headers dragen als wat de ontvanger kreeg.
    mailOptions.date = new Date()
    let sendResult: Awaited<ReturnType<typeof transporter.sendMail>>
    try {
      try {
        sendResult = await transporter.sendMail(mailOptions)
      } catch (eersteSmtpFout) {
        // Een OAuth-mailbox krijgt één herkansing met een vers token: het oude
        // kan ingetrokken zijn terwijl de vervaldatum nog in de toekomst lag.
        // Blijft de tweede poging ook op 401 staan, dan is de koppeling weg en
        // gaat de mailbox uit met "Toegang ingetrokken, koppel opnieuw".
        if (!oauthCreds || classificeerSmtpFout(eersteSmtpFout) !== 'auth') throw eersteSmtpFout
        transporter = maakTransporter(await haalToegangstoken(oauthCreds, { forceer: true }))
        try {
          sendResult = await transporter.sendMail(mailOptions)
        } catch (tweedeSmtpFout) {
          if (classificeerSmtpFout(tweedeSmtpFout) === 'auth') await meldToegangIngetrokken(user_id)
          throw tweedeSmtpFout
        }
      }
    } catch (smtpErr) {
      const soort = classificeerSmtpFout(smtpErr)
      const melding = smtpErr instanceof Error ? smtpErr.message : String(smtpErr)
      const foutmelding = soort === 'auth' ? 'Wachtwoord geweigerd door de mailserver'
        : soort === 'tijdelijk' ? `Mailserver tijdelijk niet bereikbaar: ${melding.slice(0, 200)}`
        : melding.slice(0, 300)
      await werkOutboxBij(outboxId, { status: 'mislukt', foutmelding })
      console.error('[send-email] SMTP mislukt:', soort, melding)
      Sentry.captureException(smtpErr, { tags: { phase: 'smtp-send', soort } })

      if (soort === 'auth') {
        // Niet opnieuw proberen: elke poging met een fout wachtwoord is een
        // stap dichter bij een blokkade door de provider. Melding zodat de
        // gebruiker het ziet, ook als hij het venster al dicht heeft.
        const { error: notifErr } = await supabaseAdmin.from('notificaties').insert({
          user_id,
          type: 'algemeen',
          titel: 'Mail niet verzonden',
          bericht: `"${subject}" aan ${to} is niet verzonden: de mailserver weigerde je wachtwoord. Controleer je mailkoppeling in Instellingen.`,
          link: '/instellingen',
          gelezen: false,
        })
        if (notifErr) console.error('[send-email] notificatie mislukt:', notifErr)
        return res.status(401).json({ error: 'De mailserver weigerde je wachtwoord. Controleer je mailkoppeling in Instellingen.', outboxId })
      }
      // 502: de client houdt zijn eigen retry-pad (outbox) voor tijdelijke
      // storingen; alles anders is 500 en wordt niet herhaald.
      return res.status(soort === 'tijdelijk' ? 502 : 500).json({ error: foutmelding, outboxId })
    }
    const sentMessageId = sendResult.messageId || null
    await werkOutboxBij(outboxId, { status: 'verzonden', verzonden_op: new Date().toISOString(), foutmelding: null })

    let verzondenUid: number | null = null
    let verzondenMap: string | null = null
    if (await verzondenNaarServerAan(user_id)) {
      try {
        if (sentMessageId) mailOptions.messageId = sentMessageId
        const raw = await new MailComposer(mailOptions).compile().build()
        const bewaard = await bewaarInVerzonden({ raw, gmail_address, app_password, access_token, imap_host, imap_port })
        verzondenUid = bewaard.uid
        verzondenMap = bewaard.imapFolder
      } catch (appendErr) {
        console.error('[send-email] MIME voor Verzonden opbouwen mislukt:', appendErr)
        Sentry.captureException(appendErr, { tags: { phase: 'imap-append-sent' } })
      }
    }

    // ─── Sla verzonden mail op in Supabase ───
    // Zo verschijnt ie in de conversatie-thread en is de volledige
    // heen-en-weer historie zichtbaar.
    const effectiveThreadId = thread_id || crypto.randomUUID()
    try {
      // Org-stempel bij ingest: org-brede lezers (o.a. de nachtploeg-briefing)
      // filteren op organisatie_id en de backfills van 047/083 dekken nieuwe
      // rijen niet.
      const { data: orgProfiel } = await supabaseAdmin
        .from('profiles')
        .select('organisatie_id')
        .eq('id', user_id)
        .maybeSingle()
      const mailOrgId = (orgProfiel?.organisatie_id as string | null) ?? null

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('emails')
        .insert({
          user_id,
          organisatie_id: mailOrgId,
          message_id: sentMessageId,
          in_reply_to: in_reply_to || null,
          thread_id: effectiveThreadId,
          map: 'verzonden',
          uid: verzondenUid,
          imap_folder: verzondenMap || 'SENT',
          from_address: gmail_address,
          from_name: fromName || '',
          van: fromAddress,
          aan: to,
          onderwerp: subject,
          body_html: html || null,
          body_text: body || subject,
          inhoud: html || body || '',
          datum: new Date().toISOString(),
          gelezen: true,
          bijlagen: attachments?.length || 0,
          has_attachments: (attachments?.length || 0) > 0,
          gmail_id: verzondenUid ? String(verzondenUid) : '',
          cached_at: new Date().toISOString(),
          wacht_op_reactie,
          beantwoord: false,
        })
        .select('id')
        .single()
      if (insertErr) throw insertErr

      // ─── Sales Inbox v1: vervangen-niet-stapelen ───
      // Als deze nieuwe mail wacht_op_reactie=true heeft, sluit eerdere
      // openstaande wacht-mails naar zelfde adres af zodat ze in de Wacht-tab
      // niet meer naast deze nieuwe staan. RLS-readiness: service_role
      // omzeilt RLS, dus user_id-filter expliciet.
      if (wacht_op_reactie && inserted?.id) {
        const bareEmail = extractBareEmail(to)
        if (bareEmail) {
          const { error: replaceErr } = await supabaseAdmin
            .from('emails')
            .update({
              wacht_op_reactie: false,
              vervangen_door_email_id: inserted.id,
            })
            .eq('user_id', user_id)
            .eq('wacht_op_reactie', true)
            .eq('beantwoord', false)
            .neq('id', inserted.id)
            .ilike('aan', `%${bareEmail}%`)
          if (replaceErr) {
            console.error('[send-email] Sales Inbox replace-logic mislukt:', replaceErr)
          }
        }
      }
    } catch (saveErr) {
      // Niet fataal — de mail IS al verstuurd, log de fout
      console.error('[send-email] Verzonden mail opslaan mislukt:', saveErr)
    }

    // Leads: elke verstuurde mail naar het adres van een nieuwe lead zet die
    // lead op 'benaderd', ongeacht het verzendpad (compose, reply, opzetje).
    // Alleen vooruit vanaf 'nieuw'; gereageerd en geen_interesse blijven staan.
    try {
      const naarAdres = to.split(',')[0].trim().toLowerCase()
      if (naarAdres) {
        const { error: leadErr } = await supabaseAdmin
          .from('leads')
          .update({ status: 'benaderd', status_sinds: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('status', 'nieuw')
          .ilike('email', naarAdres)
        if (leadErr) console.error('[send-email] leadstatus benaderd zetten mislukt:', leadErr)
      }
    } catch (leadErr) {
      console.error('[send-email] leadstatus-update mislukt:', leadErr)
    }

    // Ruim tijdelijke bestanden op uit Storage. Email is al verzonden, dus niet
    // fataal — maar wel error-niveau, want hangende bijlagen lekken storage.
    // Per bucket gegroepeerd zodat we niet kruislings deleten.
    if (cleanupTargets.length > 0) {
      const byBucket = new Map<string, string[]>()
      for (const t of cleanupTargets) {
        const list = byBucket.get(t.bucket) ?? []
        list.push(t.path)
        byBucket.set(t.bucket, list)
      }
      for (const [bucket, paths] of byBucket) {
        supabaseAdmin.storage.from(bucket).remove(paths).catch((err) => {
          console.error(`[send-email] Storage cleanup mislukt voor bucket ${bucket}:`, err)
          Sentry.captureException(err, { tags: { phase: 'storage-cleanup', bucket } })
        })
      }
    }

    return res.status(200).json({ success: true, message: 'Email verzonden', outboxId })
  } catch (error: unknown) {
    if ((error as Error).message === 'Niet geautoriseerd' || (error as Error).message === 'Ongeldige sessie') {
      return res.status(401).json({ error: (error as Error).message })
    }
    console.error('Email verzenden mislukt:', error)
    Sentry.captureException(error)
    const msg = error instanceof Error ? error.message : 'Email verzenden mislukt'
    return res.status(500).json({ error: msg })
  }
}
