import { describe, it, expect } from 'vitest'
import { vulDetailRegels } from '../../src/utils/offerteSpecs'

const LABELS = ['Aantal', 'Materiaal', 'Formaat', 'Lay-out', 'Montage', 'Opmerking']

describe('vulDetailRegels', () => {
  it('zet de specs op de eigen labelrijen', () => {
    const uit = vulDetailRegels(LABELS, [
      { label: 'Materiaal', waarde: 'frontlit 510 gr/m2 B1' },
      { label: 'Afmeting', waarde: '150 x 500 cm' },
      { label: 'Montage', waarde: 'ZZM' },
    ])
    expect(uit.slice(0, 6)).toEqual([
      { label: 'Aantal', waarde: '' },
      { label: 'Materiaal', waarde: 'frontlit 510 gr/m2 B1' },
      { label: 'Formaat', waarde: '150 x 500 cm' },
      { label: 'Lay-out', waarde: '' },
      { label: 'Montage', waarde: 'ZZM' },
      { label: 'Opmerking', waarde: '' },
    ])
  })

  it('leest oplage als aantal en bestanden als lay-out', () => {
    const uit = vulDetailRegels(LABELS, [
      { label: 'Oplage', waarde: '200.000 ex.' },
      { label: 'Bestanden', waarde: 'aangeleverd door de klant' },
    ])
    expect(uit.find((r) => r.label === 'Aantal')?.waarde).toBe('200.000 ex.')
    expect(uit.find((r) => r.label === 'Lay-out')?.waarde).toBe('aangeleverd door de klant')
  })

  it('voegt meerdere waarden onder hetzelfde label samen', () => {
    const uit = vulDetailRegels(LABELS, [
      { label: 'Afmeting', waarde: '600 x 300 mm plano' },
      { label: 'Formaat', waarde: '75 x 100 mm afgewerkt' },
    ])
    expect(uit.find((r) => r.label === 'Formaat')?.waarde).toBe('600 x 300 mm plano · 75 x 100 mm afgewerkt')
  })

  it('hangt onbekende specs eronder in plaats van ze weg te gooien', () => {
    const uit = vulDetailRegels(LABELS, [
      { label: 'Materiaal', waarde: 'Avery 700 wit' },
      { label: 'Kitt', waarde: 'Innotec verlijmings- en afdichtingskit' },
    ])
    expect(uit).toHaveLength(LABELS.length + 1)
    expect(uit[uit.length - 1]).toEqual({ label: 'Kitt', waarde: 'Innotec verlijmings- en afdichtingskit' })
  })

  it('gebruikt elke spec maar één keer', () => {
    const uit = vulDetailRegels(['Formaat', 'Afmeting'], [{ label: 'Afmeting', waarde: '100 x 25 cm' }])
    expect(uit).toEqual([
      { label: 'Formaat', waarde: '100 x 25 cm' },
      { label: 'Afmeting', waarde: '' },
    ])
  })
})
