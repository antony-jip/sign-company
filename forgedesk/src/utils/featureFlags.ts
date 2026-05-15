import { supabase, isSupabaseConfigured } from '@/services/supabaseHelpers'

/**
 * In-memory cache met TTL voor feature-flag-lookups per organisatie.
 * 60s is een redelijke balans: snelle UI-renders zonder DB-roundtrip,
 * maar nieuwe flag-waardes verschijnen binnen een minuut zonder reload.
 * Caller-side: bij toggle via de UI moet ook `invalidateFlagCache(orgId)`
 * worden aangeroepen zodat de volgende lees direct de nieuwe waarde
 * ophaalt; anders blijft de oude waarde tot TTL-expiry.
 */
const CACHE_TTL_MS = 60 * 1000
const cache = new Map<string, { value: boolean; expiresAt: number }>()

/**
 * Leest `app_settings.doen_communicatie_tab_enabled` voor de gegeven org.
 * Default false bij onbereikbare DB of ontbrekende rij; de feature blijft
 * dan uit en de UI valt terug op de oude tabs (veiligheidsnet tijdens
 * FESPA-rollout, zie plan-fase 4).
 */
export async function isCommunicatieTabEnabled(orgId: string): Promise<boolean> {
  const cached = cache.get(orgId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  if (!isSupabaseConfigured() || !supabase) return false

  const { data, error } = await supabase
    .from('app_settings')
    .select('doen_communicatie_tab_enabled')
    .eq('organisatie_id', orgId)
    .maybeSingle()

  const value = !error && data?.doen_communicatie_tab_enabled === true
  cache.set(orgId, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}

/**
 * Verwijder cached waarde zodat de volgende lookup vers uit DB komt.
 * Aan te roepen direct na een toggle in de Communicatie-instellingen.
 */
export function invalidateFlagCache(orgId?: string): void {
  if (orgId) {
    cache.delete(orgId)
  } else {
    cache.clear()
  }
}
