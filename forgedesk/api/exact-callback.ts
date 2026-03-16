import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const EXACT_TOKEN_URL = 'https://start.exactonline.nl/api/oauth2/token'
const EXACT_API_BASE = 'https://start.exactonline.nl/api/v1'
const REDIRECT_URI = 'https://forgedesk-ten.vercel.app/api/exact-callback'
const APP_URL = 'https://forgedesk-ten.vercel.app'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const code = req.query.code as string
    const user_id = req.query.state as string

    if (!code || !user_id) {
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=missing_params`)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Haal client_id + client_secret op uit app_settings
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('exact_online_client_id, exact_online_client_secret')
      .eq('user_id', user_id)
      .single()

    if (settingsError || !settings?.exact_online_client_id || !settings?.exact_online_client_secret) {
      console.error('Exact callback: credentials niet gevonden', settingsError)
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=no_credentials`)
    }

    // 2. Wissel code in voor tokens (Basic auth header is verplicht bij Exact Online)
    const credentials = Buffer.from(`${settings.exact_online_client_id}:${settings.exact_online_client_secret}`).toString('base64')
    const tokenResponse = await fetch(EXACT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: settings.exact_online_client_id,
        client_secret: settings.exact_online_client_secret,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error('Exact token exchange error:', tokenResponse.status, errorBody)
      return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=token_exchange`)
    }

    const tokens = await tokenResponse.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
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
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
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

    await supabase
      .from('app_settings')
      .update(settingsUpdate)
      .eq('user_id', user_id)

    // 6. Redirect naar instellingen
    return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=connected`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Exact callback error:', message)
    return res.redirect(302, `${APP_URL}/instellingen?tab=integraties&exact=error&reason=unknown`)
  }
}
