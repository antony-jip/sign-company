import supabase, { isSupabaseConfigured } from './supabaseClient'

/**
 * Inline schrijfsuggesties voor het mailvenster. Alles hier faalt stil: een
 * suggestie die er niet komt mag nooit een melding of een fout opleveren
 * terwijl iemand zit te typen.
 */

export interface SuggestieContext {
  /** Tekst tot aan de cursor; de server knipt zelf op de laatste 800 tekens. */
  voor: string
  onderwerp?: string
  ontvanger?: string
  replyTekst?: string
  schrijfstijl?: string
}

async function authHeaders(): Promise<Record<string, string> | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  }
}

export async function haalSuggestie(context: SuggestieContext, signal: AbortSignal): Promise<string> {
  const headers = await authHeaders()
  if (!headers) return ''
  try {
    const res = await fetch('/api/ai-suggestie', {
      method: 'POST',
      headers,
      body: JSON.stringify(context),
      signal,
    })
    if (!res.ok) return ''
    const data = await res.json() as { suggestie?: string }
    return typeof data.suggestie === 'string' ? data.suggestie : ''
  } catch {
    // Afgebroken verzoek of netwerkfout: gewoon geen suggestie.
    return ''
  }
}

/**
 * Meldt dat een suggestie overgenomen is. Dat is de formulering die de
 * gebruiker zelf gekozen zou hebben, dus het beste voer voor het geheugen
 * van Daan. Fire-and-forget.
 */
export function meldGeaccepteerd(tekst: string, context: { voor: string; onderwerp?: string }): void {
  void (async () => {
    const headers = await authHeaders()
    if (!headers) return
    try {
      await fetch('/api/ai-suggestie', {
        method: 'POST',
        headers,
        body: JSON.stringify({ geaccepteerd: tekst, voor: context.voor, onderwerp: context.onderwerp }),
        keepalive: true,
      })
    } catch {
      // Niet-kritiek.
    }
  })()
}
