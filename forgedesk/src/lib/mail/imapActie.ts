import { supabase } from '@/services/supabaseClient'

export type ImapActie = 'seen' | 'unseen' | 'flagged' | 'unflagged' | 'archive' | 'trash' | 'purge' | 'move'
export type MoveDoel = 'inbox' | 'archief' | 'prullenbak'

export interface ImapActieUitkomst {
  overgeslagen?: boolean
  reden?: string
  resultaten?: Array<{ id: string; ok: boolean; imap: string; error?: string }>
  geslaagd?: number
  mislukt?: number
}

/**
 * Schrijft een actie door naar de echte mailbox, met dezelfde body-vorm als
 * EmailLayout altijd stuurde: { action, emailIds }. Het endpoint zoekt uid en
 * map zelf op bij de rijen van de ingelogde gebruiker. Staat writeback uit,
 * dan komt { overgeslagen: true } terug en blijft doen. de enige waarheid.
 */
export async function imapActie(actie: ImapActie, emailIds: string[], doel?: MoveDoel): Promise<ImapActieUitkomst> {
  if (emailIds.length === 0) return { geslaagd: 0, mislukt: 0 }
  if (!supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Niet ingelogd')
  const response = await fetch('/api/email-imap-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(actie === 'move' ? { action: actie, emailIds, doel } : { action: actie, emailIds }),
  })
  if (!response.ok) {
    const fout: { error?: string } = await response.json().catch(() => ({}))
    throw new Error(fout?.error || `Actie mislukt: ${response.status}`)
  }
  return response.json()
}
