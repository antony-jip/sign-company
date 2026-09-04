import { describe, it, expect } from 'vitest'
import {
  berekenOfferteUren,
  effectieveUrenPerVeld,
  verplichtePrijsItems,
  getPrijsDataRegels,
  type UrenItem,
} from '../../src/utils/offerteUren'
import { getMeetellendeVarianten } from '../../src/utils/offerteTotalen'
import type { CalculatieRegel } from '../../src/types'

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Verbatim copy of the old useMemo in QuoteCreation.tsx (r.558-633), used as an
// independent oracle: the extracted function must give exactly the same answer
// for every item that has no explicit urenveld on its rules.
function referentie(items: UrenItem[], urenVelden: string[]) {
  const urenMap: Record<string, number> = {}
  const tariefMap: Record<string, { totaalPrijs: number; totaalAantal: number }> = {}
  let totaal = 0
  let materiaal = 0
  urenVelden.forEach((veld) => {
    urenMap[veld] = 0
    tariefMap[veld] = { totaalPrijs: 0, totaalAantal: 0 }
  })
  const prijsData = (item: UrenItem) => {
    const meetellend = getMeetellendeVarianten(item.prijs_varianten, item.actieve_variant_id)
    if (meetellend.length > 0) return meetellend.map((v) => ({ calculatie_regels: v.calculatie_regels }))
    return [{ calculatie_regels: item.calculatie_regels }]
  }
  items.forEach((item) => {
    prijsData(item).forEach((data) => {
      if (!data.calculatie_regels || data.calculatie_regels.length === 0) return
      data.calculatie_regels.forEach((r) => {
        const categorieLower = (r.categorie || '').toLowerCase()
        const naamLower = (r.product_naam || '').toLowerCase()
        for (const veld of urenVelden) {
          const veldLower = veld.toLowerCase()
          if (categorieLower.includes(veldLower) || naamLower.includes(veldLower)) {
            urenMap[veld] = (urenMap[veld] || 0) + r.aantal
            totaal += r.aantal
            tariefMap[veld].totaalPrijs += round2(r.verkoop_prijs * r.aantal)
            tariefMap[veld].totaalAantal += r.aantal
            break
          }
        }
        if (categorieLower.includes('materiaal') || categorieLower === 'materiaal') {
          materiaal += round2(r.verkoop_prijs * r.aantal)
        }
      })
    })
    if (item.detail_regels && item.detail_regels.length > 0) {
      item.detail_regels.forEach((dr) => {
        const labelLower = (dr.label || '').toLowerCase()
        const waarde = (dr.waarde || '').trim()
        if (!waarde) return
        const numMatch = waarde.match(/^[\d]+([.,]\d+)?/)
        if (!numMatch) return
        const uren = parseFloat(numMatch[0].replace(',', '.'))
        if (isNaN(uren) || uren <= 0) return
        for (const veld of urenVelden) {
          const veldLower = veld.toLowerCase()
          if (labelLower.includes(veldLower) || veldLower.includes(labelLower)) {
            urenMap[veld] = (urenMap[veld] || 0) + uren
            totaal += uren
            break
          }
        }
      })
    }
  })
  const tarieven: Record<string, number> = {}
  urenVelden.forEach((veld) => {
    tarieven[veld] = tariefMap[veld].totaalAantal > 0
      ? round2(tariefMap[veld].totaalPrijs / tariefMap[veld].totaalAantal)
      : 0
  })
  return { urenPerVeld: urenMap, totaalUren: totaal, materiaalKosten: round2(materiaal), tariefPerVeld: tarieven }
}

const VELDEN = ['Montage', 'Voorbereiding', 'Ontwerp & DTP', 'Applicatie']

function regel(overrides: Partial<CalculatieRegel>): CalculatieRegel {
  return {
    id: Math.random().toString(36).slice(2),
    product_naam: '',
    categorie: '',
    eenheid: 'uur',
    aantal: 0,
    inkoop_prijs: 0,
    verkoop_prijs: 0,
    marge_percentage: 0,
    korting_percentage: 0,
    nacalculatie: false,
    btw_percentage: 21,
    notitie: '',
    ...overrides,
  }
}

function item(overrides: Partial<UrenItem>): UrenItem {
  return { soort: 'prijs', aantal: 1, eenheidsprijs: 0, btw_percentage: 21, korting_percentage: 0, ...overrides }
}

const BELETTERING: UrenItem[] = [
  item({
    calculatie_regels: [
      regel({ product_naam: 'Montage intern', categorie: 'Arbeid', aantal: 45, verkoop_prijs: 75 }),
      regel({ product_naam: 'Grafische werkvoorbereiding', categorie: 'Voorbereiding', aantal: 10, verkoop_prijs: 80 }),
      regel({ product_naam: 'Printfolie 3M IJ180', categorie: 'Materiaal', eenheid: 'm2', aantal: 12.5, inkoop_prijs: 40, verkoop_prijs: 73.43 }),
      regel({ product_naam: 'Ontwerp', categorie: 'Ontwerp & DTP', eenheid: 'stuks', aantal: 3, verkoop_prijs: 100 }),
    ],
    detail_regels: [
      { label: 'Applicatie', waarde: '4,5 uur' },
      { label: 'Opmerking', waarde: 'geen uren hier' },
    ],
  }),
  item({
    prijs_varianten: [
      { id: 'a', aantal: 1, eenheidsprijs: 0, btw_percentage: 21, korting_percentage: 0, telt_mee: false,
        calculatie_regels: [regel({ product_naam: 'Montage extern', aantal: 99, verkoop_prijs: 75 })] },
      { id: 'b', aantal: 1, eenheidsprijs: 0, btw_percentage: 21, korting_percentage: 0, telt_mee: true,
        calculatie_regels: [regel({ product_naam: 'Montage extern', aantal: 8, verkoop_prijs: 90 })] },
    ],
  }),
  item({ soort: 'tekst' }),
  item({ is_optioneel: true, calculatie_regels: [regel({ product_naam: 'Montage', aantal: 1000, verkoop_prijs: 1 })] }),
]

describe('berekenOfferteUren', () => {
  it('geeft exact dezelfde uitkomst als de oude useMemo in QuoteCreation', () => {
    const meetellend = verplichtePrijsItems(BELETTERING)
    expect(berekenOfferteUren(meetellend, VELDEN)).toEqual(referentie(meetellend, VELDEN))
  })

  it('telt alleen verplichte prijsregels: tekst en optioneel vallen af', () => {
    const meetellend = verplichtePrijsItems(BELETTERING)
    expect(meetellend).toHaveLength(2)
    const uit = berekenOfferteUren(meetellend, VELDEN)
    expect(uit.urenPerVeld.Montage).toBe(45 + 8)
  })

  it('volgt de meetellende prijsoptie, niet de eerste', () => {
    const uit = berekenOfferteUren([BELETTERING[1]], VELDEN)
    expect(uit.urenPerVeld.Montage).toBe(8)
    expect(uit.tariefPerVeld.Montage).toBe(90)
  })

  it('leest uren uit een detailregel met een getal in de waarde', () => {
    const uit = berekenOfferteUren([BELETTERING[0]], VELDEN)
    expect(uit.urenPerVeld.Applicatie).toBe(4.5)
  })

  it('telt materiaal apart en niet als uren', () => {
    const uit = berekenOfferteUren([BELETTERING[0]], VELDEN)
    expect(uit.materiaalKosten).toBe(round2(12.5 * 73.43))
    expect(uit.totaalUren).toBe(45 + 10 + 3 + 4.5)
  })

  it('laat een expliciete bewerking op de regel winnen van de naam', () => {
    const regels = [
      regel({ product_naam: 'Demontage oude gevel', categorie: 'Arbeid', aantal: 6, verkoop_prijs: 75, urenveld: 'Voorbereiding' }),
    ]
    const uit = berekenOfferteUren([item({ calculatie_regels: regels })], VELDEN)
    expect(uit.urenPerVeld.Voorbereiding).toBe(6)
    expect(uit.urenPerVeld.Montage).toBe(0)
  })

  it('negeert een expliciete bewerking die niet in de instellingen staat en valt terug op de naam', () => {
    const regels = [regel({ product_naam: 'Montage', aantal: 2, verkoop_prijs: 75, urenveld: 'Beletteren' })]
    const uit = berekenOfferteUren([item({ calculatie_regels: regels })], VELDEN)
    expect(uit.urenPerVeld.Montage).toBe(2)
  })
})

describe('effectieveUrenPerVeld', () => {
  it('telt de correctie op en laat velden zonder correctie met rust', () => {
    const uit = effectieveUrenPerVeld({ Montage: 10, Voorbereiding: 2 }, { Montage: -3 }, VELDEN)
    expect(uit).toEqual({ Montage: 7, Voorbereiding: 2, 'Ontwerp & DTP': 0, Applicatie: 0 })
  })
})

describe('getPrijsDataRegels', () => {
  it('geeft de basisvelden als er geen opties zijn', () => {
    const uit = getPrijsDataRegels(item({ aantal: 3, eenheidsprijs: 10 }))
    expect(uit).toHaveLength(1)
    expect(uit[0].aantal).toBe(3)
  })
})
