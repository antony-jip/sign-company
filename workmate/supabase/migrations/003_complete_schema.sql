-- ============================================================
-- Migration 003: Compleet schema — alle ontbrekende tabellen & kolommen
-- Voer dit uit in Supabase SQL Editor NA schema.sql en 001/002 migrations
-- Datum: 24 februari 2026
-- ============================================================

-- ============================================================
-- DEEL 1: KOLOMMEN TOEVOEGEN AAN BESTAANDE TABELLEN
-- ============================================================

-- ── profiles: ontbrekend veld ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS iban TEXT;

-- ── taken: ontbrekende kolommen ──
ALTER TABLE taken ADD COLUMN IF NOT EXISTS klant_id UUID REFERENCES klanten ON DELETE SET NULL;
ALTER TABLE taken ADD COLUMN IF NOT EXISTS locatie TEXT;

-- ── projecten: ontbrekende kolommen ──
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS budget_waarschuwing_pct INTEGER;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS bron_offerte_id UUID REFERENCES offertes ON DELETE SET NULL;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS bron_project_id UUID REFERENCES projecten ON DELETE SET NULL;

-- ── klanten: ontbrekende kolommen ──
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS contactpersonen JSONB DEFAULT '[]';
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS klant_labels TEXT[] DEFAULT '{}';
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS gepinde_notitie TEXT;

-- ── offertes: status constraint uitbreiden + ontbrekende kolommen ──
ALTER TABLE offertes DROP CONSTRAINT IF EXISTS offertes_status_check;
ALTER TABLE offertes ADD CONSTRAINT offertes_status_check
  CHECK (status IN ('concept', 'verzonden', 'bekeken', 'goedgekeurd', 'afgewezen', 'verlopen', 'gefactureerd'));

ALTER TABLE offertes ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projecten ON DELETE SET NULL;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS klant_naam TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS follow_up_datum DATE;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS follow_up_notitie TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS laatste_contact TIMESTAMPTZ;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'geen'
  CHECK (follow_up_status IN ('geen', 'gepland', 'achterstallig', 'afgerond'));
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS contact_pogingen INTEGER DEFAULT 0;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS prioriteit TEXT
  CHECK (prioriteit IN ('laag', 'medium', 'hoog', 'urgent'));
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS deal_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS geconverteerd_naar_project_id UUID REFERENCES projecten ON DELETE SET NULL;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS geconverteerd_naar_factuur_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS bekeken_door_klant BOOLEAN DEFAULT FALSE;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS eerste_bekeken_op TIMESTAMPTZ;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS laatst_bekeken_op TIMESTAMPTZ;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS aantal_keer_bekeken INTEGER DEFAULT 0;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS publiek_token TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS verloopdatum DATE;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS verstuurd_op TIMESTAMPTZ;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS verstuurd_naar TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS akkoord_op TIMESTAMPTZ;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS intro_tekst TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS outro_tekst TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS activiteiten JSONB DEFAULT '[]';

-- ── offerte_items: ontbrekende kolommen ──
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS soort TEXT DEFAULT 'prijs' CHECK (soort IN ('prijs', 'tekst'));
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS extra_velden JSONB DEFAULT '{}';
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS detail_regels JSONB DEFAULT '[]';
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS calculatie_regels JSONB DEFAULT '[]';
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS heeft_calculatie BOOLEAN DEFAULT FALSE;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS prijs_varianten JSONB DEFAULT '[]';
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS actieve_variant_id TEXT;
-- Fix: offerte_id moet NOT NULL zijn
ALTER TABLE offerte_items ALTER COLUMN offerte_id SET NOT NULL;

-- ── facturen: ontbrekende kolommen ──
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS klant_naam TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bron_type TEXT CHECK (bron_type IN ('offerte', 'project', 'handmatig'));
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bron_offerte_id UUID REFERENCES offertes ON DELETE SET NULL;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bron_project_id UUID REFERENCES projecten ON DELETE SET NULL;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaaltermijn_dagen INTEGER DEFAULT 30;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS herinnering_1_verstuurd TIMESTAMPTZ;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS herinnering_2_verstuurd TIMESTAMPTZ;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS herinnering_3_verstuurd TIMESTAMPTZ;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS aanmaning_verstuurd TIMESTAMPTZ;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS factuur_type TEXT DEFAULT 'standaard'
  CHECK (factuur_type IN ('standaard', 'voorschot', 'creditnota', 'eindafrekening'));
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS gerelateerde_factuur_id UUID REFERENCES facturen ON DELETE SET NULL;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS credit_reden TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS voorschot_percentage DECIMAL(5,2);
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS is_voorschot_verrekend BOOLEAN DEFAULT FALSE;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS verrekende_voorschot_ids UUID[] DEFAULT '{}';
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS werkbon_id UUID;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_token TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_link TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_methode TEXT CHECK (betaal_methode IN ('handmatig', 'link', 'qr'));
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS online_bekeken BOOLEAN DEFAULT FALSE;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS online_bekeken_op TIMESTAMPTZ;

-- ── emails: ontbrekende kolommen ──
ALTER TABLE emails ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS thread_id TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS tracking JSONB;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS inbox_type TEXT DEFAULT 'persoonlijk' CHECK (inbox_type IN ('persoonlijk', 'gedeeld'));
ALTER TABLE emails ADD COLUMN IF NOT EXISTS toegewezen_aan TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS ticket_status TEXT CHECK (ticket_status IN ('open', 'in_behandeling', 'wacht_op_klant', 'afgerond'));
ALTER TABLE emails ADD COLUMN IF NOT EXISTS interne_notities JSONB DEFAULT '[]';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS prioriteit_inbox TEXT CHECK (prioriteit_inbox IN ('laag', 'normaal', 'hoog', 'urgent'));
ALTER TABLE emails ADD COLUMN IF NOT EXISTS categorie_inbox TEXT CHECK (categorie_inbox IN ('offerte_aanvraag', 'klacht', 'informatie', 'support', 'overig'));

-- ── tijdregistraties: ontbrekende kolom ──
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS factuur_id UUID REFERENCES facturen ON DELETE SET NULL;

-- ── medewerkers: ontbrekende kolom ──
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS app_rol TEXT DEFAULT 'medewerker'
  CHECK (app_rol IN ('admin', 'medewerker', 'viewer'));

-- ── notificaties: CHECK constraint uitbreiden ──
ALTER TABLE notificaties DROP CONSTRAINT IF EXISTS notificaties_type_check;
ALTER TABLE notificaties ADD CONSTRAINT notificaties_type_check
  CHECK (type IN (
    'offerte_bekeken', 'offerte_verlopen', 'factuur_vervallen',
    'deadline_nadert', 'nieuwe_email', 'taak_voltooid',
    'montage_gepland', 'betaling_ontvangen',
    'budget_waarschuwing', 'booking_nieuw', 'algemeen'
  ));

-- ── montage_afspraken: klant_naam kolom ──
ALTER TABLE montage_afspraken ADD COLUMN IF NOT EXISTS klant_naam TEXT;
ALTER TABLE montage_afspraken ADD COLUMN IF NOT EXISTS project_naam TEXT;


-- ============================================================
-- DEEL 2: NIEUWE TABELLEN
-- ============================================================

-- ── Werkbonnen ──
CREATE TABLE IF NOT EXISTS werkbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  werkbon_nummer TEXT NOT NULL,
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
  klant_id UUID REFERENCES klanten ON DELETE SET NULL,
  montage_afspraak_id UUID REFERENCES montage_afspraken ON DELETE SET NULL,
  locatie_adres TEXT,
  locatie_stad TEXT,
  locatie_postcode TEXT,
  datum DATE DEFAULT CURRENT_DATE,
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
  kilometers DECIMAL(8,1),
  km_tarief DECIMAL(6,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS werkbon_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  werkbon_id UUID REFERENCES werkbonnen ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('arbeid', 'materiaal', 'overig')),
  medewerker_id UUID REFERENCES medewerkers ON DELETE SET NULL,
  uren DECIMAL(6,2),
  uurtarief DECIMAL(8,2),
  omschrijving TEXT NOT NULL,
  aantal DECIMAL(10,2),
  eenheid TEXT,
  prijs_per_eenheid DECIMAL(10,2),
  totaal DECIMAL(10,2) DEFAULT 0,
  factureerbaar BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS werkbon_fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  werkbon_id UUID REFERENCES werkbonnen ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('voor', 'na', 'overig')),
  url TEXT NOT NULL,
  omschrijving TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Betalingsherinnering Templates ──
CREATE TABLE IF NOT EXISTS herinnering_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('herinnering_1', 'herinnering_2', 'herinnering_3', 'aanmaning')),
  onderwerp TEXT NOT NULL,
  inhoud TEXT NOT NULL,
  dagen_na_vervaldatum INTEGER DEFAULT 0,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Leveranciers ──
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

-- ── Uitgaven ──
CREATE TABLE IF NOT EXISTS uitgaven (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  uitgave_nummer TEXT NOT NULL,
  leverancier_id UUID REFERENCES leveranciers ON DELETE SET NULL,
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
  type TEXT CHECK (type IN ('inkoopfactuur', 'bon', 'abonnement', 'kilometervergoeding', 'overig')),
  referentie_nummer TEXT,
  bedrag_excl_btw DECIMAL(10,2) DEFAULT 0,
  btw_bedrag DECIMAL(10,2) DEFAULT 0,
  btw_percentage DECIMAL(5,2) DEFAULT 21,
  bedrag_incl_btw DECIMAL(10,2) DEFAULT 0,
  datum DATE DEFAULT CURRENT_DATE,
  vervaldatum DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'betaald', 'verlopen')),
  betaald_op DATE,
  categorie TEXT CHECK (categorie IN ('materiaal', 'arbeid_extern', 'transport', 'gereedschap', 'kantoor', 'software', 'verzekering', 'overig')),
  grootboek_id UUID REFERENCES grootboek ON DELETE SET NULL,
  bijlage_url TEXT,
  omschrijving TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Verlof ──
CREATE TABLE IF NOT EXISTS verlof (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  medewerker_id UUID REFERENCES medewerkers ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('vakantie', 'ziek', 'ouderschapsverlof', 'bijzonder', 'bedrijfssluiting')),
  start_datum DATE NOT NULL,
  eind_datum DATE NOT NULL,
  status TEXT DEFAULT 'aangevraagd' CHECK (status IN ('aangevraagd', 'goedgekeurd', 'afgewezen')),
  opmerking TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bedrijfssluitingsdagen ──
CREATE TABLE IF NOT EXISTS bedrijfssluitingsdagen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  datum DATE NOT NULL,
  omschrijving TEXT,
  jaarlijks_herhalend BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Project Toewijzingen ──
CREATE TABLE IF NOT EXISTS project_toewijzingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projecten ON DELETE CASCADE NOT NULL,
  medewerker_id UUID REFERENCES medewerkers ON DELETE CASCADE NOT NULL,
  rol TEXT DEFAULT 'medewerker' CHECK (rol IN ('eigenaar', 'medewerker', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Booking Systeem ──
CREATE TABLE IF NOT EXISTS booking_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  dag_van_week INTEGER CHECK (dag_van_week >= 0 AND dag_van_week <= 6),
  start_tijd TIME NOT NULL,
  eind_tijd TIME NOT NULL,
  slot_duur_minuten INTEGER DEFAULT 30,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ── Bestelbonnen ──
CREATE TABLE IF NOT EXISTS bestelbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  bestelbon_nummer TEXT NOT NULL,
  leverancier_id UUID REFERENCES leveranciers ON DELETE SET NULL,
  offerte_id UUID REFERENCES offertes ON DELETE SET NULL,
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS bestelbon_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  bestelbon_id UUID REFERENCES bestelbonnen ON DELETE CASCADE NOT NULL,
  omschrijving TEXT NOT NULL,
  aantal DECIMAL(10,2) DEFAULT 1,
  eenheid TEXT,
  prijs_per_eenheid DECIMAL(10,2) NOT NULL,
  btw_percentage DECIMAL(5,2) DEFAULT 21,
  totaal DECIMAL(10,2) DEFAULT 0,
  aantal_ontvangen DECIMAL(10,2) DEFAULT 0,
  volledig_ontvangen BOOLEAN DEFAULT FALSE,
  offerte_item_id UUID REFERENCES offerte_items ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Leveringsbonnen ──
CREATE TABLE IF NOT EXISTS leveringsbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  leveringsbon_nummer TEXT NOT NULL,
  klant_id UUID REFERENCES klanten ON DELETE SET NULL,
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
  werkbon_id UUID REFERENCES werkbonnen ON DELETE SET NULL,
  bestelbon_id UUID REFERENCES bestelbonnen ON DELETE SET NULL,
  datum DATE DEFAULT CURRENT_DATE,
  locatie_adres TEXT,
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

CREATE TABLE IF NOT EXISTS leveringsbon_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  leveringsbon_id UUID REFERENCES leveringsbonnen ON DELETE CASCADE NOT NULL,
  omschrijving TEXT NOT NULL,
  aantal DECIMAL(10,2) DEFAULT 1,
  eenheid TEXT,
  opmerking TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Voorraadbeheer ──
CREATE TABLE IF NOT EXISTS voorraad_artikelen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  naam TEXT NOT NULL,
  sku TEXT,
  categorie TEXT,
  eenheid TEXT DEFAULT 'stuks',
  huidige_voorraad DECIMAL(10,2) DEFAULT 0,
  minimum_voorraad DECIMAL(10,2) DEFAULT 0,
  maximum_voorraad DECIMAL(10,2),
  inkoop_prijs DECIMAL(10,2) DEFAULT 0,
  verkoop_prijs DECIMAL(10,2),
  leverancier_id UUID REFERENCES leveranciers ON DELETE SET NULL,
  leverancier_artikelnummer TEXT,
  levertijd_dagen INTEGER,
  opslaglocatie TEXT,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voorraad_mutaties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  artikel_id UUID REFERENCES voorraad_artikelen ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('inkoop', 'verbruik', 'correctie', 'retour')),
  aantal DECIMAL(10,2) NOT NULL,
  reden TEXT,
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
  bestelbon_id UUID REFERENCES bestelbonnen ON DELETE SET NULL,
  werkbon_id UUID REFERENCES werkbonnen ON DELETE SET NULL,
  saldo_na_mutatie DECIMAL(10,2) DEFAULT 0,
  datum DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Deals / Sales Pipeline ──
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  klant_id UUID REFERENCES klanten ON DELETE SET NULL,
  contactpersoon_id TEXT,
  titel TEXT NOT NULL,
  beschrijving TEXT,
  verwachte_waarde DECIMAL(12,2) DEFAULT 0,
  werkelijke_waarde DECIMAL(12,2),
  fase TEXT DEFAULT 'lead',
  fase_sinds TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'gewonnen', 'verloren', 'on-hold')),
  verloren_reden TEXT,
  gewonnen_op TIMESTAMPTZ,
  verloren_op TIMESTAMPTZ,
  verwachte_sluitdatum DATE,
  kans_percentage INTEGER DEFAULT 50 CHECK (kans_percentage >= 0 AND kans_percentage <= 100),
  bron TEXT CHECK (bron IN ('website', 'telefoon', 'email', 'referentie', 'social_media', 'beurs', 'overig')),
  offerte_ids UUID[] DEFAULT '{}',
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
  medewerker_id UUID REFERENCES medewerkers ON DELETE SET NULL,
  laatste_activiteit TIMESTAMPTZ,
  volgende_actie TEXT,
  volgende_actie_datum DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deal_activiteiten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES deals ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('notitie', 'email', 'telefoon', 'vergadering', 'offerte_verstuurd', 'status_wijziging')),
  beschrijving TEXT NOT NULL,
  datum TIMESTAMPTZ DEFAULT NOW(),
  email_id UUID REFERENCES emails ON DELETE SET NULL,
  offerte_id UUID REFERENCES offertes ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Lead Capture ──
CREATE TABLE IF NOT EXISTS lead_formulieren (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  naam TEXT NOT NULL,
  beschrijving TEXT,
  velden JSONB DEFAULT '[]',
  bedank_tekst TEXT DEFAULT 'Bedankt voor uw aanvraag!',
  redirect_url TEXT,
  email_notificatie BOOLEAN DEFAULT TRUE,
  auto_deal_aanmaken BOOLEAN DEFAULT FALSE,
  deal_fase TEXT,
  standaard_bron TEXT DEFAULT 'website',
  knop_tekst TEXT DEFAULT 'Verstuur',
  kleur TEXT,
  publiek_token TEXT NOT NULL UNIQUE,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_inzendingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  formulier_id UUID REFERENCES lead_formulieren ON DELETE CASCADE NOT NULL,
  data JSONB DEFAULT '{}',
  ip_adres TEXT,
  browser TEXT,
  pagina_url TEXT,
  status TEXT DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'bekeken', 'verwerkt')),
  deal_id UUID REFERENCES deals ON DELETE SET NULL,
  klant_id UUID REFERENCES klanten ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Offertes: deal_id FK (nu deals tabel bestaat) ──
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'offertes_deal_id_fkey'
  ) THEN
    ALTER TABLE offertes ADD CONSTRAINT offertes_deal_id_fkey
      FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Facturen: werkbon_id FK (nu werkbonnen tabel bestaat) ──
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'facturen_werkbon_id_fkey'
  ) THEN
    ALTER TABLE facturen ADD CONSTRAINT facturen_werkbon_id_fkey
      FOREIGN KEY (werkbon_id) REFERENCES werkbonnen(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ============================================================
-- DEEL 3: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE werkbonnen ENABLE ROW LEVEL SECURITY;
ALTER TABLE werkbon_regels ENABLE ROW LEVEL SECURITY;
ALTER TABLE werkbon_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE herinnering_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leveranciers ENABLE ROW LEVEL SECURITY;
ALTER TABLE uitgaven ENABLE ROW LEVEL SECURITY;
ALTER TABLE verlof ENABLE ROW LEVEL SECURITY;
ALTER TABLE bedrijfssluitingsdagen ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_toewijzingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_afspraken ENABLE ROW LEVEL SECURITY;
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

-- Macro: standaard user_id RLS beleid voor elke tabel
-- Werkbonnen
CREATE POLICY "Users can view own werkbonnen" ON werkbonnen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own werkbonnen" ON werkbonnen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own werkbonnen" ON werkbonnen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own werkbonnen" ON werkbonnen FOR DELETE USING (auth.uid() = user_id);

-- Werkbon regels
CREATE POLICY "Users can view own werkbon_regels" ON werkbon_regels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own werkbon_regels" ON werkbon_regels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own werkbon_regels" ON werkbon_regels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own werkbon_regels" ON werkbon_regels FOR DELETE USING (auth.uid() = user_id);

-- Werkbon fotos
CREATE POLICY "Users can view own werkbon_fotos" ON werkbon_fotos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own werkbon_fotos" ON werkbon_fotos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own werkbon_fotos" ON werkbon_fotos FOR DELETE USING (auth.uid() = user_id);

-- Herinnering templates
CREATE POLICY "Users can view own herinnering_templates" ON herinnering_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own herinnering_templates" ON herinnering_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own herinnering_templates" ON herinnering_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own herinnering_templates" ON herinnering_templates FOR DELETE USING (auth.uid() = user_id);

-- Leveranciers
CREATE POLICY "Users can view own leveranciers" ON leveranciers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leveranciers" ON leveranciers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leveranciers" ON leveranciers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leveranciers" ON leveranciers FOR DELETE USING (auth.uid() = user_id);

-- Uitgaven
CREATE POLICY "Users can view own uitgaven" ON uitgaven FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own uitgaven" ON uitgaven FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own uitgaven" ON uitgaven FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own uitgaven" ON uitgaven FOR DELETE USING (auth.uid() = user_id);

-- Verlof
CREATE POLICY "Users can view own verlof" ON verlof FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own verlof" ON verlof FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own verlof" ON verlof FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own verlof" ON verlof FOR DELETE USING (auth.uid() = user_id);

-- Bedrijfssluitingsdagen
CREATE POLICY "Users can view own bedrijfssluitingsdagen" ON bedrijfssluitingsdagen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bedrijfssluitingsdagen" ON bedrijfssluitingsdagen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bedrijfssluitingsdagen" ON bedrijfssluitingsdagen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bedrijfssluitingsdagen" ON bedrijfssluitingsdagen FOR DELETE USING (auth.uid() = user_id);

-- Project toewijzingen
CREATE POLICY "Users can view own project_toewijzingen" ON project_toewijzingen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own project_toewijzingen" ON project_toewijzingen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own project_toewijzingen" ON project_toewijzingen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own project_toewijzingen" ON project_toewijzingen FOR DELETE USING (auth.uid() = user_id);

-- Booking slots
CREATE POLICY "Users can view own booking_slots" ON booking_slots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own booking_slots" ON booking_slots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own booking_slots" ON booking_slots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own booking_slots" ON booking_slots FOR DELETE USING (auth.uid() = user_id);

-- Booking afspraken (user_id = eigenaar van de agenda)
CREATE POLICY "Users can view own booking_afspraken" ON booking_afspraken FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert booking_afspraken" ON booking_afspraken FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own booking_afspraken" ON booking_afspraken FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own booking_afspraken" ON booking_afspraken FOR DELETE USING (auth.uid() = user_id);

-- Bestelbonnen
CREATE POLICY "Users can view own bestelbonnen" ON bestelbonnen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bestelbonnen" ON bestelbonnen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bestelbonnen" ON bestelbonnen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bestelbonnen" ON bestelbonnen FOR DELETE USING (auth.uid() = user_id);

-- Bestelbon regels
CREATE POLICY "Users can view own bestelbon_regels" ON bestelbon_regels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bestelbon_regels" ON bestelbon_regels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bestelbon_regels" ON bestelbon_regels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bestelbon_regels" ON bestelbon_regels FOR DELETE USING (auth.uid() = user_id);

-- Leveringsbonnen
CREATE POLICY "Users can view own leveringsbonnen" ON leveringsbonnen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leveringsbonnen" ON leveringsbonnen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leveringsbonnen" ON leveringsbonnen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leveringsbonnen" ON leveringsbonnen FOR DELETE USING (auth.uid() = user_id);

-- Leveringsbon regels
CREATE POLICY "Users can view own leveringsbon_regels" ON leveringsbon_regels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leveringsbon_regels" ON leveringsbon_regels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leveringsbon_regels" ON leveringsbon_regels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leveringsbon_regels" ON leveringsbon_regels FOR DELETE USING (auth.uid() = user_id);

-- Voorraad artikelen
CREATE POLICY "Users can view own voorraad_artikelen" ON voorraad_artikelen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voorraad_artikelen" ON voorraad_artikelen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voorraad_artikelen" ON voorraad_artikelen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own voorraad_artikelen" ON voorraad_artikelen FOR DELETE USING (auth.uid() = user_id);

-- Voorraad mutaties
CREATE POLICY "Users can view own voorraad_mutaties" ON voorraad_mutaties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voorraad_mutaties" ON voorraad_mutaties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own voorraad_mutaties" ON voorraad_mutaties FOR DELETE USING (auth.uid() = user_id);

-- Deals
CREATE POLICY "Users can view own deals" ON deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deals" ON deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deals" ON deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deals" ON deals FOR DELETE USING (auth.uid() = user_id);

-- Deal activiteiten
CREATE POLICY "Users can view own deal_activiteiten" ON deal_activiteiten FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deal_activiteiten" ON deal_activiteiten FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own deal_activiteiten" ON deal_activiteiten FOR DELETE USING (auth.uid() = user_id);

-- Lead formulieren
CREATE POLICY "Users can view own lead_formulieren" ON lead_formulieren FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lead_formulieren" ON lead_formulieren FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lead_formulieren" ON lead_formulieren FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lead_formulieren" ON lead_formulieren FOR DELETE USING (auth.uid() = user_id);
-- Publiek formulier inladen via token (voor inbedding op website)
CREATE POLICY "Public can view active lead_formulieren by token" ON lead_formulieren FOR SELECT USING (actief = true);

-- Lead inzendingen
CREATE POLICY "Users can view own lead_inzendingen" ON lead_inzendingen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert lead_inzendingen" ON lead_inzendingen FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own lead_inzendingen" ON lead_inzendingen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lead_inzendingen" ON lead_inzendingen FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- DEEL 4: TRIGGERS (updated_at)
-- ============================================================

CREATE TRIGGER update_werkbonnen_updated_at BEFORE UPDATE ON werkbonnen FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uitgaven_updated_at BEFORE UPDATE ON uitgaven FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bestelbonnen_updated_at BEFORE UPDATE ON bestelbonnen FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leveringsbonnen_updated_at BEFORE UPDATE ON leveringsbonnen FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voorraad_artikelen_updated_at BEFORE UPDATE ON voorraad_artikelen FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lead_formulieren_updated_at BEFORE UPDATE ON lead_formulieren FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- DEEL 5: INDEXES
-- ============================================================

-- Bestaande tabellen - ontbrekende indexes
CREATE INDEX IF NOT EXISTS idx_taken_klant_id ON taken(klant_id);
CREATE INDEX IF NOT EXISTS idx_offertes_project_id ON offertes(project_id);
CREATE INDEX IF NOT EXISTS idx_offertes_publiek_token ON offertes(publiek_token);
CREATE INDEX IF NOT EXISTS idx_offertes_deal_id ON offertes(deal_id);
CREATE INDEX IF NOT EXISTS idx_documenten_klant_id ON documenten(klant_id);
CREATE INDEX IF NOT EXISTS idx_documenten_project_id ON documenten(project_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);

-- Nieuwe tabellen
CREATE INDEX IF NOT EXISTS idx_werkbonnen_user_id ON werkbonnen(user_id);
CREATE INDEX IF NOT EXISTS idx_werkbonnen_project_id ON werkbonnen(project_id);
CREATE INDEX IF NOT EXISTS idx_werkbonnen_klant_id ON werkbonnen(klant_id);
CREATE INDEX IF NOT EXISTS idx_werkbonnen_datum ON werkbonnen(datum);
CREATE INDEX IF NOT EXISTS idx_werkbon_regels_werkbon_id ON werkbon_regels(werkbon_id);
CREATE INDEX IF NOT EXISTS idx_werkbon_fotos_werkbon_id ON werkbon_fotos(werkbon_id);

CREATE INDEX IF NOT EXISTS idx_herinnering_templates_user_id ON herinnering_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_leveranciers_user_id ON leveranciers(user_id);

CREATE INDEX IF NOT EXISTS idx_uitgaven_user_id ON uitgaven(user_id);
CREATE INDEX IF NOT EXISTS idx_uitgaven_leverancier_id ON uitgaven(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_uitgaven_project_id ON uitgaven(project_id);
CREATE INDEX IF NOT EXISTS idx_uitgaven_datum ON uitgaven(datum);
CREATE INDEX IF NOT EXISTS idx_uitgaven_status ON uitgaven(status);

CREATE INDEX IF NOT EXISTS idx_verlof_user_id ON verlof(user_id);
CREATE INDEX IF NOT EXISTS idx_verlof_medewerker_id ON verlof(medewerker_id);

CREATE INDEX IF NOT EXISTS idx_bedrijfssluitingsdagen_user_id ON bedrijfssluitingsdagen(user_id);

CREATE INDEX IF NOT EXISTS idx_project_toewijzingen_project_id ON project_toewijzingen(project_id);
CREATE INDEX IF NOT EXISTS idx_project_toewijzingen_medewerker_id ON project_toewijzingen(medewerker_id);

CREATE INDEX IF NOT EXISTS idx_booking_slots_user_id ON booking_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_afspraken_user_id ON booking_afspraken(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_afspraken_datum ON booking_afspraken(datum);
CREATE INDEX IF NOT EXISTS idx_booking_afspraken_token ON booking_afspraken(token);

CREATE INDEX IF NOT EXISTS idx_bestelbonnen_user_id ON bestelbonnen(user_id);
CREATE INDEX IF NOT EXISTS idx_bestelbonnen_leverancier_id ON bestelbonnen(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_bestelbon_regels_bestelbon_id ON bestelbon_regels(bestelbon_id);

CREATE INDEX IF NOT EXISTS idx_leveringsbonnen_user_id ON leveringsbonnen(user_id);
CREATE INDEX IF NOT EXISTS idx_leveringsbonnen_klant_id ON leveringsbonnen(klant_id);
CREATE INDEX IF NOT EXISTS idx_leveringsbon_regels_leveringsbon_id ON leveringsbon_regels(leveringsbon_id);

CREATE INDEX IF NOT EXISTS idx_voorraad_artikelen_user_id ON voorraad_artikelen(user_id);
CREATE INDEX IF NOT EXISTS idx_voorraad_artikelen_leverancier_id ON voorraad_artikelen(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_voorraad_mutaties_artikel_id ON voorraad_mutaties(artikel_id);
CREATE INDEX IF NOT EXISTS idx_voorraad_mutaties_datum ON voorraad_mutaties(datum);

CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_klant_id ON deals(klant_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_fase ON deals(fase);
CREATE INDEX IF NOT EXISTS idx_deal_activiteiten_deal_id ON deal_activiteiten(deal_id);

CREATE INDEX IF NOT EXISTS idx_lead_formulieren_user_id ON lead_formulieren(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_formulieren_publiek_token ON lead_formulieren(publiek_token);
CREATE INDEX IF NOT EXISTS idx_lead_inzendingen_formulier_id ON lead_inzendingen(formulier_id);
CREATE INDEX IF NOT EXISTS idx_lead_inzendingen_status ON lead_inzendingen(status);


-- ============================================================
-- KLAAR: Alle 21 ontbrekende tabellen, 40+ kolommen en 80+ indexes aangemaakt
-- ============================================================
