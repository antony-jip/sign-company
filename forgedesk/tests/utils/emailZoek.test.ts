import { describe, it, expect } from 'vitest'
import { parseZoekQuery } from '../../src/utils/emailZoek'

describe('parseZoekQuery', () => {
  it('parseert kale tekst als full-text query', () => {
    expect(parseZoekQuery('logo wognum')).toEqual({ tekst: 'logo wognum' })
  })

  it('haalt van: eruit en laat de rest als tekst', () => {
    const f = parseZoekQuery('van:jan offerte')
    expect(f.van).toBe('jan')
    expect(f.tekst).toBe('offerte')
  })

  it('ondersteunt Engelse aliassen', () => {
    const f = parseZoekQuery('from:piet after:2024 before:2025-06 has:ja')
    expect(f.van).toBe('piet')
    expect(f.na).toBe('2024-01-01')
    expect(f.voor).toBe('2025-06-01')
    expect(f.bijlage).toBe(true)
  })

  it('normaliseert datums per granulariteit', () => {
    expect(parseZoekQuery('na:2024').na).toBe('2024-01-01')
    expect(parseZoekQuery('na:2024-03').na).toBe('2024-03-01')
    expect(parseZoekQuery('na:2024-03-15').na).toBe('2024-03-15')
  })

  it('negeert onbruikbare datums', () => {
    expect(parseZoekQuery('na:gisteren').na).toBeUndefined()
  })

  it('bijlage:nee filtert op geen bijlagen', () => {
    expect(parseZoekQuery('bijlage:nee').bijlage).toBe(false)
    expect(parseZoekQuery('bijlage:ja').bijlage).toBe(true)
  })

  it('combineert meerdere operators', () => {
    const f = parseZoekQuery('van:klant@bedrijf.nl na:2023 factuur spandoek')
    expect(f.van).toBe('klant@bedrijf.nl')
    expect(f.na).toBe('2023-01-01')
    expect(f.tekst).toBe('factuur spandoek')
  })

  it('laat dubbele punten in gewone woorden met rust', () => {
    expect(parseZoekQuery('re: offerte').tekst).toBe('re: offerte')
  })
})
