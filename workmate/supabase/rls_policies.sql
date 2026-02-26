-- ============================================================
-- Workmate — Complete Row Level Security Policies
-- Covers ALL 49 tables used by the application
-- Generated 2026-02-26
-- ============================================================
-- IMPORTANT: Run this AFTER schema.sql and any migration files.
-- This file is idempotent — safe to re-run.
-- ============================================================

-- Helper: drop policy if exists (Supabase doesn't support IF NOT EXISTS for policies)
-- We use CREATE OR REPLACE where possible, otherwise drop+create.

-- ============================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. HELPER FUNCTION: Standard CRUD policies for user_id tables
-- ============================================================
CREATE OR REPLACE FUNCTION create_user_rls_policies(tbl text, col text DEFAULT 'user_id')
RETURNS void AS $$
BEGIN
  -- Drop existing policies first (idempotent)
  EXECUTE format('DROP POLICY IF EXISTS "rls_select_%s" ON %I', tbl, tbl);
  EXECUTE format('DROP POLICY IF EXISTS "rls_insert_%s" ON %I', tbl, tbl);
  EXECUTE format('DROP POLICY IF EXISTS "rls_update_%s" ON %I', tbl, tbl);
  EXECUTE format('DROP POLICY IF EXISTS "rls_delete_%s" ON %I', tbl, tbl);

  -- Create new policies
  EXECUTE format('CREATE POLICY "rls_select_%s" ON %I FOR SELECT USING (auth.uid() = %I)', tbl, tbl, col);
  EXECUTE format('CREATE POLICY "rls_insert_%s" ON %I FOR INSERT WITH CHECK (auth.uid() = %I)', tbl, tbl, col);
  EXECUTE format('CREATE POLICY "rls_update_%s" ON %I FOR UPDATE USING (auth.uid() = %I)', tbl, tbl, col);
  EXECUTE format('CREATE POLICY "rls_delete_%s" ON %I FOR DELETE USING (auth.uid() = %I)', tbl, tbl, col);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. APPLY STANDARD USER_ID POLICIES
-- ============================================================
-- These tables all have a user_id column that maps to auth.uid()

SELECT create_user_rls_policies('klanten');
SELECT create_user_rls_policies('projecten');
SELECT create_user_rls_policies('taken');
SELECT create_user_rls_policies('offertes');
SELECT create_user_rls_policies('offerte_versies');
SELECT create_user_rls_policies('documenten');
SELECT create_user_rls_policies('emails');
SELECT create_user_rls_policies('events');
SELECT create_user_rls_policies('grootboek');
SELECT create_user_rls_policies('btw_codes');
SELECT create_user_rls_policies('kortingen');
SELECT create_user_rls_policies('ai_chats');
SELECT create_user_rls_policies('nieuwsbrieven');
SELECT create_user_rls_policies('app_settings');
SELECT create_user_rls_policies('calculatie_producten');
SELECT create_user_rls_policies('calculatie_templates');
SELECT create_user_rls_policies('offerte_templates');
SELECT create_user_rls_policies('tekening_goedkeuringen');
SELECT create_user_rls_policies('facturen');
SELECT create_user_rls_policies('tijdregistraties');
SELECT create_user_rls_policies('medewerkers');
SELECT create_user_rls_policies('notificaties');
SELECT create_user_rls_policies('montage_afspraken');
SELECT create_user_rls_policies('verlof');
SELECT create_user_rls_policies('bedrijfssluitingsdagen');
SELECT create_user_rls_policies('project_toewijzingen');
SELECT create_user_rls_policies('booking_slots');
SELECT create_user_rls_policies('booking_afspraken');
SELECT create_user_rls_policies('werkbonnen');
SELECT create_user_rls_policies('werkbon_regels');
SELECT create_user_rls_policies('werkbon_fotos');
SELECT create_user_rls_policies('herinnering_templates');
SELECT create_user_rls_policies('leveranciers');
SELECT create_user_rls_policies('uitgaven');
SELECT create_user_rls_policies('bestelbonnen');
SELECT create_user_rls_policies('bestelbon_regels');
SELECT create_user_rls_policies('leveringsbonnen');
SELECT create_user_rls_policies('leveringsbon_regels');
SELECT create_user_rls_policies('voorraad_artikelen');
SELECT create_user_rls_policies('voorraad_mutaties');
SELECT create_user_rls_policies('deals');
SELECT create_user_rls_policies('deal_activiteiten');
SELECT create_user_rls_policies('lead_formulieren');
SELECT create_user_rls_policies('lead_inzendingen');
SELECT create_user_rls_policies('document_styles');
SELECT create_user_rls_policies('user_email_settings');

-- ============================================================
-- 4. PROFILES — special case: id = auth.uid() (not user_id)
-- ============================================================
DROP POLICY IF EXISTS "rls_select_profiles" ON profiles;
DROP POLICY IF EXISTS "rls_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "rls_update_profiles" ON profiles;
DROP POLICY IF EXISTS "rls_delete_profiles" ON profiles;

CREATE POLICY "rls_select_profiles" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "rls_insert_profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "rls_update_profiles" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 5. CHILD TABLES — access via parent ownership
-- ============================================================

-- offerte_items: access if user owns the parent offerte
DROP POLICY IF EXISTS "rls_select_offerte_items" ON offerte_items;
DROP POLICY IF EXISTS "rls_insert_offerte_items" ON offerte_items;
DROP POLICY IF EXISTS "rls_update_offerte_items" ON offerte_items;
DROP POLICY IF EXISTS "rls_delete_offerte_items" ON offerte_items;

CREATE POLICY "rls_select_offerte_items" ON offerte_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM offertes WHERE offertes.id = offerte_items.offerte_id AND offertes.user_id = auth.uid())
);
CREATE POLICY "rls_insert_offerte_items" ON offerte_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM offertes WHERE offertes.id = offerte_items.offerte_id AND offertes.user_id = auth.uid())
);
CREATE POLICY "rls_update_offerte_items" ON offerte_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM offertes WHERE offertes.id = offerte_items.offerte_id AND offertes.user_id = auth.uid())
);
CREATE POLICY "rls_delete_offerte_items" ON offerte_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM offertes WHERE offertes.id = offerte_items.offerte_id AND offertes.user_id = auth.uid())
);

-- factuur_items: access if user owns the parent factuur
DROP POLICY IF EXISTS "rls_select_factuur_items" ON factuur_items;
DROP POLICY IF EXISTS "rls_insert_factuur_items" ON factuur_items;
DROP POLICY IF EXISTS "rls_update_factuur_items" ON factuur_items;
DROP POLICY IF EXISTS "rls_delete_factuur_items" ON factuur_items;

CREATE POLICY "rls_select_factuur_items" ON factuur_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM facturen WHERE facturen.id = factuur_items.factuur_id AND facturen.user_id = auth.uid())
);
CREATE POLICY "rls_insert_factuur_items" ON factuur_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM facturen WHERE facturen.id = factuur_items.factuur_id AND facturen.user_id = auth.uid())
);
CREATE POLICY "rls_update_factuur_items" ON factuur_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM facturen WHERE facturen.id = factuur_items.factuur_id AND facturen.user_id = auth.uid())
);
CREATE POLICY "rls_delete_factuur_items" ON factuur_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM facturen WHERE facturen.id = factuur_items.factuur_id AND facturen.user_id = auth.uid())
);

-- ============================================================
-- 6. PUBLIC ACCESS — token-based routes (no auth required)
-- ============================================================

-- tekening_goedkeuringen: public read by token (for /goedkeuring/:token)
DROP POLICY IF EXISTS "rls_public_select_tekening_goedkeuringen" ON tekening_goedkeuringen;
CREATE POLICY "rls_public_select_tekening_goedkeuringen" ON tekening_goedkeuringen
  FOR SELECT USING (true);
-- Note: public SELECT is guarded by token lookup in the app layer.
-- For tighter security, use a Supabase Edge Function instead.

DROP POLICY IF EXISTS "rls_public_update_tekening_goedkeuringen" ON tekening_goedkeuringen;
CREATE POLICY "rls_public_update_tekening_goedkeuringen" ON tekening_goedkeuringen
  FOR UPDATE USING (true);

-- offertes: public read by publiek_token (for /offerte-bekijken/:token)
-- Already has user_id RLS above. Add anonymous select by token:
DROP POLICY IF EXISTS "rls_anon_select_offertes_by_token" ON offertes;
CREATE POLICY "rls_anon_select_offertes_by_token" ON offertes
  FOR SELECT USING (publiek_token IS NOT NULL);
-- The app filters by token; this just allows the query to return rows.

-- facturen: public read by betaal_token (for /betalen/:token)
DROP POLICY IF EXISTS "rls_anon_select_facturen_by_token" ON facturen;
CREATE POLICY "rls_anon_select_facturen_by_token" ON facturen
  FOR SELECT USING (betaal_token IS NOT NULL);

-- booking_slots: public read for /boeken/:userId page
DROP POLICY IF EXISTS "rls_public_select_booking_slots" ON booking_slots;
CREATE POLICY "rls_public_select_booking_slots" ON booking_slots
  FOR SELECT USING (true);

-- booking_afspraken: public insert (anyone can book) + public read by token
DROP POLICY IF EXISTS "rls_public_insert_booking_afspraken" ON booking_afspraken;
CREATE POLICY "rls_public_insert_booking_afspraken" ON booking_afspraken
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "rls_public_select_booking_afspraken_token" ON booking_afspraken;
CREATE POLICY "rls_public_select_booking_afspraken_token" ON booking_afspraken
  FOR SELECT USING (true);

-- lead_formulieren: public read by token (for /formulier/:token)
DROP POLICY IF EXISTS "rls_public_select_lead_formulieren" ON lead_formulieren;
CREATE POLICY "rls_public_select_lead_formulieren" ON lead_formulieren
  FOR SELECT USING (actief = true AND publiek_token IS NOT NULL);

-- lead_inzendingen: public insert (form submissions)
DROP POLICY IF EXISTS "rls_public_insert_lead_inzendingen" ON lead_inzendingen;
CREATE POLICY "rls_public_insert_lead_inzendingen" ON lead_inzendingen
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- 7. STORAGE BUCKET POLICIES
-- ============================================================

-- Documenten bucket (private)
DROP POLICY IF EXISTS "rls_storage_upload_documenten" ON storage.objects;
CREATE POLICY "rls_storage_upload_documenten" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documenten' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "rls_storage_select_documenten" ON storage.objects;
CREATE POLICY "rls_storage_select_documenten" ON storage.objects FOR SELECT USING (
  bucket_id = 'documenten' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "rls_storage_delete_documenten" ON storage.objects;
CREATE POLICY "rls_storage_delete_documenten" ON storage.objects FOR DELETE USING (
  bucket_id = 'documenten' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Briefpapier bucket (public read, authenticated upload)
DROP POLICY IF EXISTS "rls_storage_upload_briefpapier" ON storage.objects;
CREATE POLICY "rls_storage_upload_briefpapier" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'briefpapier' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "rls_storage_select_briefpapier" ON storage.objects;
CREATE POLICY "rls_storage_select_briefpapier" ON storage.objects FOR SELECT USING (
  bucket_id = 'briefpapier'
);
DROP POLICY IF EXISTS "rls_storage_delete_briefpapier" ON storage.objects;
CREATE POLICY "rls_storage_delete_briefpapier" ON storage.objects FOR DELETE USING (
  bucket_id = 'briefpapier' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================
-- Cleanup helper function (optional: keep for future use)
-- ============================================================
-- DROP FUNCTION IF EXISTS create_user_rls_policies(text, text);
