import { describe, it, expect } from 'vitest'
import {
  DASHBOARD_BLOKKEN,
  DASHBOARD_PRESETS,
  herkenPreset,
  zichtbareBlokken,
} from '../../src/components/dashboard/dashboardBlokken'

describe('zichtbareBlokken', () => {
  it('toont alles zolang er niets is ingesteld', () => {
    expect(zichtbareBlokken(null).size).toBe(DASHBOARD_BLOKKEN.length)
    expect(zichtbareBlokken(undefined).size).toBe(DASHBOARD_BLOKKEN.length)
  })

  it('houdt een lege keuze leeg — dat is bewust alles uit', () => {
    expect(zichtbareBlokken([]).size).toBe(0)
  })

  it('negeert blokken die niet meer bestaan', () => {
    const zichtbaar = zichtbareBlokken(['vandaag', 'oud-blok-uit-2025'])
    expect([...zichtbaar]).toEqual(['vandaag'])
  })
})

describe('presets', () => {
  it('bevatten alleen bestaande blokken', () => {
    const geldig = new Set(DASHBOARD_BLOKKEN.map((b) => b.id))
    for (const preset of DASHBOARD_PRESETS) {
      for (const id of preset.blokken) expect(geldig.has(id)).toBe(true)
    }
  })

  it('laat montage zonder cijfers en opvolging', () => {
    const montage = DASHBOARD_PRESETS.find((p) => p.id === 'montage')!
    expect(montage.blokken).toContain('vandaag')
    expect(montage.blokken).not.toContain('kpi')
    expect(montage.blokken).not.toContain('opvolgen')
  })

  it('herkent een preset terug uit een selectie, ongeacht volgorde', () => {
    const montage = DASHBOARD_PRESETS.find((p) => p.id === 'montage')!
    expect(herkenPreset([...montage.blokken].reverse())).toBe('montage')
  })

  it('noemt een eigen mix geen preset', () => {
    expect(herkenPreset(['vandaag', 'kpi', 'team'])).toBeNull()
  })
})
