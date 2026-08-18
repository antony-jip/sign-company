import { describe, it, expect } from 'vitest'
import {
  bepaalAanvraagContact,
  haalContactUitBody,
  isDoorgeefluikAfzender,
  bodyAlsTekst,
  platteTekstNaarHtml,
  lijktOpHtml,
} from '../../src/components/email/emailHelpers'

const EIGEN = 'antony@signcompany.nl'

const FORMULIERMAIL = `Nieuwe aanvraag via signcompany.nl

Naam:      Joep Heilig
Telefoon:  0651453136
E-mail:    info@heiligbv.nl
Dienst:    Gevelreclame
Pagina:    /lichtreclame/hoorn/

Bericht:
Wij zijn voor ons nieuwe pand op zoek naar 2x doos reclame borden met verlichting. Groote ongeveer 1 x 5m`

describe('isDoorgeefluikAfzender', () => {
  it('herkent een adres op het eigen domein', () => {
    expect(isDoorgeefluikAfzender('aanvraag@signcompany.nl', EIGEN)).toBe(true)
  })

  it('herkent no-reply-notifiers van buiten', () => {
    expect(isDoorgeefluikAfzender('no-reply@wordpress.com', EIGEN)).toBe(true)
    expect(isDoorgeefluikAfzender('noreply.forms@typeform.com', EIGEN)).toBe(true)
  })

  it('laat een gewone klant met rust', () => {
    expect(isDoorgeefluikAfzender('info@heiligbv.nl', EIGEN)).toBe(false)
    expect(isDoorgeefluikAfzender('j.heilig@gmail.com', EIGEN)).toBe(false)
  })
})

describe('haalContactUitBody', () => {
  it('leest de velden van het eigen formulier', () => {
    expect(haalContactUitBody(FORMULIERMAIL)).toEqual({
      naam: 'Joep Heilig',
      email: 'info@heiligbv.nl',
      telefoon: '0651453136',
      bedrijf: '',
    })
  })

  it('leest ook Engelse labels en een bedrijfsveld', () => {
    const contact = haalContactUitBody('Name: Ann Bakker\nCompany: Bakker Retail\nEmail: ann@bakkerretail.nl\nPhone: 0201234567')
    expect(contact.naam).toBe('Ann Bakker')
    expect(contact.bedrijf).toBe('Bakker Retail')
    expect(contact.email).toBe('ann@bakkerretail.nl')
    expect(contact.telefoon).toBe('0201234567')
  })

  it('valt terug op het eerste losse adres in de tekst', () => {
    expect(haalContactUitBody('Graag contact over een lichtbak, mail naar piet@pietsbv.nl').email)
      .toBe('piet@pietsbv.nl')
  })
})

describe('bepaalAanvraagContact', () => {
  it('houdt de afzender aan als die zelf de klant is', () => {
    const contact = bepaalAanvraagContact(
      'joep@heiligbv.nl',
      'Joep Heilig',
      'Wij zoeken 2x lichtbak. Mijn collega is bereikbaar op piet@anderbedrijf.nl',
      EIGEN
    )
    expect(contact.email).toBe('joep@heiligbv.nl')
    expect(contact.uitBody).toBe(false)
  })

  it('pakt de aanvrager uit de body bij een formuliermail', () => {
    const contact = bepaalAanvraagContact('aanvraag@signcompany.nl', 'Sign Company', FORMULIERMAIL, EIGEN)
    expect(contact).toEqual({
      email: 'info@heiligbv.nl',
      naam: 'Joep Heilig',
      telefoon: '0651453136',
      bedrijf: '',
      uitBody: true,
    })
  })

  it('valt terug op de afzender als de body geen adres bevat', () => {
    const contact = bepaalAanvraagContact('aanvraag@signcompany.nl', 'Sign Company', 'Storingsmelding, geen gegevens', EIGEN)
    expect(contact.email).toBe('aanvraag@signcompany.nl')
    expect(contact.uitBody).toBe(false)
  })
})

describe('platte tekst weergeven', () => {
  it('ziet een tekstmail niet aan voor HTML', () => {
    expect(lijktOpHtml(FORMULIERMAIL)).toBe(false)
    expect(lijktOpHtml('<div>hallo</div>')).toBe(true)
  })

  it('behoudt de regelindeling en maakt links klikbaar', () => {
    const html = platteTekstNaarHtml('Regel 1\nRegel 2\nZie https://signcompany.nl/offerte')
    expect(html).toContain('white-space:pre-wrap')
    expect(html).toContain('Regel 1\nRegel 2')
    expect(html).toContain('<a href="https://signcompany.nl/offerte"')
  })

  it('ontsnapt tags uit de tekst zelf', () => {
    expect(platteTekstNaarHtml('<script>alert(1)</script>')).not.toContain('<script>')
  })

  it('houdt regels heel bij een HTML-body', () => {
    expect(bodyAlsTekst('<p>Naam: Joep</p><p>E-mail: info@heiligbv.nl</p>'))
      .toBe('Naam: Joep\nE-mail: info@heiligbv.nl')
  })
})
