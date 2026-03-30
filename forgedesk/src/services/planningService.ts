import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates,
} from './supabaseHelpers'
import type { CalendarEvent, MontageAfspraak, Verlof, Bedrijfssluitingsdag } from '@/types'

// ============ EVENTS (CALENDAR) ============

export async function getEvents(): Promise<CalendarEvent[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_datum', { ascending: true })
    if (error) throw error
    return data || []
  }
  return getLocalData<CalendarEvent>('events')
}

export async function getEvent(id: string): Promise<CalendarEvent | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const events = getLocalData<CalendarEvent>('events')
  return events.find((e) => e.id === id) || null
}

export async function createEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('events')
      .insert({ ...await withUserId(sanitizeDates(event)), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const events = getLocalData<CalendarEvent>('events')
  const newEvent: CalendarEvent = {
    ...event,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as CalendarEvent
  events.push(newEvent)
  setLocalData('events', events)
  return newEvent
}

export async function updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('events')
      .update(sanitizeDates({ ...updates, updated_at: now() }))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const events = getLocalData<CalendarEvent>('events')
  const index = events.findIndex((e) => e.id === id)
  if (index === -1) throw new Error('Event niet gevonden')
  events[index] = { ...events[index], ...updates, updated_at: now() }
  setLocalData('events', events)
  return events[index]
}

export async function deleteEvent(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) throw error
    return
  }
  const events = getLocalData<CalendarEvent>('events')
  setLocalData('events', events.filter((e) => e.id !== id))
}

// ============ MONTAGE AFSPRAKEN ============

export async function getMontageAfspraken(): Promise<MontageAfspraak[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('montage_afspraken').select('*').order('datum', { ascending: true })
    if (error) throw error
    return data || []
  }
  return getLocalData<MontageAfspraak>('montage_afspraken')
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

export async function getMontageAfsprakenByKlant(klantId: string): Promise<MontageAfspraak[]> {
  assertId(klantId, 'klant_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('montage_afspraken').select('*').eq('klant_id', klantId).order('datum', { ascending: true })
    if (error) throw error
    return data || []
  }
  return getLocalData<MontageAfspraak>('montage_afspraken').filter((a) => a.klant_id === klantId)
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

export async function getVerlofByMedewerker(medewerkerId: string): Promise<Verlof[]> {
  assertId(medewerkerId, 'medewerker_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('verlof').select('*').eq('medewerker_id', medewerkerId).order('start_datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Verlof>('verlof').filter((v) => v.medewerker_id === medewerkerId)
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

export async function getBedrijfssluitingsdagen(): Promise<Bedrijfssluitingsdag[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bedrijfssluitingsdagen').select('*').order('datum')
    if (error) throw error
    return data || []
  }
  return getLocalData<Bedrijfssluitingsdag>('bedrijfssluitingsdagen')
}

export async function createBedrijfssluitingsdag(dag: Omit<Bedrijfssluitingsdag, 'id' | 'created_at'>): Promise<Bedrijfssluitingsdag> {
  const newDag: Bedrijfssluitingsdag = { ...sanitizeDates(dag), id: generateId(), created_at: now() } as Bedrijfssluitingsdag
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('bedrijfssluitingsdagen').insert({ ...await withUserId(newDag), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Bedrijfssluitingsdag>('bedrijfssluitingsdagen')
  items.push(newDag)
  setLocalData('bedrijfssluitingsdagen', items)
  return newDag
}

export async function deleteBedrijfssluitingsdag(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('bedrijfssluitingsdagen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Bedrijfssluitingsdag>('bedrijfssluitingsdagen')
  setLocalData('bedrijfssluitingsdagen', items.filter((d) => d.id !== id))
}
