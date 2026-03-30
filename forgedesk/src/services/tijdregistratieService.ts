import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates,
} from './supabaseHelpers'
import type { Tijdregistratie } from '@/types'

export async function getTijdregistraties(): Promise<Tijdregistratie[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('tijdregistraties').select('*').order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Tijdregistratie>('tijdregistraties')
}

export async function createTijdregistratie(entry: Omit<Tijdregistratie, 'id' | 'created_at' | 'updated_at'>): Promise<Tijdregistratie> {
  const newEntry: Tijdregistratie = { ...sanitizeDates(entry), id: generateId(), created_at: now(), updated_at: now() } as Tijdregistratie
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('tijdregistraties').insert({ ...await withUserId(newEntry), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Tijdregistratie>('tijdregistraties')
  items.push(newEntry)
  setLocalData('tijdregistraties', items)
  return newEntry
}

export async function updateTijdregistratie(id: string, updates: Partial<Tijdregistratie>): Promise<Tijdregistratie> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('tijdregistraties').update(sanitizeDates({ ...updates, updated_at: now() })).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Tijdregistratie>('tijdregistraties')
  const index = items.findIndex((t) => t.id === id)
  if (index === -1) throw new Error('Tijdregistratie niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('tijdregistraties', items)
  return items[index]
}

export async function deleteTijdregistratie(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('tijdregistraties').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Tijdregistratie>('tijdregistraties')
  setLocalData('tijdregistraties', items.filter((t) => t.id !== id))
}

export async function getTijdregistratiesByMedewerker(medewerkerId: string): Promise<Tijdregistratie[]> {
  assertId(medewerkerId, 'medewerker_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('tijdregistraties').select('*').eq('medewerker_id', medewerkerId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Tijdregistratie>('tijdregistraties').filter((t) => t.medewerker_id === medewerkerId)
}
