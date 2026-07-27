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

export async function updateDaanGeheugenInhoud(id: string, inhoud: string): Promise<boolean> {
  const schoon = inhoud.trim().slice(0, 300)
  if (!id || !schoon || !isSupabaseConfigured() || !supabase) return false
  const { error } = await supabase
    .from('ai_geheugen')
    .update({ inhoud: schoon, updated_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}
