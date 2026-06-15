/**
 * Ontkoppelt een boekhoudpakket (SnelStart, Moneybird of e-Boekhouden).
 *
 * POST { pakket } — wist het opgeslagen API-token en de bijbehorende
 * boekingsinstellingen, en zet boekhoud_pakket op null als dit het actieve
 * pakket was. Nodig als losse route omdat save-integration-settings.ts lege
 * secret-velden juist overslaat (om een encrypted waarde niet te overschrijven),
 * waardoor een token daar niet gewist kan worden.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

type Pakket = 'snelstart' | 'moneybird' | 'eboekhouden'

// Velden die per pakket gewist worden (token + boekingsinstellingen).
const VELDEN_PER_PAKKET: Record<Pakket, string[]> = {
  snelstart: [
    'snelstart_koppelsleutel',
    'snelstart_grootboek_id',
    'snelstart_grootboek_naam',
  ],
  moneybird: [
    'moneybird_api_token',
    'moneybird_administration_id',
    'moneybird_ledger_account_id',
    'moneybird_tax_rate_hoog',
    'moneybird_tax_rate_laag',
    'moneybird_tax_rate_nul',
  ],
  eboekhouden: [
    'eboekhouden_api_token',
    'eboekhouden_debiteuren_ledger_id',
    'eboekhouden_omzet_ledger_id',
  ],
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)
    const { pakket } = req.body as { pakket?: string }

    if (!pakket || !(pakket in VELDEN_PER_PAKKET)) {
      return res.status(400).json({ error: 'Onbekend boekhoudpakket.' })
    }

    const updates: Record<string, unknown> = {}
    for (const veld of VELDEN_PER_PAKKET[pakket as Pakket]) {
      updates[veld] = null
    }

    // Het actieve pakket loskoppelen: ook de pakket-keuze resetten.
    const huidig = await loadAppSettingsOrgFirst(supabaseAdmin, user_id, 'boekhoud_pakket')
    if ((huidig?.boekhoud_pakket as string | null) === pakket) {
      updates.boekhoud_pakket = null
    }

    await updateAppSettingsOrgFirst(supabaseAdmin, user_id, updates)

    return res.status(200).json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[boekhoud-disconnect] error:', message)
    return res.status(500).json({ error: message })
  }
}
