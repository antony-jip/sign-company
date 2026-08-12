import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId,
} from './supabaseHelpers'
import { safeSetItem } from '@/utils/localStorageUtils'
import { resolvePortaalBestandUrl } from './storageService'
import type {
  Factuur,
  Offerte,
  Project,
  ProjectPortaal,
  PortaalItem,
  PortaalBestand,
  PortaalReactie,
  AppNotificatie,
  PortaalInstellingen,
} from '@/types'

// ============ BETAAL TOKEN / FACTUUR BEKIJKEN ============

export function generateBetaalToken(): string {
  return generateId()
}

// ============ OFFERTE TRACKING (Tier 2 Feature 2) ============

// ============ KLANTPORTAAL ============

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const DEFAULT_PORTAAL_INSTELLINGEN: PortaalInstellingen = {
  portaal_module_actief: true,
  portaal_standaard_actief: false,
  link_geldigheid_dagen: 30,
  instructie_tekst: 'Bekijk de items hieronder en geef uw reactie.',
  klant_kan_offerte_goedkeuren: true,
  klant_kan_tekening_goedkeuren: true,
  klant_kan_bestanden_uploaden: true,
  klant_kan_berichten_sturen: false,
  max_bestandsgrootte_mb: 10,
  email_naar_klant_bij_nieuw_item: true,
  email_naar_mij_bij_reactie: true,
  herinnering_na_dagen: 3,
  bedrijfslogo_op_portaal: true,
  bedrijfskleuren_gebruiken: true,
  portaal_header_kleur: '#1A535C',
  contactgegevens_tonen: true,
  template_portaallink: {
    onderwerp: 'Uw projectportaal bij {{bedrijfsnaam}}',
    inhoud: 'Beste {{klant_naam}},\n\nU heeft een portaallink ontvangen voor project {{project_naam}}.\n\nKlik op de onderstaande link om uw portaal te openen:\n{{portaal_link}}\n\nMet vriendelijke groet,\n{{bedrijfsnaam}}',
  },
  template_nieuw_item: {
    onderwerp: '{{bedrijfsnaam}} — nieuw {{item_type}} beschikbaar',
    inhoud: 'Beste {{klant_naam}},\n\nEr is een nieuw {{item_type}} gedeeld voor project {{project_naam}}.\n\nBekijk het via uw portaal:\n{{portaal_link}}\n\nMet vriendelijke groet,\n{{bedrijfsnaam}}',
  },
  template_herinnering: {
    onderwerp: 'Herinnering: {{item_type}} wacht op uw reactie',
    inhoud: 'Beste {{klant_naam}},\n\nU heeft nog niet gereageerd op het {{item_type}} voor project {{project_naam}}.\n\nBekijk het via uw portaal:\n{{portaal_link}}\n\nMet vriendelijke groet,\n{{bedrijfsnaam}}',
  },
}

export function getDefaultPortaalInstellingen(): PortaalInstellingen {
  return { ...DEFAULT_PORTAAL_INSTELLINGEN }
}

export async function getPortaalInstellingen(userId: string): Promise<PortaalInstellingen> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const orgId = await getOrgId()
    let data: { portaal_instellingen: unknown } | null = null
    if (orgId) {
      const res = await supabase
        .from('app_settings')
        .select('portaal_instellingen')
        .eq('organisatie_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      data = res.data
    }
    if (!data) {
      const res = await supabase
        .from('app_settings')
        .select('portaal_instellingen')
        .eq('user_id', userId)
        .maybeSingle()
      data = res.data
    }
    if (data?.portaal_instellingen && typeof data.portaal_instellingen === 'object') {
      return { ...DEFAULT_PORTAAL_INSTELLINGEN, ...(data.portaal_instellingen as Partial<PortaalInstellingen>) }
    }
  }
  const stored = localStorage.getItem('doen_portaal_instellingen')
  if (stored) return { ...DEFAULT_PORTAAL_INSTELLINGEN, ...JSON.parse(stored) }
  return { ...DEFAULT_PORTAAL_INSTELLINGEN }
}

export async function updatePortaalInstellingen(userId: string, settings: Partial<PortaalInstellingen>): Promise<PortaalInstellingen> {
  assertId(userId, 'user_id')
  const current = await getPortaalInstellingen(userId)
  const updated = { ...current, ...settings }
  if (isSupabaseConfigured() && supabase) {
    const orgId = await getOrgId()
    let existing: { id: string } | null = null
    if (orgId) {
      const { data } = await supabase
        .from('app_settings')
        .select('id')
        .eq('organisatie_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      existing = data
    }
    if (existing) {
      await supabase
        .from('app_settings')
        .update({ portaal_instellingen: updated })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('app_settings')
        .update({ portaal_instellingen: updated })
        .eq('user_id', userId)
    }
    return updated
  }
  safeSetItem('doen_portaal_instellingen', JSON.stringify(updated))
  return updated
}

export async function getAllPortalen(): Promise<(ProjectPortaal & { project_naam?: string; klant_naam?: string; klant_id?: string; items?: PortaalItem[] })[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('project_portalen')
      .select('*, portaal_items(*, portaal_reacties(*))')
      .order('updated_at', { ascending: false })
    if (error) throw error
    if (!data) return []

    // Enrich with project/klant names
    const projectIds = [...new Set(data.map((p: Record<string, unknown>) => p.project_id))]
    const { data: projecten } = await supabase
      .from('projecten')
      .select('id, naam, klant_id, klant_naam')
      .in('id', projectIds)
    const projectMap = new Map((projecten || []).map((p: Record<string, unknown>) => [p.id, p]))

    return data.map((p: Record<string, unknown>) => {
      const proj = projectMap.get(p.project_id) as Record<string, unknown> | undefined
      const items = ((p.portaal_items || []) as Record<string, unknown>[]).map(item => ({
        ...item,
        bestanden: [] as PortaalBestand[],
        reacties: (item.portaal_reacties || []) as PortaalReactie[],
      })) as PortaalItem[]
      return {
        ...p,
        project_naam: (proj?.naam as string) || '',
        klant_naam: (proj?.klant_naam as string) || '',
        klant_id: (proj?.klant_id as string) || '',
        items,
      } as ProjectPortaal & { project_naam?: string; klant_naam?: string; klant_id?: string; items?: PortaalItem[] }
    })
  }
  return getLocalData<ProjectPortaal>('project_portalen') as (ProjectPortaal & { project_naam?: string; klant_naam?: string; klant_id?: string; items?: PortaalItem[] })[]
}

export async function getPortaalByProject(projectId: string): Promise<ProjectPortaal | null> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('project_portalen')
      .select('*')
      .eq('project_id', projectId)
      .eq('actief', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const portalen = getLocalData<ProjectPortaal>('project_portalen')
  return portalen.find((p) => p.project_id === projectId && p.actief) || null
}

export async function createPortaal(projectId: string, userId: string): Promise<ProjectPortaal> {
  assertId(projectId, 'project_id')
  assertId(userId, 'user_id')
  // Check bestaand actief portaal
  const bestaand = await getPortaalByProject(projectId)
  if (bestaand) return bestaand
  const token = generateToken()
  const instellingen = await getPortaalInstellingen(userId)
  const verlooptOp = new Date()
  verlooptOp.setDate(verlooptOp.getDate() + instellingen.link_geldigheid_dagen)
  const portaal: Omit<ProjectPortaal, 'id' | 'created_at'> = {
    user_id: userId,
    project_id: projectId,
    token,
    actief: true,
    verloopt_op: verlooptOp.toISOString(),
    instructie_tekst: instellingen.instructie_tekst,
  }
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('project_portalen')
      .insert({ ...portaal, organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const nieuw: ProjectPortaal = { ...portaal, id: crypto.randomUUID(), created_at: new Date().toISOString() }
  const portalen = getLocalData<ProjectPortaal>('project_portalen')
  portalen.push(nieuw)
  setLocalData('project_portalen', portalen)
  return nieuw
}

export async function getPortaalItems(portaalId: string, alleenZichtbaar = false): Promise<PortaalItem[]> {
  assertId(portaalId, 'portaal_id')

  const resolveBestand = async (b: PortaalBestand): Promise<PortaalBestand> => ({
    ...b,
    url: (await resolvePortaalBestandUrl(b.url)) ?? b.url,
    thumbnail_url: (await resolvePortaalBestandUrl(b.thumbnail_url)) ?? b.thumbnail_url,
  })

  const resolveItem = async (item: PortaalItem): Promise<PortaalItem> => ({
    ...item,
    foto_url: (await resolvePortaalBestandUrl(item.foto_url)) ?? item.foto_url,
    bestanden: await Promise.all((item.bestanden || []).map(resolveBestand)),
  })

  // allSettled: een bestand dat niet opgelost kan worden hoort een lege plek te
  // geven, niet een portaal dat helemaal niet laadt.
  const resolveItems = async (items: PortaalItem[]): Promise<PortaalItem[]> => {
    const uitkomsten = await Promise.allSettled(items.map(resolveItem))
    return uitkomsten.map((u, i) => (u.status === 'fulfilled' ? u.value : items[i]))
  }

  if (isSupabaseConfigured() && supabase) {
    // RPC functie (SECURITY DEFINER) omzeilt RLS op portaal_reacties/bestanden
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_portaal_items', { p_portaal_id: portaalId })
      if (!rpcError && rpcData) {
        const parsed = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData
        const items = (Array.isArray(parsed) ? parsed : []) as Record<string, unknown>[]
        let result = items.map((item) => ({
          ...item,
          bestanden: (item.bestanden || []) as PortaalBestand[],
          reacties: (item.reacties || []) as PortaalReactie[],
        })) as PortaalItem[]
        if (alleenZichtbaar) result = result.filter(i => i.zichtbaar_voor_klant)
        return resolveItems(result)
      }
    } catch (rpcErr) {
      // RPC failed, fall back to direct query
    }
    // Fallback: directe query (RLS kan reacties blokkeren)
    let query = supabase
      .from('portaal_items')
      .select('*, portaal_bestanden(*), portaal_reacties(*)')
      .eq('portaal_id', portaalId)
      .order('created_at', { ascending: false })
    if (alleenZichtbaar) query = query.eq('zichtbaar_voor_klant', true)
    const { data, error } = await query
    if (error) throw error
    const gemapt = (data || []).map((item: Record<string, unknown>) => ({
      ...item,
      bestanden: (item.portaal_bestanden || []) as PortaalBestand[],
      reacties: (item.portaal_reacties || []) as PortaalReactie[],
    } as PortaalItem))
    return resolveItems(gemapt)
  }
  const items = getLocalData<PortaalItem>('portaal_items')
  let filtered = items.filter((i) => i.portaal_id === portaalId)
  if (alleenZichtbaar) filtered = filtered.filter((i) => i.zichtbaar_voor_klant)
  const bestanden = getLocalData<PortaalBestand>('portaal_bestanden')
  const reacties = getLocalData<PortaalReactie>('portaal_reacties')
  return filtered
    .map((i) => ({
      ...i,
      bestanden: bestanden.filter((b) => b.portaal_item_id === i.id),
      reacties: reacties.filter((r) => r.portaal_item_id === i.id),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function createPortaalItem(
  item: Omit<PortaalItem, 'id' | 'bestanden' | 'reacties' | 'created_at' | 'updated_at'>
): Promise<PortaalItem> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('portaal_items')
      .insert({ ...await withUserId(item), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return { ...data, bestanden: [], reacties: [] }
  }
  const nieuw: PortaalItem = { ...item, id: crypto.randomUUID(), bestanden: [], reacties: [], created_at: new Date().toISOString() }
  const items = getLocalData<PortaalItem>('portaal_items')
  items.push(nieuw)
  setLocalData('portaal_items', items)
  return nieuw
}

export async function createPortaalBestand(bestand: Omit<PortaalBestand, 'id' | 'created_at'>): Promise<PortaalBestand> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('portaal_bestanden')
      .insert(bestand)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const nieuw: PortaalBestand = { ...bestand, id: crypto.randomUUID(), created_at: new Date().toISOString() }
  const bestanden = getLocalData<PortaalBestand>('portaal_bestanden')
  bestanden.push(nieuw)
  setLocalData('portaal_bestanden', bestanden)
  return nieuw
}

// ============ APP NOTIFICATIES ============
