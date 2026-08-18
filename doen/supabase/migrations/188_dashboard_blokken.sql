BEGIN;

-- ============================================================
-- 188: Per-user dashboardblokken
--
-- Het dashboard toonde iedereen hetzelfde: omzet-KPI's, de
-- Daan-briefing, offertes om op te volgen. Wie alleen montages
-- draait scrolt daar elke ochtend langs. Deze kolom laat elke
-- gebruiker zelf kiezen welke blokken hij ziet.
--
-- Het is een weergavekeuze, geen rechten: alles blijft
-- bereikbaar via de modules zelf, precies zoals sidebar_items
-- niets afschermt maar alleen opruimt.
--
-- NULL = nog nooit ingesteld, de UI toont alles. Een lege array
-- betekent dus iets anders: bewust alles uitgezet.
--
-- Zelfde patroon en dezelfde RLS als sidebar_items (091) en
-- mobiel_menu_items (169):
--   SELECT: organisatie_id = auth_organisatie_id() OR id = auth.uid()
--   UPDATE: id = auth.uid()
-- Geen policy-wijziging nodig.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_blokken TEXT[]; -- NULL = toon alles

COMMENT ON COLUMN public.profiles.dashboard_blokken IS
  'Zichtbare blokken op het dashboard. NULL = UI-default (alles).';

COMMIT;
