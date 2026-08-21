import { describe, it, expect } from 'vitest'
import { parseHandtekening } from '@/components/email/handtekeningParser'

const HTML = `<div dir="ltr"><p>Hoi Antony,</p><p>Kun je een prijs maken voor doosletters op onze gevel?</p>
<p>Met vriendelijke groet,</p>
<p><b>Jan de Vries</b><br>Vestigingsmanager<br>Bakkerij De Korenaar B.V.<br>
Grote Noord 12<br>1621 KD Hoorn<br>T 0229 - 21 22 23<br>M 06 12 34 56 78<br>
<a href="https://www.dekorenaar.nl">www.dekorenaar.nl</a><br>KvK 12345678</p>
<blockquote>Op di 20 aug schreef Antony: oud bericht 06-99999999</blockquote></div>`

describe('parseHandtekening', () => {
  it('haalt functie, bedrijf, adres, telefoons en website uit een handtekening', () => {
    const g = parseHandtekening(HTML, { naam: 'Jan de Vries', email: 'jan@dekorenaar.nl' })
    expect(g.naam).toBe('Jan de Vries')
    expect(g.functie).toBe('Vestigingsmanager')
    expect(g.bedrijfsnaam).toBe('Bakkerij De Korenaar B.V.')
    expect(g.adres).toBe('Grote Noord 12')
    expect(g.postcode).toBe('1621 KD')
    expect(g.stad).toBe('Hoorn')
    expect(g.telefoon).toBe('0229-212223')
    expect(g.mobiel).toBe('06-12345678')
    expect(g.website).toBe('www.dekorenaar.nl')
    expect(g.kvk).toBe('12345678')
  })

  it('valt terug op het maildomein voor de website en negeert geciteerde tekst', () => {
    const g = parseHandtekening('<p>Bedankt!</p><p>Groeten,<br>Piet</p><p>Op ma schreef X: 06-11111111</p>', { naam: 'Piet Jansen', email: 'piet@pietbouw.nl' })
    expect(g.website).toBe('www.pietbouw.nl')
    expect(g.mobiel).toBe('')
  })

  it('geeft geen website bij een gmail-adres', () => {
    const g = parseHandtekening('Groet, Kees', { naam: 'Kees', email: 'kees@gmail.com' })
    expect(g.website).toBe('')
  })
})

describe('parseHandtekening, lange handtekening met en-dash', () => {
  it('leest telefoon met en-dash en het eerste adres', () => {
    const html = `<p>Voor nu 1.</p><p><b>Carolien van der Veek</b></p><p>Team- en managementondersteuning</p><p><i>(afwezig op dinsdag)</i></p>
<p>T – 088 – 2037360</p><p>E – cvanderveek@teamsportservice.nl</p><p>Team Sportservice West-Friesland</p><p>Kerkstraat 58</p><p>1687 AS Wognum</p>
<p>Team Sportservice Zaanstreek-Waterland</p><p>Het Spil 1</p><p>1141 SB Monnickendam</p>`
    const g = parseHandtekening(html, { naam: 'Carolien van der Veek', email: 'cvanderveek@teamsportservice.nl' })
    expect(g.telefoon).toBe('088-2037360')
    expect(g.functie).toBe('Team- en managementondersteuning')
    expect(g.adres).toBe('Kerkstraat 58')
    expect(g.postcode).toBe('1687 AS')
    expect(g.stad).toBe('Wognum')
    expect(g.bedrijfsnaam).toBe('Team Sportservice West-Friesland')
  })
})

describe('parseHandtekening, functioneel postvak', () => {
  it('neemt de naam uit de handtekening als de afzender "Purchase" heet', () => {
    const html = '<p>Alvast bedankt.</p><p><b>Eric Lub</b></p><p><i>Buyer</i></p><p>Purchase</p><p>Seed Processing Holland B.V.</p><p>Zoutketen 12, 1601 EX Enkhuizen</p><p>+31 228 784 120</p>'
    const g = parseHandtekening(html, { naam: 'Purchase', email: 'purchase@seedprocessing.nl' })
    expect(g.naam).toBe('Eric Lub')
    expect(g.functie).toBe('Buyer')
    expect(g.bedrijfsnaam).toBe('Seed Processing Holland B.V.')
    expect(g.telefoon).toBe('0228-784120')
  })
})
