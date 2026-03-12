-- ============================================================
-- Migration 026: Project foto's tabel + storage bucket
-- Voer dit uit in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- TABEL: project_fotos
-- ============================================================

CREATE TABLE IF NOT EXISTS project_fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projecten ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  omschrijving TEXT DEFAULT '',
  type TEXT DEFAULT 'situatie',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE project_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project_fotos"
  ON project_fotos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project_fotos"
  ON project_fotos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project_fotos"
  ON project_fotos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project_fotos"
  ON project_fotos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_project_fotos_user_id ON project_fotos(user_id);
CREATE INDEX IF NOT EXISTS idx_project_fotos_project_id ON project_fotos(project_id);

-- ============================================================
-- STORAGE BUCKET: project-fotos
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-fotos',
  'project-fotos',
  true,
  52428800,  -- 50MB max per bestand
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE POLICIES: project-fotos bucket
-- ============================================================

-- Iedereen kan foto's bekijken (public bucket)
CREATE POLICY "Public read project-fotos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-fotos');

-- Ingelogde gebruikers kunnen uploaden
CREATE POLICY "Authenticated users can upload project-fotos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-fotos'
    AND auth.role() = 'authenticated'
  );

-- Gebruikers kunnen eigen foto's updaten
CREATE POLICY "Users can update own project-fotos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-fotos'
    AND auth.role() = 'authenticated'
  );

-- Gebruikers kunnen eigen foto's verwijderen
CREATE POLICY "Users can delete own project-fotos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-fotos'
    AND auth.role() = 'authenticated'
  );
