/**
 * Tijdvelden op montage-afspraken en boekingen zijn in de database nullable.
 * Eén rij zonder starttijd (bijvoorbeeld doordat het tijdveld leeg is
 * opgeslagen) sloopte daardoor de hele planning: `a.start_tijd.localeCompare`
 * gooit op null en de error boundary vangt de hele pagina af.
 *
 * Sorteer daarom altijd via deze helper: rijen zonder tijd zakken naar
 * onderen in plaats van de pagina mee te nemen.
 */
export function vergelijkTijd(a?: string | null, b?: string | null): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

/** Zelfde als vergelijkTijd, maar aflopend. Rijen zonder tijd blijven onderaan. */
export function vergelijkTijdAflopend(a?: string | null, b?: string | null): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return b.localeCompare(a)
}

/** HH:mm voor weergave; zonder tijd een streepje in plaats van "null". */
export function tijdLabel(t?: string | null): string {
  return t ? t.slice(0, 5) : '–'
}

/** Start- en eindtijd als één regel. Ontbreekt er een, dan zegt het label wat
 *  er wél bekend is in plaats van een half streepje te tonen. */
export function tijdBereik(start?: string | null, eind?: string | null): string {
  if (start && eind) return `${tijdLabel(start)} – ${tijdLabel(eind)}`
  if (start) return `vanaf ${tijdLabel(start)}`
  if (eind) return `tot ${tijdLabel(eind)}`
  return 'tijd onbekend'
}
