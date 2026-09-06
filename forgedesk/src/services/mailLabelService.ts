import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'
import { logger } from '@/utils/logger'

/**
 * Eigen labels (`email_labels`, migratie 245). De vier vaste labels van de
 * lijst blijven bestaan; deze komen erbij. Zonder de tabel geeft alles hier
 * een lege lijst terug en verandert er niets aan het bestaande gedrag.
 */

export interface MailLabel {
  id: string
  naam: string
  kleur: string
  volgorde: number
}

/** Acht tinten uit het doen.-palet: petrol, flame en de statuskleuren. */
export const LABEL_KLEUREN = [
  '#1A535C', '#F15025', '#3A5A9A', '#3A7D52',
  '#8A7A4A', '#C0451A', '#6A5A8A', '#9A5A48',
] as const

/** Kleuren van de vier vaste labels, zoals de lijst ze altijd al toonde. */
export const VASTE_LABEL_KLEUREN: Record<string, string> = {
  offerte: '#3A5A9A',
  klant: '#3A7D52',
  project: '#1A535C',
  leverancier: '#8A7A4A',
}

function ontbreekt(fout: unknown): boolean {
  const code = (fout as { code?: string } | null)?.code
  if (code === '42P01' || code === 'PGRST205' || code === '42703' || code === 'PGRST204') return true
  return /relation .* does not exist|could not find the table/i.test((fout as { message?: string } | null)?.message || '')
}

let tabelOk: boolean | null = null

export function labelsBeschikbaar(): boolean {
  return tabelOk !== false
}

function naarLabel(rij: Record<string, unknown>): MailLabel {
  return {
    id: String(rij.id),
    naam: String(rij.naam ?? ''),
    kleur: String(rij.kleur || LABEL_KLEUREN[0]),
    volgorde: Number(rij.volgorde ?? 0),
  }
}

export async function getLabels(): Promise<MailLabel[]> {
  if (!isSupabaseConfigured() || !supabase || tabelOk === false) return []
  const { data, error } = await supabase
    .from('email_labels')
    .select('id, naam, kleur, volgorde')
    .order('volgorde', { ascending: true })
    .order('naam', { ascending: true })
  if (error) {
    if (ontbreekt(error)) { tabelOk = false; return [] }
    logger.warn('Labels ophalen mislukt:', error)
    return []
  }
  tabelOk = true
  return ((data || []) as Array<Record<string, unknown>>).map(naarLabel)
}

export async function maakLabel(naam: string, kleur: string, volgorde: number): Promise<MailLabel> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Geen verbinding')
  const schoon = naam.trim().slice(0, 40)
  if (!schoon) throw new Error('Geef het label een naam')
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) throw new Error('Niet ingelogd')
  const organisatieId = await getOrgId()
  if (!organisatieId) throw new Error('Geen organisatie')
  const { data, error } = await supabase
    .from('email_labels')
    .insert({ organisatie_id: organisatieId, user_id: userId, naam: schoon, kleur, volgorde })
    .select('id, naam, kleur, volgorde')
    .single()
  if (error) {
    if (ontbreekt(error)) { tabelOk = false; throw new Error('Eigen labels staan nog niet aan in de database') }
    if ((error as { code?: string }).code === '23505') throw new Error('Dat label bestaat al')
    throw new Error(error.message)
  }
  return naarLabel(data as Record<string, unknown>)
}

export async function wijzigLabel(id: string, deel: { naam?: string; kleur?: string; volgorde?: number }): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Geen verbinding')
  const { error } = await supabase.from('email_labels').update(deel).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function verwijderLabel(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase.from('email_labels').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
