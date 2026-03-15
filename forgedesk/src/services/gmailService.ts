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

  const { data, error } = await supabase
    .from('user_email_settings')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (error) {
    console.error('authenticateGmail: email settings ophalen mislukt:', error.message)
    return false
  }

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
    // Escape special PostgREST filter characters to prevent filter injection
    const sanitized = query.replace(/[\\%_]/g, c => `\\${c}`)
    q = q.or(`onderwerp.ilike.%${sanitized}%,van.ilike.%${sanitized}%,inhoud.ilike.%${sanitized}%`)
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

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  options?: { cc?: string; html?: string; scheduledAt?: string; attachments?: Array<{ filename: string; content: string; encoding: 'base64' }> }
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
      html: options?.html,
      attachments: options?.attachments,
    }),
  })

  if (!response.ok) {
    const error: { error?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.error || `Email verzenden mislukt: ${response.status}`)
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

  const { data, error } = await supabase
    .from('emails')
    .select('starred')
    .eq('id', messageId)
    .single()

  if (error) {
    console.error('starEmail: email ophalen mislukt:', error.message)
    throw new Error(`Email ophalen mislukt: ${error.message}`)
  }

  if (data) {
    const { error: updateError } = await supabase
      .from('emails')
      .update({ starred: !data.starred })
      .eq('id', messageId)
    if (updateError) {
      console.error('starEmail: update mislukt:', updateError.message)
      throw new Error(`Email update mislukt: ${updateError.message}`)
    }
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

// ============ IMAP EMAIL OPERATIONS ============

export interface IMAPEmailSummary {
  uid: number
  from: string
  fromName: string
  to: string
  subject: string
  date: string
  isRead: boolean
  hasAttachments: boolean
  // CRM koppeling (wordt in frontend ingevuld)
  clientId?: string
  clientName?: string
}

export interface IMAPEmailDetail extends IMAPEmailSummary {
  cc?: string
  bodyHtml: string
  bodyText: string
  attachments: { filename: string; contentType: string; size: number }[]
  messageId?: string
  inReplyTo?: string
}

export async function testEmailConnection(
  gmail_address: string,
  app_password: string,
  options?: {
    smtp_host?: string
    smtp_port?: number
    imap_host?: string
    imap_port?: number
  }
): Promise<{ imap_ok: boolean; smtp_ok: boolean; error?: string }> {
  const token = await getAuthToken()
  const response = await fetch('/api/test-email-connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gmail_address,
      app_password,
      smtp_host: options?.smtp_host || 'smtp.gmail.com',
      smtp_port: options?.smtp_port || 587,
      imap_host: options?.imap_host || 'imap.gmail.com',
      imap_port: options?.imap_port || 993,
    }),
  })

  if (!response.ok) {
    return { imap_ok: false, smtp_ok: false, error: `Server fout: ${response.status}` }
  }

  return response.json()
}

// Email credentials worden nu server-side opgehaald via getEmailCredentials() in _shared.ts
// Geen wachtwoorden meer in localStorage

export async function fetchEmailsFromIMAP(
  folder?: string,
  limit?: number,
  offset?: number,
  userId?: string
): Promise<{ emails: IMAPEmailSummary[]; total: number; synced?: number }> {
  const token = await getAuthToken()

  const response = await fetch('/api/fetch-emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      folder: folder || 'INBOX',
      limit: limit || 50,
      offset: offset || 0,
    }),
  })

  if (!response.ok) {
    const error: { error?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.error || `Emails ophalen mislukt: ${response.status}`)
  }

  return response.json()
}

export async function readEmailFromIMAP(
  uid: number,
  folder?: string,
  userId?: string
): Promise<IMAPEmailDetail> {
  const token = await getAuthToken()

  const response = await fetch('/api/read-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      uid,
      folder: folder || 'INBOX',
    }),
  })

  if (!response.ok) {
    const error: { error?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.error || `Email ophalen mislukt: ${response.status}`)
  }

  return response.json()
}

// ============ EMAIL SETTINGS ============

export async function getEmailSettings(): Promise<{
  gmail_address: string
  smtp_host: string
  smtp_port: number
  imap_host: string
  imap_port: number
  is_verified: boolean
} | null> {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return null

  const { data, error } = await supabase
    .from('user_email_settings')
    .select('gmail_address, smtp_host, smtp_port, imap_host, imap_port, is_verified')
    .eq('user_id', session.user.id)
    .single()

  if (error) {
    // PGRST116 = no rows found — dat is een normaal geval
    if (error.code === 'PGRST116') return null
    console.error('getEmailSettings: ophalen mislukt:', error.message)
    throw new Error(`Email instellingen ophalen mislukt: ${error.message}`)
  }

  return data
}

export async function saveEmailSettings(settings: {
  gmail_address: string
  app_password: string
  smtp_host?: string
  smtp_port?: number
  imap_host?: string
  imap_port?: number
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
    const error: { error?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.error || 'Email instellingen opslaan mislukt')
  }
}
