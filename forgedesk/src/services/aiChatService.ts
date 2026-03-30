import {
  supabase, isSupabaseConfigured,
  getLocalData, setLocalData, generateId, now,
  withUserId,
} from './supabaseHelpers'
import type { AIChat } from '@/types'

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
      .insert(await withUserId(chat))
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
