import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates, getMaxNummer,
} from './supabaseHelpers'
import type {
  Klant,
  Project,
  Taak,
  ProjectToewijzing,
  ProjectFoto,
  Tijdregistratie,
} from '@/types'

// ============ PROJECTEN ============

export async function getProjecten(limit = 5000): Promise<Project[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('projecten')
      .select('*, klanten(bedrijfsnaam)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data || []).map((p: Project & { klanten?: { bedrijfsnaam?: string } }) => ({
      ...p,
      klant_naam: p.klanten?.bedrijfsnaam || '',
    }))
  }
  const projecten = getLocalData<Project>('projecten')
  const klanten = getLocalData<Klant>('klanten')
  return projecten.map((p) => ({
    ...p,
    klant_naam: klanten.find((k) => k.id === p.klant_id)?.bedrijfsnaam || '',
  }))
}

export async function getProject(id: string): Promise<Project | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('projecten')
      .select('*, klanten(bedrijfsnaam)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? { ...data, klant_naam: data.klanten?.bedrijfsnaam || '' } : null
  }
  const projecten = getLocalData<Project>('projecten')
  const klanten = getLocalData<Klant>('klanten')
  const project = projecten.find((p) => p.id === id)
  if (!project) return null
  return { ...project, klant_naam: klanten.find((k) => k.id === project.klant_id)?.bedrijfsnaam || '' }
}

export async function getProjectenByKlant(klantId: string): Promise<Project[]> {
  assertId(klantId, 'klant_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('projecten')
      .select('*')
      .eq('klant_id', klantId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const projecten = getLocalData<Project>('projecten')
  return projecten.filter((p) => p.klant_id === klantId)
}

export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'klant_naam'>): Promise<Project> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('projecten')
      .insert({ ...await withUserId(sanitizeDates(project)), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const projecten = getLocalData<Project>('projecten')
  const newProject: Project = {
    ...project,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as Project
  projecten.push(newProject)
  setLocalData('projecten', projecten)
  return newProject
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('projecten')
      .update(sanitizeDates({ ...updates, updated_at: now() }))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const projecten = getLocalData<Project>('projecten')
  const index = projecten.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Project niet gevonden')
  projecten[index] = { ...projecten[index], ...updates, updated_at: now() }
  setLocalData('projecten', projecten)
  return projecten[index]
}

export async function deleteProject(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    // Check op gekoppelde werkbonnen en offertes
    const [werkbonnen, offertes] = await Promise.all([
      supabase.from('werkbonnen').select('id', { count: 'exact', head: true }).eq('project_id', id),
      supabase.from('offertes').select('id', { count: 'exact', head: true }).eq('project_id', id),
    ])
    const totaal = (werkbonnen.count || 0) + (offertes.count || 0)
    if (totaal > 0) {
      throw new Error(`Project heeft nog ${werkbonnen.count || 0} werkbon(nen) en ${offertes.count || 0} offerte(s). Verwijder deze eerst.`)
    }
    const { error } = await supabase.from('projecten').delete().eq('id', id)
    if (error) throw error
    return
  }
  const projecten = getLocalData<Project>('projecten')
  setLocalData('projecten', projecten.filter((p) => p.id !== id))
}

// ============ TAKEN ============

export async function getTaken(limit = 500): Promise<Taak[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('taken')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  }
  return getLocalData<Taak>('taken')
}

export async function getTaak(id: string): Promise<Taak | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('taken')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const taken = getLocalData<Taak>('taken')
  return taken.find((t) => t.id === id) || null
}

export async function getTakenByProject(projectId: string): Promise<Taak[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('taken')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const taken = getLocalData<Taak>('taken')
  return taken.filter((t) => t.project_id === projectId)
}

export async function createTaak(taak: Omit<Taak, 'id' | 'created_at' | 'updated_at'>): Promise<Taak> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('taken')
      .insert({ ...await withUserId(sanitizeDates(taak)), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const taken = getLocalData<Taak>('taken')
  const newTaak: Taak = {
    ...taak,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  } as Taak
  taken.push(newTaak)
  setLocalData('taken', taken)
  return newTaak
}

export async function uploadTaakBijlage(taakId: string, file: File): Promise<string> {
  if (isSupabaseConfigured() && supabase) {
    const storagePath = `taken/${taakId}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage
      .from('project-fotos')
      .upload(storagePath, file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('project-fotos').getPublicUrl(storagePath)
    return data.publicUrl
  }
  // localStorage fallback: read file as data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Kon bestand niet lezen'))
    reader.readAsDataURL(file)
  })
}

export async function updateTaak(id: string, updates: Partial<Taak>): Promise<Taak> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('taken')
      .update(sanitizeDates({ ...updates, updated_at: now() }))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const taken = getLocalData<Taak>('taken')
  const index = taken.findIndex((t) => t.id === id)
  if (index === -1) throw new Error('Taak niet gevonden')
  taken[index] = { ...taken[index], ...updates, updated_at: now() }
  setLocalData('taken', taken)
  return taken[index]
}

export async function deleteTaak(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('taken').delete().eq('id', id)
    if (error) throw error
    return
  }
  const taken = getLocalData<Taak>('taken')
  setLocalData('taken', taken.filter((t) => t.id !== id))
}

// ============ TIJDREGISTRATIE HELPERS ============

export async function getTijdregistratiesByProject(projectId: string): Promise<Tijdregistratie[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('tijdregistraties').select('*').eq('project_id', projectId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Tijdregistratie>('tijdregistraties').filter((t) => t.project_id === projectId)
}

// ============ PROJECT TOEWIJZINGEN ============

export async function getProjectToewijzingen(projectId: string): Promise<ProjectToewijzing[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('project_toewijzingen').select('*').eq('project_id', projectId)
    if (error) throw error
    return data || []
  }
  return getLocalData<ProjectToewijzing>('project_toewijzingen').filter((t) => t.project_id === projectId)
}

export async function getProjectToewijzingenVoorMedewerker(medewerkerId: string): Promise<ProjectToewijzing[]> {
  assertId(medewerkerId, 'medewerker_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('project_toewijzingen').select('*').eq('medewerker_id', medewerkerId)
    if (error) throw error
    return data || []
  }
  return getLocalData<ProjectToewijzing>('project_toewijzingen').filter((t) => t.medewerker_id === medewerkerId)
}

export async function createProjectToewijzing(toewijzing: Omit<ProjectToewijzing, 'id' | 'created_at'>): Promise<ProjectToewijzing> {
  const newToewijzing: ProjectToewijzing = { ...toewijzing, id: generateId(), created_at: now() } as ProjectToewijzing
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('project_toewijzingen').insert(await withUserId(newToewijzing)).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<ProjectToewijzing>('project_toewijzingen')
  items.push(newToewijzing)
  setLocalData('project_toewijzingen', items)
  return newToewijzing
}

export async function deleteProjectToewijzing(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('project_toewijzingen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<ProjectToewijzing>('project_toewijzingen')
  setLocalData('project_toewijzingen', items.filter((t) => t.id !== id))
}

// ============ PROJECT FOTO'S ============

const PHOTO_BUCKET = 'project-fotos'

export async function getProjectFotos(projectId: string): Promise<ProjectFoto[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('project_fotos')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<ProjectFoto>('project_fotos').filter((f) => f.project_id === projectId)
}

export async function createProjectFoto(
  foto: { user_id: string; project_id: string; omschrijving: string; type?: string },
  file: File,
): Promise<ProjectFoto> {
  assertId(foto.user_id, 'user_id')
  assertId(foto.project_id, 'project_id')
  const storagePath = `${foto.project_id}/${Date.now()}_${file.name}`

  let url: string

  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(storagePath, file, { cacheControl: '3600', upsert: false })
    if (uploadError) throw uploadError
    const { data: urlData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath)
    url = urlData.publicUrl

    const { data, error } = await supabase
      .from('project_fotos')
      .insert({ organisatie_id: _orgId,
        user_id: foto.user_id,
        project_id: foto.project_id,
        url,
        omschrijving: foto.omschrijving,
        type: foto.type || 'situatie',
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  // localStorage fallback: store base64
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  url = dataUrl

  const record: ProjectFoto = {
    id: crypto.randomUUID(),
    user_id: foto.user_id,
    project_id: foto.project_id,
    url,
    omschrijving: foto.omschrijving,
    type: foto.type || 'situatie',
    created_at: now(),
  }
  const all = getLocalData<ProjectFoto>('project_fotos')
  all.push(record)
  setLocalData('project_fotos', all)
  return record
}

export async function deleteProjectFoto(id: string): Promise<void> {
  assertId(id, 'id')
  if (isSupabaseConfigured() && supabase) {
    // Get the foto record to find the storage path
    const { data: foto } = await supabase.from('project_fotos').select('url').eq('id', id).maybeSingle()
    if (foto?.url) {
      // Try to extract storage path from URL and delete from storage
      try {
        const urlObj = new URL(foto.url)
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/project-fotos\/(.+)/)
        if (pathMatch) {
          await supabase.storage.from(PHOTO_BUCKET).remove([pathMatch[1]])
        }
      } catch (err) {
        // Storage cleanup is best-effort
      }
    }
    const { error } = await supabase.from('project_fotos').delete().eq('id', id)
    if (error) throw error
    return
  }
  const all = getLocalData<ProjectFoto>('project_fotos')
  setLocalData('project_fotos', all.filter((f) => f.id !== id))
}

// ============ NUMMER GENERATIE ============

export async function generateProjectNummer(prefix: string = 'PRJ'): Promise<string> {
  const jaar = new Date().getFullYear()
  const jaarPrefix = `${prefix}-${jaar}-`
  let maxNr = await getMaxNummer('projecten', 'project_nummer', jaarPrefix)
  if (maxNr === 0) {
    const projecten = isSupabaseConfigured() ? [] : getLocalData<Project>('projecten')
    maxNr = projecten
      .filter((p) => (p.project_nummer || '').startsWith(jaarPrefix))
      .reduce((max, p) => Math.max(max, parseInt((p.project_nummer || '').replace(jaarPrefix, ''), 10) || 0), 0)
  }
  return `${jaarPrefix}${String(maxNr + 1).padStart(3, '0')}`
}
