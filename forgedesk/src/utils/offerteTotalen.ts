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

export interface PrijsVariantBron {
  id: string
  aantal: number
  eenheidsprijs: number
  korting_percentage: number
  btw_percentage: number
  telt_mee?: boolean
}

export interface PrijsRegelBron {
  aantal: number
  eenheidsprijs: number
  korting_percentage: number
  btw_percentage: number
  prijs_varianten?: PrijsVariantBron[]
  actieve_variant_id?: string
}

/**
 * De prijsopties die in het totaal meetellen. Er mogen er meerdere aanstaan —
 * denk aan monteren én demonteren onder één post. Offertes van vóór die keuze
 * kennen alleen actieve_variant_id; daar telt die ene optie mee, of anders de
 * eerste, zodat een oude offerte hetzelfde bedrag houdt.
 */
export function getMeetellendeVarianten<T extends { id: string; telt_mee?: boolean }>(
  varianten: T[] | undefined,
  actieveVariantId?: string,
): T[] {
  if (!varianten?.length) return []
  const aangevinkt = varianten.filter((v) => v.telt_mee)
  if (aangevinkt.length > 0) return aangevinkt
  return [varianten.find((v) => v.id === actieveVariantId) ?? varianten[0]]
}

/**
 * De prijsregels van een item: één regel per meetellende optie, of de basisvelden
 * als het item geen opties heeft. Zo tellen totalen altijd met wat de gebruiker
 * in de UI ziet — in plaats van met de (mogelijk verouderde) basisprijs.
 */
export function getPrijsRegels(item: PrijsRegelBron): OfferteTotaalRegel[] {
  const meetellend = getMeetellendeVarianten(item.prijs_varianten, item.actieve_variant_id)
  if (meetellend.length > 0) {
    return meetellend.map((v) => ({
      aantal: v.aantal,
      eenheidsprijs: v.eenheidsprijs,
      korting_percentage: v.korting_percentage,
      btw_percentage: v.btw_percentage,
    }))
  }
  return [{
    aantal: item.aantal,
    eenheidsprijs: item.eenheidsprijs,
    korting_percentage: item.korting_percentage,
    btw_percentage: item.btw_percentage,
  }]
}

/** Het nettobedrag van een item: alle meetellende opties bij elkaar. */
export function berekenItemTotaal(item: PrijsRegelBron): number {
  return round2(
    getPrijsRegels(item).reduce((sum, r) => {
      const bruto = round2(r.aantal * r.eenheidsprijs)
      return sum + round2(bruto - bruto * (r.korting_percentage / 100))
    }, 0)
  )
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

/**
 * Het kortingsbedrag over de meetellende prijsregels. Het subtotaal is al netto,
 * dus zonder dit bedrag ziet de klant nergens terug wat er van de prijs af ging.
 * Wordt afgetrokken van hetzelfde bruto als berekenOfferteTotalen gebruikt, zodat
 * bruto min korting exact op het getoonde subtotaal uitkomt.
 */
export function berekenKortingBedrag(items: PrijsRegelBron[]): number {
  return round2(
    items.reduce(
      (sum, item) =>
        sum +
        getPrijsRegels(item).reduce((regelSom, r) => {
          const bruto = r.aantal * r.eenheidsprijs
          return regelSom + (bruto - round2(bruto - bruto * (r.korting_percentage / 100)))
        }, 0),
      0
    )
  )
}
