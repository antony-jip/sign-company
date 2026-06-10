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

interface SendEmailOptions {
  cc?: string
  bcc?: string
  html?: string
  scheduledAt?: string
  attachments?: Array<{ filename: string; content?: string; encoding?: 'base64'; storagePath?: string; bucket?: string; cleanupAfter?: boolean }>
  // Sales Inbox v1
  wacht_op_reactie?: boolean
  // Threading
  in_reply_to?: string
  thread_id?: string
}

/**
 * Outbox: zet een mail die niet verzonden kon worden in ingeplande_berichten
 * (bron 'outbox'); de verzend-cron probeert het automatisch opnieuw met
 * backoff. Geeft false terug als ook het enqueuen mislukt.
 */
async function enqueueOutbox(to: string, subject: string, body: string, options?: SendEmailOptions): Promise<boolean> {
  if (!supabase) return false
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return false

    // Server kan de mail WEL verstuurd hebben terwijl alleen de response
    // wegviel — send-email persisteert verzonden mails in `emails`, dus
    // check de verzonden-map van de laatste minuten voordat we enqueuen.
    const { data: netVerzonden } = await supabase
      .from('emails')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('map', 'verzonden')
      .eq('onderwerp', subject)
      .gte('datum', new Date(Date.now() - 5 * 60_000).toISOString())
      .limit(1)
    if (netVerzonden && netVerzonden.length > 0) return false

    // Dedup: nooit twee outbox-rijen voor dezelfde mail (dubbele clicks,
    // races, herhaalde fouten op rij).
    const { data: bestaand } = await supabase
      .from('ingeplande_berichten')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('ontvanger', to)
      .eq('onderwerp', subject)
      .eq('bron', 'outbox')
      .in('status', ['wachtend', 'verwerken'])
      .limit(1)
    if (bestaand && bestaand.length > 0) return true

    const { error } = await supabase.from('ingeplande_berichten').insert({
      user_id: session.user.id,
      ontvanger: to,
      cc: options?.cc || null,
      bcc: options?.bcc || null,
      onderwerp: subject,
      body,
      html: options?.html || null,
      bijlagen: options?.attachments ?? [],
      // Geplande mails behouden hun tijdstip; directe mails gaan z.s.m. opnieuw
      scheduled_at: options?.scheduledAt || new Date(Date.now() + 60_000).toISOString(),
      status: 'wachtend',
      bron: 'outbox',
      in_reply_to: options?.in_reply_to || null,
      thread_id: options?.thread_id || null,
      wacht_op_reactie: options?.wacht_op_reactie ?? false,
    })
    return !error
  } catch {
    return false
  }
}

/** Statussen waarbij opnieuw proberen zin heeft (alles behalve client-fouten). */
function isQueueableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  options?: SendEmailOptions
): Promise<{ success: boolean; message: string }> {
  const token = await getAuthToken()

  let response: Response
  try {
    response = await fetch('/api/send-email', {
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
        attachments: options?.attachments,
        scheduledAt: options?.scheduledAt,
        wacht_op_reactie: options?.wacht_op_reactie,
        in_reply_to: options?.in_reply_to,
        thread_id: options?.thread_id,
      }),
    })
  } catch (netErr) {
    // Netwerk weg — in de outbox, cron levert af zodra het weer kan
    if (await enqueueOutbox(to, subject, body, options)) {
      throw new Error('Geen verbinding — de mail staat in de outbox en wordt automatisch opnieuw verstuurd')
    }
    throw netErr
  }

  if (!response.ok) {
    const error: { error?: string } = await response.json().catch(() => ({}))
    if (isQueueableStatus(response.status) && await enqueueOutbox(to, subject, body, options)) {
      throw new Error('Verzenden mislukt — de mail staat in de outbox en wordt automatisch opnieuw verstuurd')
    }
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
  // `content` (base64) is optioneel: aanwezig voor image-bijlagen onder 5 MB
  // die de server inline meeleverde voor de cold-pad (eerste open).
  // `storage_url` is een signed URL naar Supabase Storage: aanwezig voor
  // bijlagen die in de persistent cache zitten (sprint 3). Voorkeur:
  // storage_url > content > tweede roundtrip.
  attachments: { filename: string; contentType: string; size: number; content?: string; storage_url?: string }[]
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
    const errBody: { error?: string } = await response.json().catch(() => ({}))
    return { imap_ok: false, smtp_ok: false, error: errBody?.error || `Server fout: ${response.status}` }
  }

  return response.json()
}

// Email credentials worden nu server-side opgehaald via getEmailCredentials() in _shared.ts
// Geen wachtwoorden meer in localStorage

/**
 * Sync email instellingen vanuit Supabase naar sessionStorage.
 * Wordt aangeroepen bij app start zodat de settings pagina altijd gevuld is.
 */
export async function syncEmailSettingsFromServer(): Promise<boolean> {
  try {
    const settings = await loadEmailSettingsFromDb()
    if (settings?.gmail_address) {
      sessionStorage.setItem('doen_email_settings', JSON.stringify(settings))
      return true
    }
  } catch (err) { /* ignore */ }
  return false
}

export async function fetchEmailsFromIMAP(
  folder?: string,
  limit?: number,
  offset?: number,
  userId?: string
): Promise<{ emails: IMAPEmailSummary[]; total: number; synced?: number; incremental?: boolean; remaining?: number; errors?: string[] }> {
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
  folder?: string
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

export interface EmailAttachmentDownload {
  filename: string
  contentType: string
  size: number
  // Ofwel `content` (base64, IMAP-pad) ofwel `storage_url` (signed URL,
  // cache-hit). Caller geeft voorkeur aan storage_url indien aanwezig.
  content?: string
  storage_url?: string
}

export async function downloadEmailAttachment(
  uid: number,
  folder: string,
  filename: string,
): Promise<EmailAttachmentDownload> {
  const token = await getAuthToken()

  const response = await fetch('/api/email-attachment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ uid, folder, filename }),
  })

  if (!response.ok) {
    const error: { error?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.error || `Bijlage ophalen mislukt: ${response.status}`)
  }

  return response.json()
}

export async function downloadAllEmailAttachments(
  uid: number,
  folder: string,
): Promise<EmailAttachmentDownload[]> {
  const token = await getAuthToken()

  const response = await fetch('/api/email-attachment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ uid, folder, all: true }),
  })

  if (!response.ok) {
    const error: { error?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.error || `Bijlagen ophalen mislukt: ${response.status}`)
  }

  const data: { attachments?: EmailAttachmentDownload[] } = await response.json()
  return data.attachments || []
}

// ============ EMAIL SETTINGS (via API endpoint — server-side encryptie) ============

export interface EmailSettingsData {
  gmail_address: string
  app_password: string
  smtp_host: string
  smtp_port: number
  imap_host: string
  imap_port: number
  is_verified?: boolean
}

export async function loadEmailSettingsFromDb(): Promise<EmailSettingsData | null> {
  try {
    const token = await getAuthToken()
    const response = await fetch('/api/email-settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      if (response.status === 404) return null
      return null
    }

    const data = await response.json()
    if (!data?.gmail_address) return null

    return {
      gmail_address: data.gmail_address,
      app_password: data.app_password || '',
      smtp_host: data.smtp_host || 'smtp.gmail.com',
      smtp_port: data.smtp_port || 587,
      imap_host: data.imap_host || 'imap.gmail.com',
      imap_port: data.imap_port || 993,
      is_verified: data.is_verified,
    }
  } catch (err) {
    console.error('loadEmailSettingsFromDb:', err)
    return null
  }
}

export async function saveEmailSettingsToDb(settings: EmailSettingsData): Promise<void> {
  const token = await getAuthToken()

  const response = await fetch('/api/email-settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gmail_address: settings.gmail_address,
      app_password: settings.app_password,
      smtp_host: settings.smtp_host || 'smtp.gmail.com',
      smtp_port: settings.smtp_port || 587,
      imap_host: settings.imap_host || 'imap.gmail.com',
      imap_port: settings.imap_port || 993,
    }),
  })

  if (!response.ok) {
    const error: { error?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.error || `Opslaan mislukt: ${response.status}`)
  }
}

export async function deleteEmailSettingsFromDb(): Promise<void> {
  const token = await getAuthToken()

  await fetch('/api/email-settings', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
}

// Wis de gecachte emails van de huidige user. Nodig wanneer een gebruiker
// van mailbox wisselt: anders blijven oude rijen onder hetzelfde user_id staan
// (cache key in api/fetch-emails.ts is user_id + message_id, niet mailbox-adres).
export async function clearEmailCache(): Promise<void> {
  if (!supabase) return
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return
  await supabase.from('emails').delete().eq('user_id', session.user.id)
}

// Legacy — keep for backward compat
export async function getEmailSettings(): Promise<{
  gmail_address: string
  smtp_host: string
  smtp_port: number
  imap_host: string
  imap_port: number
  is_verified: boolean
} | null> {
  const settings = await loadEmailSettingsFromDb()
  if (!settings) return null
  return {
    gmail_address: settings.gmail_address,
    smtp_host: settings.smtp_host,
    smtp_port: settings.smtp_port,
    imap_host: settings.imap_host,
    imap_port: settings.imap_port,
    is_verified: settings.is_verified || false,
  }
}

// Legacy — keep for backward compat, now routes to direct Supabase
export async function saveEmailSettings(settings: {
  gmail_address: string
  app_password: string
  smtp_host?: string
  smtp_port?: number
  imap_host?: string
  imap_port?: number
}): Promise<void> {
  await saveEmailSettingsToDb({
    gmail_address: settings.gmail_address,
    app_password: settings.app_password,
    smtp_host: settings.smtp_host || 'smtp.gmail.com',
    smtp_port: settings.smtp_port || 587,
    imap_host: settings.imap_host || 'imap.gmail.com',
    imap_port: settings.imap_port || 993,
  })
}
