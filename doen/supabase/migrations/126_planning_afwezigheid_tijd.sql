-- ============================================================
-- Migration 126: planning_afwezigheid — dagdeel / tijd
-- Voer dit uit in Supabase SQL Editor.
--
-- Voegt optionele start/eind-tijd toe zodat een afwezigheid ook maar een
-- dagdeel kan beslaan (bv. tandarts 09:00–11:00). NULL = hele dag.
-- ============================================================

ALTER TABLE planning_afwezigheid ADD COLUMN IF NOT EXISTS start_tijd TEXT;  -- HH:mm, NULL = hele dag
ALTER TABLE planning_afwezigheid ADD COLUMN IF NOT EXISTS eind_tijd TEXT;   -- HH:mm, NULL = hele dag
