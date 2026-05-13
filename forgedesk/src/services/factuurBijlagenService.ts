import { supabase, isSupabaseConfigured, assertId, getOrgId } from './supabaseHelpers'
import type { FactuurBijlage } from '@/types'

const BUCKET = 'factuur-bijlagen'
const MAX_BIJLAGEN_PER_FACTUUR = 5
const MAX_BESTAND_GROOTTE = 20 * 1024 * 1024
const TOEGESTANE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

const sanitizeFilename = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[­​-‏﻿]/g, '')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'bestand'

function assertSupabase() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Bijlagen vereisen Supabase Storage en zijn niet beschikbaar in offline-modus')
  }
}

export async function getFactuurBijlagen(factuurId: string): Promise<FactuurBijlage[]> {
  assertId(factuurId, 'factuurId')
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('factuur_bijlagen')
    .select('*')
    .eq('factuur_id', factuurId)
    .order('aangemaakt_op', { ascending: true })
  if (error) throw error
  return (data as FactuurBijlage[]) ?? []
}

export async function uploadFactuurBijlage(
  factuurId: string,
  file: File,
  type: 'inkooporder' | 'overig',
  organisatieId: string,
): Promise<FactuurBijlage> {
  assertId(factuurId, 'factuurId')
  assertId(organisatieId, 'organisatieId')
  assertSupabase()

  if (file.size > MAX_BESTAND_GROOTTE) {
    throw new Error(`Bestand is te groot. Maximum is ${MAX_BESTAND_GROOTTE / 1024 / 1024}MB.`)
  }
  if (file.type && !TOEGESTANE_MIME_TYPES.includes(file.type as typeof TOEGESTANE_MIME_TYPES[number])) {
    throw new Error(`Bestandstype ${file.type} is niet toegestaan. Alleen PDF, JPG, PNG, DOCX en XLSX.`)
  }

  const { count, error: countError } = await supabase!
    .from('factuur_bijlagen')
    .select('id', { count: 'exact', head: true })
    .eq('factuur_id', factuurId)
  if (countError) throw countError
  if ((count ?? 0) >= MAX_BIJLAGEN_PER_FACTUUR) {
    throw new Error(`Maximum van ${MAX_BIJLAGEN_PER_FACTUUR} bijlagen per factuur bereikt.`)
  }

  const sanitized = sanitizeFilename(file.name)
  const storagePath = `${organisatieId}/${factuurId}/${Date.now()}-${sanitized}`

  const { error: uploadError } = await supabase!.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })
  if (uploadError) throw uploadError

  const { data: userResult } = await supabase!.auth.getUser()
  const geuploadDoor = userResult?.user?.id ?? null

  const { data, error: insertError } = await supabase!
    .from('factuur_bijlagen')
    .insert({
      organisatie_id: organisatieId,
      factuur_id: factuurId,
      bestandsnaam: file.name,
      mime_type: file.type || 'application/octet-stream',
      grootte: file.size,
      storage_path: storagePath,
      type,
      geupload_door: geuploadDoor,
    })
    .select()
    .single()

  if (insertError || !data) {
    await supabase!.storage.from(BUCKET).remove([storagePath]).catch(() => undefined)
    throw insertError ?? new Error('Bijlage kon niet worden opgeslagen')
  }

  return data as FactuurBijlage
}

export async function deleteFactuurBijlage(bijlageId: string): Promise<void> {
  assertId(bijlageId, 'bijlageId')
  assertSupabase()

  const { data: bijlage, error: fetchError } = await supabase!
    .from('factuur_bijlagen')
    .select('storage_path')
    .eq('id', bijlageId)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!bijlage) return

  const { error: deleteError } = await supabase!
    .from('factuur_bijlagen')
    .delete()
    .eq('id', bijlageId)
  if (deleteError) throw deleteError

  await supabase!.storage.from(BUCKET).remove([bijlage.storage_path]).catch((err) => {
    console.warn('Storage object kon niet verwijderd worden', bijlage.storage_path, err)
  })
}

export async function updateFactuurBijlageType(
  bijlageId: string,
  type: 'inkooporder' | 'overig',
): Promise<void> {
  assertId(bijlageId, 'bijlageId')
  assertSupabase()
  const { error } = await supabase!
    .from('factuur_bijlagen')
    .update({ type })
    .eq('id', bijlageId)
  if (error) throw error
}

export async function markBijlageSynced(bijlageId: string): Promise<void> {
  assertId(bijlageId, 'bijlageId')
  assertSupabase()
  const { error } = await supabase!
    .from('factuur_bijlagen')
    .update({ exact_synced_op: new Date().toISOString() })
    .eq('id', bijlageId)
  if (error) throw error
}

export async function getFactuurBijlageCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (!isSupabaseConfigured() || !supabase) return counts
  const { data, error } = await supabase
    .from('factuur_bijlagen')
    .select('factuur_id')
  if (error) throw error
  for (const row of (data ?? []) as { factuur_id: string }[]) {
    counts.set(row.factuur_id, (counts.get(row.factuur_id) ?? 0) + 1)
  }
  return counts
}

export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  assertSupabase()
  const { data, error } = await supabase!.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)
  if (error || !data?.signedUrl) throw error ?? new Error('Kon geen signed URL maken')
  return data.signedUrl
}

export async function getActieveOrgId(): Promise<string> {
  const orgId = await getOrgId()
  if (!orgId) throw new Error('Geen actieve organisatie gevonden')
  return orgId
}
