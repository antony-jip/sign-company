import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates, round2, getMaxNummer,
} from './supabaseHelpers'
import type { Factuur, FactuurItem, HerinneringTemplate } from '@/types'

// ============ FACTUREN CRUD ============

export async function getFacturen(limit = 5000): Promise<Factuur[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').select('*').order('factuurdatum', { ascending: false }).limit(limit)
    if (error) throw error
    return data || []
  }
  return getLocalData<Factuur>('facturen')
}

export async function getFactuur(id: string): Promise<Factuur | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  }
  const items = getLocalData<Factuur>('facturen')
  return items.find((f) => f.id === id) || null
}

export async function createFactuur(factuur: Omit<Factuur, 'id' | 'created_at' | 'updated_at'>): Promise<Factuur> {
  const newFactuur: Factuur = { ...sanitizeDates(factuur), id: generateId(), created_at: now(), updated_at: now() } as Factuur
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('facturen').insert({ ...await withUserId(newFactuur), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Factuur>('facturen')
  items.push(newFactuur)
  setLocalData('facturen', items)
  return newFactuur
}

export async function updateFactuur(id: string, updates: Partial<Factuur>): Promise<Factuur> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').update(sanitizeDates({ ...updates, updated_at: now() })).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Factuur>('facturen')
  const index = items.findIndex((f) => f.id === id)
  if (index === -1) throw new Error('Factuur niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('facturen', items)
  return items[index]
}

export async function deleteFactuur(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    // Verwijder factuur_items eerst
    await supabase.from('factuur_items').delete().eq('factuur_id', id)
    const { error } = await supabase.from('facturen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Factuur>('facturen')
  setLocalData('facturen', items.filter((f) => f.id !== id))
}

export async function getFactuurItems(factuurId: string): Promise<FactuurItem[]> {
  assertId(factuurId, 'factuur_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('factuur_items').select('*').eq('factuur_id', factuurId).order('volgorde')
    if (error) throw error
    return data || []
  }
  return getLocalData<FactuurItem>('factuur_items').filter((i) => i.factuur_id === factuurId)
}

export async function createFactuurItem(item: Omit<FactuurItem, 'id' | 'created_at'>): Promise<FactuurItem> {
  const newItem: FactuurItem = { ...item, id: generateId(), created_at: now() } as FactuurItem
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('factuur_items').insert(await withUserId(newItem)).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<FactuurItem>('factuur_items')
  items.push(newItem)
  setLocalData('factuur_items', items)
  return newItem
}

// ============ FACTUUR STATUS ============

export async function updateFactuurStatus(
  id: string,
  updates: Partial<Factuur>
): Promise<Partial<Factuur>> {
  assertId(id, 'factuur_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('facturen')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  return { id, ...updates }
}

// ============ RELATIONELE QUERIES ============

export async function getFacturenByKlant(klantId: string): Promise<Factuur[]> {
  assertId(klantId, 'klant_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').select('*').eq('klant_id', klantId).order('factuurdatum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Factuur>('facturen').filter((f) => f.klant_id === klantId)
}

export async function getFacturenByProject(projectId: string): Promise<Factuur[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').select('*').eq('project_id', projectId).order('factuurdatum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Factuur>('facturen').filter((f) => f.project_id === projectId)
}

export async function getVerlopenFacturen(): Promise<Factuur[]> {
  const facturen = await getFacturen()
  const vandaag = new Date().toISOString().split('T')[0]
  return facturen.filter((f) => f.vervaldatum < vandaag && f.status !== 'betaald' && f.status !== 'gecrediteerd' && (f.factuur_type || 'standaard') !== 'creditnota')
}

// ============ HERINNERING TEMPLATES ============

export async function getHerinneringTemplates(): Promise<HerinneringTemplate[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('herinnering_templates').select('*').order('dagen_na_vervaldatum')
    if (error) throw error
    return data || []
  }
  const items = getLocalData<HerinneringTemplate>('herinnering_templates')
  if (items.length === 0) {
    const defaults = getDefaultHerinneringTemplates('')
    setLocalData('herinnering_templates', defaults)
    return defaults
  }
  return items
}

export function getDefaultHerinneringTemplates(userId: string): HerinneringTemplate[] {
  return [
    {
      id: generateId(), user_id: userId,
      type: 'herinnering_1', onderwerp: 'Herinnering: factuur {factuur_nummer} is verlopen',
      inhoud: 'Beste {klant_naam},\n\nGraag herinneren wij u aan factuur {factuur_nummer} ter waarde van {factuur_bedrag}, die op {vervaldatum} betaald had moeten worden. De factuur staat nu {dagen_verlopen} dagen open.\n\nWij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk te voldoen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
      dagen_na_vervaldatum: 7, actief: true, created_at: now(),
    },
    {
      id: generateId(), user_id: userId,
      type: 'herinnering_2', onderwerp: 'Tweede herinnering: factuur {factuur_nummer}',
      inhoud: 'Beste {klant_naam},\n\nOndanks onze eerdere herinnering hebben wij nog geen betaling ontvangen voor factuur {factuur_nummer} ter waarde van {factuur_bedrag}. De vervaldatum was {vervaldatum}, inmiddels {dagen_verlopen} dagen geleden.\n\nWij verzoeken u dringend het bedrag binnen 7 dagen te voldoen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
      dagen_na_vervaldatum: 14, actief: true, created_at: now(),
    },
    {
      id: generateId(), user_id: userId,
      type: 'herinnering_3', onderwerp: 'Laatste herinnering: factuur {factuur_nummer}',
      inhoud: 'Beste {klant_naam},\n\nDit is onze laatste herinnering voor factuur {factuur_nummer} ter waarde van {factuur_bedrag}. De factuur is inmiddels {dagen_verlopen} dagen verlopen.\n\nIndien wij binnen 7 dagen geen betaling ontvangen, zijn wij genoodzaakt verdere stappen te ondernemen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
      dagen_na_vervaldatum: 21, actief: true, created_at: now(),
    },
    {
      id: generateId(), user_id: userId,
      type: 'aanmaning', onderwerp: 'Aanmaning: factuur {factuur_nummer}',
      inhoud: 'Beste {klant_naam},\n\nOndanks herhaalde herinneringen hebben wij nog geen betaling ontvangen voor factuur {factuur_nummer} ter waarde van {factuur_bedrag}. De factuur is {dagen_verlopen} dagen verlopen.\n\nDit is een formele aanmaning. Wij verzoeken u het openstaande bedrag per omgaande te voldoen. Bij uitblijven van betaling behouden wij ons het recht voor om wettelijke rente en incassokosten in rekening te brengen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
      dagen_na_vervaldatum: 30, actief: true, created_at: now(),
    },
  ]
}

export async function createHerinneringTemplate(template: Omit<HerinneringTemplate, 'id' | 'created_at'>): Promise<HerinneringTemplate> {
  const newTemplate: HerinneringTemplate = { ...template, id: generateId(), created_at: now() } as HerinneringTemplate
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('herinnering_templates').insert({ ...await withUserId(newTemplate), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<HerinneringTemplate>('herinnering_templates')
  items.push(newTemplate)
  setLocalData('herinnering_templates', items)
  return newTemplate
}

export async function updateHerinneringTemplate(id: string, updates: Partial<HerinneringTemplate>): Promise<HerinneringTemplate> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('herinnering_templates').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<HerinneringTemplate>('herinnering_templates')
  const index = items.findIndex((t) => t.id === id)
  if (index === -1) throw new Error('Herinnering template niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('herinnering_templates', items)
  return items[index]
}

export async function deleteHerinneringTemplate(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('herinnering_templates').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<HerinneringTemplate>('herinnering_templates')
  setLocalData('herinnering_templates', items.filter((t) => t.id !== id))
}

// ============ NUMMER GENERATIE ============

export async function generateFactuurNummer(prefix: string = 'FAC', startNummer = 1): Promise<string> {
  const jaar = new Date().getFullYear()
  const jaarPrefix = `${prefix}-${jaar}-`
  let maxNr = await getMaxNummer('facturen', 'nummer', jaarPrefix)
  if (maxNr === 0) {
    const facturen = isSupabaseConfigured() ? [] : getLocalData<Factuur>('facturen')
    maxNr = facturen
      .filter((f) => f.nummer.startsWith(jaarPrefix))
      .reduce((max, f) => Math.max(max, parseInt(f.nummer.replace(jaarPrefix, ''), 10) || 0), 0)
  }
  // startNummer fungeert als floor: handig bij overstap vanuit een ander
  // systeem zodat de nummering doorloopt vanaf een specifiek beginpunt.
  const nextNr = Math.max(maxNr, Math.max(0, startNummer - 1)) + 1
  return `${jaarPrefix}${String(nextNr).padStart(3, '0')}`
}

export async function generateCreditnotaNummer(): Promise<string> {
  const jaar = new Date().getFullYear()
  const prefix = `CN-${jaar}-`
  let maxNr = await getMaxNummer('facturen', 'nummer', prefix)
  if (maxNr === 0) {
    const facturen = isSupabaseConfigured() ? [] : getLocalData<Factuur>('facturen')
    maxNr = facturen
      .filter((f) => f.nummer.startsWith(prefix))
      .reduce((max, f) => Math.max(max, parseInt(f.nummer.replace(prefix, ''), 10) || 0), 0)
  }
  return `${prefix}${String(maxNr + 1).padStart(3, '0')}`
}

// ============ CONVERSIES (creditnota + voorschot) ============

export async function createCreditnota(
  factuurId: string,
  userId: string,
  reden: string
): Promise<Factuur> {
  assertId(factuurId, 'factuur_id')
  const origineel = await getFactuur(factuurId)
  if (!origineel) throw new Error('Factuur niet gevonden')
  const nummer = await generateCreditnotaNummer()
  const creditnota = await createFactuur({
    user_id: userId,
    klant_id: origineel.klant_id,
    klant_naam: origineel.klant_naam,
    project_id: origineel.project_id,
    nummer,
    titel: `Creditnota voor ${origineel.nummer}`,
    status: 'concept',
    subtotaal: round2(-origineel.subtotaal),
    btw_bedrag: round2(-origineel.btw_bedrag),
    totaal: round2(-origineel.totaal),
    betaald_bedrag: 0,
    factuurdatum: new Date().toISOString().split('T')[0],
    vervaldatum: new Date().toISOString().split('T')[0],
    notities: reden,
    voorwaarden: origineel.voorwaarden || '',
    factuur_type: 'creditnota',
    gerelateerde_factuur_id: factuurId,
    credit_reden: reden,
    contactpersoon_id: origineel.contactpersoon_id,
  } as Omit<Factuur, 'id' | 'created_at' | 'updated_at'>)
  // Kopieer items als negatieve bedragen
  const items = await getFactuurItems(factuurId)
  for (const item of items) {
    await createFactuurItem({
      user_id: userId,
      factuur_id: creditnota.id,
      beschrijving: item.beschrijving,
      aantal: -item.aantal,
      eenheidsprijs: round2(item.eenheidsprijs),
      btw_percentage: item.btw_percentage,
      korting_percentage: item.korting_percentage,
      totaal: round2(-item.totaal),
      volgorde: item.volgorde,
    } as Omit<FactuurItem, 'id' | 'created_at'>)
  }
  // Update originele factuur
  await updateFactuur(factuurId, { status: 'gecrediteerd' })
  return creditnota
}

export async function createVoorschotfactuur(
  factuurId: string,
  userId: string,
  percentage: number,
  factuurPrefix: string = 'FAC'
): Promise<Factuur> {
  assertId(factuurId, 'factuur_id')
  const origineel = await getFactuur(factuurId)
  if (!origineel) throw new Error('Factuur niet gevonden')
  const nummer = await generateFactuurNummer(factuurPrefix)
  const voorschotSubtotaal = round2(origineel.subtotaal * (percentage / 100))
  const voorschotBtw = round2(origineel.btw_bedrag * (percentage / 100))
  const voorschotTotaal = round2(voorschotSubtotaal + voorschotBtw)
  const voorschot = await createFactuur({
    user_id: userId,
    klant_id: origineel.klant_id,
    klant_naam: origineel.klant_naam,
    project_id: origineel.project_id,
    nummer,
    titel: `Voorschotfactuur ${percentage}% - ${origineel.titel}`,
    status: 'concept',
    subtotaal: voorschotSubtotaal,
    btw_bedrag: voorschotBtw,
    totaal: voorschotTotaal,
    betaald_bedrag: 0,
    factuurdatum: new Date().toISOString().split('T')[0],
    vervaldatum: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    notities: `Voorschot van ${percentage}% op ${origineel.nummer}`,
    voorwaarden: origineel.voorwaarden || '',
    factuur_type: 'voorschot',
    gerelateerde_factuur_id: factuurId,
    voorschot_percentage: percentage,
    contactpersoon_id: origineel.contactpersoon_id,
  } as Omit<Factuur, 'id' | 'created_at' | 'updated_at'>)
  return voorschot
}
