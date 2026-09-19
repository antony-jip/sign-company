import { describe, it, expect } from 'vitest'
import { periodeGrenzen } from '@/services/cockpitService'

describe('periodeGrenzen · de periode van de cockpitcijfers', () => {
  const nu = new Date(2026, 8, 19, 23, 30) // 19 september 2026, laat op de avond (lokaal)

  it('loopt altijd tot en met vandaag, ook laat op de avond', () => {
    expect(periodeGrenzen('maand', nu)).toEqual({ van: '2026-09-01', tot: '2026-09-19' })
  })

  it('kent kwartaal en jaar', () => {
    expect(periodeGrenzen('kwartaal', nu).van).toBe('2026-07-01')
    expect(periodeGrenzen('jaar', nu).van).toBe('2026-01-01')
  })

  it('rolt twaalf maanden terug over de jaargrens', () => {
    expect(periodeGrenzen('twaalf_maanden', nu).van).toBe('2025-10-01')
    expect(periodeGrenzen('twaalf_maanden', new Date(2026, 0, 5)).van).toBe('2025-02-01')
  })
})
