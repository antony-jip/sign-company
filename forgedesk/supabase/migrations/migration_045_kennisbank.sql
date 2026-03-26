-- ============================================================
-- 045_kennisbank.sql
-- Kennisbank: categorieen + artikelen
-- ============================================================

-- 1. Categories
CREATE TABLE IF NOT EXISTS kb_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organisatie_id UUID,
  naam TEXT NOT NULL,
  beschrijving TEXT,
  kleur TEXT DEFAULT '#1A535C',
  icoon TEXT DEFAULT 'BookOpen',
  volgorde INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Org members manage kb_categories" ON kb_categories
    FOR ALL USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_kb_categories_org ON kb_categories(organisatie_id);

-- 2. Articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organisatie_id UUID,
  category_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  titel TEXT NOT NULL,
  inhoud TEXT NOT NULL DEFAULT '',
  bijlagen JSONB DEFAULT '[]'::jsonb,
  zoek_tags TEXT[] DEFAULT '{}',
  gepubliceerd BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Org members manage kb_articles" ON kb_articles
    FOR ALL USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_kb_articles_org ON kb_articles(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category_id);
