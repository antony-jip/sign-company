import { describe, expect, it } from 'vitest'
import {
  documentVoorAntwoord,
  documentVoorDoorsturen,
  documentVoorNieuw,
  documentUitConcept,
  isLeegDocument,
  metCitaat,
  ontvangersNaarString,
  parseOntvangers,
  splitsCitaat,
  vulVelden,
} from '@/components/email/composer/document'
import type { EmailLijstItem } from '@/lib/mail/types'

function bron(over: Partial<EmailLijstItem> = {}): EmailLijstItem {
  return {
    id: 'mail-1',
    gmail_id: '4711',
    message_id: '<abc@voorbeeld.nl>',
    van: 'Jan Jansen <jan@klant.nl>',
    aan: 'antony@signcompany.nl',
    to_addresses: [{ email: 'antony@signcompany.nl', name: 'Antony' }],
    cc_addresses: [{ email: 'piet@klant.nl', name: 'Piet' }, { email: 'jan@klant.nl' }],
    onderwerp: 'Offerte gevelreclame',
    datum: '2026-09-01T10:00:00.000Z',
    gelezen: true,
    labels: [],
    bijlagen: 0,
    map: 'inbox',
    thread_id: 'thread-9',
    created_at: '2026-09-01T10:00:00.000Z',
    ...over,
  }
}

describe('parseOntvangers', () => {
  it('splitst namen met adres en losse adressen', () => {
    const uit = parseOntvangers('Naam <a@b.nl>, c@d.nl')
    expect(uit).toEqual([
      { email: 'a@b.nl', naam: 'Naam', bron: 'vrij' },
      { email: 'c@d.nl', naam: undefined, bron: 'vrij' },
    ])
  })

  it('laat een komma binnen aanhalingstekens staan', () => {
    const uit = parseOntvangers('"Jansen, Jan" <jan@klant.nl>; piet@klant.nl')
    expect(uit.map((o) => o.email)).toEqual(['jan@klant.nl', 'piet@klant.nl'])
    expect(uit[0].naam).toBe('Jansen, Jan')
  })

  it('maakt van de adresregel weer dezelfde string', () => {
    expect(ontvangersNaarString(parseOntvangers('Naam <a@b.nl>, c@d.nl'))).toBe('Naam <a@b.nl>, c@d.nl')
  })
})

describe('documentVoorAntwoord', () => {
  it('vult Re:, inReplyTo, references en threadId', () => {
    const doc = documentVoorAntwoord(bron(), false, null)
    expect(doc.modus).toBe('antwoord')
    expect(doc.onderwerp).toBe('Re: Offerte gevelreclame')
    expect(doc.aan).toEqual([{ email: 'jan@klant.nl', naam: 'Jan Jansen', bron: 'vrij' }])
    expect(doc.cc).toEqual([])
    expect(doc.inReplyTo).toBe('<abc@voorbeeld.nl>')
    expect(doc.references).toEqual(['<abc@voorbeeld.nl>'])
    expect(doc.threadId).toBe('thread-9')
    expect(doc.bronEmailId).toBe('mail-1')
  })

  it('stapelt geen tweede Re: op een bestaande', () => {
    const doc = documentVoorAntwoord(bron({ onderwerp: 'RE: al beantwoord' }), false, null)
    expect(doc.onderwerp).toBe('RE: al beantwoord')
  })

  it('haalt bij allen het eigen adres en de afzender uit de cc', () => {
    const doc = documentVoorAntwoord(bron(), true, null, 'antony@signcompany.nl')
    expect(doc.modus).toBe('allen')
    expect(doc.cc.map((o) => o.email)).toEqual(['piet@klant.nl'])
  })

  it('zet het citaat uit de body achter een wrapper in html', () => {
    const doc = documentVoorAntwoord(bron(), false, { emailId: 'mail-1', html: '<p>Hoi</p>', tekst: 'Hoi', quotedHtml: null })
    const { eigen, citaat } = splitsCitaat(doc.html)
    expect(eigen).toBe('')
    expect(citaat).toContain('schreef Jan Jansen')
    expect(citaat).toContain('<p>Hoi</p>')
  })
})

describe('documentVoorDoorsturen', () => {
  it('vult Fwd:, neemt originele bijlagen mee en houdt de thread', () => {
    const doc = documentVoorDoorsturen(bron({
      attachment_meta: [
        { filename: 'tekening.pdf', contentType: 'application/pdf', size: 1200 },
        { filename: 'logo.png', contentType: 'image/png', size: 300, isInlineCid: true },
      ],
    }), null)
    expect(doc.modus).toBe('doorsturen')
    expect(doc.onderwerp).toBe('Fwd: Offerte gevelreclame')
    expect(doc.aan).toEqual([])
    expect(doc.bijlagen).toEqual([{ naam: 'tekening.pdf', grootte: 1200, type: 'application/pdf', bron: 'origineel', emailId: 'mail-1' }])
    expect(doc.inReplyTo).toBeUndefined()
    expect(doc.threadId).toBe('thread-9')
    expect(splitsCitaat(doc.html).citaat).toContain('Doorgestuurd bericht')
  })
})

describe('vulVelden', () => {
  it('vervangt bekende velden en laat onbekende leeg', () => {
    const uit = vulVelden('Hoi {{contactpersoon}} van {{ bedrijfsnaam }}, zie {{offerte_nummer}} en {{portaal_url}}.', {
      contactpersoon: 'Jan',
      bedrijfsnaam: 'Klant BV',
    })
    expect(uit).toBe('Hoi Jan van Klant BV, zie  en .')
    expect(uit).not.toContain('{{')
  })
})

describe('citaat en leegte', () => {
  it('splitst eigen tekst en citaat weer uit elkaar', () => {
    const html = metCitaat('<div>Dag</div>', '<div>oud</div>')
    expect(splitsCitaat(html)).toEqual({ eigen: '<div>Dag</div>', citaat: '<div>oud</div>' })
    expect(splitsCitaat('<div>alleen</div>')).toEqual({ eigen: '<div>alleen</div>', citaat: '' })
  })

  it('telt een antwoord zonder getypte tekst als leeg, met tekst niet', () => {
    const leeg = documentVoorNieuw({ html: metCitaat('<br>', '<p>citaat</p>') })
    expect(isLeegDocument(leeg)).toBe(true)
    expect(isLeegDocument({ ...leeg, html: metCitaat('<div>Hoi</div>', '<p>citaat</p>') })).toBe(false)
    expect(isLeegDocument({ ...leeg, aan: [{ email: 'a@b.nl' }] })).toBe(false)
  })

  it('leest een concept-rij terug met het id van de rij', () => {
    const doc = documentUitConcept({ id: 'rij-1', concept: documentVoorNieuw({ onderwerp: 'Test' }) })
    expect(doc.id).toBe('rij-1')
    expect(doc.onderwerp).toBe('Test')
    expect(documentUitConcept(documentVoorNieuw({ id: 'rij-2' })).id).toBe('rij-2')
  })
})
