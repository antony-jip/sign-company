import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'
import type { ComposerDocument, Ontvanger } from '@/lib/mail/types'

/**
 * Concepten zijn rijen in `emails` met map 'concepten' en het hele
 * ComposerDocument in de kolom `concept` (migratie 244). Onderwerp en
 * ontvangers staan gespiegeld in de gewone kolommen zodat de lijst-view en
 * de zoekindex ze tonen zonder de JSON te lezen. Debounce doet de composer.
 */

function alsAdresregel(ontvangers: Ontvanger[]): string {
  return ontvangers
    .map((o) => (o.naam ? `${o.naam} <${o.email}>` : o.email))
    .join(', ')
}

async function eigenGebruiker(): Promise<{ id: string; email: string }> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Niet ingelogd')
  return { id: user.id, email: user.email || '' }
}

export async function slaConceptOp(doc: ComposerDocument): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const [gebruiker, organisatieId] = await Promise.all([eigenGebruiker(), getOrgId()])
  if (!organisatieId) throw new Error('Geen organisatie gevonden')
  const nu = new Date().toISOString()
  const rij: Record<string, unknown> = {
    user_id: gebruiker.id,
    organisatie_id: organisatieId,
    map: 'concepten',
    concept: doc,
    onderwerp: doc.onderwerp || '',
    aan: alsAdresregel(doc.aan),
    van: gebruiker.email,
    datum: nu,
    gelezen: true,
    labels: ['concepten'],
    bijlagen: doc.bijlagen.length,
    thread_id: doc.threadId ?? null,
    in_reply_to: doc.inReplyTo ?? null,
  }
  if (doc.id) rij.id = doc.id
  const { data, error } = await supabase
    .from('emails')
    .upsert(rij, { onConflict: 'id' })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

function alsDocument(rij: { id: string; concept: ComposerDocument | null }): ComposerDocument | null {
  if (!rij.concept) return null
  return { ...rij.concept, id: rij.id }
}

export async function getConcepten(): Promise<ComposerDocument[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const gebruiker = await eigenGebruiker()
  const { data, error } = await supabase
    .from('emails')
    .select('id, concept')
    .eq('user_id', gebruiker.id)
    .eq('map', 'concepten')
    .not('concept', 'is', null)
    .order('datum', { ascending: false })
  if (error) throw error
  return ((data || []) as Array<{ id: string; concept: ComposerDocument | null }>)
    .map(alsDocument)
    .filter((d): d is ComposerDocument => !!d)
}

export async function getConcept(id: string): Promise<ComposerDocument | null> {
  if (!id || !isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('emails')
    .select('id, concept')
    .eq('id', id)
    .eq('map', 'concepten')
    .maybeSingle()
  if (error) throw error
  return data ? alsDocument(data as { id: string; concept: ComposerDocument | null }) : null
}

export async function verwijderConcept(id: string): Promise<void> {
  if (!id || !isSupabaseConfigured() || !supabase) return
  const { error } = await supabase
    .from('emails')
    .delete()
    .eq('id', id)
    .eq('map', 'concepten')
  if (error) throw error
}
