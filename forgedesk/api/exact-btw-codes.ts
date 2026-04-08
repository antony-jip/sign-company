import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const EXACT_API_BASE = 'https://start.exactonline.nl/api/v1'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ─── Inline org-aware app_settings helpers (zie profielService.ts) ───
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

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

async function getValidToken(userId: string): Promise<{ token: string; division: number }> {
  const { data, error } = await supabaseAdmin
    .from('exact_tokens')
    .select('access_token, refresh_token, expires_at, division')
    .eq('user_id', userId)
    .single()

  if (error || !data?.access_token) throw new Error('Geen Exact Online tokens gevonden')

  if (new Date(data.expires_at).getTime() - Date.now() > 5 * 60 * 1000) {
    return { token: data.access_token, division: data.division }
  }

  const settings = await loadAppSettingsOrgFirst(
    supabaseAdmin,
    userId,
    'exact_online_client_id, exact_online_client_secret',
  )
  const exactClientId = settings?.exact_online_client_id as string | undefined
  const exactClientSecret = settings?.exact_online_client_secret as string | undefined

  if (!exactClientId || !exactClientSecret) {
    throw new Error('Exact credentials niet gevonden')
  }

  const refreshRes = await fetch('https://start.exactonline.nl/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${exactClientId}:${exactClientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: data.refresh_token }),
  })

  if (!refreshRes.ok) throw new Error('Token refresh mislukt')
  const tokens = await refreshRes.json()

  await supabaseAdmin.from('exact_tokens').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || data.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return { token: tokens.access_token, division: data.division }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const { token, division } = await getValidToken(userId)

    const divisionId = req.query.division || division

    const vatRes = await fetch(
      `${EXACT_API_BASE}/${divisionId}/vat/VATCodes?$select=Code,Description,Percentage&$orderby=Code`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )

    if (!vatRes.ok) throw new Error('Kon BTW codes niet ophalen')

    const body = await vatRes.json()
    const results = (body.d?.results || []).map((v: { Code: string; Description: string; Percentage: number }) => ({
      id: v.Code,
      code: v.Code,
      naam: `${v.Code} - ${v.Description} (${v.Percentage}%)`,
      percentage: v.Percentage,
    }))

    return res.status(200).json(results)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return res.status(500).json({ error: message })
  }
}
