import { landOfStandaard, ondernemingsnummerUitBtw, type LandCode } from './landen'

// Peppol-identificatie van een partij. Peppol routeert op EndpointID
// (schema + nummer); zonder dat veld wijst elk access point het document af.
// Schema's uit de Peppol Participant Identifier code list (ISO 6523 ICD):
//   0208  Belgisch ondernemingsnummer (KBO/BCE)
//   0106  Nederlands KvK-nummer
//   9944  Nederlands btw-nummer (fallback als er geen KvK bekend is)
//   9930  Duits btw-nummer
//   9938  Luxemburgs btw-nummer
//   9957  Frans btw-nummer

export interface PeppolIdentifier {
  schemeID: string
  id: string
}

const BTW_SCHEMA: Partial<Record<LandCode, string>> = {
  NL: '9944',
  DE: '9930',
  LU: '9938',
  FR: '9957',
}

function schoonNummer(waarde: string | null | undefined): string {
  return (waarde || '').replace(/[\s.\-]/g, '').toUpperCase()
}

export function peppolIdentifier(partij: {
  land?: string | null
  btw_nummer?: string | null
  kvk_nummer?: string | null
}): PeppolIdentifier | null {
  const land = landOfStandaard(partij.land)
  if (land === 'BE') {
    const kbo = ondernemingsnummerUitBtw(partij.btw_nummer, 'BE') ?? ondernemingsnummerUitBtw(partij.kvk_nummer, 'BE')
    return kbo ? { schemeID: '0208', id: kbo } : null
  }
  if (land === 'NL') {
    const kvk = schoonNummer(partij.kvk_nummer)
    if (/^\d{8}$/.test(kvk)) return { schemeID: '0106', id: kvk }
  }
  const btw = schoonNummer(partij.btw_nummer)
  const schema = BTW_SCHEMA[land]
  return btw && schema ? { schemeID: schema, id: btw } : null
}

/** Rechtspersoon-registratie (BT-30/BT-47): hetzelfde nummer, maar de KvK/KBO gaat vóór het btw-nummer. */
export function peppolRechtspersoon(partij: {
  land?: string | null
  btw_nummer?: string | null
  kvk_nummer?: string | null
}): PeppolIdentifier | null {
  const land = landOfStandaard(partij.land)
  if (land === 'BE') return peppolIdentifier(partij)
  const kvk = schoonNummer(partij.kvk_nummer)
  if (land === 'NL' && /^\d{8}$/.test(kvk)) return { schemeID: '0106', id: kvk }
  return null
}

export const CUSTOMIZATION_NLCIUS = 'urn:cen.eu:en16931:2017#compliant#urn:fdc:nen.nl:nlcius:v1.0'
export const CUSTOMIZATION_PEPPOL_BIS3 = 'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0'
export const PROFILE_PEPPOL_BILLING = 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'

/** NLCIUS is een Nederlandse verbijzondering van Peppol BIS 3.0; buiten NL is BIS 3.0 zelf de norm. */
export function ublCustomizationId(leveranciersLand: string | null | undefined): string {
  return landOfStandaard(leveranciersLand) === 'NL' ? CUSTOMIZATION_NLCIUS : CUSTOMIZATION_PEPPOL_BIS3
}
