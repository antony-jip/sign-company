import supabase, { isSupabaseConfigured } from './supabaseClient'
import type { Email } from '@/types'

// ============ CONFIGURATION CHECK ============

export function isGmailConfigured(): boolean {
  return isSupabaseConfigured()
}

// ============ AUTH HELPER ============

async function getAuthToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Niet ingelogd. Log opnieuw in.')
  }
  return session.access_token
}

// ============ AUTHENTICATION ============

export async function authenticateGmail(): Promise<boolean> {
  // Authentication is now handled via Supabase auth + user_email_settings
  if (!supabase) return false
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return false

  const { data } = await supabase
    .from('user_email_settings')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  return !!data
}

export function isAuthenticated(): boolean {
  if (!supabase) return false
  return isSupabaseConfigured()
}

export function signOutGmail(): void {
  // No-op: email settings persist. User can remove them in settings.
}

// ============ EMAIL OPERATIONS ============

export async function fetchEmails(
  query?: string,
  maxResults: number = 20
): Promise<Email[]> {
  if (!supabase) return []

  let q = supabase
    .from('emails')
    .select('*')
    .order('datum', { ascending: false })
    .limit(maxResults)

  if (query) {
    q = q.or(`onderwerp.ilike.%${query}%,van.ilike.%${query}%,inhoud.ilike.%${query}%`)
  }

  const { data, error } = await q
  if (error) throw new Error(`Fout bij ophalen van emails: ${error.message}`)
  return data || []
}

export async function getEmailDetail(messageId: string): Promise<Email | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('emails')
    .select('*')
    .eq('id', messageId)
    .single()

  if (error) throw new Error(`Fout bij ophalen van email: ${error.message}`)
  return data
}

export interface EmailAttachment {
  filename: string
  content: string // base64 encoded
  contentType?: string
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  options?: { cc?: string; bcc?: string; html?: string; scheduledAt?: string; attachments?: EmailAttachment[] }
): Promise<{ success: boolean; message: string }> {
  const token = await getAuthToken()

  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      to,
      subject,
      body,
      cc: options?.cc,
      bcc: options?.bcc,
      html: options?.html,
      scheduledAt: options?.scheduledAt,
      attachments: options?.attachments,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as any)?.error || `Email verzenden mislukt: ${response.status}`)
  }

  return response.json()
}

export async function markAsRead(messageId: string): Promise<void> {
  if (!supabase) return

  await supabase
    .from('emails')
    .update({ gelezen: true })
    .eq('id', messageId)
}

export async function starEmail(messageId: string): Promise<void> {
  if (!supabase) return

  const { data } = await supabase
    .from('emails')
    .select('starred')
    .eq('id', messageId)
    .single()

  if (data) {
    await supabase
      .from('emails')
      .update({ starred: !data.starred })
      .eq('id', messageId)
  }
}

export async function deleteEmail(messageId: string): Promise<void> {
  if (!supabase) return

  await supabase
    .from('emails')
    .update({ map: 'prullenbak' })
    .eq('id', messageId)
}

export async function searchEmails(query: string): Promise<Email[]> {
  return fetchEmails(query, 50)
}

// ============ EMAIL SETTINGS ============

export async function getEmailSettings(): Promise<{
  gmail_address: string
  smtp_host: string
  smtp_port: number
} | null> {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return null

  const { data } = await supabase
    .from('user_email_settings')
    .select('gmail_address, smtp_host, smtp_port')
    .eq('user_id', session.user.id)
    .single()

  return data
}

export async function saveEmailSettings(settings: {
  gmail_address: string
  app_password: string
  smtp_host?: string
  smtp_port?: number
}): Promise<void> {
  const token = await getAuthToken()

  const response = await fetch('/api/email-settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as any)?.error || 'Email instellingen opslaan mislukt')
  }
}
