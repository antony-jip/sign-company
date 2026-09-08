import { describe, it, expect } from 'vitest'
import { regelVorm } from '@/components/invoices/WatFacturerenDialog'
import type { OfferteItem } from '@/types'

/**
 * Het venster "Wat factureren" rekende de korting van een prijsoptie niet mee:
 * die zit op de variant, niet op het item, en het item stond dan op 0%. De
 * factuur zelf klopte wel, dus het bedrag in het venster week af van wat er
 * daarna op de factuur kwam.
 */
function item(extra: Partial<OfferteItem>): OfferteItem {
  return {
    id: 'i1', offerte_id: 'o1', beschrijving: 'Post', aantal: 1, eenheidsprijs: 0,
    korting_percentage: 0, btw_percentage: 21, totaal: 0, volgorde: 0,
    ...extra,
  } as OfferteItem
}

function variant(extra: Record<string, unknown>) {
  return { id: 'v', label: 'optie', aantal: 1, eenheidsprijs: 0, korting_percentage: 0, btw_percentage: 21, ...extra }
}

describe('regelVorm', () => {
  it('neemt de korting van het item over als er geen prijsopties zijn', () => {
    expect(regelVorm(item({ aantal: 3, eenheidsprijs: 200, korting_percentage: 30 })))
      .toEqual({ aantal: 3, eenheidsprijs: 200, korting_percentage: 30, vast: false })
  })

  it('neemt bij één meetellende optie de korting van die optie', () => {
    const oi = item({
      aantal: 1, eenheidsprijs: 165, korting_percentage: 0,
      prijs_varianten: [variant({ id: 'v2', aantal: 10, eenheidsprijs: 200, korting_percentage: 10, telt_mee: true })],
    })
    expect(regelVorm(oi)).toEqual({ aantal: 10, eenheidsprijs: 200, korting_percentage: 10, vast: false })
  })

  it('telt bij meerdere opties de nettobedragen op, niet de brutobedragen', () => {
    const oi = item({
      prijs_varianten: [
        variant({ id: 'a', aantal: 5, eenheidsprijs: 200, korting_percentage: 0, telt_mee: true }),
        variant({ id: 'b', aantal: 10, eenheidsprijs: 200, korting_percentage: 10, telt_mee: true }),
        variant({ id: 'c', aantal: 20, eenheidsprijs: 200, korting_percentage: 20, telt_mee: true }),
      ],
    })
    // 1000 + 1800 + 3200, niet 1000 + 2000 + 4000
    expect(regelVorm(oi)).toEqual({ aantal: 1, eenheidsprijs: 6000, korting_percentage: 0, vast: true })
  })
})
