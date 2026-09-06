/**
 * Stap 1 van het koppelen met Google of Microsoft: de autorisatie-URL.
 *
 * Waarom een endpoint en geen link in de UI. De `state` moet ondertekend zijn
 * met een servergeheim, anders kan iemand anders' mailbox aan jouw account
 * gekoppeld worden door de callback met een verzonnen state aan te roepen. Dat
 * geheim mag niet in de browser staan, dus bouwt de server de URL.
 *
 * De UI roept dit endpoint aan met de Supabase-sessie in de Authorization-
 * header, krijgt `{ url }` terug en navigeert daarheen (een <a href> zou de
 * header niet meesturen). Ontbreekt de client-id, dan komt er een 503 met
 * `{ reden: 'niet_geconfigureerd' }` zodat de knop uit kan blijven.
 *
 * Een handtekening op de user_id alleen is niet genoeg. Een aanvaller met een
 * eigen doen.-account haalt hier een geldige state op voor zijn eigen user_id,
 * lokt het slachtoffer naar die autorisatie-URL, en het postvak van het
 * slachtoffer hangt daarna aan het account van de aanvaller, inclusief IMAP en
 * SMTP. Daarom hoort de state ook aan de browsersessie vast: een willekeurige
 * nonce gaat mee in een HttpOnly-cookie en in de HMAC-kern, en de callback
 * eist dat beide dezelfde nonce dragen. PKCE (S256) sluit daarnaast af dat een
 * onderschepte `code` elders in te wisselen is.
 *
 * Env: MAIL_OAUTH_GOOGLE_CLIENT_ID, MAIL_OAUTH_MICROSOFT_CLIENT_ID,
 * MAIL_OAUTH_MICROSOFT_TENANT (standaard 'common'), MAIL_OAUTH_REDIRECT
 * (standaard https://app.doen.team/api/mail-oauth-callback),
 * MAIL_OAUTH_STATE_SECRET (valt terug op EMAIL_ENCRYPTION_KEY).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

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

function stateGeheim(): string | null {
  return process.env.MAIL_OAUTH_STATE_SECRET || process.env.EMAIL_ENCRYPTION_KEY || null
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

function autorisatieUrl(provider: Provider, clientId: string, state: string, uitdaging: string): string {
  const config = PROVIDERS[provider]
  if (provider === 'microsoft') {
    const tenant = process.env.MAIL_OAUTH_MICROSOFT_TENANT || 'common'
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri(),
      response_mode: 'query',
      scope: config.scopes.join(' '),
      state,
      prompt: 'select_account',
      code_challenge: uitdaging,
      code_challenge_method: 'S256',
    })
    return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize?${params.toString()}`
  }
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: config.scopes.join(' '),
    state,
    code_challenge: uitdaging,
    code_challenge_method: 'S256',
    // Zonder access_type=offline en prompt=consent geeft Google alleen bij de
    // allereerste toestemming een refresh-token. Wie opnieuw koppelt zou dan
    // een mailbox krijgen die na een uur stilvalt.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let userId: string
  try {
    userId = await verifyUser(req)
  } catch (err) {
    return res.status(401).json({ error: err instanceof Error ? err.message : 'Niet geautoriseerd' })
  }

  const rauweProvider = (req.method === 'POST' ? req.body?.provider : req.query?.provider) as unknown
  if (!isProvider(rauweProvider)) {
    return res.status(400).json({ error: "provider moet 'google' of 'microsoft' zijn" })
  }
  const provider: Provider = rauweProvider

  const clientId = provider === 'microsoft'
    ? process.env.MAIL_OAUTH_MICROSOFT_CLIENT_ID
    : process.env.MAIL_OAUTH_GOOGLE_CLIENT_ID
  const geheim = stateGeheim()
  if (!clientId || !geheim) {
    return res.status(503).json({ reden: 'niet_geconfigureerd', provider })
  }

  const nonce = crypto.randomBytes(32).toString('base64url')
  const state = tekenState(userId, provider, Date.now(), nonce, geheim)
  const uitdaging = pkceUitdaging(pkceVerifier(nonce, geheim))
  res.setHeader('Set-Cookie', nonceCookie(nonce))
  return res.status(200).json({
    url: autorisatieUrl(provider, clientId, state, uitdaging),
    provider,
    redirect_uri: redirectUri(),
  })
}
