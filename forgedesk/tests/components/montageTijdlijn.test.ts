import { describe, it, expect } from 'vitest'
import { spanVan, verdeelInBanen } from '@/components/planning/MontageTijdlijnView'
import type { MontageAfspraak } from '@/types'

/**
 * Baanverdeling bepaalt of twee montages naast elkaar staan of over elkaar
 * heen. Fout gaat dit niet stuk maar onzichtbaar: een klus verdwijnt achter
 * een andere en de planner ziet een vrije middag die niet vrij is.
 */
function afspraak(id: string, start: string, eind: string): MontageAfspraak {
  return {
    id, project_id: 'p', klant_id: 'k', titel: id, beschrijving: '',
    datum: '2026-08-19', start_tijd: start, eind_tijd: eind, locatie: '',
    monteurs: [], status: 'gepland', materialen: [], notities: '',
    created_at: '', updated_at: '',
  }
}

describe('spanVan', () => {
  it('geeft een uur aan een afspraak zonder eindtijd · nul hoogte is onzichtbaar', () => {
    expect(spanVan(afspraak('a', '09:00', ''))).toEqual({ start: 540, eind: 600 })
  })

  it('negeert een eindtijd die vóór de starttijd ligt', () => {
    expect(spanVan(afspraak('a', '14:00', '09:00'))).toEqual({ start: 840, eind: 900 })
  })

  it('geeft null zonder starttijd, zodat de tijdlijn hem overslaat', () => {
    expect(spanVan(afspraak('a', '', '12:00'))).toBeNull()
  })
})

describe('verdeelInBanen', () => {
  it('laat afspraken die elkaar niet raken allebei op volle breedte staan', () => {
    const banen = verdeelInBanen([afspraak('a', '08:00', '10:00'), afspraak('b', '11:00', '12:00')])
    expect(banen.get('a')).toEqual({ baan: 0, banen: 1 })
    expect(banen.get('b')).toEqual({ baan: 0, banen: 1 })
  })

  it('zet twee overlappende afspraken naast elkaar', () => {
    const banen = verdeelInBanen([afspraak('a', '09:00', '12:00'), afspraak('b', '10:00', '11:00')])
    expect(banen.get('a')).toEqual({ baan: 0, banen: 2 })
    expect(banen.get('b')).toEqual({ baan: 1, banen: 2 })
  })

  it('hergebruikt een baan die weer vrij is', () => {
    const banen = verdeelInBanen([
      afspraak('a', '08:00', '12:00'),
      afspraak('b', '08:00', '09:00'),
      afspraak('c', '09:00', '10:00'),
    ])
    expect(banen.get('a')?.baan).toBe(0)
    expect(banen.get('b')?.baan).toBe(1)
    expect(banen.get('c')?.baan).toBe(1)
    expect(banen.get('c')?.banen).toBe(2)
  })

  it('telt een aansluitende afspraak niet als overlap', () => {
    const banen = verdeelInBanen([afspraak('a', '08:00', '10:00'), afspraak('b', '10:00', '11:00')])
    expect(banen.get('b')).toEqual({ baan: 0, banen: 1 })
  })

  it('slaat afspraken zonder starttijd over', () => {
    const banen = verdeelInBanen([afspraak('a', '', ''), afspraak('b', '09:00', '10:00')])
    expect(banen.has('a')).toBe(false)
    expect(banen.get('b')).toEqual({ baan: 0, banen: 1 })
  })
})
