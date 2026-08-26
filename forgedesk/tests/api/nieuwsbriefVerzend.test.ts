import { describe, it, expect, beforeAll } from 'vitest'

// Zie tests/api/supportMelding.test.ts: env vóór de import, anders gooit
// createClient op module-niveau.
type VerzendApi = typeof import('../../api/nieuwsbrief-verzend')
let api: VerzendApi

beforeAll(async () => {
  process.env.VITE_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  api = await import('../../api/nieuwsbrief-verzend')
})

/**
 * Deze vier functies bepalen wat een ontvanger te zien krijgt en of hij
 * überhaupt in de testgroep valt. Gaat hier iets mis, dan krijgt de verkeerde
 * klant een aanbieding die niet voor hem bedoeld was, of krijgt iemand twee
 * verschillende onderwerpen. Vandaar dat juist dit een test heeft.
 */
describe('knipLabels', () => {
  const html = 'voor<!--doen:label:Retail--><b>alleen retail</b><!--/doen:label-->na'

  it('houdt het blok voor wie het label heeft', () => {
    expect(api.knipLabels(html, ['Retail'])).toBe('voor<b>alleen retail</b>na')
  })

  it('knipt het blok weg voor wie het label niet heeft', () => {
    expect(api.knipLabels(html, ['Horeca'])).toBe('voorna')
  })

  it('knipt het weg als de ontvanger geen labels heeft', () => {
    expect(api.knipLabels(html, [])).toBe('voorna')
  })

  it('let niet op hoofdletters of spaties', () => {
    expect(api.knipLabels(html, ['  retail '])).toBe('voor<b>alleen retail</b>na')
  })

  it('behandelt meerdere blokken los van elkaar', () => {
    const twee = '<!--doen:label:A-->een<!--/doen:label--><!--doen:label:B-->twee<!--/doen:label-->'
    expect(api.knipLabels(twee, ['B'])).toBe('twee')
  })

  it('laat html zonder markers ongemoeid', () => {
    expect(api.knipLabels('<p>gewoon</p>', ['Retail'])).toBe('<p>gewoon</p>')
  })
})

describe('voegUtmToe', () => {
  it('hangt de campagne aan een gewone link', () => {
    const uit = api.voegUtmToe('<a href="https://signcompany.nl/werk">x</a>', 'nieuws-mei')
    expect(uit).toContain('utm_source=nieuwsbrief')
    expect(uit).toContain('utm_medium=email')
    expect(uit).toContain('utm_campaign=nieuws-mei')
  })

  it('gebruikt & als de link al parameters heeft', () => {
    const uit = api.voegUtmToe('<a href="https://signcompany.nl/?a=1">x</a>', 'c')
    expect(uit).toContain('?a=1&utm_source=')
  })

  it('houdt de ankerlink achteraan', () => {
    const uit = api.voegUtmToe('<a href="https://signcompany.nl/werk#onder">x</a>', 'c')
    expect(uit).toContain('utm_campaign=c#onder')
  })

  it('raakt de afmeld-placeholder niet aan', () => {
    const bron = '<a href="{{{RESEND_UNSUBSCRIBE_URL}}}">uit</a>'
    expect(api.voegUtmToe(bron, 'c')).toBe(bron)
  })

  it('raakt mailto niet aan', () => {
    const bron = '<a href="mailto:antony@signcompany.nl">mail</a>'
    expect(api.voegUtmToe(bron, 'c')).toBe(bron)
  })

  it('laat een link met eigen utm_source staan', () => {
    const bron = '<a href="https://signcompany.nl/?utm_source=eigen">x</a>'
    expect(api.voegUtmToe(bron, 'c')).toBe(bron)
  })
})

describe('campagneNaam', () => {
  it('maakt een leesbare slug', () => {
    expect(api.campagneNaam('Nieuwe doosletters bij Sign Company')).toBe('nieuwe-doosletters-bij-sign-company')
  })

  it('haalt accenten en leestekens eruit', () => {
    expect(api.campagneNaam('Één déjà-vu!')).toBe('een-deja-vu')
  })

  it('valt terug op nieuwsbrief bij een leeg onderwerp', () => {
    expect(api.campagneNaam('   ')).toBe('nieuwsbrief')
  })
})

describe('variantVan', () => {
  it('geeft hetzelfde adres altijd dezelfde variant', () => {
    expect(api.variantVan('info@klant.nl')).toBe(api.variantVan('info@klant.nl'))
  })

  it('verdeelt een lijst ruwweg over twee helften', () => {
    const adressen = Array.from({ length: 400 }, (_, i) => `klant${i}@voorbeeld.nl`)
    const aantalA = adressen.filter(e => api.variantVan(e) === 'a').length
    expect(aantalA).toBeGreaterThan(120)
    expect(aantalA).toBeLessThan(280)
  })
})

describe('testVolgorde', () => {
  it('is stabiel per adres', () => {
    expect(api.testVolgorde('a@b.nl')).toBe(api.testVolgorde('a@b.nl'))
  })

  it('ligt tussen 0 en 1', () => {
    for (const e of ['a@b.nl', 'zzz@voorbeeld.com', 'x@y.z']) {
      expect(api.testVolgorde(e)).toBeGreaterThanOrEqual(0)
      expect(api.testVolgorde(e)).toBeLessThanOrEqual(1)
    }
  })
})
