import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now, getOrgId,
} from './supabaseHelpers'
import type { Maatje, MaatjeAnnotatie } from '@/types'

const BUCKET = 'maatjes'

/** Pad-patroon: {organisatie_id}/{maatje_id}/origineel.jpg | render.jpg */
function artefactPad(orgId: string, maatjeId: string, soort: 'origineel' | 'render'): string {
  return `${orgId}/${maatjeId}/${soort}.jpg`
}

interface MaatjeInvoer {
  titel: string | null
  annotaties: MaatjeAnnotatie[]
}

async function huidigeUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

async function uploadArtefact(pad: string, blob: Blob): Promise<void> {
  if (!supabase) throw new Error('Supabase Storage niet geconfigureerd')
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(pad, blob, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' })
  if (error) throw error
}

function blobNaarDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Resolve een opgeslagen pad naar een tijdelijk bruikbare (signed) URL.
 * De bucket is niet-publiek, dus weergave loopt via signed URLs. Data-URL's
 * en al-resolved http-URL's (localStorage-fallback) worden ongewijzigd
 * teruggegeven.
 */
export async function getMaatjeWeergaveUrl(padOfUrl: string | null | undefined): Promise<string | null> {
  if (!padOfUrl) return null
  if (padOfUrl.startsWith('http://') || padOfUrl.startsWith('https://') || padOfUrl.startsWith('data:')) {
    return padOfUrl
  }
  if (!isSupabaseConfigured() || !supabase) return padOfUrl
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(padOfUrl, 3600)
  if (error) return null
  return data.signedUrl
}

/** Losse maatjes (kladblok): org-breed, project_id IS NULL. */
export async function getLosseMaatjes(): Promise<Maatje[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('maatjes')
      .select('*')
      .is('project_id', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Maatje[]
  }
  return getLocalData<Maatje>('maatjes').filter((m) => !m.project_id)
}

/** Maatjes gekoppeld aan één project (org-breed via RLS). */
export async function getProjectMaatjes(projectId: string): Promise<Maatje[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('maatjes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Maatje[]
  }
  return getLocalData<Maatje>('maatjes').filter((m) => m.project_id === projectId)
}

export async function createMaatje(invoer: MaatjeInvoer, origineel: Blob, render: Blob): Promise<Maatje> {
  const id = generateId()

  if (isSupabaseConfigured() && supabase) {
    const orgId = await getOrgId()
    if (!orgId) throw new Error('Organisatie niet gevonden')
    const userId = await huidigeUserId()
    const origineelPad = artefactPad(orgId, id, 'origineel')
    const renderPad = artefactPad(orgId, id, 'render')
    await uploadArtefact(origineelPad, origineel)
    await uploadArtefact(renderPad, render)

    const { data, error } = await supabase
      .from('maatjes')
      .insert({
        id,
        organisatie_id: orgId,
        project_id: null,
        titel: invoer.titel,
        foto_origineel_url: origineelPad,
        foto_render_url: renderPad,
        annotaties: invoer.annotaties,
        aangemaakt_door: userId,
      })
      .select()
      .single()
    if (error) throw error
    return data as Maatje
  }

  // localStorage-fallback: data-URL's i.p.v. storage
  const record: Maatje = {
    id,
    organisatie_id: 'local',
    project_id: null,
    titel: invoer.titel,
    foto_origineel_url: await blobNaarDataUrl(origineel),
    foto_render_url: await blobNaarDataUrl(render),
    annotaties: invoer.annotaties,
    aangemaakt_door: null,
    created_at: now(),
    updated_at: now(),
  }
  const alle = getLocalData<Maatje>('maatjes')
  alle.push(record)
  setLocalData('maatjes', alle)
  return record
}

export async function updateMaatje(id: string, invoer: MaatjeInvoer, render?: Blob): Promise<void> {
  assertId(id, 'maatje_id')
  if (isSupabaseConfigured() && supabase) {
    if (render) {
      const orgId = await getOrgId()
      if (!orgId) throw new Error('Organisatie niet gevonden')
      await uploadArtefact(artefactPad(orgId, id, 'render'), render)
    }
    const { error } = await supabase
      .from('maatjes')
      .update({ titel: invoer.titel, annotaties: invoer.annotaties })
      .eq('id', id)
    if (error) throw error
    return
  }
  const alle = getLocalData<Maatje>('maatjes')
  const idx = alle.findIndex((m) => m.id === id)
  if (idx === -1) return
  alle[idx] = {
    ...alle[idx],
    titel: invoer.titel,
    annotaties: invoer.annotaties,
    foto_render_url: render ? await blobNaarDataUrl(render) : alle[idx].foto_render_url,
    updated_at: now(),
  }
  setLocalData('maatjes', alle)
}

/** Koppel losse maatjes aan een project (1 of meer). */
export async function koppelMaatjes(ids: string[], projectId: string): Promise<void> {
  assertId(projectId, 'project_id')
  if (ids.length === 0) return
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('maatjes').update({ project_id: projectId }).in('id', ids)
    if (error) throw error
    return
  }
  const alle = getLocalData<Maatje>('maatjes')
  for (const m of alle) {
    if (ids.includes(m.id)) m.project_id = projectId
  }
  setLocalData('maatjes', alle)
}

export async function verwijderMaatje(id: string): Promise<void> {
  assertId(id, 'maatje_id')
  if (isSupabaseConfigured() && supabase) {
    const orgId = await getOrgId()
    if (orgId) {
      await supabase.storage.from(BUCKET).remove([
        artefactPad(orgId, id, 'origineel'),
        artefactPad(orgId, id, 'render'),
      ])
    }
    const { error } = await supabase.from('maatjes').delete().eq('id', id)
    if (error) throw error
    return
  }
  const alle = getLocalData<Maatje>('maatjes').filter((m) => m.id !== id)
  setLocalData('maatjes', alle)
}
