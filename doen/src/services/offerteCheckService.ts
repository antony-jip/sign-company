import { supabase } from './supabaseClient'

interface CheckApiAntwoord {
  offerte?: {
    id: string
    updated_at: string
    check_status?: 'open' | 'akkoord' | 'verstuurd' | null
    check_afgehandeld_op?: string | null
  }
  already?: boolean
}

async function roepCheckApi(pad: string, body: Record<string, unknown>): Promise<CheckApiAntwoord> {
  const { data: { session } } = await supabase!.auth.getSession()
  const token = session?.access_token
  const response = await fetch(pad, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const fout = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(fout.error || 'Aanvraag mislukt')
  }
  return await response.json() as CheckApiAntwoord
}

export async function vraagOfferteCheck(offerteId: string, aanUserId: string, notitie?: string): Promise<CheckApiAntwoord> {
  return roepCheckApi('/api/offerte-check-vragen', {
    offerte_id: offerteId,
    aan_user_id: aanUserId,
    notitie: notitie || undefined,
  })
}

export async function rondOfferteCheckAf(offerteId: string, actie: 'akkoord' | 'verstuurd'): Promise<CheckApiAntwoord> {
  return roepCheckApi('/api/offerte-check-reactie', { offerte_id: offerteId, actie })
}
