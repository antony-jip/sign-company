/**
 * Spectrum utilities — maps project status to a flame→petrol gradient position.
 * The spectrum tells the project lifecycle story:
 *   flame (#F15025) = start / offerte
 *   petrol (#1A535C) = afgerond / klaar
 */

// ─── Factuur Aging ──────────────────────────────────────────────────
// Omgekeerd spectrum: vers = petrol (rust), oud = flame (actie nodig)

/** Bereken het aantal dagen dat een factuur openstaat */
export function berekenDagenOpen(verzenddatum: string | Date): number {
  const verzonden = new Date(verzenddatum)
  const nu = new Date()
  return Math.max(0, Math.floor((nu.getTime() - verzonden.getTime()) / (1000 * 60 * 60 * 24)))
}

/** Aging kleur op basis van dagen open (omgekeerd spectrum) */
export function getAgingColor(dagenOpen: number): string {
  if (dagenOpen <= 7) return '#1A535C'   // petrol — vers
  if (dagenOpen <= 14) return '#3A6B8C'  // blauw
  if (dagenOpen <= 21) return '#6A5A8A'  // paars
  if (dagenOpen <= 30) return '#9A4070'  // warm paars
  if (dagenOpen <= 45) return '#D4453A'  // donker flame
  return '#F15025'                        // flame — actie nodig
}

/** Lichte achtergrondkleur bij de aging kleur (voor badges) */
export function getAgingBgColor(dagenOpen: number): string {
  if (dagenOpen <= 7) return '#E2F0F0'
  if (dagenOpen <= 14) return '#E5ECF6'
  if (dagenOpen <= 21) return '#EEEAF4'
  if (dagenOpen <= 30) return '#F4E6EE'
  if (dagenOpen <= 45) return '#FDE8E2'
  return '#FDE8E2'
}
