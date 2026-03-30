import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId,
} from './supabaseHelpers'
import type { BookingSlot, BookingAfspraak } from '@/types'

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ============ BOOKING SLOTS ============

export async function getBookingSlots(): Promise<BookingSlot[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_slots').select('*').order('dag_van_week')
    if (error) throw error
    return data || []
  }
  return getLocalData<BookingSlot>('booking_slots')
}

export async function createBookingSlot(slot: Omit<BookingSlot, 'id' | 'created_at'>): Promise<BookingSlot> {
  const newSlot: BookingSlot = { ...slot, id: generateId(), created_at: now() } as BookingSlot
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('booking_slots').insert({ ...await withUserId(newSlot), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<BookingSlot>('booking_slots')
  items.push(newSlot)
  setLocalData('booking_slots', items)
  return newSlot
}

export async function updateBookingSlot(id: string, updates: Partial<BookingSlot>): Promise<BookingSlot> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_slots').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<BookingSlot>('booking_slots')
  const index = items.findIndex((s) => s.id === id)
  if (index === -1) throw new Error('Booking slot niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('booking_slots', items)
  return items[index]
}

export async function deleteBookingSlot(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('booking_slots').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<BookingSlot>('booking_slots')
  setLocalData('booking_slots', items.filter((s) => s.id !== id))
}

// ============ BOOKING AFSPRAKEN ============

export async function getBookingAfspraken(): Promise<BookingAfspraak[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_afspraken').select('*').order('datum', { ascending: true })
    if (error) throw error
    return data || []
  }
  return getLocalData<BookingAfspraak>('booking_afspraken')
}

export async function getBookingAfspraakByToken(token: string): Promise<BookingAfspraak | null> {
  assertId(token, 'token')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_afspraken').select('*').eq('token', token).maybeSingle()
    if (error) throw error
    return data
  }
  const items = getLocalData<BookingAfspraak>('booking_afspraken')
  return items.find((a) => a.token === token) || null
}

export async function createBookingAfspraak(afspraak: Omit<BookingAfspraak, 'id' | 'token' | 'created_at'>): Promise<BookingAfspraak> {
  const newAfspraak: BookingAfspraak = { ...afspraak, id: generateId(), token: generateToken(), created_at: now() } as BookingAfspraak
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('booking_afspraken').insert({ ...await withUserId(newAfspraak), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<BookingAfspraak>('booking_afspraken')
  items.push(newAfspraak)
  setLocalData('booking_afspraken', items)
  return newAfspraak
}

export async function updateBookingAfspraak(id: string, updates: Partial<BookingAfspraak>): Promise<BookingAfspraak> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('booking_afspraken').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<BookingAfspraak>('booking_afspraken')
  const index = items.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('Booking afspraak niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('booking_afspraken', items)
  return items[index]
}
