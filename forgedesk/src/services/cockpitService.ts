import { supabase, isSupabaseConfigured } from './supabaseClient'
import type { AuditLogEntry } from '@/types'

// De admin-cockpit (migratie 259): één RPC levert signalen, cijfers, "nu" en
// systeemstand in één keer, server-side geaggregeerd binnen de RLS van de
// eigen organisatie. De activiteitenfeed komt los uit audit_log_feature.

export type CockpitSignaalSoort =
  | 'offerte_wacht'
  | 'offerte_check'
  | 'factuur_open'
  | 'factuur_peppol_mislukt'
  | 'werkbon_te_factureren'
  | 'portaal_wacht'
  | 'project_zonder_planning'
  | 'project_deadline'
  | 'project_over_budget'
  | 'inkoop_review'
  | 'montage_niet_afgerond'

export interface CockpitSignaal {
  soort: CockpitSignaalSoort
  id: string
  titel: string
  klant: string | null
  bedrag: number | null
  /** Dagen sinds/tot het referentiemoment; betekenis hangt van de soort af. */
  dagen: number | null
  detail: Record<string, unknown>
  href: string
  sinds: string | null
}

export interface CockpitCijfers {
  pijplijn: number
  pijplijn_aantal: number
  gefactureerd: number
  ontvangen: number
  inkoop: number
  openstaand: number
  openstaand_aantal: number
  ouderdom: { nog_niet_vervallen: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number }
  conversie: { totaal: number; gewonnen: number; verloren: number; open: number; gewonnen_bedrag: number }
  per_maand: { maand: string; gefactureerd: number; ontvangen: number; inkoop: number }[]
}

export interface CockpitNu {
  ingeklokt: { id: string; medewerker: string | null; project: string | null; project_id: string; sinds: string }[]
  montages_vandaag: { id: string; titel: string | null; klant: string | null; start: string | null; status: string; monteurs: string[] | null; project_id: string | null }[]
  montages_week: number
  afwezig_vandaag: { medewerker: string; type: string; tot: string }[]
  team_actief: number
  uitnodigingen_open: number
}

export interface CockpitSysteem {
  peppol_mislukt: number
  exact_sync_fouten: number
  herinnering_fouten_14d: number
  laatste_nachtploeg: { status: string; gestart_op: string; klaar_op: string | null; fout: string | null; voorstellen: number | null } | null
  organisatie: { abonnement_status: string | null; trial_einde: string | null } | null
}

export interface CockpitOverzicht {
  peildatum: string
  periode: { van: string; tot: string }
  signalen: CockpitSignaal[]
  cijfers: CockpitCijfers
  nu: CockpitNu
  systeem: CockpitSysteem
}

export type CockpitPeriode = 'maand' | 'kwartaal' | 'jaar' | 'twaalf_maanden'

const isoDag = (d: Date) => d.toISOString().slice(0, 10)

/** Van/tot voor een periode, in lokale kalenderdagen. */
export function periodeGrenzen(periode: CockpitPeriode, nu: Date = new Date()): { van: string; tot: string } {
  const jaar = nu.getFullYear()
  const maand = nu.getMonth()
  const tot = isoDag(new Date(Date.UTC(jaar, maand, nu.getDate())))
  if (periode === 'maand') return { van: isoDag(new Date(Date.UTC(jaar, maand, 1))), tot }
  if (periode === 'kwartaal') return { van: isoDag(new Date(Date.UTC(jaar, Math.floor(maand / 3) * 3, 1))), tot }
  if (periode === 'jaar') return { van: isoDag(new Date(Date.UTC(jaar, 0, 1))), tot }
  return { van: isoDag(new Date(Date.UTC(jaar, maand - 11, 1))), tot }
}

export async function getCockpitOverzicht(periode: CockpitPeriode): Promise<CockpitOverzicht | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { van, tot } = periodeGrenzen(periode)
  const { data, error } = await supabase.rpc('cockpit_overzicht', { p_van: van, p_tot: tot })
  if (error) throw error
  return (data as CockpitOverzicht | null) ?? null
}

/** Wie deed wat, org-breed, nieuwste eerst. RLS scopet op de organisatie. */
export async function getCockpitActiviteit(limiet = 40): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('audit_log_feature')
    .select('id, entity_type, entity_id, actie, veld, oude_waarde, nieuwe_waarde, medewerker_naam, omschrijving, created_at')
    .order('created_at', { ascending: false })
    .limit(limiet)
  if (error) return []
  return (data ?? []) as AuditLogEntry[]
}

/**
 * Wakker worden als er iets gebeurt: nieuwe audit-regel of een klok die
 * start/stopt. De rest ververst op interval; realtime op offertes/facturen
 * bestaat niet in dit project en hoeft hier ook niet.
 */
export function abonneerCockpit(onWijziging: () => void): () => void {
  if (!isSupabaseConfigured() || !supabase) return () => {}
  const kanaal = supabase
    .channel(`cockpit-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log_feature' }, onWijziging)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tijd_sessies' }, onWijziging)
    .subscribe()
  return () => { supabase?.removeChannel(kanaal) }
}
