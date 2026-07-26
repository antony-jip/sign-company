import { describe, it, expect } from 'vitest'
import { splitAfzenderNaam } from '../../src/components/email/emailHelpers'

describe('splitAfzenderNaam', () => {
  it('splitst een gewone voor- en achternaam', () => {
    expect(splitAfzenderNaam('Jan Jansen')).toEqual({ voornaam: 'Jan', achternaam: 'Jansen' })
  })

  it('houdt tussenvoegsels bij de achternaam', () => {
    expect(splitAfzenderNaam('Piet van der Berg')).toEqual({ voornaam: 'Piet', achternaam: 'van der Berg' })
  })

  it('draait de "Achternaam, Voornaam" notatie om', () => {
    expect(splitAfzenderNaam('Bakker, Marieke')).toEqual({ voornaam: 'Marieke', achternaam: 'Bakker' })
  })

  it('laat een enkel woord ongesplitst', () => {
    expect(splitAfzenderNaam('Info')).toEqual({ voornaam: '', achternaam: 'Info' })
  })

  it('splitst een bedrijfsnaam niet', () => {
    expect(splitAfzenderNaam('Jansen Bouw BV')).toEqual({ voornaam: '', achternaam: 'Jansen Bouw BV' })
  })

  it('laat een e-mailadres als naam ongesplitst', () => {
    expect(splitAfzenderNaam('info@bedrijf.nl')).toEqual({ voornaam: '', achternaam: 'info@bedrijf.nl' })
  })

  it('ruimt aanhalingstekens en dubbele spaties op', () => {
    expect(splitAfzenderNaam('"Kees   de Vries"')).toEqual({ voornaam: 'Kees', achternaam: 'de Vries' })
  })

  it('geeft lege velden bij een lege naam', () => {
    expect(splitAfzenderNaam('   ')).toEqual({ voornaam: '', achternaam: '' })
  })
})
