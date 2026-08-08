BEGIN;

-- ============================================================
-- 169: Per-user mobiel menu
--
-- De mobiele navigatie was hardcoded (lib/navigatie.ts ::
-- MOBIELE_NAV_LABELS). Deze kolom maakt hem instelbaar, per
-- gebruiker, los van de desktop-keuze in sidebar_items — wat je
-- op je telefoon nodig hebt is een andere set dan achter je
-- bureau.
--
-- NULL = nog nooit ingesteld, de UI valt terug op haar default.
-- Een lege array is dus iets anders dan NULL: dat betekent
-- "bewust alles uitgezet".
--
-- Zelfde patroon en dezelfde RLS als sidebar_items (migratie 091):
--   SELECT: organisatie_id = auth_organisatie_id() OR id = auth.uid()
--   UPDATE: id = auth.uid()
-- Geen policy-wijziging nodig.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mobiel_menu_items TEXT[]; -- NULL = gebruik UI-defaults

COMMENT ON COLUMN public.profiles.mobiel_menu_items IS
  'Modules in de mobiele bottom-nav, in volgorde. NULL = UI-default.';

COMMIT;
