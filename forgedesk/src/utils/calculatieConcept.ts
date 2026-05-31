import type { CalculatieRegel, CalculatieProduct } from '../types'
import { round2 } from './budgetUtils'
import { berekenVerkoopVanMarkup, berekenMarkupPercentage } from './margeBerekening'
import {
  berekenCalculatieTotalen,
  type CalculatieTotalen,
} from './calculatieBerekening'

export type ConceptInputRegel =
  | {
      type: 'product'
      omschrijving: string
      aantal: number
      inkoop?: number
      marge?: number
      marge_type?: 'procent' | 'bedrag'
    }
  | {
      type: 'montage'
      omschrijving?: string
      uren: number
    }

export interface ConceptInput {
  klant: string
  regels: ConceptInputRegel[]
}

export interface ConceptVraag {
  veld: string
  vraag: string
  opties?: string[]
}

export interface CalculatieConcept {
  klant: string
  regels: CalculatieRegel[]
  totalen: CalculatieTotalen
  vragen: ConceptVraag[]
  klaar: boolean
}

function normaliseer(naam: string): string {
  return naam.trim().toLowerCase()
}

/** Zoekt catalogus-producten die op naam matchen: exact eerst, anders substring (beide kanten). */
function matchProducten(naam: string, producten: CalculatieProduct[]): CalculatieProduct[] {
  const doel = normaliseer(naam)
  if (!doel) return []
  const exact = producten.filter((p) => normaliseer(p.naam) === doel)
  if (exact.length > 0) return exact
  return producten.filter((p) => {
    const pn = normaliseer(p.naam)
    return pn.includes(doel) || doel.includes(pn)
  })
}

function maakRegel(
  index: number,
  product: CalculatieProduct,
  velden: { aantal: number; inkoop_prijs: number; verkoop_prijs: number; marge_percentage: number },
): CalculatieRegel {
  return {
    id: `concept-${index}`,
    product_id: product.id,
    product_naam: product.naam,
    categorie: product.categorie,
    eenheid: product.eenheid,
    aantal: velden.aantal,
    inkoop_prijs: velden.inkoop_prijs,
    verkoop_prijs: velden.verkoop_prijs,
    marge_percentage: velden.marge_percentage,
    korting_percentage: 0,
    nacalculatie: false,
    btw_percentage: product.btw_percentage,
    notitie: '',
  }
}

/**
 * Pure kern: bouwt een calculatie-concept uit gestructureerde invoer en een
 * geïnjecteerde productcatalogus. Geen DB, geen chat, geen UI. Bij twijfel
 * wordt een vraag toegevoegd en de betreffende regel weggelaten (nooit gegokt).
 */
export function bouwCalculatieConcept(
  input: ConceptInput,
  producten: CalculatieProduct[],
): CalculatieConcept {
  const regels: CalculatieRegel[] = []
  const vragen: ConceptVraag[] = []

  input.regels.forEach((regel, index) => {
    if (regel.type === 'product') {
      const matches = matchProducten(regel.omschrijving, producten)
      if (matches.length === 0) {
        vragen.push({
          veld: `regel[${index}].product`,
          vraag: `Ik kan "${regel.omschrijving}" niet in de catalogus vinden. Welk product bedoel je?`,
        })
        return
      }
      if (matches.length > 1) {
        vragen.push({
          veld: `regel[${index}].product`,
          vraag: `Er zijn meerdere producten die op "${regel.omschrijving}" lijken. Welke bedoel je?`,
          opties: matches.map((p) => p.naam),
        })
        return
      }

      const product = matches[0]
      const inkoop = regel.inkoop ?? product.inkoop_prijs

      if (regel.marge !== undefined && regel.marge_type === undefined) {
        vragen.push({
          veld: `regel[${index}].marge`,
          vraag: `Bedoel je met "${regel.marge}" een marge in procenten of in euro's?`,
          opties: ['procent', 'bedrag'],
        })
        return
      }

      let verkoop: number
      let margePercentage: number
      if (regel.marge !== undefined && regel.marge_type === 'bedrag') {
        verkoop = round2(inkoop + regel.marge)
        margePercentage = Math.round(berekenMarkupPercentage(inkoop, verkoop) * 10) / 10
      } else {
        const markup = regel.marge !== undefined ? regel.marge : product.standaard_marge
        verkoop = round2(berekenVerkoopVanMarkup(inkoop, markup))
        margePercentage = markup
      }

      regels.push(
        maakRegel(index, product, {
          aantal: regel.aantal,
          inkoop_prijs: inkoop,
          verkoop_prijs: verkoop,
          marge_percentage: margePercentage,
        }),
      )
      return
    }

    // type === 'montage'
    const uurProducten = producten.filter((p) => normaliseer(p.eenheid) === 'uur')
    const kandidaten = regel.omschrijving
      ? matchProducten(regel.omschrijving, uurProducten)
      : uurProducten

    if (kandidaten.length === 0) {
      vragen.push({
        veld: `regel[${index}].montage`,
        vraag: regel.omschrijving
          ? `Ik vind geen montage-product "${regel.omschrijving}" in de catalogus, dus ik ken het uurtarief niet. Welk montage-product gebruik ik?`
          : `Ik vind geen montage-product met een uurtarief in de catalogus. Welk product gebruik ik voor de montage-uren?`,
      })
      return
    }
    if (kandidaten.length > 1) {
      vragen.push({
        veld: `regel[${index}].montage`,
        vraag: `Er zijn meerdere montage-producten. Welke gebruik ik voor deze uren?`,
        opties: kandidaten.map((p) => p.naam),
      })
      return
    }

    const product = kandidaten[0]
    regels.push(
      maakRegel(index, product, {
        aantal: regel.uren,
        inkoop_prijs: product.inkoop_prijs,
        verkoop_prijs: product.verkoop_prijs,
        marge_percentage: product.standaard_marge,
      }),
    )
  })

  return {
    klant: input.klant,
    regels,
    totalen: berekenCalculatieTotalen(regels),
    vragen,
    klaar: vragen.length === 0,
  }
}

/**
 * Dunne wrapper: haalt de catalogus op via getCalculatieProducten en delegeert
 * naar de pure kern. De service wordt dynamisch geïmporteerd zodat de pure kern
 * (en zijn tests) geen Supabase meetrekken.
 */
export async function bouwCalculatieConceptViaCatalogus(
  input: ConceptInput,
): Promise<CalculatieConcept> {
  const { getCalculatieProducten } = await import('@/services/offerteService')
  const producten = await getCalculatieProducten()
  return bouwCalculatieConcept(input, producten)
}
