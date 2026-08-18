-- ============================================================
-- Migration 005: Fix kolom mismatches tussen schema.sql en frontend types
-- Voeg ontbrekende kolommen toe aan bestaande tabellen
-- Maak ontbrekende tabellen aan (indien schema.sql als basis draait)
-- ============================================================

-- ============================================================
-- 1. PROFILES: ontbrekende kolommen
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS functie TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bedrijfs_telefoon TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bedrijfs_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bedrijfs_website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS iban TEXT;

-- ============================================================
-- 2. KLANTEN: ontbrekende kolommen
-- ============================================================

ALTER TABLE klanten ADD COLUMN IF NOT EXISTS contactpersonen JSONB DEFAULT '[]';
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS vestigingen JSONB DEFAULT '[]';
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS klant_labels TEXT[] DEFAULT '{}';
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS gepinde_notitie TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS omzet_totaal NUMERIC DEFAULT 0;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS klant_sinds TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS laatst_actief TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS aantal_projecten INTEGER DEFAULT 0;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS aantal_offertes INTEGER DEFAULT 0;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS offertes_akkoord INTEGER DEFAULT 0;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS totaal_offertewaarde NUMERIC DEFAULT 0;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS accountmanager TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS import_bron TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS import_datum TEXT;

-- ============================================================
-- 3. PROJECTEN: ontbrekende kolommen
-- ============================================================

ALTER TABLE projecten ADD COLUMN IF NOT EXISTS klant_naam TEXT;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS budget_waarschuwing_pct NUMERIC;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS bron_offerte_id UUID;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS contactpersoon_id UUID;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS vestiging_id UUID;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS vestiging_naam TEXT;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS bron_project_id UUID;

-- ============================================================
-- 4. TAKEN: ontbrekende kolommen
-- ============================================================

ALTER TABLE taken ADD COLUMN IF NOT EXISTS klant_id UUID;
ALTER TABLE taken ADD COLUMN IF NOT EXISTS locatie TEXT;

-- ============================================================
-- 5. OFFERTES: ontbrekende kolommen + status uitbreiding
-- ============================================================

-- Verwijder bestaande status CHECK constraint en maak opnieuw met alle waarden
ALTER TABLE offertes DROP CONSTRAINT IF EXISTS offertes_status_check;
ALTER TABLE offertes ADD CONSTRAINT offertes_status_check
  CHECK (status IN ('concept', 'verzonden', 'bekeken', 'goedgekeurd', 'afgewezen', 'verlopen', 'gefactureerd'));

ALTER TABLE offertes ADD COLUMN IF NOT EXISTS klant_naam TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS follow_up_datum TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS follow_up_notitie TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS laatste_contact TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'geen';
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS contact_pogingen INTEGER DEFAULT 0;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS prioriteit TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS deal_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS geconverteerd_naar_project_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS geconverteerd_naar_factuur_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS bekeken_door_klant BOOLEAN DEFAULT false;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS eerste_bekeken_op TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS laatst_bekeken_op TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS aantal_keer_bekeken INTEGER DEFAULT 0;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS publiek_token TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS verloopdatum TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS verstuurd_op TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS verstuurd_naar TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS akkoord_op TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS intro_tekst TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS outro_tekst TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS contactpersoon_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS activiteiten JSONB DEFAULT '[]';
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS versie INTEGER DEFAULT 1;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS originele_offerte_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS geldigheid_dagen INTEGER;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS afrondingskorting_excl_btw NUMERIC;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS aangepast_totaal NUMERIC;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS uren_correctie JSONB DEFAULT '{}';

-- ============================================================
-- 6. OFFERTE_ITEMS: ontbrekende kolommen
-- ============================================================

ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS soort TEXT DEFAULT 'prijs';
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS extra_velden JSONB DEFAULT '{}';
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS detail_regels JSONB DEFAULT '[]';
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS calculatie_regels JSONB DEFAULT '[]';
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS heeft_calculatie BOOLEAN DEFAULT false;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS prijs_varianten JSONB DEFAULT '[]';
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS actieve_variant_id TEXT;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS breedte_mm NUMERIC;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS hoogte_mm NUMERIC;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS oppervlakte_m2 NUMERIC;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS afmeting_vrij BOOLEAN DEFAULT false;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS foto_op_offerte BOOLEAN DEFAULT false;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS is_optioneel BOOLEAN DEFAULT false;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS interne_notitie TEXT;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS bijlage_url TEXT;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS bijlage_type TEXT;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS bijlage_naam TEXT;
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 7. DOCUMENTEN: ontbrekende kolommen
-- ============================================================

ALTER TABLE documenten ADD COLUMN IF NOT EXISTS beschrijving TEXT;

-- ============================================================
-- 8. EMAILS: ontbrekende kolommen
-- ============================================================

ALTER TABLE emails ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS snoozed_until TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS thread_id TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS follow_up_at TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS tracking JSONB;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS inbox_type TEXT DEFAULT 'persoonlijk';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS toegewezen_aan TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS ticket_status TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS interne_notities JSONB DEFAULT '[]';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS prioriteit_inbox TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS categorie_inbox TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS contactpersoon_id UUID;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 9. MONTAGE_AFSPRAKEN: ontbrekende kolommen
-- ============================================================

ALTER TABLE montage_afspraken ADD COLUMN IF NOT EXISTS project_naam TEXT;
ALTER TABLE montage_afspraken ADD COLUMN IF NOT EXISTS klant_naam TEXT;
ALTER TABLE montage_afspraken ADD COLUMN IF NOT EXISTS contactpersoon_id UUID;

-- ============================================================
-- 10. MEDEWERKERS: ontbrekende kolommen
-- ============================================================

ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS app_rol TEXT;

-- ============================================================
-- 11. NOTIFICATIES: ontbrekende kolommen + type uitbreiding
-- ============================================================

-- Verwijder bestaande type CHECK constraint en maak opnieuw met alle waarden
ALTER TABLE notificaties DROP CONSTRAINT IF EXISTS notificaties_type_check;
-- Niet opnieuw toevoegen: sommige Supabase installaties gebruiken geen named constraint

ALTER TABLE notificaties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 12. TIJDREGISTRATIES: ontbrekende kolommen
-- ============================================================

ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS project_naam TEXT;
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS medewerker_naam TEXT;
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS factuur_id UUID;

-- ============================================================
-- 13. FACTUUR_ITEMS: ontbrekende kolommen
-- ============================================================

ALTER TABLE factuur_items ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE factuur_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 14. APP_SETTINGS: ontbrekende kolommen
-- ============================================================

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS calculatie_uren_velden TEXT[] DEFAULT '{}';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS kvk_api_key TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS kvk_api_enabled BOOLEAN DEFAULT false;

-- ============================================================
-- 15. ONTBREKENDE TABELLEN
-- (alleen als schema.sql + 001_missing_tables.sql zijn gedraaid
--  maar 001_create_all_tables.sql NIET)
-- ============================================================

-- Offerte versies
CREATE TABLE IF NOT EXISTS offerte_versies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offerte_id UUID NOT NULL REFERENCES offertes(id) ON DELETE CASCADE,
  versie_nummer INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  notitie TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offerte_versies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offerte_versies' AND policyname = 'Users see own offerte_versies') THEN
    CREATE POLICY "Users see own offerte_versies" ON offerte_versies FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Klant activiteiten
CREATE TABLE IF NOT EXISTS klant_activiteiten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  klant_naam TEXT,
  datum TEXT NOT NULL,
  type TEXT NOT NULL,
  omschrijving TEXT NOT NULL DEFAULT '',
  bedrag NUMERIC,
  status TEXT,
  import_bron TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE klant_activiteiten ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'klant_activiteiten' AND policyname = 'Users see own klant_activiteiten') THEN
    CREATE POLICY "Users see own klant_activiteiten" ON klant_activiteiten FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Contactpersonen (aparte tabel)
CREATE TABLE IF NOT EXISTS contactpersonen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  naam TEXT NOT NULL DEFAULT '',
  functie TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefoon TEXT NOT NULL DEFAULT '',
  is_primair BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contactpersonen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contactpersonen' AND policyname = 'Users see own contactpersonen') THEN
    CREATE POLICY "Users see own contactpersonen" ON contactpersonen FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Vestigingen (aparte tabel)
CREATE TABLE IF NOT EXISTS vestigingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  naam TEXT NOT NULL DEFAULT '',
  adres TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  stad TEXT NOT NULL DEFAULT '',
  land TEXT NOT NULL DEFAULT 'Nederland',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vestigingen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vestigingen' AND policyname = 'Users see own vestigingen') THEN
    CREATE POLICY "Users see own vestigingen" ON vestigingen FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Ingeplande emails
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
  status TEXT NOT NULL DEFAULT 'gepland',
  verzonden_op TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ingeplande_emails ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ingeplande_emails' AND policyname = 'Users see own ingeplande_emails') THEN
    CREATE POLICY "Users see own ingeplande_emails" ON ingeplande_emails FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Email sequences
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  beschrijving TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'concept',
  stappen JSONB DEFAULT '[]',
  ontvangers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_sequences' AND policyname = 'Users see own email_sequences') THEN
    CREATE POLICY "Users see own email_sequences" ON email_sequences FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Verlof
CREATE TABLE IF NOT EXISTS verlof (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  start_datum TEXT NOT NULL,
  eind_datum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aangevraagd',
  opmerking TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE verlof ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'verlof' AND policyname = 'Users see own verlof') THEN
    CREATE POLICY "Users see own verlof" ON verlof FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Bedrijfssluitingsdagen
CREATE TABLE IF NOT EXISTS bedrijfssluitingsdagen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  datum TEXT NOT NULL,
  omschrijving TEXT NOT NULL DEFAULT '',
  jaarlijks_herhalend BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bedrijfssluitingsdagen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bedrijfssluitingsdagen' AND policyname = 'Users see own bedrijfssluitingsdagen') THEN
    CREATE POLICY "Users see own bedrijfssluitingsdagen" ON bedrijfssluitingsdagen FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Project toewijzingen
CREATE TABLE IF NOT EXISTS project_toewijzingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projecten(id) ON DELETE CASCADE,
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  rol TEXT NOT NULL DEFAULT 'medewerker',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_toewijzingen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_toewijzingen' AND policyname = 'Users see own project_toewijzingen') THEN
    CREATE POLICY "Users see own project_toewijzingen" ON project_toewijzingen FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Booking slots
CREATE TABLE IF NOT EXISTS booking_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dag_van_week INTEGER NOT NULL,
  start_tijd TEXT NOT NULL,
  eind_tijd TEXT NOT NULL,
  slot_duur_minuten INTEGER NOT NULL DEFAULT 30,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_slots' AND policyname = 'Users see own booking_slots') THEN
    CREATE POLICY "Users see own booking_slots" ON booking_slots FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Booking afspraken
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
  status TEXT NOT NULL DEFAULT 'gepland',
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE booking_afspraken ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_afspraken' AND policyname = 'Users see own booking_afspraken') THEN
    CREATE POLICY "Users see own booking_afspraken" ON booking_afspraken FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Werkbonnen
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
  status TEXT NOT NULL DEFAULT 'concept',
  klant_handtekening TEXT,
  klant_naam_getekend TEXT,
  getekend_op TEXT,
  omschrijving TEXT,
  interne_notitie TEXT,
  factuur_id UUID,
  kilometers NUMERIC,
  km_tarief NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE werkbonnen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'werkbonnen' AND policyname = 'Users see own werkbonnen') THEN
    CREATE POLICY "Users see own werkbonnen" ON werkbonnen FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Werkbon regels
CREATE TABLE IF NOT EXISTS werkbon_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  werkbon_id UUID NOT NULL REFERENCES werkbonnen(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  medewerker_id UUID,
  uren NUMERIC,
  uurtarief NUMERIC,
  omschrijving TEXT NOT NULL DEFAULT '',
  aantal NUMERIC,
  eenheid TEXT,
  prijs_per_eenheid NUMERIC,
  totaal NUMERIC NOT NULL DEFAULT 0,
  factureerbaar BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE werkbon_regels ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'werkbon_regels' AND policyname = 'Users see own werkbon_regels') THEN
    CREATE POLICY "Users see own werkbon_regels" ON werkbon_regels FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Werkbon fotos
CREATE TABLE IF NOT EXISTS werkbon_fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  werkbon_id UUID NOT NULL REFERENCES werkbonnen(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  omschrijving TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE werkbon_fotos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'werkbon_fotos' AND policyname = 'Users see own werkbon_fotos') THEN
    CREATE POLICY "Users see own werkbon_fotos" ON werkbon_fotos FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Herinnering templates
CREATE TABLE IF NOT EXISTS herinnering_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  onderwerp TEXT NOT NULL DEFAULT '',
  inhoud TEXT NOT NULL DEFAULT '',
  dagen_na_vervaldatum INTEGER NOT NULL DEFAULT 7,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE herinnering_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'herinnering_templates' AND policyname = 'Users see own herinnering_templates') THEN
    CREATE POLICY "Users see own herinnering_templates" ON herinnering_templates FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Leveranciers
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leveranciers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leveranciers' AND policyname = 'Users see own leveranciers') THEN
    CREATE POLICY "Users see own leveranciers" ON leveranciers FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Uitgaven
CREATE TABLE IF NOT EXISTS uitgaven (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  uitgave_nummer TEXT NOT NULL DEFAULT '',
  leverancier_id UUID REFERENCES leveranciers(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  referentie_nummer TEXT,
  bedrag_excl_btw NUMERIC NOT NULL DEFAULT 0,
  btw_bedrag NUMERIC NOT NULL DEFAULT 0,
  btw_percentage NUMERIC NOT NULL DEFAULT 21,
  bedrag_incl_btw NUMERIC NOT NULL DEFAULT 0,
  datum TEXT NOT NULL,
  vervaldatum TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  betaald_op TEXT,
  categorie TEXT NOT NULL,
  grootboek_id UUID,
  bijlage_url TEXT,
  omschrijving TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE uitgaven ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'uitgaven' AND policyname = 'Users see own uitgaven') THEN
    CREATE POLICY "Users see own uitgaven" ON uitgaven FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Bestelbonnen
CREATE TABLE IF NOT EXISTS bestelbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bestelbon_nummer TEXT NOT NULL DEFAULT '',
  leverancier_id UUID NOT NULL REFERENCES leveranciers(id) ON DELETE CASCADE,
  offerte_id UUID REFERENCES offertes(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'concept',
  besteld_op TEXT,
  verwachte_levering TEXT,
  ontvangen_op TEXT,
  subtotaal NUMERIC NOT NULL DEFAULT 0,
  btw_bedrag NUMERIC NOT NULL DEFAULT 0,
  totaal NUMERIC NOT NULL DEFAULT 0,
  opmerkingen TEXT,
  interne_notitie TEXT,
  referentie TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bestelbonnen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bestelbonnen' AND policyname = 'Users see own bestelbonnen') THEN
    CREATE POLICY "Users see own bestelbonnen" ON bestelbonnen FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Bestelbon regels
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
  offerte_item_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bestelbon_regels ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bestelbon_regels' AND policyname = 'Users see own bestelbon_regels') THEN
    CREATE POLICY "Users see own bestelbon_regels" ON bestelbon_regels FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Leveringsbonnen
CREATE TABLE IF NOT EXISTS leveringsbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  leveringsbon_nummer TEXT NOT NULL DEFAULT '',
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  werkbon_id UUID,
  bestelbon_id UUID,
  datum TEXT NOT NULL,
  locatie_adres TEXT NOT NULL DEFAULT '',
  locatie_stad TEXT,
  locatie_postcode TEXT,
  status TEXT NOT NULL DEFAULT 'concept',
  klant_handtekening TEXT,
  klant_naam_getekend TEXT,
  getekend_op TEXT,
  omschrijving TEXT,
  opmerkingen_klant TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leveringsbonnen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leveringsbonnen' AND policyname = 'Users see own leveringsbonnen') THEN
    CREATE POLICY "Users see own leveringsbonnen" ON leveringsbonnen FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Leveringsbon regels
CREATE TABLE IF NOT EXISTS leveringsbon_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  leveringsbon_id UUID NOT NULL REFERENCES leveringsbonnen(id) ON DELETE CASCADE,
  omschrijving TEXT NOT NULL DEFAULT '',
  aantal NUMERIC NOT NULL DEFAULT 1,
  eenheid TEXT,
  opmerking TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leveringsbon_regels ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leveringsbon_regels' AND policyname = 'Users see own leveringsbon_regels') THEN
    CREATE POLICY "Users see own leveringsbon_regels" ON leveringsbon_regels FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Voorraad artikelen
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voorraad_artikelen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voorraad_artikelen' AND policyname = 'Users see own voorraad_artikelen') THEN
    CREATE POLICY "Users see own voorraad_artikelen" ON voorraad_artikelen FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Voorraad mutaties
CREATE TABLE IF NOT EXISTS voorraad_mutaties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  artikel_id UUID NOT NULL REFERENCES voorraad_artikelen(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  aantal NUMERIC NOT NULL DEFAULT 0,
  reden TEXT,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  bestelbon_id UUID,
  werkbon_id UUID,
  saldo_na_mutatie NUMERIC NOT NULL DEFAULT 0,
  datum TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voorraad_mutaties ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voorraad_mutaties' AND policyname = 'Users see own voorraad_mutaties') THEN
    CREATE POLICY "Users see own voorraad_mutaties" ON voorraad_mutaties FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Deals
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
  status TEXT NOT NULL DEFAULT 'open',
  verloren_reden TEXT,
  gewonnen_op TEXT,
  verloren_op TEXT,
  verwachte_sluitdatum TEXT,
  kans_percentage NUMERIC,
  bron TEXT,
  offerte_ids TEXT[] DEFAULT '{}',
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  medewerker_id UUID,
  laatste_activiteit TEXT,
  volgende_actie TEXT,
  volgende_actie_datum TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'Users see own deals') THEN
    CREATE POLICY "Users see own deals" ON deals FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Deal activiteiten
CREATE TABLE IF NOT EXISTS deal_activiteiten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  beschrijving TEXT NOT NULL DEFAULT '',
  datum TEXT NOT NULL,
  email_id UUID,
  offerte_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deal_activiteiten ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deal_activiteiten' AND policyname = 'Users see own deal_activiteiten') THEN
    CREATE POLICY "Users see own deal_activiteiten" ON deal_activiteiten FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Lead formulieren
CREATE TABLE IF NOT EXISTS lead_formulieren (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  beschrijving TEXT,
  velden JSONB DEFAULT '[]',
  bedank_tekst TEXT NOT NULL DEFAULT '',
  redirect_url TEXT,
  email_notificatie BOOLEAN DEFAULT true,
  auto_deal_aanmaken BOOLEAN DEFAULT false,
  deal_fase TEXT,
  standaard_bron TEXT NOT NULL DEFAULT '',
  knop_tekst TEXT NOT NULL DEFAULT 'Verstuur',
  kleur TEXT,
  publiek_token TEXT NOT NULL,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_formulieren ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_formulieren' AND policyname = 'Users see own lead_formulieren') THEN
    CREATE POLICY "Users see own lead_formulieren" ON lead_formulieren FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Lead inzendingen
CREATE TABLE IF NOT EXISTS lead_inzendingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  formulier_id UUID NOT NULL REFERENCES lead_formulieren(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  ip_adres TEXT,
  browser TEXT,
  pagina_url TEXT,
  status TEXT NOT NULL DEFAULT 'nieuw',
  deal_id UUID,
  klant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_inzendingen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_inzendingen' AND policyname = 'Users see own lead_inzendingen') THEN
    CREATE POLICY "Users see own lead_inzendingen" ON lead_inzendingen FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Document styles
CREATE TABLE IF NOT EXISTS document_styles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template TEXT NOT NULL DEFAULT 'klassiek',
  heading_font TEXT NOT NULL DEFAULT 'Inter',
  body_font TEXT NOT NULL DEFAULT 'Inter',
  font_grootte_basis NUMERIC NOT NULL DEFAULT 10,
  primaire_kleur TEXT NOT NULL DEFAULT '#2563EB',
  secundaire_kleur TEXT NOT NULL DEFAULT '#1E40AF',
  accent_kleur TEXT NOT NULL DEFAULT '#7C3AED',
  tekst_kleur TEXT NOT NULL DEFAULT '#1F2937',
  marge_boven NUMERIC NOT NULL DEFAULT 20,
  marge_onder NUMERIC NOT NULL DEFAULT 20,
  marge_links NUMERIC NOT NULL DEFAULT 20,
  marge_rechts NUMERIC NOT NULL DEFAULT 20,
  logo_positie TEXT NOT NULL DEFAULT 'links',
  logo_grootte NUMERIC NOT NULL DEFAULT 60,
  briefpapier_url TEXT NOT NULL DEFAULT '',
  briefpapier_modus TEXT NOT NULL DEFAULT 'geen',
  toon_header BOOLEAN DEFAULT true,
  toon_footer BOOLEAN DEFAULT true,
  footer_tekst TEXT NOT NULL DEFAULT '',
  tabel_stijl TEXT NOT NULL DEFAULT 'striped',
  tabel_header_kleur TEXT NOT NULL DEFAULT '#F3F4F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_styles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_styles' AND policyname = 'Users see own document_styles') THEN
    CREATE POLICY "Users see own document_styles" ON document_styles FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 16. TEKENING GOEDKEURINGEN: ontbrekende kolommen
-- ============================================================

ALTER TABLE tekening_goedkeuringen ADD COLUMN IF NOT EXISTS eerste_bekeken_op TEXT;
ALTER TABLE tekening_goedkeuringen ADD COLUMN IF NOT EXISTS laatst_bekeken_op TEXT;
ALTER TABLE tekening_goedkeuringen ADD COLUMN IF NOT EXISTS aantal_keer_bekeken INTEGER DEFAULT 0;
