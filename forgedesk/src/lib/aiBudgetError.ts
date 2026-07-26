import { toast } from 'sonner'

export class AIBudgetError extends Error {
  code = 'ai_budget_bereikt'
  redirect: string

  constructor(bericht: string, redirect = '/instellingen?tab=daan-ai') {
    super(bericht)
    this.name = 'AIBudgetError'
    this.redirect = redirect
  }
}

interface AIBudgetBody {
  error?: string
  bericht?: string
  redirect?: string
}

export async function detecteerBudgetError(response: Response): Promise<AIBudgetError | null> {
  if (response.status !== 403) return null
  const cloned = response.clone()
  try {
    const body = await cloned.json() as AIBudgetBody
    if (body?.error === 'ai_budget_bereikt') {
      const bericht = body.bericht
        || 'Het gedeelde AI-budget van je organisatie is op voor deze maand.'
      return new AIBudgetError(bericht, body.redirect || '/instellingen?tab=daan-ai')
    }
  } catch {
    // body niet als JSON parsebaar — geen budget-error
  }
  return null
}

export function toonBudgetToast(err: AIBudgetError): void {
  toast.error(err.message, {
    // Niet "credits bijkopen": credits zijn voor de Visualizer en heffen het
    // AI-maandbudget niet op. Wel doorverwijzen naar waar de meter staat.
    action: {
      label: 'Bekijk verbruik',
      onClick: () => {
        window.location.href = err.redirect
      },
    },
    duration: 8000,
  })
}

export async function gooiBijBudgetError(response: Response): Promise<void> {
  const budgetErr = await detecteerBudgetError(response)
  if (budgetErr) {
    toonBudgetToast(budgetErr)
    throw budgetErr
  }
}
