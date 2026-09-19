import { describe, it, expect } from 'vitest'
import { btwTarievenVoor, standaardBtwTarief, isZuiverTarief, zuiverTarief, dichtstbijzijndTarief, abonnementBtwVerlegd } from '@/lib/btwTarieven'

describe('btwTarievenVoor', () => {
  it('geeft NL-tarieven als er geen land bekend is', () => {
    expect(btwTarievenVoor(undefined)).toEqual([21, 9, 0])
    expect(btwTarievenVoor('Nederland')).toEqual([21, 9, 0])
  })

  it('geeft de Belgische tarieven voor BE', () => {
    expect(btwTarievenVoor('BE')).toEqual([21, 12, 6, 0])
    expect(standaardBtwTarief('BE')).toBe(21)
  })
})

describe('zuiverTarief', () => {
  it('herkent 9% als zuiver voor NL en 6% niet', () => {
    expect(zuiverTarief(100, 9, 'NL')).toBe(9)
    expect(zuiverTarief(100, 6, 'NL')).toBeUndefined()
  })

  it('herkent 6% en 12% als zuiver voor BE en 9% niet', () => {
    expect(zuiverTarief(100, 6, 'BE')).toBe(6)
    expect(zuiverTarief(250, 30, 'BE')).toBe(12)
    expect(zuiverTarief(100, 9, 'BE')).toBeUndefined()
  })

  it('tolereert twee cent afronding', () => {
    expect(zuiverTarief(333.33, 70.01, 'NL')).toBe(21)
    expect(zuiverTarief(333.33, 70.05, 'NL')).toBeUndefined()
  })
})

describe('isZuiverTarief en dichtstbijzijndTarief', () => {
  it('volgt het land', () => {
    expect(isZuiverTarief(12, 'NL')).toBe(false)
    expect(isZuiverTarief(12, 'BE')).toBe(true)
    expect(dichtstbijzijndTarief(7, 'NL')).toBe(9)
    expect(dichtstbijzijndTarief(7, 'BE')).toBe(6)
    expect(dichtstbijzijndTarief(50, 'BE')).toBe(21)
  })
})

describe('abonnementBtwVerlegd', () => {
  it('verlegt voor een Belgische organisatie met Belgisch btw-nummer', () => {
    expect(abonnementBtwVerlegd('BE', 'BE 0437.299.999')).toBe(true)
    expect(abonnementBtwVerlegd('België', 'BE0437299999')).toBe(true)
  })

  it('verlegt niet voor Nederland, zonder btw-nummer of met een NL-nummer', () => {
    expect(abonnementBtwVerlegd('NL', 'NL123456789B01')).toBe(false)
    expect(abonnementBtwVerlegd('BE', '')).toBe(false)
    expect(abonnementBtwVerlegd('BE', 'NL123456789B01')).toBe(false)
    expect(abonnementBtwVerlegd(undefined, 'BE0437299999')).toBe(false)
  })
})
