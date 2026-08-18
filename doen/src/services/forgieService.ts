import supabase, { isSupabaseConfigured } from './supabaseClient'
import { gooiBijBudgetError } from '@/lib/aiBudgetError'

export type ForgieAction =
  | 'summarize'
  | 'summarize-thread'
  | 'translate-nl'
  | 'generate-reply'
  | 'write-email'
  | 'write-lead-email'

export interface ForgieResult {
  result: string
  usage: {
    input_tokens: number
    output_tokens: number
    geschatte_kosten: number
    limiet: number
  }
}

/** Bedragen in euro's. `usage` en `limiet` gaan over de hele organisatie: dat
 *  is wat Daan blokkeert. `eigen_verbruik` is jouw aandeel daarin. */
export interface ForgieUsage {
  usage: number
  limiet: number
  aantal_calls?: number
  eigen_verbruik?: number
  /** False als de gebruiker geen organisatie heeft; dan telt alleen zijn eigen verbruik. */
  gedeeld?: boolean
  /** ISO-datum waarop de teller op nul gaat. */
  reset_op?: string
  /** True als het verbruik niet opgehaald kon worden. Nul tonen zou dan liegen. */
  onbekend?: boolean
}

/** Gelijk aan STANDAARD_MAANDLIMIET_EUR in de api's en migratie 161. */
export const STANDAARD_AI_MAANDLIMIET = 15

async function getAuthToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Niet ingelogd. Log opnieuw in om Daan te gebruiken.')
  }
  return session.access_token
}

export async function callForgie(
  action: ForgieAction,
  text: string,
  context?: string
): Promise<ForgieResult> {
  const token = await getAuthToken()

  const response = await fetch('/api/ai-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, text, context }),
  })

  if (!response.ok) {
    await gooiBijBudgetError(response)
    const error: { error?: string; message?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.message || error?.error || `Daan fout: ${response.status}`)
  }

  return response.json()
}

export async function getForgieUsage(): Promise<ForgieUsage> {
  const token = await getAuthToken()

  const response = await fetch('/api/ai-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'get-usage' }),
  })

  if (!response.ok) {
    // Niet stil op 0 gaan staan: dat leest als "je hebt nog niets verbruikt"
    // terwijl de organisatie er misschien doorheen zit. Bij een verlopen
    // sessie of een niet-geconfigureerde sleutel komen we hier ook.
    return { usage: 0, limiet: STANDAARD_AI_MAANDLIMIET, onbekend: true }
  }

  return response.json()
}
