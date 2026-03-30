import supabase, { isSupabaseConfigured } from './supabaseClient'
import { safeSetItem } from '@/utils/localStorageUtils'
import { round2 } from '@/utils/budgetUtils'

// ============ HELPERS ============

export function assertId(id: unknown, label = 'id'): asserts id is string {
  if (!id || typeof id !== 'string') {
    throw new Error(`Ongeldig ${label}: waarde is vereist`)
  }
}

export function getLocalData<T>(key: string): T[] {
  const data = localStorage.getItem(`doen_${key}`)
  return data ? JSON.parse(data) : []
}

export function setLocalData<T>(key: string, data: T[]): void {
  if (!safeSetItem(`doen_${key}`, JSON.stringify(data))) {
    throw new Error(`localStorage quota exceeded voor ${key}`)
  }
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function now(): string {
  return new Date().toISOString()
}

export const DATE_FIELDS = [
  'start_datum', 'eind_datum', 'startdatum', 'einddatum',
  'deadline', 'datum', 'vervaldatum', 'factuurdatum', 'betaaldatum',
  'geldig_tot', 'follow_up_datum', 'laatste_contact',
  'eerste_bekeken_op', 'laatst_bekeken_op',
  'herinnering_1_verstuurd', 'herinnering_2_verstuurd',
  'herinnering_3_verstuurd', 'aanmaning_verstuurd',
  'start_tijd', 'eind_tijd',
] as const

export const UUID_FIELDS = [
  'project_id', 'klant_id', 'medewerker_id', 'factuur_id',
  'offerte_id', 'document_id', 'contact_id', 'leverancier_id',
  'werkbon_id', 'contactpersoon_id',
] as const

export async function withUserId<T extends object>(data: T): Promise<T & { user_id: string }> {
  if ((data as any).user_id && typeof (data as any).user_id === 'string') return data as T & { user_id: string }
  if (!supabase) return data as T & { user_id: string }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd — kan user_id niet bepalen')
  return { ...data, user_id: user.id }
}

export async function withOrganisatieId<T extends object>(data: T): Promise<T & { organisatie_id?: string }> {
  if ((data as any).organisatie_id) return data as T & { organisatie_id: string }
  if (!supabase) return data as T & { organisatie_id?: string }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return data as T & { organisatie_id?: string }
  const { data: profile } = await supabase.from('profiles').select('organisatie_id').eq('id', user.id).maybeSingle()
  if (profile?.organisatie_id) return { ...data, organisatie_id: profile.organisatie_id }
  return data as T & { organisatie_id?: string }
}

let _cachedOrgId: string | undefined = undefined
export async function getOrgId(): Promise<string | undefined> {
  if (_cachedOrgId) return _cachedOrgId
  if (!supabase) return undefined
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return undefined
  const { data: profile } = await supabase.from('profiles').select('organisatie_id').eq('id', user.id).maybeSingle()
  if (profile?.organisatie_id) { _cachedOrgId = profile.organisatie_id; return _cachedOrgId }
  return undefined
}

if (typeof window !== 'undefined') {
  supabase?.auth.onAuthStateChange(() => { _cachedOrgId = undefined })
}

export function sanitizeDates<T extends object>(data: T): T {
  const result = { ...data } as Record<string, unknown>
  for (const field of DATE_FIELDS) {
    if (field in result && (result[field] === '' || result[field] === undefined)) {
      delete result[field]
    }
  }
  for (const field of UUID_FIELDS) {
    if (field in result && result[field] === '') {
      delete result[field]
    }
  }
  return result as T
}

export async function getMaxNummer(table: string, field: string, prefix: string): Promise<number> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from(table)
      .select(field)
      .like(field, `${prefix}%`)
      .order(field, { ascending: false })
      .limit(1)
    if (data && data.length > 0) {
      const nr = parseInt(String((data[0] as unknown as Record<string, unknown>)[field]).replace(prefix, ''), 10)
      return isNaN(nr) ? 0 : nr
    }
    return 0
  }
  return 0
}

export { supabase, isSupabaseConfigured, round2 }
