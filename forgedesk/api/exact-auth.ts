import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const EXACT_AUTH_URL = 'https://start.exactonline.nl/api/oauth2/auth'
const REDIRECT_URI = 'https://app.doen.team/api/exact-callback'

export function signState(userId: string): string {
  const secret = SUPABASE_SERVICE_KEY || 'fallback-secret'
  const sig = createHmac('sha256', secret).update(userId).digest('hex').slice(0, 16)
  return `${userId}:${sig}`
}

export function verifyState(state: string): string | null {
  const parts = state.split(':')
  if (parts.length < 2) return null
  const sig = parts.pop()!
  const userId = parts.join(':') // UUIDs contain no colons, but be safe
  const secret = SUPABASE_SERVICE_KEY || 'fallback-secret'
  const expected = createHmac('sha256', secret).update(userId).digest('hex').slice(0, 16)
  if (sig !== expected) return null
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

    const settings = await loadAppSettingsOrgFirst(supabase, user_id, 'exact_online_client_id')
    const clientId = settings?.exact_online_client_id as string | undefined

    if (!clientId) {
      return res.status(400).json({
        error: 'Exact Online Client ID niet gevonden. Vul deze in bij Instellingen > Integraties.',
      })
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
    return res.status(500).json({ error: message })
  }
}
