import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates, getMaxNummer,
} from './supabaseHelpers'
import type { Werkbon, WerkbonItem, WerkbonAfbeelding, WerkbonRegel, WerkbonFoto } from '@/types'

async function generateWerkbonNummer(): Promise<string> {
  const jaar = new Date().getFullYear()
  const prefix = `WB-${jaar}-`
  let maxNr = await getMaxNummer('werkbonnen', 'werkbon_nummer', prefix)
  if (maxNr === 0) {
    const werkbonnen = isSupabaseConfigured() ? [] : getLocalData<Werkbon>('werkbonnen')
    const ditJaar = werkbonnen.filter((w) => w.werkbon_nummer.startsWith(prefix))
    maxNr = ditJaar.reduce((max, w) => {
      const nr = parseInt(w.werkbon_nummer.split('-')[2], 10)
      return nr > max ? nr : max
    }, 0)
  }
  return `${prefix}${String(maxNr + 1).padStart(3, '0')}`
}

export async function getWerkbonnen(limit = 500): Promise<Werkbon[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbonnen').select('*').order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return data || []
  }
  return getLocalData<Werkbon>('werkbonnen')
}

export async function getWerkbon(id: string): Promise<Werkbon | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbonnen').select('*').eq('id', id).maybeSingle()
    if (error) return null
    return data
  }
  return getLocalData<Werkbon>('werkbonnen').find((w) => w.id === id) || null
}

export async function getWerkbonnenByProject(projectId: string): Promise<Werkbon[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbonnen').select('*').eq('project_id', projectId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Werkbon>('werkbonnen').filter((w) => w.project_id === projectId)
}

export async function getWerkbonnenByOfferte(offerteId: string): Promise<Werkbon[]> {
  assertId(offerteId, 'offerte_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbonnen').select('*').eq('offerte_id', offerteId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Werkbon>('werkbonnen').filter((w) => w.offerte_id === offerteId)
}

export async function getWerkbonnenByKlant(klantId: string): Promise<Werkbon[]> {
  assertId(klantId, 'klant_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbonnen').select('*').eq('klant_id', klantId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Werkbon>('werkbonnen').filter((w) => w.klant_id === klantId)
}

export async function createWerkbon(werkbon: Omit<Werkbon, 'id' | 'werkbon_nummer' | 'created_at' | 'updated_at'>): Promise<Werkbon> {
  const werkbon_nummer = await generateWerkbonNummer()
  const newWerkbon: Werkbon = { ...sanitizeDates(werkbon), id: generateId(), werkbon_nummer, created_at: now(), updated_at: now() } as Werkbon
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('werkbonnen').insert({ ...await withUserId(newWerkbon), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Werkbon>('werkbonnen')
  items.push(newWerkbon)
  setLocalData('werkbonnen', items)
  return newWerkbon
}

export async function updateWerkbon(id: string, updates: Partial<Werkbon>): Promise<Werkbon> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbonnen').update(sanitizeDates({ ...updates, updated_at: now() })).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Werkbon>('werkbonnen')
  const index = items.findIndex((w) => w.id === id)
  if (index === -1) throw new Error('Werkbon niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('werkbonnen', items)
  return items[index]
}

export async function deleteWerkbon(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    await Promise.all([
      supabase.from('werkbon_regels').delete().eq('werkbon_id', id),
      supabase.from('werkbon_fotos').delete().eq('werkbon_id', id),
      supabase.from('werkbon_items').delete().eq('werkbon_id', id),
      supabase.from('werkbon_afbeeldingen').delete().eq('werkbon_id', id),
    ])
    const { error } = await supabase.from('werkbonnen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Werkbon>('werkbonnen')
  setLocalData('werkbonnen', items.filter((w) => w.id !== id))
}

export async function getWerkbonRegels(werkbonId: string): Promise<WerkbonRegel[]> {
  assertId(werkbonId, 'werkbon_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbon_regels').select('*').eq('werkbon_id', werkbonId).order('created_at')
    if (error) throw error
    return data || []
  }
  return getLocalData<WerkbonRegel>('werkbon_regels').filter((r) => r.werkbon_id === werkbonId)
}

export async function createWerkbonRegel(regel: Omit<WerkbonRegel, 'id' | 'created_at'>): Promise<WerkbonRegel> {
  const newRegel: WerkbonRegel = { ...regel, id: generateId(), created_at: now() } as WerkbonRegel
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbon_regels').insert(await withUserId(newRegel)).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<WerkbonRegel>('werkbon_regels')
  items.push(newRegel)
  setLocalData('werkbon_regels', items)
  return newRegel
}

export async function updateWerkbonRegel(id: string, updates: Partial<WerkbonRegel>): Promise<WerkbonRegel> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbon_regels').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<WerkbonRegel>('werkbon_regels')
  const index = items.findIndex((r) => r.id === id)
  if (index === -1) throw new Error('Werkbon regel niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('werkbon_regels', items)
  return items[index]
}

export async function deleteWerkbonRegel(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('werkbon_regels').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<WerkbonRegel>('werkbon_regels')
  setLocalData('werkbon_regels', items.filter((r) => r.id !== id))
}

export async function getWerkbonFotos(werkbonId: string): Promise<WerkbonFoto[]> {
  assertId(werkbonId, 'werkbon_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbon_fotos').select('*').eq('werkbon_id', werkbonId).order('created_at')
    if (error) throw error
    return data || []
  }
  return getLocalData<WerkbonFoto>('werkbon_fotos').filter((f) => f.werkbon_id === werkbonId)
}

export async function createWerkbonFoto(foto: Omit<WerkbonFoto, 'id' | 'created_at'>): Promise<WerkbonFoto> {
  const newFoto: WerkbonFoto = { ...foto, id: generateId(), created_at: now() } as WerkbonFoto
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbon_fotos').insert(await withUserId(newFoto)).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<WerkbonFoto>('werkbon_fotos')
  items.push(newFoto)
  setLocalData('werkbon_fotos', items)
  return newFoto
}

export async function deleteWerkbonFoto(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('werkbon_fotos').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<WerkbonFoto>('werkbon_fotos')
  setLocalData('werkbon_fotos', items.filter((f) => f.id !== id))
}

export async function getWerkbonItems(werkbonId: string): Promise<WerkbonItem[]> {
  assertId(werkbonId, 'werkbon_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbon_items').select('*').eq('werkbon_id', werkbonId).order('volgorde')
    if (error) throw error
    const items = data || []
    for (const item of items) {
      const afb = await getWerkbonAfbeeldingen(item.id)
      item.afbeeldingen = afb
    }
    return items
  }
  const items = getLocalData<WerkbonItem>('werkbon_items').filter((i) => i.werkbon_id === werkbonId)
  for (const item of items) {
    item.afbeeldingen = getLocalData<WerkbonAfbeelding>('werkbon_afbeeldingen').filter((a) => a.werkbon_item_id === item.id)
  }
  return items.sort((a, b) => a.volgorde - b.volgorde)
}

export async function createWerkbonItem(item: Omit<WerkbonItem, 'id' | 'created_at' | 'afbeeldingen'>): Promise<WerkbonItem> {
  const newItem: WerkbonItem = { ...item, id: generateId(), afbeeldingen: [], created_at: now() } as WerkbonItem
  if (isSupabaseConfigured() && supabase) {
    const { afbeeldingen: _afb, ...dbItem } = newItem
    const { data, error } = await supabase.from('werkbon_items').insert(await withUserId(dbItem)).select().single()
    if (error) throw error
    return { ...data, afbeeldingen: [] }
  }
  const items = getLocalData<WerkbonItem>('werkbon_items')
  items.push(newItem)
  setLocalData('werkbon_items', items)
  return newItem
}

export async function updateWerkbonItem(id: string, updates: Partial<WerkbonItem>): Promise<WerkbonItem> {
  assertId(id)
  const { afbeeldingen: _afb, ...dbUpdates } = updates
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbon_items').update(dbUpdates).eq('id', id).select().single()
    if (error) throw error
    const afb = await getWerkbonAfbeeldingen(id)
    return { ...data, afbeeldingen: afb }
  }
  const items = getLocalData<WerkbonItem>('werkbon_items')
  const index = items.findIndex((i) => i.id === id)
  if (index === -1) throw new Error('Werkbon item niet gevonden')
  items[index] = { ...items[index], ...dbUpdates }
  setLocalData('werkbon_items', items)
  items[index].afbeeldingen = getLocalData<WerkbonAfbeelding>('werkbon_afbeeldingen').filter((a) => a.werkbon_item_id === id)
  return items[index]
}

export async function deleteWerkbonItem(id: string): Promise<void> {
  assertId(id)
  const afbeeldingen = await getWerkbonAfbeeldingen(id)
  for (const afb of afbeeldingen) {
    await deleteWerkbonAfbeelding(afb.id)
  }
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('werkbon_items').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<WerkbonItem>('werkbon_items')
  setLocalData('werkbon_items', items.filter((i) => i.id !== id))
}

export async function getWerkbonAfbeeldingen(werkbonItemId: string): Promise<WerkbonAfbeelding[]> {
  assertId(werkbonItemId, 'werkbon_item_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbon_afbeeldingen').select('*').eq('werkbon_item_id', werkbonItemId).order('created_at')
    if (error) throw error
    return data || []
  }
  return getLocalData<WerkbonAfbeelding>('werkbon_afbeeldingen').filter((a) => a.werkbon_item_id === werkbonItemId)
}

export async function createWerkbonAfbeelding(afbeelding: Omit<WerkbonAfbeelding, 'id' | 'created_at'>): Promise<WerkbonAfbeelding> {
  const newAfb: WerkbonAfbeelding = { ...afbeelding, id: generateId(), created_at: now() } as WerkbonAfbeelding
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbon_afbeeldingen').insert(newAfb).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<WerkbonAfbeelding>('werkbon_afbeeldingen')
  items.push(newAfb)
  setLocalData('werkbon_afbeeldingen', items)
  return newAfb
}

export async function deleteWerkbonAfbeelding(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('werkbon_afbeeldingen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<WerkbonAfbeelding>('werkbon_afbeeldingen')
  setLocalData('werkbon_afbeeldingen', items.filter((a) => a.id !== id))
}
