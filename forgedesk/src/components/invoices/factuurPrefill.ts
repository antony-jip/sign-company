// Overdracht van "Wat wil je factureren?" naar de FactuurEditor. De dialoog
// schrijft de keuze weg, navigeert naar /facturen/nieuw?…&prefill=1, en de
// editor leest en wist de sleutel bij het laden. sessionStorage in plaats van
// een lange URL: de regels kunnen tientallen zijn en horen niet in de adresbalk.

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

export interface FactuurPrefill {
  offerte_id: string
  regels: PrefillRegel[]
  /** Alle regels met het volle aantal: dan mogen de afrondingsregels van de offerte mee. */
  volledig: boolean
  verrekenRegels: PrefillVerrekenRegel[]
  verrekende_voorschot_ids: string[]
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
    }
  } catch {
    return null
  }
}
