import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId,
} from './supabaseHelpers'
import { safeSetItem } from '@/utils/localStorageUtils'
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

export async function getFactuurByBetaalToken(token: string): Promise<Factuur | null> {
  assertId(token, 'betaal_token')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').select('*').eq('betaal_token', token).maybeSingle()
    if (error) return null
    return data
  }
  return getLocalData<Factuur>('facturen').find((f) => f.betaal_token === token) || null
}

export async function markFactuurBekeken(token: string): Promise<void> {
  assertId(token, 'betaal_token')
  const factuur = await getFactuurByBetaalToken(token)
  if (!factuur) return
  const updates: Partial<Factuur> = {
    online_bekeken: true,
    online_bekeken_op: factuur.online_bekeken_op || now(),
  }
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('facturen').update({ ...updates, updated_at: now() }).eq('id', factuur.id)
    return
  }
  const items = getLocalData<Factuur>('facturen')
  const index = items.findIndex((f) => f.id === factuur.id)
  if (index !== -1) {
    items[index] = { ...items[index], ...updates, updated_at: now() }
    setLocalData('facturen', items)
  }
}

// ============ OFFERTE TRACKING (Tier 2 Feature 2) ============

export async function getOfferteByPubliekToken(token: string): Promise<Offerte | null> {
  assertId(token, 'publiek_token')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('offertes').select('*').eq('publiek_token', token).maybeSingle()
    if (error) return null
    return data
  }
  return getLocalData<Offerte>('offertes').find((o) => o.publiek_token === token) || null
}

export async function updateOfferteTracking(token: string): Promise<void> {
  assertId(token, 'publiek_token')
  const offerte = await getOfferteByPubliekToken(token)
  if (!offerte) return
  const updates: Partial<Offerte> = {
    bekeken_door_klant: true,
    eerste_bekeken_op: offerte.eerste_bekeken_op || now(),
    laatst_bekeken_op: now(),
    aantal_keer_bekeken: (offerte.aantal_keer_bekeken || 0) + 1,
    status: offerte.status === 'verzonden' ? 'bekeken' : offerte.status,
  }
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('offertes').update({ ...updates, updated_at: now() }).eq('id', offerte.id)
    return
  }
  const items = getLocalData<Offerte>('offertes')
  const index = items.findIndex((o) => o.id === offerte.id)
  if (index !== -1) {
    items[index] = { ...items[index], ...updates, updated_at: now() }
    setLocalData('offertes', items)
  }
}

export async function respondOpOfferte(token: string, reactie: { type: 'goedgekeurd' | 'afgewezen' | 'vraag'; bericht?: string; naam?: string }): Promise<void> {
  assertId(token, 'publiek_token')
  const offerte = await getOfferteByPubliekToken(token)
  if (!offerte) throw new Error('Offerte niet gevonden')
  const statusMap: Record<string, Offerte['status']> = {
    goedgekeurd: 'goedgekeurd',
    afgewezen: 'afgewezen',
    vraag: offerte.status,
  }
  const updates: Partial<Offerte> = {
    status: statusMap[reactie.type],
    follow_up_notitie: reactie.type === 'vraag' ? reactie.bericht : offerte.follow_up_notitie,
  }
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('offertes').update({ ...updates, updated_at: now() }).eq('id', offerte.id)
  } else {
    const items = getLocalData<Offerte>('offertes')
    const index = items.findIndex((o) => o.id === offerte.id)
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updated_at: now() }
      setLocalData('offertes', items)
    }
  }
}

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
    const { data } = await supabase
      .from('app_settings')
      .select('portaal_instellingen')
      .eq('user_id', userId)
      .maybeSingle()
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
    await supabase
      .from('app_settings')
      .update({ portaal_instellingen: updated })
      .eq('user_id', userId)
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

export async function getPortaalByToken(token: string): Promise<ProjectPortaal | null> {
  assertId(token, 'token')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('project_portalen')
      .select('*')
      .eq('token', token)
      .maybeSingle()
    if (error) return null
    return data
  }
  const portalen = getLocalData<ProjectPortaal>('project_portalen')
  return portalen.find((p) => p.token === token) || null
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

export async function verlengPortaal(portaalId: string): Promise<ProjectPortaal> {
  assertId(portaalId, 'portaal_id')
  const verlooptOp = new Date()
  verlooptOp.setDate(verlooptOp.getDate() + 30)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('project_portalen')
      .update({ verloopt_op: verlooptOp.toISOString(), updated_at: new Date().toISOString() })
      .eq('id', portaalId)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const portalen = getLocalData<ProjectPortaal>('project_portalen')
  const idx = portalen.findIndex((p) => p.id === portaalId)
  if (idx === -1) throw new Error('Portaal niet gevonden')
  portalen[idx].verloopt_op = verlooptOp.toISOString()
  portalen[idx].updated_at = new Date().toISOString()
  setLocalData('project_portalen', portalen)
  return portalen[idx]
}

export async function deactiveerPortaal(portaalId: string): Promise<void> {
  assertId(portaalId, 'portaal_id')
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('project_portalen')
      .update({ actief: false, updated_at: new Date().toISOString() })
      .eq('id', portaalId)
    if (error) throw error
    return
  }
  const portalen = getLocalData<ProjectPortaal>('project_portalen')
  const idx = portalen.findIndex((p) => p.id === portaalId)
  if (idx >= 0) {
    portalen[idx].actief = false
    setLocalData('project_portalen', portalen)
  }
}

export async function getPortaalItems(portaalId: string, alleenZichtbaar = false): Promise<PortaalItem[]> {
  assertId(portaalId, 'portaal_id')
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
        return result
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
    return (data || []).map((item: Record<string, unknown>) => ({
      ...item,
      bestanden: (item.portaal_bestanden || []) as PortaalBestand[],
      reacties: (item.portaal_reacties || []) as PortaalReactie[],
    })) as PortaalItem[]
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

export async function updatePortaalItem(itemId: string, updates: Partial<PortaalItem>): Promise<void> {
  assertId(itemId, 'item_id')
  const { bestanden: _b, reacties: _r, ...cleanUpdates } = updates
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('portaal_items')
      .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
    if (error) throw error
    return
  }
  const items = getLocalData<PortaalItem>('portaal_items')
  const idx = items.findIndex((i) => i.id === itemId)
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...cleanUpdates, updated_at: new Date().toISOString() }
    setLocalData('portaal_items', items)
  }
}

export async function deletePortaalItem(itemId: string): Promise<void> {
  assertId(itemId, 'item_id')
  await updatePortaalItem(itemId, { zichtbaar_voor_klant: false })
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

export async function createPortaalReactie(reactie: Omit<PortaalReactie, 'id' | 'created_at'>): Promise<PortaalReactie> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('portaal_reacties')
      .insert(await withUserId(reactie))
      .select()
      .single()
    if (error) throw error
    return data
  }
  const nieuw: PortaalReactie = { ...reactie, id: crypto.randomUUID(), created_at: new Date().toISOString() }
  const reacties = getLocalData<PortaalReactie>('portaal_reacties')
  reacties.push(nieuw)
  setLocalData('portaal_reacties', reacties)
  return nieuw
}

// ============ APP NOTIFICATIES ============

export async function getAppNotificaties(userId: string, onlyUnread = false): Promise<AppNotificatie[]> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    let query = supabase
      .from('app_notificaties')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (onlyUnread) query = query.eq('gelezen', false)
    const { data, error } = await query
    if (error) throw error
    return data || []
  }
  const items = getLocalData<AppNotificatie>('app_notificaties')
  let filtered = items.filter((n) => n.user_id === userId)
  if (onlyUnread) filtered = filtered.filter((n) => !n.gelezen)
  return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50)
}

export async function createAppNotificatie(notificatie: Omit<AppNotificatie, 'id' | 'gelezen' | 'actie_genomen' | 'created_at'>): Promise<AppNotificatie> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('app_notificaties')
      .insert(await withUserId(notificatie))
      .select()
      .single()
    if (error) throw error
    return data
  }
  const nieuw: AppNotificatie = { ...notificatie, id: crypto.randomUUID(), gelezen: false, actie_genomen: false, created_at: new Date().toISOString() }
  const items = getLocalData<AppNotificatie>('app_notificaties')
  items.push(nieuw)
  setLocalData('app_notificaties', items)
  return nieuw
}

export async function markeerNotificatieGelezen(notificatieId: string): Promise<void> {
  assertId(notificatieId, 'notificatie_id')
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('app_notificaties').update({ gelezen: true }).eq('id', notificatieId)
    return
  }
  const items = getLocalData<AppNotificatie>('app_notificaties')
  const idx = items.findIndex((n) => n.id === notificatieId)
  if (idx >= 0) {
    items[idx].gelezen = true
    setLocalData('app_notificaties', items)
  }
}

export async function markeerAlleNotificatiesGelezen(userId: string): Promise<void> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('app_notificaties').update({ gelezen: true }).eq('user_id', userId).eq('gelezen', false)
    return
  }
  const items = getLocalData<AppNotificatie>('app_notificaties')
  items.forEach((n) => { if (n.user_id === userId) n.gelezen = true })
  setLocalData('app_notificaties', items)
}

export async function updateNotificatieActie(notificatieId: string): Promise<void> {
  assertId(notificatieId, 'notificatie_id')
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('app_notificaties').update({ actie_genomen: true, gelezen: true }).eq('id', notificatieId)
    return
  }
  const items = getLocalData<AppNotificatie>('app_notificaties')
  const idx = items.findIndex((n) => n.id === notificatieId)
  if (idx >= 0) {
    items[idx].actie_genomen = true
    items[idx].gelezen = true
    setLocalData('app_notificaties', items)
  }
}

export async function getAllePortalen(userId: string): Promise<(ProjectPortaal & { project?: Project; items_count?: number })[]> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('project_portalen')
      .select('*, projecten(id, naam, klant_id, status)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((p: Record<string, unknown>) => ({
      ...p,
      project: p.projecten as Project | undefined,
    })) as (ProjectPortaal & { project?: Project })[]
  }
  const portalen = getLocalData<ProjectPortaal>('project_portalen')
  return portalen.filter((p) => p.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at))
}
