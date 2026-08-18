-- ============================================================
-- Migration 168: emails.organisatie_id backfill
--
-- De ingest-paden (fetch-emails, send-email, backfill-emails) zetten
-- organisatie_id historisch niet; de eenmalige backfills van 047/083
-- dekten alleen de rijen van toen. Gevolg (geverifieerd 28 jul 2026):
-- alle recente mailrijen hebben NULL en elke org-brede mailquery, zoals
-- de briefing-lanen van de nachtploeg, matcht stilletjes niets.
--
-- De code stempelt vanaf nu bij ingest; dit haalt de bestaande rijen bij.
-- Idempotent: raakt alleen NULL-rijen.
--
-- LET OP: nummer 168 vóór het draaien verifiëren tegen schema_migrations.
-- ============================================================

UPDATE emails e
SET organisatie_id = p.organisatie_id
FROM profiles p
WHERE e.user_id = p.id
  AND e.organisatie_id IS NULL
  AND p.organisatie_id IS NOT NULL;
