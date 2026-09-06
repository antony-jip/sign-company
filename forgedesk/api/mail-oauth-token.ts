/**
 * Stap 3 van het koppelen: een geldig access-token voor XOAUTH2, voor wie geen
 * eigen OAuth-clientgeheimen mag kennen.
 *
 * Alleen in service-modus: Authorization: Bearer ${CRON_SECRET} plus
 * `service_user_id`. De IDLE-werker op Trigger.dev (src/trigger/mail-idle.ts)
 * is de enige klant. Zo staan MAIL_OAUTH_*_CLIENT_SECRET alleen op Vercel en
 * hoeft Trigger.dev ze niet te kennen; de verversing (en het terugschrijven
 * van het nieuwe token) gebeurt op één plek.
 *
 * Het token zelf is kortlevend en niet vervangbaar door een wachtwoord: het
 * geeft toegang tot IMAP en SMTP van dat ene postvak, één uur lang.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ── GEDEELD-MET-API BEGIN: OAuth-geheimen ─────────────────────────────────
// Letterlijke kopie in api/mail-oauth-start.ts, api/mail-oauth-callback.ts en
// api/mail-oauth-token.ts. Zoek op "GEDEELD-MET-API: OAuth-geheimen".
//
// Twee geheimen met twee taken: EMAIL_ENCRYPTION_KEY versleutelt tokens en
// wachtwoorden, MAIL_OAUTH_STATE_SECRET tekent de OAuth-state. Eén sleutel
// voor twee primitieven is een ongeluk in wording, dus de terugval is
// expliciet en waarschuwt hoorbaar. Onder de 32 tekens weigeren we te starten:
// dat is te weinig voor een HMAC-sleutel en voor een scrypt-wachtwoord.

const GEHEIM_MIN_LENGTE = 32
let terugvalGemeld = false

function geldigGeheim(waarde: string | undefined): string | null {
  return waarde && waarde.length >= GEHEIM_MIN_LENGTE ? waarde : null
}

/** EMAIL_ENCRYPTION_KEY, alleen als hij lang genoeg is. */
function versleutelGeheim(): string | null {
  return geldigGeheim(process.env.EMAIL_ENCRYPTION_KEY)
}

/** MAIL_OAUTH_STATE_SECRET, met EMAIL_ENCRYPTION_KEY als expliciete terugval. */
function stateGeheim(): string | null {
  const eigen = process.env.MAIL_OAUTH_STATE_SECRET
  if (eigen) return geldigGeheim(eigen)
  const terugval = versleutelGeheim()
  if (terugval && !terugvalGemeld) {
    terugvalGemeld = true
    console.warn('[mail-oauth] MAIL_OAUTH_STATE_SECRET ontbreekt; terugval op EMAIL_ENCRYPTION_KEY. Zet een eigen state-geheim van minstens 32 tekens.')
  }
  return terugval
}
// ── GEDEELD-MET-API EINDE: OAuth-geheimen ─────────────────────────────────

function decryptPassword(encrypted: string): string {
  if (encrypted.startsWith('b64:')) {
    return Buffer.from(encrypted.slice(4), 'base64').toString('utf8')
  }
  const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
  if (!ENCRYPTION_KEY) {
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
//
// AFWIJKING (6 sep 2026): alleen deze kopie schrijft het verse token
// voorwaardelijk terug (zie haalToegangstoken), zodat een trage tweede
// verversing een nieuwer token niet met een ouder overschrijft. De andere zes
// kopieën hebben die bescherming nog niet; zie LOGBOEK.md.

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
    const doel = () => {
      const vraag = supabaseAdmin.from('user_email_settings').update(patch)
      return postvakId ? vraag.eq('id', postvakId) : vraag.eq('user_id', rij.user_id as string)
    }
    // Microsoft rouleert refresh-tokens, dus twee verversingen tegelijk kunnen
    // elkaar overschrijven. Wint de trage, dan staat er een refresh-token in de
    // rij dat al vervangen is en valt de mailbox stil. Alleen schrijven als de
    // opgeslagen vervaldatum ouder is dan de nieuwe: dan wint altijd de
    // nieuwste. Geen .or(): die faalt op UPDATE, vandaar twee pogingen.
    const { data, error } = await doel()
      .lt('oauth_token_verloopt_op', nieuwVerlooptOp)
      .select('user_id')
    if (error) console.warn('[oauth] nieuw token niet opgeslagen:', error.message)
    else if (!data || data.length === 0) {
      const leeg = await doel()
        .is('oauth_token_verloopt_op', null)
        .select('user_id')
      if (leeg.error) console.warn('[oauth] nieuw token niet opgeslagen:', leeg.error.message)
      else if (!leeg.data || leeg.data.length === 0) {
        console.info('[oauth] nieuwer token stond er al, niet overschreven', { userId: rij.user_id })
      }
    }
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

export const config = { maxDuration: 15 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Zonder bruikbaar versleutelgeheim is elk antwoord hier onbetrouwbaar: het
  // ontsleutelen van het refresh-token en het terugschrijven van het nieuwe
  // access-token leunen er allebei op.
  if (!versleutelGeheim()) return res.status(503).json({ reden: 'niet_geconfigureerd' })

  const userId = typeof req.body?.service_user_id === 'string' ? req.body.service_user_id : null
  if (!userId) return res.status(400).json({ error: 'service_user_id ontbreekt' })

  const accountId = typeof req.body?.account_id === 'string' ? req.body.account_id : null
  const { data, error } = await leesPostvakRij(
    userId,
    accountId,
    'id, user_id, gmail_address, auth_type, imap_host, imap_port, oauth_refresh_token_enc, oauth_access_token_enc, oauth_token_verloopt_op',
  )
  // Zonder migratie 244 bestaan de oauth-kolommen niet en faalt de select. Dat
  // is geen kapotte mailbox maar een omgeving die nog niet klaar is voor OAuth;
  // zeg dat, in plaats van "geen instellingen gevonden".
  if (error && /42703|PGRST204|column .* does not exist|could not find the .* column/i.test(`${error.code} ${error.message}`)) {
    return res.status(503).json({ error: 'Koppelen met Google of Microsoft is nog niet beschikbaar in deze omgeving', reden: 'niet_geconfigureerd' })
  }
  if (error || !data) return res.status(404).json({ error: 'Geen email instellingen gevonden' })
  if (!isOauthKoppeling(data.auth_type as string)) {
    return res.status(400).json({ error: 'Deze mailbox gebruikt geen OAuth' })
  }

  try {
    const token = await haalToegangstoken(data as OauthRij, { forceer: req.body?.forceer === true })
    return res.status(200).json({
      access_token: token,
      verloopt_op: data.oauth_token_verloopt_op,
      gmail_address: data.gmail_address,
      auth_type: data.auth_type,
      account_id: (data as Record<string, unknown>).id ?? null,
      imap_host: data.imap_host || 'imap.gmail.com',
      imap_port: data.imap_port || 993,
    })
  } catch (err) {
    const melding = err instanceof Error ? err.message : 'Token ophalen mislukt'
    console.error('[mail-oauth-token] mislukt', { userId, melding })
    // 401 en niet 500: de aanroeper moet hieraan kunnen zien dat opnieuw
    // proberen zinloos is tot de gebruiker opnieuw koppelt.
    return res.status(401).json({ error: melding })
  }
}
