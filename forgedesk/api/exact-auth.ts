import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const EXACT_AUTH_URL = 'https://start.exactonline.nl/api/oauth2/auth'
const REDIRECT_URI = 'https://forgedesk-ten.vercel.app/api/exact-callback'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = req.query.user_id as string
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is verplicht' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('exact_online_client_id')
      .eq('user_id', user_id)
      .single()

    if (error || !settings?.exact_online_client_id) {
      return res.status(400).json({
        error: 'Exact Online Client ID niet gevonden. Vul deze in bij Instellingen > Integraties.',
      })
    }

    const params = new URLSearchParams({
      client_id: settings.exact_online_client_id,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      state: user_id,
      force_login: '0',
    })

    return res.redirect(302, `${EXACT_AUTH_URL}?${params.toString()}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Exact auth error:', message)
    return res.status(500).json({ error: message })
  }
}
