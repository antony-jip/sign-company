import { describe, it, expect } from 'vitest'
import { buildAfwezigheidIndex, resolveAfwezig } from '../../src/utils/afwezigheid'
import type { VrijPatroon, Afwezigheid } from '../../src/types'

// dayIdx = (date.getDay()+6)%7 → ma=0 .. zo=6
const MA = 0
const VR = 4

function patroon(p: Partial<VrijPatroon>): VrijPatroon {
  return {
    id: 'p1', medewerker_id: 'm1', vrije_dagen: 0,
    geldig_van: null, geldig_tot: null, created_at: '', ...p,
  }
}
function afwezig(a: Partial<Afwezigheid>): Afwezigheid {
  return {
    id: 'a1', medewerker_id: 'm1', type: 'vakantie',
    start_datum: '2026-01-01', eind_datum: '2026-01-01', created_at: '', ...a,
  }
}

describe('resolveAfwezig', () => {
  it('niets ingesteld → niet afwezig', () => {
    const idx = buildAfwezigheidIndex([], [])
    expect(resolveAfwezig(idx, 'm1', '2026-06-08', MA).afwezig).toBe(false)
  })

  it('structureel vrij via bitmask (ma+vr)', () => {
    const mask = (1 << MA) | (1 << VR)
    const idx = buildAfwezigheidIndex([patroon({ vrije_dagen: mask })], [])
    expect(resolveAfwezig(idx, 'm1', '2026-06-08', MA)).toMatchObject({ afwezig: true, type: 'structureel', label: 'Vrij' })
    expect(resolveAfwezig(idx, 'm1', '2026-06-12', VR).afwezig).toBe(true)
    // woensdag (idx 2) niet vrij
    expect(resolveAfwezig(idx, 'm1', '2026-06-10', 2).afwezig).toBe(false)
  })

  it('tijdelijk patroon respecteert datumgrenzen', () => {
    const idx = buildAfwezigheidIndex([patroon({ vrije_dagen: 1 << MA, geldig_van: '2026-07-01', geldig_tot: '2026-08-31' })], [])
    expect(resolveAfwezig(idx, 'm1', '2026-06-29', MA).afwezig).toBe(false) // voor periode
    expect(resolveAfwezig(idx, 'm1', '2026-07-06', MA).afwezig).toBe(true)  // in periode
    expect(resolveAfwezig(idx, 'm1', '2026-09-07', MA).afwezig).toBe(false) // na periode
  })

  it('datumbereik-afwezigheid (vakantie, inclusief grenzen)', () => {
    const idx = buildAfwezigheidIndex([], [afwezig({ type: 'vakantie', start_datum: '2026-07-10', eind_datum: '2026-07-20' })])
    expect(resolveAfwezig(idx, 'm1', '2026-07-09', 3).afwezig).toBe(false)
    expect(resolveAfwezig(idx, 'm1', '2026-07-10', 4)).toMatchObject({ afwezig: true, type: 'vakantie', label: 'Vakantie' })
    expect(resolveAfwezig(idx, 'm1', '2026-07-20', 0).afwezig).toBe(true)
    expect(resolveAfwezig(idx, 'm1', '2026-07-21', 1).afwezig).toBe(false)
  })

  it('datumbereik wint van structureel vrij', () => {
    const idx = buildAfwezigheidIndex(
      [patroon({ vrije_dagen: 1 << MA })],
      [afwezig({ type: 'ziek', start_datum: '2026-06-08', eind_datum: '2026-06-08' })],
    )
    expect(resolveAfwezig(idx, 'm1', '2026-06-08', MA)).toMatchObject({ afwezig: true, type: 'ziek', label: 'Ziek' })
  })

  it('bijzonder gebruikt opmerking als label', () => {
    const idx = buildAfwezigheidIndex([], [afwezig({ type: 'bijzonder', opmerking: 'Tandarts', start_datum: '2026-06-08', eind_datum: '2026-06-08' })])
    expect(resolveAfwezig(idx, 'm1', '2026-06-08', MA).label).toBe('Tandarts')
  })

  it('status van andere monteur lekt niet', () => {
    const idx = buildAfwezigheidIndex([patroon({ medewerker_id: 'm1', vrije_dagen: 1 << MA })], [])
    expect(resolveAfwezig(idx, 'm2', '2026-06-08', MA).afwezig).toBe(false)
  })
})
