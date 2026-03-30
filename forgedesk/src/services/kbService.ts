import {
  supabase, isSupabaseConfigured,
  getLocalData, setLocalData,
  withUserId,
} from './supabaseHelpers'

function createLocalItem<T extends { id?: string; created_at?: string }>(key: string, item: Omit<T, 'id' | 'created_at'>): T {
  const nieuw = { ...item, id: crypto.randomUUID(), created_at: new Date().toISOString() } as T
  const items = getLocalData<T>(key)
  items.push(nieuw)
  setLocalData(key, items)
  return nieuw
}

function updateLocalItem<T extends { id: string }>(key: string, id: string, updates: Partial<T>): T {
  const items = getLocalData<T>(key)
  const index = items.findIndex((i) => i.id === id)
  if (index === -1) throw new Error(`Item ${id} niet gevonden in ${key}`)
  items[index] = { ...items[index], ...updates, updated_at: new Date().toISOString() } as T
  setLocalData(key, items)
  return items[index]
}

function deleteLocalItem<T extends { id: string }>(key: string, id: string): void {
  const items = getLocalData<T>(key)
  setLocalData(key, items.filter((i) => i.id !== id))
}

export async function getKbCategories(): Promise<import('@/types').KbCategory[]> {
  if (!isSupabaseConfigured() || !supabase) return getLocalData<import('@/types').KbCategory>('kb_categories')
  const { data, error } = await supabase.from('kb_categories').select('*').order('volgorde')
  if (error) throw error
  return data || []
}

export async function createKbCategory(cat: Omit<import('@/types').KbCategory, 'id' | 'created_at' | 'updated_at'>): Promise<import('@/types').KbCategory> {
  if (!isSupabaseConfigured() || !supabase) return createLocalItem('kb_categories', cat)
  const { data, error } = await supabase.from('kb_categories').insert(withUserId(cat)).select().single()
  if (error) throw error
  return data
}

export async function updateKbCategory(id: string, updates: Partial<import('@/types').KbCategory>): Promise<import('@/types').KbCategory> {
  if (!isSupabaseConfigured() || !supabase) return updateLocalItem('kb_categories', id, updates)
  const { data, error } = await supabase.from('kb_categories').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteKbCategory(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) { deleteLocalItem('kb_categories', id); return }
  const { error } = await supabase.from('kb_categories').delete().eq('id', id)
  if (error) throw error
}

export async function getKbArticles(): Promise<import('@/types').KbArticle[]> {
  if (!isSupabaseConfigured() || !supabase) return getLocalData<import('@/types').KbArticle>('kb_articles')
  const { data, error } = await supabase.from('kb_articles').select('*, kb_categories(naam)').order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []).map((a: Record<string, unknown>) => ({
    ...a,
    bijlagen: a.bijlagen || [],
    zoek_tags: a.zoek_tags || [],
    category_naam: (a.kb_categories as Record<string, unknown> | null)?.naam as string | undefined,
  })) as import('@/types').KbArticle[]
}

export async function getKbArticle(id: string): Promise<import('@/types').KbArticle | null> {
  if (!isSupabaseConfigured() || !supabase) return getLocalData<import('@/types').KbArticle>('kb_articles').find(a => a.id === id) || null
  const { data, error } = await supabase.from('kb_articles').select('*, kb_categories(naam)').eq('id', id).maybeSingle()
  if (error || !data) return null
  return { ...data, bijlagen: data.bijlagen || [], zoek_tags: data.zoek_tags || [], category_naam: (data.kb_categories as Record<string, unknown> | null)?.naam as string | undefined } as import('@/types').KbArticle
}

export async function createKbArticle(article: Omit<import('@/types').KbArticle, 'id' | 'created_at' | 'updated_at' | 'category_naam'>): Promise<import('@/types').KbArticle> {
  if (!isSupabaseConfigured() || !supabase) return createLocalItem('kb_articles', article)
  const { data, error } = await supabase.from('kb_articles').insert(withUserId(article)).select().single()
  if (error) throw error
  return data
}

export async function updateKbArticle(id: string, updates: Partial<import('@/types').KbArticle>): Promise<import('@/types').KbArticle> {
  const { category_naam: _, ...clean } = updates as Record<string, unknown> & { category_naam?: unknown }
  if (!isSupabaseConfigured() || !supabase) return updateLocalItem<import('@/types').KbArticle>('kb_articles', id, clean as Partial<import('@/types').KbArticle>)
  const { data, error } = await supabase.from('kb_articles').update({ ...clean, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteKbArticle(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) { deleteLocalItem('kb_articles', id); return }
  const { error } = await supabase.from('kb_articles').delete().eq('id', id)
  if (error) throw error
}
