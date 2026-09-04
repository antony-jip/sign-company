import type { AppSettings, Medewerker } from '@/types'

/**
 * Kostprijs per uur voor een urenregel, als momentopname bij schrijven.
 * Medewerker eerst, dan de organisatie-standaard, anders onbekend (null).
 * Onbekend betekent: geen urenkosten en geen marge-indicatie, nooit een
 * verzonnen getal.
 */
export function kostprijsVoor(
  medewerker: Pick<Medewerker, 'kostprijs_uur'> | null | undefined,
  settings: Pick<AppSettings, 'standaard_kostprijs_uur'> | null | undefined,
): number | null {
  const eigen = medewerker?.kostprijs_uur
  if (typeof eigen === 'number' && eigen > 0) return eigen
  const standaard = settings?.standaard_kostprijs_uur
  if (typeof standaard === 'number' && standaard > 0) return standaard
  return null
}

/**
 * Verkooptarief-voorkeuze voor een nieuwe urenregel: tarief van de bewerking
 * uit de offertes van het project, anders het tarief van de medewerker, anders
 * de organisatie-standaard, anders de oude vaste 65.
 */
export function uurtariefVoorkeuze(
  tariefVanBewerking: number | null | undefined,
  medewerker: Pick<Medewerker, 'uurtarief'> | null | undefined,
  settings: Pick<AppSettings, 'standaard_uurtarief'> | null | undefined,
): number {
  if (typeof tariefVanBewerking === 'number' && tariefVanBewerking > 0) return tariefVanBewerking
  if (medewerker && medewerker.uurtarief > 0) return medewerker.uurtarief
  if (settings && settings.standaard_uurtarief > 0) return settings.standaard_uurtarief
  return 65
}
