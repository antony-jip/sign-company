import { getProject, getTakenByProject, createTaak } from './projectService'
import { getProjectUrenBudget } from './projectUrenService'
import { round2 } from '@/utils/budgetUtils'
import type { Taak } from '@/types'

export interface TakenUitBewerkingenResultaat {
  aangemaakt: Taak[]
  overgeslagen: string[]
}

/**
 * Eén taak per bewerking met verkochte uren, zoals Gripps "Taken aanmaken" met
 * samenvoegen op product. Idempotent: een bewerking die al een taak heeft komt
 * in `overgeslagen`, handmatige taken blijven staan.
 */
export async function maakTakenUitBewerkingen(projectId: string, urenVelden: string[]): Promise<TakenUitBewerkingenResultaat> {
  const resultaat: TakenUitBewerkingenResultaat = { aangemaakt: [], overgeslagen: [] }
  const budget = await getProjectUrenBudget(projectId, urenVelden)
  if (budget.soort === 'geen') return resultaat

  const veldenMetUren = urenVelden.filter((veld) => (budget.perVeld[veld]?.uren ?? 0) > 0)
  if (veldenMetUren.length === 0) return resultaat

  const [project, bestaandeTaken] = await Promise.all([getProject(projectId), getTakenByProject(projectId)])
  if (!project) throw new Error('Project niet gevonden')
  const bezetteVelden = new Set(bestaandeTaken.map((t) => t.urenveld?.trim().toLowerCase()).filter((v): v is string => !!v))

  for (const veld of veldenMetUren) {
    if (bezetteVelden.has(veld.trim().toLowerCase())) {
      resultaat.overgeslagen.push(veld)
      continue
    }
    const taak = await createTaak({
      titel: veld,
      beschrijving: '',
      project_id: projectId,
      klant_id: project.klant_id,
      // Bij meerdere meetellende offertes de nieuwste (getOffertesByProject sorteert op created_at desc).
      offerte_id: budget.offerteIds[0],
      urenveld: veld,
      geschatte_tijd: round2(budget.perVeld[veld].uren),
      bestede_tijd: 0,
      status: 'todo',
      prioriteit: 'medium',
      toegewezen_aan: '',
    })
    resultaat.aangemaakt.push(taak)
  }
  return resultaat
}
