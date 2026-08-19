import { describe, it, expect, beforeAll } from 'vitest'

// Zie tests/api/supportMelding.test.ts: env vóór de import, anders gooit
// createClient op module-niveau.
type SuggestieApi = typeof import('../../api/ai-suggestie')
let api: SuggestieApi

beforeAll(async () => {
  process.env.VITE_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  api = await import('../../api/ai-suggestie')
})

/**
 * De uitvoer van het model gaat één op één in de mail van de gebruiker zodra
 * hij Tab drukt. Alles wat hier doorheen glipt, staat straks in een bericht
 * aan een klant — vandaar dat juist deze schoonmaak een test heeft.
 */
describe('schoonSuggestie', () => {
  it('houdt een normale voortzetting heel', () => {
    expect(api.schoonSuggestie(' morgen de proefdruk toe.', 'Ik stuur je'))
      .toBe(' morgen de proefdruk toe.')
  })

  it('kapt af na de eerste zin', () => {
    expect(api.schoonSuggestie(' toe. Laat je het even weten?', 'Ik stuur hem'))
      .toBe(' toe.')
  })

  it('houdt alleen de eerste regel', () => {
    expect(api.schoonSuggestie(' hem toe\n\nMet vriendelijke groet', 'Ik stuur'))
      .toBe(' hem toe')
  })

  it('haalt aanhalingstekens om het antwoord weg', () => {
    expect(api.schoonSuggestie('" hem morgen toe"', 'Ik stuur'))
      .toBe(' hem morgen toe')
  })

  it('gooit een herhaling van het laatste woord weg', () => {
    // Zonder deze controle levert Tab "de deofferte".
    expect(api.schoonSuggestie('offerte komt eraan', 'Ik denk dat de off')).toBe('')
  })

  it('laat een kort laatste woord met rust · "de" mag prima gevolgd worden', () => {
    expect(api.schoonSuggestie(' offerte eraan komt.', 'Ik denk dat de'))
      .toBe(' offerte eraan komt.')
  })

  it('voorkomt een dubbele spatie op de naad', () => {
    expect(api.schoonSuggestie('  eraan komt.', 'Ik denk dat de offerte '))
      .toBe('eraan komt.')
  })

  it('kapt te lange antwoorden af op een woordgrens', () => {
    const lang = ' ' + 'woord '.repeat(30)
    const uit = api.schoonSuggestie(lang, 'Hierbij')
    expect(uit.length).toBeLessThanOrEqual(90)
    expect(uit.endsWith('woord')).toBe(true)
  })

  it('geeft leeg terug als het model niets weet', () => {
    expect(api.schoonSuggestie('', 'Ik stuur je')).toBe('')
    expect(api.schoonSuggestie('   ', 'Ik stuur je')).toBe('')
  })
})
