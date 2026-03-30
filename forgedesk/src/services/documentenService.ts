import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId,
} from './supabaseHelpers'
import type { Document, DocumentStyle } from '@/types'

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
      .maybeSingle()
    if (error) throw error
    return data
  }
  const documenten = getLocalData<Document>('documenten')
  return documenten.find((d) => d.id === id) || null
}

export async function createDocument(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('documenten')
      .insert({ ...await withUserId(document), organisatie_id: _orgId })
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

// ============ DOCUMENT STYLES / HUISSTIJL ============

export async function getDocumentStyle(userId: string): Promise<DocumentStyle | null> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('document_styles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const styles = getLocalData<DocumentStyle>('document_styles')
  return styles.find((s) => s.user_id === userId) || null
}

export async function upsertDocumentStyle(userId: string, style: Partial<DocumentStyle>): Promise<DocumentStyle> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    // Strip invalid id (empty string is not a valid UUID)
    const { id: styleId, ...styleWithoutId } = style as any
    const cleanStyle = (styleId && typeof styleId === 'string' && styleId.length > 10) ? style : styleWithoutId

    const { data: existing } = await supabase
      .from('document_styles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      const { id: _id, ...updateFields } = cleanStyle as any
      const { data, error } = await supabase
        .from('document_styles')
        .update({ ...updateFields, updated_at: now() })
        .eq('user_id', userId)
        .select()
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Document stijl niet gevonden')
      return data
    } else {
      const { id: _id, ...insertFields } = cleanStyle as any
      const { data, error } = await supabase
        .from('document_styles')
        .insert({ ...insertFields, user_id: userId, created_at: now(), updated_at: now() })
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
      vervolgpapier_url: '',
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

export async function uploadVervolgpapier(userId: string, file: File): Promise<string> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const ext = file.name.split('.').pop() || 'png'
    const path = `${userId}/vervolgpapier_${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('briefpapier')
      .upload(path, file, { upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage
      .from('briefpapier')
      .getPublicUrl(path)
    return urlData.publicUrl
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ============ DOCUMENTEN BY RELATIE ============

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
