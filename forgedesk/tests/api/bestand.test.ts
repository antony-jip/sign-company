import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * api/bestand tekent links naar de private bucket. Deze test draait de echte
 * handler tegen een nep-database, zodat hij vangt of de werkbonpaden worden
 * gecontroleerd én aangeroepen.
 *
 * De aanleiding (10 sep 2026): de editor vroeg de link op direct na het
 * uploaden, voordat er een rij naar het bestand wees. De route kende het pad
 * dan nog niet, gaf 404, en een net geïmporteerde JPG of PDF bleef onzichtbaar.
 * Monteurfoto's (werkbon_fotos) stonden in geen enkele lijst en kregen nooit
 * een link.
 */

const ORG = '11111111-1111-4111-8111-111111111111'
const ANDERE_ORG = '22222222-2222-4222-8222-222222222222'
const GEBRUIKER = '33333333-3333-4333-8333-333333333333'
const WERKBON = '44444444-4444-4444-8444-444444444444'
const ITEM = '55555555-5555-4555-8555-555555555555'
const VREEMD_ITEM = '66666666-6666-4666-8666-666666666666'

const { rijen, getekend } = vi.hoisted(() => ({
  rijen: {} as Record<string, Array<Record<string, unknown>>>,
  getekend: [] as string[],
}))

vi.mock('@supabase/supabase-js', () => {
  function query(tabel: string) {
    const filters: Array<[string, unknown]> = []
    const treffers = () => (rijen[tabel] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v))
    const q = {
      select: () => q,
      eq: (kolom: string, waarde: unknown) => { filters.push([kolom, waarde]); return q },
      limit: async () => ({ data: treffers(), error: null }),
      maybeSingle: async () => ({ data: treffers()[0] ?? null, error: null }),
    }
    return q
  }
  return {
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: GEBRUIKER } }, error: null }) },
      from: query,
      storage: {
        from: () => ({
          createSignedUrl: async (pad: string) => {
            getekend.push(pad)
            return { data: { signedUrl: `https://opslag.test/${pad}?token=x` }, error: null }
          },
        }),
      },
    }),
  }
})

const { default: handler } = await import('../../api/bestand')

async function vraag(pad: string): Promise<number> {
  let status = 0
  const res = {
    setHeader: () => res,
    status: (code: number) => { status = code; return res },
    json: () => res,
  } as unknown as VercelResponse
  const req = { method: 'POST', headers: { authorization: 'Bearer token' }, body: { pad } } as unknown as VercelRequest
  await handler(req, res)
  return status
}

beforeEach(() => {
  getekend.length = 0
  for (const k of Object.keys(rijen)) delete rijen[k]
  rijen.profiles = [{ id: GEBRUIKER, organisatie_id: ORG }]
  rijen.werkbonnen = [{ id: WERKBON, organisatie_id: ORG }]
  rijen.werkbon_items = [
    { id: ITEM, organisatie_id: ORG },
    { id: VREEMD_ITEM, organisatie_id: ANDERE_ORG },
  ]
})

describe('api/bestand · werkbonpaden', () => {
  it('tekent een net geüploade afbeelding waar nog geen rij naar wijst', async () => {
    expect(await vraag(`werkbon-afbeeldingen/${ITEM}/1789027636015-scherm.png`)).toBe(200)
  })

  it('tekent de bron-PDF van een item', async () => {
    expect(await vraag(`werkbon-pdfs/${ITEM}/1789027490973-luifel.pdf`)).toBe(200)
  })

  it('tekent een monteurfoto', async () => {
    expect(await vraag(`werkbon-fotos/${WERKBON}/1777361633291-image.jpg`)).toBe(200)
  })

  it('weigert een item van een andere organisatie', async () => {
    expect(await vraag(`werkbon-afbeeldingen/${VREEMD_ITEM}/x.png`)).toBe(404)
    expect(getekend).toEqual([])
  })

  it('weigert een werkbonmap zonder geldige uuid', async () => {
    expect(await vraag('werkbon-fotos/niet-een-uuid/x.jpg')).toBe(404)
    expect(await vraag('werkbon-afbeeldingen/x.png')).toBe(404)
  })

  it('laat de controle via een verwijzende rij intact', async () => {
    const pad = `${GEBRUIKER}/offerte-bijlagen/abc/1787643892640.png`
    rijen.werkbon_afbeeldingen = [{ id: 'a', url: pad, organisatie_id: ORG }]
    expect(await vraag(pad)).toBe(200)
    rijen.werkbon_afbeeldingen = [{ id: 'a', url: pad, organisatie_id: ANDERE_ORG }]
    expect(await vraag(pad)).toBe(404)
  })
})
