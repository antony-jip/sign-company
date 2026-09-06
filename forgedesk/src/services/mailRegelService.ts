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

/**
 * De eerste passende, actieve regel. Volgorde telt: bovenaan wint.
 *
 * Een regel met een postvak vergelijkt met het postvak waar de mail binnenkwam
 * (`item.account_id`), niet met wat er in de UI geselecteerd staat. Dat laatste
 * viel bij "Alle postvakken" helemaal weg, zodat een regel voor postvak A ook
 * de mail van postvak B raakte. `account_id` komt uit migratie 245: zolang dat
 * veld ontbreekt is het postvak onbekend en slaan we de regel over, want gokken
 * betekent hier archiveren in het verkeerde postvak.
 */
export function eersteRegelVoor(regels: MailRegel[], item: EmailLijstItem, _uiPostvak?: string | null): MailRegel | null {
  for (const regel of regels) {
    if (!regel.actief || !heeftVoorwaarde(regel)) continue
    if (regel.accountId && regel.accountId !== item.account_id) continue
    if (regelPast(regel, item)) return regel
  }
  return null
}

// ─── Wat al gedraaid heeft ───────────────────────────────────────

const GEZIEN_SLEUTEL_BASIS = 'doen_mail_regels_gezien'
const GEZIEN_MAX = 500

/**
 * `email_regels` heeft geen kolom om per mail vast te leggen dat de regels
 * gedraaid hebben, dus houdt de browser de laatste 500 ids bij.
 *
 * De lijst staat in het geheugen en is daar leidend; localStorage is de kopie
 * die een herlaad overleeft. Dat moet wel, want markeren is synchroon: wie de
 * lijst leest, awaits doet en pas daarna terugschrijft, laat een tweede ronde
 * dezelfde mail nog een keer archiveren. Na `markeerGezien(ids)` geeft
 * `isGezien(id)` meteen true, ook vóór de eerstvolgende await.
 */
// Nieuwste eerst. Knippen op GEZIEN_MAX gooit dus de oudste weg; andersom
// verloor de lijst precies de mail die net binnenkwam, want zowel laadMap als
// pasRegelsToe lopen van nieuw naar oud.
let gezienLijst: string[] = []
const gezienIds = new Set<string>()
let gezienGeladen: Promise<void> | null = null
let gezienSleutel: string | null = null

/**
 * De sleutel hangt aan de gebruiker: op een gedeeld apparaat mag de volgende
 * eigenaar de lijst van de vorige niet erven, want dan zwijgen zijn regels
 * over mail die hij nog nooit gezien heeft. De oude, ongescopete sleutel wordt
 * één keer overgenomen en daarna opgeruimd.
 */
async function bepaalGezienSleutel(): Promise<string> {
  try {
    if (!supabase) return GEZIEN_SLEUTEL_BASIS
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    return userId ? `${GEZIEN_SLEUTEL_BASIS}_${userId}` : GEZIEN_SLEUTEL_BASIS
  } catch {
    return GEZIEN_SLEUTEL_BASIS
  }
}

/**
 * Eén keer per sessie de bewaarde lijst in het geheugen zetten. Await dit
 * vóór de eerste isGezien: het user-id komt uit een async sessie-lees.
 */
export function zorgVoorGezien(): Promise<void> {
  if (gezienGeladen) return gezienGeladen
  gezienGeladen = (async () => {
    gezienSleutel = await bepaalGezienSleutel()
    neemOverUitStorage(gezienSleutel)
    if (gezienSleutel !== GEZIEN_SLEUTEL_BASIS) {
      neemOverUitStorage(GEZIEN_SLEUTEL_BASIS)
      try { localStorage.removeItem(GEZIEN_SLEUTEL_BASIS) } catch { /* storage geblokkeerd */ }
    }
    bewaarGezien()
  })()
  return gezienGeladen
}

function neemOverUitStorage(sleutel: string): void {
  try {
    const rauw = localStorage.getItem(sleutel)
    if (!rauw) return
    const lijst = JSON.parse(rauw)
    if (!Array.isArray(lijst)) return
    // Wat deze sessie al markeerde is nieuwer dan wat er opgeslagen stond.
    const bewaard = lijst.map(String).filter((id) => !gezienIds.has(id))
    for (const id of bewaard) gezienIds.add(id)
    gezienLijst = [...gezienLijst, ...bewaard]
  } catch { /* storage geblokkeerd */ }
}

function bewaarGezien(): void {
  if (!gezienSleutel) return
  try {
    localStorage.setItem(gezienSleutel, JSON.stringify(gezienLijst))
  } catch { /* storage geblokkeerd */ }
}

function knipEnBewaar(): void {
  if (gezienLijst.length > GEZIEN_MAX) {
    for (const id of gezienLijst.slice(GEZIEN_MAX)) gezienIds.delete(id)
    gezienLijst = gezienLijst.slice(0, GEZIEN_MAX)
  }
  bewaarGezien()
}

export function isGezien(id: string): boolean {
  void zorgVoorGezien()
  return gezienIds.has(id)
}

/**
 * Synchroon markeren: geen await tussen het besluit en de vastlegging. De ids
 * komen nieuwste eerst binnen en gaan vooraan de lijst in, zodat knippen de
 * oudste laat vallen en niet de mail van vanochtend.
 */
export function markeerGezien(ids: Iterable<string>): void {
  void zorgVoorGezien()
  const nieuw: string[] = []
  for (const id of ids) {
    if (gezienIds.has(id)) continue
    gezienIds.add(id)
    nieuw.push(id)
  }
  if (nieuw.length === 0) return
  gezienLijst = [...nieuw, ...gezienLijst]
  knipEnBewaar()
}

/** "Nu toepassen" moet een mail opnieuw langs de regels kunnen sturen. */
export function vergeetGezien(ids: Iterable<string>): void {
  void zorgVoorGezien()
  let iets = false
  for (const id of ids) if (gezienIds.delete(id)) iets = true
  if (!iets) return
  gezienLijst = gezienLijst.filter((id) => gezienIds.has(id))
  bewaarGezien()
}

/**
 * Ids die op dit moment door de regels lopen. Een tweede ronde (realtime en
 * een herlaad tegelijk) mag dezelfde mail niet nog eens pakken zolang de
 * acties van de eerste ronde nog in de lucht hangen.
 */
export const idsInBehandeling = new Set<string>()

/** Claimt de ids die nog vrij zijn en geeft precies die terug. */
export function neemInBehandeling(ids: Iterable<string>): string[] {
  const genomen: string[] = []
  for (const id of ids) {
    if (idsInBehandeling.has(id)) continue
    idsInBehandeling.add(id)
    genomen.push(id)
  }
  return genomen
}

export function laatLos(ids: Iterable<string>): void {
  for (const id of ids) idsInBehandeling.delete(id)
}

// De sessie-lees is async; alvast starten scheelt de eerste ronde een lege lijst.
void zorgVoorGezien()

/** @deprecated Gebruik isGezien; deze kopie loopt achter zodra er een await tussen zit. */
export function leesGezien(): Set<string> {
  void zorgVoorGezien()
  return new Set(gezienIds)
}

/** @deprecated Gebruik markeerGezien of vergeetGezien. */
export function schrijfGezien(ids: Iterable<string>): void {
  void zorgVoorGezien()
  const binnen = [...ids].map(String)
  const binnenSet = new Set(binnen)
  for (const id of [...gezienIds]) if (!binnenSet.has(id)) gezienIds.delete(id)
  const nieuw = binnen.filter((id) => !gezienIds.has(id))
  for (const id of nieuw) gezienIds.add(id)
  // Wat er nieuw bij komt is per definitie het verste; dat mag het knippen
  // niet als eerste kwijtraken, welke volgorde de aanroeper ook aanhield.
  gezienLijst = [...nieuw, ...gezienLijst.filter((id) => binnenSet.has(id))]
  knipEnBewaar()
}
