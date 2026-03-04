export interface Profile {
  id: string;
  voornaam: string;
  achternaam: string;
  functie?: string;
  email: string;
  telefoon: string;
  avatar_url: string;
  logo_url: string;
  bedrijfsnaam: string;
  bedrijfs_adres: string;
  bedrijfs_telefoon?: string;
  bedrijfs_email?: string;
  bedrijfs_website?: string;
  kvk_nummer: string;
  btw_nummer: string;
  iban?: string;
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

export interface Vestiging {
  id: string;
  naam: string;
  adres: string;
  postcode: string;
  stad: string;
  land: string;
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
  vestigingen?: Vestiging[];
  // Klant labels + gepinde notitie
  klant_labels?: string[];
  gepinde_notitie?: string;
  // Import velden
  omzet_totaal?: number;
  klant_sinds?: string;
  laatst_actief?: string;
  aantal_projecten?: number;
  aantal_offertes?: number;
  offertes_akkoord?: number;
  totaal_offertewaarde?: number;
  accountmanager?: string;
  import_bron?: string;
  import_datum?: string;
  created_at: string;
  updated_at: string;
}

// ============ KLANT ACTIVITEITEN & IMPORT ============

export interface KlantActiviteit {
  id: string;
  user_id: string;
  klant_id: string;
  klant_naam?: string;
  datum: string;
  type: 'project' | 'offerte';
  omschrijving: string;
  bedrag?: number;
  status?: string;           // "Akkoord" | "In afwachting" | "Niet akkoord"
  import_bron?: string;
  created_at: string;
  updated_at?: string;
}

export interface CSVKlantRij {
  bedrijfsnaam: string;
  adres: string;
  postcode: string;
  plaats: string;
  telefoon: string;
  email: string;
  kvk_nummer: string;
  btw_nummer: string;
  omzet_totaal: string;
  accountmanager: string;
  status: string;
  klant_sinds: string;
  laatst_actief: string;
  aantal_projecten: string;
  aantal_offertes: string;
  offertes_akkoord: string;
  totaal_offertewaarde: string;
  contactpersonen: string;
}

export interface CSVActiviteitRij {
  bedrijfsnaam: string;
  datum: string;
  type: string;
  omschrijving: string;
  bedrag: string;
  status: string;
}

export interface ImportResultaat {
  totaal: number;
  geimporteerd: number;
  overgeslagen: number;
  fouten: number;
  fout_details: string[];
}

export interface Project {
  id: string;
  user_id: string;
  klant_id: string;
  klant_naam?: string;
  naam: string;
  beschrijving: string;
  status: 'gepland' | 'actief' | 'in-review' | 'afgerond' | 'on-hold' | 'te-factureren';
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
  // Contactpersoon koppeling
  contactpersoon_id?: string;
  // Vestiging koppeling
  vestiging_id?: string;
  vestiging_naam?: string;
  // Feature 8: Project kopiëren / template
  is_template?: boolean;
  bron_project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Taak {
  id: string;
  user_id: string;
  project_id?: string;
  klant_id?: string;
  titel: string;
  beschrijving: string;
  status: 'todo' | 'bezig' | 'review' | 'klaar';
  prioriteit: 'laag' | 'medium' | 'hoog' | 'kritiek';
  toegewezen_aan: string;
  deadline: string;
  geschatte_tijd: number;
  bestede_tijd: number;
  locatie?: string;
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
  status: 'concept' | 'verzonden' | 'bekeken' | 'goedgekeurd' | 'afgewezen' | 'verlopen' | 'gefactureerd';
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
  deal_id?: string;
  // Feature 2: Offerte → Project → Factuur keten
  geconverteerd_naar_project_id?: string;
  geconverteerd_naar_factuur_id?: string;
  // Tier 2 Feature 2: Offerte Bekijk-Notificatie
  bekeken_door_klant?: boolean;
  eerste_bekeken_op?: string;
  laatst_bekeken_op?: string;
  aantal_keer_bekeken?: number;
  publiek_token?: string;
  // Sales tracking
  verloopdatum?: string;
  verstuurd_op?: string;
  verstuurd_naar?: string;
  akkoord_op?: string;
  // Teksten
  intro_tekst?: string;
  outro_tekst?: string;
  // Contactpersoon koppeling
  contactpersoon_id?: string;
  // Activiteit log
  activiteiten?: OfferteActiviteit[];
  // Versie tracking (FIX 12)
  versie?: number;
  originele_offerte_id?: string;
  // Geldigheid (FIX 14)
  geldigheid_dagen?: number;
  // Afrondingskorting (FIX 16)
  afrondingskorting_excl_btw?: number;
  aangepast_totaal?: number;
  // Uren correctie — handmatige +/- aanpassingen vanuit sidebar
  uren_correctie?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface OfferteActiviteit {
  datum: string;
  type: 'aangemaakt' | 'bewerkt' | 'verstuurd' | 'bekeken' | 'akkoord' | 'afgewezen' | 'gefactureerd';
  beschrijving: string;
  medewerker?: string;
}

export interface OfferteItem {
  id: string;
  user_id: string;
  offerte_id: string;
  beschrijving: string;
  aantal: number;
  eenheidsprijs: number;
  btw_percentage: number;
  korting_percentage: number;
  totaal: number;
  volgorde: number;
  soort?: 'prijs' | 'tekst';
  extra_velden?: Record<string, string>;
  detail_regels?: OfferteItemDetailRegel[];
  calculatie_regels?: CalculatieRegel[];
  heeft_calculatie?: boolean;
  prijs_varianten?: OfferteItemPrijsVariant[];
  actieve_variant_id?: string;
  // Afmetingen (FIX 9)
  breedte_mm?: number;
  hoogte_mm?: number;
  oppervlakte_m2?: number;
  afmeting_vrij?: boolean;
  // Foto (FIX 10)
  foto_url?: string;
  foto_op_offerte?: boolean;
  // Optioneel item (FIX 13)
  is_optioneel?: boolean;
  // Interne notitie (FIX 15)
  interne_notitie?: string;
  // Bijlage tekening/foto per item
  bijlage_url?: string;
  bijlage_type?: 'image/jpeg' | 'image/png' | 'application/pdf';
  bijlage_naam?: string;
  created_at: string;
  updated_at?: string;
}

export interface OfferteVersie {
  id: string;
  user_id: string;
  offerte_id: string;
  versie_nummer: number;
  snapshot: string;
  notitie?: string;
  created_at: string;
}

export interface OfferteItemDetailRegel {
  id: string;
  label: string;
  waarde: string;
}

export interface OfferteItemPrijsVariant {
  id: string;
  label: string;
  aantal: number;
  eenheidsprijs: number;
  btw_percentage: number;
  korting_percentage: number;
  calculatie_regels?: CalculatieRegel[];
  heeft_calculatie?: boolean;
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
  beschrijving?: string;
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
  snoozed_until?: string | null;
  labels: string[];
  bijlagen: number;
  map: string;
  scheduled_at?: string;
  thread_id?: string;
  internal_notes?: string;
  follow_up_at?: string | null;
  tracking?: EmailTracking;
  // Tier 3 Feature 3: Gedeelde Inbox
  inbox_type?: 'persoonlijk' | 'gedeeld';
  toegewezen_aan?: string;
  ticket_status?: 'open' | 'in_behandeling' | 'wacht_op_klant' | 'afgerond';
  interne_notities?: InternEmailNotitie[];
  prioriteit_inbox?: 'laag' | 'normaal' | 'hoog' | 'urgent';
  categorie_inbox?: 'offerte_aanvraag' | 'klacht' | 'informatie' | 'support' | 'overig';
  contactpersoon_id?: string;
  created_at: string;
  updated_at?: string;
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
  updated_at?: string;
}

export interface BtwCode {
  id: string;
  user_id: string;
  code: string;
  omschrijving: string;
  percentage: number;
  actief: boolean;
  created_at: string;
  updated_at?: string;
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
  updated_at?: string;
}

export interface AIChat {
  id: string;
  user_id: string;
  rol: 'user' | 'assistant';
  bericht: string;
  created_at: string;
  updated_at?: string;
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
  // Uren overzicht velden — welke productnamen/categorieën tellen als "uren" in de sidebar?
  // Bijv. ["Montage", "Voorbereiding", "Ontwerp & DTP", "Applicatie"]
  // Matched op product_naam of categorie (case-insensitive, contains-match)
  calculatie_uren_velden: string[];
  // Offerte regel velden - welke tekstvelden wil je per offerte-item?
  // Bijv. ["Materiaal", "Lay-out", "Montage", "Opmerking"]
  offerte_regel_velden: string[];
  // KvK integratie
  kvk_api_key?: string;
  kvk_api_enabled?: boolean;
  // Factuur instellingen
  factuur_prefix: string;
  factuur_volgnummer: number;
  factuur_betaaltermijn_dagen: number;
  factuur_voorwaarden: string;
  factuur_intro_tekst: string;
  factuur_outro_tekst: string;
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
  // Tier 2 Feature 2: Offerte Bekijk-Notificatie
  eerste_bekeken_op?: string;
  laatst_bekeken_op?: string;
  aantal_keer_bekeken?: number;
  created_at: string;
  updated_at: string;
}

// ============ INGEPLANDE EMAILS (Offerte) ============

export interface EmailBijlage {
  naam: string;
  grootte: number;
  type?: string;
  url?: string;
}

export interface IngeplandEmail {
  id: string;
  user_id: string;
  offerte_id: string;
  aan: string;
  cc?: string;
  bcc?: string;
  onderwerp: string;
  inhoud: string;
  bijlagen: EmailBijlage[];
  gepland_op: string;
  status: 'gepland' | 'verzonden' | 'mislukt';
  verzonden_op?: string;
  created_at: string;
  updated_at?: string;
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
  // Tier 1 Feature 2: Betalingsherinneringen
  betaaltermijn_dagen?: number;
  herinnering_1_verstuurd?: string;
  herinnering_2_verstuurd?: string;
  herinnering_3_verstuurd?: string;
  aanmaning_verstuurd?: string;
  // Tier 1 Feature 4: Creditnota's + Voorschotfacturen
  factuur_type?: 'standaard' | 'voorschot' | 'creditnota' | 'eindafrekening';
  gerelateerde_factuur_id?: string;
  credit_reden?: string;
  voorschot_percentage?: number;
  is_voorschot_verrekend?: boolean;
  verrekende_voorschot_ids?: string[];
  // Tier 1 Feature 1: Werkbon koppeling
  werkbon_id?: string;
  // Tier 2 Feature 1: Online Betaling
  betaal_token?: string;
  betaal_link?: string;
  betaal_methode?: 'handmatig' | 'link' | 'qr';
  online_bekeken?: boolean;
  online_bekeken_op?: string;
  // Teksten
  intro_tekst?: string;
  outro_tekst?: string;
  // Contactpersoon
  contactpersoon_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FactuurItem {
  id: string;
  user_id: string;
  factuur_id: string;
  beschrijving: string;
  aantal: number;
  eenheidsprijs: number;
  btw_percentage: number;
  korting_percentage: number;
  totaal: number;
  volgorde: number;
  created_at: string;
  updated_at?: string;
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
  updated_at?: string;
}

// ============ MONTAGE PLANNING ============

export interface MontageAfspraak {
  id: string;
  user_id: string;
  project_id: string;
  project_naam?: string;
  klant_id: string;
  klant_naam?: string;
  contactpersoon_id?: string;
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
  updated_at?: string;
}

export interface Bedrijfssluitingsdag {
  id: string;
  user_id: string;
  datum: string;
  omschrijving: string;
  jaarlijks_herhalend: boolean;
  created_at: string;
  updated_at?: string;
}

// ============ GEBRUIKERSRECHTEN (Feature 4) ============

export interface ProjectToewijzing {
  id: string;
  user_id: string;
  project_id: string;
  medewerker_id: string;
  rol: 'eigenaar' | 'medewerker' | 'viewer';
  created_at: string;
  updated_at?: string;
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
  updated_at?: string;
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
  updated_at?: string;
}

// ============ WERKBONNEN (Tier 1 Feature 1) ============

export interface Werkbon {
  id: string;
  user_id: string;
  werkbon_nummer: string;
  project_id: string;
  klant_id: string;
  montage_afspraak_id?: string;
  contactpersoon_id?: string;
  locatie_adres: string;
  locatie_stad?: string;
  locatie_postcode?: string;
  datum: string;
  start_tijd?: string;
  eind_tijd?: string;
  pauze_minuten?: number;
  status: 'concept' | 'ingediend' | 'goedgekeurd' | 'gefactureerd';
  klant_handtekening?: string;
  klant_naam_getekend?: string;
  getekend_op?: string;
  omschrijving?: string;
  interne_notitie?: string;
  factuur_id?: string;
  kilometers?: number;
  km_tarief?: number;
  created_at: string;
  updated_at?: string;
}

export interface WerkbonRegel {
  id: string;
  user_id: string;
  werkbon_id: string;
  type: 'arbeid' | 'materiaal' | 'overig';
  medewerker_id?: string;
  uren?: number;
  uurtarief?: number;
  omschrijving: string;
  aantal?: number;
  eenheid?: string;
  prijs_per_eenheid?: number;
  totaal: number;
  factureerbaar: boolean;
  created_at: string;
  updated_at?: string;
}

export interface WerkbonFoto {
  id: string;
  user_id: string;
  werkbon_id: string;
  type: 'voor' | 'na' | 'overig';
  url: string;
  omschrijving?: string;
  created_at: string;
  updated_at?: string;
}

// ============ BETALINGSHERINNERINGEN (Tier 1 Feature 2) ============

export interface HerinneringTemplate {
  id: string;
  user_id: string;
  type: 'herinnering_1' | 'herinnering_2' | 'herinnering_3' | 'aanmaning';
  onderwerp: string;
  inhoud: string;
  dagen_na_vervaldatum: number;
  actief: boolean;
  created_at: string;
  updated_at?: string;
}

// ============ UITGAVENBEHEER (Tier 1 Feature 3) ============

export interface Leverancier {
  id: string;
  user_id: string;
  bedrijfsnaam: string;
  contactpersoon?: string;
  email?: string;
  telefoon?: string;
  adres?: string;
  postcode?: string;
  stad?: string;
  website?: string;
  kvk_nummer?: string;
  btw_nummer?: string;
  iban?: string;
  categorie?: string;
  notitie?: string;
  actief: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Uitgave {
  id: string;
  user_id: string;
  uitgave_nummer: string;
  leverancier_id?: string;
  project_id?: string;
  type: 'inkoopfactuur' | 'bon' | 'abonnement' | 'kilometervergoeding' | 'overig';
  referentie_nummer?: string;
  bedrag_excl_btw: number;
  btw_bedrag: number;
  btw_percentage: number;
  bedrag_incl_btw: number;
  datum: string;
  vervaldatum?: string;
  status: 'open' | 'betaald' | 'verlopen';
  betaald_op?: string;
  categorie: 'materiaal' | 'arbeid_extern' | 'transport' | 'gereedschap' | 'kantoor' | 'software' | 'verzekering' | 'overig';
  grootboek_id?: string;
  bijlage_url?: string;
  omschrijving: string;
  created_at: string;
  updated_at?: string;
}

// ============ BESTELBONNEN (Tier 2 Feature 3) ============

export interface Bestelbon {
  id: string;
  user_id: string;
  bestelbon_nummer: string;
  leverancier_id: string;
  offerte_id?: string;
  project_id?: string;
  status: 'concept' | 'besteld' | 'deels_ontvangen' | 'ontvangen' | 'geannuleerd';
  besteld_op?: string;
  verwachte_levering?: string;
  ontvangen_op?: string;
  subtotaal: number;
  btw_bedrag: number;
  totaal: number;
  opmerkingen?: string;
  interne_notitie?: string;
  referentie?: string;
  created_at: string;
  updated_at?: string;
}

export interface BestelbonRegel {
  id: string;
  user_id: string;
  bestelbon_id: string;
  omschrijving: string;
  aantal: number;
  eenheid?: string;
  prijs_per_eenheid: number;
  btw_percentage: number;
  totaal: number;
  aantal_ontvangen?: number;
  volledig_ontvangen?: boolean;
  offerte_item_id?: string;
  created_at: string;
  updated_at?: string;
}

// ============ LEVERINGSBONNEN (Tier 2 Feature 4) ============

export interface Leveringsbon {
  id: string;
  user_id: string;
  leveringsbon_nummer: string;
  klant_id: string;
  project_id?: string;
  werkbon_id?: string;
  bestelbon_id?: string;
  datum: string;
  locatie_adres: string;
  locatie_stad?: string;
  locatie_postcode?: string;
  status: 'concept' | 'geleverd' | 'getekend';
  klant_handtekening?: string;
  klant_naam_getekend?: string;
  getekend_op?: string;
  omschrijving?: string;
  opmerkingen_klant?: string;
  created_at: string;
  updated_at?: string;
}

export interface LeveringsbonRegel {
  id: string;
  user_id: string;
  leveringsbon_id: string;
  omschrijving: string;
  aantal: number;
  eenheid?: string;
  opmerking?: string;
  created_at: string;
  updated_at?: string;
}

// ============ VOORRAADBEHEER (Tier 2 Feature 5) ============

export interface VoorraadArtikel {
  id: string;
  user_id: string;
  naam: string;
  sku?: string;
  categorie: string;
  eenheid: string;
  huidige_voorraad: number;
  minimum_voorraad: number;
  maximum_voorraad?: number;
  inkoop_prijs: number;
  verkoop_prijs?: number;
  leverancier_id?: string;
  leverancier_artikelnummer?: string;
  levertijd_dagen?: number;
  opslaglocatie?: string;
  actief: boolean;
  created_at: string;
  updated_at?: string;
}

export interface VoorraadMutatie {
  id: string;
  user_id: string;
  artikel_id: string;
  type: 'inkoop' | 'verbruik' | 'correctie' | 'retour';
  aantal: number;
  reden?: string;
  project_id?: string;
  bestelbon_id?: string;
  werkbon_id?: string;
  saldo_na_mutatie: number;
  datum: string;
  created_at: string;
  updated_at?: string;
}

// ============ DEALS / SALES PIPELINE (Tier 3 Feature 1) ============

export interface Deal {
  id: string;
  user_id: string;

  // Koppeling
  klant_id: string;
  contactpersoon_id?: string;

  // Deal info
  titel: string;
  beschrijving?: string;
  verwachte_waarde: number;
  werkelijke_waarde?: number;

  // Pipeline
  fase: string;
  fase_sinds: string;

  // Status
  status: 'open' | 'gewonnen' | 'verloren' | 'on-hold';
  verloren_reden?: string;
  gewonnen_op?: string;
  verloren_op?: string;

  // Verwachting
  verwachte_sluitdatum?: string;
  kans_percentage?: number;

  // Bron
  bron?: 'website' | 'telefoon' | 'email' | 'referentie' | 'social_media' | 'beurs' | 'overig';

  // Koppelingen
  offerte_ids?: string[];
  project_id?: string;

  // Eigenaar
  medewerker_id?: string;

  // Activiteiten
  laatste_activiteit?: string;
  volgende_actie?: string;
  volgende_actie_datum?: string;

  created_at: string;
  updated_at?: string;
}

export interface DealActiviteit {
  id: string;
  user_id: string;
  deal_id: string;

  type: 'notitie' | 'email' | 'telefoon' | 'vergadering' | 'offerte_verstuurd' | 'status_wijziging';
  beschrijving: string;
  datum: string;

  email_id?: string;
  offerte_id?: string;

  created_at: string;
  updated_at?: string;
}

// ============ LEAD CAPTURE (Tier 3 Feature 2) ============

export interface LeadFormulier {
  id: string;
  user_id: string;

  naam: string;
  beschrijving?: string;

  velden: LeadFormulierVeld[];

  bedank_tekst: string;
  redirect_url?: string;
  email_notificatie: boolean;
  auto_deal_aanmaken: boolean;
  deal_fase?: string;
  standaard_bron: string;

  knop_tekst: string;
  kleur?: string;

  publiek_token: string;

  actief: boolean;
  created_at: string;
  updated_at?: string;
}

export interface LeadFormulierVeld {
  id: string;
  label: string;
  type: 'tekst' | 'email' | 'telefoon' | 'textarea' | 'select' | 'checkbox';
  verplicht: boolean;
  placeholder?: string;
  opties?: string[];
  volgorde: number;
}

export interface LeadInzending {
  id: string;
  user_id: string;
  formulier_id: string;

  data: Record<string, string>;

  ip_adres?: string;
  browser?: string;
  pagina_url?: string;

  status: 'nieuw' | 'bekeken' | 'verwerkt';
  deal_id?: string;
  klant_id?: string;

  created_at: string;
  updated_at?: string;
}

// ============ GEDEELDE INBOX UITBREIDING (Tier 3 Feature 3) ============

export interface InternEmailNotitie {
  id: string;
  medewerker_id: string;
  medewerker_naam: string;
  tekst: string;
  datum: string;
}

// ============ KVK LOOKUP (Tier 3 Feature 4) ============

export interface KvkResultaat {
  kvk_nummer: string;
  bedrijfsnaam: string;
  adres?: string;
  postcode?: string;
  stad?: string;
  btw_nummer?: string;
}

// ============ DOCUMENT STYLING / HUISSTIJL ============

export type DocumentTemplateId = 'klassiek' | 'modern' | 'minimaal' | 'industrieel';
export type LogoPositie = 'links' | 'rechts' | 'midden';
export type BriefpapierModus = 'geen' | 'achtergrond' | 'alleen_eerste_pagina';

export interface DocumentStyle {
  id: string;
  user_id: string;
  // Template basis
  template: DocumentTemplateId;
  // Lettertypen
  heading_font: string;
  body_font: string;
  font_grootte_basis: number;
  // Kleuren
  primaire_kleur: string;
  secundaire_kleur: string;
  accent_kleur: string;
  tekst_kleur: string;
  // Marges (in mm)
  marge_boven: number;
  marge_onder: number;
  marge_links: number;
  marge_rechts: number;
  // Logo
  logo_positie: LogoPositie;
  logo_grootte: number;
  // Briefpapier
  briefpapier_url: string;
  briefpapier_modus: BriefpapierModus;
  // Header / Footer
  toon_header: boolean;
  toon_footer: boolean;
  footer_tekst: string;
  // Tabel styling
  tabel_stijl: 'striped' | 'grid' | 'plain';
  tabel_header_kleur: string;
  created_at: string;
  updated_at: string;
}
