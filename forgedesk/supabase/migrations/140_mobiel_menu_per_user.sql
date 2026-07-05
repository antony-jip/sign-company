BEGIN;

-- ============================================================
-- 140: Eigen mobiel menu per user
--
-- Op mobiel was de nav-set hardcoded (Projecten, Email, Maatjes).
-- Deze kolom laat elke user zelf kiezen welke modules in zijn
-- mobiele menu staan, los van de desktop-keuze (sidebar_items).
--
-- NULL = gebruik de standaard mobiele set (Projecten, Email, Maatjes),
-- zodat bestaande users niets zien veranderen tot ze het aanpassen.
--
-- Per-user op profiles, zelfde patroon als sidebar_items (migratie 091).
-- Profile-RLS reeds aanwezig; geen policy-wijziging nodig.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mobile_nav_items TEXT[]; -- NULL = standaard mobiele set

COMMIT;
