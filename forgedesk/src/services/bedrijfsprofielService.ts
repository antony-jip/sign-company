import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'
import type { Bedrijfsprofiel } from '@/types'

// Tweede bedrijf om documenten onder uit te geven (tabel bedrijfsprofielen,
// migratie 189). RLS doet de organisatie-scope; de queries hoeven daar niet
// nog eens op te filteren.
//
// De migratie draait handmatig in de Supabase SQL Editor. Zolang dat niet
// gebeurd is bestaat de tabel niet, en dan hoort de app gewoon te werken met
// alleen het eigen bedrijf. Vandaar dat lezen bij een fout een lege lijst
// teruggeeft in plaats van een exception: geen tweede bedrijf betekent dan
// simpelweg geen keuzelijst.

const KOLOMMEN =
  'id, organisatie_id, label, bedrijfsnaam, bedrijfs_adres, bedrijfs_telefoon, bedrijfs_email, ' +
  'bedrijfs_website, kvk_nummer, btw_nummer, iban, logo_url, briefpapier_url, vervolgpapier_url, ' +
  'briefpapier_modus, briefpapier_toon_branding, briefpapier_safe_zone_boven, ' +
  'briefpapier_safe_zone_onder, briefpapier_safe_zone_links, briefpapier_safe_zone_rechts, ' +
  'actief, volgorde, created_at, updated_at'

/** Losse profielen worden per PDF opgehaald; één cache scheelt een ronde per document. */
const cache = new Map<string, Bedrijfsprofiel | null>()

export function leegBedrijfsprofielCache(): void {
  cache.clear()
}

export async function getBedrijfsprofielen(alleenActief = false): Promise<Bedrijfsprofiel[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let query = supabase.from('bedrijfsprofielen').select(KOLOMMEN)
  if (alleenActief) query = query.eq('actief', true)
  const { data, error } = await query
    .order('volgorde', { ascending: true })
    .order('label', { ascending: true })
  if (error) return []
  return (data ?? []) as unknown as Bedrijfsprofiel[]
}

export async function getBedrijfsprofiel(id: string | null | undefined): Promise<Bedrijfsprofiel | null> {
  if (!id || !isSupabaseConfigured() || !supabase) return null
  if (cache.has(id)) return cache.get(id) ?? null
  const { data, error } = await supabase
    .from('bedrijfsprofielen')
    .select(KOLOMMEN)
    .eq('id', id)
    .maybeSingle()
  const profiel = error ? null : ((data as unknown as Bedrijfsprofiel) ?? null)
  cache.set(id, profiel)
  return profiel
}

export type NieuwBedrijfsprofiel = Partial<Bedrijfsprofiel> & { label: string }

/**
 * Aanmaken en bijwerken gooien de fout wél door. Hier staat een gebruiker voor
 * zijn scherm te wachten: dan moet hij horen dat de migratie nog moet draaien,
 * niet dat er "niets" gebeurde.
 */
export async function createBedrijfsprofiel(profiel: NieuwBedrijfsprofiel): Promise<Bedrijfsprofiel> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Geen verbinding met de database')
  const orgId = await getOrgId()
  if (!orgId) throw new Error('Geen organisatie gevonden')
  const { data, error } = await supabase
    .from('bedrijfsprofielen')
    .insert({ ...profiel, organisatie_id: orgId })
    .select(KOLOMMEN)
    .single()
  if (error) throw error
  cache.clear()
  return data as unknown as Bedrijfsprofiel
}

export async function updateBedrijfsprofiel(
  id: string,
  updates: Partial<Bedrijfsprofiel>,
): Promise<Bedrijfsprofiel> {
  if (!id) throw new Error('Geen bedrijfsprofiel opgegeven')
  if (!isSupabaseConfigured() || !supabase) throw new Error('Geen verbinding met de database')
  const { data, error } = await supabase
    .from('bedrijfsprofielen')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(KOLOMMEN)
    .single()
  if (error) throw error
  cache.delete(id)
  return data as unknown as Bedrijfsprofiel
}

export async function deleteBedrijfsprofiel(id: string): Promise<void> {
  if (!id) return
  if (!isSupabaseConfigured() || !supabase) throw new Error('Geen verbinding met de database')
  const { error } = await supabase.from('bedrijfsprofielen').delete().eq('id', id)
  if (error) throw error
  cache.delete(id)
}
