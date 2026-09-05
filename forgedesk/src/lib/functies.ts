// Functies-schakelaars: de handigheden uit de Gripp-ronde (sep 2026) staan
// achter aan/uit-knoppen per organisatie, zodat de app rustig blijft voor wie
// ze niet gebruikt. De stand leeft in app_settings.functies (JSONB, migratie
// 234); dit bestand is de enige plek die weet welke sleutels bestaan en wat
// de standaard is. Geen imports, zodat het overal te gebruiken is.

export type FunctieGroep = 'offertes' | 'klanten' | 'projecten' | 'planning' | 'facturen' | 'team'

export interface FunctieDefinitie {
  sleutel: string
  groep: FunctieGroep
  label: string
  uitleg: string
  standaard: boolean
  /** Numerieke instelling die bij de schakelaar hoort (bv. een drempelbedrag). */
  getal?: { sleutel: string; label: string; standaard: number; eenheid?: string }
}

export const FUNCTIE_GROEPEN: { id: FunctieGroep; label: string }[] = [
  { id: 'offertes', label: 'Offertes' },
  { id: 'klanten', label: 'Klanten' },
  { id: 'projecten', label: 'Projecten' },
  { id: 'planning', label: 'Planning' },
  { id: 'facturen', label: 'Facturen en inkoop' },
  { id: 'team', label: 'Team en meldingen' },
]

export const FUNCTIES: FunctieDefinitie[] = [
  // Offertes
  { sleutel: 'offerte_vervolg', groep: 'offertes', label: 'Vervolg na de offerte in één scherm', uitleg: 'Kies per regel: naar project, direct factureren of afgewezen met reden.', standaard: true },
  { sleutel: 'offerte_interne_notitie', groep: 'offertes', label: 'Interne notitie op de regel', uitleg: 'Geel veld per regel dat nooit op de PDF komt. Voor PMS-nummers, montage-afspraken, waarschuwingen.', standaard: true },
  { sleutel: 'offerte_regelgroepen', groep: 'offertes', label: 'Regelgroepen met details verbergen', uitleg: 'Bundel regels onder één kop met één prijs voor de klant; de opbouw blijft voor jou.', standaard: false },
  { sleutel: 'offerte_condities', groep: 'offertes', label: 'Condities als set', uitleg: 'Standaard of Spoed: geldigheid, betaaltermijn en voorwaarden in één keuze.', standaard: false },
  { sleutel: 'offerte_staffel', groep: 'offertes', label: 'Staffelprijzen per product', uitleg: 'Vanaf een aantal een andere inkoop- en verkoopprijs. De editor neemt de staffel automatisch over.', standaard: false },
  { sleutel: 'offerte_check_verplicht', groep: 'offertes', label: 'Grote offerte alleen na collega-check', uitleg: 'Boven het bedrag kan een offerte pas de deur uit als een collega hem heeft gecheckt.', standaard: false, getal: { sleutel: 'offerte_check_drempel', label: 'Vanaf bedrag ex btw', standaard: 5000, eenheid: '€' } },
  // Klanten
  { sleutel: 'klant_waarschuwing', groep: 'klanten', label: 'Vaste notitie als waarschuwing', uitleg: 'Een notitie op de klant die opduikt op offerte, project en inkoopfactuur. "Altijd PO-nummer vragen."', standaard: true },
  { sleutel: 'klant_tags', groep: 'klanten', label: 'Tags op klanten', uitleg: 'Vrije labels als Kerstkaart of Beurs, met een filter in de klantenlijst.', standaard: false },
  { sleutel: 'prospect_wordt_klant', groep: 'klanten', label: 'Prospect wordt klant bij akkoord', uitleg: 'Zodra een offerte wordt geaccepteerd gaat de status van prospect naar klant.', standaard: true },
  // Projecten
  { sleutel: 'project_kanban', groep: 'projecten', label: 'Projecten als kolommen per fase', uitleg: 'Kanban-weergave met het bedrag per fase erboven. Wat er in productie hangt, in euro’s.', standaard: false },
  { sleutel: 'project_sjablonen', groep: 'projecten', label: 'Projectsjablonen', uitleg: 'Sla een project op als sjabloon (bewerkingen en taken) en start een nieuw project daaruit.', standaard: false },
  { sleutel: 'geschiedenis', groep: 'projecten', label: 'Geschiedenis per record', uitleg: 'Aangemaakt door en laatst gewijzigd door op offerte, project en factuur.', standaard: true },
  // Planning
  { sleutel: 'planning_weergaven', groep: 'planning', label: 'Opgeslagen planningweergaven', uitleg: 'Bewaar een filter als weergave, bijvoorbeeld "Ploeg Noord deze week".', standaard: true },
  { sleutel: 'planning_herhalen', groep: 'planning', label: 'Herhaald inplannen', uitleg: 'Een montageafspraak wekelijks of maandelijks laten terugkomen, met einddatum.', standaard: false },
  { sleutel: 'uren_herinnering', groep: 'planning', label: 'Herinnering als er nog geen uren staan', uitleg: 'Aan het eind van de werkdag een melding voor wie vandaag nog niets schreef.', standaard: false, getal: { sleutel: 'uren_herinnering_uur', label: 'Om hoe laat', standaard: 16, eenheid: 'uur' } },
  // Facturen
  { sleutel: 'factuur_stepper', groep: 'facturen', label: 'Opvolgstappen bovenin de factuur', uitleg: 'Factuur, herinnering, aanmaning als stappen, met de actieve stap gekleurd.', standaard: true },
  { sleutel: 'factuur_actie_tab', groep: 'facturen', label: 'Tab "Vanavond de deur uit"', uitleg: 'Lijst van facturen waarvoor de volgende herinnering klaarstaat, met pauzeknop per factuur.', standaard: true },
  { sleutel: 'factuur_vergrendeling', groep: 'facturen', label: 'Vergrendeld na Exact-sync', uitleg: 'Een factuur die naar de boekhouding is, verandert niet meer. Corrigeren gaat via een creditfactuur.', standaard: true },
  { sleutel: 'factuur_deelfactuur', groep: 'facturen', label: 'Deelfactuur en aanbetaling', uitleg: 'Factureer per regel en verreken een aanbetaling automatisch op de eindfactuur.', standaard: true },
  { sleutel: 'factuur_samenvoegen', groep: 'facturen', label: 'Conceptfacturen samenvoegen', uitleg: 'Meerdere concepten voor dezelfde klant op één factuur.', standaard: false },
  { sleutel: 'conceptfacturen_maandelijks', groep: 'facturen', label: 'Concepten op de eerste werkdag versturen', uitleg: 'Daan verstuurt alle conceptfacturen op de eerste werkdag van de maand.', standaard: false },
  { sleutel: 'rapport_ouderdom', groep: 'facturen', label: 'Ouderdom per klant', uitleg: 'Openstaand in 0-30, 31-60, 61-90 en 91+ dagen, per klant uitklapbaar.', standaard: true },
  { sleutel: 'inkoop_leverancier_defaults', groep: 'facturen', label: 'Leverancier onthouden', uitleg: 'Betaaltermijn en grootboek van een inkoopfactuur bewaren als standaard voor die leverancier.', standaard: true },
  // Team
  { sleutel: 'meldingen_voorkeuren', groep: 'team', label: 'Meldingsvoorkeuren per persoon', uitleg: 'Ieder kiest zelf welke meldingen in de app en als push komen.', standaard: true },
  { sleutel: 'noemen', groep: 'team', label: 'Collega noemen met @', uitleg: 'Typ @ in een notitie en de collega krijgt een melding.', standaard: true },
  { sleutel: 'support_toegang', groep: 'team', label: 'Support tijdelijk toegang geven', uitleg: 'Geef doen.-support 48 uur meekijkrechten, met een overzicht van actieve sessies.', standaard: true },
]

export type FunctieInstellingen = Record<string, boolean | number | undefined>

const definitiesPerSleutel = new Map(FUNCTIES.map((f) => [f.sleutel, f]))

export function functieAan(functies: FunctieInstellingen | null | undefined, sleutel: string): boolean {
  const def = definitiesPerSleutel.get(sleutel)
  const waarde = functies?.[sleutel]
  if (typeof waarde === 'boolean') return waarde
  return def?.standaard ?? false
}

export function functieGetal(functies: FunctieInstellingen | null | undefined, sleutel: string): number {
  const def = FUNCTIES.find((f) => f.getal?.sleutel === sleutel)
  const waarde = functies?.[sleutel]
  if (typeof waarde === 'number' && Number.isFinite(waarde)) return waarde
  return def?.getal?.standaard ?? 0
}
