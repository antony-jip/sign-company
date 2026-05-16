import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'
import type { Project } from '@/types'

// Koppeling tussen één email-thread en één project (sprint mail-koppeling).
// RLS doet de organisatie-scope, geen extra filters nodig in queries.

export interface EmailProjectKoppeling {
  id: string
  organisatie_id: string
  thread_id: string
  project_id: string
  gekoppeld_door: string | null
  gekoppeld_op: string
}

/** Welk project hangt aan deze thread? (null als geen koppeling) */
export async function getProjectVoorThread(threadId: string): Promise<{ project: Project; gekoppeld_op: string } | null> {
  if (!threadId || !isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('email_project_koppelingen')
    .select('gekoppeld_op, project:projecten(*)')
    .eq('thread_id', threadId)
    .maybeSingle()
  if (error || !data?.project) return null
  // Supabase typeert join-resultaten breed; cast naar het project-type
  const project = (Array.isArray(data.project) ? data.project[0] : data.project) as Project | undefined
  if (!project) return null
  return { project, gekoppeld_op: data.gekoppeld_op as string }
}

/** Koppel een thread aan een project. Vervangt bestaande koppeling op dezelfde thread. */
export async function koppelEmailAanProject(threadId: string, projectId: string): Promise<void> {
  if (!threadId || !projectId || !isSupabaseConfigured() || !supabase) {
    throw new Error('Koppelen vereist een thread en project')
  }
  const organisatie_id = await getOrgId()
  if (!organisatie_id) throw new Error('Geen organisatie gevonden')
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('email_project_koppelingen')
    .upsert({
      organisatie_id,
      thread_id: threadId,
      project_id: projectId,
      gekoppeld_door: user?.id || null,
      gekoppeld_op: new Date().toISOString(),
    }, { onConflict: 'organisatie_id,thread_id' })
  if (error) throw error
}

/** Verwijder de koppeling van een thread. */
export async function ontkoppelEmailVanProject(threadId: string): Promise<void> {
  if (!threadId || !isSupabaseConfigured() || !supabase) return
  const { error } = await supabase
    .from('email_project_koppelingen')
    .delete()
    .eq('thread_id', threadId)
  if (error) throw error
}

/** Alle thread_ids die aan een project gekoppeld zijn. */
export async function getThreadsVoorProject(projectId: string): Promise<string[]> {
  if (!projectId || !isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('email_project_koppelingen')
    .select('thread_id')
    .eq('project_id', projectId)
  if (error || !data) return []
  return data.map((r) => r.thread_id as string)
}

/**
 * Project-suggesties bij een email-afzender:
 * - Probeer eerst klant te matchen op email (klanten.email of contactpersonen)
 * - Retourneer actieve projecten van die klant
 * Lege array = geen suggestie. UI valt dan terug op handmatig zoeken.
 */
export async function getProjectSuggestiesVoorEmail(emailAdres: string): Promise<Project[]> {
  if (!emailAdres || !isSupabaseConfigured() || !supabase) return []
  const lower = emailAdres.toLowerCase()
  // Match klanten op email (case-insensitive)
  const { data: klantenViaEmail } = await supabase
    .from('klanten')
    .select('id')
    .ilike('email', lower)
    .limit(5)
  // Match contactpersonen op email → terug naar klant_id
  const { data: contacten } = await supabase
    .from('contactpersonen')
    .select('klant_id')
    .ilike('email', lower)
    .limit(5)
  const klantIds = new Set<string>()
  for (const k of (klantenViaEmail as Array<{ id: string }> | null) || []) klantIds.add(k.id)
  for (const c of (contacten as Array<{ klant_id: string | null }> | null) || []) {
    if (c.klant_id) klantIds.add(c.klant_id)
  }
  if (klantIds.size === 0) return []
  // Actieve projecten van die klanten
  const { data: projecten } = await supabase
    .from('projecten')
    .select('*')
    .in('klant_id', Array.from(klantIds))
    .neq('status', 'afgerond')
    .order('created_at', { ascending: false })
    .limit(8)
  return (projecten as Project[] | null) || []
}

/** Zoek projecten op vrije query (titel / klant-naam). Voor de picker als suggesties leeg zijn. */
export async function zoekProjecten(query: string, limit = 12): Promise<Project[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  if (!query.trim()) {
    const { data } = await supabase
      .from('projecten')
      .select('*')
      .neq('status', 'afgerond')
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data as Project[] | null) || []
  }
  const sanitized = query.replace(/[\\%_]/g, (c) => `\\${c}`)
  const { data } = await supabase
    .from('projecten')
    .select('*')
    .or(`naam.ilike.%${sanitized}%,project_nummer.ilike.%${sanitized}%`)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as Project[] | null) || []
}
