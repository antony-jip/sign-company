-- ============================================================
-- 152: seo_kansen — status-geheugen voor de SEO-kansen op /admin
--
-- Het dashboard op signcompany.nl/admin rekent z'n kansen elke keer
-- vers uit Google Search Console. Dat is stateless: een kans die je
-- gister hebt opgelost blijft staan, want GSC kijkt terug en de
-- vertoningen/CTR van de afgelopen 30 dagen zijn historie. Een
-- titel-fix zie je pas na weken terug in de cijfers.
--
-- Deze tabel geeft die kansen een geheugen: afgevinkt, voor het eerst
-- gezien, en of de fix achteraf gewerkt heeft.
--
-- Levenscyclus van status:
--   open     — kans staat in de lijst
--   gedaan   — jij hebt 'm afgevinkt; verborgen, klok loopt (28 dagen)
--   gelukt   — na 28 dagen wég uit GSC: de fix heeft gewerkt
--   heropend — na 28 dagen nog stééds in GSC: de fix werkte niet
--
-- Alleen de ochtend-cron (/api/kansen-cron) en de gedaan-knop
-- (/api/kans-status) op het website-project schrijven hier, via de
-- service-role key die RLS bypasst. In de app is alles org-scoped.
-- ============================================================

CREATE TABLE IF NOT EXISTS seo_kansen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL,

  -- Identiteit van de kans. sleutel = soort|zoekterm|pagina, stabiel over
  -- periodes heen: afvinken in de 30d-weergave geldt ook in 90d.
  sleutel TEXT NOT NULL,
  soort TEXT NOT NULL CHECK (soort IN ('lage_ctr', 'bijna_pagina1', 'kannibalisatie', 'duplicaat')),
  zoekterm TEXT NOT NULL,
  -- Bij kannibalisatie/dubbele URL's gaat het om een set pagina's; die staat
  -- hier als gesorteerde, met " | " samengevoegde lijst — dezelfde vorm die
  -- ook in de sleutel zit. Verandert de set, dan is het een nieuwe situatie.
  pagina TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'gedaan', 'heropend', 'gelukt')),

  -- Voor de "Nieuw"-badge: gezet door de cron bij de eerste waarneming.
  eerst_gezien_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  laatst_gezien_op TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Momentopname bij het afvinken ({positie, ctrPct, impressies}), zodat we
  -- bij een heropening kunnen laten zien of er überhaupt iets bewogen is.
  gedaan_op TIMESTAMPTZ,
  gedaan_metriek JSONB,

  gelukt_op TIMESTAMPTZ,
  heropend_op TIMESTAMPTZ,
  heropend_reden TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisatie_id, sleutel)
);

ALTER TABLE seo_kansen ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'seo_kansen' AND policyname = 'Org members manage seo_kansen'
  ) THEN
    CREATE POLICY "Org members manage seo_kansen" ON seo_kansen
      FOR ALL USING (organisatie_id = auth_organisatie_id())
      WITH CHECK (organisatie_id = auth_organisatie_id());
  END IF;
END $$;

-- Het dashboard haalt per load alle niet-afgeronde kansen van één org op.
CREATE INDEX IF NOT EXISTS idx_seo_kansen_org_status
  ON seo_kansen(organisatie_id, status, laatst_gezien_op DESC);

-- De cron zoekt gedane kansen waarvan de 28-dagen-klok is afgelopen.
CREATE INDEX IF NOT EXISTS idx_seo_kansen_gedaan_klok
  ON seo_kansen(organisatie_id, gedaan_op)
  WHERE status = 'gedaan';
