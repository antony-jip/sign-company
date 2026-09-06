import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId,
} from './supabaseHelpers'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import type { Email, InternEmailNotitie } from '@/types'
import type { EmailBody, EmailLijstItem, MailMap, SyncStatus, ThreadInfo } from '@/lib/mail/types'
import { parseZoekQuery, bouwTsQuery } from '@/utils/emailZoek'

// ============ HISTORIE-BACKFILL ============

export type BackfillTarget = '1jaar' | '5jaar' | 'alles'

/** Hoe ver de historie-backfill teruggaat (instelling leeft op email_sync_state). */
export async function getBackfillTarget(): Promise<BackfillTarget> {
  if (!isSupabaseConfigured() || !supabase) return '1jaar'
  const { data } = await supabase
    .from('email_sync_state')
    .select('backfill_target')
    .eq('folder', 'inbox')
    .maybeSingle()
  return (data?.backfill_target as BackfillTarget) || '1jaar'
}

/**
 * Zet het backfill-doel voor inbox + verzonden en heropent de backfill
 * (backfill_done = false) zodat een ruimer doel direct verder graaft.
 */
export async function setBackfillTarget(target: BackfillTarget): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) throw new Error('Niet ingelogd')
  const nu = new Date().toISOString()
  const rows = ['inbox', 'verzonden'].map((folder) => ({
    user_id: session.user.id,
    folder,
    backfill_target: target,
    backfill_done: false,
    updated_at: nu,
  }))
  const { error } = await supabase
    .from('email_sync_state')
    .upsert(rows, { onConflict: 'user_id,folder' })
  if (error) throw new Error(error.message)
}

// ============ EMAIL CACHING ============

// ============ EMAILS ============

// Lijst-kolommen voor de inbox-rendering. body_text wordt server-side
// getrunc'd via de emails_list_view (migration 106). body_html en inhoud
// blijven uit — die zijn groot en alleen relevant bij body-open.
// Ook weggelaten: user_id (RLS filtert daar al op), updated_at, cached_at en
// aanvraag_beoordeeld_op. Geen enkel scherm leest ze, en op een telefoon telt
// elke kilobyte van de eerste query.
// to_addresses en cc_addresses staan erbij omdat "Allen beantwoorden" anders
// de meelezers uit de thread laat vallen; `aan` bevat alleen de tekstvorm.
const LIST_VIEW_COLUMNS = 'id,gmail_id,uid,message_id,van,aan,to_addresses,cc_addresses,onderwerp,datum,gelezen,starred,labels,bijlagen,map,from_name,from_address,imap_folder,pinned,snoozed_until,thread_id,attachment_meta,has_attachments,body_text,created_at,is_aanvraag,aanvraag_zekerheid,aanvraag_samenvatting,aanvraag_verborgen'

/**
 * De mailbox is persoonlijk. RLS op `emails` staat naast de eigenaar-policy
 * ook toe dat teamleden mail lezen die via `email_project_koppelingen` aan een
 * project van de organisatie hangt (migratie 109). Dat is gewenst binnen een
 * project, maar de lijstquery's hieronder kennen geen context: zonder eigen
 * filter belandde de projectmail van een collega gewoon in jouw postvak.
 * Vandaar dat de mailmodule expliciet op de eigenaar filtert.
 */
async function eigenUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getEmails(limit = 200): Promise<Email[]> {
  if (isSupabaseConfigured() && supabase) {
    const uid = await eigenUserId()
    if (!uid) return []
    const { data, error } = await supabase
      .from('emails_list_view')
      .select(LIST_VIEW_COLUMNS)
      .eq('user_id', uid)
      .order('datum', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data || []).map(e => ({
      ...e,
      inhoud: '',
      body_html: null,
    }))
  }
  return getLocalData<Email>('emails')
}

/**
 * Server-side tellers voor de mappenlijst — onafhankelijk van hoeveel mails
 * de client geladen heeft (met duizenden mails in de DB telt de client
 * anders alleen zijn eigen venster).
 */
export async function getMapTellers(accountId?: string | null): Promise<{ inboxOngelezen: number; concepten: number; gepland: number; gesnoozed: number; opvolgen: number } | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const client = supabase
  const uid = await eigenUserId()
  if (!uid) return null
  const telling = () => metAccount(client.from('emails').select('id', { count: 'exact', head: true }).eq('user_id', uid) as unknown as LijstBouwer, accountId)
  const [inboxQ, conceptenQ, geplandQ, gesnoozedQ, opvolgenQ] = await Promise.all([
    telling().eq('map', 'inbox').eq('gelezen', false).is('snoozed_until', null),
    telling().eq('map', 'concepten'),
    telling().eq('map', 'gepland'),
    telling().not('snoozed_until', 'is', null),
    telling().eq('wacht_op_reactie', true).eq('beantwoord', false),
  ])
  if (inboxQ.error || conceptenQ.error || geplandQ.error || gesnoozedQ.error || opvolgenQ.error) {
    if (accountId && [inboxQ, conceptenQ, geplandQ, gesnoozedQ, opvolgenQ].some((q) => isOnbekendeKolom(q.error))) {
      accountKolomBekend = false
      return getMapTellers(null)
    }
    return null
  }
  return {
    inboxOngelezen: inboxQ.count ?? 0,
    concepten: conceptenQ.count ?? 0,
    gepland: geplandQ.count ?? 0,
    gesnoozed: gesnoozedQ.count ?? 0,
    opvolgen: opvolgenQ.count ?? 0,
  }
}

export interface EmailPageCursor {
  datum: string
  id: string
}

type LijstBouwer = PostgrestFilterBuilder<any, any, any, any>

/**
 * `emails.account_id` komt uit migratie 245. Zolang die niet gedraaid is
 * bestaat de kolom niet en zou elk filter erop de hele lijst laten falen.
 * Eén mislukte poging zet de vlag op false en daarna filtert niemand meer:
 * met één postvak levert dat precies het oude gedrag.
 */
let accountKolomBekend: boolean | null = null

export function accountKolomOntbreekt(): boolean {
  return accountKolomBekend === false
}

function isOnbekendeKolom(fout: unknown): boolean {
  const code = (fout as { code?: string } | null)?.code
  if (code === '42703' || code === 'PGRST204') return true
  return /column .*account_id.* does not exist/i.test((fout as { message?: string } | null)?.message || '')
}

/** Filter op postvak, maar alleen zolang de kolom bestaat en er één gekozen is. */
function metAccount(q: LijstBouwer, accountId?: string | null): LijstBouwer {
  if (!accountId || accountKolomBekend === false) return q
  return q.eq('account_id', accountId)
}

function metCursor(q: LijstBouwer, cursor: EmailPageCursor | null): LijstBouwer {
  if (!cursor) return q
  return q.or(`datum.lt."${cursor.datum}",and(datum.eq."${cursor.datum}",id.lt."${cursor.id}")`)
}

/**
 * Wat een map betekent, server-side. Dit was de filterlogica van
 * filteredEmails in EmailLayout: een gesnoozde mail blijft in map inbox
 * staan maar hoort in Gesnoozed, niet in Inbox. Opvolgen en Beantwoord zijn
 * vlaggen op verzonden mail (Sales Inbox); Ingepland is de oude map 'gepland'.
 * Leads is geen maillijst maar een paneel, dus die geeft niets terug.
 */
function pasMapFilterToe(q: LijstBouwer, map: string): LijstBouwer | null {
  switch (map as MailMap) {
    case 'gesnoozed': return q.not('snoozed_until', 'is', null)
    case 'opvolgen': return q.eq('wacht_op_reactie', true).eq('beantwoord', false)
    case 'beantwoord': return q.eq('wacht_op_reactie', true).eq('beantwoord', true)
    case 'ingepland': return q.eq('map', 'gepland')
    case 'leads': return null
    default: return q.eq('map', map).is('snoozed_until', null)
  }
}

/** Mappen waarvan het filter op kolommen staat die de lijst-view niet kent. */
const MAPPEN_VIA_TABEL = new Set<string>(['opvolgen', 'beantwoord'])

function alsLijstItem(e: Record<string, unknown>): Email {
  return { ...e, inhoud: '', body_html: null } as unknown as Email
}

/**
 * Keyset-paginatie per map: de volgende pagina ouder dan de cursor
 * (datum, id) — stabiel bij nieuwe mail bovenin, geen offset-drift.
 * De data komt uit de eigen DB; de historie-backfill vult die aan.
 */
export async function getEmailsPage(map: string, cursor: EmailPageCursor | null, limit = 100, accountId?: string | null): Promise<Email[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const client = supabase
  const uid = await eigenUserId()
  if (!uid) return []

  if (MAPPEN_VIA_TABEL.has(map)) {
    // Eerst de smalle id-query op de tabel (daar staan de vlaggen), dan de
    // lijstkolommen uit de view, in de volgorde van de eerste stap.
    const idsQ = pasMapFilterToe(
      metAccount(client.from('emails').select('id, wacht_op_reactie, beantwoord').eq('user_id', uid) as unknown as LijstBouwer, accountId),
      map,
    )
    if (!idsQ) return []
    const { data: treffers, error } = await metCursor(idsQ, cursor)
      .order('datum', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit)
    if (error) {
      if (accountId && isOnbekendeKolom(error)) {
        accountKolomBekend = false
        return getEmailsPage(map, cursor, limit, null)
      }
      throw error
    }
    const vlaggen = new Map(((treffers || []) as Array<{ id: string; wacht_op_reactie: boolean; beantwoord: boolean }>).map((r, i) => [r.id, { i, r }]))
    if (vlaggen.size === 0) return []
    const { data: rijen, error: rijenErr } = await client
      .from('emails_list_view')
      .select(LIST_VIEW_COLUMNS)
      .in('id', [...vlaggen.keys()])
    if (rijenErr) throw rijenErr
    return ((rijen || []) as Array<Record<string, unknown>>)
      .sort((a, b) => (vlaggen.get(a.id as string)?.i ?? 0) - (vlaggen.get(b.id as string)?.i ?? 0))
      .map((e) => {
        const v = vlaggen.get(e.id as string)?.r
        return alsLijstItem({ ...e, wacht_op_reactie: v?.wacht_op_reactie, beantwoord: v?.beantwoord })
      })
  }

  const basis = pasMapFilterToe(
    metAccount(client.from('emails_list_view').select(LIST_VIEW_COLUMNS).eq('user_id', uid) as unknown as LijstBouwer, accountId),
    map,
  )
  if (!basis) return []
  const { data, error } = await metCursor(basis, cursor)
    .order('datum', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)
  if (error) {
    if (accountId && isOnbekendeKolom(error)) {
      accountKolomBekend = false
      return getEmailsPage(map, cursor, limit, null)
    }
    throw error
  }
  if (accountId) accountKolomBekend = true
  return ((data || []) as Array<Record<string, unknown>>).map(alsLijstItem)
}

/** Alle berichten van één gesprek als lijst-items, oudste eerst. Concepten en prullenbak blijven eruit, net als in email_threads_view. */
export async function getThreadItems(threadId: string): Promise<EmailLijstItem[]> {
  if (!threadId || !isSupabaseConfigured() || !supabase) return []
  const uid = await eigenUserId()
  if (!uid) return []
  const { data, error } = await supabase
    .from('emails_list_view')
    .select(LIST_VIEW_COLUMNS)
    .eq('user_id', uid)
    .eq('thread_id', threadId)
    .not('map', 'in', '("prullenbak","concepten")')
    .order('datum', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  return (data || []) as unknown as EmailLijstItem[]
}

/** Thread-tellers van de server (email_threads_view) voor een reeks threads. */
export async function getThreadInfos(threadIds: string[]): Promise<ThreadInfo[]> {
  const uniek = [...new Set(threadIds.filter(Boolean))]
  if (uniek.length === 0 || !isSupabaseConfigured() || !supabase) return []
  const client = supabase
  const uid = await eigenUserId()
  if (!uid) return []
  const blokken: string[][] = []
  for (let i = 0; i < uniek.length; i += 100) blokken.push(uniek.slice(i, i + 100))
  const resultaten = await Promise.all(blokken.map(async (blok) => {
    const { data, error } = await client
      .from('email_threads_view')
      .select('thread_id, laatste_datum, aantal, ongelezen, laatste_email_id, deelnemers')
      .eq('user_id', uid)
      .in('thread_id', blok)
    if (error) return []
    return (data || []) as Array<{ thread_id: string; laatste_datum: string; aantal: number; ongelezen: number; laatste_email_id: string; deelnemers: string[] | null }>
  }))
  return resultaten.flat().map((r) => ({
    threadId: r.thread_id,
    laatsteDatum: r.laatste_datum,
    aantal: r.aantal,
    ongelezen: r.ongelezen,
    laatsteEmailId: r.laatste_email_id,
    deelnemers: r.deelnemers || [],
  }))
}

/** Gezondheid van de eigen mailbox, uit email_sync_state (rij inbox). */
export async function getSyncStatus(): Promise<SyncStatus> {
  const standaard: SyncStatus = { status: 'ok' }
  if (!isSupabaseConfigured() || !supabase) return standaard
  const uid = await eigenUserId()
  if (!uid) return standaard
  const { data, error } = await supabase
    .from('email_sync_state')
    .select('status, laatste_fout, laatste_succes_op')
    .eq('user_id', uid)
    .eq('folder', 'inbox')
    .maybeSingle()
  if (error || !data) return standaard
  return {
    status: (data.status as SyncStatus['status']) || 'ok',
    laatsteFout: data.laatste_fout || undefined,
    laatsteSucces: data.laatste_succes_op || undefined,
  }
}

/** PostgREST or-syntax gebruikt komma's en haakjes als structuur. */
function veiligeZoekterm(w: string): string {
  return w.replace(/[,%()"*]/g, '').trim()
}

export async function searchEmailsFTS(query: string, limit = 50, offset = 0): Promise<Email[]> {
  if (!query.trim() || !isSupabaseConfigured() || !supabase) return []
  const client = supabase
  const uid = await eigenUserId()
  if (!uid) return []
  const filters = parseZoekQuery(query)

  // Alle filters buiten de vrije tekst gelden in beide rondes.
  type Bouwer = PostgrestFilterBuilder<any, any, any, any>
  const pasFiltersToe = (q: Bouwer): Bouwer => {
    let uit = q.eq('user_id', uid)
    if (filters.van) {
      const veilig = veiligeZoekterm(filters.van)
      if (veilig) uit = uit.or(`van.ilike.%${veilig}%,from_address.ilike.%${veilig}%`)
    }
    if (filters.aan) {
      const veilig = veiligeZoekterm(filters.aan)
      if (veilig) uit = uit.ilike('aan', `%${veilig}%`)
    }
    if (filters.onderwerp) {
      const veilig = veiligeZoekterm(filters.onderwerp)
      if (veilig) uit = uit.ilike('onderwerp', `%${veilig}%`)
    }
    if (filters.map) uit = uit.eq('map', filters.map)
    if (filters.gelezen !== undefined) uit = uit.eq('gelezen', filters.gelezen)
    if (filters.voor) uit = uit.lt('datum', filters.voor)
    if (filters.na) uit = uit.gte('datum', filters.na)
    if (filters.bijlage !== undefined) uit = uit.eq('has_attachments', filters.bijlage)
    return uit
  }

  // Twee stappen. Eerst alleen de id's uit de tabel: dat is een smalle query
  // die de grote body-kolommen niet aanraakt. Pas daarna de lijstkolommen
  // voor die vijftig rijen uit de view. In één keer via de view duurde
  // hetzelfde zoekwoord seconden, omdat de view voor élke treffer eerst
  // body_text moest uitpakken voordat er gesorteerd kon worden.
  const idsQuery = () => pasFiltersToe(
    client
      .from('emails')
      .select('id')
      .order('datum', { ascending: false })
      .range(offset, offset + limit - 1) as unknown as Bouwer,
  )

  const tsQuery = bouwTsQuery(filters.termen)
  const eersteRonde = tsQuery ? idsQuery().textSearch('fts', tsQuery) : idsQuery()
  const { data: treffers, error } = await eersteRonde
  if (error) throw error
  let ids = ((treffers || []) as Array<{ id: string }>).map(r => r.id)

  // Vangnet: letterlijke deelstring op de korte kolommen. De Nederlandse
  // stemmer knipt Engelse en Duitse mail anders, een naam in een adres is
  // geen los woord, en wie "3021" zoekt bedoelt het midden van een
  // ordernummer. body_text blijft er bewust buiten: die kolom zonder index
  // doorzoeken loopt tegen de statement-timeout aan, en full-text dekt de
  // inhoud al.
  if (ids.length === 0 && tsQuery && offset === 0) {
    const term = veiligeZoekterm(filters.termen.join(' '))
    if (!term) return []
    const { data: vangnet, error: vangnetErr } = await idsQuery()
      .or(`onderwerp.ilike.%${term}%,van.ilike.%${term}%,aan.ilike.%${term}%`)
    if (vangnetErr) throw vangnetErr
    ids = ((vangnet || []) as Array<{ id: string }>).map(r => r.id)
  }

  if (ids.length === 0) return []

  const { data: rijen, error: rijenErr } = await client
    .from('emails_list_view')
    .select(LIST_VIEW_COLUMNS)
    .in('id', ids)
  if (rijenErr) throw rijenErr

  const volgorde = new Map(ids.map((id, i) => [id, i]))
  return ((rijen || []) as Array<Record<string, unknown>>)
    .sort((a, b) => (volgorde.get(a.id as string) ?? 0) - (volgorde.get(b.id as string) ?? 0))
    .map(e => ({ ...e, inhoud: '', body_html: null })) as unknown as Email[]
}

export async function getEmail(id: string): Promise<Email | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const emails = getLocalData<Email>('emails')
  return emails.find((e) => e.id === id) || null
}

type BodyRij = { email_id: string; body_html: string | null; body_text: string | null; quoted_html: string | null }

/**
 * Leest bodies uit email_bodies (migratie 244). emails.body_html is sinds die
 * migratie leeg; wie daar nog leest krijgt altijd NULL en valt onnodig terug
 * op IMAP. Alleen rijen die bestaan komen terug: geen rij betekent "nog nooit
 * geparsed", en dat hoort via prefetch of read-email te lopen.
 */
export async function getEmailBodiesUitTabel(ids: string[]): Promise<EmailBody[]> {
  if (!ids.length || !isSupabaseConfigured() || !supabase) return []
  const client = supabase
  const blokken: string[][] = []
  for (let i = 0; i < ids.length; i += 100) blokken.push(ids.slice(i, i + 100))
  const resultaten = await Promise.all(blokken.map(async (blok) => {
    const { data, error } = await client
      .from('email_bodies')
      .select('email_id, body_html, body_text, quoted_html')
      .in('email_id', blok)
    if (error) return []
    return (data || []) as BodyRij[]
  }))
  return resultaten.flat().map((r) => ({
    emailId: r.email_id,
    html: r.body_html,
    tekst: r.body_text,
    quotedHtml: r.quoted_html,
  }))
}

/** Fetch only the body columns for a single email (fast, lightweight) */
export async function getEmailBody(id: string): Promise<{ body_html: string | null; body_text: string | null; inhoud: string; attachment_meta?: unknown[] | null } | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const [bodyQ, metaQ] = await Promise.all([
      supabase.from('email_bodies').select('body_html, body_text').eq('email_id', id).maybeSingle(),
      supabase.from('emails').select('body_text, inhoud, attachment_meta').eq('id', id).maybeSingle(),
    ])
    if (metaQ.error) throw metaQ.error
    if (!metaQ.data) return null
    return {
      body_html: bodyQ.data?.body_html ?? null,
      body_text: bodyQ.data?.body_text ?? metaQ.data.body_text ?? null,
      inhoud: metaQ.data.inhoud || '',
      attachment_meta: metaQ.data.attachment_meta,
    }
  }
  const emails = getLocalData<Email>('emails')
  const found = emails.find((e) => e.id === id)
  return found ? { body_html: (found as any).body_html || null, body_text: (found as any).body_text || null, inhoud: found.inhoud || '', attachment_meta: found.attachment_meta } : null
}

/**
 * Bodies van meerdere mails in één query. Vult de lees-cache vóórdat de
 * gebruiker iets aantikt, zodat openen geen netwerk meer kost. Alleen rijen
 * met een echte body komen terug: body_html NULL betekent "nog nooit
 * geparsed" en hoort via het IMAP-pad te lopen, niet als lege body in de cache.
 */
export async function getEmailBodies(
  ids: string[]
): Promise<Array<{ id: string; body_html: string | null; body_text: string | null; attachment_meta?: unknown[] | null }>> {
  if (!ids.length) return []
  if (!isSupabaseConfigured() || !supabase) return []

  const client = supabase
  // PostgREST zet de `in`-lijst in de URL; te veel ids in één keer geeft een
  // 414. Vandaar blokken van 100.
  const blokken: string[][] = []
  for (let i = 0; i < ids.length; i += 100) blokken.push(ids.slice(i, i + 100))

  const resultaten = await Promise.all(
    blokken.map(async (blok) => {
      const [bodiesQ, metaQ] = await Promise.all([
        client.from('email_bodies').select('email_id, body_html, body_text').in('email_id', blok).not('body_html', 'is', null),
        client.from('emails').select('id, attachment_meta').in('id', blok),
      ])
      if (bodiesQ.error) return []
      const meta = new Map(((metaQ.data || []) as Array<{ id: string; attachment_meta: unknown[] | null }>).map((r) => [r.id, r.attachment_meta]))
      return ((bodiesQ.data || []) as Array<{ email_id: string; body_html: string | null; body_text: string | null }>).map((r) => ({
        id: r.email_id,
        body_html: r.body_html,
        body_text: r.body_text,
        attachment_meta: meta.get(r.email_id) ?? null,
      }))
    })
  )
  return resultaten.flat()
}

/** Haal alle emails op die tot dezelfde thread behoren, chronologisch gesorteerd */
export async function getThread(threadId: string): Promise<Email[]> {
  if (!threadId) return []
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('thread_id', threadId)
      .order('datum', { ascending: true })
    if (error) throw error
    return (data || []) as Email[]
  }
  const emails = getLocalData<Email>('emails')
  return emails
    .filter((e) => e.thread_id === threadId)
    .sort((a, b) => Date.parse(a.datum) - Date.parse(b.datum))
}

/** Alle correspondentie met één adres · zowel ontvangen als verstuurd. */
export async function getEmailsMetAdres(adres: string, limit = 20): Promise<Email[]> {
  const bareEmail = adres.trim().toLowerCase()
  if (!bareEmail) return []
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails_list_view')
      .select(LIST_VIEW_COLUMNS)
      .or(`from_address.ilike.%${bareEmail}%,van.ilike.%${bareEmail}%,aan.ilike.%${bareEmail}%`)
      .order('datum', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data || []).map(e => ({ ...e, inhoud: '', body_html: null }))
  }
  const emails = getLocalData<Email>('emails')
  return emails
    .filter((e) => [e.van, e.aan].some((v) => v?.toLowerCase().includes(bareEmail)))
    .sort((a, b) => Date.parse(b.datum) - Date.parse(a.datum))
    .slice(0, limit)
}

export async function updateEmail(id: string, updates: Partial<Email>): Promise<Email> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('emails')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const emails = getLocalData<Email>('emails')
  const index = emails.findIndex((e) => e.id === id)
  if (index === -1) throw new Error('Email niet gevonden')
  emails[index] = { ...emails[index], ...updates }
  setLocalData('emails', emails)
  return emails[index]
}

/** Weggeklikte aanvraagkaart blijft weg, ook na een nieuwe sync. */
export async function verbergAanvraag(id: string): Promise<void> {
  assertId(id)
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase
    .from('emails')
    .update({ aanvraag_verborgen: true })
    .eq('id', id)
  if (error) throw error
}

export async function deleteEmail(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('emails').delete().eq('id', id)
    if (error) throw error
    return
  }
  const emails = getLocalData<Email>('emails')
  setLocalData('emails', emails.filter((e) => e.id !== id))
}

// ============ GEDEELDE INBOX (Tier 3 Feature 3) ============

// ============ SALES INBOX v1 ============
// UX-laag op outbound mail. Queries draaien onder anon-key; RLS scope't
// automatisch op auth.uid() = user_id. Server-side (auto-match in
// fetch-emails) MOET zelf user_id-filteren want service_role omzeilt RLS.

const SALES_INBOX_SELECT = 'id,user_id,gmail_id,uid,message_id,van,aan,onderwerp,datum,gelezen,starred,labels,bijlagen,map,from_name,from_address,imap_folder,pinned,snoozed_until,thread_id,attachment_meta,has_attachments,body_text,created_at,updated_at,cached_at,wacht_op_reactie,beantwoord,beantwoord_door_email_id,vervangen_door_email_id,wacht_op_reactie_uitgezet_op,niet_match_email_ids'

function extractBareEmail(address: string): string {
  const trimmed = address.trim()
  const match = trimmed.match(/<([^>]+)>/)
  return (match?.[1] || trimmed).toLowerCase()
}

/** Compose-hint: vind de meest recente openstaande wacht-mail naar dit adres. */
export async function getWachtendeEmailNaarAdres(toAddress: string): Promise<Email | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const bareEmail = extractBareEmail(toAddress)
  if (!bareEmail) return null
  const { data, error } = await supabase
    .from('emails')
    .select('id, datum, aan, onderwerp')
    .eq('wacht_op_reactie', true)
    .eq('beantwoord', false)
    .ilike('aan', `%${bareEmail}%`)
    .order('datum', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as Email | null
}

/** Sales Inbox "Wacht op reactie" tab. */
export async function getSalesInboxWachtend(limit = 100): Promise<Email[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('emails')
    .select(SALES_INBOX_SELECT)
    .eq('wacht_op_reactie', true)
    .eq('beantwoord', false)
    .order('datum', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as unknown as Email[]
}

/** Sales Inbox "Beantwoord" tab. UI haalt details van de triggerende inkomende mail
 *  zelf op via beantwoord_door_email_id — geen self-join hier voor v1. */
export async function getSalesInboxBeantwoord(limit = 100): Promise<Email[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('emails')
    .select(SALES_INBOX_SELECT)
    .eq('wacht_op_reactie', true)
    .eq('beantwoord', true)
    .order('datum', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as unknown as Email[]
}

/** Per-rij actie in Wacht-tab: gebruiker markeert handmatig als beantwoord
 *  (false-negative correctie). Geen beantwoord_door_email_id want geen
 *  specifieke inkomende mail bekend. */
export async function markeerHandmatigBeantwoord(emailId: string): Promise<void> {
  assertId(emailId, 'email_id')
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { error } = await supabase
    .from('emails')
    .update({ beantwoord: true })
    .eq('id', emailId)
  if (error) throw error
}

/** Per-rij actie in Wacht-tab: "Niet meer wachten" — wis flag, registreer datum. */
export async function wisWachtFlag(emailId: string): Promise<void> {
  assertId(emailId, 'email_id')
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { error } = await supabase
    .from('emails')
    .update({
      wacht_op_reactie: false,
      wacht_op_reactie_uitgezet_op: new Date().toISOString(),
    })
    .eq('id', emailId)
  if (error) throw error
}

/** Per-rij actie in Beantwoord-tab: "Dit was niet de reactie" — outbound terug
 *  naar Wacht en de inkomende mail uitsluiten van toekomstige auto-match. */
export async function terugZettenNaarWacht(outboundId: string, inkomendeMailId: string): Promise<void> {
  assertId(outboundId, 'outbound_id')
  assertId(inkomendeMailId, 'inkomende_mail_id')
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')

  const { data: huidig, error: leesError } = await supabase
    .from('emails')
    .select('niet_match_email_ids')
    .eq('id', outboundId)
    .maybeSingle()
  if (leesError) throw leesError

  const huidigeIds = (huidig?.niet_match_email_ids || []) as string[]
  const nieuweIds = huidigeIds.includes(inkomendeMailId)
    ? huidigeIds
    : [...huidigeIds, inkomendeMailId]

  const { error } = await supabase
    .from('emails')
    .update({
      beantwoord: false,
      beantwoord_door_email_id: null,
      niet_match_email_ids: nieuweIds,
    })
    .eq('id', outboundId)
  if (error) throw error
}

// ── Ingeplande berichten ──
export async function getIngeplandeBerichten(): Promise<import('@/types').IngeplandBericht[]> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { data, error } = await supabase
    .from('ingeplande_berichten')
    .select('*')
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return (data || []) as import('@/types').IngeplandBericht[]
}

export async function cancelIngeplandBericht(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { error } = await supabase
    .from('ingeplande_berichten')
    .update({ status: 'geannuleerd' })
    .eq('id', id)
    .eq('status', 'wachtend')
  if (error) throw error
}

// ============ EMAIL TEMPLATES ============

export interface EmailTemplate {
  id: string
  organisatie_id: string
  naam: string
  onderwerp: string
  body: string
  trigger_task_naam: string | null
  is_systeem: boolean
  created_at: string
  updated_at: string
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const orgId = await getOrgId()
  if (!orgId) return []
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('organisatie_id', orgId)
    .order('naam')
  if (error) throw error
  return data || []
}

export async function createEmailTemplate(template: { naam: string; onderwerp: string; body: string }): Promise<EmailTemplate> {
  if (!supabase) throw new Error('Niet geconfigureerd')
  const orgId = await getOrgId()
  if (!orgId) throw new Error('Geen organisatie gevonden')
  const { data, error } = await supabase
    .from('email_templates')
    .insert({ ...template, organisatie_id: orgId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmailTemplate(id: string, updates: { naam?: string; onderwerp?: string; body?: string }): Promise<void> {
  if (!supabase) throw new Error('Niet geconfigureerd')
  const { error } = await supabase
    .from('email_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  if (!supabase) throw new Error('Niet geconfigureerd')
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)
  if (error) throw error
}
