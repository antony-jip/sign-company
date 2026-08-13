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
  let { data: profile } = await supabase.from('profiles').select('organisatie_id').eq('id', user.id).maybeSingle()
  if (!profile?.organisatie_id) {
    // Race bij re-login: auth-header nog niet door supabase-client gepropageerd
    // naar RLS-protected profile-query. Retry één keer (zelfde patroon als
    // AuthContext.handleOnboardingRedirect).
    await new Promise(r => setTimeout(r, 250))
    const retry = await supabase.from('profiles').select('organisatie_id').eq('id', user.id).maybeSingle()
    profile = retry.data
  }
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

const PAGINA_GROOTTE = 1000

// PostgREST levert nooit meer dan 1000 rijen per request, ook niet met een hogere
// .limit(). Zonder deze loop kappen lijsten stilzwijgend af zodra een organisatie
// over die grens groeit. Sorteer altijd met id als tiebreaker, anders kan een rij
// tussen twee pagina's dubbel of niet terugkomen.
export async function fetchAllPages<T>(
  haalPagina: (van: number, tot: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  max = 50000,
): Promise<T[]> {
  const alles: T[] = []
  for (let van = 0; van < max; van += PAGINA_GROOTTE) {
    const tot = Math.min(van + PAGINA_GROOTTE, max) - 1
    const { data, error } = await haalPagina(van, tot)
    if (error) throw error
    if (!data || data.length === 0) break
    alles.push(...data)
    if (data.length < PAGINA_GROOTTE) break
  }
  return alles
}

const TYPED_PREFIXES = ['CN', 'CR', 'VS', 'EA']

/**
 * Het hoogste nummer achter een prefix, om het volgende te kunnen uitgeven.
 *
 * Waarom dit pagineert. PostgREST levert maximaal 1000 rijen per request. Zonder
 * paginatie las deze functie het maximum van de eerste 1000 rijen die de server
 * toevallig teruggaf, en gaf dus een te laag nummer terug zodra één prefix over
 * de 1000 ging. Gevolg: een tweede factuur met een nummer dat al bestaat. Stil,
 * en precies op de plek waar het niet mag.
 *
 * Waarom niet `order desc limit 1`, wat sneller zou zijn: de collisiefilter
 * hieronder moet over álle rijen. `F` is een prefix van niets, maar `CN2026-3`
 * (creditnota) begint met `C` en zou een zoektocht naar prefix `C` vergiftigen.
 * Die filter zit in de reduce en kan niet in de query, dus alle rijen zijn nodig.
 *
 * De `.order()` is er niet voor de sortering maar voor de paginatie: `.range()`
 * zonder ordening geeft geen stabiele vensters, en dan kan een rij dubbel of
 * helemaal niet langskomen.
 */
export async function getMaxNummer(table: string, field: string, prefix: string): Promise<number> {
  if (isSupabaseConfigured() && supabase) {
    const orgId = await getOrgId()
    const rijen = await fetchAllPages<Record<string, unknown>>(async (van, tot) => {
      let query = supabase!
        .from(table)
        .select(field)
        .like(field, `${prefix}%`)
      if (orgId) query = query.eq('organisatie_id', orgId)
      const { data, error } = await query.order(field, { ascending: true }).range(van, tot)
      // `select()` met een variabele kolomnaam kan PostgREST niet typen; die
      // kende het schema niet op compile-time. Eén cast hier in plaats van per rij.
      return { data: data as unknown as Record<string, unknown>[] | null, error }
    })
    return rijen.reduce<number>((max, row) => {
      const value = String(row[field])
      const collidesWithTyped = TYPED_PREFIXES.some(
        (tp) => value.startsWith(tp) && !prefix.startsWith(tp)
      )
      if (collidesWithTyped) return max
      const tail = value.slice(prefix.length)
      if (!/^\d+$/.test(tail)) return max
      return Math.max(max, parseInt(tail, 10))
    }, 0)
  }
  return 0
}

export { supabase, isSupabaseConfigured, round2 }
