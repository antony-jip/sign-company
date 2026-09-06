/**
 * Stap 2 van het koppelen: Google of Microsoft stuurt de gebruiker hier terug
 * met een `code`. Die wisselen we in voor een refresh- en access-token,
 * versleutelen ze met EMAIL_ENCRYPTION_KEY (hetzelfde g1-formaat als het
 * app-wachtwoord) en zetten de mailbox op `auth_type` google of microsoft.
 *
 * Geen Authorization-header: dit is een browser-redirect. De koppeling aan een
 * gebruiker komt daarom uit de ondertekende `state` uit api/mail-oauth-start.ts
 * — HMAC-SHA256 over user_id, provider, tijd en een nonce, hoogstens tien
 * minuten oud. Zonder die handtekening zou iemand met een eigen `code` de
 * mailbox van een ander kunnen overschrijven.
 *
 * De handtekening alleen volstaat niet: een aanvaller kan bij start een
 * geldige state voor zijn eigen account ophalen en het slachtoffer naar die
 * URL lokken. Daarom moet de nonce uit de state gelijk zijn aan de nonce in
 * het HttpOnly-cookie dat start heeft gezet, en gaat de PKCE-verifier (uit
 * diezelfde nonce afgeleid) mee bij het inwisselen van de code. Het cookie
 * wordt bij elk antwoord gewist.
 *
 * Antwoordt altijd met een redirect naar de instellingenpagina, ook bij een
 * fout: dit endpoint zit in de adresbalk van de gebruiker, niet in een fetch.
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

// ── GEDEELD-MET-API BEGIN: OAuth-providers ────────────────────────────────
// Letterlijke kopie in api/mail-oauth-start.ts en api/mail-oauth-callback.ts.
// De scopes zijn het hele verhaal: Gmail geeft met https://mail.google.com/
// zowel IMAP als SMTP, Microsoft wil ze los. `openid email` staat erbij omdat
// het id_token het adres van de mailbox draagt; zonder dat weten we niet welk
// postvak er gekoppeld is.

type Provider = 'google' | 'microsoft'

interface ProviderConfig {
  scopes: string[]
  imap_host: string
  imap_port: number
  smtp_host: string
  smtp_port: number
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  google: {
    scopes: ['https://mail.google.com/', 'openid', 'email'],
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
  },
  microsoft: {
    scopes: [
      'offline_access',
      'https://outlook.office.com/IMAP.AccessAsUser.All',
      'https://outlook.office.com/SMTP.Send',
      'openid',
      'email',
    ],
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
  },
}

function isProvider(waarde: unknown): waarde is Provider {
  return waarde === 'google' || waarde === 'microsoft'
}

function redirectUri(): string {
  return process.env.MAIL_OAUTH_REDIRECT || 'https://app.doen.team/api/mail-oauth-callback'
}

/**
 * De nonce bindt de state aan de browser die het koppelen begon. Hij staat in
 * de HMAC-kern én in een HttpOnly-cookie; de callback eist dat beide gelijk
 * zijn. Path=/api omdat alleen de callback hem hoeft te lezen, SameSite=Lax
 * omdat de terugkeer van Google of Microsoft een top-level navigatie is.
 */
const NONCE_COOKIE = 'doen_mail_oauth'
const NONCE_COOKIE_MAX_AGE = 600

function nonceCookie(nonce: string): string {
  return `${NONCE_COOKIE}=${nonce}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=${NONCE_COOKIE_MAX_AGE}`
}

function leegNonceCookie(): string {
  return `${NONCE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0`
}

function leesNonceCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  for (const deel of cookieHeader.split(';')) {
    const gelijk = deel.indexOf('=')
    if (gelijk <= 0) continue
    if (deel.slice(0, gelijk).trim() !== NONCE_COOKIE) continue
    const waarde = deel.slice(gelijk + 1).trim()
    return waarde || null
  }
  return null
}

function tekenState(userId: string, provider: Provider, tijd: number, nonce: string, geheim: string): string {
  const kern = `${userId}.${provider}.${tijd}.${nonce}`
  const hmac = crypto.createHmac('sha256', geheim).update(kern).digest('base64url')
  return `${Buffer.from(kern, 'utf8').toString('base64url')}.${hmac}`
}

/**
 * PKCE-verifier afgeleid van de nonce, niet apart opgeslagen: dan hoeft er
 * niets extra's in het cookie en kan de callback hem opnieuw berekenen. 43
 * tekens base64url valt binnen de 43-128 van RFC 7636.
 */
function pkceVerifier(nonce: string, geheim: string): string {
  return crypto.createHmac('sha256', geheim).update(`pkce.${nonce}`).digest('base64url')
}

function pkceUitdaging(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}
// ── GEDEELD-MET-API EINDE: OAuth-providers ────────────────────────────────

const STATE_GELDIG_MS = 10 * 60_000

function gelijk(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
}

function leesState(state: string, geheim: string): { userId: string; provider: Provider; nonce: string } | null {
  const punt = state.lastIndexOf('.')
  if (punt <= 0) return null
  const kern = Buffer.from(state.slice(0, punt), 'base64url').toString('utf8')
  const delen = kern.split('.')
  if (delen.length !== 4) return null
  const [userId, provider, tijdTekst, nonce] = delen
  if (!isProvider(provider)) return null
  if (!nonce) return null
  const tijd = Number(tijdTekst)
  if (!Number.isFinite(tijd) || Math.abs(Date.now() - tijd) > STATE_GELDIG_MS) return null

  if (!gelijk(state, tekenState(userId, provider, tijd, nonce, geheim))) return null
  return { userId, provider, nonce }
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

function tokenUrl(provider: Provider): string {
  if (provider === 'microsoft') {
    const tenant = process.env.MAIL_OAUTH_MICROSOFT_TENANT || 'common'
    return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`
  }
  return 'https://oauth2.googleapis.com/token'
}

/**
 * Het adres van de mailbox uit het id_token. Niet verifiëren hoeft: dit token
 * komt rechtstreeks van het token-endpoint over TLS, niet via de browser.
 */
function adresUitIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null
  const delen = idToken.split('.')
  if (delen.length < 2) return null
  try {
    const lading = JSON.parse(Buffer.from(delen[1], 'base64url').toString('utf8')) as Record<string, unknown>
    const adres = lading.email || lading.preferred_username || lading.upn
    return typeof adres === 'string' && adres.includes('@') ? adres.toLowerCase() : null
  } catch {
    return null
  }
}

function appUrl(): string {
  try {
    return new URL(redirectUri()).origin
  } catch {
    return 'https://app.doen.team'
  }
}

function terug(res: VercelResponse, params: Record<string, string>) {
  const query = new URLSearchParams({ tab: 'email', ...params })
  // Het nonce-cookie is eenmalig: wissen op elk pad, ook op het foutpad, zodat
  // een half afgebroken poging niet later alsnog ingewisseld kan worden.
  res.setHeader('Set-Cookie', leegNonceCookie())
  res.setHeader('Location', `${appUrl()}/instellingen?${query.toString()}`)
  return res.status(302).end()
}

interface PostvakRij {
  id: string | null
  gmail_address: string | null
  oauth_refresh_token_enc: string | null
}

/**
 * Welke rij in user_email_settings dit postvak is. Migratie 246 laat
 * UNIQUE (user_id) vallen, dus vanaf dan kan één gebruiker meer postvakken
 * hebben en is het adres wat ze uit elkaar houdt. Staat er precies één rij en
 * wijkt het adres af, dan is dat de rij die opnieuw gekoppeld wordt (het
 * gedrag van vóór 246). Meer rijen zonder adres-treffer is een nieuw postvak.
 */
async function zoekPostvakRij(userId: string, adres: string): Promise<{ rij: PostvakRij | null; aantal: number }> {
  for (const kolommen of ['id, gmail_address, oauth_refresh_token_enc', 'gmail_address, oauth_refresh_token_enc']) {
    const { data, error } = await supabaseAdmin
      .from('user_email_settings')
      .select(kolommen)
      .eq('user_id', userId)
    if (error) {
      if (error.code === '42703' || /column .* does not exist/i.test(error.message)) continue
      console.warn('[mail-oauth-callback] postvakken opvragen mislukt:', error.message)
      return { rij: null, aantal: 0 }
    }
    const rijen = ((data || []) as unknown as Array<Record<string, unknown>>).map((r) => ({
      id: (r.id as string) ?? null,
      gmail_address: (r.gmail_address as string) ?? null,
      oauth_refresh_token_enc: (r.oauth_refresh_token_enc as string) ?? null,
    }))
    const opAdres = rijen.find((r) => (r.gmail_address || '').toLowerCase() === adres)
    if (opAdres) return { rij: opAdres, aantal: rijen.length }
    return { rij: rijen.length === 1 ? rijen[0] : null, aantal: rijen.length }
  }
  return { rij: null, aantal: 0 }
}

// ── GEDEELD-MET-API: upsert-ladder ────────────────────────────────────────
// user_email_settings had UNIQUE (user_id) uit migratie 037; migratie 246 haalt
// die weg en zet er een partiële unieke index op is_standaard voor terug. Een
// upsert op user_id geeft daarna 42P10 (geen unieke index bij die kolommen) in
// plaats van 42703, en juist die code ving de bestaande terugval niet: opslaan
// zou dan falen, precies de knop die je nodig hebt om het te herstellen.
// Kennen we het rij-id, dan is een gerichte update altijd beter dan een upsert.
// Dezelfde ladder staat in api/mail-oauth-callback.ts en api/email-settings.ts.
function isOnbekendeSleutel(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  return fout.code === '42703' || fout.code === '42P10' || fout.code === 'PGRST204'
    || /column .* does not exist|could not find the .* column|no unique or exclusion constraint/i.test(fout.message || '')
}

/** Schrijft het postvak weg: op id als we dat kennen, anders over de oude sleutel. */
async function schrijfPostvak(velden: Record<string, unknown>, userId: string, postvakId?: string | null): Promise<string | null> {
  if (postvakId) {
    const { error } = await supabaseAdmin.from('user_email_settings').update(velden).eq('id', postvakId)
    return error ? error.message : null
  }
  const upsert = await supabaseAdmin.from('user_email_settings').upsert({ ...velden, user_id: userId }, { onConflict: 'user_id' })
  if (!upsert.error) return null
  if (!isOnbekendeSleutel(upsert.error)) return upsert.error.message
  const update = await supabaseAdmin.from('user_email_settings').update(velden).eq('user_id', userId)
  return update.error ? update.error.message : null
}
// ── GEDEELD-MET-API EINDE: upsert-ladder ──────────────────────────────────

/**
 * Bewaren op de primaire sleutel zodra we die kennen, met de oude upsert op
 * user_id als terugval voor een database waar `id` nog niet uit de API komt.
 */
async function bewaarPostvak(rij: PostvakRij | null, aantal: number, velden: Record<string, unknown>, userId: string): Promise<string | null> {
  if (rij) {
    return await schrijfPostvak(velden, userId, rij.id)
  }
  // Een tweede postvak mag niet ook standaard zijn: migratie 246 legt daar een
  // unieke index op. Ontbreekt de kolom nog, dan invoegen zonder.
  for (const nieuw of aantal > 0 ? [{ ...velden, is_standaard: false }, velden] : [velden]) {
    const { error } = await supabaseAdmin.from('user_email_settings').insert(nieuw)
    if (!error) return null
    if (error.code === '42703' || /column .* does not exist/i.test(error.message)) continue
    return error.message
  }
  return 'invoegen mislukt'
}

/**
 * Kopie van herstelSyncStatus uit api/email-settings.ts: een nieuwe koppeling
 * is het herstelpad na een uitgezette mailbox. Mag het koppelen zelf nooit
 * laten falen.
 */
async function herstelSyncStatus(userId: string): Promise<void> {
  const nu = new Date().toISOString()
  try {
    const { error: stateErr } = await supabaseAdmin
      .from('email_sync_state')
      .update({ status: 'ok', laatste_fout: null, laatste_fout_op: null })
      .eq('user_id', userId)
    if (stateErr) console.warn('[mail-oauth-callback] sync-status herstellen mislukt:', stateErr.message)

    const { data: mislukt } = await supabaseAdmin
      .from('mailsync_taken')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'mislukt')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (mislukt?.id) {
      const { error: taakErr } = await supabaseAdmin
        .from('mailsync_taken')
        .update({
          status: 'wachtend', retry_count: 0, uitstel_count: 0, fout_soort: null, foutmelding: null,
          gemeld_op: null, geclaimd_op: null, geclaimd_door: null, lease_tot: null,
          scheduled_at: nu, updated_at: nu,
        })
        .eq('id', mislukt.id)
        .eq('status', 'mislukt')
      if (taakErr && taakErr.code !== '23505') console.warn('[mail-oauth-callback] mailsync-taak terugzetten mislukt:', taakErr.message)
    }
    await supabaseAdmin
      .from('mailsync_taken')
      .update({ scheduled_at: nu, updated_at: nu })
      .eq('user_id', userId)
      .eq('status', 'wachtend')
  } catch (err) {
    console.warn('[mail-oauth-callback] herstelSyncStatus gooide:', err instanceof Error ? err.message : err)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const foutParam = typeof req.query.error === 'string' ? req.query.error : null
  if (foutParam) {
    // access_denied is de gebruiker die op Annuleren drukt; geen fout om over
    // te struikelen, wel iets om terug te melden.
    return terug(res, { mail: foutParam === 'access_denied' ? 'geannuleerd' : 'fout', reden: foutParam.slice(0, 60) })
  }

  const code = typeof req.query.code === 'string' ? req.query.code : null
  const state = typeof req.query.state === 'string' ? req.query.state : null
  const geheim = stateGeheim()
  if (!geheim || !versleutelGeheim()) return terug(res, { mail: 'fout', reden: 'niet_geconfigureerd' })
  if (!code || !state) return terug(res, { mail: 'fout', reden: 'onvolledig' })

  const gelezen = leesState(state, geheim)
  if (!gelezen) return terug(res, { mail: 'fout', reden: 'state' })
  const { userId, provider, nonce } = gelezen

  // De browser die het koppelen begon moet dezelfde zijn als de browser die
  // hier terugkomt. Zonder deze controle kan een aanvaller een state voor zijn
  // eigen account laten tekenen en het postvak van een ander eraan hangen.
  const cookieNonce = leesNonceCookie(req.headers.cookie)
  if (!cookieNonce || !gelijk(cookieNonce, nonce)) {
    return terug(res, { mail: 'fout', reden: 'sessie' })
  }

  const clientId = provider === 'microsoft'
    ? process.env.MAIL_OAUTH_MICROSOFT_CLIENT_ID
    : process.env.MAIL_OAUTH_GOOGLE_CLIENT_ID
  const clientSecret = provider === 'microsoft'
    ? process.env.MAIL_OAUTH_MICROSOFT_CLIENT_SECRET
    : process.env.MAIL_OAUTH_GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return terug(res, { mail: 'fout', reden: 'niet_geconfigureerd' })

  try {
    const respons = await fetch(tokenUrl(provider), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri(),
        code_verifier: pkceVerifier(nonce, geheim),
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    })
    const antwoord = (await respons.json().catch(() => ({}))) as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      id_token?: string
      error?: string
    }
    if (!respons.ok || !antwoord.access_token) {
      console.error('[mail-oauth-callback] code inwisselen mislukt', { provider, status: respons.status, fout: antwoord.error })
      return terug(res, { mail: 'fout', reden: (antwoord.error || `http_${respons.status}`).slice(0, 60) })
    }

    const adres = adresUitIdToken(antwoord.id_token)
    if (!adres) return terug(res, { mail: 'fout', reden: 'geen_adres' })

    const config = PROVIDERS[provider]
    const nu = new Date().toISOString()
    const velden: Record<string, unknown> = {
      user_id: userId,
      gmail_address: adres,
      auth_type: provider,
      oauth_access_token_enc: versleutelToken(antwoord.access_token),
      oauth_token_verloopt_op: new Date(Date.now() + (Number(antwoord.expires_in) || 3600) * 1000).toISOString(),
      imap_host: config.imap_host,
      imap_port: config.imap_port,
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      // Het app-wachtwoord hoort niet te blijven staan naast een OAuth-
      // koppeling: dan zou een terugval erop stilletjes met oude gegevens
      // kunnen inloggen.
      encrypted_app_password: null,
      updated_at: nu,
    }
    const { rij: bestaandeRij, aantal } = await zoekPostvakRij(userId, adres)
    if (antwoord.refresh_token) {
      velden.oauth_refresh_token_enc = versleutelToken(antwoord.refresh_token)
    } else if (!bestaandeRij?.oauth_refresh_token_enc) {
      // Google geeft zonder prompt=consent geen nieuwe refresh-token. Is er al
      // één van een eerdere koppeling, dan blijft die staan; zo niet, dan valt
      // de mailbox na een uur stil en is opnieuw koppelen het enige juiste.
      return terug(res, { mail: 'fout', reden: 'geen_refresh_token' })
    }

    const opslagFout = await bewaarPostvak(bestaandeRij, aantal, velden, userId)
    if (opslagFout) {
      console.error('[mail-oauth-callback] opslaan mislukt:', opslagFout)
      return terug(res, { mail: 'fout', reden: 'opslaan' })
    }

    await herstelSyncStatus(userId)
    return terug(res, { mail: 'gekoppeld' })
  } catch (err) {
    console.error('[mail-oauth-callback] onverwachte fout:', err)
    return terug(res, { mail: 'fout', reden: 'onverwacht' })
  }
}
