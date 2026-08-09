// Eén bron voor de doen.-prijs: gebruikt door de prijzen-slider, de
// SoftwareApplication structured data en de staffel-tabel.
//
// De instapprijs blijft PRICE_PER_MONTH, want daar rekent de vergelijking
// met gangbare pakketten mee en dat is de prijs die in de metadata staat.
export const PRICE_PER_MONTH = 129

// De staffel telt op GEKOCHTE plekken, niet op ingelogde gebruikers. Wie
// een plek vrijmaakt zakt dus terug, en niemand wordt verrast door een
// factuur die meegroeit met een drukke week.
export const STAFFEL = [
  { tot: 10, prijs: 129, ai: 15 },
  { tot: 20, prijs: 199, ai: 30 },
  { tot: 35, prijs: 279, ai: 50 },
] as const

export const MAX_GEBRUIKERS = STAFFEL[STAFFEL.length - 1].tot
