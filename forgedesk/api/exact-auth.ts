import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const EXACT_AUTH_URL = 'https://start.exactonline.nl/api/oauth2/auth'
const REDIRECT_URI = 'https://forgedesk-ten.vercel.app/api/exact-callback'

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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)

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
