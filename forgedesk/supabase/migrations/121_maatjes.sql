-- ============================================================
-- Migration 121: maatjes — foto's met annotaties (org-breed)
-- Voer dit uit in Supabase SQL Editor.
--
-- Nummering: hoogste bestaande migratie is 120 (lokaal en op main).
-- Het historische 093/094-conflict ligt ruim achter ons; 121 is vrij.
--
-- Een maatje is een buitendienst-foto met opgetekende maten/pijlen/tekst.
-- Twee artefacten per maatje:
--   - foto_origineel_url : gecomprimeerde originele foto (los)
--   - foto_render_url    : platgeslagen render (foto + annotaties)
-- De annotatie-laag staat als JSON in annotaties (bewerkbaar; bij save
-- wordt de render opnieuw gemaakt). Coordinaten zijn genormaliseerd (0..1).
--
-- Data-isolatie: org-breed. RLS op organisatie_id volgens migratie-048
-- pattern (auth_organisatie_id()). Nooit user_id voor filtering.
-- ============================================================

-- ============================================================
-- TABEL: maatjes
-- ============================================================

CREATE TABLE IF NOT EXISTS maatjes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  titel TEXT,
  foto_origineel_url TEXT NOT NULL,
  foto_render_url TEXT,
  annotaties JSONB NOT NULL DEFAULT '[]'::jsonb,
  aangemaakt_door UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- Dekt zowel het kladblok (organisatie_id, project_id IS NULL) als de
-- project-tab (organisatie_id, project_id), nieuwste eerst.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_maatjes_org_project
  ON maatjes (organisatie_id, project_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY — org-breed (migratie-048 pattern)
-- FOR ALL USING (...) dekt SELECT/INSERT/UPDATE/DELETE; bij ontbrekende
-- WITH CHECK gebruikt Postgres dezelfde expressie voor INSERT/UPDATE.
-- ============================================================

ALTER TABLE maatjes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage maatjes" ON maatjes;
CREATE POLICY "Org members manage maatjes" ON maatjes
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- ============================================================
-- updated_at trigger (hergebruikt bestaande functie)
-- ============================================================

DROP TRIGGER IF EXISTS update_maatjes_updated_at ON maatjes;
CREATE TRIGGER update_maatjes_updated_at
  BEFORE UPDATE ON maatjes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STORAGE BUCKET: maatjes (niet-publiek)
--
-- Client comprimeert beide artefacten naar JPEG/WebP vooraf, dus de
-- bucket accepteert geen HEIC. 10MB limit is ruim; doel is 300-600 KB.
-- Pad-patroon: {organisatie_id}/{maatje_id}/origineel.jpg | render.jpg
-- Weergave gebeurt via signed URLs (bucket is private).
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maatjes',
  'maatjes',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/webp', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Org-scoped storage policies: eerste folder in het pad = organisatie_id.
-- Spiegelt de tabel-RLS, zodat losse maatjes (zonder project) ook werken.

DROP POLICY IF EXISTS "Org members upload maatje afbeeldingen" ON storage.objects;
CREATE POLICY "Org members upload maatje afbeeldingen"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'maatjes'
    AND (storage.foldername(name))[1] = auth_organisatie_id()::text
  );

DROP POLICY IF EXISTS "Org members read maatje afbeeldingen" ON storage.objects;
CREATE POLICY "Org members read maatje afbeeldingen"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'maatjes'
    AND (storage.foldername(name))[1] = auth_organisatie_id()::text
  );

DROP POLICY IF EXISTS "Org members update maatje afbeeldingen" ON storage.objects;
CREATE POLICY "Org members update maatje afbeeldingen"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'maatjes'
    AND (storage.foldername(name))[1] = auth_organisatie_id()::text
  );

DROP POLICY IF EXISTS "Org members delete maatje afbeeldingen" ON storage.objects;
CREATE POLICY "Org members delete maatje afbeeldingen"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'maatjes'
    AND (storage.foldername(name))[1] = auth_organisatie_id()::text
  );
