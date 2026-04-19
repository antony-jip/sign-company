import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates, round2,
} from './supabaseHelpers'
import type {
  Grootboek,
  Kostenplaats,
  BtwCode,
  Korting,
  Leverancier,
  Uitgave,
  Bestelbon,
  BestelbonRegel,
  Leveringsbon,
  LeveringsbonRegel,
} from '@/types'

// ============ GROOTBOEK ============

export async function getGrootboek(): Promise<Grootboek[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('grootboek')
      .select('*')
      .order('code')
    if (error) throw error
    return data || []
  }
  return getLocalData<Grootboek>('grootboek')
}

export async function createGrootboekRekening(rekening: Omit<Grootboek, 'id' | 'created_at'>): Promise<Grootboek> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('grootboek')
      .insert(await withUserId(rekening))
      .select()
      .single()
    if (error) throw error
    return data
  }
  const grootboek = getLocalData<Grootboek>('grootboek')
  const newRekening: Grootboek = {
    ...rekening,
    id: generateId(),
    created_at: now(),
  } as Grootboek
  grootboek.push(newRekening)
  setLocalData('grootboek', grootboek)
  return newRekening
}

export async function updateGrootboekRekening(id: string, updates: Partial<Grootboek>): Promise<Grootboek> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('grootboek')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const grootboek = getLocalData<Grootboek>('grootboek')
  const index = grootboek.findIndex((g) => g.id === id)
  if (index === -1) throw new Error('Grootboekrekening niet gevonden')
  grootboek[index] = { ...grootboek[index], ...updates }
  setLocalData('grootboek', grootboek)
  return grootboek[index]
}

export async function deleteGrootboekRekening(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('grootboek').delete().eq('id', id)
    if (error) throw error
    return
  }
  const grootboek = getLocalData<Grootboek>('grootboek')
  setLocalData('grootboek', grootboek.filter((g) => g.id !== id))
}

// ============ KOSTENPLAATSEN ============

export async function getKostenplaatsen(): Promise<Kostenplaats[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('kostenplaatsen')
      .select('*')
      .order('code')
    if (error) throw error
    return data || []
  }
  return getLocalData<Kostenplaats>('kostenplaatsen')
}

export async function createKostenplaats(data: Omit<Kostenplaats, 'id' | 'created_at'>): Promise<Kostenplaats> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data: result, error } = await supabase
      .from('kostenplaatsen')
      .insert({ ...data, organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return result
  }
  const items = getLocalData<Kostenplaats>('kostenplaatsen')
  const newItem: Kostenplaats = {
    ...data,
    id: generateId(),
    created_at: now(),
  } as Kostenplaats
  items.push(newItem)
  setLocalData('kostenplaatsen', items)
  return newItem
}

export async function updateKostenplaats(id: string, updates: Partial<Kostenplaats>): Promise<Kostenplaats> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('kostenplaatsen')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Kostenplaats>('kostenplaatsen')
  const index = items.findIndex((k) => k.id === id)
  if (index === -1) throw new Error('Kostenplaats niet gevonden')
  items[index] = { ...items[index], ...updates }
  setLocalData('kostenplaatsen', items)
  return items[index]
}

export async function deleteKostenplaats(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('kostenplaatsen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Kostenplaats>('kostenplaatsen')
  setLocalData('kostenplaatsen', items.filter((k) => k.id !== id))
}

// ============ BTW CODES ============

export async function getBtwCodes(): Promise<BtwCode[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('btw_codes')
      .select('*')
      .order('code')
    if (error) throw error
    return data || []
  }
  return getLocalData<BtwCode>('btw_codes')
}

export async function createBtwCode(btwCode: Omit<BtwCode, 'id' | 'created_at'>): Promise<BtwCode> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('btw_codes')
      .insert({ ...await withUserId(btwCode), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const codes = getLocalData<BtwCode>('btw_codes')
  const newCode: BtwCode = {
    ...btwCode,
    id: generateId(),
    created_at: now(),
  } as BtwCode
  codes.push(newCode)
  setLocalData('btw_codes', codes)
  return newCode
}

export async function updateBtwCode(id: string, updates: Partial<BtwCode>): Promise<BtwCode> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('btw_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const codes = getLocalData<BtwCode>('btw_codes')
  const index = codes.findIndex((c) => c.id === id)
  if (index === -1) throw new Error('BTW code niet gevonden')
  codes[index] = { ...codes[index], ...updates }
  setLocalData('btw_codes', codes)
  return codes[index]
}

export async function deleteBtwCode(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('btw_codes').delete().eq('id', id)
    if (error) throw error
    return
  }
  const codes = getLocalData<BtwCode>('btw_codes')
  setLocalData('btw_codes', codes.filter((c) => c.id !== id))
}

// ============ KORTINGEN ============

export async function getKortingen(): Promise<Korting[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('kortingen')
      .select('*')
      .order('naam')
    if (error) throw error
    return data || []
  }
  return getLocalData<Korting>('kortingen')
}

export async function createKorting(korting: Omit<Korting, 'id' | 'created_at'>): Promise<Korting> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('kortingen')
      .insert({ ...await withUserId(korting), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const kortingen = getLocalData<Korting>('kortingen')
  const newKorting: Korting = {
    ...korting,
    id: generateId(),
    created_at: now(),
  } as Korting
  kortingen.push(newKorting)
  setLocalData('kortingen', kortingen)
  return newKorting
}

export async function updateKorting(id: string, updates: Partial<Korting>): Promise<Korting> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('kortingen')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const kortingen = getLocalData<Korting>('kortingen')
  const index = kortingen.findIndex((k) => k.id === id)
  if (index === -1) throw new Error('Korting niet gevonden')
  kortingen[index] = { ...kortingen[index], ...updates }
  setLocalData('kortingen', kortingen)
  return kortingen[index]
}

export async function deleteKorting(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('kortingen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const kortingen = getLocalData<Korting>('kortingen')
  setLocalData('kortingen', kortingen.filter((k) => k.id !== id))
}

// ============ LEVERANCIERS (Tier 1 Feature 3) ============

export async function getLeveranciers(): Promise<Leverancier[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveranciers').select('*').order('bedrijfsnaam')
    if (error) throw error
    return data || []
  }
  return getLocalData<Leverancier>('leveranciers')
}

export async function getLeverancier(id: string): Promise<Leverancier | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveranciers').select('*').eq('id', id).maybeSingle()
    if (error) return null
    return data
  }
  return getLocalData<Leverancier>('leveranciers').find((l) => l.id === id) || null
}

export async function createLeverancier(lev: Omit<Leverancier, 'id' | 'created_at'>): Promise<Leverancier> {
  const newLev: Leverancier = { ...lev, id: generateId(), created_at: now() } as Leverancier
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('leveranciers').insert({ ...await withUserId(newLev), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Leverancier>('leveranciers')
  items.push(newLev)
  setLocalData('leveranciers', items)
  return newLev
}

export async function updateLeverancier(id: string, updates: Partial<Leverancier>): Promise<Leverancier> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveranciers').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Leverancier>('leveranciers')
  const index = items.findIndex((l) => l.id === id)
  if (index === -1) throw new Error('Leverancier niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('leveranciers', items)
  return items[index]
}

export async function deleteLeverancier(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('leveranciers').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Leverancier>('leveranciers')
  setLocalData('leveranciers', items.filter((l) => l.id !== id))
}

// ============ UITGAVEN (Tier 1 Feature 3) ============

async function generateUitgaveNummer(): Promise<string> {
  const jaar = new Date().getFullYear()
  const uitgaven = await getUitgaven()
  const ditJaar = uitgaven.filter((u) => u.uitgave_nummer.startsWith(`UIT-${jaar}-`))
  const maxNr = ditJaar.reduce((max, u) => {
    const nr = parseInt(u.uitgave_nummer.split('-')[2], 10)
    return nr > max ? nr : max
  }, 0)
  return `UIT-${jaar}-${String(maxNr + 1).padStart(3, '0')}`
}

export async function getUitgaven(): Promise<Uitgave[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('uitgaven').select('*').order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Uitgave>('uitgaven')
}

export async function getUitgave(id: string): Promise<Uitgave | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('uitgaven').select('*').eq('id', id).maybeSingle()
    if (error) return null
    return data
  }
  return getLocalData<Uitgave>('uitgaven').find((u) => u.id === id) || null
}

export async function getUitgavenByProject(projectId: string): Promise<Uitgave[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('uitgaven').select('*').eq('project_id', projectId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Uitgave>('uitgaven').filter((u) => u.project_id === projectId)
}

export async function getUitgavenByLeverancier(leverancierId: string): Promise<Uitgave[]> {
  assertId(leverancierId, 'leverancier_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('uitgaven').select('*').eq('leverancier_id', leverancierId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Uitgave>('uitgaven').filter((u) => u.leverancier_id === leverancierId)
}

export async function createUitgave(uitgave: Omit<Uitgave, 'id' | 'uitgave_nummer' | 'created_at' | 'updated_at'>): Promise<Uitgave> {
  const uitgave_nummer = await generateUitgaveNummer()
  const newUitgave: Uitgave = { ...sanitizeDates(uitgave), id: generateId(), uitgave_nummer, created_at: now(), updated_at: now() } as Uitgave
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('uitgaven').insert({ ...await withUserId(newUitgave), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Uitgave>('uitgaven')
  items.push(newUitgave)
  setLocalData('uitgaven', items)
  return newUitgave
}

export async function updateUitgave(id: string, updates: Partial<Uitgave>): Promise<Uitgave> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('uitgaven').update(sanitizeDates({ ...updates, updated_at: now() })).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Uitgave>('uitgaven')
  const index = items.findIndex((u) => u.id === id)
  if (index === -1) throw new Error('Uitgave niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('uitgaven', items)
  return items[index]
}

export async function deleteUitgave(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('uitgaven').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Uitgave>('uitgaven')
  setLocalData('uitgaven', items.filter((u) => u.id !== id))
}

export async function getUitgavenTotaalByProject(projectId: string): Promise<number> {
  const uitgaven = await getUitgavenByProject(projectId)
  return round2(uitgaven.reduce((sum, u) => sum + u.bedrag_incl_btw, 0))
}

// ============ BESTELBONNEN (Tier 2 Feature 3) ============

export async function generateBestelbonNummer(): Promise<string> {
  const jaar = new Date().getFullYear()
  const items = await getBestelbonnen()
  const prefix = `BST-${jaar}-`
  const maxNr = items.filter((b) => b.bestelbon_nummer.startsWith(prefix)).reduce((max, b) => {
    const parts = b.bestelbon_nummer.split('-')
    const nr = parseInt(parts[parts.length - 1], 10)
    return nr > max ? nr : max
  }, 0)
  return `${prefix}${String(maxNr + 1).padStart(3, '0')}`
}

export async function getBestelbonnen(limit = 500): Promise<Bestelbon[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bestelbonnen').select('*').order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return data || []
  }
  return getLocalData<Bestelbon>('bestelbonnen')
}

export async function getBestelbon(id: string): Promise<Bestelbon | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bestelbonnen').select('*').eq('id', id).maybeSingle()
    if (error) return null
    return data
  }
  return getLocalData<Bestelbon>('bestelbonnen').find((b) => b.id === id) || null
}

export async function getBestelbonnenByProject(projectId: string): Promise<Bestelbon[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bestelbonnen').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Bestelbon>('bestelbonnen').filter((b) => b.project_id === projectId)
}

export async function getBestelbonnenByLeverancier(leverancierId: string): Promise<Bestelbon[]> {
  assertId(leverancierId, 'leverancier_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bestelbonnen').select('*').eq('leverancier_id', leverancierId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Bestelbon>('bestelbonnen').filter((b) => b.leverancier_id === leverancierId)
}

export async function createBestelbon(data: Omit<Bestelbon, 'id' | 'bestelbon_nummer' | 'created_at' | 'updated_at'>): Promise<Bestelbon> {
  const bestelbon_nummer = await generateBestelbonNummer()
  const newItem: Bestelbon = { ...sanitizeDates(data), id: generateId(), bestelbon_nummer, created_at: now(), updated_at: now() } as Bestelbon
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data: saved, error } = await supabase.from('bestelbonnen').insert({ ...await withUserId(newItem), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return saved
  }
  const items = getLocalData<Bestelbon>('bestelbonnen')
  items.unshift(newItem)
  setLocalData('bestelbonnen', items)
  return newItem
}

export async function updateBestelbon(id: string, updates: Partial<Bestelbon>): Promise<Bestelbon> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bestelbonnen').update(sanitizeDates({ ...updates, updated_at: now() })).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Bestelbon>('bestelbonnen')
  const index = items.findIndex((b) => b.id === id)
  if (index === -1) throw new Error('Bestelbon niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('bestelbonnen', items)
  return items[index]
}

export async function deleteBestelbon(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('bestelbonnen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Bestelbon>('bestelbonnen')
  setLocalData('bestelbonnen', items.filter((b) => b.id !== id))
}

export async function getBestelbonRegels(bestelbonId: string): Promise<BestelbonRegel[]> {
  assertId(bestelbonId, 'bestelbon_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bestelbon_regels').select('*').eq('bestelbon_id', bestelbonId).order('created_at')
    if (error) throw error
    return data || []
  }
  return getLocalData<BestelbonRegel>('bestelbon_regels').filter((r) => r.bestelbon_id === bestelbonId)
}

export async function createBestelbonRegel(data: Omit<BestelbonRegel, 'id' | 'created_at'>): Promise<BestelbonRegel> {
  const newItem: BestelbonRegel = { ...data, id: generateId(), created_at: now() } as BestelbonRegel
  if (isSupabaseConfigured() && supabase) {
    const { data: saved, error } = await supabase.from('bestelbon_regels').insert(await withUserId(newItem)).select().single()
    if (error) throw error
    return saved
  }
  const items = getLocalData<BestelbonRegel>('bestelbon_regels')
  items.push(newItem)
  setLocalData('bestelbon_regels', items)
  return newItem
}

export async function updateBestelbonRegel(id: string, updates: Partial<BestelbonRegel>): Promise<BestelbonRegel> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bestelbon_regels').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<BestelbonRegel>('bestelbon_regels')
  const index = items.findIndex((r) => r.id === id)
  if (index === -1) throw new Error('BestelbonRegel niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('bestelbon_regels', items)
  return items[index]
}

export async function deleteBestelbonRegel(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('bestelbon_regels').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<BestelbonRegel>('bestelbon_regels')
  setLocalData('bestelbon_regels', items.filter((r) => r.id !== id))
}

// ============ LEVERINGSBONNEN (Tier 2 Feature 4) ============

async function generateLeveringsbonNummer(): Promise<string> {
  const jaar = new Date().getFullYear()
  const items = await getLeveringsbonnen()
  const prefix = `LB-${jaar}-`
  const maxNr = items.filter((l) => l.leveringsbon_nummer.startsWith(prefix)).reduce((max, l) => {
    const nr = parseInt(l.leveringsbon_nummer.split('-')[2], 10)
    return nr > max ? nr : max
  }, 0)
  return `${prefix}${String(maxNr + 1).padStart(3, '0')}`
}

export async function getLeveringsbonnen(limit = 500): Promise<Leveringsbon[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveringsbonnen').select('*').order('datum', { ascending: false }).limit(limit)
    if (error) throw error
    return data || []
  }
  return getLocalData<Leveringsbon>('leveringsbonnen')
}

export async function getLeveringsbon(id: string): Promise<Leveringsbon | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveringsbonnen').select('*').eq('id', id).maybeSingle()
    if (error) return null
    return data
  }
  return getLocalData<Leveringsbon>('leveringsbonnen').find((l) => l.id === id) || null
}

export async function getLeveringsbonnenByProject(projectId: string): Promise<Leveringsbon[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveringsbonnen').select('*').eq('project_id', projectId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Leveringsbon>('leveringsbonnen').filter((l) => l.project_id === projectId)
}

export async function getLeveringsbonnenByKlant(klantId: string): Promise<Leveringsbon[]> {
  assertId(klantId, 'klant_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveringsbonnen').select('*').eq('klant_id', klantId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Leveringsbon>('leveringsbonnen').filter((l) => l.klant_id === klantId)
}

export async function createLeveringsbon(data: Omit<Leveringsbon, 'id' | 'leveringsbon_nummer' | 'created_at' | 'updated_at'>): Promise<Leveringsbon> {
  const leveringsbon_nummer = await generateLeveringsbonNummer()
  const newItem: Leveringsbon = { ...sanitizeDates(data), id: generateId(), leveringsbon_nummer, created_at: now(), updated_at: now() } as Leveringsbon
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data: saved, error } = await supabase.from('leveringsbonnen').insert({ ...await withUserId(newItem), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return saved
  }
  const items = getLocalData<Leveringsbon>('leveringsbonnen')
  items.unshift(newItem)
  setLocalData('leveringsbonnen', items)
  return newItem
}

export async function updateLeveringsbon(id: string, updates: Partial<Leveringsbon>): Promise<Leveringsbon> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveringsbonnen').update(sanitizeDates({ ...updates, updated_at: now() })).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Leveringsbon>('leveringsbonnen')
  const index = items.findIndex((l) => l.id === id)
  if (index === -1) throw new Error('Leveringsbon niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('leveringsbonnen', items)
  return items[index]
}

export async function deleteLeveringsbon(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('leveringsbonnen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Leveringsbon>('leveringsbonnen')
  setLocalData('leveringsbonnen', items.filter((l) => l.id !== id))
}

export async function getLeveringsbonRegels(leveringsbonId: string): Promise<LeveringsbonRegel[]> {
  assertId(leveringsbonId, 'leveringsbon_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveringsbon_regels').select('*').eq('leveringsbon_id', leveringsbonId).order('created_at')
    if (error) throw error
    return data || []
  }
  return getLocalData<LeveringsbonRegel>('leveringsbon_regels').filter((r) => r.leveringsbon_id === leveringsbonId)
}

export async function createLeveringsbonRegel(data: Omit<LeveringsbonRegel, 'id' | 'created_at'>): Promise<LeveringsbonRegel> {
  const newItem: LeveringsbonRegel = { ...data, id: generateId(), created_at: now() } as LeveringsbonRegel
  if (isSupabaseConfigured() && supabase) {
    const { data: saved, error } = await supabase.from('leveringsbon_regels').insert(await withUserId(newItem)).select().single()
    if (error) throw error
    return saved
  }
  const items = getLocalData<LeveringsbonRegel>('leveringsbon_regels')
  items.push(newItem)
  setLocalData('leveringsbon_regels', items)
  return newItem
}

export async function updateLeveringsbonRegel(id: string, updates: Partial<LeveringsbonRegel>): Promise<LeveringsbonRegel> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveringsbon_regels').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<LeveringsbonRegel>('leveringsbon_regels')
  const index = items.findIndex((r) => r.id === id)
  if (index === -1) throw new Error('LeveringsbonRegel niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('leveringsbon_regels', items)
  return items[index]
}

export async function deleteLeveringsbonRegel(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('leveringsbon_regels').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<LeveringsbonRegel>('leveringsbon_regels')
  setLocalData('leveringsbon_regels', items.filter((r) => r.id !== id))
}
