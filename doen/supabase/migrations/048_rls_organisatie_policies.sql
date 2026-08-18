-- ============================================================
-- 048: RLS policies updaten naar organisatie_id
--
-- ⚠️ DRAAI DIT PAS nadat 047 succesvol is EN je hebt geverifieerd
-- dat ALLE records een organisatie_id hebben.
--
-- Verificatie query (draai eerst!):
-- SELECT 'klanten' as t, COUNT(*) filter (where organisatie_id IS NULL) as missing FROM klanten
-- UNION ALL SELECT 'projecten', COUNT(*) filter (where organisatie_id IS NULL) FROM projecten
-- UNION ALL SELECT 'offertes', COUNT(*) filter (where organisatie_id IS NULL) FROM offertes
-- UNION ALL SELECT 'facturen', COUNT(*) filter (where organisatie_id IS NULL) FROM facturen
-- UNION ALL SELECT 'werkbonnen', COUNT(*) filter (where organisatie_id IS NULL) FROM werkbonnen;
--
-- Als ALLES 0 is → veilig om door te gaan
-- ============================================================

-- Helper functie: haal organisatie_id op van de ingelogde user
CREATE OR REPLACE FUNCTION auth_organisatie_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT organisatie_id FROM profiles WHERE id = auth.uid()
$$;

-- ── Kerntabellen: van user_id naar organisatie_id isolatie ──

-- KLANTEN
DROP POLICY IF EXISTS "Users manage own klanten" ON klanten;
DROP POLICY IF EXISTS "Users CRUD own klanten" ON klanten;
CREATE POLICY "Org members manage klanten" ON klanten
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- PROJECTEN
DROP POLICY IF EXISTS "Users manage own projecten" ON projecten;
DROP POLICY IF EXISTS "Users CRUD own projecten" ON projecten;
CREATE POLICY "Org members manage projecten" ON projecten
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- TAKEN
DROP POLICY IF EXISTS "Users manage own taken" ON taken;
DROP POLICY IF EXISTS "Users CRUD own taken" ON taken;
CREATE POLICY "Org members manage taken" ON taken
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- OFFERTES
DROP POLICY IF EXISTS "Users manage own offertes" ON offertes;
DROP POLICY IF EXISTS "Users CRUD own offertes" ON offertes;
CREATE POLICY "Org members manage offertes" ON offertes
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- FACTUREN
DROP POLICY IF EXISTS "Users manage own facturen" ON facturen;
DROP POLICY IF EXISTS "Users CRUD own facturen" ON facturen;
CREATE POLICY "Org members manage facturen" ON facturen
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- DOCUMENTEN
DROP POLICY IF EXISTS "Users manage own documenten" ON documenten;
DROP POLICY IF EXISTS "Users CRUD own documenten" ON documenten;
CREATE POLICY "Org members manage documenten" ON documenten
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- WERKBONNEN
DROP POLICY IF EXISTS "Users manage own werkbonnen" ON werkbonnen;
DROP POLICY IF EXISTS "Users CRUD own werkbonnen" ON werkbonnen;
CREATE POLICY "Org members manage werkbonnen" ON werkbonnen
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- MEDEWERKERS
DROP POLICY IF EXISTS "Users manage own medewerkers" ON medewerkers;
DROP POLICY IF EXISTS "Users CRUD own medewerkers" ON medewerkers;
CREATE POLICY "Org members manage medewerkers" ON medewerkers
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- MONTAGE_AFSPRAKEN
DROP POLICY IF EXISTS "Users manage own montage_afspraken" ON montage_afspraken;
DROP POLICY IF EXISTS "Users CRUD own montage_afspraken" ON montage_afspraken;
CREATE POLICY "Org members manage montage_afspraken" ON montage_afspraken
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- EVENTS
DROP POLICY IF EXISTS "Users manage own events" ON events;
DROP POLICY IF EXISTS "Users CRUD own events" ON events;
CREATE POLICY "Org members manage events" ON events
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- TIJDREGISTRATIES
DROP POLICY IF EXISTS "Users manage own tijdregistraties" ON tijdregistraties;
DROP POLICY IF EXISTS "Users CRUD own tijdregistraties" ON tijdregistraties;
CREATE POLICY "Org members manage tijdregistraties" ON tijdregistraties
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- VERLOF
DROP POLICY IF EXISTS "Users manage own verlof" ON verlof;
DROP POLICY IF EXISTS "Users CRUD own verlof" ON verlof;
CREATE POLICY "Org members manage verlof" ON verlof
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- NOTIFICATIES (blijft user_id — notificaties zijn persoonlijk)
-- Geen wijziging nodig

-- EMAILS (blijft user_id — emails zijn persoonlijk per mailbox)
-- Geen wijziging nodig

-- LEVERANCIERS
DROP POLICY IF EXISTS "Users manage own leveranciers" ON leveranciers;
DROP POLICY IF EXISTS "Users CRUD own leveranciers" ON leveranciers;
CREATE POLICY "Org members manage leveranciers" ON leveranciers
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- UITGAVEN
DROP POLICY IF EXISTS "Users manage own uitgaven" ON uitgaven;
DROP POLICY IF EXISTS "Users CRUD own uitgaven" ON uitgaven;
CREATE POLICY "Org members manage uitgaven" ON uitgaven
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- DEALS
DROP POLICY IF EXISTS "Users manage own deals" ON deals;
DROP POLICY IF EXISTS "Users CRUD own deals" ON deals;
CREATE POLICY "Org members manage deals" ON deals
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- BESTELBONNEN
DROP POLICY IF EXISTS "Users manage own bestelbonnen" ON bestelbonnen;
DROP POLICY IF EXISTS "Users CRUD own bestelbonnen" ON bestelbonnen;
CREATE POLICY "Org members manage bestelbonnen" ON bestelbonnen
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- LEVERINGSBONNEN
DROP POLICY IF EXISTS "Users manage own leveringsbonnen" ON leveringsbonnen;
DROP POLICY IF EXISTS "Users CRUD own leveringsbonnen" ON leveringsbonnen;
CREATE POLICY "Org members manage leveringsbonnen" ON leveringsbonnen
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- VOORRAAD_ARTIKELEN
DROP POLICY IF EXISTS "Users manage own voorraad_artikelen" ON voorraad_artikelen;
DROP POLICY IF EXISTS "Users CRUD own voorraad_artikelen" ON voorraad_artikelen;
CREATE POLICY "Org members manage voorraad_artikelen" ON voorraad_artikelen
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- PROJECT_PORTALEN
DROP POLICY IF EXISTS "Users manage own project_portalen" ON project_portalen;
DROP POLICY IF EXISTS "Users CRUD own project_portalen" ON project_portalen;
CREATE POLICY "Org members manage project_portalen" ON project_portalen
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- APP_SETTINGS (organisatie-breed, niet per user)
DROP POLICY IF EXISTS "Users manage own app_settings" ON app_settings;
DROP POLICY IF EXISTS "Users CRUD own app_settings" ON app_settings;
CREATE POLICY "Org members manage app_settings" ON app_settings
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- DOCUMENT_STYLES
DROP POLICY IF EXISTS "Users manage own document_styles" ON document_styles;
DROP POLICY IF EXISTS "Users CRUD own document_styles" ON document_styles;
CREATE POLICY "Org members manage document_styles" ON document_styles
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- HERINNERING_TEMPLATES
DROP POLICY IF EXISTS "Users manage own herinnering_templates" ON herinnering_templates;
DROP POLICY IF EXISTS "Users CRUD own herinnering_templates" ON herinnering_templates;
CREATE POLICY "Org members manage herinnering_templates" ON herinnering_templates
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- CALCULATIE_PRODUCTEN
DROP POLICY IF EXISTS "Users manage own calculatie_producten" ON calculatie_producten;
DROP POLICY IF EXISTS "Users CRUD own calculatie_producten" ON calculatie_producten;
CREATE POLICY "Org members manage calculatie_producten" ON calculatie_producten
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- CALCULATIE_TEMPLATES
DROP POLICY IF EXISTS "Users manage own calculatie_templates" ON calculatie_templates;
DROP POLICY IF EXISTS "Users CRUD own calculatie_templates" ON calculatie_templates;
CREATE POLICY "Org members manage calculatie_templates" ON calculatie_templates
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- ── Child tabellen: erven isolatie via parent ──
-- offerte_items, factuur_items, werkbon_items, etc. hoeven GEEN
-- eigen organisatie_id — hun RLS werkt via de parent tabel (ON DELETE CASCADE).
-- De bestaande user_id policies op child tabellen blijven werken
-- omdat de parent al gefilterd is.

-- ── Organisaties tabel: update policy voor teamleden ──
DROP POLICY IF EXISTS "Eigenaar ziet eigen organisatie" ON organisaties;
CREATE POLICY "Leden zien eigen organisatie" ON organisaties
  FOR ALL USING (
    id = auth_organisatie_id()
  );
