import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates, round2,
} from './supabaseHelpers'
import type { Deal, DealActiviteit, LeadFormulier, LeadInzending, InkoopOfferte, InkoopRegel } from '@/types'

// ============ DEALS / SALES PIPELINE (Tier 3 Feature 1) ============

export async function getDeals(limit = 500): Promise<Deal[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('deals').select('*').order('updated_at', { ascending: false }).limit(limit)
    if (error) throw error
    return data || []
  }
  return getLocalData<Deal>('deals')
}

export async function getDeal(id: string): Promise<Deal | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('deals').select('*').eq('id', id).maybeSingle()
    if (error) return null
    return data
  }
  return getLocalData<Deal>('deals').find((d) => d.id === id) || null
}

export async function getDealsByKlant(klantId: string): Promise<Deal[]> {
  assertId(klantId, 'klant_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('deals').select('*').eq('klant_id', klantId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Deal>('deals').filter((d) => d.klant_id === klantId)
}

export async function getDealsByFase(fase: string): Promise<Deal[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('deals').select('*').eq('fase', fase)
    if (error) throw error
    return data || []
  }
  return getLocalData<Deal>('deals').filter((d) => d.fase === fase)
}

export async function getDealsByMedewerker(medewerkerId: string): Promise<Deal[]> {
  assertId(medewerkerId, 'medewerker_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('deals').select('*').eq('medewerker_id', medewerkerId)
    if (error) throw error
    return data || []
  }
  return getLocalData<Deal>('deals').filter((d) => d.medewerker_id === medewerkerId)
}

export async function createDeal(data: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
  const newItem: Deal = { ...sanitizeDates(data), id: generateId(), created_at: now(), updated_at: now() } as Deal
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data: saved, error } = await supabase.from('deals').insert({ ...await withUserId(newItem), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return saved
  }
  const items = getLocalData<Deal>('deals')
  items.unshift(newItem)
  setLocalData('deals', items)
  return newItem
}

export async function updateDeal(id: string, updates: Partial<Deal>): Promise<Deal> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('deals').update(sanitizeDates({ ...updates, updated_at: now() })).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Deal>('deals')
  const index = items.findIndex((d) => d.id === id)
  if (index === -1) throw new Error('Deal niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('deals', items)
  return items[index]
}

export async function deleteDeal(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('deals').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Deal>('deals')
  setLocalData('deals', items.filter((d) => d.id !== id))
}

// Deal Activiteiten

export async function getDealActiviteiten(dealId: string): Promise<DealActiviteit[]> {
  assertId(dealId, 'deal_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('deal_activiteiten').select('*').eq('deal_id', dealId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<DealActiviteit>('deal_activiteiten').filter((a) => a.deal_id === dealId).sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
}

export async function createDealActiviteit(data: Omit<DealActiviteit, 'id' | 'created_at'>): Promise<DealActiviteit> {
  const newItem: DealActiviteit = { ...sanitizeDates(data), id: generateId(), created_at: now() } as DealActiviteit
  if (isSupabaseConfigured() && supabase) {
    const { data: saved, error } = await supabase.from('deal_activiteiten').insert(await withUserId(newItem)).select().single()
    if (error) throw error
    return saved
  }
  const items = getLocalData<DealActiviteit>('deal_activiteiten')
  items.unshift(newItem)
  setLocalData('deal_activiteiten', items)
  return newItem
}

export async function deleteDealActiviteit(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('deal_activiteiten').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<DealActiviteit>('deal_activiteiten')
  setLocalData('deal_activiteiten', items.filter((a) => a.id !== id))
}

// ============ LEAD CAPTURE (Tier 3 Feature 2) ============

export function generateLeadToken(): string {
  return `lead_${generateId().replace(/-/g, '').slice(0, 24)}`
}

export async function getLeadFormulieren(): Promise<LeadFormulier[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('lead_formulieren').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<LeadFormulier>('lead_formulieren')
}

export async function getLeadFormulier(id: string): Promise<LeadFormulier | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('lead_formulieren').select('*').eq('id', id).maybeSingle()
    if (error) return null
    return data
  }
  return getLocalData<LeadFormulier>('lead_formulieren').find((f) => f.id === id) || null
}

export async function getLeadFormulierByToken(token: string): Promise<LeadFormulier | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('lead_formulieren').select('*').eq('publiek_token', token).eq('actief', true).maybeSingle()
    if (error) return null
    return data
  }
  return getLocalData<LeadFormulier>('lead_formulieren').find((f) => f.publiek_token === token && f.actief) || null
}

export async function createLeadFormulier(data: Omit<LeadFormulier, 'id' | 'publiek_token' | 'created_at' | 'updated_at'>): Promise<LeadFormulier> {
  const publiek_token = generateLeadToken()
  const newItem: LeadFormulier = { ...data, id: generateId(), publiek_token, created_at: now(), updated_at: now() } as LeadFormulier
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data: saved, error } = await supabase.from('lead_formulieren').insert({ ...await withUserId(newItem), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return saved
  }
  const items = getLocalData<LeadFormulier>('lead_formulieren')
  items.unshift(newItem)
  setLocalData('lead_formulieren', items)
  return newItem
}

export async function updateLeadFormulier(id: string, updates: Partial<LeadFormulier>): Promise<LeadFormulier> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('lead_formulieren').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<LeadFormulier>('lead_formulieren')
  const index = items.findIndex((f) => f.id === id)
  if (index === -1) throw new Error('LeadFormulier niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('lead_formulieren', items)
  return items[index]
}

export async function deleteLeadFormulier(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('lead_formulieren').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<LeadFormulier>('lead_formulieren')
  setLocalData('lead_formulieren', items.filter((f) => f.id !== id))
}

// Lead Inzendingen

export async function getLeadInzendingen(formulierId: string): Promise<LeadInzending[]> {
  assertId(formulierId, 'formulier_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('lead_inzendingen').select('*').eq('formulier_id', formulierId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<LeadInzending>('lead_inzendingen').filter((i) => i.formulier_id === formulierId)
}

export async function getAllLeadInzendingen(): Promise<LeadInzending[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('lead_inzendingen').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<LeadInzending>('lead_inzendingen')
}

export async function getLeadInzendingenNieuw(): Promise<LeadInzending[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('lead_inzendingen').select('*').eq('status', 'nieuw').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<LeadInzending>('lead_inzendingen').filter((i) => i.status === 'nieuw')
}

export async function createLeadInzending(data: Omit<LeadInzending, 'id' | 'created_at'>): Promise<LeadInzending> {
  const newItem: LeadInzending = { ...data, id: generateId(), created_at: now() } as LeadInzending
  if (isSupabaseConfigured() && supabase) {
    const { data: saved, error } = await supabase.from('lead_inzendingen').insert(await withUserId(newItem)).select().single()
    if (error) throw error
    return saved
  }
  const items = getLocalData<LeadInzending>('lead_inzendingen')
  items.unshift(newItem)
  setLocalData('lead_inzendingen', items)
  return newItem
}

export async function updateLeadInzending(id: string, updates: Partial<LeadInzending>): Promise<LeadInzending> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('lead_inzendingen').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<LeadInzending>('lead_inzendingen')
  const index = items.findIndex((i) => i.id === id)
  if (index === -1) throw new Error('LeadInzending niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('lead_inzendingen', items)
  return items[index]
}

// ============ INKOOP OFFERTES ============

export async function getInkoopOffertes(user_id: string): Promise<InkoopOfferte[]> {
  assertId(user_id, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('inkoop_offertes')
      .select('*, regels:inkoop_regels(*)')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const offertes = getLocalData<InkoopOfferte>('inkoop_offertes')
  const regels = getLocalData<InkoopRegel>('inkoop_regels')
  return offertes
    .filter((o) => o.user_id === user_id)
    .map((o) => ({ ...o, regels: regels.filter((r) => r.inkoop_offerte_id === o.id) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getInkoopOffertesByProject(project_id: string): Promise<InkoopOfferte[]> {
  assertId(project_id, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('inkoop_offertes')
      .select('*, regels:inkoop_regels(*)')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const offertes = getLocalData<InkoopOfferte>('inkoop_offertes')
  const regels = getLocalData<InkoopRegel>('inkoop_regels')
  return offertes
    .filter((o) => o.project_id === project_id)
    .map((o) => ({ ...o, regels: regels.filter((r) => r.inkoop_offerte_id === o.id) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getInkoopOffertesByOfferte(offerte_id: string): Promise<InkoopOfferte[]> {
  assertId(offerte_id, 'offerte_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('inkoop_offertes')
      .select('*, regels:inkoop_regels(*)')
      .eq('offerte_id', offerte_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const offertes = getLocalData<InkoopOfferte>('inkoop_offertes')
  const regels = getLocalData<InkoopRegel>('inkoop_regels')
  return offertes
    .filter((o) => o.offerte_id === offerte_id)
    .map((o) => ({ ...o, regels: regels.filter((r) => r.inkoop_offerte_id === o.id) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function createInkoopOfferte(data: Omit<InkoopOfferte, 'id' | 'created_at' | 'regels'>): Promise<InkoopOfferte> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data: row, error } = await supabase
      .from('inkoop_offertes')
      .insert({ ...await withUserId({ ...data, totaal: round2(data.totaal) }), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return { ...row, regels: [] }
  }
  const offertes = getLocalData<InkoopOfferte>('inkoop_offertes')
  const newOfferte: InkoopOfferte = {
    ...data,
    totaal: round2(data.totaal),
    id: generateId(),
    created_at: now(),
    regels: [],
  }
  offertes.push(newOfferte)
  setLocalData('inkoop_offertes', offertes)
  return newOfferte
}

export async function createInkoopRegel(data: Omit<InkoopRegel, 'id' | 'created_at'>): Promise<InkoopRegel> {
  const regelData = {
    ...data,
    prijs_per_stuk: round2(data.prijs_per_stuk),
    totaal: round2(data.totaal),
  }
  if (isSupabaseConfigured() && supabase) {
    const { data: row, error } = await supabase
      .from('inkoop_regels')
      .insert(await withUserId(regelData))
      .select()
      .single()
    if (error) throw error
    return row
  }
  const regels = getLocalData<InkoopRegel>('inkoop_regels')
  const newRegel: InkoopRegel = {
    ...regelData,
    id: generateId(),
    created_at: now(),
  }
  regels.push(newRegel)
  setLocalData('inkoop_regels', regels)
  return newRegel
}

export async function updateInkoopRegel(id: string, updates: Partial<InkoopRegel>): Promise<InkoopRegel> {
  assertId(id)
  const safeUpdates = { ...updates }
  if (safeUpdates.prijs_per_stuk != null) safeUpdates.prijs_per_stuk = round2(safeUpdates.prijs_per_stuk)
  if (safeUpdates.totaal != null) safeUpdates.totaal = round2(safeUpdates.totaal)

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('inkoop_regels')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const regels = getLocalData<InkoopRegel>('inkoop_regels')
  const index = regels.findIndex((r) => r.id === id)
  if (index === -1) throw new Error('Inkoop regel niet gevonden')
  regels[index] = { ...regels[index], ...safeUpdates }
  setLocalData('inkoop_regels', regels)
  return regels[index]
}

export async function deleteInkoopOfferte(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    // Verwijder eerst regels, dan offerte
    await supabase.from('inkoop_regels').delete().eq('inkoop_offerte_id', id)
    const { error } = await supabase.from('inkoop_offertes').delete().eq('id', id)
    if (error) throw error
    return
  }
  const offertes = getLocalData<InkoopOfferte>('inkoop_offertes')
  setLocalData('inkoop_offertes', offertes.filter((o) => o.id !== id))
  const regels = getLocalData<InkoopRegel>('inkoop_regels')
  setLocalData('inkoop_regels', regels.filter((r) => r.inkoop_offerte_id !== id))
}
