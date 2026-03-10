import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const EXACT_TOKEN_URL = 'https://start.exactonline.nl/api/oauth2/token'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user_id } = req.body as { user_id: string }

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is verplicht' })
    }

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

    // 2. Haal client_id + client_secret op uit app_settings
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('exact_online_client_id, exact_online_client_secret')
      .eq('user_id', user_id)
      .single()

    if (settingsError || !settings?.exact_online_client_id || !settings?.exact_online_client_secret) {
      return res.status(400).json({
        error: 'Exact Online credentials niet gevonden in instellingen.',
      })
    }

    // 3. Ververs tokens
    const tokenResponse = await fetch(EXACT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        client_id: settings.exact_online_client_id,
        client_secret: settings.exact_online_client_secret,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error('Exact token refresh error:', tokenResponse.status, errorBody)

      // Als refresh token verlopen is, markeer als disconnected
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        await supabase
          .from('app_settings')
          .update({ exact_online_connected: false })
          .eq('user_id', user_id)
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
      access_token: tokens.access_token,
      expires_at,
      updated_at: new Date().toISOString(),
    }

    // Exact Online kan een nieuwe refresh_token teruggeven
    if (tokens.refresh_token) {
      updateData.refresh_token = tokens.refresh_token
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
