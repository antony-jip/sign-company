/**
 * Valideert een SnelStart koppelsleutel en slaat deze encrypted op.
 *
 * POST { koppelsleutel } — wissel de sleutel bij auth.snelstart.nl in voor
 * een access token (b2b clientkey flow). Vereist daarnaast onze eigen
 * developer-portal subscription key (env var SNELSTART_SUBSCRIPTION_KEY)
 * voor alle b2bapi-calls. Leeg koppelsleutel met een al opgeslagen sleutel
 * = her-validatie van de bestaande sleutel.
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

const SNELSTART_AUTH_URL = 'https://auth.snelstart.nl/b2b/token'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)

    if (!process.env.SNELSTART_SUBSCRIPTION_KEY) {
      return res.status(500).json({ error: 'SnelStart subscription key is niet geconfigureerd op de server (SNELSTART_SUBSCRIPTION_KEY).' })
    }

    const { koppelsleutel } = req.body as { koppelsleutel?: string }
    let sleutel = (koppelsleutel ?? '').trim()
    const isNieuweSleutel = sleutel.length > 0

    if (!isNieuweSleutel) {
      const settings = await loadAppSettingsOrgFirst(supabaseAdmin, user_id, 'snelstart_koppelsleutel')
      const opgeslagen = (settings?.snelstart_koppelsleutel as string | null) ?? ''
      if (!opgeslagen) {
        return res.status(400).json({ error: 'Geen SnelStart koppelsleutel opgegeven of opgeslagen.' })
      }
      sleutel = decryptSecret(opgeslagen)
    }

    const tokenRes = await fetch(SNELSTART_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'clientkey', clientkey: sleutel }).toString(),
    })

    if (tokenRes.status === 400 || tokenRes.status === 401) {
      return res.status(400).json({ error: 'SnelStart koppelsleutel is ongeldig. Controleer de sleutel en probeer opnieuw.' })
    }
    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      console.error('[snelstart-connect] token fout:', tokenRes.status, body)
      return res.status(502).json({ error: `SnelStart gaf een fout (${tokenRes.status}). Probeer het later opnieuw.` })
    }

    const tokenBody = await tokenRes.json() as { access_token?: string }
    if (!tokenBody?.access_token) {
      return res.status(502).json({ error: 'SnelStart gaf geen access token terug.' })
    }

    if (isNieuweSleutel) {
      await updateAppSettingsOrgFirst(supabaseAdmin, user_id, {
        snelstart_koppelsleutel: encryptSecret(sleutel),
      })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[snelstart-connect] error:', message)
    return res.status(500).json({ error: message })
  }
}
