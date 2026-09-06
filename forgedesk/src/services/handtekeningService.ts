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

/**
 * Ontbreekt de tabel (248 niet gedraaid) of mag deze gebruiker er niet bij?
 * PGRST205 is de code die Supabase geeft als de tabel niet in de schema-cache
 * zit, en dat is juist het geval vlak na een migratie.
 */
function isTabelOntbreekt(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  return fout.code === '42P01' || fout.code === 'PGRST205' || fout.code === '42703'
    || fout.code === 'PGRST204' || fout.code === '42501'
    || /relation .* does not exist|could not find the table|column .* does not exist|could not find the .* column/i.test(fout.message || '')
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
    // Alleen bij een echt ontbrekende tabel onthouden; zie
    // handtekeningenBeschikbaar voor waarom een hikje dat niet mag.
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

/**
 * De standaardhandtekening spiegelen naar het profiel.
 *
 * Waarom dat moet: alleen de mailmodule leest `email_handtekeningen`. De
 * offertemail, de factuurmail, de aanmaning, de projectmail en het
 * goedkeuringsverzoek lezen allemaal `profiles.email_handtekening` via
 * useAppSettings. Zonder deze spiegeling bewerk je na migratie 248 iets dat de
 * helft van je uitgaande post niet ziet, en is er geen scherm meer waar je dat
 * kunt opmerken.
 *
 * Wat je als standaard aanwijst, is dus wat al je andere mail ondertekent.
 * Mislukt het spiegelen, dan is dat geen reden om het opslaan te laten falen.
 */
async function spiegelNaarProfiel(h: Handtekening | null): Promise<void> {
  if (!h || !supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return
  const { error } = await supabase
    .from('profiles')
    .update({
      email_handtekening: h.inhoud || '',
      handtekening_afbeelding: h.afbeeldingUrl || '',
      handtekening_afbeelding_link: h.afbeeldingLink || '',
      ...(h.afbeeldingBreedte ? { handtekening_afbeelding_grootte: h.afbeeldingBreedte } : {}),
    })
    .eq('id', user.id)
  if (error) console.warn('[handtekening] spiegelen naar profiel mislukt:', error.message)
}

/** De standaardhandtekening van deze gebruiker, of null. */
async function huidigeStandaard(): Promise<Handtekening | null> {
  const lijst = await getHandtekeningen().catch(() => [] as Handtekening[])
  return lijst.find((h) => h.isStandaard) ?? lijst[0] ?? null
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
    // Alleen meesturen als de aanroeper er iets over zegt. Een bewerking mag de
    // standaardvlag niet per ongeluk omzetten; die wisselt via zetStandaard,
    // dat de unieke index respecteert.
    ...(h.isStandaard === undefined ? {} : { is_standaard: h.isStandaard }),
  }
  const uitkomst = h.id
    ? await supabase.from('email_handtekeningen').update(velden).eq('id', h.id).select().single()
    : await supabase.from('email_handtekeningen').insert(velden).select().single()
  if (uitkomst.error) throw new Error(uitkomst.error.message)
  const bewaard = alsHandtekening(uitkomst.data as Rij)
  if (bewaard.isStandaard) await spiegelNaarProfiel(bewaard)
  return bewaard
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
  // Wie het wás, vóórdat we alles uitzetten. Achteraf opvragen kan niet meer:
  // dan staat er geen enkele standaard en zou de terugval een willekeurige
  // andere handtekening tot standaard maken.
  const vorige = await huidigeStandaard()

  const uit = await supabase
    .from('email_handtekeningen')
    .update({ is_standaard: false })
    .eq('user_id', user.id)
    .neq('id', id)
  if (uit.error) throw new Error(uit.error.message)
  const aan = await supabase.from('email_handtekeningen').update({ is_standaard: true }).eq('id', id)
  if (aan.error) {
    // De andere staan nu al uit. Zet de vorige terug, anders heeft de gebruiker
    // geen standaard meer en weet hij dat niet: de melding zegt alleen dat het
    // mislukte. Lukt ook dat niet, dan valt kiesHandtekening terug op de eerste
    // uit de lijst, dus er wordt nooit zonder handtekening verstuurd.
    if (vorige) {
      const herstel = await supabase.from('email_handtekeningen').update({ is_standaard: true }).eq('id', vorige.id)
      if (!herstel.error) await spiegelNaarProfiel(vorige)
    }
    throw new Error(aan.error.message)
  }
  await spiegelNaarProfiel(await huidigeStandaard())
}

/**
 * Bestaat de tabel uit migratie 248? Drie antwoorden: `true` ja, `false` nee, en
 * `null` als het even niet te zeggen was. Dat laatste is geen formaliteit: op
 * een `false` verschijnt de oude handtekening-editor en mag "toepassen op alle
 * teamleden" weer, en dat hoort niet te gebeuren op grond van een netwerkfout.
 * Alleen een echt ja of nee wordt onthouden; het verandert toch alleen door een
 * migratie.
 */
export async function handtekeningenBeschikbaar(): Promise<boolean | null> {
  if (tabelBestaat !== null) return tabelBestaat
  if (!isSupabaseConfigured() || !supabase) return false
  const { error } = await supabase.from('email_handtekeningen').select('id').limit(1)
  if (!error) {
    tabelBestaat = true
    return true
  }
  // Alleen een ontbrekende tabel is een blijvend antwoord. Een netwerkhikje,
  // een verlopen token of een 5xx zegt niets over de migratie, en zou hier
  // vroeger het antwoord voor de rest van de sessie op 'nee' zetten: dan
  // bewerkte je je handtekening in de nieuwe tabel en verstuurde de app stil
  // de oude uit je profiel. Bij twijfel niets onthouden en het later opnieuw
  // vragen.
  if (isTabelOntbreekt(error)) {
    tabelBestaat = false
    return false
  }
  // Onbepaald: een hikje, een verlopen token, een 5xx. Niet onthouden en ook
  // niet als "nee" doorgeven. `false` zou hier de oude editor tonen en
  // "toepassen op alle teamleden" weer openzetten terwijl het beheer live is.
  return null
}
