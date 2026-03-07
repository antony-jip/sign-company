import { supabase } from './supabaseClient'

export type RewriteAction =
  | 'beknopt'
  | 'uitgebreid'
  | 'professioneel'
  | 'informeel'
  | 'humor'
  | 'informatief'
  | 'taalcheck'
  | 'vertaal-en'
  | 'vertaal-nl'
  | 'custom'

export interface RewriteResult {
  result: string
}

export async function rewriteText(
  action: RewriteAction,
  text: string,
  customInstruction?: string
): Promise<RewriteResult> {
  const session = await supabase?.auth.getSession()
  const token = session?.data?.session?.access_token
  if (!token) throw new Error('Niet ingelogd')

  const res = await fetch('/api/ai-rewrite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, text, customInstruction }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Onbekende fout' }))
    throw new Error(err.error || err.message || 'AI herschrijven mislukt')
  }

  return res.json()
}
