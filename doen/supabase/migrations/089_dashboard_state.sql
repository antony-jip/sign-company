BEGIN;

-- Aan-de-slag-sectie op het dashboard kan permanent worden weggeklikt
-- door de gebruiker (X-knop). Bestaande users (waarvoor de kolom NULL
-- zou worden bij ALTER zonder default) krijgen expliciet false.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_aan_de_slag_verborgen BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.dashboard_aan_de_slag_verborgen IS
  'User heeft de Aan-de-slag-sectie op het dashboard expliciet weggeklikt.';

COMMIT;
