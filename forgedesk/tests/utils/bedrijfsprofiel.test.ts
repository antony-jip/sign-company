import { describe, it, expect } from 'vitest'
import { pasIdentiteitToe, pasPapierToe } from '@/utils/bedrijfsprofiel'
import { getDefaultDocumentStyle } from '@/lib/documentTemplates'
import type { Bedrijfsprofiel, Profile } from '@/types'

const eigenBedrijf = {
  id: 'gebruiker-1',
  bedrijfsnaam: 'Sign Company',
  bedrijfs_adres: 'De Drie Kronen 115, 1601 MT Enkhuizen',
  bedrijfs_telefoon: '0228 35 19 60',
  bedrijfs_email: 'info@signcompany.nl',
  kvk_nummer: '36011150',
  btw_nummer: 'NL001',
  iban: 'NL00 BANK 0000 0000 00',
  logo_url: 'data:image/png;base64,sign',
  telefoon: '0612345678',
  email: 'antony@signcompany.nl',
} as Partial<Profile>

function tweedeBedrijf(overrides: Partial<Bedrijfsprofiel> = {}): Bedrijfsprofiel {
  return {
    id: 'bp-1',
    label: 'Duurzame Vlaggen',
    bedrijfsnaam: 'Duurzame Vlaggen',
    bedrijfs_adres: 'Postbus 1, 1601 AA Enkhuizen',
    bedrijfs_telefoon: '',
    bedrijfs_email: 'info@duurzamevlaggen.nl',
    bedrijfs_website: 'duurzamevlaggen.nl',
    kvk_nummer: '99999999',
    btw_nummer: 'NL002',
    iban: '',
    logo_url: '',
    briefpapier_url: 'https://opslag/dv-briefpapier.jpg',
    vervolgpapier_url: '',
    briefpapier_modus: 'alleen_eerste_pagina',
    briefpapier_toon_branding: false,
    briefpapier_safe_zone_boven: 38,
    briefpapier_safe_zone_onder: 24,
    briefpapier_safe_zone_links: null,
    briefpapier_safe_zone_rechts: null,
    actief: true,
    volgorde: 0,
    created_at: '2026-08-31T00:00:00Z',
    updated_at: '2026-08-31T00:00:00Z',
    ...overrides,
  }
}

describe('pasIdentiteitToe', () => {
  it('laat het eigen bedrijf staan zonder gekozen profiel', () => {
    expect(pasIdentiteitToe(eigenBedrijf, null)).toBe(eigenBedrijf)
  })

  it('zet de gegevens van het tweede bedrijf op de PDF', () => {
    const resultaat = pasIdentiteitToe(eigenBedrijf, tweedeBedrijf())
    expect(resultaat.bedrijfsnaam).toBe('Duurzame Vlaggen')
    expect(resultaat.kvk_nummer).toBe('99999999')
    expect(resultaat.bedrijfs_website).toBe('duurzamevlaggen.nl')
  })

  it('laat een leeg veld leeg in plaats van terug te vallen op het eerste bedrijf', () => {
    const resultaat = pasIdentiteitToe(eigenBedrijf, tweedeBedrijf())
    expect(resultaat.iban).toBe('')
    expect(resultaat.logo_url).toBe('')
    // bedrijfs_telefoon is leeg, dus de PDF mag ook niet terugvallen op het
    // persoonlijke nummer van de gebruiker.
    expect(resultaat.bedrijfs_telefoon).toBe('')
    expect(resultaat.telefoon).toBe('')
    expect(resultaat.email).toBe('')
  })
})

describe('pasPapierToe', () => {
  const stijl = {
    ...getDefaultDocumentStyle('gebruiker-1'),
    briefpapier_url: 'https://opslag/sign-briefpapier.jpg',
    vervolgpapier_url: 'https://opslag/sign-vervolg.jpg',
    briefpapier_modus: 'eerste_en_vervolg' as const,
    briefpapier_safe_zone_boven: 60,
    briefpapier_safe_zone_links: 5,
  }

  it('vervangt het papier door dat van het tweede bedrijf', () => {
    const resultaat = pasPapierToe(stijl, tweedeBedrijf())
    expect(resultaat.briefpapier_url).toBe('https://opslag/dv-briefpapier.jpg')
    expect(resultaat.briefpapier_modus).toBe('alleen_eerste_pagina')
    expect(resultaat.vervolgpapier_url).toBe('')
    expect(resultaat.briefpapier_safe_zone_boven).toBe(38)
    expect(resultaat.briefpapier_safe_zone_links).toBeUndefined()
  })

  it('laat een tweede bedrijf zonder papier niet op het eerste briefpapier landen', () => {
    const resultaat = pasPapierToe(stijl, tweedeBedrijf({
      briefpapier_url: '',
      vervolgpapier_url: '',
      briefpapier_modus: 'geen',
    }))
    expect(resultaat.briefpapier_url).toBe('')
    expect(resultaat.briefpapier_modus).toBe('geen')
  })

  it('houdt lettertypen, kleuren en marges van de organisatie aan', () => {
    const resultaat = pasPapierToe(stijl, tweedeBedrijf())
    expect(resultaat.heading_font).toBe(stijl.heading_font)
    expect(resultaat.primaire_kleur).toBe(stijl.primaire_kleur)
    expect(resultaat.marge_links).toBe(stijl.marge_links)
    expect(resultaat.tabel_stijl).toBe(stijl.tabel_stijl)
  })
})
