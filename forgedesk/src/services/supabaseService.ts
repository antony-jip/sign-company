import supabase, { isSupabaseConfigured } from './supabaseClient'
import { safeSetItem } from '@/utils/localStorageUtils'
import type {
  Contactpersoon,
  Klant,
  Project,
  Taak,
  Offerte,
  OfferteItem,
  Document,
  Email,
  CalendarEvent,
  Grootboek,
  BtwCode,
  Korting,
  AIChat,
  Profile,
  Nieuwsbrief,
  AppSettings,
  CalculatieProduct,
  CalculatieTemplate,
  OfferteTemplate,
  TekeningGoedkeuring,
  Factuur,
  FactuurItem,
  Tijdregistratie,
  Medewerker,
  Notificatie,
  MontageAfspraak,
  Verlof,
  Bedrijfssluitingsdag,
  ProjectToewijzing,
  BookingSlot,
  BookingAfspraak,
  Werkbon,
  WerkbonRegel,
  WerkbonFoto,
  HerinneringTemplate,
  Leverancier,
  Uitgave,
  Bestelbon,
  BestelbonRegel,
  Leveringsbon,
  LeveringsbonRegel,
  VoorraadArtikel,
  VoorraadMutatie,
  Deal,
  DealActiviteit,
  LeadFormulier,
  LeadInzending,
  InternEmailNotitie,
  DocumentStyle,
  OfferteVersie,
} from '@/types'
import { round2 } from '@/utils/budgetUtils'

// ============ HELPERS ============

function assertId(id: unknown, label = 'id'): asserts id is string {
  if (!id || typeof id !== 'string') {
    throw new Error(`Ongeldig ${label}: waarde is vereist`)
  }
}

function getLocalData<T>(key: string): T[] {
  const data = localStorage.getItem(`forgedesk_${key}`)
  return data ? JSON.parse(data) : []
}

function setLocalData<T>(key: string, data: T[]): void {
  if (!safeSetItem(`forgedesk_${key}`, JSON.stringify(data))) {
    throw new Error(`localStorage quota exceeded voor ${key}`)
  }
}

function generateId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

// ============ KLANTEN ============

function safeParseJsonArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val.trim().startsWith('[')) {
    try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed } catch { /* ignore */ }
  }
  return []
}

function normalizeKlant(klant: Record<string, unknown>): Klant {
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

export async function getKlanten(): Promise<Klant[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('klanten')
      .select('*')
      .order('bedrijfsnaam')
    if (error) throw error
    return (data || []).map(normalizeKlant)
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
      .single()
    if (error) throw error
    return data ? normalizeKlant(data) : null
  }
  const klanten = getLocalData<Klant>('klanten')
  const found = klanten.find((k) => k.id === id)
  return found ? normalizeKlant(found) : null
}

export async function createKlant(klant: Omit<Klant, 'id' | 'created_at' | 'updated_at'>): Promise<Klant> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('klanten')
      .insert(klant)
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
    const { error } = await supabase.from('klanten').delete().eq('id', id)
    if (error) throw error
    return
  }
  const klanten = getLocalData<Klant>('klanten')
  setLocalData('klanten', klanten.filter((k) => k.id !== id))
}

// ============ PROJECTEN ============

export async function getProjecten(): Promise<Project[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('projecten')
      .select('*, klanten(bedrijfsnaam)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((p: Project & { klanten?: { bedrijfsnaam?: string } }) => ({
      ...p,
      klant_naam: p.klanten?.bedrijfsnaam || '',
    }))
  }
  const projecten = getLocalData<Project>('projecten')
  const klanten = getLocalData<Klant>('klanten')
  return projecten.map((p) => ({
    ...p,
    klant_naam: klanten.find((k) => k.id === p.klant_id)?.bedrijfsnaam || '',
  }))
}

export async function getProject(id: string): Promise<Project | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('projecten')
      .select('*, klanten(bedrijfsnaam)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data ? { ...data, klant_naam: data.klanten?.bedrijfsnaam || '' } : null
  }
  const projecten = getLocalData<Project>('projecten')
  const klanten = getLocalData<Klant>('klanten')
  const project = projecten.find((p) => p.id === id)
  if (!project) return null
  return { ...project, klant_naam: klanten.find((k) => k.id === project.klant_id)?.bedrijfsnaam || '' }
}

export async function getProjectenByKlant(klantId: string): Promise<Project[]> {
  assertId(klantId, 'klant_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('projecten')
      .select('*')
      .eq('klant_id', klantId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const projecten = getLocalData<Project>('projecten')
  return projecten.filter((p) => p.klant_id === klantId)
}

export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'klant_naam'>): Promise<Project> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('projecten')
      .insert(project)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const projecten = getLocalData<Project>('projecten')
  const newProject: Project = {
    ...project,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as Project
  projecten.push(newProject)
  setLocalData('projecten', projecten)
  return newProject
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('projecten')
      .update({ ...updates, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const projecten = getLocalData<Project>('projecten')
  const index = projecten.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Project niet gevonden')
  projecten[index] = { ...projecten[index], ...updates, updated_at: now() }
  setLocalData('projecten', projecten)
  return projecten[index]
}

export async function deleteProject(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('projecten').delete().eq('id', id)
    if (error) throw error
    return
  }
  const projecten = getLocalData<Project>('projecten')
  setLocalData('projecten', projecten.filter((p) => p.id !== id))
}

// ============ TAKEN ============

export async function getTaken(): Promise<Taak[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('taken')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Taak>('taken')
}

export async function getTaak(id: string): Promise<Taak | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('taken')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }
  const taken = getLocalData<Taak>('taken')
  return taken.find((t) => t.id === id) || null
}

export async function getTakenByProject(projectId: string): Promise<Taak[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('taken')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const taken = getLocalData<Taak>('taken')
  return taken.filter((t) => t.project_id === projectId)
}

export async function createTaak(taak: Omit<Taak, 'id' | 'created_at' | 'updated_at'>): Promise<Taak> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('taken')
      .insert(taak)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const taken = getLocalData<Taak>('taken')
  const newTaak: Taak = {
    ...taak,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as Taak
  taken.push(newTaak)
  setLocalData('taken', taken)
  return newTaak
}

export async function updateTaak(id: string, updates: Partial<Taak>): Promise<Taak> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('taken')
      .update({ ...updates, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const taken = getLocalData<Taak>('taken')
  const index = taken.findIndex((t) => t.id === id)
  if (index === -1) throw new Error('Taak niet gevonden')
  taken[index] = { ...taken[index], ...updates, updated_at: now() }
  setLocalData('taken', taken)
  return taken[index]
}

export async function deleteTaak(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('taken').delete().eq('id', id)
    if (error) throw error
    return
  }
  const taken = getLocalData<Taak>('taken')
  setLocalData('taken', taken.filter((t) => t.id !== id))
}

// ============ OFFERTES ============

export async function getOffertes(): Promise<Offerte[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('offertes')
        .select('*, klanten(bedrijfsnaam)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((o: Offerte & { klanten?: { bedrijfsnaam?: string } }) => ({
        ...o,
        klant_naam: o.klanten?.bedrijfsnaam || '',
      }))
    } catch (err) {
      // Supabase failed — fall back to localStorage
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
      .single()
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

export async function createOfferte(offerte: Omit<Offerte, 'id' | 'created_at' | 'updated_at'>): Promise<Offerte> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offertes')
      .insert(offerte)
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

export async function updateOfferte(id: string, updates: Partial<Offerte>): Promise<Offerte> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offertes')
      .update({ ...updates, updated_at: now() })
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
      .insert(item)
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

// ============ OFFERTE VERSIES (FIX 12) ============

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
    const { data, error } = await supabase.from('offerte_versies').insert(record).select().single()
    if (error) throw error
    return data
  }
  const versies = getLocalData<OfferteVersie>('offerte_versies')
  versies.push(record)
  setLocalData('offerte_versies', versies)
  return record
}

// ============ DOCUMENTEN ============

export async function getDocumenten(): Promise<Document[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('documenten')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Document>('documenten')
}

export async function getDocument(id: string): Promise<Document | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('documenten')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }
  const documenten = getLocalData<Document>('documenten')
  return documenten.find((d) => d.id === id) || null
}

export async function createDocument(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('documenten')
      .insert(document)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const documenten = getLocalData<Document>('documenten')
  const newDoc: Document = {
    ...document,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as Document
  documenten.push(newDoc)
  setLocalData('documenten', documenten)
  return newDoc
}

export async function updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('documenten')
      .update({ ...updates, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const documenten = getLocalData<Document>('documenten')
  const index = documenten.findIndex((d) => d.id === id)
  if (index === -1) throw new Error('Document niet gevonden')
  documenten[index] = { ...documenten[index], ...updates, updated_at: now() }
  setLocalData('documenten', documenten)
  return documenten[index]
}

export async function deleteDocument(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('documenten').delete().eq('id', id)
    if (error) throw error
    return
  }
  const documenten = getLocalData<Document>('documenten')
  setLocalData('documenten', documenten.filter((d) => d.id !== id))
}

// ============ EMAILS ============

export async function getEmails(): Promise<Email[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Email>('emails')
}

export async function getEmail(id: string): Promise<Email | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }
  const emails = getLocalData<Email>('emails')
  return emails.find((e) => e.id === id) || null
}

export async function createEmail(email: Omit<Email, 'id' | 'created_at'>): Promise<Email> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .insert(email)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const emails = getLocalData<Email>('emails')
  const newEmail: Email = {
    ...email,
    id: generateId(),
    created_at: now(),
  } as Email
  emails.push(newEmail)
  setLocalData('emails', emails)
  return newEmail
}

export async function updateEmail(id: string, updates: Partial<Email>): Promise<Email> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const emails = getLocalData<Email>('emails')
  const index = emails.findIndex((e) => e.id === id)
  if (index === -1) throw new Error('Email niet gevonden')
  emails[index] = { ...emails[index], ...updates }
  setLocalData('emails', emails)
  return emails[index]
}

export async function deleteEmail(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('emails').delete().eq('id', id)
    if (error) throw error
    return
  }
  const emails = getLocalData<Email>('emails')
  setLocalData('emails', emails.filter((e) => e.id !== id))
}

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
      .single()
    if (error) throw error
    return data
  }
  const events = getLocalData<CalendarEvent>('events')
  return events.find((e) => e.id === id) || null
}

export async function createEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
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
      .update({ ...updates, updated_at: now() })
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
      .insert(rekening)
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
    const { data, error } = await supabase
      .from('btw_codes')
      .insert(btwCode)
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
    const { data, error } = await supabase
      .from('kortingen')
      .insert(korting)
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

// ============ AI CHATS ============

export async function getAIChats(): Promise<AIChat[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('ai_chats')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  }
  return getLocalData<AIChat>('ai_chats')
}

export async function createAIChat(chat: Omit<AIChat, 'id' | 'created_at'>): Promise<AIChat> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('ai_chats')
      .insert(chat)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const chats = getLocalData<AIChat>('ai_chats')
  const newChat: AIChat = {
    ...chat,
    id: generateId(),
    created_at: now(),
  } as AIChat
  chats.push(newChat)
  setLocalData('ai_chats', chats)
  return newChat
}

export async function deleteAIChats(): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('ai_chats').delete().neq('id', '')
    if (error) throw error
    return
  }
  setLocalData('ai_chats', [])
}

// ============ PROFILES ============

export async function getProfile(userId: string): Promise<Profile | null> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      if (error.code === 'PGRST116') return null // not found
      throw error
    }
    return data
  }
  const profiles = getLocalData<Profile>('profiles')
  return profiles.find((p) => p.id === userId) || null
}

// ============ NIEUWSBRIEVEN ============

export async function getNieuwsbrieven(): Promise<Nieuwsbrief[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('nieuwsbrieven')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Nieuwsbrief>('nieuwsbrieven')
}

export async function getNieuwsbrief(id: string): Promise<Nieuwsbrief | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('nieuwsbrieven')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Nieuwsbrief>('nieuwsbrieven')
  return items.find((n) => n.id === id) || null
}

export async function createNieuwsbrief(nieuwsbrief: Omit<Nieuwsbrief, 'id' | 'created_at' | 'updated_at'>): Promise<Nieuwsbrief> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('nieuwsbrieven')
      .insert(nieuwsbrief)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Nieuwsbrief>('nieuwsbrieven')
  const newItem: Nieuwsbrief = {
    ...nieuwsbrief,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as Nieuwsbrief
  items.push(newItem)
  setLocalData('nieuwsbrieven', items)
  return newItem
}

export async function updateNieuwsbrief(id: string, updates: Partial<Nieuwsbrief>): Promise<Nieuwsbrief> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('nieuwsbrieven')
      .update({ ...updates, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Nieuwsbrief>('nieuwsbrieven')
  const index = items.findIndex((n) => n.id === id)
  if (index === -1) throw new Error('Nieuwsbrief niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('nieuwsbrieven', items)
  return items[index]
}

export async function deleteNieuwsbrief(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('nieuwsbrieven').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Nieuwsbrief>('nieuwsbrieven')
  setLocalData('nieuwsbrieven', items.filter((n) => n.id !== id))
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
    const { data, error } = await supabase
      .from('calculatie_producten')
      .insert(product)
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
    const { data, error } = await supabase
      .from('calculatie_templates')
      .insert(template)
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

/** Standaard offerte-templates voor een sign company */
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
    const { data, error } = await supabase
      .from('offerte_templates')
      .insert(template)
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
      .single()
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
    const { data, error } = await supabase
      .from('tekening_goedkeuringen')
      .insert({ ...goedkeuring, token })
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
      .single()
    if (error) throw error
    return data
  }
  const items = getLocalData<TekeningGoedkeuring>('tekening_goedkeuringen')
  const index = items.findIndex((g) => g.token === token)
  if (index === -1) throw new Error('Tekening goedkeuring niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('tekening_goedkeuringen', items)
  return items[index]
}

// ============ APP SETTINGS ============

const DEFAULT_PIPELINE_STAPPEN = [
  { key: 'concept', label: 'Concept', kleur: 'gray', volgorde: 0, actief: true },
  { key: 'verzonden', label: 'Verzonden', kleur: 'blue', volgorde: 1, actief: true },
  { key: 'bekeken', label: 'Bekeken', kleur: 'teal', volgorde: 2, actief: true },
  { key: 'goedgekeurd', label: 'Goedgekeurd', kleur: 'green', volgorde: 3, actief: true },
  { key: 'afgewezen', label: 'Afgewezen', kleur: 'red', volgorde: 4, actief: true },
]

export function getDefaultAppSettings(userId: string): AppSettings {
  return {
    id: userId,
    user_id: userId,
    branche: 'Reclame & Signbedrijf',
    branche_preset: 'sign_company',
    valuta: 'EUR',
    valuta_symbool: '\u20AC',
    standaard_btw: 21,
    pipeline_stappen: DEFAULT_PIPELINE_STAPPEN,
    offerte_geldigheid_dagen: 30,
    offerte_prefix: 'OFF',
    offerte_volgnummer: 1,
    auto_follow_up: true,
    follow_up_dagen: 7,
    melding_follow_up: true,
    melding_verlopen: true,
    melding_nieuwe_offerte: true,
    melding_status_wijziging: true,
    email_handtekening: '',
    primaire_kleur: '#2563eb',
    secundaire_kleur: '#7c3aed',
    toon_conversie_rate: true,
    toon_dagen_open: true,
    toon_follow_up_indicatoren: true,
    dashboard_widgets: ['follow_ups', 'pipeline', 'kpi', 'kalender'],
    sidebar_items: [
      'Dashboard',
      'Klanten', 'Deals', 'Offertes', 'Facturen',
      'Projecten', 'Taken', 'Montage', 'Werkbonnen', 'Nacalculatie',
      'Planning', 'Tijdregistratie', 'Booking',
      'Email', 'Nieuwsbrieven', 'Lead Capture',
      'Financieel', 'Uitgaven', 'Leveranciers', 'Forecast',
      'Documenten', 'Voorraad', 'Bestelbonnen', 'Leveringsbonnen',
      'Rapportages', 'Team', 'Importeren', 'AI Assistent', 'Instellingen',
    ],
    calculatie_categorieen: ['Materiaal', 'Arbeid', 'Transport', 'Apparatuur', 'Overig'],
    calculatie_eenheden: ['stuks', 'm\u00B2', 'm\u00B9', 'uur', 'dag', 'meter', 'kg', 'set'],
    calculatie_standaard_marge: 35,
    calculatie_toon_inkoop_in_offerte: false,
    calculatie_uren_velden: ['Montage', 'Voorbereiding', 'Ontwerp & DTP', 'Applicatie'],
    offerte_regel_velden: ['Materiaal', 'Lay-out', 'Montage', 'Opmerking'],
    factuur_prefix: 'FAC',
    factuur_volgnummer: 1,
    factuur_betaaltermijn_dagen: 30,
    factuur_voorwaarden: 'Betaling binnen 30 dagen na factuurdatum.',
    factuur_intro_tekst: '',
    factuur_outro_tekst: '',
    created_at: now(),
    updated_at: now(),
  }
}

export async function getAppSettings(userId: string): Promise<AppSettings> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error) {
      if (error.code === 'PGRST116') return getDefaultAppSettings(userId)
      throw error
    }
    return data
  }
  const settings = getLocalData<AppSettings>('app_settings')
  const found = settings.find((s) => s.user_id === userId)
  return found || getDefaultAppSettings(userId)
}

export async function updateAppSettings(userId: string, updates: Partial<AppSettings>): Promise<AppSettings> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('app_settings')
        .update({ ...updates, updated_at: now() })
        .eq('user_id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const defaults = getDefaultAppSettings(userId)
      const { data, error } = await supabase
        .from('app_settings')
        .insert({ ...defaults, ...updates })
        .select()
        .single()
      if (error) throw error
      return data
    }
  }

  const settings = getLocalData<AppSettings>('app_settings')
  const index = settings.findIndex((s) => s.user_id === userId)
  if (index === -1) {
    const defaults = getDefaultAppSettings(userId)
    const newSettings: AppSettings = { ...defaults, ...updates, updated_at: now() }
    settings.push(newSettings)
    setLocalData('app_settings', settings)
    return newSettings
  }
  settings[index] = { ...settings[index], ...updates, updated_at: now() }
  setLocalData('app_settings', settings)
  return settings[index]
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: now() })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const profiles = getLocalData<Profile>('profiles')
  const index = profiles.findIndex((p) => p.id === userId)
  if (index === -1) {
    // Create profile if not found in localStorage
    const newProfile: Profile = {
      id: userId,
      voornaam: '',
      achternaam: '',
      email: '',
      telefoon: '',
      avatar_url: '',
      logo_url: '',
      bedrijfsnaam: '',
      bedrijfs_adres: '',
      kvk_nummer: '',
      btw_nummer: '',
      taal: 'nl',
      theme: 'light',
      created_at: now(),
      updated_at: now(),
      ...updates,
    }
    profiles.push(newProfile)
    setLocalData('profiles', profiles)
    return newProfile
  }
  profiles[index] = { ...profiles[index], ...updates, updated_at: now() }
  setLocalData('profiles', profiles)
  return profiles[index]
}

// ============ FACTUREN ============

export async function getFacturen(): Promise<Factuur[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').select('*').order('factuurdatum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Factuur>('facturen')
}

export async function getFactuur(id: string): Promise<Factuur> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Factuur>('facturen')
  const item = items.find((f) => f.id === id)
  if (!item) throw new Error('Factuur niet gevonden')
  return item
}

export async function createFactuur(factuur: Omit<Factuur, 'id' | 'created_at' | 'updated_at'>): Promise<Factuur> {
  const newFactuur: Factuur = { ...factuur, id: generateId(), created_at: now(), updated_at: now() } as Factuur
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').insert(newFactuur).select().single()
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
    const { data, error } = await supabase.from('facturen').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
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
    const { data, error } = await supabase.from('factuur_items').insert(newItem).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<FactuurItem>('factuur_items')
  items.push(newItem)
  setLocalData('factuur_items', items)
  return newItem
}

// ============ TIJDREGISTRATIE ============

export async function getTijdregistraties(): Promise<Tijdregistratie[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('tijdregistraties').select('*').order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Tijdregistratie>('tijdregistraties')
}

export async function createTijdregistratie(entry: Omit<Tijdregistratie, 'id' | 'created_at' | 'updated_at'>): Promise<Tijdregistratie> {
  const newEntry: Tijdregistratie = { ...entry, id: generateId(), created_at: now(), updated_at: now() } as Tijdregistratie
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('tijdregistraties').insert(newEntry).select().single()
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
    const { data, error } = await supabase.from('tijdregistraties').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
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

// ============ MEDEWERKERS ============

export async function getMedewerkers(): Promise<Medewerker[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('medewerkers').select('*').order('naam')
    if (error) throw error
    return data || []
  }
  return getLocalData<Medewerker>('medewerkers')
}

export async function createMedewerker(mw: Omit<Medewerker, 'id' | 'created_at' | 'updated_at'>): Promise<Medewerker> {
  const newMw: Medewerker = { ...mw, id: generateId(), created_at: now(), updated_at: now() } as Medewerker
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('medewerkers').insert(newMw).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Medewerker>('medewerkers')
  items.push(newMw)
  setLocalData('medewerkers', items)
  return newMw
}

export async function updateMedewerker(id: string, updates: Partial<Medewerker>): Promise<Medewerker> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('medewerkers').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Medewerker>('medewerkers')
  const index = items.findIndex((m) => m.id === id)
  if (index === -1) throw new Error('Medewerker niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('medewerkers', items)
  return items[index]
}

export async function deleteMedewerker(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('medewerkers').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Medewerker>('medewerkers')
  setLocalData('medewerkers', items.filter((m) => m.id !== id))
}

// ============ NOTIFICATIES ============

export async function getNotificaties(): Promise<Notificatie[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('notificaties').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Notificatie>('notificaties')
}

export async function createNotificatie(notif: Omit<Notificatie, 'id' | 'created_at'>): Promise<Notificatie> {
  const newNotif: Notificatie = { ...notif, id: generateId(), created_at: now() } as Notificatie
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('notificaties').insert(newNotif).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Notificatie>('notificaties')
  items.unshift(newNotif)
  setLocalData('notificaties', items)
  return newNotif
}

export async function markNotificatieGelezen(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('notificaties').update({ gelezen: true }).eq('id', id)
    return
  }
  const items = getLocalData<Notificatie>('notificaties')
  const index = items.findIndex((n) => n.id === id)
  if (index !== -1) {
    items[index].gelezen = true
    setLocalData('notificaties', items)
  }
}

export async function markAlleNotificatiesGelezen(): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('notificaties').update({ gelezen: true }).eq('gelezen', false)
    return
  }
  const items = getLocalData<Notificatie>('notificaties')
  items.forEach((n) => (n.gelezen = true))
  setLocalData('notificaties', items)
}

// ============ MONTAGE PLANNING ============

export async function getMontageAfspraken(): Promise<MontageAfspraak[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('montage_afspraken').select('*').order('datum', { ascending: true })
    if (error) throw error
    return data || []
  }
  return getLocalData<MontageAfspraak>('montage_afspraken')
}

export async function createMontageAfspraak(afspraak: Omit<MontageAfspraak, 'id' | 'created_at' | 'updated_at'>): Promise<MontageAfspraak> {
  const newAfspraak: MontageAfspraak = { ...afspraak, id: generateId(), created_at: now(), updated_at: now() } as MontageAfspraak
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('montage_afspraken').insert(newAfspraak).select().single()
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
    const { data, error } = await supabase.from('montage_afspraken').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
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

// ============ TIJDREGISTRATIE HELPERS ============

export async function getTijdregistratiesByProject(projectId: string): Promise<Tijdregistratie[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('tijdregistraties').select('*').eq('project_id', projectId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Tijdregistratie>('tijdregistraties').filter((t) => t.project_id === projectId)
}

// ============ VERLOF & BESCHIKBAARHEID (Feature 3) ============

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
  const newVerlof: Verlof = { ...verlof, id: generateId(), created_at: now() } as Verlof
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('verlof').insert(newVerlof).select().single()
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
    const { data, error } = await supabase.from('verlof').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
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

export async function getBedrijfssluitingsdagen(): Promise<Bedrijfssluitingsdag[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bedrijfssluitingsdagen').select('*').order('datum')
    if (error) throw error
    return data || []
  }
  return getLocalData<Bedrijfssluitingsdag>('bedrijfssluitingsdagen')
}

export async function createBedrijfssluitingsdag(dag: Omit<Bedrijfssluitingsdag, 'id' | 'created_at'>): Promise<Bedrijfssluitingsdag> {
  const newDag: Bedrijfssluitingsdag = { ...dag, id: generateId(), created_at: now() } as Bedrijfssluitingsdag
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bedrijfssluitingsdagen').insert(newDag).select().single()
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

// ============ PROJECT TOEWIJZINGEN (Feature 4) ============

export async function getProjectToewijzingen(projectId: string): Promise<ProjectToewijzing[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('project_toewijzingen').select('*').eq('project_id', projectId)
    if (error) throw error
    return data || []
  }
  return getLocalData<ProjectToewijzing>('project_toewijzingen').filter((t) => t.project_id === projectId)
}

export async function getProjectToewijzingenVoorMedewerker(medewerkerId: string): Promise<ProjectToewijzing[]> {
  assertId(medewerkerId, 'medewerker_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('project_toewijzingen').select('*').eq('medewerker_id', medewerkerId)
    if (error) throw error
    return data || []
  }
  return getLocalData<ProjectToewijzing>('project_toewijzingen').filter((t) => t.medewerker_id === medewerkerId)
}

export async function createProjectToewijzing(toewijzing: Omit<ProjectToewijzing, 'id' | 'created_at'>): Promise<ProjectToewijzing> {
  const newToewijzing: ProjectToewijzing = { ...toewijzing, id: generateId(), created_at: now() } as ProjectToewijzing
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('project_toewijzingen').insert(newToewijzing).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<ProjectToewijzing>('project_toewijzingen')
  items.push(newToewijzing)
  setLocalData('project_toewijzingen', items)
  return newToewijzing
}

export async function deleteProjectToewijzing(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('project_toewijzingen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<ProjectToewijzing>('project_toewijzingen')
  setLocalData('project_toewijzingen', items.filter((t) => t.id !== id))
}

// ============ BOOKING SYSTEEM (Feature 6) ============

export async function getBookingSlots(): Promise<BookingSlot[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_slots').select('*').order('dag_van_week')
    if (error) throw error
    return data || []
  }
  return getLocalData<BookingSlot>('booking_slots')
}

export async function createBookingSlot(slot: Omit<BookingSlot, 'id' | 'created_at'>): Promise<BookingSlot> {
  const newSlot: BookingSlot = { ...slot, id: generateId(), created_at: now() } as BookingSlot
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_slots').insert(newSlot).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<BookingSlot>('booking_slots')
  items.push(newSlot)
  setLocalData('booking_slots', items)
  return newSlot
}

export async function updateBookingSlot(id: string, updates: Partial<BookingSlot>): Promise<BookingSlot> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_slots').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<BookingSlot>('booking_slots')
  const index = items.findIndex((s) => s.id === id)
  if (index === -1) throw new Error('Booking slot niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('booking_slots', items)
  return items[index]
}

export async function deleteBookingSlot(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('booking_slots').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<BookingSlot>('booking_slots')
  setLocalData('booking_slots', items.filter((s) => s.id !== id))
}

export async function getBookingAfspraken(): Promise<BookingAfspraak[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_afspraken').select('*').order('datum', { ascending: true })
    if (error) throw error
    return data || []
  }
  return getLocalData<BookingAfspraak>('booking_afspraken')
}

export async function getBookingAfspraakByToken(token: string): Promise<BookingAfspraak | null> {
  assertId(token, 'token')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_afspraken').select('*').eq('token', token).single()
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }
  const items = getLocalData<BookingAfspraak>('booking_afspraken')
  return items.find((a) => a.token === token) || null
}

export async function createBookingAfspraak(afspraak: Omit<BookingAfspraak, 'id' | 'token' | 'created_at'>): Promise<BookingAfspraak> {
  const newAfspraak: BookingAfspraak = { ...afspraak, id: generateId(), token: generateToken(), created_at: now() } as BookingAfspraak
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_afspraken').insert(newAfspraak).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<BookingAfspraak>('booking_afspraken')
  items.push(newAfspraak)
  setLocalData('booking_afspraken', items)
  return newAfspraak
}

export async function updateBookingAfspraak(id: string, updates: Partial<BookingAfspraak>): Promise<BookingAfspraak> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_afspraken').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<BookingAfspraak>('booking_afspraken')
  const index = items.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('Booking afspraak niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('booking_afspraken', items)
  return items[index]
}

// round2 imported from @/utils/budgetUtils at the top of this file

// ============ WERKBONNEN (Tier 1 Feature 1) ============

async function generateWerkbonNummer(): Promise<string> {
  const jaar = new Date().getFullYear()
  const werkbonnen = await getWerkbonnen()
  const ditJaar = werkbonnen.filter((w) => w.werkbon_nummer.startsWith(`WB-${jaar}-`))
  const maxNr = ditJaar.reduce((max, w) => {
    const nr = parseInt(w.werkbon_nummer.split('-')[2], 10)
    return nr > max ? nr : max
  }, 0)
  return `WB-${jaar}-${String(maxNr + 1).padStart(3, '0')}`
}

export async function getWerkbonnen(): Promise<Werkbon[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbonnen').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Werkbon>('werkbonnen')
}

export async function getWerkbon(id: string): Promise<Werkbon | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbonnen').select('*').eq('id', id).single()
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
  const newWerkbon: Werkbon = { ...werkbon, id: generateId(), werkbon_nummer, created_at: now(), updated_at: now() } as Werkbon
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('werkbonnen').insert(newWerkbon).select().single()
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
    const { data, error } = await supabase.from('werkbonnen').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
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
    const { error } = await supabase.from('werkbonnen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Werkbon>('werkbonnen')
  setLocalData('werkbonnen', items.filter((w) => w.id !== id))
}

// ============ WERKBON REGELS ============

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
    const { data, error } = await supabase.from('werkbon_regels').insert(newRegel).select().single()
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

// ============ WERKBON FOTO'S ============

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
    const { data, error } = await supabase.from('werkbon_fotos').insert(newFoto).select().single()
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

// ============ BETALINGSHERINNERINGEN (Tier 1 Feature 2) ============

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
    const { data, error } = await supabase.from('herinnering_templates').insert(newTemplate).select().single()
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

export async function getVerlopenFacturen(): Promise<Factuur[]> {
  const facturen = await getFacturen()
  const vandaag = new Date().toISOString().split('T')[0]
  return facturen.filter((f) => f.vervaldatum < vandaag && f.status !== 'betaald' && f.status !== 'gecrediteerd' && (f.factuur_type || 'standaard') !== 'creditnota')
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
    const { data, error } = await supabase.from('leveranciers').select('*').eq('id', id).single()
    if (error) return null
    return data
  }
  return getLocalData<Leverancier>('leveranciers').find((l) => l.id === id) || null
}

export async function createLeverancier(lev: Omit<Leverancier, 'id' | 'created_at'>): Promise<Leverancier> {
  const newLev: Leverancier = { ...lev, id: generateId(), created_at: now() } as Leverancier
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveranciers').insert(newLev).select().single()
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
    const { data, error } = await supabase.from('uitgaven').select('*').eq('id', id).single()
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
  const newUitgave: Uitgave = { ...uitgave, id: generateId(), uitgave_nummer, created_at: now(), updated_at: now() } as Uitgave
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('uitgaven').insert(newUitgave).select().single()
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
    const { data, error } = await supabase.from('uitgaven').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
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

// ============ ONLINE BETALING (Tier 2 Feature 1) ============

export function generateBetaalToken(): string {
  return generateId()
}

export async function getFactuurByBetaalToken(token: string): Promise<Factuur | null> {
  assertId(token, 'betaal_token')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').select('*').eq('betaal_token', token).single()
    if (error) return null
    return data
  }
  return getLocalData<Factuur>('facturen').find((f) => f.betaal_token === token) || null
}

export async function markFactuurBekeken(token: string): Promise<void> {
  assertId(token, 'betaal_token')
  const factuur = await getFactuurByBetaalToken(token)
  if (!factuur) return
  const updates: Partial<Factuur> = {
    online_bekeken: true,
    online_bekeken_op: factuur.online_bekeken_op || now(),
  }
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('facturen').update({ ...updates, updated_at: now() }).eq('id', factuur.id)
    return
  }
  const items = getLocalData<Factuur>('facturen')
  const index = items.findIndex((f) => f.id === factuur.id)
  if (index !== -1) {
    items[index] = { ...items[index], ...updates, updated_at: now() }
    setLocalData('facturen', items)
  }
}

// ============ OFFERTE TRACKING (Tier 2 Feature 2) ============

export async function getOfferteByPubliekToken(token: string): Promise<Offerte | null> {
  assertId(token, 'publiek_token')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('offertes').select('*').eq('publiek_token', token).single()
    if (error) return null
    return data
  }
  return getLocalData<Offerte>('offertes').find((o) => o.publiek_token === token) || null
}

export async function updateOfferteTracking(token: string): Promise<void> {
  assertId(token, 'publiek_token')
  const offerte = await getOfferteByPubliekToken(token)
  if (!offerte) return
  const updates: Partial<Offerte> = {
    bekeken_door_klant: true,
    eerste_bekeken_op: offerte.eerste_bekeken_op || now(),
    laatst_bekeken_op: now(),
    aantal_keer_bekeken: (offerte.aantal_keer_bekeken || 0) + 1,
    status: offerte.status === 'verzonden' ? 'bekeken' : offerte.status,
  }
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('offertes').update({ ...updates, updated_at: now() }).eq('id', offerte.id)
    return
  }
  const items = getLocalData<Offerte>('offertes')
  const index = items.findIndex((o) => o.id === offerte.id)
  if (index !== -1) {
    items[index] = { ...items[index], ...updates, updated_at: now() }
    setLocalData('offertes', items)
  }
}

export async function respondOpOfferte(token: string, reactie: { type: 'goedgekeurd' | 'afgewezen' | 'vraag'; bericht?: string; naam?: string }): Promise<void> {
  assertId(token, 'publiek_token')
  const offerte = await getOfferteByPubliekToken(token)
  if (!offerte) throw new Error('Offerte niet gevonden')
  const statusMap: Record<string, Offerte['status']> = {
    goedgekeurd: 'goedgekeurd',
    afgewezen: 'afgewezen',
    vraag: offerte.status,
  }
  const updates: Partial<Offerte> = {
    status: statusMap[reactie.type],
    follow_up_notitie: reactie.type === 'vraag' ? reactie.bericht : offerte.follow_up_notitie,
  }
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('offertes').update({ ...updates, updated_at: now() }).eq('id', offerte.id)
  } else {
    const items = getLocalData<Offerte>('offertes')
    const index = items.findIndex((o) => o.id === offerte.id)
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updated_at: now() }
      setLocalData('offertes', items)
    }
  }
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

export async function getBestelbonnen(): Promise<Bestelbon[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bestelbonnen').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Bestelbon>('bestelbonnen')
}

export async function getBestelbon(id: string): Promise<Bestelbon | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('bestelbonnen').select('*').eq('id', id).single()
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
  const newItem: Bestelbon = { ...data, id: generateId(), bestelbon_nummer, created_at: now(), updated_at: now() } as Bestelbon
  if (isSupabaseConfigured() && supabase) {
    const { data: saved, error } = await supabase.from('bestelbonnen').insert(newItem).select().single()
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
    const { data, error } = await supabase.from('bestelbonnen').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
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
    const { data: saved, error } = await supabase.from('bestelbon_regels').insert(newItem).select().single()
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

export async function getLeveringsbonnen(): Promise<Leveringsbon[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveringsbonnen').select('*').order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Leveringsbon>('leveringsbonnen')
}

export async function getLeveringsbon(id: string): Promise<Leveringsbon | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('leveringsbonnen').select('*').eq('id', id).single()
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
  const newItem: Leveringsbon = { ...data, id: generateId(), leveringsbon_nummer, created_at: now(), updated_at: now() } as Leveringsbon
  if (isSupabaseConfigured() && supabase) {
    const { data: saved, error } = await supabase.from('leveringsbonnen').insert(newItem).select().single()
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
    const { data, error } = await supabase.from('leveringsbonnen').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
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
    const { data: saved, error } = await supabase.from('leveringsbon_regels').insert(newItem).select().single()
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

// ============ VOORRAADBEHEER (Tier 2 Feature 5) ============

export async function getVoorraadArtikelen(): Promise<VoorraadArtikel[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('voorraad_artikelen').select('*').order('naam')
    if (error) throw error
    return data || []
  }
  return getLocalData<VoorraadArtikel>('voorraad_artikelen')
}

export async function getVoorraadArtikel(id: string): Promise<VoorraadArtikel | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('voorraad_artikelen').select('*').eq('id', id).single()
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
    const { data: saved, error } = await supabase.from('voorraad_artikelen').insert(newItem).select().single()
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
    const { data: saved, error } = await supabase.from('voorraad_mutaties').insert(newItem).select().single()
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
  // Find the mutatie to reverse it
  let mutatie: VoorraadMutatie | undefined
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase.from('voorraad_mutaties').select('*').eq('id', id).single()
    mutatie = data || undefined
  } else {
    mutatie = getLocalData<VoorraadMutatie>('voorraad_mutaties').find((m) => m.id === id)
  }
  if (mutatie) {
    // Reverse the saldo change
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

// ============ DEALS / SALES PIPELINE (Tier 3 Feature 1) ============

export async function getDeals(): Promise<Deal[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('deals').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Deal>('deals')
}

export async function getDeal(id: string): Promise<Deal | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('deals').select('*').eq('id', id).single()
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
  const newItem: Deal = { ...data, id: generateId(), created_at: now(), updated_at: now() } as Deal
  if (isSupabaseConfigured() && supabase) {
    const { data: saved, error } = await supabase.from('deals').insert(newItem).select().single()
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
    const { data, error } = await supabase.from('deals').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
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
  const newItem: DealActiviteit = { ...data, id: generateId(), created_at: now() } as DealActiviteit
  if (isSupabaseConfigured() && supabase) {
    const { data: saved, error } = await supabase.from('deal_activiteiten').insert(newItem).select().single()
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
    const { data, error } = await supabase.from('lead_formulieren').select('*').eq('id', id).single()
    if (error) return null
    return data
  }
  return getLocalData<LeadFormulier>('lead_formulieren').find((f) => f.id === id) || null
}

export async function getLeadFormulierByToken(token: string): Promise<LeadFormulier | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('lead_formulieren').select('*').eq('publiek_token', token).eq('actief', true).single()
    if (error) return null
    return data
  }
  return getLocalData<LeadFormulier>('lead_formulieren').find((f) => f.publiek_token === token && f.actief) || null
}

export async function createLeadFormulier(data: Omit<LeadFormulier, 'id' | 'publiek_token' | 'created_at' | 'updated_at'>): Promise<LeadFormulier> {
  const publiek_token = generateLeadToken()
  const newItem: LeadFormulier = { ...data, id: generateId(), publiek_token, created_at: now(), updated_at: now() } as LeadFormulier
  if (isSupabaseConfigured() && supabase) {
    const { data: saved, error } = await supabase.from('lead_formulieren').insert(newItem).select().single()
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
    const { data: saved, error } = await supabase.from('lead_inzendingen').insert(newItem).select().single()
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

// ============ GEDEELDE INBOX (Tier 3 Feature 3) ============

export async function getGedeeldeEmails(): Promise<Email[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('emails').select('*').eq('inbox_type', 'gedeeld').order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Email>('emails').filter((e) => e.inbox_type === 'gedeeld')
}

export async function getGedeeldeEmailsByToewijzing(medewerkerId: string): Promise<Email[]> {
  assertId(medewerkerId, 'medewerker_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('emails').select('*').eq('inbox_type', 'gedeeld').eq('toegewezen_aan', medewerkerId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Email>('emails').filter((e) => e.inbox_type === 'gedeeld' && e.toegewezen_aan === medewerkerId)
}

export async function updateEmailToewijzing(emailId: string, medewerkerId: string): Promise<Email> {
  assertId(emailId, 'email_id')
  return updateEmail(emailId, { toegewezen_aan: medewerkerId })
}

export async function updateEmailTicketStatus(emailId: string, ticketStatus: Email['ticket_status']): Promise<Email> {
  assertId(emailId, 'email_id')
  return updateEmail(emailId, { ticket_status: ticketStatus })
}

export async function addInterneNotitie(emailId: string, notitie: InternEmailNotitie): Promise<Email> {
  assertId(emailId, 'email_id')
  const email = await getEmail(emailId)
  if (!email) throw new Error('Email niet gevonden')
  const huidigeNotities = email.interne_notities || []
  return updateEmail(emailId, { interne_notities: [...huidigeNotities, notitie] })
}

// getEmail and updateEmail are exported above (lines 653, 689) — used by shared inbox functions

// ============ DOCUMENT STYLES / HUISSTIJL ============

export async function getDocumentStyle(userId: string): Promise<DocumentStyle | null> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('document_styles')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }
  const styles = getLocalData<DocumentStyle>('document_styles')
  return styles.find((s) => s.user_id === userId) || null
}

export async function upsertDocumentStyle(userId: string, style: Partial<DocumentStyle>): Promise<DocumentStyle> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data: existing } = await supabase
      .from('document_styles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('document_styles')
        .update({ ...style, updated_at: now() })
        .eq('user_id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('document_styles')
        .insert({ ...style, user_id: userId, created_at: now(), updated_at: now() })
        .select()
        .single()
      if (error) throw error
      return data
    }
  }

  const styles = getLocalData<DocumentStyle>('document_styles')
  const index = styles.findIndex((s) => s.user_id === userId)
  if (index === -1) {
    const newStyle: DocumentStyle = {
      id: crypto.randomUUID(),
      user_id: userId,
      template: 'modern',
      heading_font: 'Montserrat',
      body_font: 'Inter',
      font_grootte_basis: 10,
      primaire_kleur: '#2563eb',
      secundaire_kleur: '#7c3aed',
      accent_kleur: '#06b6d4',
      tekst_kleur: '#111827',
      marge_boven: 15,
      marge_onder: 20,
      marge_links: 20,
      marge_rechts: 20,
      logo_positie: 'links',
      logo_grootte: 100,
      briefpapier_url: '',
      briefpapier_modus: 'geen',
      toon_header: true,
      toon_footer: true,
      footer_tekst: '',
      tabel_stijl: 'striped',
      tabel_header_kleur: '#2563eb',
      created_at: now(),
      updated_at: now(),
      ...style,
    }
    styles.push(newStyle)
    setLocalData('document_styles', styles)
    return newStyle
  }
  styles[index] = { ...styles[index], ...style, updated_at: now() }
  setLocalData('document_styles', styles)
  return styles[index]
}

export async function uploadBriefpapier(userId: string, file: File): Promise<string> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const ext = file.name.split('.').pop() || 'png'
    const path = `${userId}/briefpapier_${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('briefpapier')
      .upload(path, file, { upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage
      .from('briefpapier')
      .getPublicUrl(path)
    return urlData.publicUrl
  }
  // localStorage fallback: store as data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ============ MISSENDE RELATIONELE QUERIES ============

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

export async function getDocumentenByProject(projectId: string): Promise<Document[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('documenten').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Document>('documenten').filter((d) => d.project_id === projectId)
}

export async function getDocumentenByKlant(klantId: string): Promise<Document[]> {
  assertId(klantId, 'klant_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('documenten').select('*').eq('klant_id', klantId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Document>('documenten').filter((d) => d.klant_id === klantId)
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

// ============ NUMMER GENERATOREN (GECENTRALISEERD) ============

export async function generateOfferteNummer(prefix: string = 'OFF'): Promise<string> {
  const jaar = new Date().getFullYear()
  const offertes = await getOffertes()
  const jaarPrefix = `${prefix}-${jaar}-`
  const maxNr = offertes
    .filter((o) => o.nummer.startsWith(jaarPrefix))
    .reduce((max, o) => Math.max(max, parseInt(o.nummer.replace(jaarPrefix, ''), 10) || 0), 0)
  return `${jaarPrefix}${String(maxNr + 1).padStart(3, '0')}`
}

export async function generateFactuurNummer(prefix: string = 'FAC'): Promise<string> {
  const jaar = new Date().getFullYear()
  const facturen = await getFacturen()
  const jaarPrefix = `${prefix}-${jaar}-`
  const maxNr = facturen
    .filter((f) => f.nummer.startsWith(jaarPrefix))
    .reduce((max, f) => Math.max(max, parseInt(f.nummer.replace(jaarPrefix, ''), 10) || 0), 0)
  return `${jaarPrefix}${String(maxNr + 1).padStart(3, '0')}`
}

export async function generateCreditnotaNummer(): Promise<string> {
  const jaar = new Date().getFullYear()
  const facturen = await getFacturen()
  const prefix = `CN-${jaar}-`
  const maxNr = facturen
    .filter((f) => f.nummer.startsWith(prefix))
    .reduce((max, f) => Math.max(max, parseInt(f.nummer.replace(prefix, ''), 10) || 0), 0)
  return `${prefix}${String(maxNr + 1).padStart(3, '0')}`
}

export async function generateProjectNummer(): Promise<string> {
  const jaar = new Date().getFullYear()
  const projecten = await getProjecten()
  const prefix = `PRJ-${jaar}-`
  const maxNr = projecten
    .filter((p) => (p.naam || '').startsWith(prefix))
    .reduce((max, p) => Math.max(max, parseInt((p.naam || '').replace(prefix, ''), 10) || 0), 0)
  return `${prefix}${String(maxNr + 1).padStart(3, '0')}`
}

// ============ CONVERSIE FUNCTIES ============

export async function convertOfferteToFactuur(
  offerteId: string,
  userId: string,
  factuurPrefix: string = 'FAC'
): Promise<Factuur> {
  assertId(offerteId, 'offerte_id')
  const offerte = await getOfferte(offerteId)
  if (!offerte) throw new Error('Offerte niet gevonden')
  const nummer = await generateFactuurNummer(factuurPrefix)
  const items = await getOfferteItems(offerteId)
  const factuur = await createFactuur({
    user_id: userId,
    klant_id: offerte.klant_id,
    klant_naam: offerte.klant_naam,
    offerte_id: offerteId,
    project_id: offerte.project_id || '',
    nummer,
    titel: offerte.titel,
    status: 'concept',
    subtotaal: round2(offerte.subtotaal),
    btw_bedrag: round2(offerte.btw_bedrag),
    totaal: round2(offerte.totaal),
    betaald_bedrag: 0,
    factuurdatum: new Date().toISOString().split('T')[0],
    vervaldatum: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notities: offerte.notities || '',
    voorwaarden: offerte.voorwaarden || '',
    bron_type: 'offerte',
    bron_offerte_id: offerteId,
    factuur_type: 'standaard',
    contactpersoon_id: offerte.contactpersoon_id,
    intro_tekst: offerte.intro_tekst,
    outro_tekst: offerte.outro_tekst,
  } as Omit<Factuur, 'id' | 'created_at' | 'updated_at'>)
  // Kopieer offerte items naar factuur items
  for (const item of items) {
    await createFactuurItem({
      user_id: userId,
      factuur_id: factuur.id,
      beschrijving: item.beschrijving,
      aantal: item.aantal,
      eenheidsprijs: round2(item.eenheidsprijs),
      btw_percentage: item.btw_percentage,
      korting_percentage: item.korting_percentage,
      totaal: round2(item.totaal),
      volgorde: item.volgorde,
    } as Omit<FactuurItem, 'id' | 'created_at'>)
  }
  // Update offerte status
  await updateOfferte(offerteId, { status: 'gefactureerd', geconverteerd_naar_factuur_id: factuur.id })
  return factuur
}

export async function convertWerkbonToFactuur(
  werkbonId: string,
  userId: string,
  factuurPrefix: string = 'FAC'
): Promise<Factuur> {
  assertId(werkbonId, 'werkbon_id')
  const werkbon = await getWerkbon(werkbonId)
  if (!werkbon) throw new Error('Werkbon niet gevonden')
  const regels = await getWerkbonRegels(werkbonId)
  const nummer = await generateFactuurNummer(factuurPrefix)
  const factureerbaar = regels.filter((r) => r.factureerbaar)
  const subtotaal = round2(factureerbaar.reduce((sum, r) => sum + r.totaal, 0))
  // Kilometervergoeding
  const kmTotaal = round2((werkbon.kilometers || 0) * (werkbon.km_tarief || 0))
  const totaalSubtotaal = round2(subtotaal + kmTotaal)
  const btw_bedrag = round2(totaalSubtotaal * 0.21)
  const totaal = round2(totaalSubtotaal + btw_bedrag)
  const factuur = await createFactuur({
    user_id: userId,
    klant_id: werkbon.klant_id,
    project_id: werkbon.project_id,
    nummer,
    titel: `Factuur werkbon ${werkbon.werkbon_nummer}`,
    status: 'concept',
    subtotaal: totaalSubtotaal,
    btw_bedrag,
    totaal,
    betaald_bedrag: 0,
    factuurdatum: new Date().toISOString().split('T')[0],
    vervaldatum: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notities: werkbon.omschrijving || '',
    voorwaarden: '',
    bron_type: 'project',
    bron_project_id: werkbon.project_id,
    werkbon_id: werkbonId,
    factuur_type: 'standaard',
    contactpersoon_id: werkbon.contactpersoon_id,
  } as Omit<Factuur, 'id' | 'created_at' | 'updated_at'>)
  // Kopieer werkbon regels naar factuur items
  let volgorde = 0
  for (const regel of factureerbaar) {
    await createFactuurItem({
      user_id: userId,
      factuur_id: factuur.id,
      beschrijving: regel.omschrijving,
      aantal: regel.aantal || 1,
      eenheidsprijs: round2(regel.type === 'arbeid' ? (regel.uurtarief || 0) : (regel.prijs_per_eenheid || 0)),
      btw_percentage: 21,
      korting_percentage: 0,
      totaal: round2(regel.totaal),
      volgorde: volgorde++,
    } as Omit<FactuurItem, 'id' | 'created_at'>)
  }
  // Voeg kilometervergoeding toe als factuur item
  if (kmTotaal > 0) {
    await createFactuurItem({
      user_id: userId,
      factuur_id: factuur.id,
      beschrijving: `Kilometervergoeding (${werkbon.kilometers} km x €${werkbon.km_tarief})`,
      aantal: werkbon.kilometers || 0,
      eenheidsprijs: werkbon.km_tarief || 0,
      btw_percentage: 21,
      korting_percentage: 0,
      totaal: round2(kmTotaal),
      volgorde: volgorde++,
    } as Omit<FactuurItem, 'id' | 'created_at'>)
  }
  // Update werkbon status
  await updateWerkbon(werkbonId, { status: 'gefactureerd', factuur_id: factuur.id })
  return factuur
}

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
