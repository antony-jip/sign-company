import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'
import { logger } from '@/utils/logger'

/**
 * Gedeeld postvak: wie een gesprek oppakt, en de interne notities eronder.
 *
 * `emails.toegewezen_op` en de tabel `email_notities` komen uit migratie 245.
 * Zolang die niet gedraaid is meldt `notitiesBeschikbaar()` false en houdt de
 * shell het notitieblok verborgen; toewijzen valt terug op alleen
 * `toegewezen_aan` (die kolom bestaat sinds migratie 005).
 */

export interface EmailNotitie {
  id: string
  emailId: string | null
  threadId: string | null
  userId: string
  tekst: string
  createdAt: string
}

function ontbreekt(fout: unknown): boolean {
  const code = (fout as { code?: string } | null)?.code
  if (code === '42P01' || code === 'PGRST205' || code === '42703' || code === 'PGRST204') return true
  const melding = (fout as { message?: string } | null)?.message || ''
  return /relation .* does not exist|could not find the table|column .* does not exist/i.test(melding)
}

let notitiesOk: boolean | null = null
let toegewezenOpOk = true

export function notitiesBeschikbaar(): boolean {
  return notitiesOk !== false
}

/**
 * Een gesprek toewijzen aan een collega, of vrijgeven met `null`.
 * `toegewezen_aan` bewaart het user_id van de collega (of, als die geen
 * account heeft, het medewerker-id): dat is wat "Van mij" vergelijkt.
 */
export async function wijsToe(emailIds: string[], toegewezenAan: string | null): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || emailIds.length === 0) return
  const client = supabase
  const deel: Record<string, unknown> = { toegewezen_aan: toegewezenAan }
  if (toegewezenOpOk) deel.toegewezen_op = toegewezenAan ? new Date().toISOString() : null

  const { error } = await client.from('emails').update(deel).in('id', emailIds)
  if (!error) return
  if (toegewezenOpOk && ontbreekt(error)) {
    toegewezenOpOk = false
    const opnieuw = await client.from('emails').update({ toegewezen_aan: toegewezenAan }).in('id', emailIds)
    if (!opnieuw.error) return
    throw new Error(opnieuw.error.message)
  }
  throw new Error(error.message)
}

function naarNotitie(rij: Record<string, unknown>): EmailNotitie {
  return {
    id: String(rij.id),
    emailId: (rij.email_id as string | null) ?? null,
    threadId: (rij.thread_id as string | null) ?? null,
    userId: String(rij.user_id ?? ''),
    tekst: String(rij.tekst ?? ''),
    createdAt: String(rij.created_at ?? ''),
  }
}

/** Notities van één gesprek: op thread als die er is, anders op de mail zelf. */
export async function getNotities(emailId: string, threadId?: string | null): Promise<EmailNotitie[]> {
  if (!isSupabaseConfigured() || !supabase || notitiesOk === false) return []
  const query = supabase
    .from('email_notities')
    .select('id, email_id, thread_id, user_id, tekst, created_at')
    .order('created_at', { ascending: true })
  const { data, error } = threadId
    ? await query.eq('thread_id', threadId)
    : await query.eq('email_id', emailId)
  if (error) {
    if (ontbreekt(error)) { notitiesOk = false; return [] }
    logger.warn('Notities ophalen mislukt:', error)
    return []
  }
  notitiesOk = true
  return ((data || []) as Array<Record<string, unknown>>).map(naarNotitie)
}

export async function voegNotitieToe(emailId: string, threadId: string | null | undefined, tekst: string): Promise<EmailNotitie | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const schoon = tekst.trim()
  if (!schoon) return null
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) throw new Error('Niet ingelogd')
  const organisatieId = await getOrgId()
  if (!organisatieId) throw new Error('Geen organisatie')

  const { data, error } = await supabase
    .from('email_notities')
    .insert({ organisatie_id: organisatieId, user_id: userId, email_id: emailId, thread_id: threadId ?? null, tekst: schoon })
    .select('id, email_id, thread_id, user_id, tekst, created_at')
    .single()
  if (error) {
    if (ontbreekt(error)) { notitiesOk = false; throw new Error('Interne notities staan nog niet aan in de database') }
    throw new Error(error.message)
  }
  return naarNotitie(data as Record<string, unknown>)
}

export async function verwijderNotitie(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase.from('email_notities').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
