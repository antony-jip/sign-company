import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Module-level Supabase client — hergebruikt per serverless cold start
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export async function isRateLimited(
  ip: string,
  endpoint: string,
  maxCount: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('check_rate_limit', {
    p_key: `${endpoint}:${ip}`,
    p_max_count: maxCount,
    p_window_seconds: windowSeconds,
  })
  return data === true
}
