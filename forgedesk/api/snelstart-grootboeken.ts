/**
 * Haalt grootboekrekeningen op uit SnelStart, voor de omzetgrootboek-select
 * in Instellingen > Integraties.
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

const SNELSTART_AUTH_URL = 'https://auth.snelstart.nl/b2b/token'
const SNELSTART_API_BASE = 'https://b2bapi.snelstart.nl/v2'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)

    const subscriptionKey = process.env.SNELSTART_SUBSCRIPTION_KEY
    if (!subscriptionKey) {
      return res.status(500).json({ error: 'SnelStart subscription key is niet geconfigureerd op de server (SNELSTART_SUBSCRIPTION_KEY).' })
    }

    const settings = await loadAppSettingsOrgFirst(supabaseAdmin, user_id, 'snelstart_koppelsleutel')
    const sleutel = decryptSecret((settings?.snelstart_koppelsleutel as string | null) ?? '')
    if (!sleutel) {
      return res.status(400).json({ error: 'SnelStart is niet verbonden. Koppel eerst via Instellingen > Integraties.' })
    }

    const tokenRes = await fetch(SNELSTART_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'clientkey', clientkey: sleutel }).toString(),
    })
    if (!tokenRes.ok) {
      return res.status(401).json({ error: 'SnelStart koppelsleutel is niet meer geldig. Verbind opnieuw via Instellingen > Integraties.' })
    }
    const tokenBody = await tokenRes.json() as { access_token?: string }
    if (!tokenBody?.access_token) {
      return res.status(502).json({ error: 'SnelStart gaf geen access token terug.' })
    }

    const apiHeaders = {
      Authorization: `Bearer ${tokenBody.access_token}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    }

    // SnelStart geeft maximaal 500 items per response (geen nextpage-metadata);
    // pagineren met $skip/$top tot een pagina minder dan 500 items geeft.
    type Grootboek = { id: string; nummer: number; omschrijving: string; nonactief?: boolean }
    const grootboeken: Grootboek[] = []
    for (let skip = 0; skip <= 10000; skip += 500) {
      const gbRes = await fetch(
        `${SNELSTART_API_BASE}/grootboeken?$top=500&$skip=${skip}`,
        { headers: apiHeaders },
      )
      if (!gbRes.ok) {
        const body = await gbRes.text()
        console.error('[snelstart-grootboeken] fout:', gbRes.status, body)
        return res.status(502).json({ error: `SnelStart gaf een fout (${gbRes.status}).` })
      }
      const pagina = await gbRes.json() as Grootboek[]
      if (!Array.isArray(pagina)) break
      grootboeken.push(...pagina)
      if (pagina.length < 500) break
    }

    return res.status(200).json(
      grootboeken
        .filter((g) => g.nonactief !== true)
        .map((g) => ({ id: g.id, nummer: g.nummer, naam: g.omschrijving })),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[snelstart-grootboeken] error:', message)
    return res.status(500).json({ error: message })
  }
}
