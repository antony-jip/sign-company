import { describe, it, expect, vi } from 'vitest'
import { fetchAllPages } from '../../src/services/supabaseHelpers'

/**
 * `fetchAllPages` is de enige plek in de app die om het 1000-rijen-plafond van
 * PostgREST heen werkt. Sinds deze ronde hangt ook `getMaxNummer` eraan, en
 * daarmee de uitgifte van factuur-, offerte- en werkbonnummers. Een fout in de
 * lus geeft geen foutmelding maar een te laag nummer, en dus een dubbel
 * factuurnummer.
 */
const PAGINA = 1000

function bron(totaalRijen: number) {
  const calls: Array<[number, number]> = []
  const haal = vi.fn(async (van: number, tot: number) => {
    calls.push([van, tot])
    const data = []
    for (let i = van; i <= Math.min(tot, totaalRijen - 1); i++) data.push({ n: i })
    return { data, error: null }
  })
  return { haal, calls }
}

describe('fetchAllPages', () => {
  it('haalt alles op als het onder één pagina blijft', async () => {
    const { haal, calls } = bron(42)
    const rijen = await fetchAllPages<{ n: number }>(haal)
    expect(rijen).toHaveLength(42)
    expect(calls).toEqual([[0, 999]])
  })

  it('stopt na één ronde bij precies minder dan een volle pagina', async () => {
    const { haal, calls } = bron(PAGINA - 1)
    expect(await fetchAllPages(haal)).toHaveLength(PAGINA - 1)
    expect(calls).toHaveLength(1)
  })

  /**
   * De grens waar de bug zat. Een volle pagina is geen bewijs dat het klaar is,
   * dus er moet een tweede request komen die leeg terugkomt.
   */
  it('vraagt een tweede pagina bij precies een volle pagina', async () => {
    const { haal, calls } = bron(PAGINA)
    expect(await fetchAllPages(haal)).toHaveLength(PAGINA)
    expect(calls).toEqual([[0, 999], [1000, 1999]])
  })

  it('leest over meerdere pagina\'s door zonder een rij te missen of te dubbelen', async () => {
    const { haal } = bron(2500)
    const rijen = await fetchAllPages<{ n: number }>(haal)
    expect(rijen).toHaveLength(2500)
    expect(new Set(rijen.map(r => r.n)).size).toBe(2500)
    expect(rijen[0].n).toBe(0)
    expect(rijen[2499].n).toBe(2499)
  })

  it('kapt op de bovengrens in plaats van door te blijven vragen', async () => {
    const { haal } = bron(10_000)
    expect(await fetchAllPages(haal, 2000)).toHaveLength(2000)
  })

  /**
   * Een fout moet naar boven komen. Stil een halve lijst teruggeven zou hier het
   * ergste zijn: `getMaxNummer` zou dan een te laag maximum vinden en een
   * bestaand factuurnummer opnieuw uitgeven.
   */
  it('gooit de fout door in plaats van een halve lijst terug te geven', async () => {
    const haal = vi.fn(async (van: number) =>
      van === 0
        ? { data: Array.from({ length: PAGINA }, (_, i) => ({ n: i })), error: null }
        : { data: null, error: new Error('netwerk weg') }
    )
    await expect(fetchAllPages(haal)).rejects.toThrow('netwerk weg')
  })
})

/**
 * De collisiefilter uit `getMaxNummer`, hier los nagebouwd. Hij kan niet in de
 * query en moet dus over álle rijen lopen; dat is precies de reden dat
 * `getMaxNummer` pagineert in plaats van `order desc limit 1` te doen.
 */
const TYPED_PREFIXES = ['CN', 'CR', 'VS', 'EA']

function maxVanRijen(waarden: string[], prefix: string): number {
  return waarden.reduce<number>((max, value) => {
    const collidesWithTyped = TYPED_PREFIXES.some(
      tp => value.startsWith(tp) && !prefix.startsWith(tp)
    )
    if (collidesWithTyped) return max
    const tail = value.slice(prefix.length)
    if (!/^\d+$/.test(tail)) return max
    return Math.max(max, parseInt(tail, 10))
  }, 0)
}

describe('getMaxNummer · collisiefilter', () => {
  it('negeert een creditnota bij het zoeken naar een gewoon nummer', () => {
    // `.like('C%')` vindt ook CN- en CR-nummers. Zonder de filter zou een
    // creditnota CN9999 het volgende gewone nummer op 10000 zetten.
    expect(maxVanRijen(['C12', 'CN9999', 'CR8888', 'C13'], 'C')).toBe(13)
  })

  it('zoekt wél binnen een getypeerde prefix als je die expliciet vraagt', () => {
    expect(maxVanRijen(['CN7', 'CN9999'], 'CN')).toBe(9999)
  })

  it('slaat een nummer met letters in de staart over', () => {
    expect(maxVanRijen(['F2026-001', 'F12', 'Fconcept'], 'F')).toBe(12)
  })

  it('geeft 0 als er niets bruikbaars staat, zodat de teller bij 1 begint', () => {
    expect(maxVanRijen([], 'F')).toBe(0)
    expect(maxVanRijen(['Fabc'], 'F')).toBe(0)
  })

  /**
   * De kern van waarom paginatie hier nodig is: het hoogste nummer kan op elke
   * plek in de lijst staan, dus je moet ze allemaal zien. Bij afgekapte data zou
   * dit 1500 teruggeven en dan zou nummer 2001 opnieuw uitgegeven worden.
   */
  it('vindt het maximum ook als het buiten de eerste pagina zou vallen', () => {
    const waarden = Array.from({ length: 1500 }, (_, i) => `F${i + 1}`)
    waarden.push('F2001')
    expect(maxVanRijen(waarden, 'F')).toBe(2001)
  })
})
