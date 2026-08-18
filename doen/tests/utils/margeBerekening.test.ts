import { describe, it, expect } from 'vitest'
import {
  berekenMarkupPercentage,
  berekenWinst,
  berekenVerkoopVanMarkup,
} from '../../src/utils/margeBerekening'

/**
 * Markup, niet marge. De signmaker-conventie rekent winst af tegen de
 * INKOOPprijs, niet tegen de verkoopprijs. Bij inkoop 100 en verkoop 150 is de
 * markup 50% en de marge 33,3%. Die twee door elkaar halen scheelt een derde,
 * en deze functies worden gebruikt in de offerteregels, de calculatie, de
 * nacalculatie en de rapportages.
 */
describe('berekenMarkupPercentage', () => {
  it('rekent markup tegen de inkoopprijs, niet tegen de verkoopprijs', () => {
    expect(berekenMarkupPercentage(100, 150)).toBeCloseTo(50)
    // Zou het marge zijn, dan stond hier 33,33.
    expect(berekenMarkupPercentage(100, 200)).toBeCloseTo(100)
  })

  it('geeft 0 bij verkoop gelijk aan inkoop', () => {
    expect(berekenMarkupPercentage(250, 250)).toBe(0)
  })

  it('geeft een negatief getal bij verlies', () => {
    expect(berekenMarkupPercentage(100, 80)).toBeCloseTo(-20)
  })

  /**
   * De guard op inkoop <= 0 is bewust en moet blijven staan. RapportagesLayout
   * roept dit aan als berekenMarkupPercentage(project.besteed, project.budget).
   * Een project waar nog niets aan besteed is heeft besteed = 0; zonder guard
   * zou dat delen door nul zijn en Infinity of NaN in een winstgevendheids-
   * rapport zetten. Haal deze guard dus niet weg om "de wiskunde te kloppen".
   */
  it('geeft 0 in plaats van Infinity als er nog niets besteed is', () => {
    expect(berekenMarkupPercentage(0, 1500)).toBe(0)
    expect(Number.isFinite(berekenMarkupPercentage(0, 1500))).toBe(true)
  })

  it('geeft 0 bij een negatieve inkoop in plaats van een omgeklapt teken', () => {
    expect(berekenMarkupPercentage(-100, 150)).toBe(0)
  })

  it('geeft nooit NaN, ook niet bij nul op nul', () => {
    expect(berekenMarkupPercentage(0, 0)).toBe(0)
  })
})

describe('berekenWinst', () => {
  it('vermenigvuldigt het verschil met het aantal', () => {
    expect(berekenWinst(100, 150, 3)).toBe(150)
  })

  it('gaat uit van één stuk als het aantal ontbreekt', () => {
    expect(berekenWinst(100, 150)).toBe(50)
  })

  it('geeft verlies als negatief terug, niet als nul', () => {
    expect(berekenWinst(200, 120, 2)).toBe(-160)
  })

  it('geeft 0 bij aantal 0, niet het losse verschil', () => {
    expect(berekenWinst(100, 150, 0)).toBe(0)
  })
})

describe('berekenVerkoopVanMarkup', () => {
  it('telt de markup bij de inkoopprijs op', () => {
    expect(berekenVerkoopVanMarkup(100, 50)).toBeCloseTo(150)
  })

  it('laat de prijs ongemoeid bij markup 0', () => {
    expect(berekenVerkoopVanMarkup(340, 0)).toBe(340)
  })

  it('kan onder de inkoopprijs komen bij een negatieve markup', () => {
    expect(berekenVerkoopVanMarkup(100, -20)).toBeCloseTo(80)
  })
})

/**
 * De twee richtingen moeten elkaar opheffen. Dit is de eigenschap waar de
 * calculatie op leunt: de gebruiker vult een markup in, ziet een verkoopprijs,
 * en de offerteregel rekent daar de markup weer uit terug. Lopen die uiteen,
 * dan verschilt het percentage in de calculatie van dat op de offerte.
 */
describe('heen en terug', () => {
  it('geeft dezelfde markup terug na het omrekenen naar een verkoopprijs', () => {
    for (const inkoop of [1, 12.5, 100, 3999.99]) {
      for (const markup of [0, 15, 42.5, 150]) {
        const verkoop = berekenVerkoopVanMarkup(inkoop, markup)
        expect(berekenMarkupPercentage(inkoop, verkoop)).toBeCloseTo(markup, 6)
      }
    }
  })

  it('houdt winst en markup consistent op één stuk', () => {
    const inkoop = 250
    const verkoop = berekenVerkoopVanMarkup(inkoop, 40)
    expect(berekenWinst(inkoop, verkoop)).toBeCloseTo(100)
    expect(berekenMarkupPercentage(inkoop, verkoop)).toBeCloseTo(40)
  })
})
