-- ============ DOCUMENT STYLES / HUISSTIJL ============
-- Stores per-user document styling preferences for PDFs (offertes, facturen, etc.)

CREATE TABLE IF NOT EXISTS document_styles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Template basis
  template text NOT NULL DEFAULT 'klassiek',
  -- Lettertypen
  heading_font text NOT NULL DEFAULT 'Montserrat',
  body_font text NOT NULL DEFAULT 'Open Sans',
  font_grootte_basis integer NOT NULL DEFAULT 10,
  -- Kleuren
  primaire_kleur text NOT NULL DEFAULT '#29417a',
  secundaire_kleur text NOT NULL DEFAULT '#7c3aed',
  accent_kleur text NOT NULL DEFAULT '#f59e0b',
  tekst_kleur text NOT NULL DEFAULT '#1f2937',
  -- Marges (in mm)
  marge_boven integer NOT NULL DEFAULT 15,
  marge_onder integer NOT NULL DEFAULT 20,
  marge_links integer NOT NULL DEFAULT 20,
  marge_rechts integer NOT NULL DEFAULT 20,
  -- Logo
  logo_positie text NOT NULL DEFAULT 'links',
  logo_grootte integer NOT NULL DEFAULT 100,
  -- Briefpapier
  briefpapier_url text DEFAULT '',
  briefpapier_modus text NOT NULL DEFAULT 'geen',
  -- Header / Footer
  toon_header boolean NOT NULL DEFAULT true,
  toon_footer boolean NOT NULL DEFAULT true,
  footer_tekst text DEFAULT '',
  -- Tabel styling
  tabel_stijl text NOT NULL DEFAULT 'striped',
  tabel_header_kleur text NOT NULL DEFAULT '#29417a',
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- One style per user
  UNIQUE(user_id)
);

-- RLS policies
ALTER TABLE document_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document styles" ON document_styles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document styles" ON document_styles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own document styles" ON document_styles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own document styles" ON document_styles
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for briefpapier uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('briefpapier', 'briefpapier', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for briefpapier bucket
CREATE POLICY "Users can upload briefpapier" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'briefpapier' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own briefpapier" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'briefpapier' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own briefpapier" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'briefpapier' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
