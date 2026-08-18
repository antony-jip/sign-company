// Welke blokken staan er op het dashboard, en wie wil ze zien.
//
// Het dashboard toonde iedereen hetzelfde. Wie alleen montages draait heeft
// niets aan omzetcijfers of offertes om na te bellen. Dit is een weergavekeuze
// per gebruiker (profiles.dashboard_blokken, migratie 188): niets wordt
// afgeschermd, het staat alleen niet meer in de weg.

export type DashboardBlokId =
  | 'weer'
  | 'portaal'
  | 'kpi'
  | 'briefing'
  | 'vannacht'
  | 'vandaag'
  | 'opvolgen'
  | 'deze-week'
  | 'activiteit'
  | 'team'

export interface DashboardBlok {
  id: DashboardBlokId
  label: string
  uitleg: string
  kolom: 'hoofd' | 'zijkolom'
}

export const DASHBOARD_BLOKKEN: DashboardBlok[] = [
  { id: 'weer', label: 'Weerbericht', uitleg: 'Vandaag en de dagen erna, in de koptekst', kolom: 'hoofd' },
  { id: 'portaal', label: 'Portaalmeldingen', uitleg: 'Klanten die iets in hun portaal deden', kolom: 'hoofd' },
  { id: 'kpi', label: 'Cijfers', uitleg: 'Omzet, offertes en facturen in één strip', kolom: 'hoofd' },
  { id: 'briefing', label: 'Briefing van Daan', uitleg: 'Wat er vandaag aandacht vraagt', kolom: 'hoofd' },
  { id: 'vannacht', label: 'Vannacht geleerd', uitleg: 'Wat de nachtploeg oppikte', kolom: 'hoofd' },
  { id: 'vandaag', label: 'Vandaag', uitleg: 'Je montages, taken en afspraken van vandaag', kolom: 'hoofd' },
  { id: 'opvolgen', label: 'Opvolgen', uitleg: 'Offertes en mails die op een reactie wachten', kolom: 'hoofd' },
  { id: 'deze-week', label: 'Deze week', uitleg: 'De week in vogelvlucht', kolom: 'zijkolom' },
  { id: 'activiteit', label: 'Activiteit', uitleg: 'Wat het team net heeft gedaan', kolom: 'zijkolom' },
  { id: 'team', label: 'Team', uitleg: 'Wie waar mee bezig is', kolom: 'zijkolom' },
]

const ALLE_IDS = DASHBOARD_BLOKKEN.map((b) => b.id)

export interface DashboardPreset {
  id: string
  label: string
  uitleg: string
  blokken: DashboardBlokId[]
}

export const DASHBOARD_PRESETS: DashboardPreset[] = [
  {
    id: 'alles',
    label: 'Alles',
    uitleg: 'Het volledige dashboard',
    blokken: ALLE_IDS,
  },
  {
    id: 'montage',
    label: 'Montage',
    uitleg: 'Weer, je dag en de week. Geen cijfers of opvolging',
    blokken: ['weer', 'vandaag', 'deze-week'],
  },
  {
    id: 'verkoop',
    label: 'Verkoop',
    uitleg: 'Cijfers, opvolging en signalen van Daan',
    blokken: ['kpi', 'briefing', 'vandaag', 'opvolgen', 'portaal', 'deze-week'],
  },
]

/**
 * NULL/undefined = nooit ingesteld, dan staat alles aan. Een lege array is
 * bewust iets anders: dat is "alles uit" en die keuze respecteren we.
 */
export function zichtbareBlokken(opgeslagen: string[] | null | undefined): Set<DashboardBlokId> {
  if (opgeslagen == null) return new Set(ALLE_IDS)
  const geldig = opgeslagen.filter((id): id is DashboardBlokId => (ALLE_IDS as string[]).includes(id))
  return new Set(geldig)
}

/** Welk preset komt overeen met deze selectie? Leeg als het een eigen mix is. */
export function herkenPreset(blokken: string[]): string | null {
  const gekozen = new Set(blokken)
  const match = DASHBOARD_PRESETS.find(
    (p) => p.blokken.length === gekozen.size && p.blokken.every((id) => gekozen.has(id))
  )
  return match?.id ?? null
}
