-- ============================================================
-- 047: organisatie_id toevoegen aan alle kerntabellen
--
-- STAP 1: Kolom toevoegen (nullable)
-- STAP 2: Backfill vanuit profiles
-- STAP 3: NOT NULL constraint (aparte migratie na verificatie)
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor
-- Veilig om meerdere keren uit te voeren (IF NOT EXISTS)
-- ============================================================

-- ── STAP 1: Kolommen toevoegen ──

ALTER TABLE klanten ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE taken ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE documenten ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE werkbonnen ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE montage_afspraken ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE verlof ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE bedrijfssluitingsdagen ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE notificaties ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE leveranciers ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE uitgaven ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE bestelbonnen ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE leveringsbonnen ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE voorraad_artikelen ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE project_portalen ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE document_styles ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE herinnering_templates ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE calculatie_producten ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE calculatie_templates ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);

-- ── STAP 2: Backfill vanuit profiles ──
-- Elke tabel heeft user_id → we zoeken de organisatie_id op in profiles

UPDATE klanten SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = klanten.user_id AND klanten.organisatie_id IS NULL;
UPDATE projecten SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = projecten.user_id AND projecten.organisatie_id IS NULL;
UPDATE taken SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = taken.user_id AND taken.organisatie_id IS NULL;
UPDATE offertes SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = offertes.user_id AND offertes.organisatie_id IS NULL;
UPDATE facturen SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = facturen.user_id AND facturen.organisatie_id IS NULL;
UPDATE documenten SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = documenten.user_id AND documenten.organisatie_id IS NULL;
UPDATE werkbonnen SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = werkbonnen.user_id AND werkbonnen.organisatie_id IS NULL;
UPDATE medewerkers SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = medewerkers.user_id AND medewerkers.organisatie_id IS NULL;
UPDATE montage_afspraken SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = montage_afspraken.user_id AND montage_afspraken.organisatie_id IS NULL;
UPDATE events SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = events.user_id AND events.organisatie_id IS NULL;
UPDATE tijdregistraties SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = tijdregistraties.user_id AND tijdregistraties.organisatie_id IS NULL;
UPDATE verlof SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = verlof.user_id AND verlof.organisatie_id IS NULL;
UPDATE bedrijfssluitingsdagen SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = bedrijfssluitingsdagen.user_id AND bedrijfssluitingsdagen.organisatie_id IS NULL;
UPDATE notificaties SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = notificaties.user_id AND notificaties.organisatie_id IS NULL;
UPDATE emails SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = emails.user_id AND emails.organisatie_id IS NULL;
UPDATE leveranciers SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = leveranciers.user_id AND leveranciers.organisatie_id IS NULL;
UPDATE uitgaven SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = uitgaven.user_id AND uitgaven.organisatie_id IS NULL;
UPDATE deals SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = deals.user_id AND deals.organisatie_id IS NULL;
UPDATE bestelbonnen SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = bestelbonnen.user_id AND bestelbonnen.organisatie_id IS NULL;
UPDATE leveringsbonnen SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = leveringsbonnen.user_id AND leveringsbonnen.organisatie_id IS NULL;
UPDATE voorraad_artikelen SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = voorraad_artikelen.user_id AND voorraad_artikelen.organisatie_id IS NULL;
UPDATE project_portalen SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = project_portalen.user_id AND project_portalen.organisatie_id IS NULL;
UPDATE document_styles SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = document_styles.user_id AND document_styles.organisatie_id IS NULL;
UPDATE app_settings SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = app_settings.user_id AND app_settings.organisatie_id IS NULL;
UPDATE herinnering_templates SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = herinnering_templates.user_id AND herinnering_templates.organisatie_id IS NULL;
UPDATE calculatie_producten SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = calculatie_producten.user_id AND calculatie_producten.organisatie_id IS NULL;
UPDATE calculatie_templates SET organisatie_id = p.organisatie_id FROM profiles p WHERE p.id = calculatie_templates.user_id AND calculatie_templates.organisatie_id IS NULL;

-- ── STAP 3: Indexen voor performance ──

CREATE INDEX IF NOT EXISTS idx_klanten_org ON klanten(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_projecten_org ON projecten(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_taken_org ON taken(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_offertes_org ON offertes(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_facturen_org ON facturen(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_documenten_org ON documenten(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_werkbonnen_org ON werkbonnen(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_medewerkers_org ON medewerkers(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_emails_org ON emails(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_notificaties_org ON notificaties(organisatie_id);

-- ── VERIFICATIE ──
-- Draai dit na de migratie om te checken of alles gevuld is:
-- SELECT 'klanten' as tabel, COUNT(*) as totaal, COUNT(organisatie_id) as met_org FROM klanten
-- UNION ALL SELECT 'projecten', COUNT(*), COUNT(organisatie_id) FROM projecten
-- UNION ALL SELECT 'offertes', COUNT(*), COUNT(organisatie_id) FROM offertes
-- UNION ALL SELECT 'facturen', COUNT(*), COUNT(organisatie_id) FROM facturen;
