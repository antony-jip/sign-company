// Functies-schakelaars: de handigheden uit de septemberronde 2026 staan
// achter aan/uit-knoppen per organisatie, zodat de app rustig blijft voor wie
// ze niet gebruikt. De stand leeft in app_settings.functies (JSONB, migratie
// 234); dit bestand is de enige plek die weet welke sleutels bestaan en wat
// de standaard is. Geen imports, zodat het overal te gebruiken is.

export type FunctieGroep = 'offertes' | 'klanten' | 'projecten' | 'planning' | 'facturen' | 'team' | 'mail'

export interface FunctieDefinitie {
  sleutel: string
  groep: FunctieGroep
  label: string
  uitleg: string
  standaard: boolean
  /** Numerieke instelling die bij de schakelaar hoort (bv. een drempelbedrag). */
  getal?: { sleutel: string; label: string; standaard: number; eenheid?: string }
  /** Kennisbank-artikel (id in KennisbankPage) met de uitleg. */
  artikel?: string
  /** Nog niet gebouwd: de sleutel is gereserveerd, de schakelaar wordt niet getoond. */
  binnenkort?: boolean
}

export const FUNCTIE_GROEPEN: { id: FunctieGroep; label: string }[] = [
  { id: 'offertes', label: 'Offertes' },
  { id: 'klanten', label: 'Klanten' },
  { id: 'projecten', label: 'Projecten' },
  { id: 'planning', label: 'Planning' },
  { id: 'facturen', label: 'Facturen en inkoop' },
  { id: 'team', label: 'Team en meldingen' },
  { id: 'mail', label: 'Mail' },
]

export const FUNCTIES: FunctieDefinitie[] = [
  // Offertes
  { sleutel: 'offerte_vervolg', groep: 'offertes', label: 'Vervolg na de offerte in één scherm', uitleg: 'Naar project, direct factureren of afgewezen met reden.', standaard: true, artikel: 'offerte-vervolg' },
  { sleutel: 'offerte_interne_notitie', groep: 'offertes', label: 'Interne notitie op de regel', uitleg: 'Geel veld per regel dat nooit op de PDF komt. Voor PMS-nummers, montage-afspraken, waarschuwingen.', standaard: true, artikel: 'offerte-condities-staffels' },
  { sleutel: 'offerte_regelgroepen', groep: 'offertes', label: 'Regelgroepen met details verbergen', uitleg: 'Bundel regels onder één kop met één prijs voor de klant; de opbouw blijft voor jou.', standaard: false, binnenkort: true },
  { sleutel: 'offerte_condities', groep: 'offertes', label: 'Condities als set', uitleg: 'Standaard of Spoed: geldigheid, levertijd, betalingsconditie en voorwaarden in één keuze.', standaard: false, artikel: 'offerte-condities-staffels' },
  { sleutel: 'offerte_staffel', groep: 'offertes', label: 'Staffelprijzen per product', uitleg: 'Vanaf een aantal een andere inkoop- en verkoopprijs. De editor neemt de staffel automatisch over.', standaard: false, artikel: 'offerte-condities-staffels' },
  { sleutel: 'offerte_check_verplicht', groep: 'offertes', label: 'Grote offerte alleen na collega-check', uitleg: 'Boven het bedrag kan een offerte pas de deur uit als een collega hem heeft gecheckt.', standaard: false, getal: { sleutel: 'offerte_check_drempel', label: 'Vanaf bedrag ex btw', standaard: 5000, eenheid: '€' }, artikel: 'offerte-vervolg' },
  // Klanten
  { sleutel: 'klant_waarschuwing', groep: 'klanten', label: 'Vaste notitie als waarschuwing', uitleg: 'Een notitie op de klant die opduikt op offerte, project, werkbon, bestelbon en inkoopfactuur. "Altijd PO-nummer vragen."', standaard: true, artikel: 'klant-waarschuwing-tags' },
  { sleutel: 'klant_tags', groep: 'klanten', label: 'Tags op klanten', uitleg: 'Vrije labels als Kerstkaart of Beurs, met een filter in de klantenlijst.', standaard: true, artikel: 'klant-waarschuwing-tags' },
  { sleutel: 'prospect_wordt_klant', groep: 'klanten', label: 'Prospect wordt klant bij akkoord', uitleg: 'Zodra een offerte wordt geaccepteerd gaat de status van prospect naar klant.', standaard: true, artikel: 'klant-waarschuwing-tags' },
  // Projecten
  { sleutel: 'project_kanban', groep: 'projecten', label: 'Projecten als kolommen per fase', uitleg: 'Kanban-weergave met het bedrag per fase erboven. Wat er in productie hangt, in euro’s.', standaard: false, artikel: 'project-kanban-sjablonen' },
  { sleutel: 'project_sjablonen', groep: 'projecten', label: 'Projectsjablonen', uitleg: 'Sla een project op als sjabloon (bewerkingen en taken) en start een nieuw project daaruit.', standaard: false, artikel: 'project-kanban-sjablonen' },
  { sleutel: 'geschiedenis', groep: 'projecten', label: 'Geschiedenis per record', uitleg: 'Wie wat wanneer deed, op offerte en factuur. Het project heeft zijn eigen activiteitenfeed.', standaard: true, artikel: 'project-kanban-sjablonen' },
  // Planning
  { sleutel: 'planning_weergaven', groep: 'planning', label: 'Opgeslagen planningweergaven', uitleg: 'Bewaar een filter als weergave, bijvoorbeeld "Ploeg Noord deze week".', standaard: true, artikel: 'planning-weergaven-herhalen' },
  { sleutel: 'planning_herhalen', groep: 'planning', label: 'Herhaald inplannen', uitleg: 'Een montageafspraak wekelijks of maandelijks laten terugkomen, met einddatum.', standaard: false, artikel: 'planning-weergaven-herhalen' },
  { sleutel: 'uren_weekstaat', groep: 'planning', label: 'Weekstaat', uitleg: 'Uren per dag in een weekraster, met de dagnorm uit het contract ernaast. Naast het inklokken, niet in plaats van.', standaard: true, artikel: 'uren-weekstaat' },
  { sleutel: 'uren_goedkeuren', groep: 'planning', label: 'Uren goedkeuren', uitleg: 'Medewerkers dienen hun week in, een beheerder keurt goed. Alleen goedgekeurde uren gaan naar de factuur. Uit: elk uur telt meteen mee.', standaard: false, artikel: 'uren-weekstaat' },
  { sleutel: 'planning_bezetting', groep: 'planning', label: 'Bezetting per week', uitleg: 'Per medewerker gepland tegenover beschikbaar, uit contracturen min verlof en afwezigheid. Vier weken vooruit.', standaard: true, artikel: 'planning-bezetting' },
  { sleutel: 'uren_herinnering', groep: 'planning', label: 'Herinnering als er nog geen uren staan', uitleg: 'Aan het eind van de werkdag een melding voor wie vandaag nog niets schreef.', standaard: false, getal: { sleutel: 'uren_herinnering_uur', label: 'Om hoe laat', standaard: 16, eenheid: 'uur' }, artikel: 'meldingen-noemen' },
  // Facturen
  { sleutel: 'factuur_stepper', groep: 'facturen', label: 'Opvolgstappen bovenin de factuur', uitleg: 'Factuur, herinnering, aanmaning als stappen, met de actieve stap gekleurd.', standaard: true, artikel: 'factuur-opvolging-stepper' },
  { sleutel: 'factuur_actie_tab', groep: 'facturen', label: 'Tab "Vanavond de deur uit"', uitleg: 'Lijst van facturen waarvoor de volgende herinnering klaarstaat, met pauzeknop per factuur.', standaard: true, artikel: 'factuur-opvolging-stepper' },
  { sleutel: 'factuur_vergrendeling', groep: 'facturen', label: 'Vergrendeld na Exact-sync', uitleg: 'Een factuur die naar de boekhouding is, verandert niet meer. Corrigeren gaat via een creditfactuur.', standaard: true, artikel: 'factuur-opvolging-stepper' },
  { sleutel: 'factuur_deelfactuur', groep: 'facturen', label: 'Deelfactuur en aanbetaling', uitleg: 'Factureer per regel en verreken een aanbetaling automatisch op de eindfactuur.', standaard: true, artikel: 'deelfactuur-aanbetaling' },
  { sleutel: 'factuur_samenvoegen', groep: 'facturen', label: 'Conceptfacturen samenvoegen', uitleg: 'Meerdere concepten voor dezelfde klant op één factuur.', standaard: false, artikel: 'factuur-opvolging-stepper' },
  { sleutel: 'conceptfacturen_maandelijks', groep: 'facturen', label: 'Concepten op de eerste werkdag melden', uitleg: 'Op de eerste werkdag van de maand krijgen beheerders een melding met hoeveel conceptfacturen er klaarstaan. Versturen blijft een bewuste klik.', standaard: false, artikel: 'factuur-opvolging-stepper' },
  { sleutel: 'rapport_ouderdom', groep: 'facturen', label: 'Ouderdom per klant', uitleg: 'Openstaand in 0-30, 31-60, 61-90 en 91+ dagen, per klant uitklapbaar.', standaard: true, artikel: 'factuur-opvolging-stepper' },
  { sleutel: 'inkoop_leverancier_defaults', groep: 'facturen', label: 'Leverancier onthouden', uitleg: 'Betaaltermijn en grootboek van een inkoopfactuur bewaren als standaard voor die leverancier.', standaard: true, artikel: 'inkoop-leverancier' },
  // Mail
  { sleutel: 'mail_undo_verzenden', groep: 'mail', label: 'Bedenktijd na verzenden', uitleg: 'Na Verzenden blijft de mail een paar seconden staan met "Ongedaan maken". Verkeerde prijs of vergeten bijlage: terughalen in plaats van een tweede mail.', standaard: true, getal: { sleutel: 'mail_undo_seconden', label: 'Seconden bedenktijd', standaard: 8, eenheid: 's' }, artikel: 'mail-outlook-niveau' },
  { sleutel: 'mail_afbeeldingen_blokkeren', groep: 'mail', label: 'Externe afbeeldingen pas na klik', uitleg: 'Nieuwsbrieven en cold outreach laden hun plaatjes pas als je erom vraagt. Zo zien afzenders niet wanneer je een mail opent.', standaard: true, artikel: 'mail-outlook-niveau' },
  { sleutel: 'mail_verzonden_naar_server', groep: 'mail', label: 'Verzonden mail ook in je mailbox', uitleg: 'Wat je vanuit doen. verstuurt, komt ook in de Verzonden-map van je mailserver. Dus ook op je telefoon en in Outlook.', standaard: true, artikel: 'mail-outlook-niveau' },
  { sleutel: 'mail_split_inbox', groep: 'mail', label: 'Inbox gesplitst door Daan', uitleg: 'Aanvragen, klanten met een open offerte, leveranciers en overig als aparte tabs. Daan sorteert op wat er commercieel speelt, niet op afzender.', standaard: false, artikel: 'mail-outlook-niveau' },
  // Team
  { sleutel: 'meldingen_voorkeuren', groep: 'team', label: 'Meldingsvoorkeuren per persoon', uitleg: 'Ieder kiest zelf welke meldingen in de app en als push komen.', standaard: true, artikel: 'meldingen-noemen' },
  { sleutel: 'noemen', groep: 'team', label: 'Collega noemen met @', uitleg: 'Typ @ in een notitie en de collega krijgt een melding.', standaard: true, artikel: 'meldingen-noemen' },
  { sleutel: 'support_toegang', groep: 'team', label: 'Support tijdelijk toegang geven', uitleg: 'Geef doen.-support 48 uur meekijkrechten, met een overzicht van actieve sessies.', standaard: true, binnenkort: true },
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
