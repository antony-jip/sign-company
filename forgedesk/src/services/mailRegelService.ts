import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'
import { logger } from '@/utils/logger'
import type { EmailLijstItem } from '@/lib/mail/types'

/**
 * Regels op binnenkomende mail (`email_regels`, migratie 245). Toepassen
 * gebeurt voorlopig in de browser: zie LOGBOEK.md, dit hoort op termijn in de
 * sync-werker thuis omdat een regel anders alleen draait op het apparaat dat
 * op dat moment openstaat.
 */

export interface RegelVoorwaarden {
  afzenderBevat?: string
  onderwerpBevat?: string
  domeinIs?: string
  heeftBijlage?: boolean
  aanBevat?: string
}

export interface RegelActies {
  archiveren?: boolean
  label?: string
  markeerGelezen?: boolean
  projectId?: string
  toewijzenAan?: string
}

export interface MailRegel {
  id: string
  naam: string
  volgorde: number
  actief: boolean
  accountId: string | null
  voorwaarden: RegelVoorwaarden
  acties: RegelActies
}

export const VOORWAARDE_LABELS: { sleutel: keyof RegelVoorwaarden; label: string; soort: 'tekst' | 'schakelaar' }[] = [
  { sleutel: 'afzenderBevat', label: 'Afzender bevat', soort: 'tekst' },
  { sleutel: 'onderwerpBevat', label: 'Onderwerp bevat', soort: 'tekst' },
  { sleutel: 'domeinIs', label: 'Domein is', soort: 'tekst' },
  { sleutel: 'aanBevat', label: 'Aan-adres bevat', soort: 'tekst' },
  { sleutel: 'heeftBijlage', label: 'Heeft bijlage', soort: 'schakelaar' },
]

function ontbreekt(fout: unknown): boolean {
  const code = (fout as { code?: string } | null)?.code
  if (code === '42P01' || code === 'PGRST205' || code === '42703' || code === 'PGRST204') return true
  return /relation .* does not exist|could not find the table/i.test((fout as { message?: string } | null)?.message || '')
}

let tabelOk: boolean | null = null

export function regelsBeschikbaar(): boolean {
  return tabelOk !== false
}

const KOLOMMEN = 'id, naam, volgorde, actief, account_id, voorwaarden, acties'

function naarRegel(rij: Record<string, unknown>): MailRegel {
  return {
    id: String(rij.id),
    naam: String(rij.naam ?? ''),
    volgorde: Number(rij.volgorde ?? 0),
    actief: rij.actief !== false,
    accountId: (rij.account_id as string | null) ?? null,
    voorwaarden: (rij.voorwaarden as RegelVoorwaarden) || {},
    acties: (rij.acties as RegelActies) || {},
  }
}

export async function getRegels(): Promise<MailRegel[]> {
  if (!isSupabaseConfigured() || !supabase || tabelOk === false) return []
  const { data, error } = await supabase
    .from('email_regels')
    .select(KOLOMMEN)
    .order('volgorde', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) {
    if (ontbreekt(error)) { tabelOk = false; return [] }
    logger.warn('Regels ophalen mislukt:', error)
    return []
  }
  tabelOk = true
  return ((data || []) as Array<Record<string, unknown>>).map(naarRegel)
}

export async function maakRegel(regel: Omit<MailRegel, 'id'>): Promise<MailRegel> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Geen verbinding')
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) throw new Error('Niet ingelogd')
  const organisatieId = await getOrgId()
  if (!organisatieId) throw new Error('Geen organisatie')
  const { data, error } = await supabase
    .from('email_regels')
    .insert({
      organisatie_id: organisatieId,
      user_id: userId,
      account_id: regel.accountId,
      naam: regel.naam,
      volgorde: regel.volgorde,
      actief: regel.actief,
      voorwaarden: regel.voorwaarden,
      acties: regel.acties,
    })
    .select(KOLOMMEN)
    .single()
  if (error) {
    if (ontbreekt(error)) { tabelOk = false; throw new Error('Regels staan nog niet aan in de database') }
    throw new Error(error.message)
  }
  return naarRegel(data as Record<string, unknown>)
}

export async function wijzigRegel(id: string, deel: Partial<Omit<MailRegel, 'id'>>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Geen verbinding')
  const rij: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (deel.naam !== undefined) rij.naam = deel.naam
  if (deel.volgorde !== undefined) rij.volgorde = deel.volgorde
  if (deel.actief !== undefined) rij.actief = deel.actief
  if (deel.accountId !== undefined) rij.account_id = deel.accountId
  if (deel.voorwaarden !== undefined) rij.voorwaarden = deel.voorwaarden
  if (deel.acties !== undefined) rij.acties = deel.acties
  const { error } = await supabase.from('email_regels').update(rij).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function verwijderRegel(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase.from('email_regels').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Nieuwe volgorde wegschrijven na slepen; één update per verschoven regel. */
export async function herordenRegels(ids: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const client = supabase
  await Promise.all(ids.map((id, i) => client.from('email_regels').update({ volgorde: i }).eq('id', id)))
}

// ─── Toepassen ───────────────────────────────────────────────────

function bevat(waarde: string | null | undefined, naald: string | undefined): boolean {
  if (!naald) return true
  return (waarde || '').toLowerCase().includes(naald.trim().toLowerCase())
}

function domeinVan(adres: string | null | undefined): string {
  const m = /@([^\s>@]+)/.exec(adres || '')
  return m ? m[1].toLowerCase() : ''
}

/** Voldoet deze mail aan alle ingevulde voorwaarden van de regel? */
export function regelPast(regel: MailRegel, item: EmailLijstItem): boolean {
  const v = regel.voorwaarden
  if (!bevat(`${item.van || ''} ${item.from_address || ''} ${item.from_name || ''}`, v.afzenderBevat)) return false
  if (!bevat(item.onderwerp, v.onderwerpBevat)) return false
  if (!bevat(item.aan, v.aanBevat)) return false
  if (v.domeinIs) {
    const doel = v.domeinIs.trim().toLowerCase().replace(/^@/, '')
    const bron = domeinVan(item.from_address || item.van)
    if (!doel || bron !== doel) return false
  }
  if (v.heeftBijlage && !(item.bijlagen > 0 || item.has_attachments)) return false
  return true
}

/** Een regel zonder enige voorwaarde zou alles raken; die slaan we over. */
export function heeftVoorwaarde(regel: MailRegel): boolean {
  const v = regel.voorwaarden
  return !!(v.afzenderBevat?.trim() || v.onderwerpBevat?.trim() || v.domeinIs?.trim() || v.aanBevat?.trim() || v.heeftBijlage)
}

/** De eerste passende, actieve regel. Volgorde telt: bovenaan wint. */
export function eersteRegelVoor(regels: MailRegel[], item: EmailLijstItem, accountId: string | null): MailRegel | null {
  for (const regel of regels) {
    if (!regel.actief || !heeftVoorwaarde(regel)) continue
    if (regel.accountId && accountId && regel.accountId !== accountId) continue
    if (regelPast(regel, item)) return regel
  }
  return null
}

// ─── Wat al gedraaid heeft ───────────────────────────────────────

const GEZIEN_SLEUTEL = 'doen_mail_regels_gezien'
const GEZIEN_MAX = 500

/**
 * `email_regels` heeft geen kolom om per mail vast te leggen dat de regels
 * gedraaid hebben, dus houdt de browser de laatste 500 ids bij. Genoeg om te
 * voorkomen dat een regel bij elke herlaad opnieuw archiveert.
 */
export function leesGezien(): Set<string> {
  try {
    const rauw = localStorage.getItem(GEZIEN_SLEUTEL)
    if (!rauw) return new Set()
    const lijst = JSON.parse(rauw)
    return Array.isArray(lijst) ? new Set(lijst.map(String)) : new Set()
  } catch {
    return new Set()
  }
}

export function schrijfGezien(ids: Iterable<string>): void {
  try {
    const lijst = [...ids].slice(-GEZIEN_MAX)
    localStorage.setItem(GEZIEN_SLEUTEL, JSON.stringify(lijst))
  } catch { /* storage geblokkeerd */ }
}
