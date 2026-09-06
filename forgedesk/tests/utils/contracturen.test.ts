import { describe, it, expect } from 'vitest'
import { contractUrenOpDag, datumPlusDagen, lokaleIso, maandagVan } from '../../src/utils/contracturen'
import type { MedewerkerContract } from '../../src/types'

const contract: MedewerkerContract = {
  id: 'c1', medewerker_id: 'm1', geldig_van: '2026-01-01', geldig_tot: null,
  uren_ma: 8, uren_di: 8, uren_wo: 8, uren_do: 8, uren_vr: 8, uren_za: 0, uren_zo: 0,
}

describe('contracturen datumhelpers (TZ-onafhankelijk)', () => {
  it('maandagVan geeft de maandag van de week', () => {
    expect(maandagVan('2026-09-09')).toBe('2026-09-07')
    expect(maandagVan('2026-09-07')).toBe('2026-09-07')
    expect(maandagVan('2026-09-13')).toBe('2026-09-07')
  })

  it('datumPlusDagen telt lokale dagen', () => {
    expect(datumPlusDagen('2026-09-07', 1)).toBe('2026-09-08')
    expect(datumPlusDagen('2026-09-07', -1)).toBe('2026-09-06')
    expect(datumPlusDagen('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('lokaleIso schrijft de lokale datum, niet de UTC-datum', () => {
    expect(lokaleIso(new Date(2026, 8, 7, 0, 0, 0))).toBe('2026-09-07')
    expect(lokaleIso(new Date(2026, 8, 7, 23, 59, 59))).toBe('2026-09-07')
  })
})

describe('contractUrenOpDag', () => {
  it('leest de uren van de juiste weekdag', () => {
    expect(contractUrenOpDag([contract], 'm1', '2026-09-11')).toBe(8)
    expect(contractUrenOpDag([contract], 'm1', '2026-09-12')).toBe(0)
    expect(contractUrenOpDag([contract], 'm1', '2026-09-07')).toBe(8)
  })

  it('geeft 0 zonder geldend contract', () => {
    expect(contractUrenOpDag([contract], 'm2', '2026-09-11')).toBe(0)
    expect(contractUrenOpDag([contract], 'm1', '2025-12-31')).toBe(0)
  })
})
