import { describe, it, expect } from 'vitest'
import { bouwHandtekeningHtml } from '@/utils/handtekening'

// Deze test legt vast wat de drie mailsoorten vóór deze ronde elk anders deden:
// de tekst mág opmaak houden, de banner hoort er altijd bij te kunnen staan, en
// tekst plus banner sluiten elkaar niet uit.

const BANNER = 'https://voorbeeld.nl/banner.png'

describe('bouwHandtekeningHtml', () => {
  it('laat zonder DOM geen rauwe HTML door', () => {
    // schoonHandtekeningHtml heeft DOMParser nodig om te kunnen schonen. In de
    // browser blijft de opmaak dus staan; draait dit ergens zonder DOM (server,
    // test), dan wordt de handtekening als tekst getoond in plaats van
    // ongecontroleerd doorgelaten. Die keuze hoort vastgelegd te staan.
    const uit = bouwHandtekeningHtml({ tekst: '<b>Antony</b>' })
    expect(uit).not.toContain('<b>')
    expect(uit).toContain('&lt;b&gt;')
  })

  it('zet oude platte tekst om met regeleinden', () => {
    const uit = bouwHandtekeningHtml({ tekst: 'Met vriendelijke groet,\nAntony' })
    expect(uit).toBe('Met vriendelijke groet,<br />Antony')
  })

  it('zet tekst en banner onder elkaar in plaats van of-of', () => {
    // Dit was de projectmail-bug: met een banner verdween de tekst.
    const uit = bouwHandtekeningHtml({ tekst: 'Antony', afbeeldingUrl: BANNER })
    expect(uit).toContain('Antony')
    expect(uit).toContain(BANNER)
    expect(uit.indexOf('Antony')).toBeLessThan(uit.indexOf(BANNER))
  })

  it('geeft de banner ook zonder tekst', () => {
    const uit = bouwHandtekeningHtml({ afbeeldingUrl: BANNER })
    expect(uit).toContain(BANNER)
    expect(uit.startsWith('<img')).toBe(true)
  })

  it('valt terug op de bedrijfsnaam als er niets is ingesteld', () => {
    expect(bouwHandtekeningHtml({ terugval: 'Sign Company' })).toBe('Sign Company')
    expect(bouwHandtekeningHtml({})).toBe('')
  })

  it('gebruikt de terugval niet zodra er een banner is', () => {
    const uit = bouwHandtekeningHtml({ afbeeldingUrl: BANNER, terugval: 'Sign Company' })
    expect(uit).not.toContain('Sign Company')
  })

  it('laat een javascript-link in de banner niet door', () => {
    const uit = bouwHandtekeningHtml({ afbeeldingUrl: BANNER, afbeeldingLink: 'javascript:alert(1)' })
    expect(uit).not.toContain('javascript:')
    expect(uit).toContain('<img')
  })
})
