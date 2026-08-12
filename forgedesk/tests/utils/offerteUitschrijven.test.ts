import { describe, it, expect, beforeAll } from 'vitest'

// De route maakt bij het laden een supabase-client aan; die wil een sleutel zien.
process.env.VITE_SUPABASE_URL ||= 'http://localhost'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test'

type Helpers = typeof import('../../api/offerte-uitschrijven')
let pakAntwoordUit: Helpers['pakAntwoordUit']
let pakLijstUit: Helpers['pakLijstUit']
let normaliseerRegels: Helpers['normaliseerRegels']

beforeAll(async () => {
  ;({ pakAntwoordUit, pakLijstUit, normaliseerRegels } = await import('../../api/offerte-uitschrijven'))
})

// Sonnet levert het tool-antwoord met enige regelmaat als JSON-tekst in plaats
// van als object. Beide vormen zijn in de proef op het ZZM-document gezien.
// Zonder uitpakken valt het uitschrijven stil terug op een leeg resultaat, en
// bij per-veld uitpakken verdwijnen de velden die in dezelfde tekst zaten.

const NORMAAL = {
  posten: [{ titel: 'Banier atrium', pagina: 7 }],
  algemene_opmerkingen: ['Montage extern tenzij anders vermeld'],
}

describe('pakAntwoordUit', () => {
  it('laat een normaal antwoord met rust', () => {
    expect(pakAntwoordUit(NORMAAL)).toEqual(NORMAAL)
  })

  it('pakt een antwoord uit dat volledig in één veld als tekst zit', () => {
    const verpakt = { posten: JSON.stringify(NORMAAL) }
    const uit = pakAntwoordUit(verpakt)
    expect(pakLijstUit(uit.posten, 'posten')).toHaveLength(1)
    expect(pakLijstUit(uit.algemene_opmerkingen, 'algemene_opmerkingen')).toEqual([
      'Montage extern tenzij anders vermeld',
    ])
  })

  it('pakt een antwoord uit dat als losse tekst binnenkomt', () => {
    expect(pakAntwoordUit(JSON.stringify(NORMAAL))).toEqual(NORMAAL)
  })

  it('geeft een leeg object bij onzin', () => {
    expect(pakAntwoordUit('geen json')).toEqual({})
    expect(pakAntwoordUit(null)).toEqual({})
  })
})

describe('normaliseerRegels', () => {
  const REGELS = [
    { index: 0, beschrijving: 'Banier voor het atrium, geprint op frontlit 510 gr/m2.' },
    { index: 1, beschrijving: 'Belettering schuifdeur in Avery 700 wit.' },
  ]

  it('leest een gewone array', () => {
    expect(normaliseerRegels(REGELS)).toEqual(REGELS)
  })

  it('leest regels die als JSON-tekst met omhulsel binnenkomen', () => {
    expect(normaliseerRegels(JSON.stringify({ regels: REGELS }))).toEqual(REGELS)
  })

  it('gooit onbruikbare regels weg in plaats van te raden', () => {
    expect(normaliseerRegels([{ index: 0 }, 'los', REGELS[0]])).toEqual([REGELS[0]])
    expect(normaliseerRegels(undefined)).toEqual([])
  })
})
