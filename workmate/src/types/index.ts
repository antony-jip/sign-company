export interface Profile {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  telefoon: string;
  avatar_url: string;
  logo_url: string;
  bedrijfsnaam: string;
  bedrijfs_adres: string;
  kvk_nummer: string;
  btw_nummer: string;
  taal: 'nl' | 'en';
  theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}

export interface Contactpersoon {
  id: string;
  naam: string;
  functie: string;
  email: string;
  telefoon: string;
  is_primair: boolean;
}

export interface Klant {
  id: string;
  user_id: string;
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
  adres: string;
  postcode: string;
  stad: string;
  land: string;
  website: string;
  kvk_nummer: string;
  btw_nummer: string;
  status: 'actief' | 'inactief' | 'prospect';
  tags: string[];
  notities: string;
  contactpersonen: Contactpersoon[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  klant_id: string;
  klant_naam?: string;
  naam: string;
  beschrijving: string;
  status: 'gepland' | 'actief' | 'in-review' | 'afgerond' | 'on-hold';
  prioriteit: 'laag' | 'medium' | 'hoog' | 'kritiek';
  start_datum: string;
  eind_datum: string;
  budget: number;
  besteed: number;
  voortgang: number;
  team_leden: string[];
  // Feature 1: Budget meldingen
  budget_waarschuwing_pct?: number;
  // Feature 2: Offerte → Project keten
  bron_offerte_id?: string;
  // Feature 8: Project kopiëren / template
  is_template?: boolean;
  bron_project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Taak {
  id: string;
  user_id: string;
  project_id: string;
  titel: string;
  beschrijving: string;
  status: 'todo' | 'bezig' | 'review' | 'klaar';
  prioriteit: 'laag' | 'medium' | 'hoog' | 'kritiek';
  toegewezen_aan: string;
  deadline: string;
  geschatte_tijd: number;
  bestede_tijd: number;
  created_at: string;
  updated_at: string;
}

export interface Offerte {
  id: string;
  user_id: string;
  klant_id: string;
  klant_naam?: string;
  project_id?: string;
  nummer: string;
  titel: string;
  status: 'concept' | 'verzonden' | 'bekeken' | 'goedgekeurd' | 'afgewezen';
  subtotaal: number;
  btw_bedrag: number;
  totaal: number;
  geldig_tot: string;
  notities: string;
  voorwaarden: string;
  follow_up_datum?: string;
  follow_up_notitie?: string;
  laatste_contact?: string;
  follow_up_status?: 'geen' | 'gepland' | 'achterstallig' | 'afgerond';
  contact_pogingen?: number;
  prioriteit?: 'laag' | 'medium' | 'hoog' | 'urgent';
  // Feature 2: Offerte → Project → Factuur keten
  geconverteerd_naar_project_id?: string;
  geconverteerd_naar_factuur_id?: string;
  created_at: string;
  updated_at: string;
}

export interface OfferteItem {
  id: string;
  offerte_id: string;
  beschrijving: string;
  aantal: number;
  eenheidsprijs: number;
  btw_percentage: number;
  korting_percentage: number;
  totaal: number;
  volgorde: number;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  project_id: string | null;
  klant_id: string | null;
  naam: string;
  type: string;
  grootte: number;
  map: string;
  storage_path: string;
  status: 'concept' | 'review' | 'definitief' | 'gearchiveerd';
  tags: string[];
  gedeeld_met: string[];
  created_at: string;
  updated_at: string;
}

export interface Email {
  id: string;
  user_id: string;
  gmail_id: string;
  van: string;
  aan: string;
  onderwerp: string;
  inhoud: string;
  datum: string;
  gelezen: boolean;
  starred: boolean;
  pinned?: boolean;
  snoozed_until?: string;
  labels: string[];
  bijlagen: number;
  map: string;
  scheduled_at?: string;
  thread_id?: string;
  internal_notes?: string;
  follow_up_at?: string;
  tracking?: EmailTracking;
  created_at: string;
}

export interface EmailTracking {
  opens: number;
  last_opened?: string;
  clicks: number;
  last_clicked?: string;
  pixel_id?: string;
}

export interface EmailSequence {
  id: string;
  user_id: string;
  naam: string;
  beschrijving: string;
  status: 'actief' | 'gepauzeerd' | 'concept';
  stappen: EmailSequenceStap[];
  ontvangers: string[];
  created_at: string;
  updated_at: string;
}

export interface EmailSequenceStap {
  id: string;
  volgorde: number;
  onderwerp: string;
  inhoud: string;
  wacht_dagen: number;
  verzonden: number;
  geopend: number;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  project_id: string | null;
  titel: string;
  beschrijving: string;
  start_datum: string;
  eind_datum: string;
  type: 'meeting' | 'deadline' | 'herinnering' | 'persoonlijk';
  locatie: string;
  deelnemers: string[];
  kleur: string;
  herhaling: string;
  created_at: string;
  updated_at: string;
}

export interface Grootboek {
  id: string;
  user_id: string;
  code: string;
  naam: string;
  categorie: 'activa' | 'passiva' | 'omzet' | 'kosten';
  saldo: number;
  created_at: string;
}

export interface BtwCode {
  id: string;
  user_id: string;
  code: string;
  omschrijving: string;
  percentage: number;
  actief: boolean;
  created_at: string;
}

export interface Korting {
  id: string;
  user_id: string;
  naam: string;
  type: 'percentage' | 'vast_bedrag';
  waarde: number;
  voorwaarden: string;
  actief: boolean;
  created_at: string;
}

export interface AIChat {
  id: string;
  user_id: string;
  rol: 'user' | 'assistant';
  bericht: string;
  created_at: string;
}

export interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

export interface Nieuwsbrief {
  id: string;
  user_id: string;
  naam: string;
  onderwerp: string;
  html_inhoud: string;
  ontvangers: string[];
  status: 'concept' | 'gepland' | 'verzonden';
  verzonden_op?: string;
  gepland_op?: string;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: string;
  user_id: string;
  // Branche / Industry
  branche: string;
  branche_preset: 'sign_company' | 'bouw' | 'ict' | 'marketing' | 'detailhandel' | 'horeca' | 'zorg' | 'custom';
  // Valuta & BTW
  valuta: string;
  valuta_symbool: string;
  standaard_btw: number;
  // Pipeline aanpassing
  pipeline_stappen: PipelineStap[];
  // Offerte instellingen
  offerte_geldigheid_dagen: number;
  offerte_prefix: string;
  offerte_volgnummer: number;
  auto_follow_up: boolean;
  follow_up_dagen: number;
  // Meldingen
  melding_follow_up: boolean;
  melding_verlopen: boolean;
  melding_nieuwe_offerte: boolean;
  melding_status_wijziging: boolean;
  // Email handtekening
  email_handtekening: string;
  // Branding
  primaire_kleur: string;
  secundaire_kleur: string;
  // Weergave
  toon_conversie_rate: boolean;
  toon_dagen_open: boolean;
  toon_follow_up_indicatoren: boolean;
  dashboard_widgets: string[];
  // Sidebar navigatie - welke items zijn zichtbaar
  sidebar_items: string[];
  // Calculatie instellingen
  calculatie_categorieen: string[];            // Product categorieën (bijv. "Materiaal", "Arbeid")
  calculatie_eenheden: string[];               // Eenheden (bijv. "m²", "stuks", "uur")
  calculatie_standaard_marge: number;          // Standaard marge % voor nieuwe regels
  calculatie_toon_inkoop_in_offerte: boolean;  // Toon inkoopprijs in offerte (normaal niet!)
  // Offerte regel velden - welke tekstvelden wil je per offerte-item?
  // Bijv. ["Materiaal", "Lay-out", "Montage", "Opmerking"]
  offerte_regel_velden: string[];
  created_at: string;
  updated_at: string;
}

export interface PipelineStap {
  key: string;
  label: string;
  kleur: string;
  volgorde: number;
  actief: boolean;
}

// ============ CALCULATIE SYSTEEM ============

/**
 * Een product/dienst in je productcatalogus.
 * Stel deze in bij Instellingen > Calculatie zodat je ze snel kunt hergebruiken.
 */
export interface CalculatieProduct {
  id: string;
  user_id: string;
  naam: string;                    // Bijv. "Dibond plaat 3mm", "Montage per uur"
  categorie: string;               // Bijv. "Materiaal", "Arbeid", "Transport"
  eenheid: string;                 // Bijv. "m²", "stuks", "uur", "meter"
  inkoop_prijs: number;            // Wat je zelf betaalt (inkoopprijs)
  verkoop_prijs: number;           // Wat je de klant rekent (verkoopprijs)
  standaard_marge: number;         // Standaard marge in % (bijv. 35)
  btw_percentage: number;          // BTW tarief (21, 9, of 0)
  actief: boolean;                 // Staat het product actief in je catalogus?
  notitie: string;                 // Eventuele toelichting
  created_at: string;
  updated_at: string;
}

/**
 * Een regel in een calculatie.
 * Elke regel is een product/dienst met aantal, inkoop, verkoop, marge en korting.
 */
export interface CalculatieRegel {
  id: string;
  product_id?: string;             // Optioneel: link naar een catalogus-product
  product_naam: string;            // Productnaam (vrij invoerbaar of uit catalogus)
  categorie: string;               // Categorie van het product
  eenheid: string;                 // Eenheid (m², stuks, uur, etc.)
  aantal: number;                  // Hoeveel stuks/m²/uren
  inkoop_prijs: number;            // Inkoopprijs per eenheid
  verkoop_prijs: number;           // Verkoopprijs per eenheid
  marge_percentage: number;        // Marge % (automatisch berekend of handmatig)
  korting_percentage: number;      // Korting % die je aan de klant geeft
  nacalculatie: boolean;           // Markeer voor nacalculatie (achteraf verrekenen)
  btw_percentage: number;          // BTW tarief
  notitie: string;                 // Eventuele toelichting per regel
}

/**
 * Een calculatie-template die je kunt hergebruiken.
 * Stel veelgebruikte calculaties samen en gebruik ze bij nieuwe offertes.
 */
export interface CalculatieTemplate {
  id: string;
  user_id: string;
  naam: string;                    // Bijv. "Standaard gevelreclame", "Autobelettering basis"
  beschrijving: string;            // Korte omschrijving waar de template voor is
  regels: CalculatieRegel[];       // De regels in dit template
  actief: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * De calculatie die bij een offerte-item hoort.
 * Bevat alle regels die samen de prijs van het offerte-item bepalen.
 */
export interface OfferteItemCalculatie {
  offerte_item_id: string;
  regels: CalculatieRegel[];
  totaal_inkoop: number;
  totaal_verkoop: number;
  totaal_marge_bedrag: number;
  totaal_marge_percentage: number;
  notities: string;
}

/**
 * Een offerte-template: een complete set offerte-regels die je kunt hergebruiken.
 * Bijv. "Autobelettering", "Gevelreclame", "DTP werkzaamheden", "Website".
 * Aanmaken in Instellingen > Calculatie, importeren bij het aanmaken van een offerte.
 */
export interface OfferteTemplate {
  id: string;
  user_id: string;
  naam: string;                     // Bijv. "Autobelettering", "Gevelreclame"
  beschrijving: string;             // Korte uitleg waarvoor deze template is
  regels: OfferteTemplateRegel[];   // De vooringevulde offerte-regels
  actief: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Een regel in een offerte-template. Zelfde structuur als een QuoteLineItem
 * maar dan als template (zonder id, die wordt bij import gegenereerd).
 */
export interface OfferteTemplateRegel {
  soort: 'prijs' | 'tekst';
  beschrijving: string;
  extra_velden: Record<string, string>;
  aantal: number;
  eenheidsprijs: number;
  btw_percentage: number;
  korting_percentage: number;
}

// ============ TEKENING GOEDKEURING SYSTEEM ============

/**
 * Een tekening/bestand dat naar de klant gestuurd is ter goedkeuring.
 * De klant kan via een unieke link de tekening bekijken, goedkeuren of revisie aanvragen.
 */
export interface TekeningGoedkeuring {
  id: string;
  user_id: string;
  project_id: string;
  klant_id: string;
  // De documenten die ter goedkeuring zijn gestuurd
  document_ids: string[];
  // Optioneel: offerte meesturen
  offerte_id?: string;
  // Unieke token voor klant-link (zonder login)
  token: string;
  // Status van de goedkeuring
  status: 'verzonden' | 'bekeken' | 'goedgekeurd' | 'revisie';
  // Email details
  email_aan: string;
  email_onderwerp: string;
  email_bericht: string;
  // Klant feedback bij revisie
  revisie_opmerkingen?: string;
  // Klant naam bij goedkeuring
  goedgekeurd_door?: string;
  goedgekeurd_op?: string;
  // Revisie historie
  revisie_nummer: number;
  vorige_goedkeuring_id?: string;
  created_at: string;
  updated_at: string;
}

export type SortDirection = 'asc' | 'desc';

// ============ FACTUREN SYSTEEM ============

export interface Factuur {
  id: string;
  user_id: string;
  klant_id: string;
  klant_naam?: string;
  offerte_id?: string;
  project_id?: string;
  nummer: string;
  titel: string;
  status: 'concept' | 'verzonden' | 'betaald' | 'vervallen' | 'gecrediteerd';
  subtotaal: number;
  btw_bedrag: number;
  totaal: number;
  betaald_bedrag: number;
  factuurdatum: string;
  vervaldatum: string;
  betaaldatum?: string;
  betalingsherinnering_verzonden?: boolean;
  notities: string;
  voorwaarden: string;
  // Feature 2: Bron tracking
  bron_type?: 'offerte' | 'project' | 'handmatig';
  bron_offerte_id?: string;
  bron_project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FactuurItem {
  id: string;
  factuur_id: string;
  beschrijving: string;
  aantal: number;
  eenheidsprijs: number;
  btw_percentage: number;
  korting_percentage: number;
  totaal: number;
  volgorde: number;
  created_at: string;
}

// ============ TIJDREGISTRATIE ============

export interface Tijdregistratie {
  id: string;
  user_id: string;
  project_id: string;
  project_naam?: string;
  taak_id?: string;
  medewerker_id?: string;
  medewerker_naam?: string;
  omschrijving: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  duur_minuten: number;
  uurtarief: number;
  facturabel: boolean;
  gefactureerd: boolean;
  // Feature 7: Link naar factuur na facturatie
  factuur_id?: string;
  created_at: string;
  updated_at: string;
}

// ============ MEDEWERKERS ============

export interface Medewerker {
  id: string;
  user_id: string;
  naam: string;
  email: string;
  telefoon: string;
  functie: string;
  afdeling: string;
  avatar_url: string;
  uurtarief: number;
  status: 'actief' | 'inactief';
  rol: 'admin' | 'medewerker' | 'monteur' | 'verkoop' | 'productie';
  // Feature 4: App-brede rol voor rechten
  app_rol?: 'admin' | 'medewerker' | 'viewer';
  vaardigheden: string[];
  start_datum: string;
  notities: string;
  created_at: string;
  updated_at: string;
}

// ============ NOTIFICATIES ============

export interface Notificatie {
  id: string;
  user_id: string;
  type: 'offerte_bekeken' | 'offerte_verlopen' | 'factuur_vervallen' | 'deadline_nadert' | 'nieuwe_email' | 'taak_voltooid' | 'montage_gepland' | 'betaling_ontvangen' | 'budget_waarschuwing' | 'booking_nieuw' | 'algemeen';
  titel: string;
  bericht: string;
  link?: string;
  gelezen: boolean;
  created_at: string;
}

// ============ MONTAGE PLANNING ============

export interface MontageAfspraak {
  id: string;
  user_id: string;
  project_id: string;
  project_naam?: string;
  klant_id: string;
  klant_naam?: string;
  titel: string;
  beschrijving: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  monteurs: string[];
  status: 'gepland' | 'onderweg' | 'bezig' | 'afgerond' | 'uitgesteld';
  materialen: string[];
  notities: string;
  created_at: string;
  updated_at: string;
}

// ============ VERLOF & BESCHIKBAARHEID (Feature 3) ============

export interface Verlof {
  id: string;
  user_id: string;
  medewerker_id: string;
  type: 'vakantie' | 'ziek' | 'ouderschapsverlof' | 'bijzonder' | 'bedrijfssluiting';
  start_datum: string;
  eind_datum: string;
  status: 'aangevraagd' | 'goedgekeurd' | 'afgewezen';
  opmerking?: string;
  created_at: string;
}

export interface Bedrijfssluitingsdag {
  id: string;
  user_id: string;
  datum: string;
  omschrijving: string;
  jaarlijks_herhalend: boolean;
  created_at: string;
}

// ============ GEBRUIKERSRECHTEN (Feature 4) ============

export interface ProjectToewijzing {
  id: string;
  user_id: string;
  project_id: string;
  medewerker_id: string;
  rol: 'eigenaar' | 'medewerker' | 'viewer';
  created_at: string;
}

// ============ BOOKING SYSTEEM (Feature 6) ============

export interface BookingSlot {
  id: string;
  user_id: string;
  dag_van_week: number;
  start_tijd: string;
  eind_tijd: string;
  slot_duur_minuten: number;
  actief: boolean;
  created_at: string;
}

export interface BookingAfspraak {
  id: string;
  user_id: string;
  klant_naam: string;
  klant_email: string;
  klant_telefoon?: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  onderwerp?: string;
  status: 'gepland' | 'bevestigd' | 'geannuleerd';
  token: string;
  created_at: string;
}
