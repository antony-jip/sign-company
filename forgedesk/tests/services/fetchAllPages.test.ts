import { describe, it, expect } from 'vitest'
import { fetchAllPages } from '../../src/services/supabaseHelpers'

// De lus vraagt in blokken van 1000. Deze nep-tabel geeft precies terug wat
// PostgREST zou geven voor een range, inclusief de harde cap van 1000.
function nepTabel(aantalRijen: number) {
  const aanroepen: Array<[number, number]> = []
  const haal = (van: number, tot: number) => {
    aanroepen.push([van, tot])
    const gevraagd = Math.min(tot - van + 1, 1000)
    const rijen = []
    for (let i = van; i < Math.min(van + gevraagd, aantalRijen); i++) rijen.push({ id: i })
    return Promise.resolve({ data: rijen, error: null })
  }
  return { haal, aanroepen }
}

describe('fetchAllPages', () => {
  it('haalt meer dan één pagina op en houdt de volgorde', async () => {
    const { haal, aanroepen } = nepTabel(2500)
    const rijen = await fetchAllPages<{ id: number }>(haal)
    expect(rijen).toHaveLength(2500)
    expect(rijen[0].id).toBe(0)
    expect(rijen[2499].id).toBe(2499)
    expect(aanroepen).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('stopt op een korte pagina zonder extra request', async () => {
    const { haal, aanroepen } = nepTabel(1500)
    await fetchAllPages<{ id: number }>(haal)
    expect(aanroepen).toHaveLength(2)
  })

  it('doet bij exact 1000 rijen één extra, lege request en stopt dan', async () => {
    const { haal, aanroepen } = nepTabel(1000)
    const rijen = await fetchAllPages<{ id: number }>(haal)
    expect(rijen).toHaveLength(1000)
    expect(aanroepen).toEqual([[0, 999], [1000, 1999]])
  })

  it('geeft een lege lijst bij een lege tabel', async () => {
    const { haal, aanroepen } = nepTabel(0)
    expect(await fetchAllPages<{ id: number }>(haal)).toEqual([])
    expect(aanroepen).toHaveLength(1)
  })

  it('respecteert een max die geen veelvoud van 1000 is', async () => {
    const { haal, aanroepen } = nepTabel(5000)
    const rijen = await fetchAllPages<{ id: number }>(haal, 1500)
    expect(rijen).toHaveLength(1500)
    expect(aanroepen).toEqual([[0, 999], [1000, 1499]])
  })

  it('gooit de fout door in plaats van hem te slikken', async () => {
    const haal = () => Promise.resolve({ data: null, error: new Error('kapot') })
    await expect(fetchAllPages(haal)).rejects.toThrow('kapot')
  })
})
