import supabase, { isSupabaseConfigured } from './supabaseClient'
import type {
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
} from '@/types'

// ============ HELPERS ============

function getLocalData<T>(key: string): T[] {
  const data = localStorage.getItem(`workmate_${key}`)
  return data ? JSON.parse(data) : []
}

function setLocalData<T>(key: string, data: T[]): void {
  localStorage.setItem(`workmate_${key}`, JSON.stringify(data))
}

function generateId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

// ============ KLANTEN ============

function ensureContactpersonen(klant: any): Klant {
  return { ...klant, contactpersonen: klant.contactpersonen || [] }
}

export async function getKlanten(): Promise<Klant[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('klanten')
      .select('*')
      .order('bedrijfsnaam')
    if (error) throw error
    return (data || []).map(ensureContactpersonen)
  }
  return getLocalData<Klant>('klanten').map(ensureContactpersonen)
}

export async function getKlant(id: string): Promise<Klant | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('klanten')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data ? ensureContactpersonen(data) : null
  }
  const klanten = getLocalData<Klant>('klanten')
  const found = klanten.find((k) => k.id === id)
  return found ? ensureContactpersonen(found) : null
}

export async function createKlant(klant: Omit<Klant, 'id' | 'created_at' | 'updated_at'>): Promise<Klant> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('klanten')
      .insert(klant)
      .select()
      .single()
    if (error) throw error
    return data
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
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('klanten')
      .update({ ...updates, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const klanten = getLocalData<Klant>('klanten')
  const index = klanten.findIndex((k) => k.id === id)
  if (index === -1) throw new Error('Klant niet gevonden')
  klanten[index] = { ...klanten[index], ...updates, updated_at: now() }
  setLocalData('klanten', klanten)
  return klanten[index]
}

export async function deleteKlant(id: string): Promise<void> {
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
    return (data || []).map((p: any) => ({
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
    const { data, error } = await supabase
      .from('offertes')
      .select('*, klanten(bedrijfsnaam)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((o: any) => ({
      ...o,
      klant_naam: o.klanten?.bedrijfsnaam || '',
    }))
  }
  const offertes = getLocalData<Offerte>('offertes')
  const klanten = getLocalData<Klant>('klanten')
  return offertes.map((o) => ({
    ...o,
    klant_naam: klanten.find((k) => k.id === o.klant_id)?.bedrijfsnaam || '',
  }))
}

export async function getOfferte(id: string): Promise<Offerte | null> {
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
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('offertes')
      .select('*, klanten(bedrijfsnaam)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((o: any) => ({
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

export async function createOfferte(offerte: Omit<Offerte, 'id' | 'created_at' | 'updated_at' | 'klant_naam'>): Promise<Offerte> {
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
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('offerte_items').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<OfferteItem>('offerte_items')
  setLocalData('offerte_items', items.filter((i) => i.id !== id))
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
      user_id: 'demo',
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
  { key: 'bekeken', label: 'Bekeken', kleur: 'purple', volgorde: 2, actief: true },
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
      'Dashboard', 'Projecten', 'Taken', 'Klanten', 'Offertes', 'Documenten',
      'Email', 'Nieuwsbrieven', 'Kalender', 'Financieel', 'Importeren', 'AI Assistent', 'Instellingen',
    ],
    calculatie_categorieen: ['Materiaal', 'Arbeid', 'Transport', 'Apparatuur', 'Overig'],
    calculatie_eenheden: ['stuks', 'm\u00B2', 'm\u00B9', 'uur', 'dag', 'meter', 'kg', 'set'],
    calculatie_standaard_marge: 35,
    calculatie_toon_inkoop_in_offerte: false,
    offerte_regel_velden: ['Materiaal', 'Lay-out', 'Montage', 'Opmerking'],
    created_at: now(),
    updated_at: now(),
  }
}

export async function getAppSettings(userId: string): Promise<AppSettings> {
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
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('facturen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Factuur>('facturen')
  setLocalData('facturen', items.filter((f) => f.id !== id))
}

export async function getFactuurItems(factuurId: string): Promise<FactuurItem[]> {
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
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('montage_afspraken').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<MontageAfspraak>('montage_afspraken')
  setLocalData('montage_afspraken', items.filter((a) => a.id !== id))
}
