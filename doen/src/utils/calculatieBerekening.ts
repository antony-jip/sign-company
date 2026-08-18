import type { CalculatieRegel } from '../types'
import { round2 } from './budgetUtils'
import { berekenMarkupPercentage } from './margeBerekening'

export interface CalculatieTotalen {
  totaalInkoop: number
  totaalVerkoop: number
  totaalKorting: number
  margeBedrag: number
  margePercentage: number
}

export function berekenRegeltotaal(regel: CalculatieRegel): number {
  const regelVerkoop = round2(regel.aantal * regel.verkoop_prijs)
  const kortingBedrag = round2(regelVerkoop * (regel.korting_percentage / 100))
  return round2(regelVerkoop - kortingBedrag)
}

export function berekenCalculatieTotalen(regels: CalculatieRegel[]): CalculatieTotalen {
  let totaalInkoop = 0
  let totaalVerkoop = 0
  let totaalKorting = 0

  regels.forEach((r) => {
    const regelInkoop = round2(r.aantal * r.inkoop_prijs)
    const regelVerkoop = round2(r.aantal * r.verkoop_prijs)
    const kortingBedrag = round2(regelVerkoop * (r.korting_percentage / 100))
    totaalInkoop += regelInkoop
    totaalVerkoop += regelVerkoop - kortingBedrag
    totaalKorting += kortingBedrag
  })

  totaalInkoop = round2(totaalInkoop)
  totaalVerkoop = round2(totaalVerkoop)
  totaalKorting = round2(totaalKorting)

  const margeBedrag = round2(totaalVerkoop - totaalInkoop)
  const margePercentage = Math.round(berekenMarkupPercentage(totaalInkoop, totaalVerkoop) * 10) / 10

  return {
    totaalInkoop,
    totaalVerkoop,
    totaalKorting,
    margeBedrag,
    margePercentage,
  }
}
