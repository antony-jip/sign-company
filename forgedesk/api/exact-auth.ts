import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const EXACT_AUTH_URL = 'https://start.exactonline.nl/api/oauth2/auth'
const REDIRECT_URI = 'https://app.doen.team/api/exact-callback'
const APP_URL = 'https://app.doen.team'

// OAuth-state TTL. De round-trip duurt normaal seconden, maar bij een eerste
// koppeling moet de gebruiker ondertussen soms nog de app in het Exact App
// Center aanmaken en met 2FA inloggen. 15 minuten was daarvoor te kort en
// leverde een `invalid_state` zonder duidelijke oorzaak. De state is
// HMAC-ondertekend en de bijbehorende code is eenmalig, dus een ruimer venster
// kost geen veiligheid.
const STATE_TTL_MS = 60 * 60 * 1000

function stateSecret(): string {
  // Geen 'fallback-secret': zonder echte sleutel is de state te vervalsen, dus
  // fail-closed i.p.v. ondertekenen met een publiek bekende string.
  if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY ontbreekt — kan OAuth-state niet ondertekenen')
  return SUPABASE_SERVICE_KEY
}

export function signState(userId: string): string {
  const ts = Date.now().toString()
  // Timestamp meetekenen maakt de state tijdgebonden en niet-deterministisch,
  // wat replay buiten het TTL-venster voorkomt.
  const sig = createHmac('sha256', stateSecret()).update(`${userId}:${ts}`).digest('hex').slice(0, 16)
  return `${userId}:${ts}:${sig}`
}

export function verifyState(state: string): string | null {
  const parts = state.split(':')
  if (parts.length !== 3) return null
  const [userId, ts, sig] = parts
  const expected = createHmac('sha256', stateSecret()).update(`${userId}:${ts}`).digest('hex').slice(0, 16)
  if (sig !== expected) return null
  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum) || Date.now() - tsNum > STATE_TTL_MS || tsNum > Date.now() + 60_000) return null
  return userId
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ─── Inline org-aware app_settings helpers ───
// Vercel serverless functions kunnen geen modules delen tussen API routes,
// dus deze helpers zijn ge-dupliceerd in elke exact-* route. Pakt eerst de
// organisatie-rij (matcht RLS policy + andere users in dezelfde org), valt
// terug op de user-eigen rij. Zelfde strategie als profielService.ts.
async function getOrgIdForUser(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()
  return ((data as { organisatie_id?: string } | null)?.organisatie_id) ?? null
}

async function loadAppSettingsOrgFirst(
  supabase: SupabaseClient,
  userId: string,
  columns: string,
): Promise<Record<string, unknown> | null> {
  const orgId = await getOrgIdForUser(supabase, userId)
  if (orgId) {
    const { data } = await supabase
      .from('app_settings')
      .select(columns)
      .eq('organisatie_id', orgId)
      .maybeSingle()
    if (data) return data as Record<string, unknown>
  }
  const { data } = await supabase
    .from('app_settings')
    .select(columns)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as Record<string, unknown> | null) ?? null
}

async function updateAppSettingsOrgFirst(
  supabase: SupabaseClient,
  userId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const orgId = await getOrgIdForUser(supabase, userId)
  if (orgId) {
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('organisatie_id', orgId)
      .maybeSingle()
    if (existing) {
      await supabase
        .from('app_settings')
        .update(updates)
        .eq('id', (existing as { id: string }).id)
      return
    }
  }
  await supabase.from('app_settings').update(updates).eq('user_id', userId)
}

async function verifyUser(req: VercelRequest): Promise<string> {
  // Accept token via Authorization header or query param (for redirects)
  let token = ''
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else if (typeof req.query.token === 'string') {
    token = req.query.token
  }
  if (!token) throw new Error('Niet geautoriseerd')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const settings = await loadAppSettingsOrgFirst(
      supabase,
      user_id,
      'exact_online_client_id, exact_owner_user_id',
    )
    const clientId = settings?.exact_online_client_id as string | undefined

    // Deze route wordt via een volledige paginanavigatie betreden, dus een JSON
    // body belandt letterlijk als tekst in het browservenster, buiten de app.
    // Altijd terugsturen naar Instellingen met een reason-code die daar naar een
    // leesbare melding wordt omgezet.
    if (!clientId) {
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=no_credentials`)
    }

    // Alleen de eigenaar mag opnieuw verbinden: een tweede OAuth op hetzelfde
    // Exact-bedrijfsaccount verbreekt diens sessie en daarmee de koppeling voor
    // de hele organisatie. De UI verbergt de knop al, maar deze route is direct
    // aanroepbaar met een token in de query, dus de check hoort ook hier.
    // Ontkoppelen (waarmee het eigenaarschap vrijkomt) loopt via
    // /api/exact-disconnect.
    const eigenaarId = settings?.exact_owner_user_id as string | null | undefined
    if (eigenaarId && eigenaarId !== user_id) {
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=not_owner`)
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      state: signState(user_id),
      force_login: '0',
    })

    return res.redirect(302, `${EXACT_AUTH_URL}?${params.toString()}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Exact auth error:', message)
    // Ook hier geen JSON: deze catch vangt óók een verlopen sessie, en dan stond
    // de gebruiker met {"error":"Ongeldige sessie"} op een blanke pagina.
    const reason = message === 'Niet geautoriseerd' || message === 'Ongeldige sessie' ? 'sessie' : 'unknown'
    return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=${reason}`)
  }
}
