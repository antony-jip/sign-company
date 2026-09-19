import { describe, it, expect } from 'vitest'
import { klantTaal, portaalTeksten } from '@/lib/portaalTaal'
import { klantpaginaTeksten } from '@/lib/klantpaginaTeksten'

describe('portaalTaal · de klantpagina in de taal van de klant', () => {
  it('valt op Nederlands terug bij alles wat geen fr is', () => {
    expect(klantTaal('fr')).toBe('fr')
    expect(klantTaal('nl')).toBe('nl')
    expect(klantTaal(undefined)).toBe('nl')
    expect(klantTaal('en')).toBe('nl')
  })

  it('heeft voor elke sleutel een echt vertaalde Franse tekst', () => {
    const nl = portaalTeksten('nl') as unknown as Record<string, unknown>
    const fr = portaalTeksten('fr') as unknown as Record<string, unknown>
    for (const sleutel of Object.keys(nl)) {
      if (sleutel === 'locale' || sleutel === 'ondernemingsnummer') continue
      const a = typeof nl[sleutel] === 'function' ? (nl[sleutel] as (...x: unknown[]) => string)('Jan', 'X') : nl[sleutel]
      const b = typeof fr[sleutel] === 'function' ? (fr[sleutel] as (...x: unknown[]) => string)('Jan', 'X') : fr[sleutel]
      expect(b, sleutel).not.toBe(a)
    }
    expect(portaalTeksten('fr').locale).toBe('fr-BE')
  })

  it('geeft Franse standaardteksten, maar de eigen tekst van de verkoper gaat voor', () => {
    expect(klantpaginaTeksten(null, 'fr').bedankt_kop).toBe('Merci pour votre commande')
    expect(klantpaginaTeksten({ bedankt_kop: 'Dankjewel!' }, 'fr').bedankt_kop).toBe('Dankjewel')
    expect(klantpaginaTeksten(null).bedankt_kop).toBe('Bedankt voor je opdracht')
  })
})
