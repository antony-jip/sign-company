/**
 * Haalt grootboekrekeningen op uit e-Boekhouden, voor de debiteuren- en
 * omzetrekening-selects in Instellingen > Integraties.
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
  // Een onontsleutelbare encrypted blob mag nooit als token naar de externe
  // API — dat geeft een misleidende "token ongeldig"-melding bij de gebruiker.
  const lijktEncrypted = /^[0-9a-f]{32}:/.test(text)
  if (!INT_KEY) {
    if (lijktEncrypted) throw new Error('Server-encryptie is niet geconfigureerd (INTEGRATION_ENCRYPTION_KEY). Neem contact op met support.')
    console.warn('[encryption] INTEGRATION_ENCRYPTION_KEY not set'); return text
  }
  try {
    const key = crypto.scryptSync(INT_KEY, 'integration', 32)
    const [ivHex, enc] = text.split(':')
    if (!ivHex || ivHex.length !== 32 || !enc) return text
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
    return decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8')
  } catch {
    if (lijktEncrypted) throw new Error('Integratie-token kan niet ontsleuteld worden (encryptie-key gewijzigd?). Verbind opnieuw via Instellingen > Integraties.')
    console.warn('[encryption] decrypt failed, treating as plaintext'); return text
  }
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

const EBOEKHOUDEN_API_BASE = 'https://api.e-boekhouden.nl/v1'
const EBOEKHOUDEN_SOURCE = 'doen'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)

    const settings = await loadAppSettingsOrgFirst(supabaseAdmin, user_id, 'eboekhouden_api_token')
    const apiToken = decryptSecret((settings?.eboekhouden_api_token as string | null) ?? '')
    if (!apiToken) {
      return res.status(400).json({ error: 'e-Boekhouden is niet verbonden. Koppel eerst via Instellingen > Integraties.' })
    }

    const sessieRes = await fetch(`${EBOEKHOUDEN_API_BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: apiToken, source: EBOEKHOUDEN_SOURCE }),
    })
    if (!sessieRes.ok) {
      return res.status(401).json({ error: 'e-Boekhouden-token is niet meer geldig. Verbind opnieuw via Instellingen > Integraties.' })
    }
    const sessie = await sessieRes.json() as { token?: string }
    if (!sessie?.token) {
      return res.status(502).json({ error: 'e-Boekhouden gaf geen sessietoken terug.' })
    }

    try {
      const ledgerRes = await fetch(`${EBOEKHOUDEN_API_BASE}/ledger?limit=500`, {
        headers: { Authorization: `Bearer ${sessie.token}` },
      })

      if (!ledgerRes.ok) {
        const body = await ledgerRes.text()
        console.error('[eboekhouden-ledgers] fout:', ledgerRes.status, body)
        return res.status(502).json({ error: `e-Boekhouden gaf een fout (${ledgerRes.status}).` })
      }

      const body = await ledgerRes.json() as
        | Array<{ id: number; code: string; description: string; category: string }>
        | { items?: Array<{ id: number; code: string; description: string; category: string }> }
      const ledgers = Array.isArray(body) ? body : (body.items ?? [])

      return res.status(200).json(
        ledgers.map((l) => ({
          id: String(l.id),
          code: l.code,
          naam: l.description,
          categorie: l.category,
        })),
      )
    } finally {
      fetch(`${EBOEKHOUDEN_API_BASE}/session`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessie.token}` },
      }).catch(() => {})
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[eboekhouden-ledgers] error:', message)
    return res.status(500).json({ error: message })
  }
}
