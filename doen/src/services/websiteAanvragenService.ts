import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, now,
} from './supabaseHelpers'
import type { WebsiteAanvraag } from '@/types'

export async function getWebsiteAanvragen(limit = 500): Promise<WebsiteAanvraag[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('website_aanvragen').select('*').order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return data || []
  }
  return getLocalData<WebsiteAanvraag>('website_aanvragen')
}

export async function updateWebsiteAanvraag(id: string, updates: Partial<WebsiteAanvraag>): Promise<WebsiteAanvraag> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('website_aanvragen').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<WebsiteAanvraag>('website_aanvragen')
  const index = items.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('WebsiteAanvraag niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('website_aanvragen', items)
  return items[index]
}
