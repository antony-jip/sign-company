import {
  supabase, isSupabaseConfigured,
  assertId, getOrgId, now,
} from './supabaseHelpers'
import type { WebsiteChatGesprek, WebsiteChatBericht, WebsiteChatAanwezigheid } from '@/types'

export async function getChatGesprekken(limit = 200): Promise<WebsiteChatGesprek[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('website_chat_gesprekken')
    .select('*')
    .order('laatste_bericht_op', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function getChatBerichten(gesprekId: string): Promise<WebsiteChatBericht[]> {
  assertId(gesprekId)
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('website_chat_berichten')
    .select('*')
    .eq('gesprek_id', gesprekId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function stuurTeamBericht(gesprekId: string, tekst: string, medewerkerId?: string): Promise<WebsiteChatBericht> {
  assertId(gesprekId)
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const orgId = await getOrgId()
  const { data, error } = await supabase
    .from('website_chat_berichten')
    .insert({ gesprek_id: gesprekId, organisatie_id: orgId, rol: 'team', tekst, medewerker_id: medewerkerId || null })
    .select()
    .single()
  if (error) throw error
  await supabase
    .from('website_chat_gesprekken')
    .update({ laatste_bericht_op: now(), team_laatst_gelezen_op: now(), updated_at: now() })
    .eq('id', gesprekId)
  return data
}

export async function markeerChatGelezen(gesprekId: string): Promise<void> {
  assertId(gesprekId)
  if (!isSupabaseConfigured() || !supabase) return
  await supabase
    .from('website_chat_gesprekken')
    .update({ team_laatst_gelezen_op: now(), updated_at: now() })
    .eq('id', gesprekId)
}

export async function sluitChatGesprek(gesprekId: string): Promise<void> {
  assertId(gesprekId)
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase
    .from('website_chat_gesprekken')
    .update({ status: 'gesloten', updated_at: now() })
    .eq('id', gesprekId)
  if (error) throw error
}

export async function getChatAanwezigheid(): Promise<WebsiteChatAanwezigheid | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('website_chat_aanwezigheid')
    .select('*')
    .maybeSingle()
  if (error) return null
  return data
}

export async function zetChatBeschikbaar(beschikbaar: boolean): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const orgId = await getOrgId()
  if (!orgId) return
  await supabase
    .from('website_chat_aanwezigheid')
    .upsert({ organisatie_id: orgId, beschikbaar, laatst_actief: now(), updated_at: now() }, { onConflict: 'organisatie_id' })
}

// Heartbeat: zolang de app openstaat geldt de org als online voor de
// website-widget (samen met de beschikbaar-toggle). Faalt stil: zonder
// migratie 135 of zonder sessie is er gewoon geen chat-aanwezigheid.
export async function chatHeartbeat(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  try {
    const orgId = await getOrgId()
    if (!orgId) return
    const { error } = await supabase
      .from('website_chat_aanwezigheid')
      .upsert({ organisatie_id: orgId, laatst_actief: now(), updated_at: now() }, { onConflict: 'organisatie_id' })
    if (error && error.code === '42P01') return
  } catch {
    // stil: heartbeat mag nooit de app storen
  }
}
