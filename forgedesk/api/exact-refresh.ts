import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const EXACT_TOKEN_URL = 'https://start.exactonline.nl/api/oauth2/token'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// -- Integration credential encryption (copied from api/save-integration-settings.ts) --
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''
function encryptSecret(text: string): string {
  if (!INT_KEY) return text
  const key = crypto.scryptSync(INT_KEY, 'integration', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
}
function decryptSecret(text: string): string {
  if (!text || !text.includes(':') || text.length < 34) return text
  if (!INT_KEY) { console.warn('[encryption] INTEGRATION_ENCRYPTION_KEY not set'); return text }
  try {
    const key = crypto.scryptSync(INT_KEY, 'integration', 32)
    const [ivHex, enc] = text.split(':')
    if (!ivHex || ivHex.length !== 32 || !enc) return text
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
    return decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8')
  } catch { console.warn('[encryption] decrypt failed, treating as plaintext'); return text }
}

// ─── Inline org-aware app_settings helpers ───
// Vercel serverless functions kunnen geen modules delen tussen API routes,
// dus deze helpers zijn ge-dupliceerd in elke exact-* route.
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
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Haal refresh_token op uit exact_tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('exact_tokens')
      .select('refresh_token')
      .eq('user_id', user_id)
      .single()

    if (tokenError || !tokenData?.refresh_token) {
      return res.status(400).json({
        error: 'Geen Exact Online tokens gevonden. Verbind opnieuw via Instellingen > Integraties.',
      })
    }

    // 2. Haal client_id + client_secret op uit app_settings (org-first)
    const settings = await loadAppSettingsOrgFirst(
      supabase,
      user_id,
      'exact_online_client_id, exact_online_client_secret',
    )
    const exactClientId = settings?.exact_online_client_id as string | undefined
    const exactClientSecret = settings?.exact_online_client_secret ? decryptSecret(settings.exact_online_client_secret as string) : undefined

    if (!exactClientId || !exactClientSecret) {
      return res.status(400).json({
        error: 'Exact Online credentials niet gevonden in instellingen.',
      })
    }

    // 3. Ververs tokens — client_id/secret als form-encoded body params
    // (zelfde aanpak als exact-callback.ts).
    const tokenResponse = await fetch(EXACT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decryptSecret(tokenData.refresh_token),
        client_id: exactClientId,
        client_secret: exactClientSecret,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error('Exact token refresh error:', tokenResponse.status, errorBody)

      // Als refresh token verlopen is, markeer als disconnected
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        await updateAppSettingsOrgFirst(supabase, user_id, { exact_online_connected: false })
      }

      return res.status(502).json({
        error: 'Token vernieuwen mislukt. Verbind Exact Online opnieuw via Instellingen.',
      })
    }

    const tokens = await tokenResponse.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    // 4. Update exact_tokens
    const expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const updateData: Record<string, string> = {
      access_token: encryptSecret(tokens.access_token),
      expires_at,
      updated_at: new Date().toISOString(),
    }

    // Exact Online kan een nieuwe refresh_token teruggeven
    if (tokens.refresh_token) {
      updateData.refresh_token = encryptSecret(tokens.refresh_token)
    }

    await supabase
      .from('exact_tokens')
      .update(updateData)
      .eq('user_id', user_id)

    return res.status(200).json({
      access_token: tokens.access_token,
      expires_at,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Exact refresh error:', message)
    return res.status(500).json({ error: message })
  }
}
