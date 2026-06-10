/**
 * Haalt verkoop-BTW-tarieven op uit de gekoppelde Moneybird-administratie,
 * voor de BTW hoog/laag/nul selects in Instellingen > Integraties.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// -- Integration credential decryption (copied from api/save-integration-settings.ts) --
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''
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

// ─── Inline org-aware app_settings helpers (copied from api/exact-sync-factuur.ts) ───
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

const MONEYBIRD_API_BASE = 'https://moneybird.com/api/v2'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)

    const settings = await loadAppSettingsOrgFirst(
      supabaseAdmin,
      user_id,
      'moneybird_api_token, moneybird_administration_id',
    )
    const token = decryptSecret((settings?.moneybird_api_token as string | null) ?? '')
    const administratieId = (settings?.moneybird_administration_id as string | null) ?? ''

    if (!token || !administratieId) {
      return res.status(400).json({ error: 'Moneybird is niet verbonden. Koppel eerst via Instellingen > Integraties.' })
    }

    const mbRes = await fetch(
      `${MONEYBIRD_API_BASE}/${administratieId}/tax_rates.json?filter=${encodeURIComponent('tax_rate_type:sales_invoice')}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    if (mbRes.status === 401) {
      return res.status(401).json({ error: 'Moneybird-token is niet meer geldig. Verbind opnieuw via Instellingen > Integraties.' })
    }
    if (!mbRes.ok) {
      const body = await mbRes.text()
      console.error('[moneybird-tax-rates] fout:', mbRes.status, body)
      return res.status(502).json({ error: `Moneybird gaf een fout (${mbRes.status}).` })
    }

    const taxRates = await mbRes.json() as Array<{
      id: number | string
      name: string
      percentage: string | null
      active: boolean
    }>

    return res.status(200).json(
      taxRates
        .filter((t) => t.active !== false)
        .map((t) => ({ id: String(t.id), naam: t.name, percentage: t.percentage })),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[moneybird-tax-rates] error:', message)
    return res.status(500).json({ error: message })
  }
}
