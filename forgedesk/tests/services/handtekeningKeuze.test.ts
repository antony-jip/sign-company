import { describe, it, expect } from 'vitest'
import { kiesHandtekening, type Handtekening } from '@/services/handtekeningService'

function h(over: Partial<Handtekening>): Handtekening {
  return {
    id: 'x', naam: 'X', inhoud: '', afbeeldingUrl: null, afbeeldingLink: null,
    afbeeldingBreedte: null, isStandaard: false, accountId: null, volgorde: 0, ...over,
  }
}

describe('kiesHandtekening', () => {
  it('geeft niets terug als er geen handtekeningen zijn', () => {
    // Dan valt de aanroeper terug op het profielveld, de wereld van vóór 248.
    expect(kiesHandtekening([], 'postvak-a')).toBeNull()
  })

  it('kiest de handtekening die aan het postvak hangt', () => {
    const lijst = [
      h({ id: 'standaard', isStandaard: true }),
      h({ id: 'zakelijk', accountId: 'postvak-b' }),
    ]
    expect(kiesHandtekening(lijst, 'postvak-b')?.id).toBe('zakelijk')
  })

  it('valt terug op de standaard als het postvak er geen heeft', () => {
    const lijst = [
      h({ id: 'kort' }),
      h({ id: 'standaard', isStandaard: true }),
      h({ id: 'zakelijk', accountId: 'postvak-b' }),
    ]
    expect(kiesHandtekening(lijst, 'postvak-a')?.id).toBe('standaard')
    expect(kiesHandtekening(lijst)?.id).toBe('standaard')
  })

  it('neemt de eerste als niemand standaard is', () => {
    const lijst = [h({ id: 'eerste' }), h({ id: 'tweede' })]
    expect(kiesHandtekening(lijst)?.id).toBe('eerste')
  })

  it('laat het postvak winnen van de standaard', () => {
    // Anders zou een tweede postvak altijd met de handtekening van het eerste
    // ondertekenen, en dat is precies waarom dit gebouwd is.
    const lijst = [
      h({ id: 'standaard', isStandaard: true }),
      h({ id: 'van-postvak', accountId: 'postvak-b', isStandaard: false }),
    ]
    expect(kiesHandtekening(lijst, 'postvak-b')?.id).toBe('van-postvak')
  })
})
