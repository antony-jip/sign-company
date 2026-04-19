import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto, { createHmac } from 'crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const EXACT_TOKEN_URL = 'https://start.exactonline.nl/api/oauth2/token'

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
const EXACT_API_BASE = 'https://start.exactonline.nl/api/v1'
const REDIRECT_URI = 'https://app.doen.team/api/exact-callback'
const APP_URL = 'https://app.doen.team'

// Inline copy van verifyState uit exact-auth.ts. Vercel serverless functions
// kunnen geen lokale modules importeren — elke route moet standalone zijn.
// Beide functies (sign + verify) gebruiken hetzelfde HMAC-sha256 secret +
// 16-char digest schema, dus deze blijft compatibel met state strings die
// door exact-auth.ts zijn gegenereerd.
function verifyState(state: string): string | null {
  const parts = state.split(':')
  if (parts.length < 2) return null
  const sig = parts.pop()!
  const userId = parts.join(':') // UUIDs bevatten geen colons, maar safe split
  const secret = SUPABASE_SERVICE_KEY || 'fallback-secret'
  const expected = createHmac('sha256', secret).update(userId).digest('hex').slice(0, 16)
  if (sig !== expected) return null
  return userId
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const code = req.query.code as string
    const state = req.query.state as string

    if (!code || !state) {
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=missing_params`)
    }

    // Verify HMAC-signed state to prevent CSRF/state manipulation
    const user_id = verifyState(state)
    if (!user_id) {
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=invalid_state`)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Haal client_id + client_secret op uit app_settings (org-first)
    const settings = await loadAppSettingsOrgFirst(
      supabase,
      user_id,
      'exact_online_client_id, exact_online_client_secret',
    )
    const exactClientId = settings?.exact_online_client_id as string | undefined
    const exactClientSecret = settings?.exact_online_client_secret ? decryptSecret(settings.exact_online_client_secret as string) : undefined

    if (!exactClientId || !exactClientSecret) {
      console.error('Exact callback: credentials niet gevonden voor user', user_id)
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=no_credentials`)
    }

    // 2. Wissel code in voor tokens — client_id en client_secret als
    // form-encoded body params (standaard Exact Online methode).
    const tokenResponse = await fetch(EXACT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: exactClientId,
        client_secret: exactClientSecret,
      }).toString(),
    })

    // Lees response body als text zodat we hem zowel kunnen loggen bij
    // fouten als parsen bij success. Body kan maar één keer gelezen worden.
    const responseText = await tokenResponse.text()

    if (!tokenResponse.ok) {
      console.error('Exact token exchange error:', tokenResponse.status, responseText)
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=token_exchange`)
    }

    let tokens: { access_token: string; refresh_token: string; expires_in: number }
    try {
      tokens = JSON.parse(responseText)
    } catch (parseErr) {
      console.error('Exact token exchange: JSON parse failed', parseErr, responseText)
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=token_parse`)
    }

    // 3. Haal division op via /current/Me
    const meResponse = await fetch(`${EXACT_API_BASE}/current/Me?$select=CurrentDivision`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/json',
      },
    })

    let division: number | null = null
    if (meResponse.ok) {
      const meData = await meResponse.json() as { d?: { results?: Array<{ CurrentDivision: number }> } }
      division = meData?.d?.results?.[0]?.CurrentDivision ?? null
    } else {
      console.error('Exact /current/Me error:', meResponse.status, await meResponse.text())
    }

    // 4. Sla tokens op in exact_tokens tabel
    const expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { error: upsertError } = await supabase
      .from('exact_tokens')
      .upsert({
        user_id,
        access_token: encryptSecret(tokens.access_token),
        refresh_token: encryptSecret(tokens.refresh_token),
        expires_at,
        division,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('Exact tokens opslaan mislukt:', upsertError)
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=save_tokens`)
    }

    // 5. Zet exact_online_connected = true + sla division op als administratie_id
    const settingsUpdate: Record<string, unknown> = { exact_online_connected: true }
    if (division !== null) {
      settingsUpdate.exact_administratie_id = String(division)
    }

    await updateAppSettingsOrgFirst(supabase, user_id, settingsUpdate)

    // 6. Redirect naar instellingen
    return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=connected`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Exact callback error:', message)
    return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=unknown`)
  }
}
