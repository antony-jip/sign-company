import supabase, { isSupabaseConfigured } from './supabaseClient'
import {
  assertId, getLocalData, setLocalData, generateId, now,
  getOrgId,
} from './supabaseHelpers'
import type { Klant, Contactpersoon, ContactpersoonRecord, KlantHistorie, ImportLog, Project } from '@/types'

// ============ KLANT HELPERS ============

function safeParseJsonArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val.trim().startsWith('[')) {
    try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed } catch (err) { /* ignore */ }
  }
  return []
}

function normalizeKlant(raw: unknown): Klant {
  const klant = raw as Record<string, unknown>;
  return {
    ...klant,
    bedrijfsnaam: (klant.bedrijfsnaam as string) || '',
    contactpersoon: (klant.contactpersoon as string) || '',
    email: (klant.email as string) || '',
    telefoon: (klant.telefoon as string) || '',
    adres: (klant.adres as string) || '',
    postcode: (klant.postcode as string) || '',
    stad: (klant.stad as string) || '',
    land: (klant.land as string) || '',
    website: (klant.website as string) || '',
    kvk_nummer: (klant.kvk_nummer as string) || '',
    btw_nummer: (klant.btw_nummer as string) || '',
    status: (klant.status as string) || 'actief',
    tags: safeParseJsonArray(klant.tags) as string[],
    notities: (klant.notities as string) || '',
    contactpersonen: safeParseJsonArray(klant.contactpersonen) as Contactpersoon[],
    vestigingen: safeParseJsonArray(klant.vestigingen) as Klant['vestigingen'],
  } as Klant
}

// ============ KLANTEN ============

export async function getAllKlantLabels(userId: string): Promise<string[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('klanten')
      .select('labels')
      .eq('user_id', userId)
    if (data) {
      const allLabels = new Set<string>()
      for (const row of data) {
        if (Array.isArray(row.labels)) {
          for (const l of row.labels) allLabels.add(l)
        }
      }
      return [...allLabels].sort()
    }
  }
  return []
}

export async function getKlanten(limit = 50000): Promise<Klant[]> {
  if (isSupabaseConfigured() && supabase) {
    // Supabase returns max 1000 rows per request — paginate to get all
    const pageSize = 1000
    const allData: Klant[] = []
    let offset = 0

    while (offset < limit) {
      const { data, error } = await supabase
        .from('klanten')
        .select('*')
        .order('bedrijfsnaam')
        .range(offset, offset + pageSize - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      allData.push(...data.map(normalizeKlant))
      if (data.length < pageSize) break
      offset += pageSize
    }

    return allData
  }
  return getLocalData<Klant>('klanten').map(normalizeKlant)
}

export async function getKlant(id: string): Promise<Klant | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('klanten')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? normalizeKlant(data) : null
  }
  const klanten = getLocalData<Klant>('klanten')
  const found = klanten.find((k) => k.id === id)
  return found ? normalizeKlant(found) : null
}

export async function createKlant(klant: Omit<Klant, 'id' | 'created_at' | 'updated_at'>): Promise<Klant> {
  if (isSupabaseConfigured() && supabase) {
    let user_id = klant.user_id
    if (!user_id) {
      const { data: { user } } = await supabase.auth.getUser()
      user_id = user?.id || ''
    }
    const orgId = (klant as Record<string, unknown>).organisatie_id as string || await getOrgId()
    const klantInsert = { ...klant, user_id, organisatie_id: orgId }
    if (!Array.isArray(klantInsert.tags)) klantInsert.tags = []
    if (!Array.isArray(klantInsert.klant_labels)) klantInsert.klant_labels = []
    const { data, error } = await supabase
      .from('klanten')
      .insert(klantInsert)
      .select()
      .single()
    if (error) throw error
    return normalizeKlant(data)
  }
  const klanten = getLocalData<Klant>('klanten')
  const newKlant: Klant = {
    ...klant,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as Klant
  klanten.push(newKlant)
  setLocalData('klanten', klanten)
  return newKlant
}

export async function updateKlant(id: string, updates: Partial<Klant>): Promise<Klant> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('klanten')
      .update({ ...updates, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return normalizeKlant(data)
  }
  const klanten = getLocalData<Klant>('klanten')
  const index = klanten.findIndex((k) => k.id === id)
  if (index === -1) throw new Error('Klant niet gevonden')
  klanten[index] = { ...klanten[index], ...updates, updated_at: now() }
  setLocalData('klanten', klanten)
  return klanten[index]
}

export async function deleteKlant(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { count } = await supabase
      .from('projecten')
      .select('id', { count: 'exact', head: true })
      .eq('klant_id', id)
    if (count && count > 0) {
      throw new Error(`Klant heeft nog ${count} project(en). Verwijder of ontkoppel deze eerst.`)
    }
    const { error } = await supabase.from('klanten').delete().eq('id', id)
    if (error) throw error
    return
  }
  const klanten = getLocalData<Klant>('klanten')
  const projecten = getLocalData<Project>('projecten')
  if (projecten.some((p) => p.klant_id === id)) {
    throw new Error('Klant heeft nog gekoppelde projecten.')
  }
  setLocalData('klanten', klanten.filter((k) => k.id !== id))
}

// ============ CONTACTPERSONEN (DB) ============

export async function getContactpersonenDB(organisatieId: string): Promise<ContactpersoonRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('contactpersonen')
    .select('*')
    .eq('organisatie_id', organisatieId)
    .order('achternaam', { ascending: true })
  if (error) throw error
  return (data || []) as ContactpersoonRecord[]
}

export async function getContactpersonenByKlant(klantId: string): Promise<ContactpersoonRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('contactpersonen')
    .select('*')
    .eq('klant_id', klantId)
    .order('achternaam', { ascending: true })
  if (error) throw error
  return (data || []) as ContactpersoonRecord[]
}

export async function createContactpersoonDB(data: Partial<ContactpersoonRecord>): Promise<ContactpersoonRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const _orgId = await getOrgId()
  const { data: result, error } = await supabase
    .from('contactpersonen')
    .insert({ ...data, organisatie_id: _orgId })
    .select()
    .single()
  if (error) throw error
  return result as ContactpersoonRecord
}

export async function updateContactpersoonDB(id: string, data: Partial<ContactpersoonRecord>): Promise<ContactpersoonRecord> {
  assertId(id)
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: result, error } = await supabase
    .from('contactpersonen')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result as ContactpersoonRecord
}

export async function deleteContactpersoonDB(id: string): Promise<void> {
  assertId(id)
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase
    .from('contactpersonen')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function koppelContactAanKlant(contactId: string, klantId: string): Promise<void> {
  assertId(contactId, 'contactId')
  assertId(klantId, 'klantId')
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase
    .from('contactpersonen')
    .update({ klant_id: klantId, updated_at: new Date().toISOString() })
    .eq('id', contactId)
  if (error) throw error
}

export async function ontkoppelContact(contactId: string): Promise<void> {
  assertId(contactId)
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase
    .from('contactpersonen')
    .update({ klant_id: null, updated_at: new Date().toISOString() })
    .eq('id', contactId)
  if (error) throw error
}

// ============ KLANT HISTORIE ============

export async function getKlantHistorie(klantId: string): Promise<KlantHistorie[]> {
  assertId(klantId)
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('klant_historie')
    .select('*')
    .eq('klant_id', klantId)
    .order('datum', { ascending: false })
  if (error) throw error
  return (data || []) as KlantHistorie[]
}

// ============ IMPORT LOGS ============

export async function getImportLogs(organisatieId: string): Promise<ImportLog[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('import_logs')
    .select('*')
    .eq('organisatie_id', organisatieId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as ImportLog[]
}

export async function createImportLog(data: Partial<ImportLog>): Promise<ImportLog> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: result, error } = await supabase
    .from('import_logs')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result as ImportLog
}

export async function deleteImportLog(id: string): Promise<void> {
  assertId(id)
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase.from('import_logs').delete().eq('id', id)
  if (error) throw error
}

export async function deleteAllImportLogs(organisatieId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase.from('import_logs').delete().eq('organisatie_id', organisatieId)
  if (error) throw error
}

export async function opschonenAlleImportData(organisatieId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  // Verwijder in juiste volgorde (FK constraints)
  const { error: e1 } = await supabase.from('contactpersonen').delete().eq('organisatie_id', organisatieId)
  if (e1) throw e1
  const { error: e2 } = await supabase.from('klant_historie').delete().eq('organisatie_id', organisatieId)
  if (e2) throw e2
  const { error: e3 } = await supabase.from('import_logs').delete().eq('organisatie_id', organisatieId)
  if (e3) throw e3
  // Alleen geïmporteerde klanten verwijderen
  const { error: e4 } = await supabase.from('klanten').delete().eq('organisatie_id', organisatieId).eq('import_bron', 'csv_import')
  if (e4) throw e4
}

export async function markeerAlsLosContact(ids: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || ids.length === 0) return
  const { error } = await supabase
    .from('contactpersonen')
    .update({ notities: '[LOS_CONTACT]' })
    .in('id', ids)
  if (error) throw error
}

export async function bulkDeleteContactpersonen(ids: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || ids.length === 0) return
  const { error } = await supabase
    .from('contactpersonen')
    .delete()
    .in('id', ids)
  if (error) throw error
}
