/**
 * Spectrum utilities — maps project status to a flame→petrol gradient position.
 * The spectrum tells the project lifecycle story:
 *   flame (#F15025) = start / offerte
 *   petrol (#1A535C) = afgerond / klaar
 */

/** Bereken het spectrum percentage op basis van project status */
export function getSpectrumPercentage(status: string): number {
  const statusMap: Record<string, number> = {
    // Actual Project statuses in the database
    'gepland': 10,
    'actief': 45,
    'in-review': 65,
    'on-hold': 30,
    'te-factureren': 85,
    'gefactureerd': 95,
    'afgerond': 100,
    // Alternative / future status names
    'offerte': 10,
    'goedgekeurd': 20,
    'voorbereiding': 35,
    'in_voorbereiding': 35,
    'productie': 50,
    'in_productie': 50,
    'montage': 70,
    'opgeleverd': 90,
    'gearchiveerd': 100,
  }
  return statusMap[status?.toLowerCase()] ?? 0
}

/** Full spectrum gradient CSS */
export const SPECTRUM_GRADIENT =
  'linear-gradient(90deg, #F15025 0%, #D4453A 18%, #9A4070 38%, #6A5A8A 50%, #3A6B8C 65%, #2D6B48 80%, #1A535C 100%)'

/** Genereer de gradient CSS voor een gegeven percentage */
export function getSpectrumGradient(_percentage: number): string {
  return SPECTRUM_GRADIENT
}

/** Haal de puntkleur op voor een percentage (voor dots/badges) */
export function getSpectrumColor(percentage: number): string {
  if (percentage <= 15) return '#F15025'
  if (percentage <= 25) return '#D4453A'
  if (percentage <= 40) return '#9A4070'
  if (percentage <= 55) return '#6A5A8A'
  if (percentage <= 70) return '#3A6B8C'
  if (percentage <= 85) return '#2D6B48'
  return '#1A535C'
}
