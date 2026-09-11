import { describe, it, expect } from 'vitest'
import {
  veiligeTerugUrl,
  klantSpecs,
  bijlageSoort,
  voornaam,
  kopKleur,
  isLichteKleur,
  offertePaginaUrl,
  publiekTokenBruikbaar,
} from '@/utils/offerteKlantpagina'

describe('publiekTokenBruikbaar · geen dode link in de mail', () => {
  const nu = new Date('2026-09-11T12:00:00Z')

  it('keurt een ontbrekend of verlopen token af', () => {
    expect(publiekTokenBruikbaar(null, null, nu)).toBe(false)
    expect(publiekTokenBruikbaar('tok', '2026-09-10T12:00:00Z', nu)).toBe(false)
  })

  it('accepteert een geldig token, ook zonder vervaldatum', () => {
    expect(publiekTokenBruikbaar('tok', '2027-03-01T00:00:00Z', nu)).toBe(true)
    expect(publiekTokenBruikbaar('tok', null, nu)).toBe(true)
  })
})

describe('offertePaginaUrl · de link in de offertemail', () => {
  it('linkt direct naar de offerte', () => {
    expect(offertePaginaUrl('https://app.doen.team', 'tok-1')).toBe('https://app.doen.team/offerte-bekijken/tok-1')
  })

  it('geeft met een portaal de terugweg mee die de offertepagina accepteert', () => {
    const url = offertePaginaUrl('https://app.doen.team', 'tok-1', 'abcdef0123456789')
    expect(url).toBe('https://app.doen.team/offerte-bekijken/tok-1?terug=%2Fportaal%2Fabcdef0123456789')
    expect(veiligeTerugUrl(new URL(url).searchParams.get('terug'))).toBe('/portaal/abcdef0123456789')
  })
})

describe('kopKleur en isLichteKleur · de kop van de klantpagina', () => {
  it('neemt een geldige kleur over en valt anders terug op petrol', () => {
    expect(kopKleur('#F15025')).toBe('#F15025')
    expect(kopKleur(' #ffffff ')).toBe('#ffffff')
    expect(kopKleur('red')).toBe('#1A535C')
    expect(kopKleur('#fff')).toBe('#1A535C')
    expect(kopKleur(undefined)).toBe('#1A535C')
  })

  it('herkent lichte koppen, zodat de tekst donker wordt', () => {
    expect(isLichteKleur('#FFFFFF')).toBe(true)
    expect(isLichteKleur('#F4D35E')).toBe(true)
    expect(isLichteKleur('#1A535C')).toBe(false)
    expect(isLichteKleur('#D24620')).toBe(false)
  })
})

describe('veiligeTerugUrl · alleen een portaalpad als terugweg', () => {
  it('laat een portaalpad door', () => {
    expect(veiligeTerugUrl('/portaal/3f2a9c1e-77b0-4c1d-9a2e-5d6f7a8b9c0d')).toBe(
      '/portaal/3f2a9c1e-77b0-4c1d-9a2e-5d6f7a8b9c0d',
    )
  })

  it('weigert javascript:, externe en protocol-relatieve links', () => {
    expect(veiligeTerugUrl('javascript:alert(1)')).toBeNull()
    expect(veiligeTerugUrl('https://evil.example/portaal/abcdefgh')).toBeNull()
    expect(veiligeTerugUrl('//evil.example/portaal/abcdefgh')).toBeNull()
  })

  it('weigert paden die uit het portaal weglopen', () => {
    expect(veiligeTerugUrl('/portaal/../instellingen')).toBeNull()
    expect(veiligeTerugUrl('/portaal/abcdefgh/extra')).toBeNull()
    expect(veiligeTerugUrl('')).toBeNull()
    expect(veiligeTerugUrl(null)).toBeNull()
  })
})

describe('klantSpecs · dezelfde specs als de PDF', () => {
  it('toont de afmeting uit de calculatie als er geen eigen formaat staat', () => {
    expect(klantSpecs({ breedte_mm: 2000, hoogte_mm: 500 })).toEqual([
      { label: 'Afmeting', waarde: '2000 × 500 mm (1,00 m²)' },
    ])
  })

  it('laat de calculatiemaat weg als de offerte zelf een formaat noemt', () => {
    const specs = klantSpecs({
      breedte_mm: 2000,
      hoogte_mm: 500,
      detail_regels: [{ label: 'Formaat', waarde: '200 x 50 cm' }],
    })
    expect(specs).toEqual([{ label: 'Formaat', waarde: '200 x 50 cm' }])
  })

  it('slaat lege regels over en maakt labels netjes', () => {
    const specs = klantSpecs({
      detail_regels: [
        { label: 'MATERIAAL', waarde: 'Dibond 3 mm' },
        { label: 'opmerking:', waarde: 'Inclusief montage' },
        { label: 'Lay-out', waarde: '' },
        { label: '', waarde: 'zwevend' },
      ],
    })
    expect(specs).toEqual([
      { label: 'MATERIAAL', waarde: 'Dibond 3 mm' },
      { label: 'Opmerking', waarde: 'Inclusief montage' },
    ])
  })
})

describe('bijlageSoort', () => {
  it('volgt het mime-type als dat er is', () => {
    expect(bijlageSoort('pad/zonder-extensie', 'image/png')).toBe('afbeelding')
    expect(bijlageSoort('pad/zonder-extensie', 'application/pdf')).toBe('pdf')
  })

  it('valt terug op de extensie, ook achter een ondertekende querystring', () => {
    expect(bijlageSoort('https://x.supabase.co/sign/tekening.JPG?token=abc')).toBe('afbeelding')
    expect(bijlageSoort('user/offerte/tekening.pdf')).toBe('pdf')
    expect(bijlageSoort('user/offerte/bestand.dwg')).toBeNull()
    expect(bijlageSoort(undefined)).toBeNull()
  })
})

describe('voornaam', () => {
  it('pakt het eerste woord', () => {
    expect(voornaam('  Mark de Vries ')).toBe('Mark')
    expect(voornaam(undefined)).toBe('')
  })
})
