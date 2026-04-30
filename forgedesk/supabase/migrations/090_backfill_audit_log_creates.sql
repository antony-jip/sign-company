-- ============================================================
-- Migration 090: Backfill audit_log_feature 'aangemaakt' events
--
-- Doel: bestaande projecten/offertes/werkbonnen/facturen krijgen
-- retroactief een audit_log_feature rij met actie='aangemaakt' zodat
-- de Projectactiviteit-feed "wie deed wat" ook voor pre-deploy data
-- werkt.
--
-- Bron voor medewerker_naam: JOIN op medewerkers.user_id binnen
-- dezelfde organisatie. Geen match -> 'Onbekend'.
--
-- Idempotent: WHERE NOT EXISTS voorkomt duplicates bij her-uitvoer.
-- created_at wordt backdated op de oorspronkelijke bron-record
-- created_at — niet NOW() — zodat de feed chronologisch correct toont.
--
-- Uitvoeren: handmatig via Supabase SQL Editor. Niet via een
-- migration-runner (dit bestand staat in supabase/migrations/ voor
-- versionering, niet voor automatische deploy).
--
-- VEILIGHEID:
--   - Alleen INSERT-statements
--   - Geen TRUNCATE / DELETE / UPDATE
--   - Org-scope via JOIN op organisatie_id (geen cross-tenant lekken)
--   - Records zonder organisatie_id (legacy single-tenant) worden
--     overgeslagen omdat audit_log_feature.organisatie_id NOT NULL is
--
-- WORKFLOW:
--   1. Run de DRY-RUN query bovenaan elke sectie eerst los
--   2. Vergelijk de count met je verwachting
--   3. Als acceptabel: run de bijbehorende INSERT
--   4. Aan het einde: run de VERIFICATIE query om totalen te checken
-- ============================================================


-- ============================================================
-- SECTIE 1: PROJECTEN
-- ============================================================

-- Dry-run — hoeveel project-rijen krijgen een aangemaakt event?
-- SELECT count(*) AS te_inserten_projecten
-- FROM projecten p
-- WHERE p.organisatie_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM audit_log_feature al
--     WHERE al.entity_type = 'project'
--       AND al.entity_id = p.id
--       AND al.actie = 'aangemaakt'
--   );

-- Dry-run — hoeveel projecten krijgen 'Onbekend' als medewerker_naam?
-- SELECT count(*) AS projecten_zonder_medewerker_match
-- FROM projecten p
-- LEFT JOIN medewerkers m
--   ON m.user_id = p.user_id
--   AND m.organisatie_id = p.organisatie_id
-- WHERE p.organisatie_id IS NOT NULL
--   AND m.id IS NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM audit_log_feature al
--     WHERE al.entity_type = 'project'
--       AND al.entity_id = p.id
--       AND al.actie = 'aangemaakt'
--   );

INSERT INTO audit_log_feature (
  organisatie_id, entity_type, entity_id, actie,
  user_id, medewerker_id, medewerker_naam, created_at, omschrijving
)
SELECT
  p.organisatie_id,
  'project',
  p.id,
  'aangemaakt',
  p.user_id,
  m.id,
  COALESCE(m.naam, 'Onbekend'),
  p.created_at,
  'Backfill: aangemaakt op basis van projecten.user_id'
FROM projecten p
LEFT JOIN medewerkers m
  ON m.user_id = p.user_id
  AND m.organisatie_id = p.organisatie_id
WHERE p.organisatie_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log_feature al
    WHERE al.entity_type = 'project'
      AND al.entity_id = p.id
      AND al.actie = 'aangemaakt'
  );


-- ============================================================
-- SECTIE 2: OFFERTES
-- ============================================================

-- Dry-run — hoeveel offerte-rijen krijgen een aangemaakt event?
-- SELECT count(*) AS te_inserten_offertes
-- FROM offertes o
-- WHERE o.organisatie_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM audit_log_feature al
--     WHERE al.entity_type = 'offerte'
--       AND al.entity_id = o.id
--       AND al.actie = 'aangemaakt'
--   );

-- Dry-run — hoeveel offertes krijgen 'Onbekend'?
-- SELECT count(*) AS offertes_zonder_medewerker_match
-- FROM offertes o
-- LEFT JOIN medewerkers m
--   ON m.user_id = o.user_id
--   AND m.organisatie_id = o.organisatie_id
-- WHERE o.organisatie_id IS NOT NULL
--   AND m.id IS NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM audit_log_feature al
--     WHERE al.entity_type = 'offerte'
--       AND al.entity_id = o.id
--       AND al.actie = 'aangemaakt'
--   );

INSERT INTO audit_log_feature (
  organisatie_id, entity_type, entity_id, actie,
  user_id, medewerker_id, medewerker_naam, created_at, omschrijving
)
SELECT
  o.organisatie_id,
  'offerte',
  o.id,
  'aangemaakt',
  o.user_id,
  m.id,
  COALESCE(m.naam, 'Onbekend'),
  o.created_at,
  'Backfill: aangemaakt op basis van offertes.user_id'
FROM offertes o
LEFT JOIN medewerkers m
  ON m.user_id = o.user_id
  AND m.organisatie_id = o.organisatie_id
WHERE o.organisatie_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log_feature al
    WHERE al.entity_type = 'offerte'
      AND al.entity_id = o.id
      AND al.actie = 'aangemaakt'
  );


-- ============================================================
-- SECTIE 3: WERKBONNEN
-- ============================================================

-- Dry-run — hoeveel werkbon-rijen krijgen een aangemaakt event?
-- SELECT count(*) AS te_inserten_werkbonnen
-- FROM werkbonnen w
-- WHERE w.organisatie_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM audit_log_feature al
--     WHERE al.entity_type = 'werkbon'
--       AND al.entity_id = w.id
--       AND al.actie = 'aangemaakt'
--   );

-- Dry-run — hoeveel werkbonnen krijgen 'Onbekend'?
-- SELECT count(*) AS werkbonnen_zonder_medewerker_match
-- FROM werkbonnen w
-- LEFT JOIN medewerkers m
--   ON m.user_id = w.user_id
--   AND m.organisatie_id = w.organisatie_id
-- WHERE w.organisatie_id IS NOT NULL
--   AND m.id IS NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM audit_log_feature al
--     WHERE al.entity_type = 'werkbon'
--       AND al.entity_id = w.id
--       AND al.actie = 'aangemaakt'
--   );

INSERT INTO audit_log_feature (
  organisatie_id, entity_type, entity_id, actie,
  user_id, medewerker_id, medewerker_naam, created_at, omschrijving
)
SELECT
  w.organisatie_id,
  'werkbon',
  w.id,
  'aangemaakt',
  w.user_id,
  m.id,
  COALESCE(m.naam, 'Onbekend'),
  w.created_at,
  'Backfill: aangemaakt op basis van werkbonnen.user_id'
FROM werkbonnen w
LEFT JOIN medewerkers m
  ON m.user_id = w.user_id
  AND m.organisatie_id = w.organisatie_id
WHERE w.organisatie_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log_feature al
    WHERE al.entity_type = 'werkbon'
      AND al.entity_id = w.id
      AND al.actie = 'aangemaakt'
  );


-- ============================================================
-- SECTIE 4: FACTUREN
-- ============================================================

-- Dry-run — hoeveel factuur-rijen krijgen een aangemaakt event?
-- SELECT count(*) AS te_inserten_facturen
-- FROM facturen f
-- WHERE f.organisatie_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM audit_log_feature al
--     WHERE al.entity_type = 'factuur'
--       AND al.entity_id = f.id
--       AND al.actie = 'aangemaakt'
--   );

-- Dry-run — hoeveel facturen krijgen 'Onbekend'?
-- SELECT count(*) AS facturen_zonder_medewerker_match
-- FROM facturen f
-- LEFT JOIN medewerkers m
--   ON m.user_id = f.user_id
--   AND m.organisatie_id = f.organisatie_id
-- WHERE f.organisatie_id IS NOT NULL
--   AND m.id IS NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM audit_log_feature al
--     WHERE al.entity_type = 'factuur'
--       AND al.entity_id = f.id
--       AND al.actie = 'aangemaakt'
--   );

INSERT INTO audit_log_feature (
  organisatie_id, entity_type, entity_id, actie,
  user_id, medewerker_id, medewerker_naam, created_at, omschrijving
)
SELECT
  f.organisatie_id,
  'factuur',
  f.id,
  'aangemaakt',
  f.user_id,
  m.id,
  COALESCE(m.naam, 'Onbekend'),
  f.created_at,
  'Backfill: aangemaakt op basis van facturen.user_id'
FROM facturen f
LEFT JOIN medewerkers m
  ON m.user_id = f.user_id
  AND m.organisatie_id = f.organisatie_id
WHERE f.organisatie_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log_feature al
    WHERE al.entity_type = 'factuur'
      AND al.entity_id = f.id
      AND al.actie = 'aangemaakt'
  );


-- ============================================================
-- VERIFICATIE — run na de INSERTs
-- ============================================================

-- Totalen per entity_type (vergelijk met record-counts in bron-tabellen):
-- SELECT entity_type, count(*) AS aangemaakt_events
-- FROM audit_log_feature
-- WHERE actie = 'aangemaakt'
-- GROUP BY entity_type
-- ORDER BY entity_type;

-- Hoeveel rijen 'Onbekend' bevatten per entity_type:
-- SELECT entity_type, count(*) AS onbekend_count
-- FROM audit_log_feature
-- WHERE actie = 'aangemaakt' AND medewerker_naam = 'Onbekend'
-- GROUP BY entity_type
-- ORDER BY entity_type;

-- Sanity check — eerste 10 backfilled rijen per type:
-- SELECT entity_type, entity_id, medewerker_naam, created_at, omschrijving
-- FROM audit_log_feature
-- WHERE actie = 'aangemaakt'
--   AND omschrijving LIKE 'Backfill:%'
-- ORDER BY created_at DESC
-- LIMIT 40;
