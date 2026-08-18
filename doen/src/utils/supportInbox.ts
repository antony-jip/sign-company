/**
 * Paginatie-hulpjes voor de support-inbox.
 *
 * Los van de hook gehouden zodat het bladergedrag testbaar is zonder een
 * Supabase-sessie of een gerenderde component.
 */

export const SUPPORT_PAGINA_GROOTTE = 25

/**
 * Voegt een nieuwe pagina achter de al geladen rijen.
 *
 * De inbox is gesorteerd op laatste activiteit, en die verschuift terwijl je
 * bladert: een gesprek dat een nieuw bericht krijgt springt naar voren en kan
 * daardoor in twee pagina's opduiken. Ontdubbelen op id is dus geen luxe maar
 * voorwaarde. De eerst geziene versie wint, zodat de volgorde van de lijst niet
 * onder de gebruiker verspringt.
 */
export function voegGesprekkenSamen<T extends { id: string }>(bestaand: T[], nieuw: T[]): T[] {
  const gezien = new Set(bestaand.map(g => g.id))
  const extra = nieuw.filter(g => !gezien.has(g.id))
  return extra.length === 0 ? bestaand : [...bestaand, ...extra]
}

/**
 * Is er nog een pagina te halen?
 *
 * Vergelijkt tegen het servertotaal en niet tegen "was de laatste pagina vol",
 * omdat ontdubbeling het aantal geladen rijen lager kan maken dan het aantal
 * opgevraagde rijen zonder dat de lijst uitgeput is.
 */
export function heeftMeerGesprekken(geladen: number, totaal: number): boolean {
  return geladen > 0 && geladen < totaal
}

/**
 * Limiet voor een herlaad-ronde na een realtime-INSERT.
 *
 * Vraagt alles terug wat de gebruiker al had opgevraagd, zodat een nieuw
 * bericht niet stil zijn doorgebladerde pagina's opruimt.
 */
export function herlaadLimiet(geladen: number, paginaGrootte = SUPPORT_PAGINA_GROOTTE): number {
  return Math.max(geladen, paginaGrootte)
}
