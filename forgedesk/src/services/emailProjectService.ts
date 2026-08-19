import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'
import { zoekKlantIdsOpNaam } from './projectService'
import type { Project } from '@/types'

/**
 * De klantnaam zit niet in projecten maar in de gejoinde klanten-rij. Zonder
 * die naam zie je in een lijst met "Gevelbord" en "Gevelreclame" niet bij wie
 * je zit, dus elke query hier haalt hem mee en plat hem naar klant_naam.
 */
type ProjectMetKlant = Project & { klanten?: { bedrijfsnaam?: string } | null }
const PROJECT_SELECT = '*, klanten(bedrijfsnaam)'
function metKlantNaam(rij: ProjectMetKlant): Project {
  const { klanten, ...project } = rij
  return { ...project, klant_naam: klanten?.bedrijfsnaam || '' } as Project
}

// Koppeling tussen één email-thread en één project (sprint mail-koppeling).
// RLS doet de organisatie-scope, geen extra filters nodig in queries.

/** Welk project hangt aan deze thread? (null als geen koppeling) */
export async function getProjectVoorThread(threadId: string): Promise<{ project: Project; gekoppeld_op: string } | null> {
  if (!threadId || !isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('email_project_koppelingen')
    .select('gekoppeld_op, project:projecten(*, klanten(bedrijfsnaam))')
    .eq('thread_id', threadId)
    .maybeSingle()
  if (error || !data?.project) return null
  // Supabase typeert join-resultaten breed; cast naar het project-type
  const rij = (Array.isArray(data.project) ? data.project[0] : data.project) as ProjectMetKlant | undefined
  if (!rij) return null
  return { project: metKlantNaam(rij), gekoppeld_op: data.gekoppeld_op as string }
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
  // Het Message-ID uit de mailheader. Nodig om vanuit een project een antwoord
  // te sturen dat bij de ontvanger in hetzelfde gesprek belandt.
  message_id: string | null
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
    .select('id, thread_id, van, aan, onderwerp, datum, body_text, body_html, gelezen, bijlagen, from_name, message_id')
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
    .select(PROJECT_SELECT)
    .in('klant_id', Array.from(klantIds))
    .neq('status', 'afgerond')
    .order('created_at', { ascending: false })
    .limit(8)
  return ((projecten as ProjectMetKlant[] | null) || []).map(metKlantNaam)
}

/** Eén project ophalen op id. Voor de compose-mode om parent-controlled selectie te resolven. */
export async function getProjectById(id: string): Promise<Project | null> {
  if (!id || !isSupabaseConfigured() || !supabase) return null
  const { data } = await supabase
    .from('projecten')
    .select(PROJECT_SELECT)
    .eq('id', id)
    .maybeSingle()
  return data ? metKlantNaam(data as ProjectMetKlant) : null
}

/** Zoek projecten op vrije query (naam / nummer / klantnaam). Voor de picker als suggesties leeg zijn. */
export async function zoekProjecten(query: string, limit = 12): Promise<Project[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  if (!query.trim()) {
    const { data } = await supabase
      .from('projecten')
      .select(PROJECT_SELECT)
      .neq('status', 'afgerond')
      .order('created_at', { ascending: false })
      .limit(limit)
    return ((data as ProjectMetKlant[] | null) || []).map(metKlantNaam)
  }
  // Komma en haakjes zijn structuur in de or-syntax van PostgREST, % en _ zijn
  // jokers in ilike: allemaal eruit zodat een zoekterm een zoekterm blijft.
  const veilig = query.replace(/[,%_()"*\\]/g, '').trim()
  if (!veilig) return []
  const klantIds = await zoekKlantIdsOpNaam(veilig)
  const filters = [`naam.ilike.%${veilig}%`, `project_nummer.ilike.%${veilig}%`]
  if (klantIds.length > 0) filters.push(`klant_id.in.(${klantIds.join(',')})`)
  const { data } = await supabase
    .from('projecten')
    .select(PROJECT_SELECT)
    .or(filters.join(','))
    .order('created_at', { ascending: false })
    .limit(limit)
  return ((data as ProjectMetKlant[] | null) || []).map(metKlantNaam)
}
