import { describe, it, expect, beforeEach } from 'vitest'
import {
  leesConcept,
  schrijfConcept,
  wisConcept,
  alleConcepten,
  isLeegConcept,
  opschonen,
  conceptSleutel,
  type EmailConcept,
} from '../src/utils/emailConceptDraft'

/** Minimale Storage-implementatie; de module draait in node-tests zonder DOM. */
function nepStore() {
  const data = new Map<string, string>()
  let schrijfAantal = 0
  return {
    get schrijfAantal() { return schrijfAantal },
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { schrijfAantal++; data.set(k, v) },
    removeItem: (k: string) => { data.delete(k) },
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    get length() { return data.size },
  }
}

function concept(over: Partial<EmailConcept> = {}): EmailConcept {
  return {
    versie: 1,
    draftId: 'abc',
    to: '', cc: '', bcc: '',
    showCcBcc: false,
    subject: '',
    html: '',
    wachtOpReactie: false,
    bijlagenNamen: [],
    bijgewerkt: Date.now(),
    ...over,
  }
}

describe('emailConceptDraft', () => {
  let store: ReturnType<typeof nepStore>
  beforeEach(() => { store = nepStore() })

  it('schrijft en leest een concept terug', () => {
    const c = concept({ to: 'jan@klant.nl', subject: 'Offerte', html: '<p>Hoi</p>' })
    expect(schrijfConcept(c, { store })).toBe(true)
    const terug = leesConcept('abc', { store })
    expect(terug?.to).toBe('jan@klant.nl')
    expect(terug?.html).toBe('<p>Hoi</p>')
  })

  it('gebruikt de doen_-sleutelconventie', () => {
    expect(conceptSleutel('xyz')).toBe('doen_email_concept_xyz')
  })

  it('geeft null bij een onbekend of kapot concept', () => {
    expect(leesConcept('bestaat-niet', { store })).toBeNull()
    store.setItem(conceptSleutel('stuk'), '{niet:json')
    expect(leesConcept('stuk', { store })).toBeNull()
  })

  it('negeert een concept met een andere versie', () => {
    store.setItem(conceptSleutel('oud'), JSON.stringify({ versie: 0, draftId: 'oud' }))
    expect(leesConcept('oud', { store })).toBeNull()
  })

  it('schrijft niet opnieuw bij identieke inhoud (StrictMode-dubbelmount)', () => {
    const c = concept({ html: '<p>x</p>' })
    schrijfConcept(c, { store })
    expect(store.schrijfAantal).toBe(1)
    // Alleen bijgewerkt verschilt: mag geen tweede write opleveren.
    schrijfConcept({ ...c, bijgewerkt: c.bijgewerkt + 5000 }, { store })
    expect(store.schrijfAantal).toBe(1)
  })

  it('schrijft wel opnieuw als de inhoud verandert', () => {
    schrijfConcept(concept({ html: '<p>x</p>' }), { store })
    schrijfConcept(concept({ html: '<p>xy</p>' }), { store })
    expect(leesConcept('abc', { store })?.html).toBe('<p>xy</p>')
  })

  it('wist een concept', () => {
    schrijfConcept(concept(), { store })
    wisConcept('abc', { store })
    expect(leesConcept('abc', { store })).toBeNull()
  })

  it('somt concepten op, nieuwste eerst', () => {
    schrijfConcept(concept({ draftId: 'oud', bijgewerkt: 1000 }), { store })
    schrijfConcept(concept({ draftId: 'nieuw', bijgewerkt: 9000 }), { store })
    expect(alleConcepten({ store }).map(c => c.draftId)).toEqual(['nieuw', 'oud'])
  })

  describe('isLeegConcept', () => {
    it('leeg bij een volledig leeg concept', () => {
      expect(isLeegConcept(concept())).toBe(true)
    })

    it('leeg bij alleen een handtekening', () => {
      const handtekening = '<br><p>Groet, Antony</p>'
      expect(isLeegConcept(concept({ html: handtekening }), handtekening)).toBe(true)
    })

    it('leeg bij alleen lege br-tags', () => {
      expect(isLeegConcept(concept({ html: '<br><br>' }))).toBe(true)
    })

    it('niet leeg zodra er één teken bij komt', () => {
      const handtekening = '<p>Groet, Antony</p>'
      expect(isLeegConcept(concept({ html: `<p>a</p>${handtekening}` }), handtekening)).toBe(false)
    })

    it('niet leeg bij alleen een ontvanger', () => {
      expect(isLeegConcept(concept({ to: 'jan@klant.nl' }))).toBe(false)
    })

    it('niet leeg bij alleen een onderwerp', () => {
      expect(isLeegConcept(concept({ subject: 'Offerte' }))).toBe(false)
    })

    it('niet leeg bij een body met alleen een afbeelding', () => {
      // Geplakte schermafdruk: alle tags worden gestript, dus zonder
      // beeld-check werd dit concept actief verwijderd.
      expect(isLeegConcept(concept({ html: '<img src="data:image/png;base64,AAAA">' }))).toBe(false)
    })

    it('niet leeg bij een body met alleen een tabel', () => {
      expect(isLeegConcept(concept({ html: '<table><tr><td></td></tr></table>' }))).toBe(false)
    })

    it('leeg bij handtekening plus enkel nbsp', () => {
      const handtekening = '<p>Groet, Antony</p>'
      expect(isLeegConcept(concept({ html: `&nbsp;${handtekening}` }), handtekening)).toBe(true)
    })

    it('niet leeg bij alleen een bijlage', () => {
      expect(isLeegConcept(concept({ bijlagenNamen: [{ naam: 'a.pdf', grootte: 10 }] }))).toBe(false)
    })
  })

  it('opschonen verwijdert alleen verlopen concepten', () => {
    const oud = Date.now() - 40 * 24 * 60 * 60 * 1000
    schrijfConcept(concept({ draftId: 'oud', bijgewerkt: oud }), { store })
    schrijfConcept(concept({ draftId: 'vers', bijgewerkt: Date.now() }), { store })
    expect(opschonen(30, { store })).toBe(1)
    expect(leesConcept('oud', { store })).toBeNull()
    expect(leesConcept('vers', { store })).not.toBeNull()
  })
})
