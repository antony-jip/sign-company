import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'
import { koppelEmailAanProject, ontkoppelEmailVanProject } from './emailProjectService'
import type { EmailKoppeling, EmailLijstItem, KoppelingSoort } from '@/lib/mail/types'

/**
 * Mail aan klant, project, offerte, factuur, aanvraag, taak of lead hangen
 * (email_koppelingen, migratie 244). Org-breed zichtbaar. Bij soort 'project'
 * schrijven we ook naar email_project_koppelingen: dat is de bron van de
 * team-leesrechten uit migratie 109, en die blijft bestaan.
 */

const KOLOMMEN = 'id, organisatie_id, user_id, email_id, thread_id, soort, doel_id, created_at'

const LIJST_KOLOMMEN = 'id,gmail_id,uid,message_id,van,aan,to_addresses,cc_addresses,onderwerp,datum,gelezen,starred,labels,bijlagen,map,from_name,from_address,imap_folder,pinned,snoozed_until,thread_id,attachment_meta,has_attachments,body_text,created_at,is_aanvraag,aanvraag_zekerheid,aanvraag_samenvatting,aanvraag_verborgen'

export async function koppel(
  soort: KoppelingSoort,
  doelId: string,
  bron: { emailId?: string; threadId?: string },
): Promise<EmailKoppeling> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  if (!doelId || (!bron.emailId && !bron.threadId)) throw new Error('Koppelen vraagt een doel en een mail of thread')
  const organisatieId = await getOrgId()
  if (!organisatieId) throw new Error('Geen organisatie gevonden')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  // Een thread-koppeling geldt voor het hele gesprek en gaat vóór een losse mail.
  const opThread = !!bron.threadId
  let bestaand = supabase
    .from('email_koppelingen')
    .select(KOLOMMEN)
    .eq('organisatie_id', organisatieId)
    .eq('soort', soort)
    .eq('doel_id', doelId)
  bestaand = opThread ? bestaand.eq('thread_id', bron.threadId!) : bestaand.eq('email_id', bron.emailId!)
  const { data: al } = await bestaand.maybeSingle()
  if (al) {
    if (soort === 'project' && bron.threadId) await koppelEmailAanProject(bron.threadId, doelId)
    return al as EmailKoppeling
  }

  const { data, error } = await supabase
    .from('email_koppelingen')
    .insert({
      organisatie_id: organisatieId,
      user_id: user.id,
      email_id: opThread ? null : bron.emailId,
      thread_id: opThread ? bron.threadId : null,
      soort,
      doel_id: doelId,
    })
    .select(KOLOMMEN)
    .single()
  if (error) throw error
  if (soort === 'project' && bron.threadId) await koppelEmailAanProject(bron.threadId, doelId)
  return data as EmailKoppeling
}

export async function ontkoppel(id: string): Promise<void> {
  if (!id || !isSupabaseConfigured() || !supabase) return
  const { data: rij } = await supabase
    .from('email_koppelingen')
    .select(KOLOMMEN)
    .eq('id', id)
    .maybeSingle()
  const { error } = await supabase.from('email_koppelingen').delete().eq('id', id)
  if (error) throw error
  const koppeling = rij as EmailKoppeling | null
  if (koppeling?.soort === 'project' && koppeling.thread_id) {
    // Alleen de projectkoppeling van de thread laten vallen als er geen
    // andere project-koppeling op die thread meer staat.
    const { data: rest } = await supabase
      .from('email_koppelingen')
      .select('id')
      .eq('thread_id', koppeling.thread_id)
      .eq('soort', 'project')
      .limit(1)
    if (!rest || rest.length === 0) await ontkoppelEmailVanProject(koppeling.thread_id)
  }
}

export async function getKoppelingenVoorEmail(emailId: string, threadId?: string | null): Promise<EmailKoppeling[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  if (!emailId && !threadId) return []
  const delen: string[] = []
  if (emailId) delen.push(`email_id.eq.${emailId}`)
  if (threadId) delen.push(`thread_id.eq."${threadId.replace(/["\\]/g, '')}"`)
  const { data, error } = await supabase
    .from('email_koppelingen')
    .select(KOLOMMEN)
    .or(delen.join(','))
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as EmailKoppeling[]
}

/** Alle mail die aan één klant, project, offerte, enz. hangt, nieuwste eerst. */
export async function getKoppelingenVoorDoel(soort: KoppelingSoort, doelId: string, limit = 200): Promise<{ koppelingen: EmailKoppeling[]; mails: EmailLijstItem[] }> {
  if (!doelId || !isSupabaseConfigured() || !supabase) return { koppelingen: [], mails: [] }
  const { data, error } = await supabase
    .from('email_koppelingen')
    .select(KOLOMMEN)
    .eq('soort', soort)
    .eq('doel_id', doelId)
  if (error) throw error
  const koppelingen = (data || []) as EmailKoppeling[]
  const emailIds = koppelingen.map((k) => k.email_id).filter((x): x is string => !!x)
  const threadIds = koppelingen.map((k) => k.thread_id).filter((x): x is string => !!x)
  if (emailIds.length === 0 && threadIds.length === 0) return { koppelingen, mails: [] }

  const delen: string[] = []
  if (emailIds.length) delen.push(`id.in.(${emailIds.join(',')})`)
  if (threadIds.length) delen.push(`thread_id.in.(${threadIds.map((t) => `"${t.replace(/["\\]/g, '')}"`).join(',')})`)
  const { data: rijen, error: rijenErr } = await supabase
    .from('emails_list_view')
    .select(LIJST_KOLOMMEN)
    .or(delen.join(','))
    .order('datum', { ascending: false })
    .limit(limit)
  if (rijenErr) throw rijenErr
  return { koppelingen, mails: (rijen || []) as unknown as EmailLijstItem[] }
}
