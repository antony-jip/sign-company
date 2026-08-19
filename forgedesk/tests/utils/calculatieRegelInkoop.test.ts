import { describe, it, expect } from 'vitest'
import { berekenRegelInkoop, berekenRegelVerkoopUitCalculatie } from '@/utils/calculatieBerekening'
import type { CalculatieRegel } from '@/types'

function regel(over: Partial<CalculatieRegel> = {}): CalculatieRegel {
  return {
    id: 'r1',
    omschrijving: 'Dibond 3mm',
    aantal: 1,
    eenheid: 'stuk',
    inkoop_prijs: 0,
    verkoop_prijs: 0,
    korting_percentage: 0,
    ...over,
  } as CalculatieRegel
}

describe('berekenRegelInkoop', () => {
  it('schaalt mee met het aantal van de offerteregel', () => {
    // Eén bord kost 20 inkoop. Vijf borden op de offerte is 100, geen 20.
    const regels = [regel({ inkoop_prijs: 20, verkoop_prijs: 50 })]
    expect(berekenRegelInkoop(regels, 1)).toBe(20)
    expect(berekenRegelInkoop(regels, 5)).toBe(100)
  })

  it('telt eerst de calculatieregels op en vermenigvuldigt daarna', () => {
    const regels = [
      regel({ id: 'a', inkoop_prijs: 12.5, aantal: 2 }),   // 25
      regel({ id: 'b', inkoop_prijs: 4.75, aantal: 4 }),   // 19
    ]
    expect(berekenRegelInkoop(regels, 1)).toBe(44)
    expect(berekenRegelInkoop(regels, 3)).toBe(132)
  })

  it('houdt verkoop en inkoop in dezelfde verhouding · daar ging het mis', () => {
    const regels = [regel({ inkoop_prijs: 20, verkoop_prijs: 50 })]
    const aantal = 5
    const inkoop = berekenRegelInkoop(regels, aantal)
    const verkoop = berekenRegelVerkoopUitCalculatie(regels, aantal)
    // Winst per stuk is 30; bij vijf stuks is dat 150, niet 230.
    expect(verkoop - inkoop).toBe(150)
  })

  it('geeft 0 zonder calculatie of zonder aantal', () => {
    expect(berekenRegelInkoop(undefined, 5)).toBe(0)
    expect(berekenRegelInkoop([], 5)).toBe(0)
    expect(berekenRegelInkoop([regel({ inkoop_prijs: 20 })], 0)).toBe(0)
  })
})
