-- ============================================================
-- 028: project_fotos tabel + storage bucket voor projectfoto's
-- Fix: foto upload vanuit projectenlijst werkt niet
-- ============================================================

-- Project fotos tabel
CREATE TABLE IF NOT EXISTS project_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID NOT NULL,
  url TEXT NOT NULL,
  omschrijving TEXT DEFAULT '',
  type TEXT DEFAULT 'situatie',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE project_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project fotos" ON project_fotos
  FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_project_fotos_project ON project_fotos(project_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-fotos', 'project-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users upload project fotos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-fotos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Public read project fotos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-fotos'
  );

CREATE POLICY "Users delete own project fotos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-fotos'
    AND auth.uid() IS NOT NULL
  );
