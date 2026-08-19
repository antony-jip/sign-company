import { describe, it, expect } from 'vitest'
import { exBtw, betaaldExBtw, openstaandExBtw } from '@/utils/btwWeergave'

describe('exBtw', () => {
  it('neemt het subtotaal als dat er staat', () => {
    expect(exBtw({ subtotaal: 1000, btw_bedrag: 210, totaal: 1210 })).toBe(1000)
  })

  it('rekent terug vanaf het totaal als het subtotaal ontbreekt', () => {
    expect(exBtw({ btw_bedrag: 210, totaal: 1210 })).toBe(1000)
  })

  it('valt terug op het totaal als er niets over btw bekend is', () => {
    expect(exBtw({ totaal: 1210 })).toBe(1210)
  })

  it('geeft nul terug zonder document', () => {
    expect(exBtw(null)).toBe(0)
  })
})

describe('betaaldExBtw', () => {
  it('rekent een deelbetaling naar rato terug', () => {
    const factuur = { subtotaal: 1000, btw_bedrag: 210, totaal: 1210, betaald_bedrag: 605 }
    expect(betaaldExBtw(factuur)).toBe(500)
  })

  it('is nul als er niets betaald is', () => {
    expect(betaaldExBtw({ subtotaal: 1000, btw_bedrag: 210, totaal: 1210, betaald_bedrag: 0 })).toBe(0)
  })

  it('behandelt een btw-vrije factuur als volledig ex btw', () => {
    expect(betaaldExBtw({ subtotaal: 500, btw_bedrag: 0, totaal: 500, betaald_bedrag: 200 })).toBe(200)
  })
})

describe('openstaandExBtw', () => {
  it('trekt de betaling ex btw van het bedrag ex btw af', () => {
    const factuur = { subtotaal: 1000, btw_bedrag: 210, totaal: 1210, betaald_bedrag: 605 }
    expect(openstaandExBtw(factuur)).toBe(500)
  })

  it('is het hele bedrag zolang er niets betaald is', () => {
    expect(openstaandExBtw({ subtotaal: 1000, btw_bedrag: 210, totaal: 1210 })).toBe(1000)
  })

  it('is nul bij een volledig betaalde factuur', () => {
    const factuur = { subtotaal: 1000, btw_bedrag: 210, totaal: 1210, betaald_bedrag: 1210 }
    expect(openstaandExBtw(factuur)).toBe(0)
  })
})
