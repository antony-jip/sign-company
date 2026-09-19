import { describe, it, expect, beforeAll } from 'vitest'

process.env.VITE_SUPABASE_URL ||= 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-key'

type Mod = typeof import('../../api/offerte-accepteren')
let gekozenVariantIds: Mod['gekozenVariantIds']
let prijsRegels: Mod['prijsRegels']

beforeAll(async () => {
  const mod = await import('../../api/offerte-accepteren')
  gekozenVariantIds = mod.gekozenVariantIds
  prijsRegels = mod.prijsRegels
})

const varianten = [
  { id: 'a', label: 'Gevelbanier', aantal: 1, eenheidsprijs: 925, btw_percentage: 21, korting_percentage: 0 },
  { id: 'b', label: 'Montage', aantal: 1, eenheidsprijs: 845, btw_percentage: 21, korting_percentage: 0 },
  { id: 'c', label: 'Verlichting', aantal: 2, eenheidsprijs: 300, btw_percentage: 21, korting_percentage: 10 },
]
const item = { id: 'i1', aantal: 1, eenheidsprijs: 925, btw_percentage: 21, korting_percentage: 0, prijs_varianten: varianten, actieve_variant_id: 'a' }

describe('gekozenVariantIds · alleen uitvoeringen die op de post staan', () => {
  it('houdt bestaande ids, ontdubbelt, en negeert onbekende', () => {
    expect(gekozenVariantIds(varianten, ['b', 'a', 'b', 'zzz'])).toEqual(['b', 'a'])
  })

  it('geeft niets terug bij een lege of oude (enkele) keuze', () => {
    expect(gekozenVariantIds(varianten, [])).toBeUndefined()
    expect(gekozenVariantIds(varianten, ['nope'])).toBeUndefined()
    expect(gekozenVariantIds(varianten, 'a')).toBeUndefined()
    expect(gekozenVariantIds(varianten, undefined)).toBeUndefined()
  })
})

describe('prijsRegels · wat de klant aanvinkte telt', () => {
  it('telt meerdere aangevinkte uitvoeringen op', () => {
    const regels = prijsRegels(item, ['a', 'b'])
    expect(regels.map((r) => r.eenheidsprijs)).toEqual([925, 845])
  })

  it('neemt korting en aantal per uitvoering mee', () => {
    expect(prijsRegels(item, ['c'])).toEqual([{ aantal: 2, eenheidsprijs: 300, btw_percentage: 21, korting_percentage: 10 }])
  })

  it('valt zonder geldige keuze terug op de standaard van de verkoper', () => {
    expect(prijsRegels(item, ['zzz']).map((r) => r.eenheidsprijs)).toEqual([925])
    expect(prijsRegels(item, undefined).map((r) => r.eenheidsprijs)).toEqual([925])
  })

  it('blijft de oude enkele keuze begrijpen', () => {
    expect(prijsRegels(item, 'b').map((r) => r.eenheidsprijs)).toEqual([845])
    const vast = { ...item, prijs_varianten: varianten.map((v) => ({ ...v, telt_mee: v.id !== 'c' })) }
    expect(prijsRegels(vast, 'c').map((r) => r.eenheidsprijs)).toEqual([925, 845])
  })

  it('rekent zonder actieve variant met de eerste uitvoering, net als de klantpagina', () => {
    const zonderActieve = { ...item, actieve_variant_id: undefined, eenheidsprijs: 1 }
    expect(prijsRegels(zonderActieve, undefined).map((r) => r.eenheidsprijs)).toEqual([925])
    expect(prijsRegels(zonderActieve, 'onbekend').map((r) => r.eenheidsprijs)).toEqual([925])
  })

  it('gebruikt de basisprijs als de post geen uitvoeringen heeft', () => {
    expect(prijsRegels({ aantal: 3, eenheidsprijs: 10, btw_percentage: 9, korting_percentage: 0 }, ['a'])).toEqual([
      { aantal: 3, eenheidsprijs: 10, btw_percentage: 9, korting_percentage: 0 },
    ])
  })
})
