import { describe, it, expect } from 'vitest'
import { berekenOfferteTotalen, type OfferteTotaalRegel } from '../../src/utils/offerteTotalen'

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Verbatim kopie van de oude inline roll-up uit QuoteCreation.tsx (rawSub/effectiefSub/effectiefBtw),
// als onafhankelijke oracle om te bewijzen dat de extractie identiek rekent.
function referentie(regels: OfferteTotaalRegel[], afrondingskorting = 0, urenCorrectieBedrag = 0) {
  const rawSub = round2(regels.reduce((sum, r) => {
    const bruto = r.aantal * r.eenheidsprijs
    return sum + round2(bruto - bruto * (r.korting_percentage / 100))
  }, 0))
  const effectiefSub = round2(rawSub + afrondingskorting + urenCorrectieBedrag)
  const effectiefBtw = round2(effectiefSub * (rawSub > 0 ? round2(regels.reduce((sum, r) => {
    const bruto = r.aantal * r.eenheidsprijs
    const netto = round2(bruto - bruto * (r.korting_percentage / 100))
    return sum + round2(netto * (r.btw_percentage / 100))
  }, 0)) / rawSub : 0.21))
  return { subtotaal: effectiefSub, btw_bedrag: effectiefBtw, totaal: round2(effectiefSub + effectiefBtw) }
}

function regel(o: Partial<OfferteTotaalRegel>): OfferteTotaalRegel {
  return { aantal: 1, eenheidsprijs: 0, korting_percentage: 0, btw_percentage: 21, ...o }
}

describe('berekenOfferteTotalen', () => {
  it('lege regels -> alles 0', () => {
    expect(berekenOfferteTotalen([])).toEqual({ subtotaal: 0, btw_bedrag: 0, totaal: 0 })
  })

  it('één regel 21% -> cent-exact', () => {
    // 1 × 177.60 = 177.60 ; btw 21% = 37.30 (gewogen) ; totaal 214.90
    const res = berekenOfferteTotalen([regel({ eenheidsprijs: 177.6 })])
    expect(res).toEqual({ subtotaal: 177.6, btw_bedrag: 37.3, totaal: 214.9 })
  })

  it('gemengde BTW (9% + 21%) -> gewogen, klopt met referentie', () => {
    const regels = [
      regel({ aantal: 2, eenheidsprijs: 50, btw_percentage: 21 }),
      regel({ aantal: 3, eenheidsprijs: 20, btw_percentage: 9 }),
    ]
    expect(berekenOfferteTotalen(regels)).toEqual(referentie(regels))
  })

  it('met korting + afrondingskorting -> klopt met referentie', () => {
    const regels = [
      regel({ aantal: 4, eenheidsprijs: 96, korting_percentage: 10, btw_percentage: 21 }),
      regel({ aantal: 1, eenheidsprijs: 75, btw_percentage: 9 }),
    ]
    expect(berekenOfferteTotalen(regels, { afrondingskorting: -5 })).toEqual(referentie(regels, -5))
  })

  it('uren-correctie -> klopt met referentie', () => {
    const regels = [regel({ aantal: 1, eenheidsprijs: 200, btw_percentage: 21 })]
    expect(berekenOfferteTotalen(regels, { urenCorrectieBedrag: 37.5 })).toEqual(referentie(regels, 0, 37.5))
  })

  it('afrondings-randgevallen -> identiek aan referentie over meerdere sets', () => {
    const sets: OfferteTotaalRegel[][] = [
      [regel({ aantal: 3, eenheidsprijs: 0.665, korting_percentage: 12.5, btw_percentage: 21 })],
      [
        regel({ aantal: 7, eenheidsprijs: 2.005, korting_percentage: 3.33, btw_percentage: 9 }),
        regel({ aantal: 1.5, eenheidsprijs: 19.99, korting_percentage: 7, btw_percentage: 21 }),
      ],
    ]
    for (const set of sets) {
      expect(berekenOfferteTotalen(set)).toEqual(referentie(set))
    }
  })
})
