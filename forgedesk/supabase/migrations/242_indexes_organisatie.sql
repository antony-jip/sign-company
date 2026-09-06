-- Indexen op organisatie_id voor de tabellen die per organisatie gelezen
-- worden maar nog alleen op user_id/klant_id/project_id geïndexeerd waren.
-- Met 50 organisaties in één database scant elke org-scoped lijstquery
-- anders de hele tabel (performance-audit september 2026).
--
-- Bewust weggelaten: events (geen CREATE TABLE in de map, zie CLAUDE.md §3)
-- en werkbon_items(organisatie_id), die bestaat al sinds migratie 205.
-- taken(organisatie_id) en projecten(organisatie_id) bestaan als losse index;
-- de samengestelde (organisatie_id, status) dekt de statusfilters van de
-- takenlijst en het projectbord.
--
-- Veilig om opnieuw te draaien.

CREATE INDEX IF NOT EXISTS idx_tijdregistraties_org_datum
  ON tijdregistraties (organisatie_id, datum DESC);

CREATE INDEX IF NOT EXISTS idx_montage_afspraken_org_datum
  ON montage_afspraken (organisatie_id, datum);

CREATE INDEX IF NOT EXISTS idx_offerte_items_org
  ON offerte_items (organisatie_id);

CREATE INDEX IF NOT EXISTS idx_factuur_items_org
  ON factuur_items (organisatie_id);

CREATE INDEX IF NOT EXISTS idx_deals_org
  ON deals (organisatie_id);

CREATE INDEX IF NOT EXISTS idx_uitgaven_org
  ON uitgaven (organisatie_id);

CREATE INDEX IF NOT EXISTS idx_taken_org_status
  ON taken (organisatie_id, status);

CREATE INDEX IF NOT EXISTS idx_projecten_org_status
  ON projecten (organisatie_id, status);

CREATE INDEX IF NOT EXISTS idx_notificaties_user_gelezen_created
  ON notificaties (user_id, gelezen, created_at DESC);

INSERT INTO doen_migraties (bestand) VALUES ('242_indexes_organisatie.sql') ON CONFLICT DO NOTHING;
