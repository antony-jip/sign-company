import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, round2,
} from './supabaseHelpers'
import type { VoorraadArtikel, VoorraadMutatie } from '@/types'

export async function getVoorraadArtikelen(limit = 500): Promise<VoorraadArtikel[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('voorraad_artikelen').select('*').order('naam').limit(limit)
    if (error) throw error
    return data || []
  }
  return getLocalData<VoorraadArtikel>('voorraad_artikelen')
}

export async function getVoorraadArtikel(id: string): Promise<VoorraadArtikel | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('voorraad_artikelen').select('*').eq('id', id).maybeSingle()
    if (error) return null
    return data
  }
  return getLocalData<VoorraadArtikel>('voorraad_artikelen').find((a) => a.id === id) || null
}

export async function getVoorraadArtikelenBijMinimum(): Promise<VoorraadArtikel[]> {
  const artikelen = await getVoorraadArtikelen()
  return artikelen.filter((a) => a.actief && a.huidige_voorraad < a.minimum_voorraad)
}

export async function createVoorraadArtikel(data: Omit<VoorraadArtikel, 'id' | 'created_at' | 'updated_at'>): Promise<VoorraadArtikel> {
  const newItem: VoorraadArtikel = { ...data, id: generateId(), created_at: now(), updated_at: now() } as VoorraadArtikel
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data: saved, error } = await supabase.from('voorraad_artikelen').insert({ ...await withUserId(newItem), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return saved
  }
  const items = getLocalData<VoorraadArtikel>('voorraad_artikelen')
  items.push(newItem)
  setLocalData('voorraad_artikelen', items)
  return newItem
}

export async function updateVoorraadArtikel(id: string, updates: Partial<VoorraadArtikel>): Promise<VoorraadArtikel> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('voorraad_artikelen').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<VoorraadArtikel>('voorraad_artikelen')
  const index = items.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('VoorraadArtikel niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('voorraad_artikelen', items)
  return items[index]
}

export async function deleteVoorraadArtikel(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('voorraad_artikelen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<VoorraadArtikel>('voorraad_artikelen')
  setLocalData('voorraad_artikelen', items.filter((a) => a.id !== id))
}

export async function getVoorraadMutaties(artikelId: string): Promise<VoorraadMutatie[]> {
  assertId(artikelId, 'artikel_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('voorraad_mutaties').select('*').eq('artikel_id', artikelId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<VoorraadMutatie>('voorraad_mutaties').filter((m) => m.artikel_id === artikelId)
}

export async function getVoorraadMutatiesByProject(projectId: string): Promise<VoorraadMutatie[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('voorraad_mutaties').select('*').eq('project_id', projectId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<VoorraadMutatie>('voorraad_mutaties').filter((m) => m.project_id === projectId)
}

export async function createVoorraadMutatie(data: Omit<VoorraadMutatie, 'id' | 'saldo_na_mutatie' | 'created_at'>): Promise<VoorraadMutatie> {
  const artikel = await getVoorraadArtikel(data.artikel_id)
  if (!artikel) throw new Error('Artikel niet gevonden')
  const nieuwSaldo = round2(artikel.huidige_voorraad + data.aantal)
  const newItem: VoorraadMutatie = { ...data, id: generateId(), saldo_na_mutatie: nieuwSaldo, created_at: now() } as VoorraadMutatie
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data: saved, error } = await supabase.from('voorraad_mutaties').insert({ ...await withUserId(newItem), organisatie_id: _orgId }).select().single()
    if (error) throw error
    await supabase.from('voorraad_artikelen').update({ huidige_voorraad: nieuwSaldo, updated_at: now() }).eq('id', data.artikel_id)
    return saved
  }
  const mutaties = getLocalData<VoorraadMutatie>('voorraad_mutaties')
  mutaties.unshift(newItem)
  setLocalData('voorraad_mutaties', mutaties)
  // Update artikel saldo
  const artikelen = getLocalData<VoorraadArtikel>('voorraad_artikelen')
  const idx = artikelen.findIndex((a) => a.id === data.artikel_id)
  if (idx !== -1) {
    artikelen[idx] = { ...artikelen[idx], huidige_voorraad: nieuwSaldo, updated_at: now() }
    setLocalData('voorraad_artikelen', artikelen)
  }
  return newItem
}

export async function deleteVoorraadMutatie(id: string): Promise<void> {
  assertId(id)
  let mutatie: VoorraadMutatie | undefined
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase.from('voorraad_mutaties').select('*').eq('id', id).maybeSingle()
    mutatie = data || undefined
  } else {
    mutatie = getLocalData<VoorraadMutatie>('voorraad_mutaties').find((m) => m.id === id)
  }
  if (mutatie) {
    const artikel = await getVoorraadArtikel(mutatie.artikel_id)
    if (artikel) {
      const correctedSaldo = round2(artikel.huidige_voorraad - mutatie.aantal)
      await updateVoorraadArtikel(mutatie.artikel_id, { huidige_voorraad: correctedSaldo })
    }
  }
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('voorraad_mutaties').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<VoorraadMutatie>('voorraad_mutaties')
  setLocalData('voorraad_mutaties', items.filter((m) => m.id !== id))
}
