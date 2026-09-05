// Meldingsvoorkeuren per persoon (migratie 239): per categorie of een melding
// in de app en als push komt. Leeg object = alles aan, dus wie nooit iets
// instelt merkt niets. Geen imports, zodat de sleutels ook in api/ inline
// over te nemen zijn (api mag niets uit src importeren).

export type MeldingKanaal = 'app' | 'push'

export type MeldingCategorie = 'offertes' | 'portaal' | 'facturen' | 'planning' | 'taken' | 'mail' | 'team'

export type Meldingsvoorkeuren = Record<string, { app?: boolean; push?: boolean }>

export interface MeldingCategorieDefinitie {
  id: MeldingCategorie
  label: string
  uitleg: string
  types: string[]
}

export const MELDING_CATEGORIEEN: MeldingCategorieDefinitie[] = [
  {
    id: 'offertes',
    label: 'Offertes',
    uitleg: 'Bekeken, geaccepteerd, verlopen en de collega-check.',
    types: ['offerte_bekeken', 'offerte_verlopen', 'offerte_geaccepteerd', 'offerte_wijziging', 'goedkeuring', 'offerte_check_gevraagd', 'offerte_check_afgehandeld', 'offerte_check_wijzigingen'],
  },
  {
    id: 'portaal',
    label: 'Portaal en website',
    uitleg: 'Goedkeuringen, revisies en berichten van klanten; chat en aanvragen via de site.',
    types: ['portaal_goedkeuring', 'portaal_revisie', 'portaal_bericht', 'portaal_bekeken', 'portaal_herinnering', 'website_chat', 'website_aanvraag'],
  },
  {
    id: 'facturen',
    label: 'Facturen',
    uitleg: 'Vervallen facturen, betalingen en conceptfacturen die klaarstaan.',
    types: ['factuur_vervallen', 'betaling_ontvangen', 'budget_waarschuwing', 'conceptfacturen_klaar'],
  },
  {
    id: 'planning',
    label: 'Planning en uren',
    uitleg: 'Montage ingepland, boekingen, deadlines en de urenherinnering.',
    types: ['montage_gepland', 'booking_nieuw', 'deadline_nadert', 'herinnering', 'uren_herinnering'],
  },
  {
    id: 'taken',
    label: 'Taken',
    uitleg: 'Een taak die aan jou is toegewezen of is afgerond.',
    types: ['taak_voltooid', 'taak_toegewezen'],
  },
  {
    id: 'mail',
    label: 'Mail',
    uitleg: 'Nieuwe mail in je postvak.',
    types: ['nieuwe_email'],
  },
  {
    id: 'team',
    label: 'Team',
    uitleg: 'Een collega noemt je met @ in een notitie.',
    types: ['genoemd'],
  },
]

const categoriePerType = new Map<string, MeldingCategorie>()
for (const cat of MELDING_CATEGORIEEN) for (const t of cat.types) categoriePerType.set(t, cat.id)

export function categorieVanType(type: string): MeldingCategorie | null {
  return categoriePerType.get(type) ?? null
}

/** Types zonder categorie (zoals 'algemeen') komen altijd door. */
export function meldingToegestaan(voorkeuren: Meldingsvoorkeuren | null | undefined, type: string, kanaal: MeldingKanaal): boolean {
  const categorie = categorieVanType(type)
  if (!categorie) return true
  return categorieToegestaan(voorkeuren, categorie, kanaal)
}

export function categorieToegestaan(voorkeuren: Meldingsvoorkeuren | null | undefined, categorie: MeldingCategorie, kanaal: MeldingKanaal): boolean {
  const stand = voorkeuren?.[categorie]?.[kanaal]
  return stand !== false
}
