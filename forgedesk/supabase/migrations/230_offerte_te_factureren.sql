BEGIN;

-- ============================================================
-- 230: een losse offerte op "te factureren" kunnen zetten
--
-- Wat dit toevoegt:
--   · offertes.te_factureren (boolean, default false)
--   · offertes.te_factureren_op (timestamptz, wanneer de vlag gezet is)
--
-- Waarom een eigen vlag en geen nieuwe status:
--   De tab Te factureren in Facturen toont nu projecten met status
--   'te-factureren'. Zit er meer dan één offerte in een project, dan is dat te
--   grof: je wilt er één van kunnen factureren en de rest laten staan. De
--   status van de offerte zelf blijft waar hij voor bedoeld is (concept,
--   verzonden, goedgekeurd), dus die kunnen we hier niet voor lenen zonder elke
--   statuskleur, filter en badge in de app te raken.
--
-- Wat dit NIET doet, bewust:
--   · geen DROP, geen DELETE, geen wijziging aan een bestaande kolom
--   · geen rijen aanraken: alle bestaande offertes komen op false te staan en
--     verschijnen dus nergens
--   · niets aan projecten.status, dus de bestaande projectenlijst in die tab
--     blijft precies zoals hij is
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- Veilig om opnieuw te draaien (idempotent).
-- ============================================================

ALTER TABLE public.offertes
  ADD COLUMN IF NOT EXISTS te_factureren BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.offertes
  ADD COLUMN IF NOT EXISTS te_factureren_op TIMESTAMPTZ;

-- De lijst vraagt om de openstaande vlaggen per organisatie. Partieel, want
-- alleen de gevlagde rijen worden ooit opgevraagd en dat zijn er een handvol.
CREATE INDEX IF NOT EXISTS idx_offertes_te_factureren
  ON public.offertes(organisatie_id, te_factureren_op)
  WHERE te_factureren;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- VERIFICATIE — draai dit na de migratie
-- ============================================================
--
-- 1. De kolommen bestaan en staan overal uit (tweede getal moet 0 zijn):
--      SELECT COUNT(*) AS offertes,
--             COUNT(*) FILTER (WHERE te_factureren) AS gevlagd
--        FROM public.offertes;
--
-- 2. De index staat er (verwacht: 1 rij):
--      SELECT indexname FROM pg_indexes
--       WHERE tablename = 'offertes' AND indexname = 'idx_offertes_te_factureren';

INSERT INTO doen_migraties (bestand) VALUES ('230_offerte_te_factureren.sql') ON CONFLICT DO NOTHING;
