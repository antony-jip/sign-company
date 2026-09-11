/**
 * Voorbeeldofferte voor de preview in Instellingen → Portaal. Verzonnen
 * klant en regels; het bedrijf, logo en de kopkleur komen van de gebruiker.
 */
const vandaag = new Date()
const dag = (n: number) => new Date(vandaag.getTime() + n * 864e5).toISOString().split('T')[0]

export const OFFERTE_VOORBEELD = {
  offerte: {
    id: 'voorbeeld',
    nummer: 'OFF-2026-0412',
    titel: 'Gevelreclame en raambelettering',
    status: 'bekeken',
    subtotaal: 2903,
    btw_bedrag: 609.63,
    totaal: 3512.63,
    geldig_tot: dag(14),
    created_at: `${dag(-2)}T09:12:00Z`,
    intro_tekst:
      'Beste Jan,\n\nBedankt voor het prettige gesprek. Zoals besproken hebben we de gevelreclame uitgewerkt in freesletters, zodat de zaak ook in de donkere maanden goed zichtbaar is.',
    outro_tekst: 'We kunnen binnen drie weken na akkoord produceren en monteren. De montage doen we buiten openingstijden.',
    voorwaarden: 'Op deze offerte zijn onze algemene voorwaarden van toepassing. Prijzen zijn exclusief btw. Betaling binnen 14 dagen na oplevering.',
    klant_naam: 'Bakkerij Jansen',
    klant_id: 'voorbeeld',
  },
  items: [
    {
      id: 'v1', soort: 'prijs' as const, volgorde: 1,
      beschrijving: 'Gevelletters\nFreesletters op afstandhouders, strak uitgelijnd boven de etalage.',
      aantal: 1, eenheidsprijs: 2150, btw_percentage: 21, korting_percentage: 0, totaal: 2150,
      detail_regels: [
        { id: 'd1', label: 'Materiaal', waarde: 'Aluminium 3 mm, gepoedercoat RAL 9010' },
        { id: 'd2', label: 'Formaat', waarde: '3200 x 450 mm' },
        { id: 'd3', label: 'Montage', waarde: 'Inclusief, met hoogwerker' },
      ],
      prijs_varianten: [
        { id: 'pv1', label: 'LED frontverlicht', aantal: 1, eenheidsprijs: 3450, btw_percentage: 21, korting_percentage: 0 },
        { id: 'pv2', label: 'LED halo-verlicht', aantal: 1, eenheidsprijs: 3890, btw_percentage: 21, korting_percentage: 0 },
      ],
    },
    {
      id: 'v2', soort: 'prijs' as const, volgorde: 2,
      beschrijving: 'Raambelettering\nOpeningstijden en slogan, contour gesneden.',
      aantal: 2, eenheidsprijs: 185, btw_percentage: 21, korting_percentage: 10, totaal: 333,
      detail_regels: [{ id: 'd4', label: 'Materiaal', waarde: 'Oracal 8300 wit mat' }],
    },
    {
      id: 'v3', soort: 'prijs' as const, volgorde: 3, is_optioneel: true,
      beschrijving: 'Lichtbak uithangbord, dubbelzijdig\nRond model met LED, inclusief muurbeugel.',
      aantal: 1, eenheidsprijs: 895, btw_percentage: 21, korting_percentage: 0, totaal: 895,
      breedte_mm: 600, hoogte_mm: 600,
    },
    {
      id: 'v4', soort: 'prijs' as const, volgorde: 4,
      beschrijving: 'Montage en hoogwerker',
      aantal: 1, eenheidsprijs: 420, btw_percentage: 21, korting_percentage: 0, totaal: 420,
    },
  ],
  klant: { bedrijfsnaam: 'Bakkerij Jansen', contactpersoon: 'Jan Jansen', email: 'jan@bakkerijjansen.nl' },
}

/** Berichten tussen de instellingenpagina en de preview in het iframe. */
export interface VoorbeeldBericht {
  type: 'doen-offerte-voorbeeld'
  huisstijl: { kop_kleur?: string | null; logo_tonen?: boolean; akkoord_toegestaan?: boolean; teksten?: Record<string, string> }
  bedrijf: { bedrijfsnaam?: string; logo_url?: string | null; bedrijfs_telefoon?: string; bedrijfs_email?: string }
  contactpersoon?: { naam: string; functie?: string | null; foto_url?: string | null } | null
  toonBedankt?: boolean
}

export const VOORBEELD_TOKEN = 'voorbeeld'
