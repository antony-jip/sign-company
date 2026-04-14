import supabase from './supabaseClient'

export interface FollowUpContext {
  klantnaam: string
  contactpersoon: string
  projectnaam?: string
  offerte_nummer: string
  offerte_titel: string
  bedrag: number
  dagen_open: number
  geldig_tot: string
  dagen_tot_verlopen: number
  aantal_eerdere_followups: number
  status: string
  bedrijfsnaam_afzender: string
  afzender_naam: string
}

export interface FollowUpEmailResult {
  onderwerp: string
  body: string
}

async function getAuthToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Niet ingelogd.')
  }
  return session.access_token
}

export async function generateFollowUpEmail(context: FollowUpContext): Promise<FollowUpEmailResult> {
  const token = await getAuthToken()

  const response = await fetch('/api/ai-followup-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ context }),
  })

  if (!response.ok) {
    const error: { error?: string; message?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.message || error?.error || `AI follow-up fout: ${response.status}`)
  }

  return response.json()
}

export async function sendFollowUpEmail(params: {
  to: string
  subject: string
  body: string
  html?: string
  attachments?: Array<{ filename: string; content: string; encoding: 'base64' }>
}): Promise<void> {
  const token = await getAuthToken()

  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error: { error?: string; message?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.message || error?.error || `Email verzenden mislukt: ${response.status}`)
  }
}
