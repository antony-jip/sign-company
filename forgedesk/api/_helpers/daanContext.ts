import type { SupabaseClient } from '@supabase/supabase-js'

export interface DaanContext {
  bedrijfscontext: string
  schrijfstijl: string
  hasContext: boolean
}

const TIMEOUT_MS = 3000

const LEGE_CONTEXT: DaanContext = {
  bedrijfscontext: '',
  schrijfstijl: '',
  hasContext: false,
}

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), TIMEOUT_MS)),
  ])
}

export async function buildDaanContext(
  supabase: SupabaseClient,
  userId: string
): Promise<DaanContext> {
  if (!userId) return LEGE_CONTEXT

  return withTimeout(loadContext(supabase, userId), LEGE_CONTEXT)
}

async function loadContext(supabase: SupabaseClient, userId: string): Promise<DaanContext> {
  let bedrijfscontext = ''
  let schrijfstijl = ''

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()

  const orgId = (profile?.organisatie_id as string | null) ?? null

  if (orgId) {
    const { data } = await supabase
      .from('app_settings')
      .select('forgie_bedrijfscontext, ai_tone_of_voice')
      .eq('organisatie_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    bedrijfscontext = (data?.forgie_bedrijfscontext as string | null) || ''
    schrijfstijl = (data?.ai_tone_of_voice as string | null) || ''
  }

  if (!bedrijfscontext || !schrijfstijl) {
    const { data } = await supabase
      .from('app_settings')
      .select('forgie_bedrijfscontext, ai_tone_of_voice')
      .eq('user_id', userId)
      .maybeSingle()
    if (!bedrijfscontext) bedrijfscontext = (data?.forgie_bedrijfscontext as string | null) || ''
    if (!schrijfstijl) schrijfstijl = (data?.ai_tone_of_voice as string | null) || ''
  }

  return {
    bedrijfscontext,
    schrijfstijl,
    hasContext: !!(bedrijfscontext || schrijfstijl),
  }
}
