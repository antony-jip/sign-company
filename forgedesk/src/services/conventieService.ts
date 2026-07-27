import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'

// Vaste bedrijfsregels voor de AI-laag (ai_conventies, migratie 164).
// Kort en imperatief; actieve regels gaan woordelijk mee in elke prompt,
// dus de cap beschermt het promptbudget. RLS doet de organisatie-scope.

export const MAX_ACTIEVE_CONVENTIES = 25

export interface Conventie {
  id: string
  categorie: 'verkoop' | 'communicatie' | 'facturatie' | 'uitvoering' | 'algemeen'
  inhoud: string
  actief: boolean
  volgorde: number
  created_at: string
}

export async function getConventies(): Promise<Conventie[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('ai_conventies')
    .select('id, categorie, inhoud, actief, volgorde, created_at')
    .order('volgorde', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return []
  return (data ?? []) as Conventie[]
}

export async function createConventie(inhoud: string, categorie: Conventie['categorie'] = 'algemeen'): Promise<Conventie | null> {
  const schoon = inhoud.trim().slice(0, 300)
  if (!schoon || !isSupabaseConfigured() || !supabase) return null
  const orgId = await getOrgId()
  if (!orgId) return null
  const { data, error } = await supabase
    .from('ai_conventies')
    .insert({ organisatie_id: orgId, categorie, inhoud: schoon, bron: 'handmatig' })
    .select('id, categorie, inhoud, actief, volgorde, created_at')
    .single()
  if (error) return null
  return data as Conventie
}

export async function updateConventie(id: string, updates: Partial<Pick<Conventie, 'inhoud' | 'actief' | 'categorie' | 'volgorde'>>): Promise<boolean> {
  if (!id || !isSupabaseConfigured() || !supabase) return false
  const schoon = { ...updates }
  if (typeof schoon.inhoud === 'string') schoon.inhoud = schoon.inhoud.trim().slice(0, 300)
  const { error } = await supabase
    .from('ai_conventies')
    .update({ ...schoon, updated_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

export async function deleteConventie(id: string): Promise<boolean> {
  if (!id || !isSupabaseConfigured() || !supabase) return false
  const { error } = await supabase.from('ai_conventies').delete().eq('id', id)
  return !error
}
