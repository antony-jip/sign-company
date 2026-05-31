import { round2 } from './budgetUtils'

export interface OfferteTotaalRegel {
  aantal: number
  eenheidsprijs: number
  korting_percentage: number
  btw_percentage: number
}

export interface OfferteTotalen {
  subtotaal: number
  btw_bedrag: number
  totaal: number
}

/**
 * Berekent de offerte-totalen uit de prijsregels: subtotaal (netto, na korting),
 * gewogen BTW per regel, en het totaal. Optioneel met afrondingskorting en
 * uren-correctie. Eén bron voor zowel de offerte-editor als de Daan-vulling,
 * zodat een door Daan gevulde offerte identieke bedragen heeft als een handmatige.
 */
export function berekenOfferteTotalen(
  regels: OfferteTotaalRegel[],
  opties: { afrondingskorting?: number; urenCorrectieBedrag?: number } = {},
): OfferteTotalen {
  const afrondingskorting = opties.afrondingskorting ?? 0
  const urenCorrectieBedrag = opties.urenCorrectieBedrag ?? 0

  const rawSub = round2(regels.reduce((sum, r) => {
    const bruto = r.aantal * r.eenheidsprijs
    return sum + round2(bruto - bruto * (r.korting_percentage / 100))
  }, 0))
  const subtotaal = round2(rawSub + afrondingskorting + urenCorrectieBedrag)
  const btw_bedrag = round2(subtotaal * (rawSub > 0 ? round2(regels.reduce((sum, r) => {
    const bruto = r.aantal * r.eenheidsprijs
    const netto = round2(bruto - bruto * (r.korting_percentage / 100))
    return sum + round2(netto * (r.btw_percentage / 100))
  }, 0)) / rawSub : 0.21))
  const totaal = round2(subtotaal + btw_bedrag)

  return { subtotaal, btw_bedrag, totaal }
}
