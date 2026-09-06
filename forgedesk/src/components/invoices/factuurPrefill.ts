// Overdracht van "Wat wil je factureren?" naar de FactuurEditor. De dialoog
// schrijft de keuze weg, navigeert naar /facturen/nieuw?…&prefill=1, en de
// editor leest en wist de sleutel bij het laden. sessionStorage in plaats van
// een lange URL: de regels kunnen tientallen zijn en horen niet in de adresbalk.

import { updateProject, updateTaak } from '@/services/supabaseService'
import { logger } from '@/utils/logger'
import type { Project } from '@/types'

export const FACTUUR_PREFILL_KEY = 'doen_factuur_prefill'

export interface PrefillRegel {
  offerte_item_id: string
  aantal: number
}

export interface PrefillVerrekenRegel {
  beschrijving: string
  eenheidsprijs: number
  btw_percentage: number
}

/**
 * De "tevens"-acties uit de dialoog. Ze horen pas ná het aanmaken van de
 * factuur te gebeuren, dus de editor voert ze uit via voerPrefillTevensUit
 * zodra createFactuur is geslaagd.
 */
export interface PrefillTevens {
  project_id?: string
  project_status?: 'te-factureren' | 'gefactureerd'
  taak_ids?: string[]
}

export interface FactuurPrefill {
  offerte_id: string
  regels: PrefillRegel[]
  /** Alle regels met het volle aantal: dan mogen de afrondingsregels van de offerte mee. */
  volledig: boolean
  verrekenRegels: PrefillVerrekenRegel[]
  verrekende_voorschot_ids: string[]
  tevens?: PrefillTevens
}

/**
 * Project op status zetten en taken afronden, nadat de factuur bestaat.
 * Best effort per onderdeel: een mislukte taak mag de factuur niet raken.
 */
export async function voerPrefillTevensUit(tevens: PrefillTevens | undefined): Promise<{ project?: Project; takenAfgerond: boolean }> {
  if (!tevens) return { takenAfgerond: false }
  let project: Project | undefined
  let takenAfgerond = false
  if (tevens.project_id && tevens.project_status) {
    try {
      project = await updateProject(tevens.project_id, { status: tevens.project_status })
    } catch (err) {
      logger.error('Projectstatus zetten mislukt:', err)
    }
  }
  if (tevens.taak_ids && tevens.taak_ids.length > 0) {
    try {
      await Promise.all(tevens.taak_ids.map((id) => updateTaak(id, { status: 'klaar' })))
      takenAfgerond = true
    } catch (err) {
      logger.error('Taken afronden mislukt:', err)
    }
  }
  return { project, takenAfgerond }
}

export function schrijfFactuurPrefill(prefill: FactuurPrefill): void {
  try {
    sessionStorage.setItem(FACTUUR_PREFILL_KEY, JSON.stringify(prefill))
  } catch {
    // Privémodus of volle opslag: de editor valt dan terug op de hele offerte.
  }
}

export function leesEnWisFactuurPrefill(offerteId: string): FactuurPrefill | null {
  try {
    const raw = sessionStorage.getItem(FACTUUR_PREFILL_KEY)
    if (!raw) return null
    sessionStorage.removeItem(FACTUUR_PREFILL_KEY)
    const data = JSON.parse(raw) as FactuurPrefill
    if (!data || data.offerte_id !== offerteId || !Array.isArray(data.regels)) return null
    return {
      offerte_id: data.offerte_id,
      regels: data.regels.filter((r) => r && typeof r.offerte_item_id === 'string' && Number.isFinite(r.aantal) && r.aantal > 0),
      volledig: data.volledig === true,
      verrekenRegels: Array.isArray(data.verrekenRegels) ? data.verrekenRegels : [],
      verrekende_voorschot_ids: Array.isArray(data.verrekende_voorschot_ids) ? data.verrekende_voorschot_ids : [],
      tevens: data.tevens && typeof data.tevens === 'object' ? data.tevens : undefined,
    }
  } catch {
    return null
  }
}
