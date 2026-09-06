import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { createTransport } from 'nodemailer'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { lookup } from 'dns/promises'

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

export const config = { maxDuration: 30 }

// ── SSRF-bescherming ──────────────────────────────────────────────────────
// host/poort komen uit de request-body. Zonder guard kan een ingelogde
// gebruiker dit endpoint als poortscanner tegen het interne Vercel-/cloud-
// netwerk gebruiken (inclusief het metadata-adres 169.254.169.254). We staan
// alleen de bekende mailpoorten toe en weigeren hosts die naar een privé-,
// loopback- of link-local-adres resolven.
const TOEGESTANE_POORTEN = new Set([143, 993, 110, 995, 25, 465, 587])

function isPrivaatIp(ip: string): boolean {
  const schoon = ip.replace(/^::ffff:/i, '') // IPv4-mapped IPv6
  const v4 = schoon.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true // link-local + metadata
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    return false
  }
  const l = schoon.toLowerCase()
  if (l === '::1' || l === '::') return true
  if (l.startsWith('fe80') || l.startsWith('fc') || l.startsWith('fd')) return true
  return false
}

async function valideerMailDoel(host: string, port: number): Promise<string | null> {
  if (!TOEGESTANE_POORTEN.has(Number(port))) return `Poort ${port} is niet toegestaan`
  if (!host || /[^a-z0-9.\-:[\]]/i.test(host)) return 'Ongeldige hostnaam'
  try {
    const adressen = await lookup(host, { all: true })
    if (!adressen.length) return 'Host kon niet worden opgezocht'
    if (adressen.some((a) => isPrivaatIp(a.address))) return 'Host verwijst naar een intern adres'
  } catch {
    return 'Host kon niet worden opgezocht'
  }
  return null
}

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for test-email-connection, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:test-email-connection', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] test-email-connection id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] test-email-connection id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

/**
 * De verbindingstest voor een koppeling met Google of Microsoft. Er is niets
 * in te vullen: adres, hosts en tokens staan al opgeslagen, dus de vraag is of
 * het token nog werkt.
 *
 * Een 401 krijgt één herkansing met een vers token (het opgeslagen token kan
 * ingetrokken zijn terwijl de vervaldatum nog in de toekomst ligt). Blijft het
 * 401, dan gaat de mailbox uit met "Toegang ingetrokken, koppel opnieuw" —
 * dezelfde melding die de gezondheidskaart toont.
 */
// ── GEDEELD-MET-API: credentials zonder 244 ───────────────────────────────
// auth_type en de oauth-kolommen komen uit migratie 244. Zolang die niet
// gedraaid is antwoordt PostgREST met 42703 of PGRST204 op de hele select.
// Er is dan per definitie geen koppeling met Google of Microsoft, dus dit pad
// hoeft niet terug te vallen: het moet alleen niet omvallen en niet als
// storing gelezen worden. Het wachtwoordpad hieronder leest niets uit de
// database (de velden komen uit het formulier) en raakt 244 dus niet.
function isKolomFout(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  if (fout.code === '42703' || fout.code === 'PGRST204') return true
  return /column .* does not exist|could not find the .* column/i.test(fout.message || '')
}
// ── GEDEELD-MET-API EINDE: credentials zonder 244 ─────────────────────────

// ── GEDEELD-MET-API: credentials per postvak ──────────────────────────────
// De volledige helper staat in api/send-email.ts; dit endpoint leest alleen de
// OAuth-kolommen, dus hier staat alleen de keuzeladder: het meegestuurde
// account_id, anders het postvak met `is_standaard`, anders de enige rij. Een
// kale `.maybeSingle()` op user_id klapt zodra er een tweede postvak is.
// `is_standaard` komt uit migratie 245; ontbreekt die kolom, dan faalt die
// poging en beslist de laatste.
type PostvakUitkomst = { data: Record<string, unknown> | null; error: { code?: string; message?: string } | null }

async function leesPostvakRij(userId: string, accountId: string | null, kolommen: string): Promise<PostvakUitkomst> {
  const bouw = async (keuze: 'account' | 'standaard' | 'enige'): Promise<PostvakUitkomst> => {
    let vraag = supabaseAdmin.from('user_email_settings').select(kolommen).eq('user_id', userId)
    if (keuze === 'account') vraag = vraag.eq('id', accountId as string)
    if (keuze === 'standaard') vraag = vraag.eq('is_standaard', true)
    const { data, error } = await vraag.maybeSingle()
    return { data: (data as unknown as Record<string, unknown> | null) ?? null, error }
  }
  if (accountId) return await bouw('account')
  const standaard = await bouw('standaard')
  if (!standaard.error && standaard.data) return standaard
  return await bouw('enige')
}
// ── GEDEELD-MET-API EINDE: credentials per postvak ────────────────────────

async function testOauthKoppeling(userId: string, accountId: string | null, res: VercelResponse) {
  const { data, error } = await leesPostvakRij(
    userId,
    accountId,
    'id, user_id, gmail_address, auth_type, imap_host, imap_port, smtp_host, smtp_port, oauth_refresh_token_enc, oauth_access_token_enc, oauth_token_verloopt_op',
  )
  if (isKolomFout(error)) {
    return res.status(400).json({ imap_ok: false, smtp_ok: false, error: 'Koppelen met Google of Microsoft is nog niet beschikbaar. Gebruik een app-wachtwoord.' })
  }
  if (error || !data || !isOauthKoppeling(data.auth_type as string)) {
    return res.status(400).json({ imap_ok: false, smtp_ok: false, error: 'Geen koppeling met Google of Microsoft gevonden' })
  }

  const adres = data.gmail_address as string
  const imap_host = (data.imap_host as string) || 'imap.gmail.com'
  const imap_port = Number(data.imap_port) || 993
  const smtp_host = (data.smtp_host as string) || 'smtp.gmail.com'
  const smtp_port = Number(data.smtp_port) || 587

  const doelFout = (await valideerMailDoel(imap_host, imap_port)) || (await valideerMailDoel(smtp_host, smtp_port))
  if (doelFout) return res.status(400).json({ imap_ok: false, smtp_ok: false, error: doelFout })

  const probeer = async (forceer: boolean) => {
    const token = await haalToegangstoken(data as OauthRij, { forceer })
    const [imapUit, smtpUit] = await Promise.allSettled([
      testImap({ gmail_address: adres, app_password: '', access_token: token, imap_host, imap_port }),
      testSmtp({ gmail_address: adres, app_password: '', access_token: token, smtp_host, smtp_port }),
    ])
    const fouten: string[] = []
    let auth = false
    if (imapUit.status === 'rejected') {
      fouten.push(`IMAP: ${imapUit.reason?.message || String(imapUit.reason)}`)
      auth = auth || isToegangGeweigerd(imapUit.reason)
    }
    if (smtpUit.status === 'rejected') {
      fouten.push(`SMTP: ${smtpUit.reason?.message || String(smtpUit.reason)}`)
      auth = auth || isToegangGeweigerd(smtpUit.reason)
    }
    return {
      imap_ok: imapUit.status === 'fulfilled' && imapUit.value === true,
      smtp_ok: smtpUit.status === 'fulfilled' && smtpUit.value === true,
      fouten,
      auth,
    }
  }

  try {
    let uitkomst = await probeer(false)
    if (uitkomst.auth) {
      uitkomst = await probeer(true)
      if (uitkomst.auth) {
        await meldToegangIngetrokken(userId)
        return res.status(200).json({ imap_ok: false, smtp_ok: false, error: 'Toegang ingetrokken, koppel opnieuw' })
      }
    }
    return res.status(200).json({
      imap_ok: uitkomst.imap_ok,
      smtp_ok: uitkomst.smtp_ok,
      error: uitkomst.fouten.length > 0 ? uitkomst.fouten.join('. ') : undefined,
    })
  } catch (err) {
    const melding = err instanceof Error ? err.message : 'Verbindingstest mislukt'
    console.error('[test-email-connection] OAuth-test mislukt:', melding)
    if (/ingetrokken/i.test(melding)) await meldToegangIngetrokken(userId)
    return res.status(200).json({ imap_ok: false, smtp_ok: false, error: melding })
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let userId: string
  try {
    userId = await verifyUser(req)
  } catch (authErr: unknown) {
    const msg = authErr instanceof Error ? authErr.message : 'Auth fout'
    console.error('[test-email-connection] Auth mislukt:', msg)
    return res.status(401).json({ imap_ok: false, smtp_ok: false, error: msg })
  }

  if (!(await enforceRateLimit(userId, res))) return

  try {
    const body = req.body || {}

    // Een OAuth-koppeling heeft geen velden om te testen: adres, hosts en
    // tokens staan al opgeslagen. De test is dan of het token nog werkt.
    if (isOauthKoppeling(body.auth_type)) {
      return await testOauthKoppeling(userId, typeof body.account_id === 'string' ? body.account_id : null, res)
    }

    const gmail_address = body.gmail_address
    const app_password = body.app_password
    const smtp_host = body.smtp_host || 'smtp.gmail.com'
    const smtp_port = body.smtp_port || 587
    const imap_host = body.imap_host || 'imap.gmail.com'
    const imap_port = body.imap_port || 993

    if (!gmail_address || !app_password) {
      return res.status(400).json({
        imap_ok: false,
        smtp_ok: false,
        error: 'E-mailadres en app-wachtwoord zijn verplicht',
      })
    }

    const imapFout = await valideerMailDoel(String(imap_host), Number(imap_port))
    const smtpFout = await valideerMailDoel(String(smtp_host), Number(smtp_port))
    if (imapFout || smtpFout) {
      return res.status(400).json({
        imap_ok: false,
        smtp_ok: false,
        error: imapFout || smtpFout,
      })
    }

    console.log(`[test-email-connection] Testing ${gmail_address} — IMAP: ${imap_host}:${imap_port}, SMTP: ${smtp_host}:${smtp_port}`)

    // Test IMAP en SMTP parallel (sneller, past binnen Vercel timeout)
    const [imapResult, smtpResult] = await Promise.allSettled([
      testImap({ gmail_address, app_password, imap_host, imap_port }),
      testSmtp({ gmail_address, app_password, smtp_host, smtp_port }),
    ])

    const imap_ok = imapResult.status === 'fulfilled' && imapResult.value === true
    const smtp_ok = smtpResult.status === 'fulfilled' && smtpResult.value === true

    const errors: string[] = []
    if (imapResult.status === 'rejected') {
      const imapErr = imapResult.reason?.message || String(imapResult.reason) || 'Onbekende fout'
      console.error('[test-email-connection] IMAP fout:', imapErr)
      errors.push(`IMAP: ${imapErr}`)
    }
    if (smtpResult.status === 'rejected') {
      const smtpErr = smtpResult.reason?.message || String(smtpResult.reason) || 'Onbekende fout'
      console.error('[test-email-connection] SMTP fout:', smtpErr)
      errors.push(`SMTP: ${smtpErr}`)
    }

    if (imap_ok && smtp_ok) {
      console.log('[test-email-connection] Beide tests geslaagd')
    }

    return res.status(200).json({
      imap_ok,
      smtp_ok,
      error: errors.length > 0 ? errors.join('. ') : undefined,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Verbindingstest mislukt'
    console.error('[test-email-connection] Onverwachte fout:', error)
    return res.status(500).json({ imap_ok: false, smtp_ok: false, error: msg })
  }
}

async function testImap(opts: {
  gmail_address: string
  app_password: string
  access_token?: string
  imap_host: string
  imap_port: number
}): Promise<boolean> {
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
    socketTimeout: 8000,
  })
  await client.connect()
  await client.logout()
  return true
}

async function testSmtp(opts: {
  gmail_address: string
  app_password: string
  access_token?: string
  smtp_host: string
  smtp_port: number
}): Promise<boolean> {
  const transporter = createTransport({
    host: opts.smtp_host,
    port: opts.smtp_port,
    secure: opts.smtp_port === 465,
    auth: opts.access_token
      ? { type: 'OAuth2' as const, user: opts.gmail_address, accessToken: opts.access_token }
      : { user: opts.gmail_address, pass: opts.app_password },
    connectionTimeout: 8000,
    socketTimeout: 8000,
  })
  await transporter.verify()
  return true
}
