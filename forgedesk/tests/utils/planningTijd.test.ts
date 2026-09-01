import { describe, it, expect } from 'vitest'
import { vergelijkTijd, vergelijkTijdAflopend, tijdLabel, tijdBereik } from '@/utils/planningTijd'

describe('vergelijkTijd', () => {
  it('sorteert oplopend op tijd', () => {
    const rijen = ['12:00', '08:00', '17:30'].sort(vergelijkTijd)
    expect(rijen).toEqual(['08:00', '12:00', '17:30'])
  })

  it('zet rijen zonder starttijd achteraan in plaats van te crashen', () => {
    const rijen = ['12:00', null, '08:00', undefined].sort(vergelijkTijd)
    expect(rijen.slice(0, 2)).toEqual(['08:00', '12:00'])
    expect(rijen.slice(2).every((t) => !t)).toBe(true)
  })

  it('twee lege tijden zijn gelijk', () => {
    expect(vergelijkTijd(null, undefined)).toBe(0)
    expect(vergelijkTijd(null, null)).toBe(0)
  })
})

describe('vergelijkTijdAflopend', () => {
  it('sorteert aflopend, lege tijden blijven onderaan', () => {
    const rijen = ['08:00', null, '17:30', '12:00'].sort(vergelijkTijdAflopend)
    expect(rijen).toEqual(['17:30', '12:00', '08:00', null])
  })
})

describe('tijdLabel', () => {
  it('kort een postgres-tijd in tot HH:mm', () => {
    expect(tijdLabel('08:00:00')).toBe('08:00')
  })

  it('toont een streepje in plaats van "null"', () => {
    expect(tijdLabel(null)).toBe('–')
    expect(tijdLabel('')).toBe('–')
  })
})

describe('tijdBereik', () => {
  it('toont een volledig bereik', () => {
    expect(tijdBereik('08:00:00', '17:00:00')).toBe('08:00 – 17:00')
  })

  it('zegt wat er wel bekend is als een tijd ontbreekt', () => {
    expect(tijdBereik(null, '10:00:00')).toBe('tot 10:00')
    expect(tijdBereik('08:00:00', null)).toBe('vanaf 08:00')
    expect(tijdBereik(null, null)).toBe('tijd onbekend')
  })
})
