-- ============================================================
-- Migration 089: audit_log_feature — montage entity_type
--
-- Voegt 'montage' toe aan de entity_type CHECK constraint zodat
-- montage-creates (en toekomstige montage-wijzigingen) kunnen
-- worden gelogd in de feature audit-feed.
--
-- Volgorde voor deploy: migration eerst draaien, dan code mergen.
-- Anders schrijft de app stilletjes geen montage-audit-rijen
-- (logger is fire-and-forget, gooit niet bij INSERT-fout).
-- ============================================================

ALTER TABLE audit_log_feature
  DROP CONSTRAINT IF EXISTS audit_log_feature_entity_type_check;

ALTER TABLE audit_log_feature
  ADD CONSTRAINT audit_log_feature_entity_type_check
  CHECK (entity_type IN ('taak','project','offerte','factuur','klant','werkbon','montage'));
