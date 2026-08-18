-- ============================================================
-- Migration 166: Daan leert uit e-mail (fase 3)
--
-- Org-brede toggle voor het mail-leerpad: de aanvraag-classifier laat
-- per beoordeelde mail van een BEKENDE KLANT een compacte kern achter
-- in ai_sporen (afzender + onderwerp + kern ≤600 tekens), zodat de
-- nachtploeg ook leert uit mail waar niemand een AI-knop op gebruikt.
--
-- Privacy-grenzen van dit pad (afgesproken 28 jul 2026):
--   · alleen mail waarvan de afzender herleidbaar is naar een klant;
--   · sporen zijn service-role-only (migratie 165) en verlopen na 30
--     dagen;
--   · uitzetbaar per organisatie in Instellingen > Daan; de classifier
--     checkt de toggle vóór er iets geschreven wordt, en schrijft
--     fail-closed niets zolang deze kolom nog niet bestaat.
--
-- LET OP: nummer 166 vóór het draaien verifiëren tegen schema_migrations.
-- ============================================================

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS daan_leert_uit_email BOOLEAN NOT NULL DEFAULT true;
