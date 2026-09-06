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
  // Geen maybeSingle: met twee postvakken zijn dat twee inbox-rijen en dan viel
  // de instelling stil terug op '1jaar'. Het doel is een gebruikersinstelling
  // die voor alle postvakken geldt, dus de eerste rij met een waarde volstaat.
  const { data } = await supabase
    .from('email_sync_state')
    .select('backfill_target')
    .eq('folder', 'inbox')
  const rijen = (data || []) as Array<{ backfill_target?: string | null }>
  const gevonden = rijen.find((r) => !!r.backfill_target)?.backfill_target
  return (gevonden as BackfillTarget) || '1jaar'
}

/**
 * Zet het backfill-doel voor inbox + verzonden en heropent de backfill
 * (backfill_done = false) zodat een ruimer doel direct verder graaft. Het doel
 * geldt voor alle postvakken van de gebruiker; er is bewust geen instelling per
 * postvak.
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
  // Migratie 246 laat de sleutel (user_id, folder) vallen ten gunste van
  // (account_id, folder). Zonder deze tweede poging geeft PostgREST dan 42P10
  // en werkt "hoe ver terug" niet meer.
  const eerste = await supabase
    .from('email_sync_state')
    .upsert(rows, { onConflict: 'user_id,folder' })
  if (!eerste.error) return
  if (eerste.error.code !== '42P10' && !/no unique or exclusion constraint/i.test(eerste.error.message || '')) {
    throw new Error(eerste.error.message)
  }
  const perPostvak = await supabase
    .from('email_sync_state')
    .update({ backfill_target: target, backfill_done: false, updated_at: nu })
    .eq('user_id', session.user.id)
    .in('folder', ['inbox', 'verzonden'])
  if (perPostvak.error) throw new Error(perPostvak.error.message)
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
 * Migratie 245 herbouwt emails_list_view mét `account_id`. Zolang die niet
 * gedraaid is kent de view de kolom niet en moest het postvak per lijstlading
 * uit een tweede query komen (`metAccountKolom`). Vragen we hem gewoon op, dan
 * is dat straks één query in plaats van twee; ontbreekt hij nog, dan valt deze
 * module terug op de oude kolomlijst en die tweede query.
 */
const LIST_VIEW_COLUMNS_MET_ACCOUNT = `${LIST_VIEW_COLUMNS},account_id`

let viewHeeftAccount: boolean | null = null

function lijstKolommen(): string {
  return viewHeeftAccount === false ? LIST_VIEW_COLUMNS : LIST_VIEW_COLUMNS_MET_ACCOUNT
}

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
    const client = supabase
    const uid = await eigenUserId()
    if (!uid) return []
    const { data, error } = await lijstQuery<Record<string, unknown>>(null, (kolommen) => client
      .from('emails_list_view')
      .select(kolommen)
      .eq('user_id', uid)
      .order('datum', { ascending: false })
      .limit(limit) as unknown as PromiseLike<Uitkomst<Record<string, unknown>>>)
    if (error) throw error
    return (data || []).map(e => ({
      ...e,
      inhoud: '',
      body_html: null,
    })) as unknown as Email[]
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

type Uitkomst<T> = { data: T[] | null; error: unknown }

/**
 * Een query met postvakfilter, met terugval op dezelfde query zonder filter
 * zodra `account_id` niet blijkt te bestaan. Zo hoeft geen enkele aanroeper te
 * weten of migratie 245 al gedraaid is.
 */
async function metPostvak<T>(
  accountId: string | null | undefined,
  bouw: (accountId: string | null) => PromiseLike<Uitkomst<T>>,
): Promise<Uitkomst<T>> {
  const gekozen = accountId && accountKolomBekend !== false ? accountId : null
  const eerste = await bouw(gekozen)
  if (!gekozen) return eerste
  if (eerste.error && isOnbekendeKolom(eerste.error)) {
    accountKolomBekend = false
    return bouw(null)
  }
  if (!eerste.error) accountKolomBekend = true
  return eerste
}

/**
 * Een query op emails_list_view met de kolomlijst en het postvakfilter die op
 * dit moment mogelijk zijn. Ontbreekt `account_id` nog, dan gaat dezelfde query
 * opnieuw zonder de kolom en zonder het filter.
 */
async function lijstQuery<T>(
  accountId: string | null | undefined,
  bouw: (kolommen: string, accountId: string | null) => PromiseLike<Uitkomst<T>>,
): Promise<Uitkomst<T>> {
  const gekozen = accountId && accountKolomBekend !== false ? accountId : null
  const eerste = await bouw(lijstKolommen(), gekozen)
  if (!eerste.error) {
    if (viewHeeftAccount === null) viewHeeftAccount = true
    if (gekozen) accountKolomBekend = true
    return eerste
  }
  if (!isOnbekendeKolom(eerste.error)) return eerste
  viewHeeftAccount = false
  if (gekozen) accountKolomBekend = false
  return bouw(LIST_VIEW_COLUMNS, null)
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
export async function getEmailsPage(map: string, cursor: EmailPageCursor | null, limit = 100, accountId?: string | null, metPostvakKolom = false): Promise<Email[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const client = supabase
  const uid = await eigenUserId()
  if (!uid) return []

  // emails_list_view kent account_id, toegewezen_aan en toegewezen_op niet
  // (migratie 245 raakt de view niet aan), dus zodra er op postvak gefilterd
  // wordt loopt het via dezelfde twee stappen als Opvolgen: ids uit `emails`,
  // lijstkolommen uit de view.
  const viaTabel = MAPPEN_VIA_TABEL.has(map) || (!!accountId && accountKolomBekend !== false)
  if (viaTabel) {
    // account_id gaat mee zodra er toch al op postvak gefilterd wordt: de
    // regels moeten weten in welk postvak een mail binnenkwam. Zonder 245
    // bestaat de kolom niet, en dan komt deze tak hier niet eens langs.
    const extra = accountId ? 'id, account_id, wacht_op_reactie, beantwoord, toegewezen_aan, toegewezen_op' : 'id, wacht_op_reactie, beantwoord'
    const idsQ = pasMapFilterToe(
      metAccount(client.from('emails').select(extra).eq('user_id', uid) as unknown as LijstBouwer, accountId),
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
        return getEmailsPage(map, cursor, limit, null, metPostvakKolom)
      }
      throw error
    }
    if (accountId) accountKolomBekend = true
    type Vlaggen = { id: string; account_id?: string | null; wacht_op_reactie?: boolean; beantwoord?: boolean; toegewezen_aan?: string | null; toegewezen_op?: string | null }
    const vlaggen = new Map(((treffers || []) as unknown as Vlaggen[]).map((r, i) => [r.id, { i, r }]))
    if (vlaggen.size === 0) return []
    const { data: rijen, error: rijenErr } = await lijstQuery<Record<string, unknown>>(null, (kolommen) => client
      .from('emails_list_view')
      .select(kolommen)
      .in('id', [...vlaggen.keys()]) as unknown as PromiseLike<Uitkomst<Record<string, unknown>>>)
    if (rijenErr) throw rijenErr
    return ((rijen || []) as Array<Record<string, unknown>>)
      .sort((a, b) => (vlaggen.get(a.id as string)?.i ?? 0) - (vlaggen.get(b.id as string)?.i ?? 0))
      .map((e) => {
        const v = vlaggen.get(e.id as string)?.r
        return alsLijstItem({
          ...e,
          ...(v && 'account_id' in v ? { account_id: v.account_id ?? null } : {}),
          wacht_op_reactie: v?.wacht_op_reactie,
          beantwoord: v?.beantwoord,
          toegewezen_aan: v?.toegewezen_aan ?? null,
          toegewezen_op: v?.toegewezen_op ?? null,
        })
      })
  }

  const { data, error } = await lijstQuery<Record<string, unknown>>(null, (kolommen) => {
    const basis = pasMapFilterToe(
      client.from('emails_list_view').select(kolommen).eq('user_id', uid) as unknown as LijstBouwer,
      map,
    )
    if (!basis) return Promise.resolve({ data: [], error: null })
    return metCursor(basis, cursor)
      .order('datum', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit) as unknown as PromiseLike<Uitkomst<Record<string, unknown>>>
  })
  if (error) throw error
  const rijen = ((data || []) as Array<Record<string, unknown>>).map(alsLijstItem)
  // Heeft de view account_id al, dan zit het postvak in de rijen hierboven en
  // is de tweede query overbodig.
  return metPostvakKolom && viewHeeftAccount === false ? await metAccountKolom(client, rijen) : rijen
}

/**
 * Terugval zolang emails_list_view `account_id` niet kent (migratie 245 bouwt
 * de view opnieuw op mét die kolom): in de stand "Alle postvakken" zou een
 * regel anders nooit weten uit welk postvak hij komt. Eén lichte query erbij
 * vult dat aan. Alleen bij meer dan één postvak, anders is het een extra ronde
 * voor niets, en defensief: zonder 245 bestaat de kolom nog niet en gaat het
 * veld gewoon weer weg.
 */
async function metAccountKolom(client: NonNullable<typeof supabase>, rijen: Email[]): Promise<Email[]> {
  if (rijen.length === 0 || accountKolomBekend === false) return rijen
  const { data, error } = await client
    .from('emails')
    .select('id, account_id')
    .in('id', rijen.map((r) => r.id))
  if (error) {
    if (isOnbekendeKolom(error)) accountKolomBekend = false
    return rijen
  }
  accountKolomBekend = true
  const perId = new Map(((data || []) as Array<{ id: string; account_id: string | null }>).map((r) => [r.id, r.account_id]))
  return rijen.map((r) => (perId.has(r.id) ? { ...r, account_id: perId.get(r.id) ?? null } : r))
}

/** Alle berichten van één gesprek als lijst-items, oudste eerst. Concepten en prullenbak blijven eruit, net als in email_threads_view. */
export async function getThreadItems(threadId: string, accountId?: string | null): Promise<EmailLijstItem[]> {
  if (!threadId || !isSupabaseConfigured() || !supabase) return []
  const client = supabase
  const uid = await eigenUserId()
  if (!uid) return []
  const { data, error } = await lijstQuery<Record<string, unknown>>(accountId, (kolommen, acc) => {
    const basis = client
      .from('emails_list_view')
      .select(kolommen)
      .eq('user_id', uid)
      .eq('thread_id', threadId)
      .not('map', 'in', '("prullenbak","concepten")') as unknown as LijstBouwer
    return (acc ? basis.eq('account_id', acc) : basis)
      .order('datum', { ascending: true })
      .order('id', { ascending: true }) as unknown as PromiseLike<Uitkomst<Record<string, unknown>>>
  })
  if (error) throw error
  return (data || []) as unknown as EmailLijstItem[]
}

/** Thread-tellers van de server (email_threads_view) voor een reeks threads. */
export async function getThreadInfos(threadIds: string[], accountId?: string | null): Promise<ThreadInfo[]> {
  const uniek = [...new Set(threadIds.filter(Boolean))]
  if (uniek.length === 0 || !isSupabaseConfigured() || !supabase) return []
  const client = supabase
  const uid = await eigenUserId()
  if (!uid) return []
  const blokken: string[][] = []
  for (let i = 0; i < uniek.length; i += 100) blokken.push(uniek.slice(i, i + 100))
  type Rij = { thread_id: string; laatste_datum: string; aantal: number; ongelezen: number; laatste_email_id: string; deelnemers: string[] | null }
  const resultaten = await Promise.all(blokken.map(async (blok) => {
    // email_threads_view groepeert sinds migratie 245 óók op account_id, dus
    // zonder filter tellen twee postvakken van dezelfde gebruiker dubbel.
    const { data, error } = await metPostvak<Rij>(accountId, (acc) => {
      const basis = client
        .from('email_threads_view')
        .select('thread_id, laatste_datum, aantal, ongelezen, laatste_email_id, deelnemers')
        .eq('user_id', uid)
        .in('thread_id', blok) as unknown as LijstBouwer
      return (acc ? basis.eq('account_id', acc) : basis) as unknown as PromiseLike<Uitkomst<Rij>>
    })
    if (error) return []
    return (data || []) as Rij[]
  }))
  // In de stand "Alle postvakken" gaat de query zonder account_id-filter en
  // levert dezelfde thread één rij per postvak op. Die horen bij elkaar
  // opgeteld te worden; wie ze alleen mapt houdt de laatste rij over en toont
  // de teller van één postvak.
  const perThread = new Map<string, ThreadInfo>()
  for (const r of resultaten.flat()) {
    const bestaand = perThread.get(r.thread_id)
    if (!bestaand) {
      perThread.set(r.thread_id, {
        threadId: r.thread_id,
        laatsteDatum: r.laatste_datum,
        aantal: r.aantal,
        ongelezen: r.ongelezen,
        laatsteEmailId: r.laatste_email_id,
        deelnemers: r.deelnemers || [],
      })
      continue
    }
    const nieuwer = r.laatste_datum > bestaand.laatsteDatum
    perThread.set(r.thread_id, {
      threadId: r.thread_id,
      laatsteDatum: nieuwer ? r.laatste_datum : bestaand.laatsteDatum,
      aantal: bestaand.aantal + r.aantal,
      ongelezen: bestaand.ongelezen + r.ongelezen,
      laatsteEmailId: nieuwer ? r.laatste_email_id : bestaand.laatsteEmailId,
      deelnemers: [...new Set([...bestaand.deelnemers, ...(r.deelnemers || [])])],
    })
  }
  return [...perThread.values()]
}

/** Gezondheid van de eigen mailbox, uit email_sync_state (rij inbox). */
export async function getSyncStatus(): Promise<SyncStatus> {
  const standaard: SyncStatus = { status: 'ok' }
  if (!isSupabaseConfigured() || !supabase) return standaard
  const client = supabase
  const uid = await eigenUserId()
  if (!uid) return standaard
  // Geen maybeSingle: met twee postvakken staan er twee inbox-rijen en dan gaf
  // die PGRST116, waarna de banner permanent op "onbekend" stond. De slechtste
  // stand van de postvakken telt, want dat is de mailbox waar iets aan de hand
  // is.
  const haal = (kolommen: string) => client
    .from('email_sync_state')
    .select(kolommen)
    .eq('user_id', uid)
    .eq('folder', 'inbox')
  // account_id komt uit migratie 245; zonder die kolom faalt de hele select.
  let uitkomst = await haal('status, laatste_fout, laatste_succes_op, account_id')
  if (isOnbekendeKolom(uitkomst.error)) uitkomst = await haal('status, laatste_fout, laatste_succes_op')
  const { data, error } = uitkomst
  // Een fout hier is geen "alles goed": zonder migratie 244 bestaan deze
  // kolommen niet, en terugvallen op ok liet de banner zwijgen terwijl de sync
  // stilstond. Geen rij is wél normaal: die mailbox heeft nog nooit gesynct.
  if (error) return { status: 'onbekend', laatsteFout: 'Gezondheid niet op te halen' }
  type StatusRij = { status: string | null; laatste_fout: string | null; laatste_succes_op: string | null; account_id?: string | null }
  const rijen = (data || []) as unknown as StatusRij[]
  if (rijen.length === 0) return standaard
  // De CHECK in migratie 244 laat alleen ok, fout en uitgezet toe. Een waarde
  // die daar niet in staat komt tussen ok en fout: niet groen beweren, maar ook
  // geen storing melden die er niet is.
  const RANG: Record<string, number> = { ok: 0, fout: 2, uitgezet: 3 }
  const rang = (r: StatusRij) => RANG[r.status || 'ok'] ?? 1
  const ergste = rijen.reduce((a, b) => (rang(b) > rang(a) ? b : a))
  const successen = rijen
    .map((r) => r.laatste_succes_op)
    .filter((d): d is string => !!d)
    .sort()
  const laatsteSucces = successen[successen.length - 1]
  const bekend = ergste.status === 'ok' || ergste.status === 'fout' || ergste.status === 'uitgezet'
  return {
    status: bekend ? (ergste.status as SyncStatus['status']) : (ergste.status ? 'onbekend' : 'ok'),
    laatsteFout: ergste.laatste_fout || undefined,
    laatsteSucces: laatsteSucces || undefined,
    postvakId: ergste.account_id ?? null,
  }
}

/** PostgREST or-syntax gebruikt komma's en haakjes als structuur. */
function veiligeZoekterm(w: string): string {
  return w.replace(/[,%()"*]/g, '').trim()
}

export async function searchEmailsFTS(query: string, limit = 50, offset = 0, accountId?: string | null): Promise<Email[]> {
  if (!query.trim() || !isSupabaseConfigured() || !supabase) return []
  const client = supabase
  const uid = await eigenUserId()
  if (!uid) return []
  const filters = parseZoekQuery(query)
  // Zoeken bleef over alle postvakken gaan terwijl de lijst er één toonde.
  const postvak = accountId && accountKolomBekend !== false ? accountId : null

  // Alle filters buiten de vrije tekst gelden in beide rondes.
  type Bouwer = PostgrestFilterBuilder<any, any, any, any>
  const pasFiltersToe = (q: Bouwer): Bouwer => {
    let uit = q.eq('user_id', uid)
    if (postvak) uit = uit.eq('account_id', postvak)
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
  if (error) {
    // Zonder migratie 245 bestaat account_id niet; dan zoekt hij zoals altijd.
    if (postvak && isOnbekendeKolom(error)) {
      accountKolomBekend = false
      return searchEmailsFTS(query, limit, offset, null)
    }
    throw error
  }
  if (postvak) accountKolomBekend = true
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

  const { data: rijen, error: rijenErr } = await lijstQuery<Record<string, unknown>>(null, (kolommen) => client
    .from('emails_list_view')
    .select(kolommen)
    .in('id', ids) as unknown as PromiseLike<Uitkomst<Record<string, unknown>>>)
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
 * Migratie 244 verhuist de bodies naar email_bodies. Zolang die migratie niet
 * gedraaid is bestaat de tabel niet (42P01 of PGRST205) en staat de body nog
 * in emails.body_html. Zonder terugval was er dan geen enkele bron meer en
 * bleef elke mail leeg, want emails.body_html wordt nergens anders gelezen.
 * De uitkomst wordt onthouden zodat we niet elke ronde op een fout wachten,
 * maar niet voorgoed: draait de migratie terwijl er een tab openstaat, dan
 * bleef die tab uit `emails` lezen terwijl 244 body_html juist op NULL zet, en
 * kreeg elke mail een lege body. Na de wachttijd probeert hij het opnieuw.
 */
let bodiesTabelOntbreektTot = 0
const TABEL_ONTBREEKT_WACHTTIJD_MS = 5 * 60 * 1000

function bodiesTabelOntbreekt(): boolean {
  return Date.now() < bodiesTabelOntbreektTot
}

function markeerBodiesTabelOntbreekt(): void {
  bodiesTabelOntbreektTot = Date.now() + TABEL_ONTBREEKT_WACHTTIJD_MS
}

function tabelOntbreekt(fout: { code?: string; message?: string } | null | undefined): boolean {
  if (!fout) return false
  if (fout.code === '42P01' || fout.code === 'PGRST205' || fout.code === '42703' || fout.code === 'PGRST204') return true
  return /relation .* does not exist|could not find the table/i.test(fout.message || '')
}

/** Terugval voor een database zonder 244: de body zoals die er al staat. */
async function bodiesUitEmailsRijen(ids: string[]): Promise<BodyRij[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('emails')
    .select('id, body_html, body_text')
    .in('id', ids)
  if (error) return []
  return ((data || []) as Array<{ id: string; body_html: string | null; body_text: string | null }>)
    .map((r) => ({ email_id: r.id, body_html: r.body_html, body_text: r.body_text, quoted_html: null }))
}

/**
 * Leest bodies uit email_bodies (migratie 244). emails.body_html is sinds die
 * migratie leeg; wie daar nog leest krijgt altijd NULL en valt onnodig terug
 * op IMAP. Alleen rijen die bestaan komen terug: geen rij betekent "nog nooit
 * geparsed", en dat hoort via prefetch of read-email te lopen. Bestaat de
 * tabel nog niet, dan leest bodiesUitEmailsRijen wat er al in emails staat.
 */
export async function getEmailBodiesUitTabel(ids: string[]): Promise<EmailBody[]> {
  if (!ids.length || !isSupabaseConfigured() || !supabase) return []
  const client = supabase
  const blokken: string[][] = []
  for (let i = 0; i < ids.length; i += 100) blokken.push(ids.slice(i, i + 100))
  const resultaten = await Promise.all(blokken.map(async (blok) => {
    if (bodiesTabelOntbreekt()) return await bodiesUitEmailsRijen(blok)
    const { data, error } = await client
      .from('email_bodies')
      .select('email_id, body_html, body_text, quoted_html')
      .in('email_id', blok)
    if (tabelOntbreekt(error)) {
      markeerBodiesTabelOntbreekt()
      return await bodiesUitEmailsRijen(blok)
    }
    if (error) return []
    const rijen = (data || []) as BodyRij[]
    // Mail van vóór migratie 244 staat nog in emails.body_html: de tabel
    // bestaat dan wel maar heeft geen rij. Zonder deze aanvulling zou zo'n
    // mail leeg lijken tot hij opnieuw via IMAP is opgehaald.
    const gevonden = new Set(rijen.map((r) => r.email_id))
    const rest = blok.filter((id) => !gevonden.has(id))
    if (rest.length) rijen.push(...(await bodiesUitEmailsRijen(rest)))
    return rijen
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
      bodiesTabelOntbreekt()
        ? Promise.resolve({ data: null, error: null } as { data: { body_html: string | null; body_text: string | null } | null; error: { code?: string; message?: string } | null })
        : supabase.from('email_bodies').select('body_html, body_text').eq('email_id', id).maybeSingle(),
      supabase.from('emails').select('body_text, inhoud, attachment_meta').eq('id', id).maybeSingle(),
    ])
    if (metaQ.error) throw metaQ.error
    if (!metaQ.data) return null
    let bodyHtml = bodyQ.data?.body_html ?? null
    let bodyTekst = bodyQ.data?.body_text ?? null
    // Geen rij betekent: mail van vóór migratie 244, die staat nog in
    // emails.body_html. Ook dan terugvallen, anders lijkt de mail leeg.
    if (bodiesTabelOntbreekt() || tabelOntbreekt(bodyQ.error) || (!bodyQ.error && !bodyQ.data)) {
      // Alleen markeren bij een echte tabelfout: markeren op de latch zelf
      // verlengde hem bij elk gebruik, waardoor hij nooit verliep.
      if (tabelOntbreekt(bodyQ.error)) markeerBodiesTabelOntbreekt()
      const terugval = (await bodiesUitEmailsRijen([id]))[0]
      bodyHtml = terugval?.body_html ?? null
      bodyTekst = terugval?.body_text ?? bodyTekst
    }
    return {
      body_html: bodyHtml,
      body_text: bodyTekst ?? metaQ.data.body_text ?? null,
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
        bodiesTabelOntbreekt()
          ? Promise.resolve({ data: null, error: null } as { data: Array<{ email_id: string; body_html: string | null; body_text: string | null }> | null; error: { code?: string; message?: string } | null })
          : client.from('email_bodies').select('email_id, body_html, body_text').in('email_id', blok).not('body_html', 'is', null),
        client.from('emails').select('id, attachment_meta').in('id', blok),
      ])
      let rijen = (bodiesQ.data || []) as Array<{ email_id: string; body_html: string | null; body_text: string | null }>
      if (bodiesTabelOntbreekt() || tabelOntbreekt(bodiesQ.error)) {
        if (tabelOntbreekt(bodiesQ.error)) markeerBodiesTabelOntbreekt()
        rijen = (await bodiesUitEmailsRijen(blok)).filter((r) => r.body_html)
      } else if (bodiesQ.error) {
        return []
      } else {
        // Aanvullen wat nog in emails.body_html staat: mail van vóór 244 heeft
        // geen rij in email_bodies.
        const gevonden = new Set(rijen.map((r) => r.email_id))
        const rest = blok.filter((id) => !gevonden.has(id))
        if (rest.length) rijen = rijen.concat((await bodiesUitEmailsRijen(rest)).filter((r) => r.body_html))
      }
      const meta = new Map(((metaQ.data || []) as Array<{ id: string; attachment_meta: unknown[] | null }>).map((r) => [r.id, r.attachment_meta]))
      return rijen.map((r) => ({
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
export async function getEmailsMetAdres(adres: string, limit = 20, accountId?: string | null): Promise<Email[]> {
  const bareEmail = adres.trim().toLowerCase()
  if (!bareEmail) return []
  if (isSupabaseConfigured() && supabase) {
    const client = supabase
    const { data, error } = await lijstQuery<Record<string, unknown>>(accountId, (kolommen, acc) => {
      const basis = client
        .from('emails_list_view')
        .select(kolommen)
        .or(`from_address.ilike.%${bareEmail}%,van.ilike.%${bareEmail}%,aan.ilike.%${bareEmail}%`) as unknown as LijstBouwer
      return (acc ? basis.eq('account_id', acc) : basis)
        .order('datum', { ascending: false })
        .limit(limit) as unknown as PromiseLike<Uitkomst<Record<string, unknown>>>
    })
    if (error) throw error
    return (data || []).map(e => ({ ...e, inhoud: '', body_html: null })) as unknown as Email[]
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
