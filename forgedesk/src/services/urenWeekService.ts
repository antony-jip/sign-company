import { supabase } from './supabaseClient'
import { logger } from '@/utils/logger'

export type UrenWeekActie = 'ingediend' | 'goedgekeurd' | 'teruggestuurd'

export interface UrenWeekMelding {
  actie: UrenWeekActie
  /** Maandag van de week, ISO-datum. */
  weekStart: string
  uren: number
  /** Bij goedgekeurd/teruggestuurd: de gebruiker van de medewerker. */
  doelUserId?: string
  opmerking?: string
}

/**
 * Meldt een ingediende, goedgekeurde of teruggestuurde week via
 * api/uren-week-ingediend (service_role, want notificaties zijn user-only).
 * Best effort: de statuswijziging staat al, een mislukte melding mag die niet
 * terugdraaien.
 */
export async function stuurUrenWeekMelding(input: UrenWeekMelding): Promise<void> {
  if (!supabase) return
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    const respons = await fetch('/api/uren-week-ingediend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(input),
    })
    if (!respons.ok) logger.warn('[uren-week] melding versturen mislukt:', respons.status)
  } catch (err) {
    logger.warn('[uren-week] melding versturen mislukt:', err)
  }
}
