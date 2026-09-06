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
  /** Rij-id van het postvak; pas gevuld als migratie 245 gedraaid is. */
  account_id: string | null
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
  /** Rij-id van het postvak (migratie 245); `account_id` als de aanroeper EmailCredentials doorgeeft. */
  id?: string | null
  account_id?: string | null
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

  // Op de rij-id zodra we die kennen: met twee postvakken schrijft een update
  // op user_id het verse token ook over het andere postvak heen.
  const postvakId = rij.id ?? rij.account_id ?? null
  if (postvakId || rij.user_id) {
    const doel = () => supabaseAdmin.from('user_email_settings').update(patch)
    const { error } = postvakId
      ? await doel().eq('id', postvakId)
      : await doel().eq('user_id', rij.user_id as string)
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
// ── GEDEELD-MET-API: upsert-ladder ────────────────────────────────────────
// Migratie 245 zet (account_id, folder) naast (user_id, folder); migratie 246
// laat de oude sleutel vallen. Zolang beide werelden kunnen bestaan proberen we
// de nieuwe sleutel eerst en vallen we terug op de oude. PostgREST geeft 42703
// bij een select op een kolom die er nog niet is, PGRST204 als die kolom in de
// lading van een insert of upsert staat, en 42P10 als er bij de opgegeven
// kolommen geen unieke index te vinden is. Alle drie horen erbij: zonder
// PGRST204 staat de sync stil op een database zonder 245, zonder 42P10 na 246.
// account_id gaat ook in de rij mee, anders vindt de nieuwe sleutel nooit een
// bestaande rij.
// Dezelfde ladder staat in src/trigger/mail-idle.ts en in de andere
// api-mailbestanden.
function isOnbekendeSleutel(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  return fout.code === '42703' || fout.code === '42P10' || fout.code === 'PGRST204'
    || /column .* does not exist|could not find the .* column|no unique or exclusion constraint/i.test(fout.message || '')
}

type SyncStateUitkomst = { error: { message: string; code?: string } | null }

async function upsertSyncStateRij(rij: Record<string, unknown>, accountId?: string | null): Promise<SyncStateUitkomst> {
  const pogingen: Array<{ onConflict: string; metAccount: boolean }> = accountId
    ? [
        { onConflict: 'account_id,folder', metAccount: true },
        { onConflict: 'user_id,folder', metAccount: true },
        { onConflict: 'user_id,folder', metAccount: false },
      ]
    : [{ onConflict: 'user_id,folder', metAccount: false }]

  let laatste: SyncStateUitkomst = { error: { message: 'onbekend' } }
  for (const poging of pogingen) {
    const lading = poging.metAccount ? { ...rij, account_id: accountId } : rij
    const uitkomst = await supabaseAdmin.from('email_sync_state').upsert(lading, { onConflict: poging.onConflict })
    if (!uitkomst.error) return { error: null }
    laatste = uitkomst as SyncStateUitkomst
    if (!isOnbekendeSleutel(uitkomst.error)) return laatste
  }
  return laatste
}

/**
 * Dezelfde ladder voor `emails`: migratie 245 zet (account_id, message_id)
 * naast (user_id, message_id), 246 laat de oude sleutel vallen. Eerst de nieuwe
 * sleutel, dan de oude, en als laatste zonder account_id voor een database van
 * vóór 245.
 */
type EmailUpsertUitkomst = { data: { id: string } | null; error: { message: string; code?: string } | null }

async function upsertEmailRij(rij: Record<string, unknown>): Promise<EmailUpsertUitkomst> {
  const pogingen: Array<{ onConflict: string; metAccount: boolean }> = rij.account_id
    ? [
        { onConflict: 'account_id,message_id', metAccount: true },
        { onConflict: 'user_id,message_id', metAccount: true },
        { onConflict: 'user_id,message_id', metAccount: false },
      ]
    : [{ onConflict: 'user_id,message_id', metAccount: false }]

  let laatste: EmailUpsertUitkomst = { data: null, error: { message: 'onbekend' } }
  for (const poging of pogingen) {
    const lading = poging.metAccount ? rij : (() => { const kopie = { ...rij }; delete kopie.account_id; return kopie })()
    const uitkomst = await supabaseAdmin
      .from('emails')
      .upsert(lading, { onConflict: poging.onConflict, ignoreDuplicates: false })
      .select('id')
      .maybeSingle()
    if (!uitkomst.error) return uitkomst as unknown as EmailUpsertUitkomst
    laatste = uitkomst as unknown as EmailUpsertUitkomst
    if (!isOnbekendeSleutel(uitkomst.error)) return laatste
  }
  return laatste
}
// ── GEDEELD-MET-API EINDE: upsert-ladder ──────────────────────────────────

async function meldToegangIngetrokken(userId: string, accountId?: string | null): Promise<void> {
  const nu = new Date().toISOString()
  const { error } = await upsertSyncStateRij({
    user_id: userId,
    folder: 'inbox',
    status: 'uitgezet',
    laatste_fout: 'Toegang ingetrokken, koppel opnieuw',
    laatste_fout_op: nu,
    updated_at: nu,
  }, accountId)
  if (error) console.warn('[oauth] status uitgezet schrijven mislukt:', error.message)
}
// ── GEDEELD-MET-API EINDE: OAuth-toegangstoken ────────────────────────────

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

/**
 * Een select met `account_id` erbij zodra we het postvak kennen, met terugval
 * op dezelfde vraag zonder dat filter voor een database van vóór migratie 245.
 */
async function leesMetAccount<T extends { error: { code?: string; message?: string } | null }>(
  accountId: string | null | undefined,
  bouw: (metAccount: boolean) => PromiseLike<T>,
): Promise<T> {
  if (accountId) {
    const metAccount = await bouw(true)
    if (!isKolomFout(metAccount.error)) return metAccount
  }
  return await bouw(false)
}

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

async function getEmailCredentials(userId: string, accountId?: string | null): Promise<EmailCredentials> {
  const data = await leesCredentialRij(userId, accountId)

  if (!data?.gmail_address) {
    throw new Error('Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.')
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
    account_id: (data.id as string) ?? null,
    gmail_address: data.gmail_address,
    app_password: data.encrypted_app_password ? decryptPassword(data.encrypted_app_password) : '',
    user_id: userId,
    auth_type: (data.auth_type as string) || 'wachtwoord',
    oauth_refresh_token_enc: (data.oauth_refresh_token_enc as string) ?? null,
    oauth_access_token_enc: (data.oauth_access_token_enc as string) ?? null,
    oauth_token_verloopt_op: (data.oauth_token_verloopt_op as string) ?? null,
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

// ───── Bodies in email_bodies (migratie 244) ─────
// emails.body_html wordt niet meer gelezen of geschreven; de html staat in een
// eigen tabel zodat de emails-rij en de realtime-payloads licht blijven.
// body_text blijft op emails voor de lijst-view (LEFT(body_text, 200)), maar
// begrensd.
const MAX_BODY_TEXT = 20_000

// ── CITAAT-SPLITSING: letterlijke kopie van src/lib/mail/quoted.ts ──
// api/ importeert niets uit src; wijzig je daar iets, wijzig het hier en in
// api/prefetch-email-bodies.ts mee, anders splitsen server en client anders.
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

async function bewaarBody(email_id: string, user_id: string, html: string, tekst: string): Promise<void> {
  const { eigen, geciteerd } = splitsCitaat(html)
  const { error } = await supabaseAdmin
    .from('email_bodies')
    .upsert({
      email_id,
      user_id,
      body_html: eigen,
      body_text: tekst || null,
      quoted_html: geciteerd,
      bijgewerkt_op: new Date().toISOString(),
    }, { onConflict: 'email_id' })
  if (error) console.warn('[read-email] email_bodies schrijven mislukt:', error.message)
}

// ───── Persistent attachment-cache (sprint 3) ─────
const STORAGE_BUCKET = 'email-attachments'
const SIGNED_URL_TTL = 60 * 60 // 1 uur — voldoende voor reading-sessie
// Zie api/email-attachment.ts: alles tot deze grens gaat via storage, want een
// grotere bijlage past niet in de 4,5 MB responslimiet van Vercel.
const MAX_CACHE_BYTES = 25 * 1024 * 1024

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
  return rb.size <= MAX_CACHE_BYTES
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

/**
 * Uit welk postvak dit verzoek komt (user_email_settings.id, migratie 245).
 * Ontbreekt hij, dan kiest de credential-lezer het standaardpostvak, dus oude
 * clients blijven werken.
 */
function leesAccountId(req: VercelRequest): string | null {
  const uitBody = (req.body as Record<string, unknown> | undefined)?.account_id
  if (typeof uitBody === 'string' && uitBody) return uitBody
  const uitQuery = req.query?.account_id
  if (typeof uitQuery === 'string' && uitQuery) return uitQuery
  return null
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
    // Bij auth_type google of microsoft gaat er een access-token over de lijn
    // in plaats van een wachtwoord (XOAUTH2).
    let access_token: string | undefined
    let creds: EmailCredentials | null = null
    try {
      creds = await getEmailCredentials(user_id, leesAccountId(req))
    } catch {
      creds = null
    }
    if (creds) {
      gmail_address = creds.gmail_address
      app_password = creds.app_password
      imap_host = creds.imap_host
      imap_port = creds.imap_port
      // Buiten de try: een verlopen koppeling is een echte fout en mag niet
      // stilletjes op de request-body terugvallen.
      if (isOauthKoppeling(creds.auth_type)) access_token = await haalToegangstoken(creds)
    } else {
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
        gmail_address, app_password, access_token, uid, folder, imap_host, imap_port,
      })
      return res.status(200).json({ ok: true })
    }

    // Step 1: Check Supabase cache first
    {

      // Ook op postvak: uid 1234 bestaat in élke mailbox. Zonder dit filter
      // krijgt de gebruiker de mail van het verkeerde postvak te zien, en bij
      // een treffer in allebei valt de cache stil weg op PGRST116.
      const { data: cached } = await leesMetAccount(creds?.account_id, (metAccount) => {
        const basis = supabaseAdmin
          .from('emails')
          .select('id, van, aan, onderwerp, datum, gelezen, body_text, attachment_meta, message_id')
          .eq('user_id', user_id)
          .eq('uid', Number(uid))
          .eq('map', mapValue)
        return (metAccount ? basis.eq('account_id', creds?.account_id as string) : basis).limit(1).maybeSingle()
      })

      // Een rij in email_bodies betekent: volledig geparsed (ook als de mail
      // geen HTML-deel had, dan is body_html leeg). Alleen op emails.body_text
      // afgaan was fout: de aanvraag-classifier vult die kolom ook.
      const { data: body } = cached
        ? await supabaseAdmin
          .from('email_bodies')
          .select('body_html, body_text, quoted_html')
          .eq('email_id', cached.id)
          .maybeSingle()
        : { data: null }

      if (cached && body) {
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
              gmail_address, app_password, access_token, uid, folder, imap_host, imap_port,
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
          bodyHtml: (body.body_html || '') + (body.quoted_html || ''),
          bodyText: body.body_text || cached.body_text || '',
          quoted_html: body.quoted_html || null,
          attachments: attachmentsOut,
          messageId: cached.message_id || '',
          inReplyTo: '',
          fromCache: true,
        })
      }

      // Step 2: Not in cache or no body — fetch from IMAP
      const result = await fetchFromIMAP({
        gmail_address, app_password, access_token, uid, folder, imap_host, imap_port,
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
      const bodyTextBegrensd = (result.bodyText || '').slice(0, MAX_BODY_TEXT)
      if (cached) {
        await supabaseAdmin
          .from('emails')
          .update({
            body_text: bodyTextBegrensd || null,
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
        const { data: upserted } = await upsertEmailRij({
            user_id,
            organisatie_id: (orgProfiel?.organisatie_id as string | null) ?? null,
            // Zonder account_id op de rij vindt de nieuwe sleutel
            // (account_id, message_id) nooit een bestaande mail terug.
            ...(creds?.account_id ? { account_id: creds.account_id } : {}),
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
            body_text: bodyTextBegrensd || null,
            inhoud: bodyTextBegrensd,
            gmail_id: String(uid),
            cached_at: new Date().toISOString(),
        })
        email_uuid = upserted?.id || null
        // Fallback: als upsert geen id terug gaf (bijv. message_id NULL),
        // doe een gerichte SELECT zodat we alsnog kunnen cachen.
        if (!email_uuid) {
          const { data: refetched } = await leesMetAccount(creds?.account_id, (metAccount) => {
            const basis = supabaseAdmin
              .from('emails')
              .select('id')
              .eq('user_id', user_id)
              .eq('uid', Number(uid))
              .eq('map', mapValue)
            return (metAccount ? basis.eq('account_id', creds?.account_id as string) : basis).limit(1).maybeSingle()
          })
          email_uuid = refetched?.id || null
        }
        // Silently ignore cache write failures — user still gets the email
      }

      // Step 4: Cache binaries naar Storage (parallel) — alleen images < 10MB
      // en PDFs < 25MB. Bouw signed URLs voor de response.
      let signedMap = new Map<string, string>()
      if (email_uuid) {
        await bewaarBody(email_uuid, user_id, result.bodyHtml, bodyTextBegrensd)
        signedMap = await cacheAttachmentsToStorage(user_id, email_uuid, result.rawBuffers)
      }
      const { geciteerd: quotedHtml } = splitsCitaat(result.bodyHtml)

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
        quoted_html: quotedHtml,
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
    Sentry.captureException(error)
    return res.status(500).json({ error: msg })
  }
}

async function markeerGelezenOpImap(opts: {
  gmail_address: string
  app_password: string
  access_token?: string
  uid: number | string
  folder: string
  imap_host: string
  imap_port: number
}): Promise<void> {
  const client = new ImapFlow({
    host: opts.imap_host,
    port: opts.imap_port,
    secure: opts.imap_port === 993,
    auth: opts.access_token
      ? { user: opts.gmail_address, accessToken: opts.access_token }
      : { user: opts.gmail_address, pass: opts.app_password },
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
  access_token?: string
  uid: number | string
  folder: string
  imap_host: string
  imap_port: number
}) {
  const client = new ImapFlow({
    host: opts.imap_host,
    port: opts.imap_port,
    secure: opts.imap_port === 993,
    auth: opts.access_token
      ? { user: opts.gmail_address, accessToken: opts.access_token }
      : { user: opts.gmail_address, pass: opts.app_password },
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
