import { describe, it, expect } from 'vitest'
import {
  handtekeningAfbeeldingHtml,
  handtekeningBreedte,
  veiligeAfbeeldingLink,
  HANDTEKENING_BREEDTE_STANDAARD,
  HANDTEKENING_BREEDTE_MIN,
  HANDTEKENING_BREEDTE_MAX,
} from '../../src/utils/handtekening'

const BANNER = 'https://cdn.example.com/handtekening.jpg'

describe('handtekeningAfbeeldingHtml', () => {
  it('laat de afbeelding kaal als er geen link is ingesteld', () => {
    const html = handtekeningAfbeeldingHtml({ url: BANNER, breedte: 400 })
    expect(html).toContain(`src="${BANNER}"`)
    expect(html).not.toContain('<a ')
  })

  it('hangt een link om de afbeelding zodra die is ingevuld', () => {
    const html = handtekeningAfbeeldingHtml({
      url: BANNER,
      link: 'https://signcompany.nl/onze-merken/',
      breedte: 400,
    })
    expect(html).toContain('<a href="https://signcompany.nl/onze-merken/"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html.indexOf('<a ')).toBeLessThan(html.indexOf('<img '))
    expect(html.trimEnd().endsWith('</a>')).toBe(true)
  })

  it('weigert een javascript:-URL, de afbeelding blijft gewoon staan', () => {
    const html = handtekeningAfbeeldingHtml({
      url: BANNER,
      // eslint-disable-next-line no-script-url
      link: 'javascript:alert(1)',
    })
    expect(html).toContain('<img ')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('javascript:')
  })

  it('geeft niets terug zonder afbeelding, ook niet met een link', () => {
    expect(handtekeningAfbeeldingHtml({ url: '', link: 'https://doen.team' })).toBe('')
  })

  it('zet de ingestelde breedte als max-width', () => {
    const html = handtekeningAfbeeldingHtml({ url: BANNER, breedte: 500 })
    expect(html).toContain('max-width:500px')
    expect(html).toContain('max-height:500px')
  })

  it('valt terug op de standaardbreedte zonder instelling', () => {
    const html = handtekeningAfbeeldingHtml({ url: BANNER })
    expect(html).toContain(`max-width:${HANDTEKENING_BREEDTE_STANDAARD}px`)
  })

  it('klemt een oude hoogte-waarde binnen het toegestane bereik', () => {
    const html = handtekeningAfbeeldingHtml({ url: BANNER, breedte: 64 })
    expect(html).toContain(`max-width:${HANDTEKENING_BREEDTE_MIN}px`)
    expect(handtekeningAfbeeldingHtml({ url: BANNER, breedte: 2000 })).toContain(
      `max-width:${HANDTEKENING_BREEDTE_MAX}px`,
    )
  })

  it('escapet aanhalingstekens in de link zodat het attribuut heel blijft', () => {
    const html = handtekeningAfbeeldingHtml({
      url: BANNER,
      link: 'https://example.com/a"onmouseover="alert(1)',
    })
    expect(html).not.toContain('onmouseover="alert(1)"')
  })
})

describe('handtekeningBreedte', () => {
  it('klemt binnen min en max en valt terug op de standaard', () => {
    expect(handtekeningBreedte(500)).toBe(500)
    expect(handtekeningBreedte(64)).toBe(HANDTEKENING_BREEDTE_MIN)
    expect(handtekeningBreedte(9999)).toBe(HANDTEKENING_BREEDTE_MAX)
    expect(handtekeningBreedte(0)).toBe(HANDTEKENING_BREEDTE_STANDAARD)
    expect(handtekeningBreedte(null)).toBe(HANDTEKENING_BREEDTE_STANDAARD)
    expect(handtekeningBreedte(undefined)).toBe(HANDTEKENING_BREEDTE_STANDAARD)
  })
})

describe('veiligeAfbeeldingLink', () => {
  it('laat http en https door', () => {
    expect(veiligeAfbeeldingLink('https://signcompany.nl/onze-merken/')).toBe('https://signcompany.nl/onze-merken/')
    expect(veiligeAfbeeldingLink('http://voorbeeld.nl/')).toBe('http://voorbeeld.nl/')
  })

  it('weigert alles wat geen webadres is', () => {
    expect(veiligeAfbeeldingLink('mailto:info@signcompany.nl')).toBe('')
    expect(veiligeAfbeeldingLink('signcompany.nl')).toBe('')
    expect(veiligeAfbeeldingLink('')).toBe('')
    expect(veiligeAfbeeldingLink(undefined)).toBe('')
  })
})
