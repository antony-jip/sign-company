import { describe, it, expect } from 'vitest'
import {
  berekenRegeltotaal,
  berekenCalculatieTotalen,
} from '../../src/utils/calculatieBerekening'
import { berekenMarkupPercentage } from '../../src/utils/margeBerekening'
import type { CalculatieRegel } from '../../src/types'

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Verbatim copy of the old inline logic from CalculatieModal.tsx (r.297-325),
// used as an independent oracle to prove the extracted function is identical.
function referentieTotalen(regels: CalculatieRegel[]) {
  let totaalInkoop = 0
  let totaalVerkoop = 0
  let totaalKorting = 0

  regels.forEach((r) => {
    const regelInkoop = round2(r.aantal * r.inkoop_prijs)
    const regelVerkoop = round2(r.aantal * r.verkoop_prijs)
    const kortingBedrag = round2(regelVerkoop * (r.korting_percentage / 100))
    totaalInkoop += regelInkoop
    totaalVerkoop += regelVerkoop - kortingBedrag
    totaalKorting += kortingBedrag
  })

  totaalInkoop = round2(totaalInkoop)
  totaalVerkoop = round2(totaalVerkoop)
  totaalKorting = round2(totaalKorting)

  const margeBedrag = round2(totaalVerkoop - totaalInkoop)
  const margePercentage = Math.round(berekenMarkupPercentage(totaalInkoop, totaalVerkoop) * 10) / 10

  return { totaalInkoop, totaalVerkoop, totaalKorting, margeBedrag, margePercentage }
}

function maakRegel(overrides: Partial<CalculatieRegel>): CalculatieRegel {
  return {
    id: 'r',
    product_naam: '',
    categorie: '',
    eenheid: 'stuks',
    aantal: 1,
    inkoop_prijs: 0,
    verkoop_prijs: 0,
    marge_percentage: 0,
    korting_percentage: 0,
    nacalculatie: false,
    btw_percentage: 21,
    notitie: '',
    ...overrides,
  }
}

describe('berekenRegeltotaal', () => {
  it('aantal × verkoop zonder korting', () => {
    expect(berekenRegeltotaal(maakRegel({ aantal: 3, verkoop_prijs: 50 }))).toBe(150)
  })

  it('past korting toe op het regelverkoop-bedrag', () => {
    // 4 × 96 = 384, 10% korting = 38.40 -> 345.60
    expect(
      berekenRegeltotaal(maakRegel({ aantal: 4, verkoop_prijs: 96, korting_percentage: 10 })),
    ).toBe(345.6)
  })
})

describe('berekenCalculatieTotalen', () => {
  it('lege regels -> alles 0, marge% 0', () => {
    expect(berekenCalculatieTotalen([])).toEqual({
      totaalInkoop: 0,
      totaalVerkoop: 0,
      totaalKorting: 0,
      margeBedrag: 0,
      margePercentage: 0,
    })
  })

  it('één regel met korting -> cent-exact', () => {
    // inkoop 96 × 1 = 96; verkoop 177.60 × 1 = 177.60; 5% korting = 8.88 -> verkoop 168.72
    const regels = [
      maakRegel({ aantal: 1, inkoop_prijs: 96, verkoop_prijs: 177.6, korting_percentage: 5 }),
    ]
    expect(berekenCalculatieTotalen(regels)).toEqual({
      totaalInkoop: 96,
      totaalVerkoop: 168.72,
      totaalKorting: 8.88,
      margeBedrag: 72.72,
      margePercentage: 75.8,
    })
  })

  it('meerdere regels -> cent-exact', () => {
    const regels = [
      maakRegel({ aantal: 2, inkoop_prijs: 50, verkoop_prijs: 90, korting_percentage: 10 }),
      maakRegel({ aantal: 3, inkoop_prijs: 12.5, verkoop_prijs: 20 }),
      maakRegel({ aantal: 1, inkoop_prijs: 0, verkoop_prijs: 0 }),
    ]
    // regel1: inkoop 100, verkoop 180, korting 18 -> 162
    // regel2: inkoop 37.5, verkoop 60, korting 0 -> 60
    // totaalInkoop 137.5, totaalVerkoop 222, totaalKorting 18
    expect(berekenCalculatieTotalen(regels)).toEqual({
      totaalInkoop: 137.5,
      totaalVerkoop: 222,
      totaalKorting: 18,
      margeBedrag: 84.5,
      margePercentage: 61.5,
    })
  })

  it('afrondings-randgeval -> identiek aan referentie-logica', () => {
    // Bedragen die op halve centen uitkomen, om de round2-volgorde te toetsen.
    const regels = [
      maakRegel({ aantal: 3, inkoop_prijs: 0.335, verkoop_prijs: 0.665, korting_percentage: 12.5 }),
      maakRegel({ aantal: 7, inkoop_prijs: 1.005, verkoop_prijs: 2.005, korting_percentage: 3.33 }),
      maakRegel({ aantal: 1.5, inkoop_prijs: 9.99, verkoop_prijs: 19.99, korting_percentage: 7 }),
    ]
    expect(berekenCalculatieTotalen(regels)).toEqual(referentieTotalen(regels))
  })

  it('komt overeen met de referentie-logica over meerdere regelsets', () => {
    const sets: CalculatieRegel[][] = [
      [maakRegel({ aantal: 1, inkoop_prijs: 96, verkoop_prijs: 96 })],
      [
        maakRegel({ aantal: 5, inkoop_prijs: 3.33, verkoop_prijs: 6.66, korting_percentage: 15 }),
        maakRegel({ aantal: 2, inkoop_prijs: 100, verkoop_prijs: 250, korting_percentage: 0 }),
      ],
      [
        maakRegel({ aantal: 0, inkoop_prijs: 50, verkoop_prijs: 80 }),
        maakRegel({ aantal: 10, inkoop_prijs: 1.11, verkoop_prijs: 2.22, korting_percentage: 50 }),
      ],
    ]
    for (const set of sets) {
      expect(berekenCalculatieTotalen(set)).toEqual(referentieTotalen(set))
    }
  })
})
