import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'
import { logger } from '@/utils/logger'
import type { Postvak, PostvakSoort, SyncStatus } from '@/lib/mail/types'

/**
 * De postvakken van deze gebruiker plus de gedeelde postvakken van de
 * organisatie (`user_email_settings`, migratie 245).
 *
 * 245 is op het moment van schrijven nog niet gedraaid, en er is meer aan de
 * hand dan een ontbrekende kolom: migratie 160 heeft het tabelbrede SELECT op
 * `user_email_settings` ingetrokken en per kolom opnieuw uitgedeeld. Een kolom
 * die er later bij komt erft die grant niet, dus zelfs ná 245 kan een select op
 * `naam` of `soort` afketsen op 42501 (geen rechten) in plaats van op 42703
 * (kolom bestaat niet). Beide gevallen, en PGRST204 uit de schema-cache, leiden
 * hier naar hetzelfde antwoord: één persoonlijk postvak met het adres als naam.
 */

/** Foutcodes die betekenen: de 245-kolommen zijn er (voor ons) niet. */
const ZONDER_245 = new Set(['42703', 'PGRST204', 'PGRST202', '42501'])

export function isZonder245(fout: unknown): boolean {
  const code = (fout as { code?: string } | null)?.code
  if (code && ZONDER_245.has(code)) return true
  const melding = (fout as { message?: string } | null)?.message || ''
  return /column .* does not exist|permission denied for (column|table)/i.test(melding)
}

const KOLOMMEN_245 = 'id, gmail_address, naam, is_standaard, soort, organisatie_id, user_id'

/**
 * Of de 245-kolommen bij de laatste ophaalronde leesbaar waren. `null` zolang
 * er nog niets is opgehaald. De instellingen-UI hangt haar postvakkenlijst
 * hieraan op: zonder die kolommen is er per definitie één postvak en hoort er
 * geen lijst en geen "Postvak toevoegen" te staan.
 */
let kolommen245Leesbaar: boolean | null = null

export function postvakkenUitgebreid(): boolean {
  return kolommen245Leesbaar === true
}

type Rij = {
  id: string
  gmail_address?: string | null
  naam?: string | null
  is_standaard?: boolean | null
  soort?: string | null
  organisatie_id?: string | null
  user_id?: string | null
}

function naarPostvak(rij: Rij): Postvak {
  const adres = rij.gmail_address || ''
  const soort: PostvakSoort = rij.soort === 'gedeeld' ? 'gedeeld' : 'persoonlijk'
  return {
    id: rij.id,
    adres,
    naam: (rij.naam || '').trim() || adres || 'Postvak',
    soort,
    isStandaard: rij.is_standaard ?? true,
    organisatieId: rij.organisatie_id || undefined,
  }
}

/** Het ene postvak van vóór migratie 245: adres uit de kolom die wél leesbaar is. */
async function enkelPostvak(userId: string): Promise<Postvak[]> {
  kolommen245Leesbaar = false
  if (!supabase) return []
  const { data, error } = await supabase
    .from('user_email_settings')
    .select('id, gmail_address')
    .eq('user_id', userId)
    .order('id')
  if (error || !data?.length) return []
  return (data as Rij[]).map((rij) => ({
    id: rij.id,
    adres: rij.gmail_address || '',
    naam: rij.gmail_address || 'Postvak',
    soort: 'persoonlijk' as const,
    isStandaard: true,
  }))
}

export async function getPostvakken(): Promise<Postvak[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const client = supabase
  const { data: { session } } = await client.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return []

  const orgId = await getOrgId().catch(() => undefined)
  let query = client.from('user_email_settings').select(KOLOMMEN_245)
  // Gedeelde postvakken van de organisatie horen er ook bij; RLS bepaalt wat
  // er daadwerkelijk uit komt, dus dit filter is een verzoek, geen belofte.
  query = orgId
    ? query.or(`user_id.eq.${userId},and(soort.eq.gedeeld,organisatie_id.eq.${orgId})`)
    : query.eq('user_id', userId)

  const { data, error } = await query.order('is_standaard', { ascending: false }).order('id')
  if (error) {
    if (!isZonder245(error)) logger.warn('Postvakken ophalen mislukt:', error)
    return enkelPostvak(userId)
  }

  const postvakken = ((data || []) as unknown as Rij[]).map(naarPostvak)
  if (postvakken.length === 0) return enkelPostvak(userId)
  kolommen245Leesbaar = true
  if (!postvakken.some((p) => p.isStandaard)) postvakken[0].isStandaard = true
  return postvakken
}

/**
 * Eén postvak als standaard aanwijzen. Schrijven naar `user_email_settings`
 * gaat normaal via api/email-settings (service_role); UPDATE staat voor de
 * eigenaar wel open onder de RLS-policy uit migratie 037.
 */
export async function zetStandaard(id: string): Promise<void> {
  if (!supabase) throw new Error('Geen verbinding')
  const client = supabase
  const { data: { session } } = await client.auth.getSession()
  const userId = session?.user?.id
  if (!userId) throw new Error('Niet ingelogd')

  const uit = await client.from('user_email_settings').update({ is_standaard: false }).eq('user_id', userId).neq('id', id)
  if (uit.error) throw new Error(vertaalFout(uit.error))
  const aan = await client.from('user_email_settings').update({ is_standaard: true }).eq('id', id)
  if (aan.error) throw new Error(vertaalFout(aan.error))
}

export async function hernoem(id: string, naam: string): Promise<void> {
  if (!supabase) throw new Error('Geen verbinding')
  const schoon = naam.trim().slice(0, 60)
  if (!schoon) throw new Error('Geef het postvak een naam')
  const { error } = await supabase.from('user_email_settings').update({ naam: schoon }).eq('id', id)
  if (error) throw new Error(vertaalFout(error))
}

/**
 * De gezondheid per postvak, uit `email_sync_state` (rij inbox). `account_id`
 * op die tabel komt uit migratie 245: zonder die kolom is er één rij voor de
 * hele gebruiker, en dan krijgt elk postvak diezelfde stand. Postvakken zonder
 * rij hebben nog nooit gesynchroniseerd en staan er niet in.
 */
export async function getPostvakGezondheid(postvakken: Postvak[]): Promise<Record<string, SyncStatus>> {
  if (!isSupabaseConfigured() || !supabase || postvakken.length === 0) return {}
  const client = supabase
  const { data: { session } } = await client.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return {}

  const alsStatus = (rij: { status?: string | null; laatste_fout?: string | null; laatste_succes_op?: string | null }): SyncStatus => ({
    status: (rij.status as SyncStatus['status']) || 'ok',
    laatsteFout: rij.laatste_fout || undefined,
    laatsteSucces: rij.laatste_succes_op || undefined,
  })

  const perPostvak = await client
    .from('email_sync_state')
    .select('account_id, status, laatste_fout, laatste_succes_op')
    .eq('user_id', userId)
    .eq('folder', 'inbox')
  if (!perPostvak.error) {
    const uit: Record<string, SyncStatus> = {}
    type Gezondheidsrij = { account_id: string | null; status?: string | null; laatste_fout?: string | null; laatste_succes_op?: string | null }
    for (const rij of (perPostvak.data || []) as Gezondheidsrij[]) {
      if (rij.account_id) uit[rij.account_id] = alsStatus(rij)
    }
    if (Object.keys(uit).length > 0) return uit
  }

  const enkel = await client
    .from('email_sync_state')
    .select('status, laatste_fout, laatste_succes_op')
    .eq('user_id', userId)
    .eq('folder', 'inbox')
    .limit(1)
    .maybeSingle()
  if (enkel.error || !enkel.data) return {}
  const status = alsStatus(enkel.data)
  return Object.fromEntries(postvakken.map((p) => [p.id, status]))
}

export interface PostvakInvoer {
  /** Bestaand postvak bijwerken. Leeg laten koppelt er een nieuwe. */
  accountId?: string
  /** Expliciet een postvak toevoegen. Zonder dit werkt de server het bestaande
   *  postvak bij, ook als het adres in het formulier gewijzigd is (van mailbox
   *  wisselen). Alleen de UI weet welke van de twee bedoeld is. */
  nieuw?: boolean
  adres: string
  /** Leeg = wachtwoord ongewijzigd; de server houdt de opgeslagen versie. */
  wachtwoord: string
  smtpHost: string
  smtpPort: number
  imapHost: string
  imapPort: number
  /** Team-inbox: iedereen in de organisatie leest en beantwoordt mee. Alleen
   *  een beheerder mag dit; de server controleert dat en niet dit veld. */
  gedeeld?: boolean
}

async function sessieToken(): Promise<string> {
  if (!supabase) throw new Error('Geen verbinding')
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Niet ingelogd')
  return token
}

/**
 * Opslaan loopt via api/email-settings: alleen de server heeft de sleutel om
 * het wachtwoord te versleutelen. Met `accountId` werkt hij dat ene postvak
 * bij, zonder id maakt hij een nieuwe rij als er al één staat.
 *
 * Een server die dat laatste nog niet kan zou de bestaande rij bijwerken in
 * plaats van er een toe te voegen. Dat gaat hier niet stil voorbij: bij een
 * nieuw postvak telt deze functie de postvakken vóór en na, en meldt het als
 * er niets bijgekomen is.
 */
export async function slaPostvakOp(invoer: PostvakInvoer): Promise<void> {
  const token = await sessieToken()
  const vooraf = invoer.nieuw ? await getPostvakken().catch(() => []) : []

  const res = await fetch('/api/email-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      ...(invoer.accountId ? { account_id: invoer.accountId } : {}),
      ...(invoer.nieuw ? { nieuw: true } : {}),
      ...(invoer.gedeeld ? { soort: 'gedeeld' } : {}),
      gmail_address: invoer.adres,
      app_password: invoer.wachtwoord || 'UNCHANGED',
      smtp_host: invoer.smtpHost || 'smtp.gmail.com',
      smtp_port: invoer.smtpPort || 587,
      imap_host: invoer.imapHost || 'imap.gmail.com',
      imap_port: invoer.imapPort || 993,
    }),
  })
  const antwoord: { error?: string; account_id?: string | null } = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(antwoord?.error || `Opslaan mislukt: ${res.status}`)

  if (!invoer.nieuw || vooraf.length === 0) return
  const bekend = new Set(vooraf.map((p) => p.id))
  if (antwoord.account_id && bekend.has(antwoord.account_id)) {
    throw new Error('De server heeft je bestaande postvak bijgewerkt in plaats van er een toe te voegen. Een tweede postvak kan pas nadat migratie 246 gedraaid is; controleer het adres van je postvak hierboven.')
  }
  const na = await getPostvakken().catch(() => [])
  if (na.length <= vooraf.length) {
    throw new Error('De server heeft geen tweede postvak aangemaakt. Controleer je bestaande postvak: mogelijk is dat bijgewerkt in plaats van dat er een postvak bij kwam.')
  }
}

/**
 * Eén postvak ontkoppelen. De mail blijft staan: DELETE haalt alleen de rij uit
 * `user_email_settings` weg, dus de koppeling en het wachtwoord. Zonder id
 * weigert de server zodra er meer postvakken zijn, want dan is niet te zien
 * welke bedoeld wordt.
 */
export async function ontkoppelPostvak(accountId?: string): Promise<void> {
  const token = await sessieToken()
  const url = accountId ? `/api/email-settings?account_id=${encodeURIComponent(accountId)}` : '/api/email-settings'
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const fout: { error?: string } = await res.json().catch(() => ({}))
    throw new Error(fout?.error || `Ontkoppelen mislukt: ${res.status}`)
  }
}

function vertaalFout(fout: unknown): string {
  if (isZonder245(fout)) return 'Meerdere postvakken staan nog niet aan in de database'
  return (fout as { message?: string })?.message || 'Opslaan mislukt'
}
