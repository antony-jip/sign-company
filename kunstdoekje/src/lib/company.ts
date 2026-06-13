/**
 * Verkopergegevens voor facturen, pakbonnen en e-mails.
 * Kunstdoekje is een handelsnaam van Sign Company; KvK en BTW zijn die van
 * Sign Company. Eén bron, overal hergebruikt.
 */
export const COMPANY = {
  merk: 'Kunstdoekje',
  onderdeelVan: 'onderdeel van Sign Company',

  // Vestiging / post
  adres: 'De Drie Kronen 115',
  postcode: '1601 MT',
  plaats: 'Enkhuizen',
  land: 'Nederland',

  // Contact (alles onder de Kunstdoekje-merknaam)
  telefoon: '0228 - 351960',
  email: 'info@kunstdoekje.nl',
  website: 'www.kunstdoekje.nl',

  // Wettelijk (Sign Company)
  kvk: '360.111.150', // KvK te Hoorn
  btw: 'NL0062.84.267.B.01',

  // Betaling
  bank: 'Rabobank',
  iban: 'NL71 RABO 0148 1208 81',

  // Kleine voettekst op de factuur
  voorwaarden:
    "Op onze gesloten overeenkomsten zijn slechts toepasselijk de leveringsvoorwaarden van het S'IBON Erkende Signbedrijf, gedeponeerd onder nummer 50/2020 bij de Arrondissementsrechtbank te Haarlem. Op eerste verzoek wordt kosteloos een exemplaar ter beschikking gesteld.",
} as const

/** "De Drie Kronen 115 · 1601 MT Enkhuizen" */
export function companyAdresRegel(): string {
  return `${COMPANY.adres} · ${COMPANY.postcode} ${COMPANY.plaats}`
}
