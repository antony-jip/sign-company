import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Status van de Exact-koppeling van de ORGANISATIE. De koppeling is org-breed:
// `exact_owner_user_id` houdt de OAuth-sessie en is de enige met een
// `exact_tokens`-rij, en iedereen synct met dát token. Deze route rapporteert
// dus de staat van de eigenaar, niet die van de caller — anders ziet een
// collega "niet verbonden" terwijl syncen voor hem wél werkt.
// Pure DB-read: geen calls naar Exact, geen refresh-trigger.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ─── Inline org-aware app_settings helpers ───
// Vercel serverless functions kunnen geen modules delen tussen API routes.
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
    if (data) return data as unknown as Record<string, unknown>
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    const settings = await loadAppSettingsOrgFirst(supabaseAdmin, userId, 'exact_owner_user_id')
    const eigenaarId = (settings?.exact_owner_user_id as string | null) || null
    // Zonder vastgelegde eigenaar is de caller zelf de tokenhouder, gelijk aan
    // de fallback in exact-sync-factuur.ts.
    const tokenHouderId = eigenaarId || userId

    const { data, error } = await supabaseAdmin
      .from('exact_tokens')
      .select('access_token, refresh_token, updated_at')
      .eq('user_id', tokenHouderId)
      .maybeSingle()

    if (error) {
      console.error('[exact-token-status] db error', error)
      return res.status(500).json({ error: 'Token status ophalen mislukt' })
    }

    const row = data as { access_token?: string | null; refresh_token?: string | null; updated_at?: string | null } | null
    const heeftTokens = !!row?.access_token

    // NIET op `expires_at` kijken. Dat is de geldigheid van het access_token en
    // die is tien minuten, dus elke organisatie die even niet gesynct heeft zou
    // "verlopen" tonen terwijl de koppeling gezond is. Wat de koppeling draagt
    // is de refresh_token, en die is bij Exact ongeveer dertig dagen geldig
    // gerekend vanaf het laatste gebruik. `updated_at` is dus de juiste maat:
    // staat die te lang stil, dan is de keten waarschijnlijk verlopen en moet
    // er opnieuw verbonden worden.
    const REFRESH_KETEN_DAGEN = 30
    const verlopen = !!(
      heeftTokens &&
      row?.updated_at &&
      Date.now() - new Date(row.updated_at).getTime() > REFRESH_KETEN_DAGEN * 24 * 60 * 60 * 1000
    )

    const isEigenaar = !eigenaarId || eigenaarId === userId

    // Voornaam van de eigenaar zodat de UI kan zeggen wíe opnieuw moet
    // verbinden in plaats van "de eigenaar".
    let eigenaarNaam: string | null = null
    if (!isEigenaar && eigenaarId) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('voornaam')
        .eq('id', eigenaarId)
        .maybeSingle()
      eigenaarNaam = ((prof as { voornaam?: string | null } | null)?.voornaam) ?? null
    }

    // Ontkoppelen mag de eigenaar altijd, en een admin binnen dezelfde
    // organisatie ook: anders blijft de koppeling vastzitten zodra de eigenaar
    // niet meer beschikbaar is. Opnieuw verbinden blijft aan de eigenaar, omdat
    // een tweede OAuth op hetzelfde Exact-account diens sessie verbreekt.
    let magOntkoppelen = isEigenaar
    if (!magOntkoppelen) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('rol')
        .eq('id', userId)
        .maybeSingle()
      magOntkoppelen = ((prof as { rol?: string | null } | null)?.rol) === 'admin'
    }

    return res.status(200).json({ heeftTokens, verlopen, isEigenaar, eigenaarNaam, magOntkoppelen })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    const status = message === 'Niet geautoriseerd' || message === 'Ongeldige sessie' ? 401 : 500
    return res.status(status).json({ error: message })
  }
}
