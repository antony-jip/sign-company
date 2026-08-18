import { describe, it, expect } from 'vitest'
import { haalHandtekeningUitBody, bodyAlsTekst } from '../../src/components/email/emailHelpers'

const MAIL = `Hallo Antony,

Kun je een prijs geven voor een lichtbakdoek van 130 x 275 cm (netto)?
Het ontwerp zit in de bijlage.

Met vriendelijke groet,

Iselle Bastiaanssen
Iselle Design
Westermeerweg 21
8311 PE Espel

06-13735510
info@iselledesign.nl`

describe('haalHandtekeningUitBody', () => {
  it('leest telefoon en adres uit de handtekening', () => {
    expect(haalHandtekeningUitBody(MAIL)).toEqual({
      telefoon: '06-13735510',
      adres: 'Westermeerweg 21',
      postcode: '8311 PE',
      stad: 'Espel',
    })
  })

  it('leest een adres dat op één regel staat', () => {
    const body = `Groet,\n\nJan\nHoofdstraat 12a, 1621 AB Hoorn\nT: 0229 123456`
    expect(haalHandtekeningUitBody(body)).toMatchObject({
      adres: 'Hoofdstraat 12a',
      postcode: '1621 AB',
      stad: 'Hoorn',
      telefoon: '0229 123456',
    })
  })

  it('leest een handtekening na de --scheiding', () => {
    const body = `Even kort: we hebben het pand op Kanaalweg 100 in 1234 AB Zaandam bekeken.\n\n--\nPiet de Vries\nBergweg 4\n1811 KL Alkmaar\n+31 6 12345678`
    expect(haalHandtekeningUitBody(body)).toMatchObject({
      adres: 'Bergweg 4',
      postcode: '1811 KL',
      stad: 'Alkmaar',
      telefoon: '+31 6 12345678',
    })
  })

  it('negeert adressen en nummers uit de lopende tekst', () => {
    const body = `Hoi,\n\nDe montage is op Kanaalweg 100, 1013 AN Amsterdam. Bel de uitvoerder op 06-11111111 als je er bent.\n\nDit is verder een langere alinea met uitleg over de klus, de planning en de levertijd van de doeken zodat er echt proza onder staat.\n\nGroet, Kees`
    expect(haalHandtekeningUitBody(body)).toEqual({
      telefoon: '', adres: '', postcode: '', stad: '',
    })
  })

  it('kijkt niet in het citaat van een oudere mail', () => {
    const body = `Ja prima, doen we.\n\nGroet, Anna\n\nOp 3 juli 2026 om 09:12 schreef Iselle <info@iselledesign.nl>:\n> Iselle Design\n> Westermeerweg 21\n> 8311 PE Espel\n> 06-13735510`
    expect(haalHandtekeningUitBody(body)).toEqual({
      telefoon: '', adres: '', postcode: '', stad: '',
    })
  })

  it('houdt kvk- en btw-nummers uit het telefoonveld', () => {
    const body = `Groet,\n\nBureau Zicht\nKvK 01234567\nBTW NL001234567B01\nMerelstraat 8\n1782 GH Den Helder`
    const uit = haalHandtekeningUitBody(body)
    expect(uit.telefoon).toBe('')
    expect(uit.adres).toBe('Merelstraat 8')
  })

  it('werkt op een html-mail via bodyAlsTekst', () => {
    const html = `<p>Hoi Antony,</p><p>Graag een offerte.</p><p>Iselle Design<br>Westermeerweg 21<br>8311 PE Espel</p><p>06-13735510<br>info@iselledesign.nl</p>`
    expect(haalHandtekeningUitBody(bodyAlsTekst(html))).toMatchObject({
      telefoon: '06-13735510',
      adres: 'Westermeerweg 21',
      postcode: '8311 PE',
      stad: 'Espel',
    })
  })
})
