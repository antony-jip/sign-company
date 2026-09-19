import { describe, it, expect } from 'vitest'
import { landNaarIso, landOfStandaard, landNaam, ondernemingsnummerUitBtw, LANDEN } from '@/lib/landen'

describe('landNaarIso', () => {
  it('herkent de oude vrije-tekstwaarden uit de database', () => {
    expect(landNaarIso('Nederland')).toBe('NL')
    expect(landNaarIso(' belgië ')).toBe('BE')
    expect(landNaarIso('Belgie')).toBe('BE')
    expect(landNaarIso('Duitsland')).toBe('DE')
  })

  it('laat ISO-codes door, ongeacht hoofdletters', () => {
    expect(landNaarIso('NL')).toBe('NL')
    expect(landNaarIso('be')).toBe('BE')
  })

  it('geeft null voor leeg of onbekend, zodat de aanroeper zelf kiest', () => {
    expect(landNaarIso('')).toBeNull()
    expect(landNaarIso(null)).toBeNull()
    expect(landNaarIso('Atlantis')).toBeNull()
    expect(landNaarIso('XX')).toBeNull()
  })
})

describe('landOfStandaard', () => {
  it('valt terug op NL', () => {
    expect(landOfStandaard(undefined)).toBe('NL')
    expect(landOfStandaard('Atlantis')).toBe('NL')
    expect(landOfStandaard('BE')).toBe('BE')
  })
})

describe('landNaam', () => {
  it('toont de naam bij een code en laat onbekende tekst met rust', () => {
    expect(landNaam('BE')).toBe('België')
    expect(landNaam('Nederland')).toBe('Nederland')
    expect(landNaam('Atlantis')).toBe('Atlantis')
    expect(landNaam(null)).toBe('')
  })

  it('heeft voor elk land in de lijst een naam', () => {
    for (const l of LANDEN) expect(landNaam(l.code)).toBe(l.naam)
  })
})

describe('ondernemingsnummerUitBtw', () => {
  it('haalt het Belgische ondernemingsnummer uit het btw-nummer', () => {
    expect(ondernemingsnummerUitBtw('BE0437299999', 'BE')).toBe('0437299999')
    expect(ondernemingsnummerUitBtw('BE 0437.299.999', 'BE')).toBe('0437299999')
    expect(ondernemingsnummerUitBtw('0437299999', 'BE')).toBe('0437299999')
  })

  it('weigert wat geen tien cijfers met 0 of 1 vooraan is', () => {
    expect(ondernemingsnummerUitBtw('BE12345', 'BE')).toBeNull()
    expect(ondernemingsnummerUitBtw('NL123456789B01', 'BE')).toBeNull()
    expect(ondernemingsnummerUitBtw('', 'BE')).toBeNull()
  })

  it('kent alleen België', () => {
    expect(ondernemingsnummerUitBtw('NL123456789B01', 'NL')).toBeNull()
  })
})

describe('getFeestdagen', () => {
  it('kiest Belgische feestdagen voor BE en Nederlandse voor de rest', async () => {
    const { getFeestdagen } = await import('@/utils/feestdagen')
    const be = getFeestdagen('BE', 2026).map((f) => f.datum)
    expect(be).toContain('2026-07-21')
    expect(be).toContain('2026-11-11')
    expect(be).not.toContain('2026-04-27')
    const nl = getFeestdagen(undefined, 2026).map((f) => f.datum)
    expect(nl).toContain('2026-04-27')
    expect(nl).not.toContain('2026-07-21')
  })
})
