import type { Project, Tijdregistratie } from '@/types'

/** Rond af op 2 decimalen voor financiële berekeningen */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export interface BudgetStatus {
  budget: number
  verbruikt: number
  percentage: number
  niveau: 'normaal' | 'waarschuwing' | 'overschreden'
}

/**
 * Bereken het budgetverbruik van een project op basis van tijdregistraties.
 * Retourneert budget, verbruikt bedrag, percentage en waarschuwingsniveau.
 */
export function berekenBudgetStatus(
  project: Project,
  tijdregistraties: Tijdregistratie[]
): BudgetStatus {
  const budget = project.budget || 0
  if (budget <= 0) {
    return { budget: 0, verbruikt: 0, percentage: 0, niveau: 'normaal' }
  }

  const urenKosten = tijdregistraties.reduce((sum, t) => {
    const uren = (t.duur_minuten || 0) / 60
    const tarief = t.uurtarief || 0
    return sum + round2(uren * tarief)
  }, 0)

  const verbruikt = round2(urenKosten + (project.besteed || 0))
  const drempel = project.budget_waarschuwing_pct ?? 80
  const percentage = budget > 0 ? round2((verbruikt / budget) * 100) : 0

  let niveau: BudgetStatus['niveau'] = 'normaal'
  if (percentage >= 100) {
    niveau = 'overschreden'
  } else if (percentage >= drempel) {
    niveau = 'waarschuwing'
  }

  return { budget, verbruikt, percentage, niveau }
}
