/**
 * Centrale project-fase definities.
 * Het spectrum van flame → petrol vertelt waar een project staat.
 * Gebruik getFase() OVERAL waar een project-status wordt weergegeven.
 */

export const PROJECT_FASES = {
  offerte: { label: 'Offerte', percentage: 10, color: '#F15025' },
  goedgekeurd: { label: 'Goedgekeurd', percentage: 20, color: '#D4453A' },
  voorbereiding: { label: 'Voorbereiding', percentage: 35, color: '#9A4070' },
  in_voorbereiding: { label: 'Voorbereiding', percentage: 35, color: '#9A4070' },
  productie: { label: 'Productie', percentage: 50, color: '#6A5A8A' },
  in_productie: { label: 'Productie', percentage: 50, color: '#6A5A8A' },
  montage: { label: 'Montage', percentage: 70, color: '#3A6B8C' },
  opgeleverd: { label: 'Opgeleverd', percentage: 85, color: '#2D6B48' },
  te_factureren: { label: 'Te factureren', percentage: 85, color: '#2D6B48' },
  afgerond: { label: 'Afgerond', percentage: 100, color: '#1A535C' },
  gearchiveerd: { label: 'Afgerond', percentage: 100, color: '#1A535C' },
  // Map hyphenated DB statuses
  gepland: { label: 'Gepland', percentage: 10, color: '#F15025' },
  actief: { label: 'Actief', percentage: 45, color: '#6A5A8A' },
  'in-review': { label: 'In review', percentage: 65, color: '#3A6B8C' },
  'on-hold': { label: 'On-hold', percentage: 30, color: '#9A4070' },
  'te-factureren': { label: 'Te factureren', percentage: 85, color: '#2D6B48' },
  gefactureerd: { label: 'Gefactureerd', percentage: 95, color: '#1A535C' },
  'te-plannen': { label: 'Te plannen', percentage: 60, color: '#3A6B8C' },
} as const

export type ProjectFase = keyof typeof PROJECT_FASES

const DEFAULT_FASE = { label: 'Onbekend', percentage: 0, color: '#5A5A55' }

export function getFase(status: string): { label: string; percentage: number; color: string } {
  if (!status) return DEFAULT_FASE
  // Try direct match first
  const direct = PROJECT_FASES[status as ProjectFase]
  if (direct) return direct
  // Try normalized (lowercase, replace spaces with underscores)
  const key = status.toLowerCase().replace(/\s+/g, '_') as ProjectFase
  return PROJECT_FASES[key] ?? DEFAULT_FASE
}

export function getSpectrumGradient(): string {
  return 'linear-gradient(90deg, #F15025 0%, #D4453A 18%, #9A4070 38%, #6A5A8A 50%, #3A6B8C 65%, #2D6B48 80%, #1A535C 100%)'
}
