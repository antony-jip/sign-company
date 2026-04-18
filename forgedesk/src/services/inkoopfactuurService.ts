import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates,
} from './supabaseHelpers'
import { createUitgave } from './boekhoudingService'
import type {
  InkoopFactuur, InkoopFactuurRegel, InkoopFactuurInboxConfig,
  InkoopFactuurStatus, Medewerker,
} from '@/types'

// ============ INKOOPFACTUREN CRUD ============

export interface InkoopfactuurFilters {
  status?: InkoopFactuurStatus
  toegewezen_aan_id?: string | null
}

export async function getInkoopfacturen(filters?: InkoopfactuurFilters): Promise<InkoopFactuur[]> {
  if (isSupabaseConfigured() && supabase) {
    let query = supabase.from('inkoopfacturen').select('*').order('created_at', { ascending: false })
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.toegewezen_aan_id) query = query.eq('toegewezen_aan_id', filters.toegewezen_aan_id)
    if (filters?.toegewezen_aan_id === null) query = query.is('toegewezen_aan_id', null)
    const { data, error } = await query
    if (error) throw error
    return data || []
  }
  return getLocalData<InkoopFactuur>('inkoopfacturen')
}

export async function getInkoopfactuur(id: string): Promise<{ factuur: InkoopFactuur; regels: InkoopFactuurRegel[] } | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const [factuurRes, regelsRes] = await Promise.all([
      supabase.from('inkoopfacturen').select('*').eq('id', id).maybeSingle(),
      supabase.from('inkoopfactuur_regels').select('*').eq('inkoopfactuur_id', id).order('volgorde'),
    ])
    if (factuurRes.error) throw factuurRes.error
    if (regelsRes.error) throw regelsRes.error
    if (!factuurRes.data) return null
    return { factuur: factuurRes.data, regels: regelsRes.data || [] }
  }
  const facturen = getLocalData<InkoopFactuur>('inkoopfacturen')
  const factuur = facturen.find(f => f.id === id)
  if (!factuur) return null
  const regels = getLocalData<InkoopFactuurRegel>('inkoopfactuur_regels').filter(r => r.inkoopfactuur_id === id)
  return { factuur, regels }
}

// ============ INBOX CONFIG ============

export async function getInboxConfig(): Promise<InkoopFactuurInboxConfig | null> {
  if (isSupabaseConfigured() && supabase) {
    const orgId = await getOrgId()
    if (!orgId) return null
    const { data, error } = await supabase
      .from('inkoopfactuur_inbox_config')
      .select('*')
      .eq('organisatie_id', orgId)
      .maybeSingle()
    if (error) throw error
    return data
  }
  return null
}

export interface UpsertInboxConfigResult {
  config: InkoopFactuurInboxConfig
  overlapWarning: boolean
}

export async function upsertInboxConfig(
  config: { imap_host: string; imap_port: number; imap_user: string; password_plaintext: string; gmail_label: string; actief: boolean }
): Promise<UpsertInboxConfigResult> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const token = (await supabase.auth.getSession()).data.session?.access_token
  if (!token) throw new Error('Niet ingelogd')

  const res = await fetch('/api/inkoopfactuur-save-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Onbekende fout' }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }

  const body = await res.json()
  return { config: body.config, overlapWarning: body.overlap_warning }
}

export async function testImapConnection(config: {
  imap_host: string
  imap_port: number
  imap_user: string
  imap_password: string
  gmail_label: string
}): Promise<{ success: boolean; error?: string; label_gevonden?: boolean }> {
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null
  const res = await fetch('/api/inkoopfactuur-test-connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(config),
  })
  return res.json()
}

// ============ ACTIES ============

export async function assignInkoopfactuur(id: string, medewerkerId: string): Promise<InkoopFactuur> {
  assertId(id)
  assertId(medewerkerId, 'medewerkerId')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('inkoopfacturen')
      .update({ toegewezen_aan_id: medewerkerId, status: 'toegewezen', updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  throw new Error('Supabase vereist voor deze actie')
}

export async function approveInkoopfactuur(id: string, goedgekeurdDoorId: string): Promise<InkoopFactuur> {
  assertId(id)
  assertId(goedgekeurdDoorId, 'goedgekeurdDoorId')
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase vereist voor deze actie')

  const result = await getInkoopfactuur(id)
  if (!result) throw new Error('Inkoopfactuur niet gevonden')
  const { factuur } = result

  const uitgave = await createUitgave({
    type: 'inkoopfactuur',
    omschrijving: `${factuur.leverancier_naam} — ${factuur.factuur_nummer || 'geen nummer'}`,
    bedrag_excl_btw: factuur.subtotaal,
    btw_bedrag: factuur.btw_bedrag,
    btw_percentage: factuur.btw_bedrag && factuur.subtotaal ? Math.round((factuur.btw_bedrag / factuur.subtotaal) * 100) : 21,
    bedrag_incl_btw: factuur.totaal,
    datum: factuur.factuur_datum || new Date().toISOString().slice(0, 10),
    vervaldatum: factuur.vervaldatum || undefined,
    status: 'open',
    categorie: 'overig',
    bijlage_url: factuur.pdf_storage_path,
    referentie_nummer: factuur.factuur_nummer || undefined,
  })

  const { data, error } = await supabase
    .from('inkoopfacturen')
    .update({
      status: 'goedgekeurd',
      goedgekeurd_door_id: goedgekeurdDoorId,
      goedgekeurd_op: now(),
      uitgave_id: uitgave.id,
      updated_at: now(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    await supabase.from('uitgaven').delete().eq('id', uitgave.id)
    throw error
  }
  return data
}

export async function rejectInkoopfactuur(id: string, reden: string): Promise<InkoopFactuur> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('inkoopfacturen')
      .update({ status: 'afgewezen', afgewezen_reden: reden, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  throw new Error('Supabase vereist voor deze actie')
}

export async function updateInkoopfactuurVelden(id: string, data: Partial<InkoopFactuur>): Promise<InkoopFactuur> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { organisatie_id: _o, id: _id, created_at: _c, ...safeData } = data as Record<string, unknown>
    const { data: result, error } = await supabase
      .from('inkoopfacturen')
      .update(sanitizeDates({ ...safeData, updated_at: now() }))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return result
  }
  throw new Error('Supabase vereist voor deze actie')
}

export async function updateInkoopfactuurRegels(id: string, regels: Omit<InkoopFactuurRegel, 'id' | 'inkoopfactuur_id' | 'created_at'>[]): Promise<InkoopFactuurRegel[]> {
  assertId(id)
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase vereist voor deze actie')

  await supabase.from('inkoopfactuur_regels').delete().eq('inkoopfactuur_id', id)

  if (regels.length === 0) return []

  const rows = regels.map((r, i) => ({
    id: generateId(),
    inkoopfactuur_id: id,
    volgorde: r.volgorde ?? i,
    omschrijving: r.omschrijving,
    aantal: r.aantal,
    eenheidsprijs: r.eenheidsprijs,
    btw_tarief: r.btw_tarief,
    regel_totaal: r.regel_totaal,
  }))

  const { data, error } = await supabase
    .from('inkoopfactuur_regels')
    .insert(rows)
    .select()
  if (error) throw error
  return data || []
}

// ============ BADGES & QUERIES ============

export async function countWachtendOpReview(): Promise<number> {
  if (isSupabaseConfigured() && supabase) {
    const { count, error } = await supabase
      .from('inkoopfacturen')
      .select('*', { count: 'exact', head: true })
      .in('status', ['nieuw', 'verwerkt'])
    if (error) throw error
    return count || 0
  }
  return 0
}

export async function getMedewerkersMetInkoopfactuurToegang(): Promise<Medewerker[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('medewerkers')
      .select('*')
      .eq('inkoopfacturen_toegang', true)
      .order('naam')
    if (error) throw error
    return data || []
  }
  return []
}
