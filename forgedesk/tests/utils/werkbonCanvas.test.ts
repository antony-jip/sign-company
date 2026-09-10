import { describe, it, expect } from 'vitest'
import type { WerkbonAfbeelding } from '@/types'
import { metCanvasPositie, CANVAS_WERKRUIMTE_MM } from '@/utils/werkbonCanvas'

function afb(id: string, layout?: WerkbonAfbeelding['layout']): WerkbonAfbeelding {
  return {
    id, werkbon_item_id: 'item', url: `pad/${id}`, type: 'overig', created_at: '2026-09-10T08:00:00Z', layout,
  } as WerkbonAfbeelding
}

describe('metCanvasPositie', () => {
  it('filtert een afbeelding zonder coordinaten niet weg', () => {
    const uitOfferte = afb('offerte', {})
    const resultaat = metCanvasPositie([uitOfferte, afb('zonder-layout')])
    expect(resultaat).toHaveLength(2)
    expect(resultaat.every((a) => a.layout?.canvas_x_mm !== undefined)).toBe(true)
  })

  it('laat geplaatste afbeeldingen ongemoeid', () => {
    const geplaatst = afb('geplaatst', { blok_type: 'foto', canvas_x_mm: 180, canvas_y_mm: 5, canvas_breedte_mm: 80, canvas_hoogte_mm: 80 })
    expect(metCanvasPositie([geplaatst])[0]).toBe(geplaatst)
  })

  it('verspringt niet als een ander element een plek krijgt', () => {
    const voor = metCanvasPositie([afb('a', {}), afb('b', {})])
    const na = metCanvasPositie([afb('a', { canvas_x_mm: 100, canvas_y_mm: 20 }), afb('b', {})])
    expect(na[1].layout).toEqual(voor[1].layout)
  })

  it('houdt de standaardmaat van 40 mm hoog binnen het werkblad', () => {
    const veel = metCanvasPositie(Array.from({ length: 12 }, (_, i) => afb(String(i))))
    for (const a of veel) {
      expect((a.layout?.canvas_y_mm ?? 0) + 40).toBeLessThanOrEqual(CANVAS_WERKRUIMTE_MM.hoogte)
    }
  })

  it('bewaart blok_type en andere layoutvelden', () => {
    const [logo] = metCanvasPositie([afb('logo', { blok_type: 'logo', schaal_percentage: 33 })])
    expect(logo.layout).toMatchObject({ blok_type: 'logo', schaal_percentage: 33 })
  })
})
