// Landen als ISO 3166-1 alpha-2. De kolommen klanten.land, vestigingen.land
// en profiles.bedrijfs_land bevatten sinds migratie 252 een code; oudere rijen
// en imports kunnen nog een naam ('Nederland', 'België') bevatten, vandaar
// landNaarIso als enige leesroute.

export type LandCode = 'NL' | 'BE' | 'DE' | 'LU' | 'FR'

export const STANDAARD_LAND: LandCode = 'NL'

export const LANDEN: ReadonlyArray<{ code: LandCode; naam: string }> = [
  { code: 'NL', naam: 'Nederland' },
  { code: 'BE', naam: 'België' },
  { code: 'DE', naam: 'Duitsland' },
  { code: 'LU', naam: 'Luxemburg' },
  { code: 'FR', naam: 'Frankrijk' },
]

const NAAM_NAAR_CODE: Record<string, LandCode> = {
  nederland: 'NL',
  netherlands: 'NL',
  'the netherlands': 'NL',
  holland: 'NL',
  belgië: 'BE',
  belgie: 'BE',
  belgium: 'BE',
  belgique: 'BE',
  duitsland: 'DE',
  germany: 'DE',
  deutschland: 'DE',
  luxemburg: 'LU',
  luxembourg: 'LU',
  frankrijk: 'FR',
  france: 'FR',
}

const CODES = new Set<string>(LANDEN.map((l) => l.code))

export function isLandCode(waarde: unknown): waarde is LandCode {
  return typeof waarde === 'string' && CODES.has(waarde)
}

/** Vrije tekst of code → ISO-code; onbekend levert null zodat de aanroeper zelf kiest. */
export function landNaarIso(land: string | null | undefined): LandCode | null {
  const genormaliseerd = (land || '').trim().toLowerCase()
  if (!genormaliseerd) return null
  const viaNaam = NAAM_NAAR_CODE[genormaliseerd]
  if (viaNaam) return viaNaam
  const alsCode = genormaliseerd.toUpperCase()
  return isLandCode(alsCode) ? alsCode : null
}

/** Zoals landNaarIso, maar valt terug op NL: voor plekken die altijd een land nodig hebben. */
export function landOfStandaard(land: string | null | undefined): LandCode {
  return landNaarIso(land) ?? STANDAARD_LAND
}

/** Weergavenaam; een onbekende waarde komt ongewijzigd terug. */
export function landNaam(land: string | null | undefined): string {
  const code = landNaarIso(land)
  if (!code) return (land || '').trim()
  return LANDEN.find((l) => l.code === code)?.naam ?? code
}

/** Btw-nummer → ondernemingsnummer zoals Peppol het wil (BE: 10 cijfers zonder 'BE'). */
export function ondernemingsnummerUitBtw(btwNummer: string | null | undefined, land: LandCode): string | null {
  const schoon = (btwNummer || '').replace(/[\s.\-]/g, '').toUpperCase()
  if (!schoon) return null
  if (land === 'BE') {
    const cijfers = schoon.replace(/^BE/, '')
    return /^[01]\d{9}$/.test(cijfers) ? cijfers : null
  }
  return null
}
