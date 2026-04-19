import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates, getMaxNummer,
} from './supabaseHelpers'
import type {
  Klant,
  Offerte,
  OfferteItem,
  OfferteVersie,
  OfferteTemplate,
  CalculatieProduct,
  CalculatieTemplate,
  TekeningGoedkeuring,
} from '@/types'

// ============ OFFERTES ============

export async function getOffertes(limit = 5000): Promise<Offerte[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('offertes')
        .select('*, klanten(bedrijfsnaam)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data || []).map((o: Offerte & { klanten?: { bedrijfsnaam?: string } }) => ({
        ...o,
        klant_naam: o.klanten?.bedrijfsnaam || '',
      }))
    } catch (err) {
      console.warn('Supabase getOffertes failed, falling back to localStorage:', err)
    }
  }
  const offertes = getLocalData<Offerte>('offertes')
  const klanten = getLocalData<Klant>('klanten')
  return offertes.map((o) => ({
    ...o,
    klant_naam: klanten.find((k) => k.id === o.klant_id)?.bedrijfsnaam || '',
  }))
}

export async function getOfferte(id: string): Promise<Offerte | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offertes')
      .select('*, klanten(bedrijfsnaam)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? { ...data, klant_naam: data.klanten?.bedrijfsnaam || '' } : null
  }
  const offertes = getLocalData<Offerte>('offertes')
  const klanten = getLocalData<Klant>('klanten')
  const offerte = offertes.find((o) => o.id === id)
  if (!offerte) return null
  return { ...offerte, klant_naam: klanten.find((k) => k.id === offerte.klant_id)?.bedrijfsnaam || '' }
}

export async function getOffertesByProject(projectId: string): Promise<Offerte[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offertes')
      .select('*, klanten(bedrijfsnaam)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((o: Offerte & { klanten?: { bedrijfsnaam?: string } }) => ({
      ...o,
      klant_naam: o.klanten?.bedrijfsnaam || '',
    }))
  }
  const offertes = getLocalData<Offerte>('offertes')
  const klanten = getLocalData<Klant>('klanten')
  return offertes
    .filter((o) => o.project_id === projectId)
    .map((o) => ({
      ...o,
      klant_naam: klanten.find((k) => k.id === o.klant_id)?.bedrijfsnaam || '',
    }))
}

export async function getOffertesByKlant(klantId: string): Promise<Offerte[]> {
  assertId(klantId, 'klant_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offertes')
      .select('*')
      .eq('klant_id', klantId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const offertes = getLocalData<Offerte>('offertes')
  return offertes.filter((o) => o.klant_id === klantId)
}

// ── Klant offerte context (Feature 5: klant context bij selectie) ──
export async function getKlantOfferteContext(klantId: string): Promise<{ count: number; laatsteOfferte: string | null; totaal: number } | null> {
  if (!isSupabaseConfigured() || !supabase) {
    const offertes = getLocalData<Offerte>('offertes').filter((o) => o.klant_id === klantId)
    if (offertes.length === 0) return null
    const sorted = offertes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return { count: offertes.length, laatsteOfferte: sorted[0].created_at, totaal: offertes.reduce((s, o) => s + (o.totaal || 0), 0) }
  }
  const { data, error } = await supabase
    .from('offertes')
    .select('totaal, created_at')
    .eq('klant_id', klantId)
  if (error || !data || data.length === 0) return null
  const sorted = data.sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return { count: data.length, laatsteOfferte: sorted[0].created_at, totaal: data.reduce((s: number, o: { totaal: number }) => s + (o.totaal || 0), 0) }
}

// ── Materiaal suggesties (Feature 4: database autocomplete) ──
export async function getMateriaalSuggesties(query: string): Promise<Array<{ materiaal: string; laatst_gebruikt: string; project_naam: string }>> {
  if (!isSupabaseConfigured() || !supabase || !query || query.length < 2) return []
  const { data, error } = await supabase
    .from('offerte_items')
    .select('detail_regels, created_at, offertes!inner(titel, klant_naam)')
    .not('detail_regels', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error || !data) return []
  const seen = new Set<string>()
  const results: Array<{ materiaal: string; laatst_gebruikt: string; project_naam: string }> = []
  const lowerQuery = query.toLowerCase()
  for (const item of data) {
    if (!Array.isArray(item.detail_regels)) continue
    for (const regel of item.detail_regels as Array<{ label: string; waarde: string }>) {
      if (!regel.label || !regel.waarde) continue
      const isMateriaal = regel.label.toLowerCase() === 'materiaal'
      if (!isMateriaal) continue
      const val = regel.waarde.trim()
      if (!val || seen.has(val.toLowerCase())) continue
      if (!val.toLowerCase().includes(lowerQuery)) continue
      seen.add(val.toLowerCase())
      const offerteData = item.offertes as unknown as { titel?: string; klant_naam?: string }
      results.push({
        materiaal: val,
        laatst_gebruikt: item.created_at,
        project_naam: offerteData?.klant_naam || offerteData?.titel || '',
      })
      if (results.length >= 5) return results
    }
  }
  return results
}

export async function createOfferte(offerte: Omit<Offerte, 'id' | 'created_at' | 'updated_at'>): Promise<Offerte> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('offertes')
      .insert({ ...await withUserId(sanitizeDates(offerte)), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const offertes = getLocalData<Offerte>('offertes')
  const newOfferte: Offerte = {
    ...offerte,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as Offerte
  offertes.push(newOfferte)
  setLocalData('offertes', offertes)
  return newOfferte
}

export class OfferteConflictError extends Error {
  public serverData: Offerte
  constructor(message: string, serverData: Offerte) {
    super(message)
    this.name = 'OfferteConflictError'
    this.serverData = serverData
  }
}

export async function updateOfferte(id: string, updates: Partial<Offerte>, expectedUpdatedAt?: string): Promise<Offerte> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    // Optimistic locking: check of de offerte niet tussentijds is gewijzigd
    if (expectedUpdatedAt) {
      const { data: current, error: fetchErr } = await supabase
        .from('offertes')
        .select('updated_at')
        .eq('id', id)
        .maybeSingle()
      if (fetchErr) throw fetchErr
      if (!current) throw new Error('Offerte niet gevonden')

      const serverTime = new Date(current.updated_at).getTime()
      const expectedTime = new Date(expectedUpdatedAt).getTime()
      if (Math.abs(serverTime - expectedTime) > 2000) {
        const { data: fullCurrent } = await supabase
          .from('offertes')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        throw new OfferteConflictError(
          'Deze offerte is ondertussen door iemand anders gewijzigd. Herlaad de pagina om de laatste versie te zien.',
          fullCurrent
        )
      }
    }

    const { data, error } = await supabase
      .from('offertes')
      .update(sanitizeDates({ ...updates, updated_at: now() }))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const offertes = getLocalData<Offerte>('offertes')
  const index = offertes.findIndex((o) => o.id === id)
  if (index === -1) throw new Error('Offerte niet gevonden')
  offertes[index] = { ...offertes[index], ...updates, updated_at: now() }
  setLocalData('offertes', offertes)
  return offertes[index]
}

export async function deleteOfferte(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    // Verwijder child records (items, versies) eerst
    await Promise.all([
      supabase.from('offerte_items').delete().eq('offerte_id', id),
      supabase.from('offerte_versies').delete().eq('offerte_id', id),
    ])
    const { error } = await supabase.from('offertes').delete().eq('id', id)
    if (error) throw error
    return
  }
  const offertes = getLocalData<Offerte>('offertes')
  setLocalData('offertes', offertes.filter((o) => o.id !== id))
}

// ============ OFFERTE ITEMS ============

export async function getOfferteItems(offerteId: string): Promise<OfferteItem[]> {
  assertId(offerteId, 'offerte_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offerte_items')
      .select('*')
      .eq('offerte_id', offerteId)
      .order('volgorde')
    if (error) throw error
    return data || []
  }
  const items = getLocalData<OfferteItem>('offerte_items')
  return items
    .filter((i) => i.offerte_id === offerteId)
    .sort((a, b) => a.volgorde - b.volgorde)
}

export async function createOfferteItem(item: Omit<OfferteItem, 'id' | 'created_at'>): Promise<OfferteItem> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offerte_items')
      .insert(await withUserId(item))
      .select()
      .single()
    if (error) throw error
    return data
  }
  const items = getLocalData<OfferteItem>('offerte_items')
  const newItem: OfferteItem = {
    ...item,
    id: generateId(),
    created_at: now(),
  } as OfferteItem
  items.push(newItem)
  setLocalData('offerte_items', items)
  return newItem
}

export async function updateOfferteItem(id: string, updates: Partial<OfferteItem>): Promise<OfferteItem> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offerte_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const items = getLocalData<OfferteItem>('offerte_items')
  const index = items.findIndex((i) => i.id === id)
  if (index === -1) throw new Error('Offerte item niet gevonden')
  items[index] = { ...items[index], ...updates }
  setLocalData('offerte_items', items)
  return items[index]
}

export async function deleteOfferteItem(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('offerte_items').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<OfferteItem>('offerte_items')
  setLocalData('offerte_items', items.filter((i) => i.id !== id))
}

export async function syncOfferteItems(
  offerteId: string,
  items: Omit<OfferteItem, 'id' | 'created_at'>[],
  userId: string
): Promise<OfferteItem[]> {
  assertId(offerteId, 'offerte_id')

  if (isSupabaseConfigured() && supabase) {
    // 1. Haal huidige item-ids op
    const { data: existing, error: fetchErr } = await supabase
      .from('offerte_items')
      .select('id')
      .eq('offerte_id', offerteId)
    if (fetchErr) throw fetchErr

    const existingIds = new Set((existing || []).map(e => e.id))

    // 2. Batch delete alle bestaande items voor deze offerte
    if (existingIds.size > 0) {
      const { error: delErr } = await supabase
        .from('offerte_items')
        .delete()
        .eq('offerte_id', offerteId)
      if (delErr) throw delErr
    }

    // 3. Batch insert alle items in één call
    const insertData = items.map((item, index) => ({
      user_id: userId,
      offerte_id: offerteId,
      beschrijving: item.beschrijving,
      aantal: item.aantal,
      eenheidsprijs: item.eenheidsprijs,
      btw_percentage: item.btw_percentage,
      korting_percentage: item.korting_percentage,
      totaal: item.totaal,
      volgorde: index + 1,
      soort: item.soort,
      extra_velden: item.extra_velden,
      detail_regels: item.detail_regels,
      calculatie_regels: item.calculatie_regels,
      heeft_calculatie: item.heeft_calculatie,
      prijs_varianten: item.prijs_varianten,
      actieve_variant_id: item.actieve_variant_id,
      breedte_mm: item.breedte_mm,
      hoogte_mm: item.hoogte_mm,
      oppervlakte_m2: item.oppervlakte_m2,
      afmeting_vrij: item.afmeting_vrij,
      foto_url: item.foto_url,
      foto_op_offerte: item.foto_op_offerte,
      is_optioneel: item.is_optioneel,
      interne_notitie: item.interne_notitie,
      bijlage_url: item.bijlage_url,
      bijlage_type: item.bijlage_type,
      bijlage_naam: item.bijlage_naam,
    }))

    const { data: result, error: insertErr } = await supabase
      .from('offerte_items')
      .insert(insertData)
      .select()
    if (insertErr) throw insertErr
    return result || []
  }

  // localStorage fallback
  const allItems = getLocalData<OfferteItem>('offerte_items')
  const otherItems = allItems.filter(i => i.offerte_id !== offerteId)
  const newItems: OfferteItem[] = items.map((item, index) => ({
    ...item,
    id: (item as any).id || generateId(),
    offerte_id: offerteId,
    user_id: userId,
    volgorde: index + 1,
    created_at: now(),
  } as OfferteItem))
  setLocalData('offerte_items', [...otherItems, ...newItems])
  return newItems
}

export async function getRecentOfferteItemSuggesties(): Promise<{ beschrijving: string; laatstePrijs: number }[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offerte_items')
      .select('beschrijving, eenheidsprijs, created_at')
      .neq('beschrijving', '')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error

    const map = new Map<string, { beschrijving: string; laatstePrijs: number }>()
    for (const item of data || []) {
      const key = item.beschrijving.trim().toLowerCase()
      if (!map.has(key)) {
        map.set(key, { beschrijving: item.beschrijving.trim(), laatstePrijs: item.eenheidsprijs })
      }
    }
    return Array.from(map.values())
  }

  // localStorage fallback
  const items = getLocalData<OfferteItem>('offerte_items')
  const map = new Map<string, { beschrijving: string; laatstePrijs: number }>()
  for (const item of items.slice(-200)) {
    if (item.beschrijving?.trim()) {
      const key = item.beschrijving.trim().toLowerCase()
      if (!map.has(key)) map.set(key, { beschrijving: item.beschrijving.trim(), laatstePrijs: item.eenheidsprijs })
    }
  }
  return Array.from(map.values())
}

export async function getNextOfferteNummer(prefix: string = 'OFF', startNummer = 1): Promise<string> {
  const year = new Date().getFullYear()
  const jaarPrefix = `${prefix}-${year}-`

  // startNummer als floor: bij overstap vanuit een ander systeem kan de
  // gebruiker doorlopen vanaf een specifiek nummer.
  const applyFloor = (max: number): number => Math.max(max, Math.max(0, startNummer - 1)) + 1

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offertes')
      .select('nummer')
      .like('nummer', `${jaarPrefix}%`)
      .order('nummer', { ascending: false })
      .limit(1)
    if (error) throw error

    const maxNr = data?.[0]
      ? parseInt(data[0].nummer.replace(jaarPrefix, ''), 10) || 0
      : 0
    return `${jaarPrefix}${String(applyFloor(maxNr)).padStart(3, '0')}`
  }

  // localStorage fallback
  const offertes = getLocalData<Offerte>('offertes')
  const maxNr = offertes
    .filter(o => o.nummer?.startsWith(jaarPrefix))
    .reduce((max, o) => Math.max(max, parseInt(o.nummer.replace(jaarPrefix, ''), 10) || 0), 0)
  return `${jaarPrefix}${String(applyFloor(maxNr)).padStart(3, '0')}`
}

// ============ OFFERTE VERSIES ============

export async function getOfferteVersies(offerteId: string): Promise<OfferteVersie[]> {
  assertId(offerteId)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offerte_versies')
      .select('*')
      .eq('offerte_id', offerteId)
      .order('versie_nummer', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<OfferteVersie>('offerte_versies').filter(v => v.offerte_id === offerteId).sort((a, b) => b.versie_nummer - a.versie_nummer)
}

export async function createOfferteVersie(versie: Omit<OfferteVersie, 'id' | 'created_at'>): Promise<OfferteVersie> {
  const record: OfferteVersie = {
    ...versie,
    id: generateId(),
    created_at: now(),
  }
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('offerte_versies').insert(await withUserId(record)).select().single()
    if (error) throw error
    return data
  }
  const versies = getLocalData<OfferteVersie>('offerte_versies')
  versies.push(record)
  setLocalData('offerte_versies', versies)
  return record
}

// ============ CALCULATIE PRODUCTEN ============

export async function getCalculatieProducten(): Promise<CalculatieProduct[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('calculatie_producten')
      .select('*')
      .order('categorie')
    if (error) throw error
    return data || []
  }
  return getLocalData<CalculatieProduct>('calculatie_producten')
}

export async function createCalculatieProduct(product: Omit<CalculatieProduct, 'id' | 'created_at' | 'updated_at'>): Promise<CalculatieProduct> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('calculatie_producten')
      .insert({ ...await withUserId(product), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const producten = getLocalData<CalculatieProduct>('calculatie_producten')
  const newProduct: CalculatieProduct = {
    ...product,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as CalculatieProduct
  producten.push(newProduct)
  setLocalData('calculatie_producten', producten)
  return newProduct
}

export async function updateCalculatieProduct(id: string, updates: Partial<CalculatieProduct>): Promise<CalculatieProduct> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('calculatie_producten')
      .update({ ...updates, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const producten = getLocalData<CalculatieProduct>('calculatie_producten')
  const index = producten.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Calculatie product niet gevonden')
  producten[index] = { ...producten[index], ...updates, updated_at: now() }
  setLocalData('calculatie_producten', producten)
  return producten[index]
}

export async function deleteCalculatieProduct(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('calculatie_producten').delete().eq('id', id)
    if (error) throw error
    return
  }
  const producten = getLocalData<CalculatieProduct>('calculatie_producten')
  setLocalData('calculatie_producten', producten.filter((p) => p.id !== id))
}

// ============ CALCULATIE TEMPLATES ============

export async function getCalculatieTemplates(): Promise<CalculatieTemplate[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('calculatie_templates')
      .select('*')
      .order('naam')
    if (error) throw error
    return data || []
  }
  return getLocalData<CalculatieTemplate>('calculatie_templates')
}

export async function createCalculatieTemplate(template: Omit<CalculatieTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<CalculatieTemplate> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('calculatie_templates')
      .insert({ ...await withUserId(template), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const templates = getLocalData<CalculatieTemplate>('calculatie_templates')
  const newTemplate: CalculatieTemplate = {
    ...template,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as CalculatieTemplate
  templates.push(newTemplate)
  setLocalData('calculatie_templates', templates)
  return newTemplate
}

export async function updateCalculatieTemplate(id: string, updates: Partial<CalculatieTemplate>): Promise<CalculatieTemplate> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('calculatie_templates')
      .update({ ...updates, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const templates = getLocalData<CalculatieTemplate>('calculatie_templates')
  const index = templates.findIndex((t) => t.id === id)
  if (index === -1) throw new Error('Calculatie template niet gevonden')
  templates[index] = { ...templates[index], ...updates, updated_at: now() }
  setLocalData('calculatie_templates', templates)
  return templates[index]
}

export async function deleteCalculatieTemplate(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('calculatie_templates').delete().eq('id', id)
    if (error) throw error
    return
  }
  const templates = getLocalData<CalculatieTemplate>('calculatie_templates')
  setLocalData('calculatie_templates', templates.filter((t) => t.id !== id))
}

// ============ OFFERTE TEMPLATES ============

const DEFAULT_OFFERTE_TEMPLATES: Omit<OfferteTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    naam: 'Autobelettering',
    beschrijving: 'Standaard offerte voor autobelettering inclusief ontwerp en montage',
    actief: true,
    regels: [
      { soort: 'prijs', beschrijving: 'Autobelettering ontwerp en productie', extra_velden: { 'Materiaal': 'Gegoten polymeer folie', 'Lay-out': 'Ontwerp volgens huisstijl', 'Montage': 'Professionele montage op locatie', 'Opmerking': '' }, aantal: 1, eenheidsprijs: 0, btw_percentage: 21, korting_percentage: 0 },
      { soort: 'tekst', beschrijving: 'Voertuiggegevens', extra_velden: { 'Materiaal': '', 'Lay-out': '', 'Montage': '', 'Opmerking': 'Merk/type en kenteken invullen' }, aantal: 0, eenheidsprijs: 0, btw_percentage: 0, korting_percentage: 0 },
    ],
  },
  {
    naam: 'Gevelreclame',
    beschrijving: 'Standaard offerte voor gevelreclame / signing aan pand',
    actief: true,
    regels: [
      { soort: 'prijs', beschrijving: 'Gevelreclame letters/logo', extra_velden: { 'Materiaal': 'Aluminium / Dibond', 'Lay-out': 'Ontwerp volgens huisstijl', 'Montage': 'Montage op gevel incl. hoogwerker', 'Opmerking': '' }, aantal: 1, eenheidsprijs: 0, btw_percentage: 21, korting_percentage: 0 },
      { soort: 'tekst', beschrijving: 'Locatiegegevens', extra_velden: { 'Materiaal': '', 'Lay-out': '', 'Montage': '', 'Opmerking': 'Adres en contactpersoon locatie' }, aantal: 0, eenheidsprijs: 0, btw_percentage: 0, korting_percentage: 0 },
    ],
  },
  {
    naam: 'DTP werkzaamheden',
    beschrijving: 'Offerte voor grafisch ontwerp en DTP werk',
    actief: true,
    regels: [
      { soort: 'prijs', beschrijving: 'Ontwerp / DTP werkzaamheden', extra_velden: { 'Materiaal': 'N.v.t.', 'Lay-out': 'Aanlevering als drukklaar PDF', 'Montage': 'N.v.t.', 'Opmerking': '' }, aantal: 1, eenheidsprijs: 0, btw_percentage: 21, korting_percentage: 0 },
      { soort: 'prijs', beschrijving: 'Correctieronde', extra_velden: { 'Materiaal': '', 'Lay-out': '1 correctieronde inbegrepen', 'Montage': '', 'Opmerking': 'Extra correcties op nacalculatie' }, aantal: 1, eenheidsprijs: 0, btw_percentage: 21, korting_percentage: 0 },
    ],
  },
  {
    naam: 'Website',
    beschrijving: 'Offerte voor website ontwerp en ontwikkeling',
    actief: true,
    regels: [
      { soort: 'prijs', beschrijving: 'Website ontwerp en ontwikkeling', extra_velden: { 'Materiaal': 'WordPress / maatwerk', 'Lay-out': 'Responsive design', 'Montage': 'Hosting eerste jaar inbegrepen', 'Opmerking': '' }, aantal: 1, eenheidsprijs: 0, btw_percentage: 21, korting_percentage: 0 },
      { soort: 'prijs', beschrijving: 'Content invoer', extra_velden: { 'Materiaal': '', 'Lay-out': '', 'Montage': '', 'Opmerking': 'Teksten en afbeeldingen door klant aangeleverd' }, aantal: 1, eenheidsprijs: 0, btw_percentage: 21, korting_percentage: 0 },
      { soort: 'tekst', beschrijving: 'Inclusief', extra_velden: { 'Materiaal': '', 'Lay-out': '', 'Montage': '', 'Opmerking': 'SSL certificaat, SEO basisoptimalisatie, contactformulier' }, aantal: 0, eenheidsprijs: 0, btw_percentage: 0, korting_percentage: 0 },
    ],
  },
  {
    naam: 'Interieur signing',
    beschrijving: 'Bewegwijzering en interieur signing voor kantoor/bedrijfspand',
    actief: true,
    regels: [
      { soort: 'prijs', beschrijving: 'Interieur signing pakket', extra_velden: { 'Materiaal': 'Acrylaat / vinyl', 'Lay-out': 'Ontwerp volgens huisstijl', 'Montage': 'Professionele montage op locatie', 'Opmerking': '' }, aantal: 1, eenheidsprijs: 0, btw_percentage: 21, korting_percentage: 0 },
      { soort: 'tekst', beschrijving: 'Opname ter plaatse', extra_velden: { 'Materiaal': '', 'Lay-out': '', 'Montage': '', 'Opmerking': 'Inmeting en opname op locatie' }, aantal: 0, eenheidsprijs: 0, btw_percentage: 0, korting_percentage: 0 },
    ],
  },
]

export async function getOfferteTemplates(): Promise<OfferteTemplate[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offerte_templates')
      .select('*')
      .order('naam')
    if (error) throw error
    return data || []
  }
  const templates = getLocalData<OfferteTemplate>('offerte_templates')
  // Als er nog geen templates zijn, vul de standaard templates in
  if (templates.length === 0) {
    const defaults: OfferteTemplate[] = DEFAULT_OFFERTE_TEMPLATES.map((t) => ({
      ...t,
      id: generateId(),
      user_id: '',
      created_at: now(),
      updated_at: now(),
    }))
    setLocalData('offerte_templates', defaults)
    return defaults
  }
  return templates
}

export async function createOfferteTemplate(template: Omit<OfferteTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<OfferteTemplate> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('offerte_templates')
      .insert({ ...await withUserId(template), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const templates = getLocalData<OfferteTemplate>('offerte_templates')
  const newTemplate: OfferteTemplate = {
    ...template,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as OfferteTemplate
  templates.push(newTemplate)
  setLocalData('offerte_templates', templates)
  return newTemplate
}

export async function updateOfferteTemplate(id: string, updates: Partial<OfferteTemplate>): Promise<OfferteTemplate> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offerte_templates')
      .update({ ...updates, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const templates = getLocalData<OfferteTemplate>('offerte_templates')
  const index = templates.findIndex((t) => t.id === id)
  if (index === -1) throw new Error('Offerte template niet gevonden')
  templates[index] = { ...templates[index], ...updates, updated_at: now() }
  setLocalData('offerte_templates', templates)
  return templates[index]
}

export async function deleteOfferteTemplate(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('offerte_templates').delete().eq('id', id)
    if (error) throw error
    return
  }
  const templates = getLocalData<OfferteTemplate>('offerte_templates')
  setLocalData('offerte_templates', templates.filter((t) => t.id !== id))
}

// ============ TEKENING GOEDKEURINGEN ============

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function getTekeningGoedkeuringen(projectId: string): Promise<TekeningGoedkeuring[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('tekening_goedkeuringen')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const items = getLocalData<TekeningGoedkeuring>('tekening_goedkeuringen')
  return items.filter((g) => g.project_id === projectId).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getTekeningGoedkeuringByToken(token: string): Promise<TekeningGoedkeuring | null> {
  assertId(token, 'token')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('tekening_goedkeuringen')
      .select('*')
      .eq('token', token)
      .maybeSingle()
    if (error) return null
    return data
  }
  const items = getLocalData<TekeningGoedkeuring>('tekening_goedkeuringen')
  return items.find((g) => g.token === token) || null
}

export async function createTekeningGoedkeuring(
  goedkeuring: Omit<TekeningGoedkeuring, 'id' | 'token' | 'created_at' | 'updated_at'>
): Promise<TekeningGoedkeuring> {
  const token = generateToken()
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('tekening_goedkeuringen')
      .insert({ ...await withUserId({ ...goedkeuring, token }), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const items = getLocalData<TekeningGoedkeuring>('tekening_goedkeuringen')
  const newItem: TekeningGoedkeuring = {
    ...goedkeuring,
    id: generateId(),
    token,
    created_at: now(),
    updated_at: now(),
  } as TekeningGoedkeuring
  items.push(newItem)
  setLocalData('tekening_goedkeuringen', items)
  return newItem
}

export async function updateTekeningGoedkeuring(
  id: string,
  updates: Partial<TekeningGoedkeuring>
): Promise<TekeningGoedkeuring> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('tekening_goedkeuringen')
      .update({ ...updates, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const items = getLocalData<TekeningGoedkeuring>('tekening_goedkeuringen')
  const index = items.findIndex((g) => g.id === id)
  if (index === -1) throw new Error('Tekening goedkeuring niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('tekening_goedkeuringen', items)
  return items[index]
}

export async function updateTekeningGoedkeuringByToken(
  token: string,
  updates: Partial<TekeningGoedkeuring>
): Promise<TekeningGoedkeuring> {
  assertId(token, 'token')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('tekening_goedkeuringen')
      .update({ ...updates, updated_at: now() })
      .eq('token', token)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Tekening goedkeuring niet gevonden')
    return data
  }
  const items = getLocalData<TekeningGoedkeuring>('tekening_goedkeuringen')
  const index = items.findIndex((g) => g.token === token)
  if (index === -1) throw new Error('Tekening goedkeuring niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('tekening_goedkeuringen', items)
  return items[index]
}

// ============ NUMMER GENERATIE ============

export async function generateOfferteNummer(prefix: string = 'OFF', startNummer = 1): Promise<string> {
  const jaar = new Date().getFullYear()
  const jaarPrefix = `${prefix}-${jaar}-`
  let maxNr = await getMaxNummer('offertes', 'nummer', jaarPrefix)
  if (maxNr === 0) {
    // Fallback voor localStorage
    const offertes = isSupabaseConfigured() ? [] : getLocalData<Offerte>('offertes')
    maxNr = offertes
      .filter((o) => o.nummer.startsWith(jaarPrefix))
      .reduce((max, o) => Math.max(max, parseInt(o.nummer.replace(jaarPrefix, ''), 10) || 0), 0)
  }
  // startNummer fungeert als floor: handig bij overstap vanuit een ander
  // systeem zodat de nummering doorloopt vanaf een specifiek beginpunt.
  const nextNr = Math.max(maxNr, Math.max(0, startNummer - 1)) + 1
  return `${jaarPrefix}${String(nextNr).padStart(3, '0')}`
}
