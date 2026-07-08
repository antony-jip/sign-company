-- ============================================================
-- 149: Opt-in toggle voor automatische betalingsherinneringen
--
-- Gebruikt door src/trigger/factuur-herinnering.ts (cron 09:30) en de
-- Instellingen > Communicatie > Factuur-opvolging tab. Default UIT:
-- er verandert niets zolang een organisatie de toggle niet aanzet.
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- ============================================================

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS factuur_opvolging_automatisch boolean DEFAULT false;
