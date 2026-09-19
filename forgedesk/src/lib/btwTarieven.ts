import { landOfStandaard, type LandCode } from './landen'

// Wettelijke btw-tarieven per land van de verkoper, hoog → laag. Welk tarief
// op een regel hoort blijft een keuze van de gebruiker en zijn boekhouder;
// deze lijst bepaalt alleen wat de selects aanbieden en wat als "zuiver"
// tarief herkend wordt bij het terugrekenen uit totalen.
export const BTW_TARIEVEN: Record<LandCode, readonly number[]> = {
  NL: [21, 9, 0],
  BE: [21, 12, 6, 0],
  DE: [19, 7, 0],
  LU: [17, 14, 8, 3, 0],
  FR: [20, 10, 5.5, 2.1, 0],
}

export const BTW_TARIEF_LABELS: Partial<Record<LandCode, Record<number, string>>> = {
  NL: { 21: 'standaard', 9: 'verlaagd', 0: 'vrijgesteld' },
  BE: { 21: 'standaard', 12: 'verlaagd', 6: 'verlaagd', 0: 'vrijgesteld' },
}

export function btwTarievenVoor(land: string | null | undefined): readonly number[] {
  return BTW_TARIEVEN[landOfStandaard(land)]
}

export function standaardBtwTarief(land: string | null | undefined): number {
  return btwTarievenVoor(land)[0]
}

export function isZuiverTarief(pct: number, land: string | null | undefined): boolean {
  return btwTarievenVoor(land).includes(pct)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Het wettelijke tarief dat het btw-bedrag op de cent (±2 cent) verklaart,
 * of undefined als het een mengvorm is. absNetto en absBtw zijn absolute
 * bedragen zodat creditnota's dezelfde uitkomst geven.
 */
export function zuiverTarief(absNetto: number, absBtw: number, land: string | null | undefined): number | undefined {
  return btwTarievenVoor(land).find((tarief) => Math.abs(absBtw - round2((absNetto * tarief) / 100)) <= 0.02)
}

/** Dichtstbijzijnde wettelijke tarief bij een afgerond percentage. */
export function dichtstbijzijndTarief(pct: number, land: string | null | undefined): number {
  const tarieven = btwTarievenVoor(land)
  return tarieven.reduce((best, kandidaat) => (Math.abs(kandidaat - pct) < Math.abs(best - pct) ? kandidaat : best), tarieven[0])
}
