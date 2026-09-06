import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates, fetchAllPages,
} from './supabaseHelpers'
import type { Tijdregistratie } from '@/types'
import { functieAan, type FunctieInstellingen } from '@/lib/functies'

/**
 * Status voor een nieuwe urenregel. Met 'uren_goedkeuren' aan begint elke regel
 * als concept en gaat hij via de weekstaat naar definitief en goedgekeurd;
 * uit betekent dat elk uur meteen telt, dus goedgekeurd.
 */
export function standaardUrenStatus(functies: FunctieInstellingen | null | undefined): NonNullable<Tijdregistratie['status']> {
  return functieAan(functies, 'uren_goedkeuren') ? 'concept' : 'goedgekeurd'
}

/**
 * De melding van de databasetrigger (migratie 241) die goedkeuren en het
 * wijzigen van goedgekeurde of gefactureerde uren aan beheerders voorbehoudt;
 * null bij elke andere fout, zodat de offline-terugval daar blijft werken.
 */
export function urenBeschermdMelding(err: unknown): string | null {
  const bericht = err instanceof Error
    ? err.message
    : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : ''
  return /alleen een beheerder/i.test(bericht) ? bericht : null
}

export async function getTijdregistraties(limit = 50000): Promise<Tijdregistratie[]> {
  const sb = supabase
  if (isSupabaseConfigured() && sb) {
    return fetchAllPages<Tijdregistratie>((van, tot) =>
      sb
        .from('tijdregistraties')
        .select('*')
        .order('datum', { ascending: false })
        .order('id', { ascending: true })
        .range(van, tot), limit)
  }
  return getLocalData<Tijdregistratie>('tijdregistraties')
}

export async function getTijdregistratiesVoorProjecten(projectIds: string[]): Promise<Tijdregistratie[]> {
  if (projectIds.length === 0) return []
  const sb = supabase
  if (isSupabaseConfigured() && sb) {
    return fetchAllPages<Tijdregistratie>((van, tot) =>
      sb
        .from('tijdregistraties')
        .select('*')
        .in('project_id', projectIds)
        .order('datum', { ascending: false })
        .order('id', { ascending: true })
        .range(van, tot))
  }
  const doel = new Set(projectIds)
  return getLocalData<Tijdregistratie>('tijdregistraties').filter((t) => doel.has(t.project_id))
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

/** Meerdere regels in één insert, zodat ze samen slagen of samen falen. */
export async function createTijdregistraties(entries: Omit<Tijdregistratie, 'id' | 'created_at' | 'updated_at'>[]): Promise<Tijdregistratie[]> {
  if (entries.length === 0) return []
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const rijen = await Promise.all(entries.map(async (entry) => ({ ...await withUserId({ ...entry, created_at: now(), updated_at: now() }), organisatie_id: _orgId })))
    const { data, error } = await supabase.from('tijdregistraties').insert(rijen).select()
    if (error) throw error
    return data
  }
  const uit: Tijdregistratie[] = []
  for (const entry of entries) uit.push(await createTijdregistratie(entry))
  return uit
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

/** Zet meerdere regels in één keer op een andere status (week indienen, goedkeuren, terugsturen). */
export async function markeerGefactureerd(ids: string[], factuurId: string): Promise<void> {
  if (ids.length === 0) return
  assertId(factuurId, 'factuur_id')
  const updates = { gefactureerd: true, factuur_id: factuurId }
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('tijdregistraties').update({ ...updates, updated_at: now() }).in('id', ids)
    if (error) throw error
    return
  }
  const items = getLocalData<Tijdregistratie>('tijdregistraties')
  const doel = new Set(ids)
  setLocalData('tijdregistraties', items.map((t) => (doel.has(t.id) ? { ...t, ...updates, updated_at: now() } : t)))
}

export async function zetUrenStatus(
  ids: string[],
  updates: Pick<Tijdregistratie, 'status'> & Partial<Pick<Tijdregistratie, 'definitief_op' | 'goedgekeurd_door_id' | 'goedgekeurd_op'>>,
): Promise<void> {
  if (ids.length === 0) return
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('tijdregistraties').update({ ...updates, updated_at: now() }).in('id', ids)
    if (error) throw error
    return
  }
  const items = getLocalData<Tijdregistratie>('tijdregistraties')
  const doel = new Set(ids)
  setLocalData('tijdregistraties', items.map((t) => (doel.has(t.id) ? { ...t, ...updates, updated_at: now() } : t)))
}
