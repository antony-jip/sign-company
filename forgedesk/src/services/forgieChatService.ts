import supabase from './supabaseClient'
import { gooiBijBudgetError } from '@/lib/aiBudgetError'

export interface ForgieChatMessage {
  role: 'user' | 'forgie'
  content: string
  created_at?: string
}

export interface ForgieActie {
  type: string
  data: Record<string, unknown>
}

export interface ForgieChatResult {
  answer: string
  usage: number
  limiet: number
  acties?: ForgieActie[]
  /** Feiten die Daan dit gesprek als 'waargenomen' heeft vastgelegd. */
  genoteerd?: string[]
}

export interface ForgieImport {
  bestandsnaam: string
  count: number
  created_at: string
  ids: string[]
}

async function getAuthToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Niet ingelogd. Log opnieuw in om Daan te gebruiken.')
  }
  return session.access_token
}

async function chatRequest(body: Record<string, unknown>): Promise<Response> {
  const token = await getAuthToken()
  return fetch('/api/ai-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
}

export async function sendForgieChat(
  question: string,
  history: ForgieChatMessage[]
): Promise<ForgieChatResult> {
  const response = await chatRequest({ action: 'chat', question, history })
  if (!response.ok) {
    await gooiBijBudgetError(response)
    const error = await response.json().catch(() => ({})) as { message?: string; error?: string }
    throw new Error(error?.message || error?.error || `Daan fout: ${response.status}`)
  }
  return response.json()
}

/**
 * Zelfde antwoord als sendForgieChat, maar de tekst komt binnen terwijl Daan
 * hem schrijft. Tijdens zijn denkfase komt er nog niets: de eerste `opTekst`
 * is dus ook het signaal dat het wachten voorbij is.
 *
 * Valt de server terug op een gewoon JSON-antwoord (oudere deploy), dan wordt
 * dat gewoon afgehandeld — de aanroeper merkt het verschil niet.
 */
export async function sendForgieChatStream(
  question: string,
  history: ForgieChatMessage[],
  opTekst: (deel: string) => void
): Promise<ForgieChatResult> {
  const response = await chatRequest({ action: 'chat', question, history, stream: true })
  if (!response.ok) {
    await gooiBijBudgetError(response)
    const error = await response.json().catch(() => ({})) as { message?: string; error?: string }
    throw new Error(error?.message || error?.error || `Daan fout: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream') || !response.body) {
    return response.json()
  }

  const lezer = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let tekst = ''
  let slot: ForgieChatResult | null = null

  const verwerkRegel = (regel: string) => {
    if (!regel.startsWith('data:')) return
    const ruw = regel.slice(5).trim()
    if (!ruw) return
    let gebeurtenis: { type?: string; deel?: string; melding?: string } & Partial<ForgieChatResult>
    try {
      gebeurtenis = JSON.parse(ruw)
    } catch {
      return
    }
    if (gebeurtenis.type === 'tekst' && gebeurtenis.deel) {
      tekst += gebeurtenis.deel
      opTekst(gebeurtenis.deel)
    } else if (gebeurtenis.type === 'klaar') {
      slot = gebeurtenis as ForgieChatResult
    } else if (gebeurtenis.type === 'fout') {
      throw new Error(gebeurtenis.melding || 'Daan kon het antwoord niet afmaken')
    }
  }

  for (;;) {
    const { done, value } = await lezer.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let grens = buffer.indexOf('\n')
    while (grens !== -1) {
      verwerkRegel(buffer.slice(0, grens).trim())
      buffer = buffer.slice(grens + 1)
      grens = buffer.indexOf('\n')
    }
  }
  if (buffer.trim()) verwerkRegel(buffer.trim())

  // Zonder slotbericht is de verbinding halverwege gesneuveld. De tekst die er
  // staat is echt, dus die houden we; alleen acties en meter ontbreken dan.
  return slot ?? { answer: tekst, usage: 0, limiet: 0 }
}

export async function getForgieHistory(): Promise<ForgieChatMessage[]> {
  const response = await chatRequest({ action: 'get-history' })
  if (!response.ok) return []
  const data = await response.json() as { messages: ForgieChatMessage[] }
  return data.messages || []
}

export async function clearForgieHistory(): Promise<void> {
  await chatRequest({ action: 'clear-history' })
}

export async function importCsvToForgie(
  bestandsnaam: string,
  rows: Array<Record<string, unknown>>
): Promise<{ count: number }> {
  const response = await chatRequest({ action: 'import-csv', bestandsnaam, rows })
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(error?.error || 'Import mislukt')
  }
  return response.json() as Promise<{ count: number }>
}

export async function getForgieImports(): Promise<ForgieImport[]> {
  const response = await chatRequest({ action: 'get-imports' })
  if (!response.ok) return []
  const data = await response.json() as { imports: ForgieImport[] }
  return data.imports || []
}

export async function deleteForgieImport(bestandsnaam: string): Promise<void> {
  await chatRequest({ action: 'delete-import', bestandsnaam })
}
