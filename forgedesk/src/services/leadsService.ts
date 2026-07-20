import { supabase, isSupabaseConfigured, withUserId } from './supabaseHelpers'
import type { Lead, LeadStatus } from '@/types'

// Leads zijn persoonlijk voor de eigenaar (RLS op user_id, zie migratie 153),
// dus geen organisatie_id-filter zoals bij de kerntabellen.

export const LEAD_STATUSSEN: { id: LeadStatus; label: string }[] = [
  { id: 'benaderd', label: 'Benaderd' },
  { id: 'gereageerd', label: 'Gereageerd' },
  { id: 'geen_interesse', label: 'Geen interesse' },
  { id: 'follow-up_later', label: 'Later opvolgen' },
]

export async function getLeads(): Promise<Lead[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('bedrijf', { ascending: true })
  if (error) throw error
  return (data || []) as unknown as Lead[]
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase
    .from('leads')
    .update({ status, status_sinds: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function updateLeadNotities(id: string, notities: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase.from('leads').update({ notities }).eq('id', id)
  if (error) throw error
}

export async function maakLead(lead: Partial<Lead>): Promise<Lead | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const payload = await withUserId({
    naam: '',
    bedrijf: '',
    telefoon: '',
    email: '',
    provincie: '',
    plaats: '',
    status: 'benaderd' as LeadStatus,
    bron: '',
    bron_status: '',
    tags: [],
    contactpersonen: [],
    notities: '',
    import_bron: 'handmatig',
    import_sleutel: `handmatig-${Date.now()}`,
    ...lead,
  })
  const { data, error } = await supabase.from('leads').insert(payload).select().single()
  if (error) throw error
  return data as unknown as Lead
}

/** E.164 zonder spaties/plus, zoals wa.me verwacht. */
export function whatsappLink(telefoon: string): string | null {
  const cijfers = telefoon.replace(/[^\d+]/g, '')
  if (!cijfers) return null
  const genormaliseerd = cijfers.startsWith('+')
    ? cijfers.slice(1)
    : cijfers.startsWith('06')
      ? `31${cijfers.slice(1)}`
      : cijfers
  return genormaliseerd.length >= 8 ? `https://wa.me/${genormaliseerd}` : null
}
