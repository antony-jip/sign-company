import { getOffertesByProject, getOfferteItemsVoorOffertes } from './offerteService'
import { berekenOfferteUren, effectieveUrenPerVeld, verplichtePrijsItems } from '@/utils/offerteUren'
import { round2 } from '@/utils/budgetUtils'
import type { Offerte, Tijdregistratie } from '@/types'

/**
 * Budget per bewerking van een project, live berekend uit zijn offertes.
 *
 * Er wordt niets bewaard: editor en project rekenen met dezelfde functie op
 * dezelfde regels, dus er kan geen tweede waarheid ontstaan.
 *
 * Welke offertes tellen (besluit 4 sep 2026): goedgekeurd en gefactureerd zijn
 * vast budget. Is er geen enkele vaste, dan tellen verzonden en bekeken als
 * verwacht budget. Zodra er één vaste is, doen de verwachte niet meer mee,
 * anders blaast een verlopen alternatief het budget op.
 */

const VAST: Offerte['status'][] = ['goedgekeurd', 'gefactureerd']
const VERWACHT: Offerte['status'][] = ['verzonden', 'bekeken']

export type BudgetSoort = 'vast' | 'verwacht' | 'geen'

export interface VeldBudget {
  uren: number
  /** Gewogen gemiddeld verkooptarief per uur over de meetellende offertes. */
  tarief: number
}

export interface ProjectUrenBudget {
  soort: BudgetSoort
  perVeld: Record<string, VeldBudget>
  totaalUren: number
  materiaalKosten: number
  offerteIds: string[]
}

export function kiesMeetellendeOffertes(offertes: Offerte[]): { soort: BudgetSoort; offertes: Offerte[] } {
  const vast = offertes.filter((o) => VAST.includes(o.status))
  if (vast.length > 0) return { soort: 'vast', offertes: vast }
  const verwacht = offertes.filter((o) => VERWACHT.includes(o.status))
  if (verwacht.length > 0) return { soort: 'verwacht', offertes: verwacht }
  return { soort: 'geen', offertes: [] }
}

export async function getProjectUrenBudget(projectId: string, urenVelden: string[]): Promise<ProjectUrenBudget> {
  const alle = await getOffertesByProject(projectId)
  const { soort, offertes } = kiesMeetellendeOffertes(alle)
  const leeg: ProjectUrenBudget = { soort, perVeld: {}, totaalUren: 0, materiaalKosten: 0, offerteIds: [] }
  if (offertes.length === 0) return leeg

  const itemsPerOfferte = await getOfferteItemsVoorOffertes(offertes.map((o) => o.id))

  const urenTotaal: Record<string, number> = {}
  const prijsTotaal: Record<string, number> = {}
  let materiaal = 0
  urenVelden.forEach((v) => { urenTotaal[v] = 0; prijsTotaal[v] = 0 })

  for (const offerte of offertes) {
    const items = verplichtePrijsItems(itemsPerOfferte[offerte.id] || [])
    const uit = berekenOfferteUren(items, urenVelden)
    const effectief = effectieveUrenPerVeld(uit.urenPerVeld, offerte.uren_correctie, urenVelden)
    for (const veld of urenVelden) {
      urenTotaal[veld] += effectief[veld]
      prijsTotaal[veld] += round2(effectief[veld] * (uit.tariefPerVeld[veld] || 0))
    }
    materiaal += uit.materiaalKosten
  }

  const perVeld: Record<string, VeldBudget> = {}
  let totaalUren = 0
  for (const veld of urenVelden) {
    const uren = round2(urenTotaal[veld])
    perVeld[veld] = { uren, tarief: uren > 0 ? round2(prijsTotaal[veld] / uren) : 0 }
    totaalUren += uren
  }

  return { soort, perVeld, totaalUren: round2(totaalUren), materiaalKosten: round2(materiaal), offerteIds: offertes.map((o) => o.id) }
}

export const OVERIG = 'Overig'

/**
 * Geschreven minuten per bewerking. Regels zonder bewerking komen onder Overig;
 * een bewerking die niet (meer) in de instellingen staat houdt zijn eigen naam,
 * zodat hernoemen van een urenveld geen uren kwijtmaakt.
 */
export function geschrevenMinutenPerVeld(registraties: Tijdregistratie[]): Record<string, number> {
  const uit: Record<string, number> = {}
  for (const r of registraties) {
    const veld = r.urenveld && r.urenveld.trim() ? r.urenveld : OVERIG
    uit[veld] = (uit[veld] || 0) + (r.duur_minuten || 0)
  }
  return uit
}
