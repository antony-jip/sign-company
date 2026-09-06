import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'
import { logger } from '@/utils/logger'
import type { Postvak, PostvakSoort } from '@/lib/mail/types'

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

export interface PostvakInvoer {
  /** Bestaand postvak bijwerken. Leeg laten koppelt er een nieuwe. */
  accountId?: string
  adres: string
  /** Leeg = wachtwoord ongewijzigd; de server houdt de opgeslagen versie. */
  wachtwoord: string
  smtpHost: string
  smtpPort: number
  imapHost: string
  imapPort: number
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
  const vooraf = invoer.accountId ? [] : await getPostvakken().catch(() => [])

  const res = await fetch('/api/email-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      ...(invoer.accountId ? { account_id: invoer.accountId } : {}),
      gmail_address: invoer.adres,
      app_password: invoer.wachtwoord || 'UNCHANGED',
      smtp_host: invoer.smtpHost || 'smtp.gmail.com',
      smtp_port: invoer.smtpPort || 587,
      imap_host: invoer.imapHost || 'imap.gmail.com',
      imap_port: invoer.imapPort || 993,
    }),
  })
  if (!res.ok) {
    const fout: { error?: string } = await res.json().catch(() => ({}))
    throw new Error(fout?.error || `Opslaan mislukt: ${res.status}`)
  }

  if (invoer.accountId || vooraf.length === 0) return
  const na = await getPostvakken().catch(() => [])
  if (na.length <= vooraf.length) {
    throw new Error('De server heeft geen tweede postvak aangemaakt. Controleer je bestaande postvak: mogelijk is dat bijgewerkt in plaats van dat er een postvak bij kwam.')
  }
}

function vertaalFout(fout: unknown): string {
  if (isZonder245(fout)) return 'Meerdere postvakken staan nog niet aan in de database'
  return (fout as { message?: string })?.message || 'Opslaan mislukt'
}
