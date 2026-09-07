import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'
import type { ComposerDocument, Ontvanger } from '@/lib/mail/types'
import { getEmailBody } from './emailService'

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
  // Zonder account_id hoort een concept bij geen enkel postvak en verschijnt
  // het dus in allemaal. De kolom komt uit migratie 245; bestaat hij nog niet,
  // dan schrijven we de rij zonder en is het gedrag weer dat van één postvak.
  if (doc.accountId) rij.account_id = doc.accountId
  const client = supabase
  const schrijf = (velden: Record<string, unknown>) => client
    .from('emails')
    .upsert(velden, { onConflict: 'id' })
    .select('id')
    .single()

  let { data, error } = await schrijf(rij)
  if (error && doc.accountId && isOnbekendeKolom(error)) {
    const { account_id: _weg, ...zonderAccount } = rij
    const tweede = await schrijf(zonderAccount)
    data = tweede.data
    error = tweede.error
  }
  if (error) throw error
  return data!.id as string
}

/** Migratie 245 niet gedraaid: `emails.account_id` bestaat dan nog niet. */
function isOnbekendeKolom(fout: unknown): boolean {
  const code = (fout as { code?: string } | null)?.code
  if (code === '42703' || code === 'PGRST204') return true
  return /column .*account_id.* does not exist|could not find the .*account_id.* column/i.test((fout as { message?: string } | null)?.message || '')
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

/**
 * Een concept dat niet in doen. is geschreven.
 *
 * De map Concepten bevat ook de concepten die van de mailserver komen: begonnen
 * in Outlook, op de telefoon, of hier vóór de ombouw. Die hebben geen
 * `concept`-JSON, alleen de gewone kolommen. Zonder deze omweg gaven ze
 * "Concept kon niet worden geopend" en kon je er niets meer mee.
 */
function uitMailrij(rij: {
  id: string
  aan?: string | null
  onderwerp?: string | null
  body_html?: string | null
  body_text?: string | null
  thread_id?: string | null
  account_id?: string | null
}): ComposerDocument {
  const ontvangers: Ontvanger[] = (rij.aan || '')
    .split(/[,;]/)
    .map((deel) => deel.trim())
    .filter(Boolean)
    .map((deel) => {
      const haakjes = deel.match(/^(.*?)\s*<([^>]+)>$/)
      const email = (haakjes ? haakjes[2] : deel).trim()
      const naam = haakjes ? haakjes[1].trim().replace(/^"|"$/g, '') : ''
      return { email, naam: naam || undefined, bron: 'vrij' as const }
    })
    .filter((o) => !!o.email)

  const html = rij.body_html?.trim()
    || (rij.body_text ? rij.body_text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />') : '')

  return {
    modus: 'nieuw',
    id: rij.id,
    aan: ontvangers,
    cc: [],
    bcc: [],
    onderwerp: rij.onderwerp || '',
    html,
    // Uit: de handtekening staat al in de tekst die van de server komt, anders
    // krijg je hem twee keer onder je bericht.
    handtekening: false,
    bijlagen: [],
    opvolgen: false,
    koppelingen: [],
    threadId: rij.thread_id || undefined,
    accountId: rij.account_id || undefined,
  }
}

/** 42703 zonder migratie 245, PGRST204 via de schema-cache. */
function isKolomFout(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  return fout.code === '42703' || fout.code === 'PGRST204'
    || /column .* does not exist|could not find the .* column/i.test(fout.message || '')
}

export async function getConcept(id: string): Promise<ComposerDocument | null> {
  if (!id || !isSupabaseConfigured() || !supabase) return null
  const client = supabase
  const KOLOMMEN = 'id, concept, aan, onderwerp, body_html, body_text, thread_id'
  const haal = (kolommen: string) => client
    .from('emails')
    .select(kolommen)
    .eq('id', id)
    .eq('map', 'concepten')
    .maybeSingle()
  // account_id komt uit migratie 245; zonder die kolom faalt anders de hele
  // select en lijkt het concept te ontbreken.
  let uitkomst = await haal(`${KOLOMMEN}, account_id`)
  if (isKolomFout(uitkomst.error)) uitkomst = await haal(KOLOMMEN)
  const { data, error } = uitkomst
  if (error) throw error
  if (!data) return null
  const rij = data as unknown as {
    id: string
    concept: ComposerDocument | null
    aan?: string | null
    onderwerp?: string | null
    body_html?: string | null
    body_text?: string | null
    thread_id?: string | null
    account_id?: string | null
  }
  const eigen = alsDocument(rij)
  if (eigen) return eigen

  // Van de server: de inhoud staat sinds migratie 244 in email_bodies en niet
  // meer in emails.body_html, dus zonder deze stap opent het concept leeg.
  if (!rij.body_html?.trim() && !rij.body_text?.trim()) {
    const body = await getEmailBody(id).catch(() => null)
    if (body) {
      rij.body_html = body.body_html
      rij.body_text = body.body_text || body.inhoud || null
    }
  }
  return uitMailrij(rij)
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
