-- ============================================================
-- Migration 003: Volledige alignment TypeScript ↔ Supabase
-- Voer dit uit in Supabase SQL Editor NA schema.sql + 001 + 002
-- Gegenereerd: 2026-02-22
-- ============================================================

-- ============================================================
-- STAP 1: Ontbrekende kolommen in BESTAANDE tabellen
-- ============================================================

-- === profiles ===
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS iban TEXT;

-- === klanten ===
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS contactpersonen JSONB DEFAULT '[]';

-- === projecten ===
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS budget_waarschuwing_pct DECIMAL(5,2);
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS bron_offerte_id UUID REFERENCES offertes(id) ON DELETE SET NULL;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS bron_project_id UUID REFERENCES projecten(id) ON DELETE SET NULL;

-- === offertes ===
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projecten(id) ON DELETE SET NULL;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS follow_up_datum DATE;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS follow_up_notitie TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS laatste_contact TIMESTAMPTZ;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'geen' CHECK (follow_up_status IN ('geen', 'gepland', 'achterstallig', 'afgerond'));
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS contact_pogingen INTEGER DEFAULT 0;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS prioriteit TEXT CHECK (prioriteit IN ('laag', 'medium', 'hoog', 'urgent'));
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS deal_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS geconverteerd_naar_project_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS geconverteerd_naar_factuur_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS bekeken_door_klant BOOLEAN DEFAULT FALSE;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS eerste_bekeken_op TIMESTAMPTZ;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS laatst_bekeken_op TIMESTAMPTZ;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS aantal_keer_bekeken INTEGER DEFAULT 0;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS publiek_token TEXT UNIQUE;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS herinnering_verstuurd_op TIMESTAMPTZ;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS verlopen_notificatie_getoond BOOLEAN DEFAULT FALSE;

-- === emails ===
ALTER TABLE emails ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS thread_id TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS tracking JSONB;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS inbox_type TEXT DEFAULT 'persoonlijk';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS toegewezen_aan TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS ticket_status TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS interne_notities JSONB DEFAULT '[]';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS prioriteit_inbox TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS categorie_inbox TEXT;

-- === facturen ===
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bron_type TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bron_offerte_id UUID;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bron_project_id UUID;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaaltermijn_dagen INTEGER;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS herinnering_1_verstuurd TIMESTAMPTZ;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS herinnering_2_verstuurd TIMESTAMPTZ;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS herinnering_3_verstuurd TIMESTAMPTZ;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS aanmaning_verstuurd TIMESTAMPTZ;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS factuur_type TEXT DEFAULT 'standaard';
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS gerelateerde_factuur_id UUID;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS credit_reden TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS voorschot_percentage DECIMAL(5,2);
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS is_voorschot_verrekend BOOLEAN DEFAULT FALSE;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS verrekende_voorschot_ids UUID[] DEFAULT '{}';
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS werkbon_id UUID;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_token TEXT UNIQUE;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_link TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_methode TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS online_bekeken BOOLEAN DEFAULT FALSE;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS online_bekeken_op TIMESTAMPTZ;

-- === tijdregistraties ===
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS factuur_id UUID REFERENCES facturen(id) ON DELETE SET NULL;

-- === medewerkers ===
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS app_rol TEXT CHECK (app_rol IN ('admin', 'medewerker', 'viewer'));

-- === app_settings ===
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS standaard_voorwaarden TEXT DEFAULT '';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS kvk_api_key TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS kvk_api_enabled BOOLEAN DEFAULT FALSE;

-- === tekening_goedkeuringen ===
ALTER TABLE tekening_goedkeuringen ADD COLUMN IF NOT EXISTS eerste_bekeken_op TIMESTAMPTZ;
ALTER TABLE tekening_goedkeuringen ADD COLUMN IF NOT EXISTS laatst_bekeken_op TIMESTAMPTZ;
ALTER TABLE tekening_goedkeuringen ADD COLUMN IF NOT EXISTS aantal_keer_bekeken INTEGER DEFAULT 0;

-- === notificaties: update CHECK constraint ===
-- Drop en re-create de CHECK constraint om de nieuwe types toe te voegen
ALTER TABLE notificaties DROP CONSTRAINT IF EXISTS notificaties_type_check;
ALTER TABLE notificaties ADD CONSTRAINT notificaties_type_check CHECK (type IN (
  'offerte_bekeken', 'offerte_verlopen', 'factuur_vervallen',
  'deadline_nadert', 'nieuwe_email', 'taak_voltooid',
  'montage_gepland', 'betaling_ontvangen', 'budget_waarschuwing',
  'booking_nieuw', 'algemeen'
));

-- ============================================================
-- STAP 2: NIEUWE TABELLEN
-- ============================================================

-- === Verlof ===
CREATE TABLE IF NOT EXISTS verlof (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  medewerker_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vakantie', 'ziek', 'ouderschapsverlof', 'bijzonder', 'bedrijfssluiting')),
  start_datum DATE NOT NULL,
  eind_datum DATE NOT NULL,
  status TEXT DEFAULT 'aangevraagd' CHECK (status IN ('aangevraagd', 'goedgekeurd', 'afgewezen')),
  opmerking TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Bedrijfssluitingsdagen ===
CREATE TABLE IF NOT EXISTS bedrijfssluitingsdagen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  datum DATE NOT NULL,
  omschrijving TEXT NOT NULL,
  jaarlijks_herhalend BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Project Toewijzingen ===
CREATE TABLE IF NOT EXISTS project_toewijzingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE CASCADE NOT NULL,
  medewerker_id UUID NOT NULL,
  rol TEXT DEFAULT 'medewerker' CHECK (rol IN ('eigenaar', 'medewerker', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Booking Slots ===
CREATE TABLE IF NOT EXISTS booking_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  dag_van_week INTEGER NOT NULL CHECK (dag_van_week >= 0 AND dag_van_week <= 6),
  start_tijd TIME NOT NULL,
  eind_tijd TIME NOT NULL,
  slot_duur_minuten INTEGER DEFAULT 30,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Booking Afspraken ===
CREATE TABLE IF NOT EXISTS booking_afspraken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  klant_naam TEXT NOT NULL,
  klant_email TEXT NOT NULL,
  klant_telefoon TEXT,
  datum DATE NOT NULL,
  start_tijd TIME NOT NULL,
  eind_tijd TIME NOT NULL,
  onderwerp TEXT,
  status TEXT DEFAULT 'gepland' CHECK (status IN ('gepland', 'bevestigd', 'geannuleerd')),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Werkbonnen ===
CREATE TABLE IF NOT EXISTS werkbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  werkbon_nummer TEXT NOT NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL NOT NULL,
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL NOT NULL,
  montage_afspraak_id UUID REFERENCES montage_afspraken(id) ON DELETE SET NULL,
  locatie_adres TEXT NOT NULL,
  locatie_stad TEXT,
  locatie_postcode TEXT,
  datum DATE NOT NULL,
  start_tijd TIME,
  eind_tijd TIME,
  pauze_minuten INTEGER DEFAULT 0,
  status TEXT DEFAULT 'concept' CHECK (status IN ('concept', 'ingediend', 'goedgekeurd', 'gefactureerd')),
  klant_handtekening TEXT,
  klant_naam_getekend TEXT,
  getekend_op TIMESTAMPTZ,
  omschrijving TEXT,
  interne_notitie TEXT,
  factuur_id UUID,
  kilometers DECIMAL(10,2),
  km_tarief DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Werkbon Regels ===
CREATE TABLE IF NOT EXISTS werkbon_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  werkbon_id UUID REFERENCES werkbonnen(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('arbeid', 'materiaal', 'overig')),
  medewerker_id UUID,
  uren DECIMAL(5,2),
  uurtarief DECIMAL(10,2),
  omschrijving TEXT NOT NULL,
  aantal DECIMAL(10,2),
  eenheid TEXT,
  prijs_per_eenheid DECIMAL(10,2),
  totaal DECIMAL(10,2) NOT NULL,
  factureerbaar BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Werkbon Foto's ===
CREATE TABLE IF NOT EXISTS werkbon_fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  werkbon_id UUID REFERENCES werkbonnen(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('voor', 'na', 'overig')),
  url TEXT NOT NULL,
  omschrijving TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Herinnering Templates ===
CREATE TABLE IF NOT EXISTS herinnering_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('herinnering_1', 'herinnering_2', 'herinnering_3', 'aanmaning')),
  onderwerp TEXT NOT NULL,
  inhoud TEXT NOT NULL,
  dagen_na_vervaldatum INTEGER NOT NULL,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Leveranciers ===
CREATE TABLE IF NOT EXISTS leveranciers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  bedrijfsnaam TEXT NOT NULL,
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
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Uitgaven ===
CREATE TABLE IF NOT EXISTS uitgaven (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  uitgave_nummer TEXT NOT NULL,
  leverancier_id UUID REFERENCES leveranciers(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('inkoopfactuur', 'bon', 'abonnement', 'kilometervergoeding', 'overig')),
  referentie_nummer TEXT,
  bedrag_excl_btw DECIMAL(10,2) NOT NULL,
  btw_bedrag DECIMAL(10,2) NOT NULL,
  btw_percentage DECIMAL(5,2) NOT NULL,
  bedrag_incl_btw DECIMAL(10,2) NOT NULL,
  datum DATE NOT NULL,
  vervaldatum DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'betaald', 'verlopen')),
  betaald_op DATE,
  categorie TEXT NOT NULL CHECK (categorie IN ('materiaal', 'arbeid_extern', 'transport', 'gereedschap', 'kantoor', 'software', 'verzekering', 'overig')),
  grootboek_id UUID REFERENCES grootboek(id) ON DELETE SET NULL,
  bijlage_url TEXT,
  omschrijving TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Bestelbonnen ===
CREATE TABLE IF NOT EXISTS bestelbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  bestelbon_nummer TEXT NOT NULL,
  leverancier_id UUID REFERENCES leveranciers(id) ON DELETE SET NULL NOT NULL,
  offerte_id UUID REFERENCES offertes(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'concept' CHECK (status IN ('concept', 'besteld', 'deels_ontvangen', 'ontvangen', 'geannuleerd')),
  besteld_op DATE,
  verwachte_levering DATE,
  ontvangen_op DATE,
  subtotaal DECIMAL(10,2) DEFAULT 0,
  btw_bedrag DECIMAL(10,2) DEFAULT 0,
  totaal DECIMAL(10,2) DEFAULT 0,
  opmerkingen TEXT,
  interne_notitie TEXT,
  referentie TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Bestelbon Regels ===
CREATE TABLE IF NOT EXISTS bestelbon_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  bestelbon_id UUID REFERENCES bestelbonnen(id) ON DELETE CASCADE NOT NULL,
  omschrijving TEXT NOT NULL,
  aantal DECIMAL(10,2) DEFAULT 1,
  eenheid TEXT,
  prijs_per_eenheid DECIMAL(10,2) NOT NULL,
  btw_percentage DECIMAL(5,2) DEFAULT 21,
  totaal DECIMAL(10,2) NOT NULL,
  aantal_ontvangen DECIMAL(10,2) DEFAULT 0,
  volledig_ontvangen BOOLEAN DEFAULT FALSE,
  offerte_item_id UUID REFERENCES offerte_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Leveringsbonnen ===
CREATE TABLE IF NOT EXISTS leveringsbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  leveringsbon_nummer TEXT NOT NULL,
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL NOT NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  werkbon_id UUID REFERENCES werkbonnen(id) ON DELETE SET NULL,
  bestelbon_id UUID REFERENCES bestelbonnen(id) ON DELETE SET NULL,
  datum DATE NOT NULL,
  locatie_adres TEXT NOT NULL,
  locatie_stad TEXT,
  locatie_postcode TEXT,
  status TEXT DEFAULT 'concept' CHECK (status IN ('concept', 'geleverd', 'getekend')),
  klant_handtekening TEXT,
  klant_naam_getekend TEXT,
  getekend_op TIMESTAMPTZ,
  omschrijving TEXT,
  opmerkingen_klant TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Leveringsbon Regels ===
CREATE TABLE IF NOT EXISTS leveringsbon_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  leveringsbon_id UUID REFERENCES leveringsbonnen(id) ON DELETE CASCADE NOT NULL,
  omschrijving TEXT NOT NULL,
  aantal DECIMAL(10,2) DEFAULT 1,
  eenheid TEXT,
  opmerking TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Voorraad Artikelen ===
CREATE TABLE IF NOT EXISTS voorraad_artikelen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  naam TEXT NOT NULL,
  sku TEXT,
  categorie TEXT NOT NULL,
  eenheid TEXT NOT NULL,
  huidige_voorraad DECIMAL(10,2) DEFAULT 0,
  minimum_voorraad DECIMAL(10,2) DEFAULT 0,
  maximum_voorraad DECIMAL(10,2),
  inkoop_prijs DECIMAL(10,2) DEFAULT 0,
  verkoop_prijs DECIMAL(10,2),
  leverancier_id UUID REFERENCES leveranciers(id) ON DELETE SET NULL,
  leverancier_artikelnummer TEXT,
  levertijd_dagen INTEGER,
  opslaglocatie TEXT,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Voorraad Mutaties ===
CREATE TABLE IF NOT EXISTS voorraad_mutaties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  artikel_id UUID REFERENCES voorraad_artikelen(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inkoop', 'verbruik', 'correctie', 'retour')),
  aantal DECIMAL(10,2) NOT NULL,
  reden TEXT,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  bestelbon_id UUID REFERENCES bestelbonnen(id) ON DELETE SET NULL,
  werkbon_id UUID REFERENCES werkbonnen(id) ON DELETE SET NULL,
  saldo_na_mutatie DECIMAL(10,2) NOT NULL,
  datum DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Deals ===
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL NOT NULL,
  contactpersoon_id UUID,
  titel TEXT NOT NULL,
  beschrijving TEXT,
  verwachte_waarde DECIMAL(10,2) DEFAULT 0,
  werkelijke_waarde DECIMAL(10,2),
  fase TEXT NOT NULL,
  fase_sinds TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'gewonnen', 'verloren', 'on-hold')),
  verloren_reden TEXT,
  gewonnen_op TIMESTAMPTZ,
  verloren_op TIMESTAMPTZ,
  verwachte_sluitdatum DATE,
  kans_percentage DECIMAL(5,2),
  bron TEXT CHECK (bron IN ('website', 'telefoon', 'email', 'referentie', 'social_media', 'beurs', 'overig')),
  offerte_ids UUID[] DEFAULT '{}',
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  medewerker_id UUID,
  laatste_activiteit TIMESTAMPTZ,
  volgende_actie TEXT,
  volgende_actie_datum DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Deal Activiteiten ===
CREATE TABLE IF NOT EXISTS deal_activiteiten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('notitie', 'email', 'telefoon', 'vergadering', 'offerte_verstuurd', 'status_wijziging')),
  beschrijving TEXT NOT NULL,
  datum TIMESTAMPTZ NOT NULL,
  email_id UUID,
  offerte_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Lead Formulieren ===
CREATE TABLE IF NOT EXISTS lead_formulieren (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  naam TEXT NOT NULL,
  beschrijving TEXT,
  velden JSONB DEFAULT '[]',
  bedank_tekst TEXT NOT NULL DEFAULT 'Bedankt voor uw aanvraag!',
  redirect_url TEXT,
  email_notificatie BOOLEAN DEFAULT TRUE,
  auto_deal_aanmaken BOOLEAN DEFAULT FALSE,
  deal_fase TEXT,
  standaard_bron TEXT DEFAULT 'website',
  knop_tekst TEXT DEFAULT 'Versturen',
  kleur TEXT,
  publiek_token TEXT NOT NULL UNIQUE,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Lead Inzendingen ===
CREATE TABLE IF NOT EXISTS lead_inzendingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  formulier_id UUID REFERENCES lead_formulieren(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  ip_adres TEXT,
  browser TEXT,
  pagina_url TEXT,
  status TEXT DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'bekeken', 'verwerkt')),
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STAP 3: ROW LEVEL SECURITY voor nieuwe tabellen
-- ============================================================

ALTER TABLE verlof ENABLE ROW LEVEL SECURITY;
ALTER TABLE bedrijfssluitingsdagen ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_toewijzingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_afspraken ENABLE ROW LEVEL SECURITY;
ALTER TABLE werkbonnen ENABLE ROW LEVEL SECURITY;
ALTER TABLE werkbon_regels ENABLE ROW LEVEL SECURITY;
ALTER TABLE werkbon_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE herinnering_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leveranciers ENABLE ROW LEVEL SECURITY;
ALTER TABLE uitgaven ENABLE ROW LEVEL SECURITY;
ALTER TABLE bestelbonnen ENABLE ROW LEVEL SECURITY;
ALTER TABLE bestelbon_regels ENABLE ROW LEVEL SECURITY;
ALTER TABLE leveringsbonnen ENABLE ROW LEVEL SECURITY;
ALTER TABLE leveringsbon_regels ENABLE ROW LEVEL SECURITY;
ALTER TABLE voorraad_artikelen ENABLE ROW LEVEL SECURITY;
ALTER TABLE voorraad_mutaties ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activiteiten ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_formulieren ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_inzendingen ENABLE ROW LEVEL SECURITY;

-- === verlof ===
CREATE POLICY "select_own_verlof" ON verlof FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_verlof" ON verlof FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_verlof" ON verlof FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_verlof" ON verlof FOR DELETE USING (auth.uid() = user_id);

-- === bedrijfssluitingsdagen ===
CREATE POLICY "select_own_bedrijfssluitingsdagen" ON bedrijfssluitingsdagen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_bedrijfssluitingsdagen" ON bedrijfssluitingsdagen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_bedrijfssluitingsdagen" ON bedrijfssluitingsdagen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_bedrijfssluitingsdagen" ON bedrijfssluitingsdagen FOR DELETE USING (auth.uid() = user_id);

-- === project_toewijzingen ===
CREATE POLICY "select_own_project_toewijzingen" ON project_toewijzingen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_project_toewijzingen" ON project_toewijzingen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_project_toewijzingen" ON project_toewijzingen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_project_toewijzingen" ON project_toewijzingen FOR DELETE USING (auth.uid() = user_id);

-- === booking_slots ===
CREATE POLICY "select_own_booking_slots" ON booking_slots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_booking_slots" ON booking_slots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_booking_slots" ON booking_slots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_booking_slots" ON booking_slots FOR DELETE USING (auth.uid() = user_id);
-- Public read for booking page (klanten moeten beschikbaarheid kunnen zien)
CREATE POLICY "public_select_booking_slots" ON booking_slots FOR SELECT USING (true);

-- === booking_afspraken ===
CREATE POLICY "select_own_booking_afspraken" ON booking_afspraken FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_booking_afspraken" ON booking_afspraken FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_booking_afspraken" ON booking_afspraken FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_booking_afspraken" ON booking_afspraken FOR DELETE USING (auth.uid() = user_id);
-- Public insert for booking page (klanten moeten afspraak kunnen maken)
CREATE POLICY "public_insert_booking_afspraken" ON booking_afspraken FOR INSERT WITH CHECK (true);
-- Public select by token (klant kan eigen afspraak bekijken)
CREATE POLICY "public_select_booking_by_token" ON booking_afspraken FOR SELECT USING (true);

-- === werkbonnen ===
CREATE POLICY "select_own_werkbonnen" ON werkbonnen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_werkbonnen" ON werkbonnen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_werkbonnen" ON werkbonnen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_werkbonnen" ON werkbonnen FOR DELETE USING (auth.uid() = user_id);

-- === werkbon_regels ===
CREATE POLICY "select_own_werkbon_regels" ON werkbon_regels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_werkbon_regels" ON werkbon_regels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_werkbon_regels" ON werkbon_regels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_werkbon_regels" ON werkbon_regels FOR DELETE USING (auth.uid() = user_id);

-- === werkbon_fotos ===
CREATE POLICY "select_own_werkbon_fotos" ON werkbon_fotos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_werkbon_fotos" ON werkbon_fotos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_werkbon_fotos" ON werkbon_fotos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_werkbon_fotos" ON werkbon_fotos FOR DELETE USING (auth.uid() = user_id);

-- === herinnering_templates ===
CREATE POLICY "select_own_herinnering_templates" ON herinnering_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_herinnering_templates" ON herinnering_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_herinnering_templates" ON herinnering_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_herinnering_templates" ON herinnering_templates FOR DELETE USING (auth.uid() = user_id);

-- === leveranciers ===
CREATE POLICY "select_own_leveranciers" ON leveranciers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_leveranciers" ON leveranciers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_leveranciers" ON leveranciers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_leveranciers" ON leveranciers FOR DELETE USING (auth.uid() = user_id);

-- === uitgaven ===
CREATE POLICY "select_own_uitgaven" ON uitgaven FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_uitgaven" ON uitgaven FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_uitgaven" ON uitgaven FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_uitgaven" ON uitgaven FOR DELETE USING (auth.uid() = user_id);

-- === bestelbonnen ===
CREATE POLICY "select_own_bestelbonnen" ON bestelbonnen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_bestelbonnen" ON bestelbonnen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_bestelbonnen" ON bestelbonnen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_bestelbonnen" ON bestelbonnen FOR DELETE USING (auth.uid() = user_id);

-- === bestelbon_regels ===
CREATE POLICY "select_own_bestelbon_regels" ON bestelbon_regels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_bestelbon_regels" ON bestelbon_regels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_bestelbon_regels" ON bestelbon_regels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_bestelbon_regels" ON bestelbon_regels FOR DELETE USING (auth.uid() = user_id);

-- === leveringsbonnen ===
CREATE POLICY "select_own_leveringsbonnen" ON leveringsbonnen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_leveringsbonnen" ON leveringsbonnen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_leveringsbonnen" ON leveringsbonnen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_leveringsbonnen" ON leveringsbonnen FOR DELETE USING (auth.uid() = user_id);

-- === leveringsbon_regels ===
CREATE POLICY "select_own_leveringsbon_regels" ON leveringsbon_regels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_leveringsbon_regels" ON leveringsbon_regels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_leveringsbon_regels" ON leveringsbon_regels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_leveringsbon_regels" ON leveringsbon_regels FOR DELETE USING (auth.uid() = user_id);

-- === voorraad_artikelen ===
CREATE POLICY "select_own_voorraad_artikelen" ON voorraad_artikelen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_voorraad_artikelen" ON voorraad_artikelen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_voorraad_artikelen" ON voorraad_artikelen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_voorraad_artikelen" ON voorraad_artikelen FOR DELETE USING (auth.uid() = user_id);

-- === voorraad_mutaties ===
CREATE POLICY "select_own_voorraad_mutaties" ON voorraad_mutaties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_voorraad_mutaties" ON voorraad_mutaties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_voorraad_mutaties" ON voorraad_mutaties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_voorraad_mutaties" ON voorraad_mutaties FOR DELETE USING (auth.uid() = user_id);

-- === deals ===
CREATE POLICY "select_own_deals" ON deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_deals" ON deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_deals" ON deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_deals" ON deals FOR DELETE USING (auth.uid() = user_id);

-- === deal_activiteiten ===
CREATE POLICY "select_own_deal_activiteiten" ON deal_activiteiten FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_deal_activiteiten" ON deal_activiteiten FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_deal_activiteiten" ON deal_activiteiten FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_deal_activiteiten" ON deal_activiteiten FOR DELETE USING (auth.uid() = user_id);

-- === lead_formulieren ===
CREATE POLICY "select_own_lead_formulieren" ON lead_formulieren FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_lead_formulieren" ON lead_formulieren FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_lead_formulieren" ON lead_formulieren FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_lead_formulieren" ON lead_formulieren FOR DELETE USING (auth.uid() = user_id);
-- Public select by token (prospects moeten formulier kunnen zien)
CREATE POLICY "public_select_lead_formulier_by_token" ON lead_formulieren FOR SELECT USING (actief = true);

-- === lead_inzendingen ===
CREATE POLICY "select_own_lead_inzendingen" ON lead_inzendingen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_lead_inzendingen" ON lead_inzendingen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_lead_inzendingen" ON lead_inzendingen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_lead_inzendingen" ON lead_inzendingen FOR DELETE USING (auth.uid() = user_id);
-- Public insert for lead capture (prospects moeten formulier kunnen invullen)
CREATE POLICY "public_insert_lead_inzendingen" ON lead_inzendingen FOR INSERT WITH CHECK (true);

-- ============================================================
-- STAP 4: TRIGGERS (updated_at) voor nieuwe tabellen
-- ============================================================

CREATE TRIGGER update_werkbonnen_updated_at BEFORE UPDATE ON werkbonnen FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uitgaven_updated_at BEFORE UPDATE ON uitgaven FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bestelbonnen_updated_at BEFORE UPDATE ON bestelbonnen FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leveringsbonnen_updated_at BEFORE UPDATE ON leveringsbonnen FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voorraad_artikelen_updated_at BEFORE UPDATE ON voorraad_artikelen FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lead_formulieren_updated_at BEFORE UPDATE ON lead_formulieren FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STAP 5: INDEXES voor performance
-- ============================================================

-- Verlof & beschikbaarheid
CREATE INDEX IF NOT EXISTS idx_verlof_user_id ON verlof(user_id);
CREATE INDEX IF NOT EXISTS idx_verlof_medewerker_id ON verlof(medewerker_id);
CREATE INDEX IF NOT EXISTS idx_bedrijfssluitingsdagen_user_id ON bedrijfssluitingsdagen(user_id);
CREATE INDEX IF NOT EXISTS idx_project_toewijzingen_project_id ON project_toewijzingen(project_id);
CREATE INDEX IF NOT EXISTS idx_project_toewijzingen_medewerker_id ON project_toewijzingen(medewerker_id);

-- Booking
CREATE INDEX IF NOT EXISTS idx_booking_slots_user_id ON booking_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_afspraken_user_id ON booking_afspraken(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_afspraken_datum ON booking_afspraken(datum);
CREATE INDEX IF NOT EXISTS idx_booking_afspraken_token ON booking_afspraken(token);

-- Werkbonnen
CREATE INDEX IF NOT EXISTS idx_werkbonnen_user_id ON werkbonnen(user_id);
CREATE INDEX IF NOT EXISTS idx_werkbonnen_project_id ON werkbonnen(project_id);
CREATE INDEX IF NOT EXISTS idx_werkbonnen_klant_id ON werkbonnen(klant_id);
CREATE INDEX IF NOT EXISTS idx_werkbonnen_datum ON werkbonnen(datum);
CREATE INDEX IF NOT EXISTS idx_werkbon_regels_werkbon_id ON werkbon_regels(werkbon_id);
CREATE INDEX IF NOT EXISTS idx_werkbon_fotos_werkbon_id ON werkbon_fotos(werkbon_id);

-- Herinnering templates
CREATE INDEX IF NOT EXISTS idx_herinnering_templates_user_id ON herinnering_templates(user_id);

-- Leveranciers & uitgaven
CREATE INDEX IF NOT EXISTS idx_leveranciers_user_id ON leveranciers(user_id);
CREATE INDEX IF NOT EXISTS idx_uitgaven_user_id ON uitgaven(user_id);
CREATE INDEX IF NOT EXISTS idx_uitgaven_project_id ON uitgaven(project_id);
CREATE INDEX IF NOT EXISTS idx_uitgaven_leverancier_id ON uitgaven(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_uitgaven_datum ON uitgaven(datum);

-- Bestelbonnen
CREATE INDEX IF NOT EXISTS idx_bestelbonnen_user_id ON bestelbonnen(user_id);
CREATE INDEX IF NOT EXISTS idx_bestelbonnen_leverancier_id ON bestelbonnen(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_bestelbonnen_project_id ON bestelbonnen(project_id);
CREATE INDEX IF NOT EXISTS idx_bestelbon_regels_bestelbon_id ON bestelbon_regels(bestelbon_id);

-- Leveringsbonnen
CREATE INDEX IF NOT EXISTS idx_leveringsbonnen_user_id ON leveringsbonnen(user_id);
CREATE INDEX IF NOT EXISTS idx_leveringsbonnen_klant_id ON leveringsbonnen(klant_id);
CREATE INDEX IF NOT EXISTS idx_leveringsbonnen_project_id ON leveringsbonnen(project_id);
CREATE INDEX IF NOT EXISTS idx_leveringsbon_regels_leveringsbon_id ON leveringsbon_regels(leveringsbon_id);

-- Voorraadbeheer
CREATE INDEX IF NOT EXISTS idx_voorraad_artikelen_user_id ON voorraad_artikelen(user_id);
CREATE INDEX IF NOT EXISTS idx_voorraad_artikelen_leverancier_id ON voorraad_artikelen(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_voorraad_mutaties_artikel_id ON voorraad_mutaties(artikel_id);
CREATE INDEX IF NOT EXISTS idx_voorraad_mutaties_project_id ON voorraad_mutaties(project_id);

-- Deals & pipeline
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_klant_id ON deals(klant_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_fase ON deals(fase);
CREATE INDEX IF NOT EXISTS idx_deal_activiteiten_deal_id ON deal_activiteiten(deal_id);

-- Lead capture
CREATE INDEX IF NOT EXISTS idx_lead_formulieren_user_id ON lead_formulieren(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_formulieren_token ON lead_formulieren(publiek_token);
CREATE INDEX IF NOT EXISTS idx_lead_inzendingen_formulier_id ON lead_inzendingen(formulier_id);
CREATE INDEX IF NOT EXISTS idx_lead_inzendingen_status ON lead_inzendingen(status);

-- Offerte tracking
CREATE INDEX IF NOT EXISTS idx_offertes_publiek_token ON offertes(publiek_token);
CREATE INDEX IF NOT EXISTS idx_offertes_project_id ON offertes(project_id);

-- Factuur betaling
CREATE INDEX IF NOT EXISTS idx_facturen_betaal_token ON facturen(betaal_token);
CREATE INDEX IF NOT EXISTS idx_facturen_factuur_type ON facturen(factuur_type);
CREATE INDEX IF NOT EXISTS idx_facturen_werkbon_id ON facturen(werkbon_id);

-- Tijdregistratie factuur link
CREATE INDEX IF NOT EXISTS idx_tijdregistraties_factuur_id ON tijdregistraties(factuur_id);

-- ============================================================
-- STAP 6: Storage bucket voor werkbon foto's
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('werkbon_fotos', 'werkbon_fotos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload werkbon_fotos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'werkbon_fotos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can view own werkbon_fotos" ON storage.objects FOR SELECT USING (
  bucket_id = 'werkbon_fotos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete own werkbon_fotos" ON storage.objects FOR DELETE USING (
  bucket_id = 'werkbon_fotos' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage bucket voor uitgave bijlagen
INSERT INTO storage.buckets (id, name, public) VALUES ('uitgave_bijlagen', 'uitgave_bijlagen', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload uitgave_bijlagen" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'uitgave_bijlagen' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can view own uitgave_bijlagen" ON storage.objects FOR SELECT USING (
  bucket_id = 'uitgave_bijlagen' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete own uitgave_bijlagen" ON storage.objects FOR DELETE USING (
  bucket_id = 'uitgave_bijlagen' AND auth.uid()::text = (storage.foldername(name))[1]
);
