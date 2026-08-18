import { describe, it, expect } from 'vitest'
import { round2, berekenBudgetStatus } from '../../src/utils/budgetUtils'
import type { Project, Tijdregistratie } from '@/types'

const project = (velden: Partial<Project>): Project =>
  ({ id: 'p1', naam: 'Test', ...velden }) as unknown as Project

const uren = (minuten: number, uurtarief: number): Tijdregistratie =>
  ({ id: 't1', duur_minuten: minuten, uurtarief }) as unknown as Tijdregistratie

/**
 * round2 zit in 36 bestanden en raakt factuurtotalen, offerteregels en de
 * bedragen die naar Mollie gaan. Deze tests pinnen wat de functie ECHT doet,
 * niet wat je van een geldafronding zou hopen. Twee grenzen zijn hieronder
 * expliciet vastgelegd, zodat ze opvallen in plaats van een keer stil geld te
 * kosten.
 */
describe('round2', () => {
  it('rondt normale bedragen af op twee decimalen', () => {
    expect(round2(12.344)).toBe(12.34)
    expect(round2(12.346)).toBe(12.35)
    expect(round2(100)).toBe(100)
    expect(round2(0)).toBe(0)
  })

  it('houdt het teken bij negatieve bedragen (creditnota)', () => {
    expect(round2(-12.344)).toBe(-12.34)
    expect(round2(-853.055)).toBeCloseTo(-853.05, 2)
  })

  /**
   * Waar de + Number.EPSILON voor bedoeld is. Zonder die term is 1.005 * 100 in
   * binaire floats 100.49999999999999 en rondt Math.round naar 100, dus 1.00 in
   * plaats van 1.01.
   */
  it('lost de klassieke 1.005-fout op', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(Math.round(1.005 * 100) / 100).toBe(1) // zonder EPSILON: fout
  })

  /**
   * GRENS 1. Number.EPSILON is een absolute waarde (~2.2e-16), geen relatieve.
   * Bij een bedrag van vijf cijfers valt hij weg in de precisie van een double
   * en doet de correctie niets meer. 10000.005 hoort naar 10000.01 te gaan en
   * wordt 10000.00: een halve cent naar beneden.
   *
   * Praktisch klein, maar wel echt, en het schaalt met het bedrag. Wie hier ooit
   * exacte centen nodig heeft moet naar integer-centen of een decimal-type, niet
   * naar een grotere epsilon.
   */
  it('corrigeert NIET meer bij grote bedragen, en dat is bekend', () => {
    expect(round2(10000.005)).toBe(10000)
    expect(round2(100000.005)).toBe(100000.01) // hier valt hij toevallig goed uit
  })

  /**
   * GRENS 2. Niet elke .xx5 rondt naar boven, omdat sommige van die getallen in
   * binair al net onder de helft liggen. 8.165 is in werkelijkheid
   * 8.16499999999999914..., dus naar beneden afronden is wat de float zegt.
   * Dit is geen bug in round2 maar een eigenschap van floating point.
   */
  it('is geen echte half-up afronding', () => {
    expect(round2(8.165)).toBe(8.16)
    expect(round2(2.675)).toBe(2.68)
  })
})

describe('berekenBudgetStatus', () => {
  it('geeft alles op nul zonder budget, zonder te delen door nul', () => {
    const s = berekenBudgetStatus(project({ budget: 0 }), [uren(600, 65)])
    expect(s).toEqual({ budget: 0, verbruikt: 0, percentage: 0, niveau: 'normaal' })
  })

  it('behandelt een ontbrekend budget als geen budget', () => {
    expect(berekenBudgetStatus(project({}), []).niveau).toBe('normaal')
  })

  it('rekent urenkosten en al bestede bedragen bij elkaar op', () => {
    // 120 min = 2 uur x 65 = 130, plus 70 besteed = 200 van 1000 = 20%
    const s = berekenBudgetStatus(project({ budget: 1000, besteed: 70 }), [uren(120, 65)])
    expect(s.verbruikt).toBe(200)
    expect(s.percentage).toBe(20)
    expect(s.niveau).toBe('normaal')
  })

  it('slaat om naar waarschuwing op de standaarddrempel van 80 procent', () => {
    expect(berekenBudgetStatus(project({ budget: 1000, besteed: 799 }), []).niveau).toBe('normaal')
    expect(berekenBudgetStatus(project({ budget: 1000, besteed: 800 }), []).niveau).toBe('waarschuwing')
  })

  it('respecteert een eigen drempel, ook de waarde 0', () => {
    const eigen = project({ budget: 1000, besteed: 500, budget_waarschuwing_pct: 40 })
    expect(berekenBudgetStatus(eigen, []).niveau).toBe('waarschuwing')

    // ?? en niet ||, dus 0 blijft 0: alles is dan meteen waarschuwing.
    const nul = project({ budget: 1000, besteed: 1, budget_waarschuwing_pct: 0 })
    expect(berekenBudgetStatus(nul, []).niveau).toBe('waarschuwing')
  })

  it('laat overschreden voorgaan op de waarschuwingsdrempel', () => {
    const s = berekenBudgetStatus(project({ budget: 1000, besteed: 1000 }), [])
    expect(s.percentage).toBe(100)
    expect(s.niveau).toBe('overschreden')
  })

  it('gaat boven de 100 procent door in plaats van af te kappen', () => {
    const s = berekenBudgetStatus(project({ budget: 500, besteed: 750 }), [])
    expect(s.percentage).toBe(150)
    expect(s.niveau).toBe('overschreden')
  })

  it('negeert registraties zonder minuten of tarief', () => {
    const s = berekenBudgetStatus(project({ budget: 1000 }), [
      uren(0, 65),
      ({ id: 'x' }) as unknown as Tijdregistratie,
    ])
    expect(s.verbruikt).toBe(0)
  })

  /**
   * De reduce doet `sum + round2(uren * tarief)`, dus elke registratie wordt
   * apart afgerond voordat er opgeteld wordt. Dat is niet hetzelfde als eerst
   * optellen en dan afronden, en het verschil loopt op met het aantal
   * registraties. Bij normale uurtarieven is de drift verwaarloosbaar, maar de
   * keuze staat hier vastgelegd zodat een wijziging opvalt.
   */
  it('rondt per registratie af, niet over de som', () => {
    // 1 min tegen 0.30 per uur = 0.005 per registratie. Per stuk afgerond wordt
    // dat 0.01, dus 4 registraties geven 0.04 en niet de som 0.02.
    const vier = [uren(1, 0.3), uren(1, 0.3), uren(1, 0.3), uren(1, 0.3)]
    expect(berekenBudgetStatus(project({ budget: 100 }), vier).verbruikt).toBe(0.04)
  })
})
