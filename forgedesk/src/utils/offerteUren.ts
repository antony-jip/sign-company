import { round2 } from '@/utils/budgetUtils'
import { getMeetellendeVarianten } from '@/utils/offerteTotalen'
import type { CalculatieRegel } from '@/types'

/**
 * Uren per bewerking (urenveld) uit een offerte.
 *
 * Dit was een useMemo in QuoteCreation. Het is een losse functie geworden omdat
 * het project dezelfde uren nodig heeft als budget: verkocht per bewerking tegen
 * geschreven per bewerking. Eén functie, dus editor en project rekenen nooit
 * verschillend.
 *
 * Twee bronnen, in deze volgorde per regel:
 *   1. Calculatieregels. Een regel met een expliciete bewerking (urenveld,
 *      overgenomen van het catalogusproduct) telt daar. Zonder bewerking
 *      matcht de productnaam of categorie tegen de urenvelden, ongeacht eenheid:
 *      ook "stuks" telt mee als de naam matcht. Eerste treffer wint.
 *   2. Detailregels: label matcht een urenveld, getal uit de waarde ("4 uur").
 */

export const STANDAARD_URENVELDEN = ['Montage', 'Voorbereiding', 'Ontwerp & DTP', 'Applicatie']

/** Prijsgegevens van één meetellende optie, of van het item zelf zonder opties. */
export interface PrijsData {
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  calculatie_regels?: CalculatieRegel[]
}

/** Structureel type: past op QuoteLineItem (editor) én OfferteItem (database). */
export interface UrenItem extends PrijsData {
  soort?: 'prijs' | 'tekst'
  is_optioneel?: boolean
  prijs_varianten?: Array<PrijsData & { id: string; telt_mee?: boolean }>
  actieve_variant_id?: string
  detail_regels?: Array<{ label: string; waarde: string }>
}

export interface OfferteUren {
  urenPerVeld: Record<string, number>
  totaalUren: number
  materiaalKosten: number
  /** Gemiddeld verkooptarief per uur per veld, 0 als er geen uren zijn. */
  tariefPerVeld: Record<string, number>
}

export function urenVeldenUitInstellingen(velden: string[] | undefined | null): string[] {
  return velden && velden.length > 0 ? velden : STANDAARD_URENVELDEN
}

/** Alleen prijsregels die verplicht zijn tellen mee voor uren en totalen. */
export function verplichtePrijsItems<T extends UrenItem>(items: T[]): T[] {
  return items.filter((i) => (i.soort ?? 'prijs') === 'prijs' && !i.is_optioneel)
}

export function getPrijsDataRegels(item: UrenItem): PrijsData[] {
  const meetellend = getMeetellendeVarianten(item.prijs_varianten, item.actieve_variant_id)
  if (meetellend.length > 0) {
    return meetellend.map((v) => ({
      aantal: v.aantal,
      eenheidsprijs: v.eenheidsprijs,
      btw_percentage: v.btw_percentage,
      korting_percentage: v.korting_percentage,
      calculatie_regels: v.calculatie_regels,
    }))
  }
  return [{
    aantal: item.aantal,
    eenheidsprijs: item.eenheidsprijs,
    btw_percentage: item.btw_percentage,
    korting_percentage: item.korting_percentage,
    calculatie_regels: item.calculatie_regels,
  }]
}

function veldVoorRegel(regel: CalculatieRegel, urenVelden: string[]): string | null {
  if (regel.urenveld && urenVelden.includes(regel.urenveld)) return regel.urenveld
  const categorieLower = (regel.categorie || '').toLowerCase()
  const naamLower = (regel.product_naam || '').toLowerCase()
  for (const veld of urenVelden) {
    const veldLower = veld.toLowerCase()
    if (categorieLower.includes(veldLower) || naamLower.includes(veldLower)) return veld
  }
  return null
}

export function berekenOfferteUren(items: UrenItem[], urenVelden: string[]): OfferteUren {
  const urenMap: Record<string, number> = {}
  const tariefMap: Record<string, { totaalPrijs: number; totaalAantal: number }> = {}
  let totaal = 0
  let materiaal = 0

  urenVelden.forEach((veld) => {
    urenMap[veld] = 0
    tariefMap[veld] = { totaalPrijs: 0, totaalAantal: 0 }
  })

  items.forEach((item) => {
    getPrijsDataRegels(item).forEach((data) => {
      if (!data.calculatie_regels || data.calculatie_regels.length === 0) return
      data.calculatie_regels.forEach((r) => {
        const veld = veldVoorRegel(r, urenVelden)
        if (veld) {
          urenMap[veld] = (urenMap[veld] || 0) + r.aantal
          totaal += r.aantal
          tariefMap[veld].totaalPrijs += round2(r.verkoop_prijs * r.aantal)
          tariefMap[veld].totaalAantal += r.aantal
        }
        const categorieLower = (r.categorie || '').toLowerCase()
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

/** Basisuren plus de correctie die op de offerte bewaard staat. */
export function effectieveUrenPerVeld(
  urenPerVeld: Record<string, number>,
  urenCorrectie: Record<string, number> | undefined | null,
  urenVelden: string[],
): Record<string, number> {
  const result: Record<string, number> = {}
  urenVelden.forEach((veld) => {
    result[veld] = (urenPerVeld[veld] || 0) + (urenCorrectie?.[veld] || 0)
  })
  return result
}
