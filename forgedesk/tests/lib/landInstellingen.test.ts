import { describe, it, expect } from 'vitest'
import { landLabels, standaardInstellingenVoorLand, demoKlantenVoorLand } from '@/lib/landInstellingen'

describe('landLabels', () => {
  it('geeft KvK voor Nederland en KBO voor België, met passende placeholders', () => {
    expect(landLabels('NL').ondernemingsnummer).toBe('KvK-nummer')
    expect(landLabels('BE').ondernemingsnummer).toContain('KBO')
    expect(landLabels('BE').postcodePlaceholder).toBe('2000')
    expect(landLabels('BE').ibanPlaceholder.startsWith('BE')).toBe(true)
    expect(landLabels('Atlantis')).toEqual(landLabels('NL'))
  })
})

describe('standaardInstellingenVoorLand', () => {
  it('zet voor België de wettelijke interest en het forfait van € 40 in de factuurvoorwaarden', () => {
    const be = standaardInstellingenVoorLand('BE')
    expect(be.factuur_betaaltermijn_dagen).toBe(30)
    expect(be.factuur_voorwaarden).toContain('2 augustus 2002')
    expect(be.factuur_voorwaarden).toContain('40')
  })

  it('laat Nederland op de bestaande standaard', () => {
    expect(standaardInstellingenVoorLand(undefined)).toEqual({ factuur_betaaltermijn_dagen: 30, factuur_voorwaarden: 'Betaling binnen 30 dagen na factuurdatum.' })
  })
})

describe('demoKlantenVoorLand', () => {
  it('geeft Belgische voorbeeldklanten met btw-nummer voor BE en Nederlandse voor de rest', () => {
    const be = demoKlantenVoorLand('BE')
    expect(be).toHaveLength(3)
    expect(be.every((k) => k.land === 'BE' && k.btw_nummer.startsWith('BE') && /^\d{4}$/.test(k.postcode))).toBe(true)
    const nl = demoKlantenVoorLand('NL')
    expect(nl.every((k) => k.land === 'NL')).toBe(true)
  })
})
