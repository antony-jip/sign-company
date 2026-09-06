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

function tekenState(userId: string, provider: Provider, tijd: number, geheim: string): string {
  const kern = `${userId}.${provider}.${tijd}`
  const hmac = crypto.createHmac('sha256', geheim).update(kern).digest('base64url')
  return `${Buffer.from(kern, 'utf8').toString('base64url')}.${hmac}`
}
// ── GEDEELD-MET-API EINDE: OAuth-providers ────────────────────────────────

function autorisatieUrl(provider: Provider, clientId: string, state: string): string {
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
    })
    return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize?${params.toString()}`
  }
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: config.scopes.join(' '),
    state,
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

  const state = tekenState(userId, provider, Date.now(), geheim)
  return res.status(200).json({
    url: autorisatieUrl(provider, clientId, state),
    provider,
    redirect_uri: redirectUri(),
  })
}
