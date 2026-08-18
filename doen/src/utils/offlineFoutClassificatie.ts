// Netwerkfout of serverweigering? Dat onderscheid draagt de hele offline-
// wachtrij, dus het staat hier los en zonder imports zodat het zonder DOM
// getest kan worden.
//
// De vraag is niet "hoe erg is de fout" maar: **is het verzoek ooit
// beantwoord?** Alleen als aantoonbaar géén antwoord is teruggekomen mag een
// mutatie opnieuw worden aangeboden. Kwam er wél een antwoord, dan levert
// dezelfde mutatie straks hetzelfde antwoord op en is opnieuw proberen een
// oneindige lus die batterij kost en de wachtrij verstopt.
//
// Bewijs dát er een antwoord was, gemeten in de geïnstalleerde clients:
//
//   @supabase/postgrest-js — bij een mislukte fetch bouwt PostgrestBuilder een
//   error met LEGE `code` en `hint`. De broncode zegt erbij waarom: "We don't
//   populate code/hint for client-side network errors since those fields are
//   meant for upstream service errors". Een niet-lege `code` (SQLSTATE als
//   '42501' of een 'PGRST…') bewijst dus dat PostgREST heeft geantwoord.
//   Let op: services doen `if (error) throw error`, dus de HTTP-status (die
//   naast de error in de response zit) komt niet mee. `code` is wat we hebben.
//
//   @supabase/storage-js — een mislukte fetch geeft `StorageUnknownError`
//   (geen `status`), een echt antwoord geeft `StorageApiError` met een
//   numerieke `status`. Dat is hetzelfde onderscheid, netter verpakt.
//
// Wat niet als bewijs telt: `navigator.onLine`. Dat vlaggetje zegt alleen dat
// er een netwerkinterface is. Op een dak met één streepje staat het op true
// terwijl elke upload sneuvelt.

export type FoutSoort =
  // Geen antwoord ontvangen. Opnieuw proberen is zinvol.
  | 'netwerk'
  // Wél een antwoord, maar de server vraagt zelf om later terug te komen
  // (429, 5xx, timeout). Opnieuw proberen is zinvol, met een maximum.
  | 'tijdelijk'
  // Geweigerd: geen rechten. Wachten verandert daar niets aan.
  | 'rechten'
  // Het doelwit bestaat niet (meer).
  | 'weg'
  // Botsing met wat er al staat.
  | 'conflict'
  // De server heeft de inhoud beoordeeld en afgekeurd (400, 413, 422).
  | 'geweigerd'
  // Niet vast te stellen. Behandelen als definitief: liever een zichtbaar
  // vastgelopen item dan een stille lus.
  | 'onbekend'

const NETWERK_NAMEN = new Set(['AbortError', 'TimeoutError', 'NetworkError', 'StorageUnknownError'])

// Berichten van fetch zelf, per browser anders geformuleerd. Chrome/Firefox
// geven "Failed to fetch" / "NetworkError when attempting to fetch resource",
// Safari "Load failed" of "The network connection was lost".
const NETWERK_PATRONEN = [
  'failed to fetch',
  'networkerror',
  'network error',
  'load failed',
  'network connection was lost',
  'network request failed',
  'err_internet_disconnected',
  'err_network',
  'err_connection',
  'fetch failed',
  'aborterror',
  'timeout',
  'und_err_socket',
  'econnreset',
  'enotfound',
  'eai_again',
]

// SQLSTATE en PostgREST-codes die we uit elkaar moeten houden. Alles wat een
// code heeft is per definitie beantwoord, dus onbekende codes vallen op
// 'geweigerd' terug en niet op 'netwerk'.
const CODE_SOORT: Record<string, FoutSoort> = {
  // insufficient_privilege · dit is wat een RLS-weigering op een INSERT geeft
  '42501': 'rechten',
  // JWT verlopen of ontbrekend
  PGRST301: 'rechten',
  PGRST302: 'rechten',
  // unique_violation
  '23505': 'conflict',
  // foreign_key_violation · de werkbon of het project bestaat niet meer
  '23503': 'weg',
  // geen rij gevonden waar er één werd verwacht
  PGRST116: 'weg',
  // not_null_violation, check_violation, invalid_text_representation
  '23502': 'geweigerd',
  '23514': 'geweigerd',
  '22P02': 'geweigerd',
  // schema-cache: kolom of tabel kent PostgREST niet
  PGRST204: 'geweigerd',
  PGRST202: 'geweigerd',
  // serialization_failure / deadlock_detected · echt tijdelijk
  '40001': 'tijdelijk',
  '40P01': 'tijdelijk',
  // te veel verbindingen
  '53300': 'tijdelijk',
}

export function soortVoorStatus(status: number): FoutSoort {
  if (status === 401 || status === 403) return 'rechten'
  if (status === 404 || status === 410) return 'weg'
  if (status === 409) return 'conflict'
  if (status === 408 || status === 425 || status === 429) return 'tijdelijk'
  if (status >= 500) return 'tijdelijk'
  if (status >= 400) return 'geweigerd'
  return 'onbekend'
}

function isObject(waarde: unknown): waarde is Record<string, unknown> {
  return typeof waarde === 'object' && waarde !== null
}

function tekstVan(fout: Record<string, unknown>): string {
  const delen = [fout.name, fout.message, fout.details, fout.error_description, fout.error]
    .filter((d) => typeof d === 'string')
    .join(' ')
  return delen.toLowerCase()
}

function lijktOpNetwerk(tekst: string): boolean {
  return NETWERK_PATRONEN.some((p) => tekst.includes(p))
}

export function classificeerFout(fout: unknown): FoutSoort {
  if (fout == null) return 'onbekend'

  if (typeof fout === 'string') {
    return lijktOpNetwerk(fout.toLowerCase()) ? 'netwerk' : 'onbekend'
  }

  if (!isObject(fout)) return 'onbekend'

  const naam = typeof fout.name === 'string' ? fout.name : ''
  if (NETWERK_NAMEN.has(naam)) return 'netwerk'

  // Storage: StorageApiError heeft een numerieke status, StorageUnknownError
  // niet. Die tweede is altijd een mislukte fetch.
  if ('__isStorageError' in fout) {
    const status = fout.status
    if (typeof status === 'number' && Number.isFinite(status)) return soortVoorStatus(status)
    return 'netwerk'
  }

  // Een expliciete HTTP-status is het sterkste bewijs dat er geantwoord is.
  for (const sleutel of ['status', 'httpStatus', 'statusCode'] as const) {
    const waarde = fout[sleutel]
    const status = typeof waarde === 'string' ? Number(waarde) : waarde
    if (typeof status === 'number' && Number.isFinite(status) && status >= 100) {
      return soortVoorStatus(status)
    }
    // status 0 is het tegendeel van bewijs: postgrest-js zet die op een
    // mislukte fetch. Niet als antwoord tellen, wel doorlopen.
  }

  // PostgREST-vorm: message/details/hint/code. Een gevulde code bewijst een
  // antwoord van de database.
  if ('code' in fout) {
    const code = fout.code
    if (typeof code === 'string' && code.length > 0) {
      // Onbekende code: wél beantwoord, dus niet opnieuw proberen.
      return CODE_SOORT[code] ?? 'geweigerd'
    }
    // Lege code plus een fetch-achtig bericht: dit is de netwerkvorm van
    // postgrest-js.
    if (lijktOpNetwerk(tekstVan(fout))) return 'netwerk'
    return 'onbekend'
  }

  return lijktOpNetwerk(tekstVan(fout)) ? 'netwerk' : 'onbekend'
}

/**
 * Mag deze fout opnieuw geprobeerd worden? Alleen als er aantoonbaar geen
 * antwoord kwam, of als de server zelf om later vroeg.
 */
export function magOpnieuwProberen(soort: FoutSoort): boolean {
  return soort === 'netwerk' || soort === 'tijdelijk'
}

/**
 * Hoort deze mislukte poging in de wachtrij? Dat is dezelfde vraag als
 * "mag opnieuw", met één toevoeging: staat het toestel aantoonbaar offline,
 * dan is dat op zichzelf bewijs dat er geen antwoord kan zijn geweest.
 */
export function hoortInWachtrij(fout: unknown, offline: boolean): boolean {
  if (offline) return true
  return magOpnieuwProberen(classificeerFout(fout))
}

const OMSCHRIJVING: Record<FoutSoort, string> = {
  netwerk: 'Geen verbinding',
  tijdelijk: 'Server tijdelijk niet bereikbaar',
  rechten: 'Geen toegang · vraag je beheerder',
  weg: 'Bestaat niet meer',
  conflict: 'Al gewijzigd door iemand anders',
  geweigerd: 'Door de server geweigerd',
  onbekend: 'Onbekende fout',
}

export function foutOmschrijving(soort: FoutSoort): string {
  return OMSCHRIJVING[soort]
}
