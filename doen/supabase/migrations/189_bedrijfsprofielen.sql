BEGIN;

-- ============================================================
-- 189: Bedrijfsprofielen — een offerte onder een tweede bedrijf uitgeven
--
-- Wat dit toevoegt:
--   · tabel bedrijfsprofielen (org-scoped): bedrijfsgegevens + eigen briefpapier
--   · kolom offertes.bedrijfsprofiel_id (leeg = het bestaande, standaard bedrijf)
--
-- Wat dit NIET doet, bewust:
--   · geen DROP, geen DELETE, geen wijziging aan een bestaande kolom
--   · geen rijen aanraken — er wordt niets gebackfild
--   · document_styles blijft ongemoeid, inclusief de unique index uit 094.
--     Lettertypen, kleuren, marges en tabelstijl blijven dus gedeeld; alleen
--     de identiteit en het papier wisselen mee. Zou het briefpapier van het
--     tweede bedrijf hier als extra document_styles-rij landen, dan moest die
--     index om, en dat is precies het soort ingreep dat we hier vermijden.
--
-- Leeg bedrijfsprofiel_id blijft de normale situatie: de PDF valt dan terug op
-- de bedrijfsgegevens uit profiles, exact zoals vandaag. Bestaande offertes
-- veranderen dus niet, ook niet als je ze over een jaar opnieuw opent.
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- Veilig om opnieuw te draaien (idempotent).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bedrijfsprofielen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,

  -- Interne naam in de keuzelijst ("Sign Company", "Handelsnaam BV").
  label TEXT NOT NULL,

  -- Bedrijfsgegevens. Zelfde velden als op profiles, zodat de PDF-service ze
  -- één op één kan gebruiken zonder vertaalslag.
  bedrijfsnaam TEXT NOT NULL DEFAULT '',
  bedrijfs_adres TEXT NOT NULL DEFAULT '',
  bedrijfs_telefoon TEXT,
  bedrijfs_email TEXT,
  bedrijfs_website TEXT,
  kvk_nummer TEXT NOT NULL DEFAULT '',
  btw_nummer TEXT NOT NULL DEFAULT '',
  iban TEXT,
  logo_url TEXT,

  -- Eigen briefpapier. Zelfde vorm en zelfde storage-bucket als de velden op
  -- document_styles, zodat addBriefpapierBackground() ze zonder aanpassing leest.
  briefpapier_url TEXT NOT NULL DEFAULT '',
  vervolgpapier_url TEXT NOT NULL DEFAULT '',
  briefpapier_modus TEXT NOT NULL DEFAULT 'geen'
    CHECK (briefpapier_modus IN ('geen', 'achtergrond', 'alleen_eerste_pagina', 'eerste_en_vervolg')),
  briefpapier_toon_branding BOOLEAN NOT NULL DEFAULT false,

  -- Ander papier betekent bijna altijd een andere vrije zone boven en onder.
  -- Zonder eigen safe zones zou de inhoud over de kop van het tweede briefpapier
  -- heen lopen.
  briefpapier_safe_zone_boven NUMERIC,
  briefpapier_safe_zone_onder NUMERIC,
  briefpapier_safe_zone_links NUMERIC,
  briefpapier_safe_zone_rechts NUMERIC,

  actief BOOLEAN NOT NULL DEFAULT true,
  volgorde INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT bedrijfsprofielen_label_per_org_uniek UNIQUE (organisatie_id, label)
);

CREATE INDEX IF NOT EXISTS idx_bedrijfsprofielen_organisatie
  ON public.bedrijfsprofielen(organisatie_id);

ALTER TABLE public.bedrijfsprofielen ENABLE ROW LEVEL SECURITY;

-- Org-scoped, alle vier de operaties afgedekt (patroon uit migratie 048).
DROP POLICY IF EXISTS "Org members select bedrijfsprofielen" ON public.bedrijfsprofielen;
DROP POLICY IF EXISTS "Org members insert bedrijfsprofielen" ON public.bedrijfsprofielen;
DROP POLICY IF EXISTS "Org members update bedrijfsprofielen" ON public.bedrijfsprofielen;
DROP POLICY IF EXISTS "Org members delete bedrijfsprofielen" ON public.bedrijfsprofielen;

CREATE POLICY "Org members select bedrijfsprofielen" ON public.bedrijfsprofielen
  FOR SELECT USING (organisatie_id = auth_organisatie_id());
CREATE POLICY "Org members insert bedrijfsprofielen" ON public.bedrijfsprofielen
  FOR INSERT WITH CHECK (organisatie_id = auth_organisatie_id());
CREATE POLICY "Org members update bedrijfsprofielen" ON public.bedrijfsprofielen
  FOR UPDATE USING (organisatie_id = auth_organisatie_id());
CREATE POLICY "Org members delete bedrijfsprofielen" ON public.bedrijfsprofielen
  FOR DELETE USING (organisatie_id = auth_organisatie_id());

-- De keuze wordt op de offerte zelf vastgelegd, niet afgeleid van een
-- instelling. PDF's worden namelijk elke keer opnieuw gegenereerd: zonder deze
-- kolom zou een oude offerte het briefpapier van je andere bedrijf krijgen
-- zodra je hem opnieuw opent.
--
-- ON DELETE SET NULL: verwijder je een bedrijfsprofiel, dan valt de offerte
-- terug op de standaard in plaats van dat de rij verdwijnt.
ALTER TABLE public.offertes
  ADD COLUMN IF NOT EXISTS bedrijfsprofiel_id UUID
  REFERENCES public.bedrijfsprofielen(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- VERIFICATIE — draai dit na de migratie
-- ============================================================
--
-- 1. Tabel bestaat en is leeg (moet 0 geven):
--      SELECT COUNT(*) FROM public.bedrijfsprofielen;
--
-- 2. Kolom staat op offertes en is overal leeg (beide moeten gelijk zijn):
--      SELECT COUNT(*) AS offertes,
--             COUNT(*) FILTER (WHERE bedrijfsprofiel_id IS NULL) AS zonder_keuze
--        FROM public.offertes;
--
-- 3. RLS staat aan met vier policies (moet 4 rijen geven):
--      SELECT policyname, cmd FROM pg_policies
--       WHERE tablename = 'bedrijfsprofielen' ORDER BY cmd;
--
-- 4. document_styles is niet aangeraakt (moet nog steeds 1 index geven):
--      SELECT indexname FROM pg_indexes
--       WHERE tablename = 'document_styles' AND indexname LIKE 'uniq_%';
--
-- Terugdraaien kan met 189_bedrijfsprofielen_TERUGDRAAIEN.sql.
