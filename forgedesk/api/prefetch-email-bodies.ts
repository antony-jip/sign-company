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
async function zoekKandidaten(user_id: string, mapValue: string, gewenst: number, accountId?: string | null): Promise<{ rijen: Rij[]; meer: boolean }> {
  const rijen: Rij[] = []
  const PAGINA = 100
  for (let pagina = 0; pagina < 5 && rijen.length <= gewenst; pagina++) {
    // Per postvak: de IMAP-verbinding hieronder gaat naar één mailbox, en
    // uid 1234 bestaat in allebei. Zonder dit filter wint er stil één en wordt
    // de body van de ene mailbox op de rij van de andere geschreven.
    const { data: blok, error } = await leesMetAccount(accountId, (metAccount) => {
      const basis = supabaseAdmin
        .from('emails')
        .select('id, uid')
        .eq('user_id', user_id)
        .eq('map', mapValue)
        .not('uid', 'is', null)
      return (metAccount ? basis.eq('account_id', accountId as string) : basis)
        .order('datum', { ascending: false })
        .range(pagina * PAGINA, pagina * PAGINA + PAGINA - 1)
    })
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
  /** Rij-id van het postvak; pas gevuld als migratie 245 gedraaid is. */
  account_id: string | null
  gmail_address: string
  app_password: string
  user_id: string
  auth_type: string
  oauth_refresh_token_enc: string | null
  oauth_access_token_enc: string | null
  oauth_token_verloopt_op: string | null
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

const CREDENTIAL_KOLOMMEN_VOOR_244 = 'id, gmail_address, encrypted_app_password, smtp_host, smtp_port, imap_host, imap_port'
const CREDENTIAL_KOLOMMEN = `${CREDENTIAL_KOLOMMEN_VOOR_244}, auth_type, oauth_refresh_token_enc, oauth_access_token_enc, oauth_token_verloopt_op`

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

async function leesCredentialRij(userId: string, accountId?: string | null): Promise<CredentialRij | null> {
  async function haalRij(keuze: 'account' | 'standaard' | 'enige') {
    const bouw = (kolommen: string) => {
      let vraag = supabaseAdmin.from('user_email_settings').select(kolommen).eq('user_id', userId)
      if (keuze === 'account') vraag = vraag.eq('id', accountId as string)
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
    const creds = await getEmailCredentials(user_id, leesAccountId(req))

    const mapValue = String(folder).toUpperCase() === 'INBOX' ? 'inbox' : String(folder).toLowerCase()
    const batchGrootte = Math.min(Math.max(Number(limit) || 25, 1), MAX_BATCH)

    // Nieuwste eerst: dat is wat de gebruiker zo gaat openen.
    const { rijen, meer: meerBeschikbaar } = await zoekKandidaten(user_id, mapValue, batchGrootte, creds.account_id)

    if (rijen.length === 0) {
      return res.status(200).json({ verwerkt: 0, mislukt: 0, resterend: false })
    }

    const uidPerRij = new Map<number, string>()
    for (const r of rijen) uidPerRij.set(Number(r.uid), r.id)

    const client = new ImapFlow({
      host: creds.imap_host,
      port: creds.imap_port,
      secure: creds.imap_port === 993,
      auth: isOauthKoppeling(creds.auth_type)
        ? { user: creds.gmail_address, accessToken: await haalToegangstoken(creds) }
        : { user: creds.gmail_address, pass: creds.app_password },
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
