import { describe, it, expect } from 'vitest'
import {
  normaliseerBedrijfsnaam,
  normaliseerBedrag,
  normaliseerDatum,
} from '../src/services/importService'

describe('normaliseerBedrijfsnaam · bepaalt wie als duplicaat wordt overgeslagen', () => {
  it('herkent dezelfde relatie met en zonder rechtsvorm', () => {
    expect(normaliseerBedrijfsnaam('Bakkerij Janssen B.V.'))
      .toBe(normaliseerBedrijfsnaam('Bakkerij Janssen'))
    expect(normaliseerBedrijfsnaam('Jansen VOF')).toBe(normaliseerBedrijfsnaam('Jansen'))
  })

  it('houdt holding en werkmaatschappij uit elkaar', () => {
    // Twee relaties met een eigen debiteurennummer. Vielen ze samen, dan werd
    // de tweede stil overgeslagen en ontbrak die klant na de import.
    expect(normaliseerBedrijfsnaam('Bakker Holding B.V.'))
      .not.toBe(normaliseerBedrijfsnaam('Bakker B.V.'))
    expect(normaliseerBedrijfsnaam('De Groot Holding'))
      .not.toBe(normaliseerBedrijfsnaam('De Groot'))
  })
})

describe('normaliseerBedrag', () => {
  it('leest Nederlandse notatie met euroteken en duizendtallen', () => {
    expect(normaliseerBedrag('€ 1.234,56')).toBe(1234.56)
    expect(normaliseerBedrag('1234,56')).toBe(1234.56)
  })

  it('leest Engelse notatie', () => {
    expect(normaliseerBedrag('1,234.56')).toBe(1234.56)
  })

  it('geeft null bij een leeg veld', () => {
    expect(normaliseerBedrag('')).toBeNull()
  })
})

describe('normaliseerDatum', () => {
  it('accepteert meer formaten dan de hulptekst voorschrijft', () => {
    expect(normaliseerDatum('2026-01-15')).toBe('2026-01-15')
    expect(normaliseerDatum('15-01-2026')).toBe('2026-01-15')
    expect(normaliseerDatum('15/01/2026')).toBe('2026-01-15')
    expect(normaliseerDatum('20260115')).toBe('2026-01-15')
  })

  it('geeft null bij een onleesbare datum in plaats van een gok', () => {
    expect(normaliseerDatum('15 januari 2026')).toBeNull()
  })
})
