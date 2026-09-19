import { landOfStandaard, type LandCode } from './landen'

// Wat er per land van het bedrijf anders is. Eén plek, zodat onboarding,
// bedrijfsinstellingen en klantformulier dezelfde labels en standaarden
// gebruiken. Btw-tarieven staan in btwTarieven.ts, feestdagen in
// utils/feestdagen.ts, de wettelijke factuurvermeldingen in verlegging.ts.

export interface LandLabels {
  ondernemingsnummer: string
  ondernemingsnummerPlaceholder: string
  btwPlaceholder: string
  postcodePlaceholder: string
  telefoonPlaceholder: string
  ibanPlaceholder: string
  emailPlaceholder: string
}

const LABELS: Record<LandCode, LandLabels> = {
  NL: {
    ondernemingsnummer: 'KvK-nummer',
    ondernemingsnummerPlaceholder: '12345678',
    btwPlaceholder: 'NL123456789B01',
    postcodePlaceholder: '1234 AB',
    telefoonPlaceholder: '06-12345678',
    ibanPlaceholder: 'NL00 BANK 0123 4567 89',
    emailPlaceholder: 'info@jouwbedrijf.nl',
  },
  BE: {
    ondernemingsnummer: 'Ondernemingsnummer (KBO)',
    ondernemingsnummerPlaceholder: '0123.456.789',
    btwPlaceholder: 'BE0123456789',
    postcodePlaceholder: '2000',
    telefoonPlaceholder: '+32 3 123 45 67',
    ibanPlaceholder: 'BE00 0000 0000 0000',
    emailPlaceholder: 'info@jouwbedrijf.be',
  },
  DE: {
    ondernemingsnummer: 'Handelsregisternummer',
    ondernemingsnummerPlaceholder: 'HRB 12345',
    btwPlaceholder: 'DE123456789',
    postcodePlaceholder: '10115',
    telefoonPlaceholder: '+49 30 1234567',
    ibanPlaceholder: 'DE00 0000 0000 0000 0000 00',
    emailPlaceholder: 'info@firma.de',
  },
  LU: {
    ondernemingsnummer: 'RCS-nummer',
    ondernemingsnummerPlaceholder: 'B123456',
    btwPlaceholder: 'LU12345678',
    postcodePlaceholder: 'L-1234',
    telefoonPlaceholder: '+352 12 34 56',
    ibanPlaceholder: 'LU00 0000 0000 0000 0000',
    emailPlaceholder: 'info@firma.lu',
  },
  FR: {
    ondernemingsnummer: 'SIREN',
    ondernemingsnummerPlaceholder: '123 456 789',
    btwPlaceholder: 'FR12345678901',
    postcodePlaceholder: '75001',
    telefoonPlaceholder: '+33 1 23 45 67 89',
    ibanPlaceholder: 'FR00 0000 0000 0000 0000 0000 000',
    emailPlaceholder: 'info@entreprise.fr',
  },
}

export function landLabels(land: string | null | undefined): LandLabels {
  return LABELS[landOfStandaard(land)]
}

/**
 * Standaardinstellingen die bij de landkeuze horen. Wordt bij de onboarding
 * (en bij een landwissel in Instellingen > Bedrijf) toegepast; de gebruiker
 * kan alles daarna nog aanpassen.
 *
 * België: wet van 2 augustus 2002 (betalingsachterstand bij
 * handelstransacties, sinds 2022 max. 60 dagen B2B): wettelijke interest en
 * een forfait van € 40 invorderingskosten mogen op de factuur vermeld worden.
 * Nederland: geen verplichte tekst; 30 dagen is de gangbare termijn.
 */
export function standaardInstellingenVoorLand(land: string | null | undefined): {
  factuur_betaaltermijn_dagen: number
  factuur_voorwaarden: string
  offerte_betalingsconditie?: string
} {
  const code = landOfStandaard(land)
  if (code === 'BE') {
    return {
      factuur_betaaltermijn_dagen: 30,
      factuur_voorwaarden:
        'Betaling binnen 30 dagen na factuurdatum. Bij laattijdige betaling is van rechtswege en zonder ingebrekestelling de wettelijke interest verschuldigd conform de wet van 2 augustus 2002 betreffende de bestrijding van de betalingsachterstand bij handelstransacties, vermeerderd met een forfaitaire vergoeding van € 40 voor invorderingskosten.',
      offerte_betalingsconditie: '50% bij opdracht, 50% binnen 30 dagen na oplevering.',
    }
  }
  return {
    factuur_betaaltermijn_dagen: 30,
    factuur_voorwaarden: 'Betaling binnen 30 dagen na factuurdatum.',
  }
}

export interface DemoKlant {
  bedrijfsnaam: string
  contactpersoon: string
  email: string
  telefoon: string
  adres: string
  postcode: string
  stad: string
  land: LandCode
  btw_nummer: string
}

/** Voorbeeldklanten voor de onboarding, passend bij het land van het bedrijf. */
export function demoKlantenVoorLand(land: string | null | undefined): DemoKlant[] {
  if (landOfStandaard(land) === 'BE') {
    return [
      { bedrijfsnaam: 'Bakkerij De Gouden Korenaar', contactpersoon: 'Jan Peeters', email: 'jan@goudenkorenaar.be', telefoon: '+32 3 234 56 78', adres: 'Meir 12', postcode: '2000', stad: 'Antwerpen', land: 'BE', btw_nummer: 'BE0123456749' },
      { bedrijfsnaam: 'Installatiebedrijf Janssens', contactpersoon: 'Pieter Janssens', email: 'info@janssens-installatie.be', telefoon: '+32 9 345 67 89', adres: 'Industrieweg 8', postcode: '9000', stad: 'Gent', land: 'BE', btw_nummer: 'BE0234567892' },
      { bedrijfsnaam: 'Restaurant Het Anker', contactpersoon: 'Lisa Van Dijck', email: 'info@hetanker.be', telefoon: '+32 15 456 78 90', adres: 'Havenstraat 3', postcode: '2800', stad: 'Mechelen', land: 'BE', btw_nummer: 'BE0345678935' },
    ]
  }
  return [
    { bedrijfsnaam: 'Bakkerij De Gouden Korenaar', contactpersoon: 'Jan Bakker', email: 'jan@goudenkorenaar.nl', telefoon: '020-1234567', adres: 'Hoofdstraat 12', postcode: '1012 AB', stad: 'Amsterdam', land: 'NL', btw_nummer: '' },
    { bedrijfsnaam: 'Installatiebedrijf Jansen', contactpersoon: 'Pieter Jansen', email: 'info@jansen-installatie.nl', telefoon: '010-7654321', adres: 'Industrieweg 8', postcode: '3012 CD', stad: 'Rotterdam', land: 'NL', btw_nummer: '' },
    { bedrijfsnaam: 'Restaurant Het Anker', contactpersoon: 'Lisa van Dijk', email: 'info@hetanker.nl', telefoon: '030-9876543', adres: 'Havenstraat 3', postcode: '3511 AA', stad: 'Utrecht', land: 'NL', btw_nummer: '' },
  ]
}
