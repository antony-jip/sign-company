import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now, getOrgId,
} from './supabaseHelpers'
import { createTijdregistratie } from './tijdregistratieService'
import type { TijdSessie, Tijdregistratie } from '@/types'

// Een sessie die langer dan dit loopt is niet gewerkt maar vergeten. We boeken
// hem op nul in plaats van een nacht van veertien uur stilzwijgend in de
// nacalculatie te laten belanden.
export const MAX_SESSIE_UREN = 12

export function sessieSeconden(sessie: TijdSessie, nuMs = Date.now()): number {
  const start = new Date(sessie.gestart_op).getTime()
  if (!Number.isFinite(start)) return 0
  return Math.max(0, Math.floor((nuMs - start) / 1000))
}

export function isVerlopen(sessie: TijdSessie, nuMs = Date.now()): boolean {
  return sessieSeconden(sessie, nuMs) > MAX_SESSIE_UREN * 3600
}

export interface StartInvoer {
  project_id: string
  project_naam?: string
  taak_id?: string
  omschrijving?: string
  medewerker_id?: string
  medewerker_naam?: string
  uurtarief: number
  /** Bewerking waarop geschreven wordt; leeg = Overig. */
  urenveld?: string | null
  /** Kostprijs per uur als momentopname op de urenregel; leeg = onbekend. */
  kostprijs_uur?: number | null
}

export interface StopResultaat {
  sessie: TijdSessie
  /** null wanneer er niets geboekt is · lege sessie of vergeten uit te klokken */
  registratie: Tijdregistratie | null
  duurMinuten: number
  verlopen: boolean
}

function tijdVanISO(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

export async function getTijdSessies(): Promise<TijdSessie[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('tijd_sessies')
      .select('*')
      .order('gestart_op', { ascending: true })
    if (error) throw error
    return data || []
  }
  return getLocalData<TijdSessie>('tijd_sessies')
}

export async function getTijdSessiesByProject(projectId: string): Promise<TijdSessie[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('tijd_sessies')
      .select('*')
      .eq('project_id', projectId)
      .order('gestart_op', { ascending: true })
    if (error) throw error
    return data || []
  }
  return getLocalData<TijdSessie>('tijd_sessies').filter((s) => s.project_id === projectId)
}

export async function getEigenTijdSessie(userId: string): Promise<TijdSessie | null> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('tijd_sessies')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data || null
  }
  return getLocalData<TijdSessie>('tijd_sessies').find((s) => s.user_id === userId) || null
}

/**
 * Klokt uit: boekt de gelopen tijd als tijdregistratie en verwijdert de sessie.
 * Eerst boeken, dan opruimen. Andersom zouden de uren stil verdwijnen als het
 * boeken faalt; nu blijft bij een storing de teller zichtbaar doorlopen, en dat
 * ziet de gebruiker meteen.
 */
export async function stopTijdSessie(sessie: TijdSessie, uurtarief: number, kostprijsUur?: number | null): Promise<StopResultaat> {
  const nuMs = Date.now()
  const verlopen = isVerlopen(sessie, nuMs)
  const duurMinuten = verlopen ? 0 : Math.round(sessieSeconden(sessie, nuMs) / 60)

  if (verlopen || duurMinuten < 1) {
    await verwijderTijdSessie(sessie.id)
    return { sessie, registratie: null, duurMinuten: 0, verlopen }
  }

  const registratie = await createTijdregistratie({
    project_id: sessie.project_id,
    project_naam: sessie.project_naam,
    taak_id: sessie.taak_id,
    medewerker_id: sessie.medewerker_id,
    medewerker_naam: sessie.medewerker_naam,
    omschrijving: sessie.omschrijving || 'Ingeklokt op project',
    datum: sessie.gestart_op.slice(0, 10),
    start_tijd: tijdVanISO(sessie.gestart_op),
    eind_tijd: tijdVanISO(new Date(nuMs).toISOString()),
    duur_minuten: duurMinuten,
    uurtarief,
    urenveld: sessie.urenveld ?? null,
    kostprijs_uur: kostprijsUur ?? null,
    facturabel: true,
    gefactureerd: false,
  } as Omit<Tijdregistratie, 'id' | 'created_at' | 'updated_at'>)

  await verwijderTijdSessie(sessie.id)

  return { sessie, registratie, duurMinuten, verlopen: false }
}

/**
 * Klokt in. Loopt er al een sessie voor deze gebruiker, dan wordt die eerst
 * uitgeklokt en geboekt — één sessie tegelijk is ook een unieke index in de
 * database, dus dit is geen beleefdheid maar noodzaak.
 */
export async function startTijdSessie(
  userId: string,
  invoer: StartInvoer,
): Promise<{ sessie: TijdSessie; vorige: StopResultaat | null }> {
  assertId(userId, 'user_id')
  assertId(invoer.project_id, 'project_id')

  const lopend = await getEigenTijdSessie(userId)
  let vorige: StopResultaat | null = null
  if (lopend) {
    if (lopend.project_id === invoer.project_id) {
      return { sessie: lopend, vorige: null }
    }
    vorige = await stopTijdSessie(lopend, invoer.uurtarief, invoer.kostprijs_uur)
  }

  const nieuw: TijdSessie = {
    id: generateId(),
    user_id: userId,
    medewerker_id: invoer.medewerker_id,
    medewerker_naam: invoer.medewerker_naam,
    project_id: invoer.project_id,
    project_naam: invoer.project_naam,
    taak_id: invoer.taak_id,
    urenveld: invoer.urenveld ?? null,
    omschrijving: invoer.omschrijving,
    gestart_op: now(),
    created_at: now(),
    updated_at: now(),
  }

  if (isSupabaseConfigured() && supabase) {
    const organisatie_id = await getOrgId()
    const { data, error } = await supabase
      .from('tijd_sessies')
      .insert({ ...nieuw, organisatie_id })
      .select()
      .single()
    if (error) throw error
    return { sessie: data, vorige }
  }

  const items = getLocalData<TijdSessie>('tijd_sessies')
  items.push(nieuw)
  setLocalData('tijd_sessies', items)
  return { sessie: nieuw, vorige }
}

export async function verwijderTijdSessie(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('tijd_sessies').delete().eq('id', id)
    if (error) throw error
    return
  }
  setLocalData('tijd_sessies', getLocalData<TijdSessie>('tijd_sessies').filter((s) => s.id !== id))
}
