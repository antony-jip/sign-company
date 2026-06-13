import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── Publieke (browser) client · alleen leesrechten via RLS ──────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let _public: SupabaseClient | null = null

/** Client met anon-key. Veilig voor browser & server-side reads. */
export function supabasePublic(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY ontbreken in env')
  }
  if (!_public) _public = createClient(url, anonKey, { auth: { persistSession: false } })
  return _public
}

// ─── Service-role client · ALLEEN server-side (bypass RLS) ───────────────────
let _admin: SupabaseClient | null = null

/**
 * Client met service-role key. Gebruik UITSLUITEND in API routes / scripts.
 * Mag nooit naar de browser lekken.
 */
export function supabaseAdmin(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL / SERVICE_ROLE_KEY ontbreken in env')
  }
  if (!_admin) _admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  return _admin
}
