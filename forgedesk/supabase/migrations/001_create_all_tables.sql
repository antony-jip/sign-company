-- ============================================================
-- ForgeDesk: Volledige database migratie
-- Alle tabellen gebaseerd op forgedesk/src/types/index.ts
-- ============================================================

-- ============ PROFILES ============

CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  voornaam TEXT NOT NULL DEFAULT '',
  achternaam TEXT NOT NULL DEFAULT '',
  functie TEXT,
  email TEXT NOT NULL DEFAULT '',
  telefoon TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  bedrijfsnaam TEXT NOT NULL DEFAULT '',
  bedrijfs_adres TEXT NOT NULL DEFAULT '',
  bedrijfs_telefoon TEXT,
  bedrijfs_email TEXT,
  bedrijfs_website TEXT,
  kvk_nummer TEXT NOT NULL DEFAULT '',
  btw_nummer TEXT NOT NULL DEFAULT '',
  iban TEXT,
  taal TEXT NOT NULL DEFAULT 'nl' CHECK (taal IN ('nl', 'en')),
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON profiles FOR ALL USING (user_id = auth.uid());

-- ============ USER EMAIL SETTINGS ============

CREATE TABLE IF NOT EXISTS user_email_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gmail_address TEXT,
  app_password_encrypted TEXT,
  smtp_host TEXT DEFAULT 'smtp.gmail.com',
  smtp_port INTEGER DEFAULT 587,
  imap_host TEXT DEFAULT 'imap.gmail.com',
  imap_port INTEGER DEFAULT 993,
  is_verified BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_email_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON user_email_settings FOR ALL USING (user_id = auth.uid());

-- ============ KLANTEN ============

CREATE TABLE IF NOT EXISTS klanten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bedrijfsnaam TEXT NOT NULL DEFAULT '',
  contactpersoon TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefoon TEXT NOT NULL DEFAULT '',
  adres TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  stad TEXT NOT NULL DEFAULT '',
  land TEXT NOT NULL DEFAULT 'Nederland',
  website TEXT NOT NULL DEFAULT '',
  kvk_nummer TEXT NOT NULL DEFAULT '',
  btw_nummer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'actief' CHECK (status IN ('actief', 'inactief', 'prospect')),
  tags TEXT[] DEFAULT '{}',
  notities TEXT NOT NULL DEFAULT '',
  klant_labels TEXT[] DEFAULT '{}',
  gepinde_notitie TEXT,
  omzet_totaal NUMERIC DEFAULT 0,
  klant_sinds TEXT,
  laatst_actief TEXT,
  aantal_projecten INTEGER DEFAULT 0,
  aantal_offertes INTEGER DEFAULT 0,
  offertes_akkoord INTEGER DEFAULT 0,
  totaal_offertewaarde NUMERIC DEFAULT 0,
  accountmanager TEXT,
  import_bron TEXT,
  import_datum TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE klanten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON klanten FOR ALL USING (user_id = auth.uid());

-- ============ CONTACTPERSONEN (genest in Klant, aparte tabel) ============

CREATE TABLE IF NOT EXISTS contactpersonen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  naam TEXT NOT NULL DEFAULT '',
  functie TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefoon TEXT NOT NULL DEFAULT '',
  is_primair BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contactpersonen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON contactpersonen FOR ALL USING (user_id = auth.uid());

-- ============ VESTIGINGEN (genest in Klant, aparte tabel) ============

CREATE TABLE IF NOT EXISTS vestigingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  naam TEXT NOT NULL DEFAULT '',
  adres TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  stad TEXT NOT NULL DEFAULT '',
  land TEXT NOT NULL DEFAULT 'Nederland',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vestigingen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON vestigingen FOR ALL USING (user_id = auth.uid());

-- ============ KLANT ACTIVITEITEN ============

CREATE TABLE IF NOT EXISTS klant_activiteiten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  klant_naam TEXT,
  datum TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('project', 'offerte')),
  omschrijving TEXT NOT NULL DEFAULT '',
  bedrag NUMERIC,
  status TEXT,
  import_bron TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE klant_activiteiten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON klant_activiteiten FOR ALL USING (user_id = auth.uid());

-- ============ PROJECTEN ============

CREATE TABLE IF NOT EXISTS projecten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  klant_naam TEXT,
  naam TEXT NOT NULL DEFAULT '',
  beschrijving TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'gepland' CHECK (status IN ('gepland', 'actief', 'in-review', 'afgerond', 'on-hold', 'te-factureren')),
  prioriteit TEXT NOT NULL DEFAULT 'medium' CHECK (prioriteit IN ('laag', 'medium', 'hoog', 'kritiek')),
  start_datum TEXT NOT NULL DEFAULT '',
  eind_datum TEXT NOT NULL DEFAULT '',
  budget NUMERIC NOT NULL DEFAULT 0,
  besteed NUMERIC NOT NULL DEFAULT 0,
  voortgang NUMERIC NOT NULL DEFAULT 0,
  team_leden TEXT[] DEFAULT '{}',
  budget_waarschuwing_pct NUMERIC,
  bron_offerte_id UUID,
  contactpersoon_id UUID,
  vestiging_id UUID,
  vestiging_naam TEXT,
  is_template BOOLEAN DEFAULT false,
  bron_project_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projecten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON projecten FOR ALL USING (user_id = auth.uid());

-- ============ TAKEN ============

CREATE TABLE IF NOT EXISTS taken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL,
  titel TEXT NOT NULL DEFAULT '',
  beschrijving TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'bezig', 'review', 'klaar')),
  prioriteit TEXT NOT NULL DEFAULT 'medium' CHECK (prioriteit IN ('laag', 'medium', 'hoog', 'kritiek')),
  toegewezen_aan TEXT NOT NULL DEFAULT '',
  deadline TEXT NOT NULL DEFAULT '',
  geschatte_tijd NUMERIC NOT NULL DEFAULT 0,
  bestede_tijd NUMERIC NOT NULL DEFAULT 0,
  locatie TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE taken ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON taken FOR ALL USING (user_id = auth.uid());

-- ============ OFFERTES ============

CREATE TABLE IF NOT EXISTS offertes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  klant_naam TEXT,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  nummer TEXT NOT NULL DEFAULT '',
  titel TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'verzonden', 'bekeken', 'goedgekeurd', 'afgewezen', 'verlopen', 'gefactureerd')),
  subtotaal NUMERIC NOT NULL DEFAULT 0,
  btw_bedrag NUMERIC NOT NULL DEFAULT 0,
  totaal NUMERIC NOT NULL DEFAULT 0,
  geldig_tot TEXT NOT NULL DEFAULT '',
  notities TEXT NOT NULL DEFAULT '',
  voorwaarden TEXT NOT NULL DEFAULT '',
  follow_up_datum TEXT,
  follow_up_notitie TEXT,
  laatste_contact TEXT,
  follow_up_status TEXT DEFAULT 'geen' CHECK (follow_up_status IN ('geen', 'gepland', 'achterstallig', 'afgerond')),
  contact_pogingen INTEGER DEFAULT 0,
  prioriteit TEXT CHECK (prioriteit IN ('laag', 'medium', 'hoog', 'urgent')),
  deal_id UUID,
  geconverteerd_naar_project_id UUID,
  geconverteerd_naar_factuur_id UUID,
  bekeken_door_klant BOOLEAN DEFAULT false,
  eerste_bekeken_op TEXT,
  laatst_bekeken_op TEXT,
  aantal_keer_bekeken INTEGER DEFAULT 0,
  publiek_token TEXT,
  verloopdatum TEXT,
  verstuurd_op TEXT,
  verstuurd_naar TEXT,
  akkoord_op TEXT,
  intro_tekst TEXT,
  outro_tekst TEXT,
  contactpersoon_id UUID,
  activiteiten JSONB DEFAULT '[]',
  versie INTEGER DEFAULT 1,
  originele_offerte_id UUID,
  geldigheid_dagen INTEGER,
  afrondingskorting_excl_btw NUMERIC,
  aangepast_totaal NUMERIC,
  uren_correctie JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE offertes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON offertes FOR ALL USING (user_id = auth.uid());

-- ============ OFFERTE ITEMS ============

CREATE TABLE IF NOT EXISTS offerte_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offerte_id UUID NOT NULL REFERENCES offertes(id) ON DELETE CASCADE,
  beschrijving TEXT NOT NULL DEFAULT '',
  aantal NUMERIC NOT NULL DEFAULT 1,
  eenheidsprijs NUMERIC NOT NULL DEFAULT 0,
  btw_percentage NUMERIC NOT NULL DEFAULT 21,
  korting_percentage NUMERIC NOT NULL DEFAULT 0,
  totaal NUMERIC NOT NULL DEFAULT 0,
  volgorde INTEGER NOT NULL DEFAULT 0,
  soort TEXT DEFAULT 'prijs' CHECK (soort IN ('prijs', 'tekst')),
  extra_velden JSONB DEFAULT '{}',
  detail_regels JSONB DEFAULT '[]',
  calculatie_regels JSONB DEFAULT '[]',
  heeft_calculatie BOOLEAN DEFAULT false,
  prijs_varianten JSONB DEFAULT '[]',
  actieve_variant_id TEXT,
  breedte_mm NUMERIC,
  hoogte_mm NUMERIC,
  oppervlakte_m2 NUMERIC,
  afmeting_vrij BOOLEAN DEFAULT false,
  foto_url TEXT,
  foto_op_offerte BOOLEAN DEFAULT false,
  is_optioneel BOOLEAN DEFAULT false,
  interne_notitie TEXT,
  bijlage_url TEXT,
  bijlage_type TEXT,
  bijlage_naam TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE offerte_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON offerte_items FOR ALL USING (user_id = auth.uid());

-- ============ OFFERTE VERSIES ============

CREATE TABLE IF NOT EXISTS offerte_versies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offerte_id UUID NOT NULL REFERENCES offertes(id) ON DELETE CASCADE,
  versie_nummer INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  notitie TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE offerte_versies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON offerte_versies FOR ALL USING (user_id = auth.uid());

-- ============ DOCUMENTEN ============

CREATE TABLE IF NOT EXISTS documenten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL,
  naam TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  grootte INTEGER NOT NULL DEFAULT 0,
  map TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'review', 'definitief', 'gearchiveerd')),
  tags TEXT[] DEFAULT '{}',
  gedeeld_met TEXT[] DEFAULT '{}',
  beschrijving TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE documenten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON documenten FOR ALL USING (user_id = auth.uid());

-- ============ EMAILS ============

CREATE TABLE IF NOT EXISTS emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gmail_id TEXT NOT NULL DEFAULT '',
  van TEXT NOT NULL DEFAULT '',
  aan TEXT NOT NULL DEFAULT '',
  onderwerp TEXT NOT NULL DEFAULT '',
  inhoud TEXT NOT NULL DEFAULT '',
  datum TEXT NOT NULL DEFAULT '',
  gelezen BOOLEAN DEFAULT false,
  starred BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  snoozed_until TEXT,
  labels TEXT[] DEFAULT '{}',
  bijlagen INTEGER DEFAULT 0,
  map TEXT NOT NULL DEFAULT 'INBOX',
  scheduled_at TEXT,
  thread_id TEXT,
  internal_notes TEXT,
  follow_up_at TEXT,
  tracking JSONB,
  inbox_type TEXT DEFAULT 'persoonlijk' CHECK (inbox_type IN ('persoonlijk', 'gedeeld')),
  toegewezen_aan TEXT,
  ticket_status TEXT CHECK (ticket_status IN ('open', 'in_behandeling', 'wacht_op_klant', 'afgerond')),
  interne_notities JSONB DEFAULT '[]',
  prioriteit_inbox TEXT CHECK (prioriteit_inbox IN ('laag', 'normaal', 'hoog', 'urgent')),
  categorie_inbox TEXT CHECK (categorie_inbox IN ('offerte_aanvraag', 'klacht', 'informatie', 'support', 'overig')),
  contactpersoon_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON emails FOR ALL USING (user_id = auth.uid());

-- ============ EMAIL SEQUENCES ============

CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  beschrijving TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('actief', 'gepauzeerd', 'concept')),
  stappen JSONB DEFAULT '[]',
  ontvangers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON email_sequences FOR ALL USING (user_id = auth.uid());

-- ============ CALENDAR EVENTS ============

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  titel TEXT NOT NULL DEFAULT '',
  beschrijving TEXT NOT NULL DEFAULT '',
  start_datum TEXT NOT NULL DEFAULT '',
  eind_datum TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'meeting' CHECK (type IN ('meeting', 'deadline', 'herinnering', 'persoonlijk')),
  locatie TEXT NOT NULL DEFAULT '',
  deelnemers TEXT[] DEFAULT '{}',
  kleur TEXT NOT NULL DEFAULT '#3B82F6',
  herhaling TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON calendar_events FOR ALL USING (user_id = auth.uid());

-- ============ GROOTBOEKEN ============

CREATE TABLE IF NOT EXISTS grootboeken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  naam TEXT NOT NULL DEFAULT '',
  categorie TEXT NOT NULL CHECK (categorie IN ('activa', 'passiva', 'omzet', 'kosten')),
  saldo NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE grootboeken ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON grootboeken FOR ALL USING (user_id = auth.uid());

-- ============ BTW CODES ============

CREATE TABLE IF NOT EXISTS btw_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  omschrijving TEXT NOT NULL DEFAULT '',
  percentage NUMERIC NOT NULL DEFAULT 21,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE btw_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON btw_codes FOR ALL USING (user_id = auth.uid());

-- ============ KORTINGEN ============

CREATE TABLE IF NOT EXISTS kortingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('percentage', 'vast_bedrag')),
  waarde NUMERIC NOT NULL DEFAULT 0,
  voorwaarden TEXT NOT NULL DEFAULT '',
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kortingen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON kortingen FOR ALL USING (user_id = auth.uid());

-- ============ AI CHATS ============

CREATE TABLE IF NOT EXISTS ai_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('user', 'assistant')),
  bericht TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON ai_chats FOR ALL USING (user_id = auth.uid());

-- ============ NIEUWSBRIEVEN ============

CREATE TABLE IF NOT EXISTS nieuwsbrieven (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  onderwerp TEXT NOT NULL DEFAULT '',
  html_inhoud TEXT NOT NULL DEFAULT '',
  ontvangers TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'gepland', 'verzonden')),
  verzonden_op TEXT,
  gepland_op TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nieuwsbrieven ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON nieuwsbrieven FOR ALL USING (user_id = auth.uid());

-- ============ APP SETTINGS ============

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  branche TEXT NOT NULL DEFAULT '',
  branche_preset TEXT NOT NULL DEFAULT 'sign_company',
  valuta TEXT NOT NULL DEFAULT 'EUR',
  valuta_symbool TEXT NOT NULL DEFAULT 'E',
  standaard_btw NUMERIC NOT NULL DEFAULT 21,
  pipeline_stappen JSONB DEFAULT '[]',
  offerte_geldigheid_dagen INTEGER NOT NULL DEFAULT 30,
  offerte_prefix TEXT NOT NULL DEFAULT 'OFF-',
  offerte_volgnummer INTEGER NOT NULL DEFAULT 1,
  auto_follow_up BOOLEAN DEFAULT false,
  follow_up_dagen INTEGER NOT NULL DEFAULT 7,
  melding_follow_up BOOLEAN DEFAULT true,
  melding_verlopen BOOLEAN DEFAULT true,
  melding_nieuwe_offerte BOOLEAN DEFAULT true,
  melding_status_wijziging BOOLEAN DEFAULT true,
  email_handtekening TEXT NOT NULL DEFAULT '',
  primaire_kleur TEXT NOT NULL DEFAULT '#3B82F6',
  secundaire_kleur TEXT NOT NULL DEFAULT '#1E40AF',
  toon_conversie_rate BOOLEAN DEFAULT true,
  toon_dagen_open BOOLEAN DEFAULT true,
  toon_follow_up_indicatoren BOOLEAN DEFAULT true,
  dashboard_widgets TEXT[] DEFAULT '{}',
  sidebar_items TEXT[] DEFAULT '{}',
  calculatie_categorieen TEXT[] DEFAULT '{}',
  calculatie_eenheden TEXT[] DEFAULT '{}',
  calculatie_standaard_marge NUMERIC NOT NULL DEFAULT 35,
  calculatie_toon_inkoop_in_offerte BOOLEAN DEFAULT false,
  calculatie_uren_velden TEXT[] DEFAULT '{}',
  offerte_regel_velden TEXT[] DEFAULT '{}',
  kvk_api_key TEXT,
  kvk_api_enabled BOOLEAN DEFAULT false,
  factuur_prefix TEXT NOT NULL DEFAULT 'FACT-',
  factuur_volgnummer INTEGER NOT NULL DEFAULT 1,
  factuur_betaaltermijn_dagen INTEGER NOT NULL DEFAULT 30,
  factuur_voorwaarden TEXT NOT NULL DEFAULT '',
  factuur_intro_tekst TEXT NOT NULL DEFAULT '',
  factuur_outro_tekst TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON app_settings FOR ALL USING (user_id = auth.uid());

-- ============ CALCULATIE PRODUCTEN ============

CREATE TABLE IF NOT EXISTS calculatie_producten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  categorie TEXT NOT NULL DEFAULT '',
  eenheid TEXT NOT NULL DEFAULT '',
  inkoop_prijs NUMERIC NOT NULL DEFAULT 0,
  verkoop_prijs NUMERIC NOT NULL DEFAULT 0,
  standaard_marge NUMERIC NOT NULL DEFAULT 35,
  btw_percentage NUMERIC NOT NULL DEFAULT 21,
  actief BOOLEAN DEFAULT true,
  notitie TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calculatie_producten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON calculatie_producten FOR ALL USING (user_id = auth.uid());

-- ============ CALCULATIE TEMPLATES ============

CREATE TABLE IF NOT EXISTS calculatie_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  beschrijving TEXT NOT NULL DEFAULT '',
  regels JSONB DEFAULT '[]',
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calculatie_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON calculatie_templates FOR ALL USING (user_id = auth.uid());

-- ============ OFFERTE TEMPLATES ============

CREATE TABLE IF NOT EXISTS offerte_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  beschrijving TEXT NOT NULL DEFAULT '',
  regels JSONB DEFAULT '[]',
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE offerte_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON offerte_templates FOR ALL USING (user_id = auth.uid());

-- ============ TEKENING GOEDKEURINGEN ============

CREATE TABLE IF NOT EXISTS tekening_goedkeuringen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projecten(id) ON DELETE CASCADE,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  document_ids TEXT[] DEFAULT '{}',
  offerte_id UUID REFERENCES offertes(id) ON DELETE SET NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'verzonden' CHECK (status IN ('verzonden', 'bekeken', 'goedgekeurd', 'revisie')),
  email_aan TEXT NOT NULL DEFAULT '',
  email_onderwerp TEXT NOT NULL DEFAULT '',
  email_bericht TEXT NOT NULL DEFAULT '',
  revisie_opmerkingen TEXT,
  goedgekeurd_door TEXT,
  goedgekeurd_op TEXT,
  revisie_nummer INTEGER NOT NULL DEFAULT 1,
  vorige_goedkeuring_id UUID,
  eerste_bekeken_op TEXT,
  laatst_bekeken_op TEXT,
  aantal_keer_bekeken INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tekening_goedkeuringen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON tekening_goedkeuringen FOR ALL USING (user_id = auth.uid());

-- ============ INGEPLANDE EMAILS ============

CREATE TABLE IF NOT EXISTS ingeplande_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offerte_id UUID NOT NULL REFERENCES offertes(id) ON DELETE CASCADE,
  aan TEXT NOT NULL DEFAULT '',
  cc TEXT,
  bcc TEXT,
  onderwerp TEXT NOT NULL DEFAULT '',
  inhoud TEXT NOT NULL DEFAULT '',
  bijlagen JSONB DEFAULT '[]',
  gepland_op TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'gepland' CHECK (status IN ('gepland', 'verzonden', 'mislukt')),
  verzonden_op TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ingeplande_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON ingeplande_emails FOR ALL USING (user_id = auth.uid());

-- ============ FACTUREN ============

CREATE TABLE IF NOT EXISTS facturen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  klant_naam TEXT,
  offerte_id UUID REFERENCES offertes(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  nummer TEXT NOT NULL DEFAULT '',
  titel TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'verzonden', 'betaald', 'vervallen', 'gecrediteerd')),
  subtotaal NUMERIC NOT NULL DEFAULT 0,
  btw_bedrag NUMERIC NOT NULL DEFAULT 0,
  totaal NUMERIC NOT NULL DEFAULT 0,
  betaald_bedrag NUMERIC NOT NULL DEFAULT 0,
  factuurdatum TEXT NOT NULL DEFAULT '',
  vervaldatum TEXT NOT NULL DEFAULT '',
  betaaldatum TEXT,
  betalingsherinnering_verzonden BOOLEAN DEFAULT false,
  notities TEXT NOT NULL DEFAULT '',
  voorwaarden TEXT NOT NULL DEFAULT '',
  bron_type TEXT CHECK (bron_type IN ('offerte', 'project', 'handmatig')),
  bron_offerte_id UUID,
  bron_project_id UUID,
  betaaltermijn_dagen INTEGER,
  herinnering_1_verstuurd TEXT,
  herinnering_2_verstuurd TEXT,
  herinnering_3_verstuurd TEXT,
  aanmaning_verstuurd TEXT,
  factuur_type TEXT DEFAULT 'standaard' CHECK (factuur_type IN ('standaard', 'voorschot', 'creditnota', 'eindafrekening')),
  gerelateerde_factuur_id UUID,
  credit_reden TEXT,
  voorschot_percentage NUMERIC,
  is_voorschot_verrekend BOOLEAN DEFAULT false,
  verrekende_voorschot_ids TEXT[] DEFAULT '{}',
  werkbon_id UUID,
  betaal_token TEXT,
  betaal_link TEXT,
  betaal_methode TEXT DEFAULT 'handmatig' CHECK (betaal_methode IN ('handmatig', 'link', 'qr')),
  online_bekeken BOOLEAN DEFAULT false,
  online_bekeken_op TEXT,
  intro_tekst TEXT,
  outro_tekst TEXT,
  contactpersoon_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE facturen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON facturen FOR ALL USING (user_id = auth.uid());

-- ============ FACTUUR ITEMS ============

CREATE TABLE IF NOT EXISTS factuur_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  factuur_id UUID NOT NULL REFERENCES facturen(id) ON DELETE CASCADE,
  beschrijving TEXT NOT NULL DEFAULT '',
  aantal NUMERIC NOT NULL DEFAULT 1,
  eenheidsprijs NUMERIC NOT NULL DEFAULT 0,
  btw_percentage NUMERIC NOT NULL DEFAULT 21,
  korting_percentage NUMERIC NOT NULL DEFAULT 0,
  totaal NUMERIC NOT NULL DEFAULT 0,
  volgorde INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE factuur_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON factuur_items FOR ALL USING (user_id = auth.uid());

-- ============ TIJDREGISTRATIES ============

CREATE TABLE IF NOT EXISTS tijdregistraties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projecten(id) ON DELETE CASCADE,
  project_naam TEXT,
  taak_id UUID REFERENCES taken(id) ON DELETE SET NULL,
  medewerker_id UUID,
  medewerker_naam TEXT,
  omschrijving TEXT NOT NULL DEFAULT '',
  datum TEXT NOT NULL DEFAULT '',
  start_tijd TEXT NOT NULL DEFAULT '',
  eind_tijd TEXT NOT NULL DEFAULT '',
  duur_minuten INTEGER NOT NULL DEFAULT 0,
  uurtarief NUMERIC NOT NULL DEFAULT 0,
  facturabel BOOLEAN DEFAULT true,
  gefactureerd BOOLEAN DEFAULT false,
  factuur_id UUID REFERENCES facturen(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tijdregistraties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON tijdregistraties FOR ALL USING (user_id = auth.uid());

-- ============ MEDEWERKERS ============

CREATE TABLE IF NOT EXISTS medewerkers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefoon TEXT NOT NULL DEFAULT '',
  functie TEXT NOT NULL DEFAULT '',
  afdeling TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  uurtarief NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'actief' CHECK (status IN ('actief', 'inactief')),
  rol TEXT NOT NULL DEFAULT 'medewerker' CHECK (rol IN ('admin', 'medewerker', 'monteur', 'verkoop', 'productie')),
  app_rol TEXT CHECK (app_rol IN ('admin', 'medewerker', 'viewer')),
  vaardigheden TEXT[] DEFAULT '{}',
  start_datum TEXT NOT NULL DEFAULT '',
  notities TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE medewerkers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON medewerkers FOR ALL USING (user_id = auth.uid());

-- ============ NOTIFICATIES ============

CREATE TABLE IF NOT EXISTS notificaties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  titel TEXT NOT NULL DEFAULT '',
  bericht TEXT NOT NULL DEFAULT '',
  link TEXT,
  gelezen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notificaties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON notificaties FOR ALL USING (user_id = auth.uid());

-- ============ MONTAGE AFSPRAKEN ============

CREATE TABLE IF NOT EXISTS montage_afspraken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projecten(id) ON DELETE CASCADE,
  project_naam TEXT,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  klant_naam TEXT,
  contactpersoon_id UUID,
  titel TEXT NOT NULL DEFAULT '',
  beschrijving TEXT NOT NULL DEFAULT '',
  datum TEXT NOT NULL DEFAULT '',
  start_tijd TEXT NOT NULL DEFAULT '',
  eind_tijd TEXT NOT NULL DEFAULT '',
  locatie TEXT NOT NULL DEFAULT '',
  monteurs TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'gepland' CHECK (status IN ('gepland', 'onderweg', 'bezig', 'afgerond', 'uitgesteld')),
  materialen TEXT[] DEFAULT '{}',
  notities TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE montage_afspraken ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON montage_afspraken FOR ALL USING (user_id = auth.uid());

-- ============ VERLOF ============

CREATE TABLE IF NOT EXISTS verlof (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('vakantie', 'ziek', 'ouderschapsverlof', 'bijzonder', 'bedrijfssluiting')),
  start_datum TEXT NOT NULL,
  eind_datum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aangevraagd' CHECK (status IN ('aangevraagd', 'goedgekeurd', 'afgewezen')),
  opmerking TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE verlof ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON verlof FOR ALL USING (user_id = auth.uid());

-- ============ BEDRIJFSSLUITINGSDAGEN ============

CREATE TABLE IF NOT EXISTS bedrijfssluitingsdagen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  datum TEXT NOT NULL,
  omschrijving TEXT NOT NULL DEFAULT '',
  jaarlijks_herhalend BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bedrijfssluitingsdagen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON bedrijfssluitingsdagen FOR ALL USING (user_id = auth.uid());

-- ============ PROJECT TOEWIJZINGEN ============

CREATE TABLE IF NOT EXISTS project_toewijzingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projecten(id) ON DELETE CASCADE,
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  rol TEXT NOT NULL DEFAULT 'medewerker' CHECK (rol IN ('eigenaar', 'medewerker', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_toewijzingen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON project_toewijzingen FOR ALL USING (user_id = auth.uid());

-- ============ BOOKING SLOTS ============

CREATE TABLE IF NOT EXISTS booking_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dag_van_week INTEGER NOT NULL,
  start_tijd TEXT NOT NULL,
  eind_tijd TEXT NOT NULL,
  slot_duur_minuten INTEGER NOT NULL DEFAULT 30,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON booking_slots FOR ALL USING (user_id = auth.uid());

-- ============ BOOKING AFSPRAKEN ============

CREATE TABLE IF NOT EXISTS booking_afspraken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  klant_naam TEXT NOT NULL DEFAULT '',
  klant_email TEXT NOT NULL DEFAULT '',
  klant_telefoon TEXT,
  datum TEXT NOT NULL,
  start_tijd TEXT NOT NULL,
  eind_tijd TEXT NOT NULL,
  onderwerp TEXT,
  status TEXT NOT NULL DEFAULT 'gepland' CHECK (status IN ('gepland', 'bevestigd', 'geannuleerd')),
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE booking_afspraken ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON booking_afspraken FOR ALL USING (user_id = auth.uid());

-- ============ WERKBONNEN ============

CREATE TABLE IF NOT EXISTS werkbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  werkbon_nummer TEXT NOT NULL DEFAULT '',
  project_id UUID NOT NULL REFERENCES projecten(id) ON DELETE CASCADE,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  montage_afspraak_id UUID REFERENCES montage_afspraken(id) ON DELETE SET NULL,
  contactpersoon_id UUID,
  locatie_adres TEXT NOT NULL DEFAULT '',
  locatie_stad TEXT,
  locatie_postcode TEXT,
  datum TEXT NOT NULL,
  start_tijd TEXT,
  eind_tijd TEXT,
  pauze_minuten INTEGER,
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'ingediend', 'goedgekeurd', 'gefactureerd')),
  klant_handtekening TEXT,
  klant_naam_getekend TEXT,
  getekend_op TEXT,
  omschrijving TEXT,
  interne_notitie TEXT,
  factuur_id UUID REFERENCES facturen(id) ON DELETE SET NULL,
  kilometers NUMERIC,
  km_tarief NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE werkbonnen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON werkbonnen FOR ALL USING (user_id = auth.uid());

-- ============ WERKBON REGELS ============

CREATE TABLE IF NOT EXISTS werkbon_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  werkbon_id UUID NOT NULL REFERENCES werkbonnen(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('arbeid', 'materiaal', 'overig')),
  medewerker_id UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  uren NUMERIC,
  uurtarief NUMERIC,
  omschrijving TEXT NOT NULL DEFAULT '',
  aantal NUMERIC,
  eenheid TEXT,
  prijs_per_eenheid NUMERIC,
  totaal NUMERIC NOT NULL DEFAULT 0,
  factureerbaar BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE werkbon_regels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON werkbon_regels FOR ALL USING (user_id = auth.uid());

-- ============ WERKBON FOTOS ============

CREATE TABLE IF NOT EXISTS werkbon_fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  werkbon_id UUID NOT NULL REFERENCES werkbonnen(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('voor', 'na', 'overig')),
  url TEXT NOT NULL DEFAULT '',
  omschrijving TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE werkbon_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON werkbon_fotos FOR ALL USING (user_id = auth.uid());

-- ============ HERINNERING TEMPLATES ============

CREATE TABLE IF NOT EXISTS herinnering_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('herinnering_1', 'herinnering_2', 'herinnering_3', 'aanmaning')),
  onderwerp TEXT NOT NULL DEFAULT '',
  inhoud TEXT NOT NULL DEFAULT '',
  dagen_na_vervaldatum INTEGER NOT NULL DEFAULT 7,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE herinnering_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON herinnering_templates FOR ALL USING (user_id = auth.uid());

-- ============ LEVERANCIERS ============

CREATE TABLE IF NOT EXISTS leveranciers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bedrijfsnaam TEXT NOT NULL DEFAULT '',
  contactpersoon TEXT,
  email TEXT,
  telefoon TEXT,
  adres TEXT,
  postcode TEXT,
  stad TEXT,
  website TEXT,
  kvk_nummer TEXT,
  btw_nummer TEXT,
  iban TEXT,
  categorie TEXT,
  notitie TEXT,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leveranciers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON leveranciers FOR ALL USING (user_id = auth.uid());

-- ============ UITGAVEN ============

CREATE TABLE IF NOT EXISTS uitgaven (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  uitgave_nummer TEXT NOT NULL DEFAULT '',
  leverancier_id UUID REFERENCES leveranciers(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('inkoopfactuur', 'bon', 'abonnement', 'kilometervergoeding', 'overig')),
  referentie_nummer TEXT,
  bedrag_excl_btw NUMERIC NOT NULL DEFAULT 0,
  btw_bedrag NUMERIC NOT NULL DEFAULT 0,
  btw_percentage NUMERIC NOT NULL DEFAULT 21,
  bedrag_incl_btw NUMERIC NOT NULL DEFAULT 0,
  datum TEXT NOT NULL,
  vervaldatum TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'betaald', 'verlopen')),
  betaald_op TEXT,
  categorie TEXT NOT NULL CHECK (categorie IN ('materiaal', 'arbeid_extern', 'transport', 'gereedschap', 'kantoor', 'software', 'verzekering', 'overig')),
  grootboek_id UUID REFERENCES grootboeken(id) ON DELETE SET NULL,
  bijlage_url TEXT,
  omschrijving TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE uitgaven ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON uitgaven FOR ALL USING (user_id = auth.uid());

-- ============ BESTELBONNEN ============

CREATE TABLE IF NOT EXISTS bestelbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bestelbon_nummer TEXT NOT NULL DEFAULT '',
  leverancier_id UUID NOT NULL REFERENCES leveranciers(id) ON DELETE CASCADE,
  offerte_id UUID REFERENCES offertes(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'besteld', 'deels_ontvangen', 'ontvangen', 'geannuleerd')),
  besteld_op TEXT,
  verwachte_levering TEXT,
  ontvangen_op TEXT,
  subtotaal NUMERIC NOT NULL DEFAULT 0,
  btw_bedrag NUMERIC NOT NULL DEFAULT 0,
  totaal NUMERIC NOT NULL DEFAULT 0,
  opmerkingen TEXT,
  interne_notitie TEXT,
  referentie TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bestelbonnen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON bestelbonnen FOR ALL USING (user_id = auth.uid());

-- ============ BESTELBON REGELS ============

CREATE TABLE IF NOT EXISTS bestelbon_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bestelbon_id UUID NOT NULL REFERENCES bestelbonnen(id) ON DELETE CASCADE,
  omschrijving TEXT NOT NULL DEFAULT '',
  aantal NUMERIC NOT NULL DEFAULT 1,
  eenheid TEXT,
  prijs_per_eenheid NUMERIC NOT NULL DEFAULT 0,
  btw_percentage NUMERIC NOT NULL DEFAULT 21,
  totaal NUMERIC NOT NULL DEFAULT 0,
  aantal_ontvangen NUMERIC,
  volledig_ontvangen BOOLEAN DEFAULT false,
  offerte_item_id UUID REFERENCES offerte_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bestelbon_regels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON bestelbon_regels FOR ALL USING (user_id = auth.uid());

-- ============ LEVERINGSBONNEN ============

CREATE TABLE IF NOT EXISTS leveringsbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  leveringsbon_nummer TEXT NOT NULL DEFAULT '',
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  werkbon_id UUID REFERENCES werkbonnen(id) ON DELETE SET NULL,
  bestelbon_id UUID REFERENCES bestelbonnen(id) ON DELETE SET NULL,
  datum TEXT NOT NULL,
  locatie_adres TEXT NOT NULL DEFAULT '',
  locatie_stad TEXT,
  locatie_postcode TEXT,
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'geleverd', 'getekend')),
  klant_handtekening TEXT,
  klant_naam_getekend TEXT,
  getekend_op TEXT,
  omschrijving TEXT,
  opmerkingen_klant TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leveringsbonnen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON leveringsbonnen FOR ALL USING (user_id = auth.uid());

-- ============ LEVERINGSBON REGELS ============

CREATE TABLE IF NOT EXISTS leveringsbon_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  leveringsbon_id UUID NOT NULL REFERENCES leveringsbonnen(id) ON DELETE CASCADE,
  omschrijving TEXT NOT NULL DEFAULT '',
  aantal NUMERIC NOT NULL DEFAULT 1,
  eenheid TEXT,
  opmerking TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leveringsbon_regels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON leveringsbon_regels FOR ALL USING (user_id = auth.uid());

-- ============ VOORRAAD ARTIKELEN ============

CREATE TABLE IF NOT EXISTS voorraad_artikelen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  sku TEXT,
  categorie TEXT NOT NULL DEFAULT '',
  eenheid TEXT NOT NULL DEFAULT '',
  huidige_voorraad NUMERIC NOT NULL DEFAULT 0,
  minimum_voorraad NUMERIC NOT NULL DEFAULT 0,
  maximum_voorraad NUMERIC,
  inkoop_prijs NUMERIC NOT NULL DEFAULT 0,
  verkoop_prijs NUMERIC,
  leverancier_id UUID REFERENCES leveranciers(id) ON DELETE SET NULL,
  leverancier_artikelnummer TEXT,
  levertijd_dagen INTEGER,
  opslaglocatie TEXT,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE voorraad_artikelen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON voorraad_artikelen FOR ALL USING (user_id = auth.uid());

-- ============ VOORRAAD MUTATIES ============

CREATE TABLE IF NOT EXISTS voorraad_mutaties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  artikel_id UUID NOT NULL REFERENCES voorraad_artikelen(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('inkoop', 'verbruik', 'correctie', 'retour')),
  aantal NUMERIC NOT NULL DEFAULT 0,
  reden TEXT,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  bestelbon_id UUID REFERENCES bestelbonnen(id) ON DELETE SET NULL,
  werkbon_id UUID REFERENCES werkbonnen(id) ON DELETE SET NULL,
  saldo_na_mutatie NUMERIC NOT NULL DEFAULT 0,
  datum TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE voorraad_mutaties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON voorraad_mutaties FOR ALL USING (user_id = auth.uid());

-- ============ DEALS ============

CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  contactpersoon_id UUID,
  titel TEXT NOT NULL DEFAULT '',
  beschrijving TEXT,
  verwachte_waarde NUMERIC NOT NULL DEFAULT 0,
  werkelijke_waarde NUMERIC,
  fase TEXT NOT NULL DEFAULT '',
  fase_sinds TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'gewonnen', 'verloren', 'on-hold')),
  verloren_reden TEXT,
  gewonnen_op TEXT,
  verloren_op TEXT,
  verwachte_sluitdatum TEXT,
  kans_percentage NUMERIC,
  bron TEXT CHECK (bron IN ('website', 'telefoon', 'email', 'referentie', 'social_media', 'beurs', 'overig')),
  offerte_ids TEXT[] DEFAULT '{}',
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  medewerker_id UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  laatste_activiteit TEXT,
  volgende_actie TEXT,
  volgende_actie_datum TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON deals FOR ALL USING (user_id = auth.uid());

-- ============ DEAL ACTIVITEITEN ============

CREATE TABLE IF NOT EXISTS deal_activiteiten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('notitie', 'email', 'telefoon', 'vergadering', 'offerte_verstuurd', 'status_wijziging')),
  beschrijving TEXT NOT NULL DEFAULT '',
  datum TEXT NOT NULL,
  email_id UUID,
  offerte_id UUID REFERENCES offertes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE deal_activiteiten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON deal_activiteiten FOR ALL USING (user_id = auth.uid());

-- ============ LEAD FORMULIEREN ============

CREATE TABLE IF NOT EXISTS lead_formulieren (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  beschrijving TEXT,
  velden JSONB DEFAULT '[]',
  bedank_tekst TEXT NOT NULL DEFAULT 'Bedankt voor uw aanvraag!',
  redirect_url TEXT,
  email_notificatie BOOLEAN DEFAULT true,
  auto_deal_aanmaken BOOLEAN DEFAULT false,
  deal_fase TEXT,
  standaard_bron TEXT NOT NULL DEFAULT 'website',
  knop_tekst TEXT NOT NULL DEFAULT 'Versturen',
  kleur TEXT,
  publiek_token TEXT NOT NULL,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lead_formulieren ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON lead_formulieren FOR ALL USING (user_id = auth.uid());

-- ============ LEAD INZENDINGEN ============

CREATE TABLE IF NOT EXISTS lead_inzendingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  formulier_id UUID NOT NULL REFERENCES lead_formulieren(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  ip_adres TEXT,
  browser TEXT,
  pagina_url TEXT,
  status TEXT NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'bekeken', 'verwerkt')),
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lead_inzendingen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON lead_inzendingen FOR ALL USING (user_id = auth.uid());

-- ============ DOCUMENT STYLES ============

CREATE TABLE IF NOT EXISTS document_styles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template TEXT NOT NULL DEFAULT 'klassiek',
  heading_font TEXT NOT NULL DEFAULT 'Inter',
  body_font TEXT NOT NULL DEFAULT 'Inter',
  font_grootte_basis INTEGER NOT NULL DEFAULT 10,
  primaire_kleur TEXT NOT NULL DEFAULT '#3B82F6',
  secundaire_kleur TEXT NOT NULL DEFAULT '#1E40AF',
  accent_kleur TEXT NOT NULL DEFAULT '#F59E0B',
  tekst_kleur TEXT NOT NULL DEFAULT '#1F2937',
  marge_boven NUMERIC NOT NULL DEFAULT 20,
  marge_onder NUMERIC NOT NULL DEFAULT 20,
  marge_links NUMERIC NOT NULL DEFAULT 20,
  marge_rechts NUMERIC NOT NULL DEFAULT 20,
  logo_positie TEXT NOT NULL DEFAULT 'links' CHECK (logo_positie IN ('links', 'rechts', 'midden')),
  logo_grootte NUMERIC NOT NULL DEFAULT 120,
  briefpapier_url TEXT NOT NULL DEFAULT '',
  briefpapier_modus TEXT NOT NULL DEFAULT 'geen' CHECK (briefpapier_modus IN ('geen', 'achtergrond', 'alleen_eerste_pagina')),
  toon_header BOOLEAN DEFAULT true,
  toon_footer BOOLEAN DEFAULT true,
  footer_tekst TEXT NOT NULL DEFAULT '',
  tabel_stijl TEXT NOT NULL DEFAULT 'striped' CHECK (tabel_stijl IN ('striped', 'grid', 'plain')),
  tabel_header_kleur TEXT NOT NULL DEFAULT '#F3F4F6',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE document_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON document_styles FOR ALL USING (user_id = auth.uid());

-- ============ INDEXES ============

CREATE INDEX IF NOT EXISTS idx_klanten_user_id ON klanten(user_id);
CREATE INDEX IF NOT EXISTS idx_contactpersonen_klant_id ON contactpersonen(klant_id);
CREATE INDEX IF NOT EXISTS idx_vestigingen_klant_id ON vestigingen(klant_id);
CREATE INDEX IF NOT EXISTS idx_klant_activiteiten_klant_id ON klant_activiteiten(klant_id);
CREATE INDEX IF NOT EXISTS idx_projecten_user_id ON projecten(user_id);
CREATE INDEX IF NOT EXISTS idx_projecten_klant_id ON projecten(klant_id);
CREATE INDEX IF NOT EXISTS idx_taken_project_id ON taken(project_id);
CREATE INDEX IF NOT EXISTS idx_offertes_user_id ON offertes(user_id);
CREATE INDEX IF NOT EXISTS idx_offertes_klant_id ON offertes(klant_id);
CREATE INDEX IF NOT EXISTS idx_offerte_items_offerte_id ON offerte_items(offerte_id);
CREATE INDEX IF NOT EXISTS idx_offerte_versies_offerte_id ON offerte_versies(offerte_id);
CREATE INDEX IF NOT EXISTS idx_documenten_project_id ON documenten(project_id);
CREATE INDEX IF NOT EXISTS idx_documenten_klant_id ON documenten(klant_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_facturen_klant_id ON facturen(klant_id);
CREATE INDEX IF NOT EXISTS idx_factuur_items_factuur_id ON factuur_items(factuur_id);
CREATE INDEX IF NOT EXISTS idx_tijdregistraties_project_id ON tijdregistraties(project_id);
CREATE INDEX IF NOT EXISTS idx_montage_afspraken_project_id ON montage_afspraken(project_id);
CREATE INDEX IF NOT EXISTS idx_werkbonnen_project_id ON werkbonnen(project_id);
CREATE INDEX IF NOT EXISTS idx_werkbon_regels_werkbon_id ON werkbon_regels(werkbon_id);
CREATE INDEX IF NOT EXISTS idx_werkbon_fotos_werkbon_id ON werkbon_fotos(werkbon_id);
CREATE INDEX IF NOT EXISTS idx_uitgaven_leverancier_id ON uitgaven(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_bestelbonnen_leverancier_id ON bestelbonnen(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_bestelbon_regels_bestelbon_id ON bestelbon_regels(bestelbon_id);
CREATE INDEX IF NOT EXISTS idx_leveringsbonnen_klant_id ON leveringsbonnen(klant_id);
CREATE INDEX IF NOT EXISTS idx_leveringsbon_regels_leveringsbon_id ON leveringsbon_regels(leveringsbon_id);
CREATE INDEX IF NOT EXISTS idx_voorraad_artikelen_leverancier_id ON voorraad_artikelen(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_voorraad_mutaties_artikel_id ON voorraad_mutaties(artikel_id);
CREATE INDEX IF NOT EXISTS idx_deals_klant_id ON deals(klant_id);
CREATE INDEX IF NOT EXISTS idx_deal_activiteiten_deal_id ON deal_activiteiten(deal_id);
CREATE INDEX IF NOT EXISTS idx_lead_inzendingen_formulier_id ON lead_inzendingen(formulier_id);
CREATE INDEX IF NOT EXISTS idx_verlof_medewerker_id ON verlof(medewerker_id);
CREATE INDEX IF NOT EXISTS idx_project_toewijzingen_project_id ON project_toewijzingen(project_id);
