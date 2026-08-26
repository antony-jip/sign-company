import { describe, it, expect, beforeAll } from 'vitest'

// De cron maakt bij het importeren een Supabase-client aan; zonder deze twee
// variabelen gooit createClient meteen. De waarden worden verder niet gebruikt:
// de functies hieronder zijn puur.
process.env.VITE_SUPABASE_URL ||= 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-key'

let berekenOpenstaand: (rijen: { bedrag: number; status: number | null }[]) => number
let isVolledigAfgeletterd: (rijen: { status: number | null }[]) => boolean

beforeAll(async () => {
  const mod = await import('../../api/cron-exact-betaalsync')
  berekenOpenstaand = mod.berekenOpenstaand
  isVolledigAfgeletterd = mod.isVolledigAfgeletterd
})

describe('berekenOpenstaand', () => {
  // Exact levert een openstaande debiteurentermijn negatief aan. Deze twee
  // bedragen komen uit administratie 374494 (26-08-2026), waar de eerste
  // versie er -29,04 en -5.063,85 van maakte en de facturen daardoor als
  // "per bank voldaan" uit de herinneringen vielen.
  it('draait het teken van Exact om naar de doen.-conventie', () => {
    expect(berekenOpenstaand([{ bedrag: -29.04, status: 20 }])).toBe(29.04)
    expect(berekenOpenstaand([{ bedrag: -5063.85, status: 20 }])).toBe(5063.85)
  })

  it('telt afgeletterde termijnen niet mee', () => {
    expect(berekenOpenstaand([
      { bedrag: 0, status: 50 },
      { bedrag: -100, status: 20 },
    ])).toBe(100)
  })

  it('geeft 0 terug als alles is afgeletterd, zonder min-nul', () => {
    const uitkomst = berekenOpenstaand([{ bedrag: 0, status: 50 }])
    expect(uitkomst).toBe(0)
    expect(Object.is(uitkomst, -0)).toBe(false)
  })

  it('salderen: een openstaande credit verlaagt het openstaande bedrag', () => {
    expect(berekenOpenstaand([
      { bedrag: -500, status: 20 },
      { bedrag: 200, status: 20 },
    ])).toBe(300)
  })

  it('rondt af op centen', () => {
    expect(berekenOpenstaand([
      { bedrag: -0.105, status: 20 },
      { bedrag: -0.105, status: 20 },
    ])).toBe(0.21)
  })

  it('zonder termijnen is er niets openstaand', () => {
    expect(berekenOpenstaand([])).toBe(0)
  })
})

describe('isVolledigAfgeletterd', () => {
  it('alleen als élke termijn status 50 heeft', () => {
    expect(isVolledigAfgeletterd([{ status: 50 }, { status: 50 }])).toBe(true)
    expect(isVolledigAfgeletterd([{ status: 50 }, { status: 20 }])).toBe(false)
  })

  it('een lege spiegel is geen bewijs van betaling', () => {
    expect(isVolledigAfgeletterd([])).toBe(false)
  })

  it('een onbekende status telt niet als afgeletterd', () => {
    expect(isVolledigAfgeletterd([{ status: null }])).toBe(false)
  })
})
