-- ============================================================
-- 204: indexen voor zoeken en bladeren in mail
--
-- WAAROM. Gemeten op de productie-database (19.5k mails, koude cache):
--   lijst inbox, 100 rijen, gesorteerd op datum ...........  7,5 s
--   onderwerp ILIKE '%offerte%' ...........................  5,3 s
--   body_text ILIKE + or() ................................  statement-timeout
-- Alle drie zijn sequentiële scans. Er is een GIN-index op fts (migratie 048)
-- en verder niets dat het lezen van de lijst of het zoeken op deelstring
-- ondersteunt.
--
-- WAT.
--   1. Bladeren per map: (user_id, map, datum DESC) dekt precies de query van
--      getEmailsPage en de mapwissel. De keyset-paginatie leunt op dezelfde
--      volgorde.
--   2. Deelstring-zoeken: trigram-indexen op onderwerp, van en aan. Dat is het
--      vangnet van searchEmailsFTS voor namen in adressen, woorddelen en
--      ordernummers — precies waar full-text niets vindt.
--
-- body_text krijgt bewust GEEN trigram-index: die kolom is groot en full-text
-- dekt de inhoud al. De zoekcode raakt hem daarom ook niet meer aan.
--
-- CONCURRENTLY kan niet: Supabase draait dit in een transactie. Op 19.5k
-- rijen kost dit seconden, geen minuten.
--
-- Idempotent: veilig om meerdere keren te draaien.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_emails_user_map_datum
  ON emails (user_id, map, datum DESC);

CREATE INDEX IF NOT EXISTS idx_emails_onderwerp_trgm
  ON emails USING GIN (onderwerp gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_emails_van_trgm
  ON emails USING GIN (van gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_emails_aan_trgm
  ON emails USING GIN (aan gin_trgm_ops);

COMMIT;

ANALYZE emails;

INSERT INTO doen_migraties (bestand) VALUES ('204_emails_zoek_indexen.sql') ON CONFLICT DO NOTHING;
