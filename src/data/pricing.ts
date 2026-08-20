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

// Eén formulering voor de staffel, zodat de bedragen overal genoemd worden
// en nergens uit de pas gaan lopen met STAFFEL. De instapmaat zit al in de
// grote prijs op de pagina, dus die slaan we hier over.
export const STAFFEL_ZIN = STAFFEL.slice(1)
  .map((m, i) => (i === 0 ? `€ ${m.prijs} tot ${m.tot} gebruikers` : `€ ${m.prijs} tot ${m.tot}`))
  .join(', ')

// Wat een pakket met een prijs per seat kost. Uitgelezen uit de live
// tarievenschuif van de bekendste signsoftware, augustus 2026: € 49,50 per
// gebruiker voor de eerste drie, daarna € 14,95 per extra gebruiker, plus
// eenmalige opzetkosten van € 495 (Basic) tot € 2.490 (Enterprise).
//
// Gecontroleerd op 1, 3, 4, 10, 20, 35 en 100 gebruikers; de formule klopt op
// elk punt. Hun pagina noemt geen btw, wij behandelen het als ex btw omdat de
// hele site dat doet. Loop dit na voordat het in druk gaat: het is de prijs
// van een ander bedrijf en die kan morgen anders zijn.
export const PER_SEAT_EERSTE = 49.5
export const PER_SEAT_EERSTE_AANTAL = 3
export const PER_SEAT_EXTRA = 14.95
export const PER_SEAT_OPSTART_MIN = 495
export const PER_SEAT_OPSTART_MAX = 2490

export function perSeatPerMaand(gebruikers: number) {
  const basis = Math.min(gebruikers, PER_SEAT_EERSTE_AANTAL) * PER_SEAT_EERSTE
  const extra = Math.max(0, gebruikers - PER_SEAT_EERSTE_AANTAL) * PER_SEAT_EXTRA
  return basis + extra
}

// Het aantal gebruikers waarvandaan doen. goedkoper is. Uitrekenen in plaats
// van opschrijven, zodat het meebeweegt als een van beide prijzen wijzigt.
export const OMSLAGPUNT =
  Array.from({ length: MAX_GEBRUIKERS }, (_, i) => i + 1).find(
    (n) => perSeatPerMaand(n) > maatVoor(n).prijs,
  ) ?? 1

// De maat waar een aantal gebruikers in valt. Boven de grootste maat
// blijft de bovenste staffel gelden, want daar praten we los af.
export function maatVoor(gebruikers: number) {
  return STAFFEL.find((m) => gebruikers <= m.tot) ?? STAFFEL[STAFFEL.length - 1]
}
