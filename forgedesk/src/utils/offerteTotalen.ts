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

interface PrijsRegelBron {
  aantal: number
  eenheidsprijs: number
  korting_percentage: number
  btw_percentage: number
  prijs_varianten?: Array<{
    id: string
    aantal: number
    eenheidsprijs: number
    korting_percentage: number
    btw_percentage: number
  }>
  actieve_variant_id?: string
}

/**
 * Geeft de prijsregel van het actieve variant, of de basisvelden als het item
 * geen varianten heeft. Zo tellen totalen altijd met wat de gebruiker in de UI
 * ziet — in plaats van met de (mogelijk verouderde) basisprijs.
 */
export function getActievePrijsRegel(item: PrijsRegelBron): OfferteTotaalRegel {
  if (item.prijs_varianten && item.prijs_varianten.length > 0) {
    const actief = item.prijs_varianten.find(v => v.id === item.actieve_variant_id) || item.prijs_varianten[0]
    return {
      aantal: actief.aantal,
      eenheidsprijs: actief.eenheidsprijs,
      korting_percentage: actief.korting_percentage,
      btw_percentage: actief.btw_percentage,
    }
  }
  return {
    aantal: item.aantal,
    eenheidsprijs: item.eenheidsprijs,
    korting_percentage: item.korting_percentage,
    btw_percentage: item.btw_percentage,
  }
}

/** Regel-totaal (na korting) van het actieve variant of de basisprijs. */
export function berekenRegelTotaal(item: PrijsRegelBron): number {
  const r = getActievePrijsRegel(item)
  const bruto = round2(r.aantal * r.eenheidsprijs)
  return round2(bruto - bruto * (r.korting_percentage / 100))
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
