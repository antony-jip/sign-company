import supabase from './supabaseClient'

export interface ForgieChatMessage {
  role: 'user' | 'forgie'
  content: string
  created_at?: string
}

export interface ForgieChatResult {
  answer: string
  usage: number
  limiet: number
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
    const error = await response.json().catch(() => ({})) as { message?: string; error?: string }
    throw new Error(error?.message || error?.error || `Daan fout: ${response.status}`)
  }
  return response.json()
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
