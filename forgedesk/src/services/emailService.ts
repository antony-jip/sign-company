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
export async function getEmailBody(id: string): Promise<{ body_html: string | null; body_text: string | null; inhoud: string } | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .select('body_html, body_text, inhoud')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const emails = getLocalData<Email>('emails')
  const found = emails.find((e) => e.id === id)
  return found ? { body_html: (found as any).body_html || null, body_text: (found as any).body_text || null, inhoud: found.inhoud || '' } : null
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
