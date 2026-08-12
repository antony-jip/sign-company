import { supabase, isSupabaseConfigured } from './supabaseHelpers'
import type { FeatureFlagRij } from '@/lib/featureFlags'

// Eén query voor alle flags. RLS (migratie 200) levert de globale rijen plus
// de rijen van de eigen organisatie; er is dus geen filter nodig en er valt
// niets van een andere organisatie te zien.
//
// Gooit door bij een fout. De aanroeper vangt hem via veiligeFlags() en
// draait verder zonder rijen, zodat een hapering in de database niets
// aan- of uitzet.
export async function haalFeatureFlags(): Promise<FeatureFlagRij[]> {
  // Demo-modus zonder Supabase: geen rijen, dus geen flag staat 'aan' en
  // geen module wordt gedoofd. De app gedraagt zich als vandaag.
  if (!isSupabaseConfigured() || !supabase) return []

  const { data, error } = await supabase
    .from('feature_flags')
    .select('naam, organisatie_id, aan')

  if (error) throw error
  return (data ?? []) as FeatureFlagRij[]
}
