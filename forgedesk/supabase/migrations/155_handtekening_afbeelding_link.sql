-- Migratie 053: klikbare handtekening-afbeelding
--
-- De afbeelding in de e-mailhandtekening kon nergens naartoe wijzen. Met dit
-- veld hangt er een URL achter, zodat de banner in de mail klikbaar wordt.
-- Leeg = geen link, dan blijft het een gewone afbeelding.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS handtekening_afbeelding_link TEXT NOT NULL DEFAULT '';

-- app_settings houdt de org-brede fallback aan, net als de andere
-- handtekeningvelden sinds migratie 091.
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS handtekening_afbeelding_link TEXT DEFAULT '';

COMMENT ON COLUMN profiles.handtekening_afbeelding_link IS
  'URL waar de handtekening-afbeelding naartoe linkt. Leeg = niet klikbaar.';
