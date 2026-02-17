export interface Profile {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  telefoon: string;
  avatar_url: string;
  bedrijfsnaam: string;
  bedrijfs_adres: string;
  kvk_nummer: string;
  btw_nummer: string;
  taal: 'nl' | 'en';
  theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
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
  nummer: string;
  titel: string;
  status: 'concept' | 'verzonden' | 'bekeken' | 'goedgekeurd' | 'afgewezen';
  subtotaal: number;
  btw_bedrag: number;
  totaal: number;
  geldig_tot: string;
  notities: string;
  voorwaarden: string;
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
  labels: string[];
  bijlagen: number;
  map: string;
  scheduled_at?: string;
  created_at: string;
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

export type SortDirection = 'asc' | 'desc';
