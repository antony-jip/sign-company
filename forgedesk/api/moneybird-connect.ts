/**
 * Valideert een Moneybird API-token en slaat deze encrypted op.
 *
 * POST { api_token } — valideer via GET /administrations.json en retourneer
 * de administraties zodat de frontend een keuze kan tonen. Leeg api_token
 * met een al opgeslagen token = her-configuratie: opnieuw administraties
 * ophalen met het bestaande token.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// -- Integration credential encryption (copied from api/save-integration-settings.ts) --
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''
function encryptSecret(text: string): string {
  if (!INT_KEY) throw new Error('INTEGRATION_ENCRYPTION_KEY niet geconfigureerd')
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

const MONEYBIRD_API_BASE = 'https://moneybird.com/api/v2'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)
    const { api_token } = req.body as { api_token?: string }

    let token = (api_token ?? '').trim()
    const isNieuwToken = token.length > 0

    if (!isNieuwToken) {
      const settings = await loadAppSettingsOrgFirst(supabaseAdmin, user_id, 'moneybird_api_token')
      const opgeslagen = (settings?.moneybird_api_token as string | null) ?? ''
      if (!opgeslagen) {
        return res.status(400).json({ error: 'Geen Moneybird API-token opgegeven of opgeslagen.' })
      }
      token = decryptSecret(opgeslagen)
    }

    const mbRes = await fetch(`${MONEYBIRD_API_BASE}/administrations.json`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (mbRes.status === 401) {
      return res.status(400).json({ error: 'Moneybird API-token is ongeldig. Controleer het token en probeer opnieuw.' })
    }
    if (!mbRes.ok) {
      const body = await mbRes.text()
      console.error('[moneybird-connect] administrations fout:', mbRes.status, body)
      return res.status(502).json({ error: `Moneybird gaf een fout (${mbRes.status}). Probeer het later opnieuw.` })
    }

    const administrations = await mbRes.json() as Array<{ id: number | string; name: string }>
    if (!Array.isArray(administrations) || administrations.length === 0) {
      return res.status(400).json({ error: 'Dit token heeft geen toegang tot een Moneybird-administratie.' })
    }

    if (isNieuwToken) {
      await updateAppSettingsOrgFirst(supabaseAdmin, user_id, {
        moneybird_api_token: encryptSecret(token),
      })
    }

    return res.status(200).json({
      success: true,
      administrations: administrations.map((a) => ({ id: String(a.id), naam: a.name })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[moneybird-connect] error:', message)
    return res.status(500).json({ error: message })
  }
}
