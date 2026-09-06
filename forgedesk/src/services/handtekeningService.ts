import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getOrgId } from './supabaseHelpers'

/**
 * Meerdere handtekeningen per gebruiker (migratie 248).
 *
 * Zolang die migratie niet gedraaid is bestaat de tabel niet. Dan levert dit
 * bestand één handtekening op basis van het profiel, precies zoals de app het
 * altijd deed. Geen enkele aanroeper hoeft te weten in welke wereld hij leeft.
 */
export interface Handtekening {
  id: string
  naam: string
  inhoud: string
  afbeeldingUrl: string | null
  afbeeldingLink: string | null
  afbeeldingBreedte: number | null
  isStandaard: boolean
  /** Hangt hij aan één postvak, dan wint hij zodra je vanuit dat postvak mailt. */
  accountId: string | null
  volgorde: number
}

/** Het profiel als enige handtekening: de wereld van vóór migratie 248. */
export interface ProfielHandtekening {
  inhoud: string
  afbeeldingUrl: string | null
  afbeeldingLink: string | null
  afbeeldingBreedte: number | null
}

/** Ontbreekt de tabel (248 niet gedraaid) of mag deze gebruiker er niet bij. */
function isTabelOntbreekt(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  return fout.code === '42P01' || fout.code === '42703' || fout.code === 'PGRST204' || fout.code === '42501'
    || /relation .* does not exist|column .* does not exist|could not find the .* column/i.test(fout.message || '')
}

let tabelBestaat: boolean | null = null

type Rij = {
  id: string
  naam: string
  inhoud: string | null
  afbeelding_url: string | null
  afbeelding_link: string | null
  afbeelding_breedte: number | null
  is_standaard: boolean
  account_id: string | null
  volgorde: number
}

function alsHandtekening(r: Rij): Handtekening {
  return {
    id: r.id,
    naam: r.naam,
    inhoud: r.inhoud || '',
    afbeeldingUrl: r.afbeelding_url,
    afbeeldingLink: r.afbeelding_link,
    afbeeldingBreedte: r.afbeelding_breedte,
    isStandaard: r.is_standaard,
    accountId: r.account_id,
    volgorde: r.volgorde,
  }
}

/**
 * Alle handtekeningen van de ingelogde gebruiker, in de volgorde die hij zelf
 * heeft gezet. Lege lijst betekent: er is er geen, val terug op het profiel.
 */
export async function getHandtekeningen(): Promise<Handtekening[]> {
  if (!isSupabaseConfigured() || !supabase || tabelBestaat === false) return []
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return []
  const { data, error } = await supabase
    .from('email_handtekeningen')
    .select('id, naam, inhoud, afbeelding_url, afbeelding_link, afbeelding_breedte, is_standaard, account_id, volgorde')
    .eq('user_id', user.id)
    .order('volgorde', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) {
    if (isTabelOntbreekt(error)) tabelBestaat = false
    return []
  }
  tabelBestaat = true
  return ((data || []) as Rij[]).map(alsHandtekening)
}

/**
 * Welke handtekening hoort bij dit bericht: die van het postvak waaruit je
 * mailt, anders de standaard, anders de eerste. Geen enkele: dan valt de
 * aanroeper terug op het profiel.
 */
export function kiesHandtekening(lijst: Handtekening[], accountId?: string | null): Handtekening | null {
  if (lijst.length === 0) return null
  if (accountId) {
    const vanPostvak = lijst.find((h) => h.accountId === accountId)
    if (vanPostvak) return vanPostvak
  }
  return lijst.find((h) => h.isStandaard) ?? lijst[0]
}

export async function bewaarHandtekening(h: Partial<Handtekening> & { naam: string }): Promise<Handtekening | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) throw new Error('Niet ingelogd')
  const orgId = await getOrgId()
  const velden = {
    user_id: user.id,
    organisatie_id: orgId ?? null,
    naam: h.naam,
    inhoud: h.inhoud ?? '',
    afbeelding_url: h.afbeeldingUrl ?? null,
    afbeelding_link: h.afbeeldingLink ?? null,
    afbeelding_breedte: h.afbeeldingBreedte ?? null,
    account_id: h.accountId ?? null,
    volgorde: h.volgorde ?? 0,
    updated_at: new Date().toISOString(),
  }
  const uitkomst = h.id
    ? await supabase.from('email_handtekeningen').update(velden).eq('id', h.id).select().single()
    : await supabase.from('email_handtekeningen').insert(velden).select().single()
  if (uitkomst.error) throw new Error(uitkomst.error.message)
  return alsHandtekening(uitkomst.data as Rij)
}

export async function verwijderHandtekening(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase.from('email_handtekeningen').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Eén handtekening tot standaard maken. Er is een unieke index op één standaard
 * per gebruiker, dus eerst de andere uitzetten en dan deze aan; andersom zou de
 * index de update weigeren.
 */
export async function zetStandaard(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) throw new Error('Niet ingelogd')
  const uit = await supabase
    .from('email_handtekeningen')
    .update({ is_standaard: false })
    .eq('user_id', user.id)
    .neq('id', id)
  if (uit.error) throw new Error(uit.error.message)
  const aan = await supabase.from('email_handtekeningen').update({ is_standaard: true }).eq('id', id)
  if (aan.error) throw new Error(aan.error.message)
}

/**
 * Bestaat de tabel uit migratie 248? Zo niet, dan blijft de oude kaart met die
 * ene handtekening staan en verandert er voor de gebruiker niets. Het antwoord
 * wordt onthouden: het verandert alleen door een migratie.
 */
export async function handtekeningenBeschikbaar(): Promise<boolean> {
  if (tabelBestaat !== null) return tabelBestaat
  if (!isSupabaseConfigured() || !supabase) return false
  const { error } = await supabase.from('email_handtekeningen').select('id').limit(1)
  if (error && isTabelOntbreekt(error)) {
    tabelBestaat = false
    return false
  }
  tabelBestaat = !error
  return tabelBestaat
}
