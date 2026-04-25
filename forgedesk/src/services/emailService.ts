import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId,
} from './supabaseHelpers'
import type { Email, InternEmailNotitie } from '@/types'

// ============ EMAIL CACHING ============

export async function cacheEmailsToSupabase(
  _userId: string,
  _emails: unknown[],
  _folder: string
): Promise<void> {
  // email cache tabel bestaat nog niet — no-op
}

export async function getCachedEmails(
  _userId: string,
  _folder: string
): Promise<Email[]> {
  return []
}

// ============ EMAILS ============

export async function getEmails(limit = 200): Promise<Email[]> {
  if (isSupabaseConfigured() && supabase) {
    // List-view columns + body_text (voor de preview snippet in de rij).
    // body_html en inhoud blijven uitgesloten — die zijn groot. body_text wordt
    // direct getrunc'd in JS naar 200 chars zodat de in-memory state niet bloat.
    const { data, error } = await supabase
      .from('emails')
      .select('id,user_id,gmail_id,uid,message_id,van,aan,onderwerp,datum,gelezen,starred,labels,bijlagen,map,from_name,from_address,imap_folder,pinned,snoozed_until,thread_id,attachment_meta,has_attachments,body_text,created_at,updated_at,cached_at')
      .order('datum', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data || []).map(e => ({
      ...e,
      // Truncate body_text naar 200 chars voor de preview snippet
      body_text: e.body_text ? String(e.body_text).slice(0, 200) : null,
      inhoud: '',
      body_html: null,
    }))
  }
  return getLocalData<Email>('emails')
}

export async function searchEmailsFTS(query: string, limit = 50): Promise<Email[]> {
  if (!query.trim() || !isSupabaseConfigured() || !supabase) return []
  const tsQuery = query.trim().split(/\s+/).map(w => `${w}:*`).join(' & ')
  const { data, error } = await supabase
    .from('emails')
    .select('id,user_id,gmail_id,uid,message_id,van,aan,onderwerp,datum,gelezen,starred,labels,bijlagen,map,from_name,from_address,imap_folder,pinned,snoozed_until,thread_id,attachment_meta,has_attachments,body_text,created_at,updated_at,cached_at')
    .textSearch('fts', tsQuery)
    .order('datum', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).map(e => ({
    ...e,
    body_text: e.body_text ? String(e.body_text).slice(0, 200) : null,
    inhoud: '',
    body_html: null,
  }))
}

export async function getEmail(id: string): Promise<Email | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const emails = getLocalData<Email>('emails')
  return emails.find((e) => e.id === id) || null
}

/** Fetch only the body columns for a single email (fast, lightweight) */
export async function getEmailBody(id: string): Promise<{ body_html: string | null; body_text: string | null; inhoud: string; attachment_meta?: unknown[] | null } | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .select('body_html, body_text, inhoud, attachment_meta')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const emails = getLocalData<Email>('emails')
  const found = emails.find((e) => e.id === id)
  return found ? { body_html: (found as any).body_html || null, body_text: (found as any).body_text || null, inhoud: found.inhoud || '', attachment_meta: found.attachment_meta } : null
}

/** Haal alle emails op die tot dezelfde thread behoren, chronologisch gesorteerd */
export async function getThread(threadId: string): Promise<Email[]> {
  if (!threadId) return []
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('thread_id', threadId)
      .order('datum', { ascending: true })
    if (error) throw error
    return (data || []) as Email[]
  }
  const emails = getLocalData<Email>('emails')
  return emails
    .filter((e) => e.thread_id === threadId)
    .sort((a, b) => Date.parse(a.datum) - Date.parse(b.datum))
}

export async function createEmail(email: Omit<Email, 'id' | 'created_at'>): Promise<Email> {
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase
      .from('emails')
      .insert({ ...await withUserId(email), organisatie_id: _orgId })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const emails = getLocalData<Email>('emails')
  const newEmail: Email = {
    ...email,
    id: generateId(),
    created_at: now(),
  } as Email
  emails.push(newEmail)
  setLocalData('emails', emails)
  return newEmail
}

export async function updateEmail(id: string, updates: Partial<Email>): Promise<Email> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const emails = getLocalData<Email>('emails')
  const index = emails.findIndex((e) => e.id === id)
  if (index === -1) throw new Error('Email niet gevonden')
  emails[index] = { ...emails[index], ...updates }
  setLocalData('emails', emails)
  return emails[index]
}

export async function deleteEmail(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('emails').delete().eq('id', id)
    if (error) throw error
    return
  }
  const emails = getLocalData<Email>('emails')
  setLocalData('emails', emails.filter((e) => e.id !== id))
}

// ============ GEDEELDE INBOX (Tier 3 Feature 3) ============

export async function getGedeeldeEmails(limit = 200): Promise<Email[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .select('id, user_id, from_address, from_name, van, aan, to_addresses, onderwerp, datum, gelezen, bijlagen, has_attachments, inbox_type, toegewezen_aan, created_at')
      .eq('inbox_type', 'gedeeld')
      .order('datum', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data || []) as unknown as Email[]
  }
  return getLocalData<Email>('emails').filter((e) => e.inbox_type === 'gedeeld')
}

export async function getGedeeldeEmailsByToewijzing(medewerkerId: string): Promise<Email[]> {
  assertId(medewerkerId, 'medewerker_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('emails').select('*').eq('inbox_type', 'gedeeld').eq('toegewezen_aan', medewerkerId).order('datum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Email>('emails').filter((e) => e.inbox_type === 'gedeeld' && e.toegewezen_aan === medewerkerId)
}

export async function updateEmailToewijzing(emailId: string, medewerkerId: string): Promise<Email> {
  assertId(emailId, 'email_id')
  return updateEmail(emailId, { toegewezen_aan: medewerkerId })
}

export async function updateEmailTicketStatus(emailId: string, ticketStatus: Email['ticket_status']): Promise<Email> {
  assertId(emailId, 'email_id')
  return updateEmail(emailId, { ticket_status: ticketStatus })
}

export async function addInterneNotitie(emailId: string, notitie: InternEmailNotitie): Promise<Email> {
  assertId(emailId, 'email_id')
  const email = await getEmail(emailId)
  if (!email) throw new Error('Email niet gevonden')
  const huidigeNotities = email.interne_notities || []
  return updateEmail(emailId, { interne_notities: [...huidigeNotities, notitie] })
}

// ============ SALES INBOX v1 ============
// UX-laag op outbound mail. Queries draaien onder anon-key; RLS scope't
// automatisch op auth.uid() = user_id. Server-side (auto-match in
// fetch-emails) MOET zelf user_id-filteren want service_role omzeilt RLS.

const SALES_INBOX_SELECT = 'id,user_id,gmail_id,uid,message_id,van,aan,onderwerp,datum,gelezen,starred,labels,bijlagen,map,from_name,from_address,imap_folder,pinned,snoozed_until,thread_id,attachment_meta,has_attachments,body_text,created_at,updated_at,cached_at,wacht_op_reactie,beantwoord,beantwoord_door_email_id,vervangen_door_email_id,wacht_op_reactie_uitgezet_op,niet_match_email_ids'

function extractBareEmail(address: string): string {
  const trimmed = address.trim()
  const match = trimmed.match(/<([^>]+)>/)
  return (match?.[1] || trimmed).toLowerCase()
}

/** Compose-hint: vind de meest recente openstaande wacht-mail naar dit adres. */
export async function getWachtendeEmailNaarAdres(toAddress: string): Promise<Email | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const bareEmail = extractBareEmail(toAddress)
  if (!bareEmail) return null
  const { data, error } = await supabase
    .from('emails')
    .select('id, datum, aan, onderwerp')
    .eq('wacht_op_reactie', true)
    .eq('beantwoord', false)
    .ilike('aan', `%${bareEmail}%`)
    .order('datum', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as Email | null
}

/** Sales Inbox "Wacht op reactie" tab. */
export async function getSalesInboxWachtend(limit = 100): Promise<Email[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('emails')
    .select(SALES_INBOX_SELECT)
    .eq('wacht_op_reactie', true)
    .eq('beantwoord', false)
    .order('datum', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as unknown as Email[]
}

/** Sales Inbox "Beantwoord" tab. UI haalt details van de triggerende inkomende mail
 *  zelf op via beantwoord_door_email_id — geen self-join hier voor v1. */
export async function getSalesInboxBeantwoord(limit = 100): Promise<Email[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('emails')
    .select(SALES_INBOX_SELECT)
    .eq('wacht_op_reactie', true)
    .eq('beantwoord', true)
    .order('datum', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as unknown as Email[]
}

/** Per-rij actie in Wacht-tab: gebruiker markeert handmatig als beantwoord
 *  (false-negative correctie). Geen beantwoord_door_email_id want geen
 *  specifieke inkomende mail bekend. */
export async function markeerHandmatigBeantwoord(emailId: string): Promise<void> {
  assertId(emailId, 'email_id')
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { error } = await supabase
    .from('emails')
    .update({ beantwoord: true })
    .eq('id', emailId)
  if (error) throw error
}

/** Per-rij actie in Wacht-tab: "Niet meer wachten" — wis flag, registreer datum. */
export async function wisWachtFlag(emailId: string): Promise<void> {
  assertId(emailId, 'email_id')
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { error } = await supabase
    .from('emails')
    .update({
      wacht_op_reactie: false,
      wacht_op_reactie_uitgezet_op: new Date().toISOString(),
    })
    .eq('id', emailId)
  if (error) throw error
}

/** Per-rij actie in Beantwoord-tab: "Dit was niet de reactie" — outbound terug
 *  naar Wacht en de inkomende mail uitsluiten van toekomstige auto-match. */
export async function terugZettenNaarWacht(outboundId: string, inkomendeMailId: string): Promise<void> {
  assertId(outboundId, 'outbound_id')
  assertId(inkomendeMailId, 'inkomende_mail_id')
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')

  const { data: huidig, error: leesError } = await supabase
    .from('emails')
    .select('niet_match_email_ids')
    .eq('id', outboundId)
    .maybeSingle()
  if (leesError) throw leesError

  const huidigeIds = (huidig?.niet_match_email_ids || []) as string[]
  const nieuweIds = huidigeIds.includes(inkomendeMailId)
    ? huidigeIds
    : [...huidigeIds, inkomendeMailId]

  const { error } = await supabase
    .from('emails')
    .update({
      beantwoord: false,
      beantwoord_door_email_id: null,
      niet_match_email_ids: nieuweIds,
    })
    .eq('id', outboundId)
  if (error) throw error
}

// ── Email auto-opvolging ──
export async function createEmailOpvolging(opvolging: Omit<import('@/types').EmailOpvolging, 'id' | 'created_at'>): Promise<import('@/types').EmailOpvolging> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { data, error } = await supabase
    .from('email_opvolgingen')
    .insert(opvolging)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Ingeplande berichten ──
export async function getIngeplandeBerichten(): Promise<import('@/types').IngeplandBericht[]> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { data, error } = await supabase
    .from('ingeplande_berichten')
    .select('*')
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return (data || []) as import('@/types').IngeplandBericht[]
}

export async function cancelIngeplandBericht(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { error } = await supabase
    .from('ingeplande_berichten')
    .update({ status: 'geannuleerd' })
    .eq('id', id)
    .eq('status', 'wachtend')
  if (error) throw error
}

// ============ EMAIL TEMPLATES ============

export interface EmailTemplate {
  id: string
  organisatie_id: string
  naam: string
  onderwerp: string
  body: string
  created_at: string
  updated_at: string
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const orgId = await getOrgId()
  if (!orgId) return []
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('organisatie_id', orgId)
    .order('naam')
  if (error) throw error
  return data || []
}

export async function createEmailTemplate(template: { naam: string; onderwerp: string; body: string }): Promise<EmailTemplate> {
  if (!supabase) throw new Error('Niet geconfigureerd')
  const orgId = await getOrgId()
  if (!orgId) throw new Error('Geen organisatie gevonden')
  const { data, error } = await supabase
    .from('email_templates')
    .insert({ ...template, organisatie_id: orgId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmailTemplate(id: string, updates: { naam?: string; onderwerp?: string; body?: string }): Promise<void> {
  if (!supabase) throw new Error('Niet geconfigureerd')
  const { error } = await supabase
    .from('email_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  if (!supabase) throw new Error('Niet geconfigureerd')
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)
  if (error) throw error
}
