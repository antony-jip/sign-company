import { describe, it, expect } from 'vitest'
import { veiligeTerugUrl, klantSpecs, bijlageSoort, voornaam } from '@/utils/offerteKlantpagina'

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
