import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates, fetchAllPages,
} from './supabaseHelpers'
import type { CalendarEvent, MontageAfspraak, Verlof, Bedrijfssluitingsdag, DagNotitie, VrijPatroon, Afwezigheid } from '@/types'

// ============ EVENTS (CALENDAR) ============

export async function getEvents(): Promise<CalendarEvent[]> {
  const sb = supabase
  if (isSupabaseConfigured() && sb) {
    return fetchAllPages<CalendarEvent>((van, tot) =>
      sb
        .from('events')
        .select('*')
        .order('start_datum', { ascending: true })
        .order('id', { ascending: true })
        .range(van, tot))
  }
  return getLocalData<CalendarEvent>('events')
}

// ============ MONTAGE AFSPRAKEN ============

export async function getMontageAfspraken(): Promise<MontageAfspraak[]> {
  const sb = supabase
  if (isSupabaseConfigured() && sb) {
    return fetchAllPages<MontageAfspraak>((van, tot) =>
      sb
        .from('montage_afspraken')
        .select('*')
        .order('datum', { ascending: true })
        .order('id', { ascending: true })
        .range(van, tot))
  }
  return getLocalData<MontageAfspraak>('montage_afspraken')
}

export async function getMontageAfspraak(id: string): Promise<MontageAfspraak | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('montage_afspraken').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data as MontageAfspraak | null
  }
  const items = getLocalData<MontageAfspraak>('montage_afspraken')
  return items.find((a) => a.id === id) || null
}

export async function createMontageAfspraak(afspraak: Omit<MontageAfspraak, 'id' | 'created_at' | 'updated_at'>): Promise<MontageAfspraak> {
  const newAfspraak: MontageAfspraak = { ...sanitizeDates(afspraak), id: generateId(), created_at: now(), updated_at: now() } as MontageAfspraak
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('montage_afspraken').insert({ ...await withUserId(newAfspraak), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<MontageAfspraak>('montage_afspraken')
  items.push(newAfspraak)
  setLocalData('montage_afspraken', items)
  return newAfspraak
}

export async function updateMontageAfspraak(id: string, updates: Partial<MontageAfspraak>): Promise<MontageAfspraak> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('montage_afspraken').update(sanitizeDates({ ...updates, updated_at: now() })).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<MontageAfspraak>('montage_afspraken')
  const index = items.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('Montage afspraak niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('montage_afspraken', items)
  return items[index]
}

export async function deleteMontageAfspraak(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('montage_afspraken').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<MontageAfspraak>('montage_afspraken')
  setLocalData('montage_afspraken', items.filter((a) => a.id !== id))
}

export async function getMontageAfsprakenByProject(projectId: string): Promise<MontageAfspraak[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('montage_afspraken').select('*').eq('project_id', projectId).order('datum', { ascending: true })
    if (error) throw error
    return data || []
  }
  return getLocalData<MontageAfspraak>('montage_afspraken').filter((a) => a.project_id === projectId)
}

// ============ VERLOF & BESCHIKBAARHEID ============

export async function getVerlof(): Promise<Verlof[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('verlof').select('*').order('start_datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Verlof>('verlof')
}

export async function createVerlof(verlof: Omit<Verlof, 'id' | 'created_at'>): Promise<Verlof> {
  const newVerlof: Verlof = { ...sanitizeDates(verlof), id: generateId(), created_at: now() } as Verlof
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('verlof').insert({ ...await withUserId(newVerlof), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Verlof>('verlof')
  items.push(newVerlof)
  setLocalData('verlof', items)
  return newVerlof
}

export async function updateVerlof(id: string, updates: Partial<Verlof>): Promise<Verlof> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('verlof').update(sanitizeDates({ ...updates, updated_at: now() })).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Verlof>('verlof')
  const index = items.findIndex((v) => v.id === id)
  if (index === -1) throw new Error('Verlof niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('verlof', items)
  return items[index]
}

export async function deleteVerlof(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('verlof').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Verlof>('verlof')
  setLocalData('verlof', items.filter((v) => v.id !== id))
}

// ============ BEDRIJFSSLUITINGSDAGEN ============

// ============ DAGNOTITIES (org-breed, één per dag) ============

export async function getDagNotities(): Promise<DagNotitie[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('planning_dag_notities').select('*').order('datum')
    if (error) throw error
    return data || []
  }
  return getLocalData<DagNotitie>('dagNotities')
}

// Upsert op (organisatie_id, datum): precies één notitie per dag, org-breed.
export async function upsertDagNotitie(datum: string, notitie: string): Promise<DagNotitie> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('planning_dag_notities')
      .upsert({ datum, notitie, organisatie_id: _orgId }, { onConflict: 'organisatie_id,datum' })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const items = getLocalData<DagNotitie>('dagNotities')
  const bestaand = items.find((n) => n.datum === datum)
  if (bestaand) {
    bestaand.notitie = notitie
    bestaand.updated_at = now()
    setLocalData('dagNotities', items)
    return bestaand
  }
  const nieuw: DagNotitie = { id: generateId(), datum, notitie, created_at: now() }
  items.push(nieuw)
  setLocalData('dagNotities', items)
  return nieuw
}

export async function deleteDagNotitie(datum: string): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('planning_dag_notities').delete().eq('datum', datum)
    if (error) throw error
    return
  }
  const items = getLocalData<DagNotitie>('dagNotities')
  setLocalData('dagNotities', items.filter((n) => n.datum !== datum))
}

// ============ STRUCTUREEL VRIJ (terugkerende weekpatronen, org-breed) ============

export async function getVrijPatronen(): Promise<VrijPatroon[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('planning_vrij_patronen').select('*').order('created_at')
    if (error) throw error
    return data || []
  }
  return getLocalData<VrijPatroon>('vrijPatronen')
}

export async function createVrijPatroon(patroon: Omit<VrijPatroon, 'id' | 'created_at'>): Promise<VrijPatroon> {
  const nieuw: VrijPatroon = { ...sanitizeDates(patroon), id: generateId(), created_at: now() } as VrijPatroon
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('planning_vrij_patronen').insert({ ...nieuw, organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<VrijPatroon>('vrijPatronen')
  items.push(nieuw)
  setLocalData('vrijPatronen', items)
  return nieuw
}

export async function updateVrijPatroon(id: string, updates: Partial<VrijPatroon>): Promise<VrijPatroon> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('planning_vrij_patronen').update(sanitizeDates({ ...updates, updated_at: now() })).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<VrijPatroon>('vrijPatronen')
  const index = items.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Patroon niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('vrijPatronen', items)
  return items[index]
}

export async function deleteVrijPatroon(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('planning_vrij_patronen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<VrijPatroon>('vrijPatronen')
  setLocalData('vrijPatronen', items.filter((p) => p.id !== id))
}

// ============ AFWEZIGHEID (datumbereik: vakantie/ziek/bijzonder/vrij, org-breed) ============

export async function getAfwezigheid(): Promise<Afwezigheid[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('planning_afwezigheid').select('*').order('start_datum')
    if (error) throw error
    return data || []
  }
  return getLocalData<Afwezigheid>('afwezigheid')
}

export async function createAfwezigheid(afwezig: Omit<Afwezigheid, 'id' | 'created_at'>): Promise<Afwezigheid> {
  const nieuw: Afwezigheid = { ...sanitizeDates(afwezig), id: generateId(), created_at: now() } as Afwezigheid
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('planning_afwezigheid').insert({ ...nieuw, organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Afwezigheid>('afwezigheid')
  items.push(nieuw)
  setLocalData('afwezigheid', items)
  return nieuw
}

export async function deleteAfwezigheid(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('planning_afwezigheid').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Afwezigheid>('afwezigheid')
  setLocalData('afwezigheid', items.filter((a) => a.id !== id))
}
