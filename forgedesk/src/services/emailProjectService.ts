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

export interface ProjectMail {
  id: string
  thread_id: string
  van: string
  aan: string
  onderwerp: string
  datum: string
  body_text: string | null
  body_html: string | null
  gelezen: boolean
  bijlagen: number
  from_name: string | null
}

/**
 * Alle mails die aan een project gekoppeld zijn via thread_id.
 * Geeft één rij per email, chronologisch nieuwste eerst. Het projectteam
 * krijgt zo de volledige communicatie te zien — past bij de transparantie-
 * conventie binnen één organisatie.
 */
export async function getEmailsVoorProject(projectId: string, limit = 100): Promise<ProjectMail[]> {
  if (!projectId || !isSupabaseConfigured() || !supabase) return []
  const threadIds = await getThreadsVoorProject(projectId)
  if (threadIds.length === 0) return []
  const { data, error } = await supabase
    .from('emails')
    .select('id, thread_id, van, aan, onderwerp, datum, body_text, body_html, gelezen, bijlagen, from_name')
    .in('thread_id', threadIds)
    .order('datum', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return (data as ProjectMail[])
}

/**
 * Project-suggesties bij een email-afzender:
 * 1. Exacte email-match op klanten.email of contactpersonen.email
 * 2. Fallback: domein-match (claudia@spandershoek.nl → @spandershoek.nl)
 *    omdat één klant vaak meerdere contactpersonen heeft die niet allemaal
 *    in contactpersonen-tabel staan.
 * Retourneert actieve projecten van die klanten. Lege array = geen match
 * gevonden; de picker valt dan terug op "zoekProjecten" voor alle actieve.
 */
export async function getProjectSuggestiesVoorEmail(emailAdres: string): Promise<Project[]> {
  if (!emailAdres || !isSupabaseConfigured() || !supabase) return []
  // Extract pure email uit "Naam <email@host>" formaat
  const match = emailAdres.match(/<([^>]+)>/)
  const cleanEmail = (match ? match[1] : emailAdres).toLowerCase().trim()
  if (!cleanEmail.includes('@')) return []
  const domain = cleanEmail.split('@')[1] || ''

  // Generieke mail-providers zijn nutteloos voor klant-match (zou alle
  // gmail-users aan elkaar koppelen). Skip domein-match in dat geval.
  const genericDomains = new Set([
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.nl',
    'ziggo.nl', 'kpnmail.nl', 'xs4all.nl', 'planet.nl', 'hetnet.nl',
    'home.nl', 'upcmail.nl', 'icloud.com', 'me.com',
  ])
  const allowDomainMatch = domain && !genericDomains.has(domain)

  const klantIds = new Set<string>()

  // Stap 1: exacte match
  const [klantenExact, contactenExact] = await Promise.all([
    supabase.from('klanten').select('id').ilike('email', cleanEmail).limit(5),
    supabase.from('contactpersonen').select('klant_id').ilike('email', cleanEmail).limit(5),
  ])
  for (const k of (klantenExact.data as Array<{ id: string }> | null) || []) klantIds.add(k.id)
  for (const c of (contactenExact.data as Array<{ klant_id: string | null }> | null) || []) {
    if (c.klant_id) klantIds.add(c.klant_id)
  }

  // Stap 2: domein-match (alleen als exact niets opleverde én domein zinvol is)
  if (klantIds.size === 0 && allowDomainMatch) {
    const domainPattern = `%@${domain}`
    const [klantenDomein, contactenDomein] = await Promise.all([
      supabase.from('klanten').select('id').ilike('email', domainPattern).limit(10),
      supabase.from('contactpersonen').select('klant_id').ilike('email', domainPattern).limit(10),
    ])
    for (const k of (klantenDomein.data as Array<{ id: string }> | null) || []) klantIds.add(k.id)
    for (const c of (contactenDomein.data as Array<{ klant_id: string | null }> | null) || []) {
      if (c.klant_id) klantIds.add(c.klant_id)
    }
  }

  if (klantIds.size === 0) return []

  const { data: projecten } = await supabase
    .from('projecten')
    .select('*')
    .in('klant_id', Array.from(klantIds))
    .neq('status', 'afgerond')
    .order('created_at', { ascending: false })
    .limit(8)
  return (projecten as Project[] | null) || []
}

/** Eén project ophalen op id. Voor de compose-mode om parent-controlled selectie te resolven. */
export async function getProjectById(id: string): Promise<Project | null> {
  if (!id || !isSupabaseConfigured() || !supabase) return null
  const { data } = await supabase
    .from('projecten')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as Project | null) || null
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
