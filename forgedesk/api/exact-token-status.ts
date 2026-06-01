import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Lichtgewicht per-user check: heeft DEZE user een exact_tokens-rij, en is
// die rij nog niet verlopen? Pure DB-read, geen calls naar Exact, geen
// refresh-trigger. Bedoeld voor de UI om "is mijn eigen koppeling nog goed"
// te bepalen zonder de race-conditie in de andere endpoints te raken.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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
    const userId = await verifyUser(req)

    const { data, error } = await supabaseAdmin
      .from('exact_tokens')
      .select('access_token, expires_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('[exact-token-status] db error', error)
      return res.status(500).json({ error: 'Token status ophalen mislukt' })
    }

    const row = data as { access_token?: string | null; expires_at?: string | null } | null
    const heeftTokens = !!row?.access_token
    const verlopen = !!(row?.expires_at && new Date(row.expires_at).getTime() < Date.now())

    return res.status(200).json({ heeftTokens, verlopen })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    const status = message === 'Niet geautoriseerd' || message === 'Ongeldige sessie' ? 401 : 500
    return res.status(status).json({ error: message })
  }
}
