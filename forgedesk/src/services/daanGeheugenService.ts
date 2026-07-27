import { supabase, isSupabaseConfigured } from './supabaseClient'

// Daan-geheugen (migratie 164): observaties die Daan vastlegt en die de
// gebruiker op de klantkaart beheert. RLS doet de organisatie-scope.
// Statusverloop: waargenomen -> actief (houden) of afgewezen (weggooien);
// 'voorgesteld' en 'verlopen' zijn voor de consolidatie in fase 2.

export type DaanGeheugenStatus = 'waargenomen' | 'voorgesteld' | 'actief' | 'afgewezen' | 'verlopen'

export interface DaanGeheugenRegel {
  id: string
  onderwerp_type: 'klant' | 'project' | 'leverancier' | 'algemeen'
  onderwerp_id: string | null
  inhoud: string
  status: DaanGeheugenStatus
  agent: string
  bevestigd_aantal: number
  laatst_bevestigd_op: string
  created_at: string
}

const ZICHTBARE_STATUSSEN: DaanGeheugenStatus[] = ['waargenomen', 'voorgesteld', 'actief']

/** Org-brede regels (onderwerp 'algemeen') voor beheer in Instellingen > Daan. */
export async function getDaanGeheugenAlgemeen(): Promise<DaanGeheugenRegel[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('ai_geheugen')
    .select('id, onderwerp_type, onderwerp_id, inhoud, status, agent, bevestigd_aantal, laatst_bevestigd_op, created_at')
    .eq('onderwerp_type', 'algemeen')
    .in('status', ZICHTBARE_STATUSSEN)
    .order('laatst_bevestigd_op', { ascending: false })
    .limit(50)
  if (error) return []
  return (data ?? []) as DaanGeheugenRegel[]
}

export async function getDaanGeheugenByKlant(klantId: string): Promise<DaanGeheugenRegel[]> {
  if (!klantId || !isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('ai_geheugen')
    .select('id, onderwerp_type, onderwerp_id, inhoud, status, agent, bevestigd_aantal, laatst_bevestigd_op, created_at')
    .eq('onderwerp_type', 'klant')
    .eq('onderwerp_id', klantId)
    .in('status', ZICHTBARE_STATUSSEN)
    .order('laatst_bevestigd_op', { ascending: false })
  if (error) return []
  return (data ?? []) as DaanGeheugenRegel[]
}

/** Houden: de regel telt vanaf nu mee in Daans context. */
export async function bevestigDaanGeheugen(id: string): Promise<boolean> {
  if (!id || !isSupabaseConfigured() || !supabase) return false
  const { error } = await supabase
    .from('ai_geheugen')
    .update({ status: 'actief', laatst_bevestigd_op: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

/** Weggooien: soft (status afgewezen), zodat een misklik herstelbaar blijft. */
export async function wijsDaanGeheugenAf(id: string): Promise<boolean> {
  if (!id || !isSupabaseConfigured() || !supabase) return false
  const { error } = await supabase
    .from('ai_geheugen')
    .update({ status: 'afgewezen', updated_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

export interface DaanVoorstel extends DaanGeheugenRegel {
  klant_naam: string | null
  bewijs: Record<string, unknown> | null
}

/** Voorstellen van de nachtploeg voor de ochtendlijst, met klantnaam erbij. */
export async function getDaanVoorstellen(): Promise<DaanVoorstel[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('ai_geheugen')
    .select('id, onderwerp_type, onderwerp_id, inhoud, status, agent, bevestigd_aantal, laatst_bevestigd_op, created_at, bewijs')
    .eq('status', 'voorgesteld')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error || !data?.length) return []

  const klantIds = [...new Set(data.filter(r => r.onderwerp_type === 'klant' && r.onderwerp_id).map(r => r.onderwerp_id as string))]
  const namen = new Map<string, string>()
  if (klantIds.length) {
    const { data: klanten } = await supabase.from('klanten').select('id, bedrijfsnaam').in('id', klantIds)
    for (const k of klanten ?? []) namen.set(k.id as string, k.bedrijfsnaam as string)
  }
  return data.map(r => ({
    ...(r as DaanGeheugenRegel),
    klant_naam: r.onderwerp_id ? namen.get(r.onderwerp_id as string) ?? null : null,
    bewijs: (r.bewijs as Record<string, unknown> | null) ?? null,
  }))
}

export interface DaanRonde {
  id: string
  status: 'bezig' | 'klaar' | 'mislukt' | 'overgeslagen'
  sporen_gelezen: number
  voorstellen: number
  kosten_eur: number
  gestart_op: string
  klaar_op: string | null
}

/** Logboek van nachtelijke rondes (Instellingen > Daan). */
export async function getDaanRondes(limit = 10): Promise<DaanRonde[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('ai_rondes')
    .select('id, status, sporen_gelezen, voorstellen, kosten_eur, gestart_op, klaar_op')
    .order('gestart_op', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []) as DaanRonde[]
}

export async function updateDaanGeheugenInhoud(id: string, inhoud: string): Promise<boolean> {
  const schoon = inhoud.trim().slice(0, 300)
  if (!id || !schoon || !isSupabaseConfigured() || !supabase) return false
  const { error } = await supabase
    .from('ai_geheugen')
    .update({ inhoud: schoon, updated_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}
