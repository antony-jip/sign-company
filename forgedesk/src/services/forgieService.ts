import supabase, { isSupabaseConfigured } from './supabaseClient'

export type ForgieAction =
  | 'rewrite-professional'
  | 'rewrite-shorter'
  | 'formalize'
  | 'write-followup'
  | 'summarize'
  | 'translate-en'
  | 'translate-nl'
  | 'generate-reply'

export interface ForgieResult {
  result: string
  usage: {
    input_tokens: number
    output_tokens: number
    geschatte_kosten: number
    limiet: number
  }
}

export interface ForgieUsage {
  usage: number
  limiet: number
}

async function getAuthToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Niet ingelogd. Log opnieuw in om Forgie te gebruiken.')
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
    const error: { error?: string; message?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.message || error?.error || `Forgie fout: ${response.status}`)
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
    return { usage: 0, limiet: 5 }
  }

  return response.json()
}

export async function isForgieConfigured(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
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
      const data: { configured?: boolean } = await response.json().catch(() => ({}))
      if (data?.configured === false) return false
    }
    return true
  } catch {
    return false
  }
}
