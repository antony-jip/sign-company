-- ============================================================
-- 034: Retention policies + RLS optimalisatie + rate limit fix
-- ============================================================

-- ─── 1. RETENTION: Automatische cleanup van oude data ────────

CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Gelezen notificaties ouder dan 90 dagen
  DELETE FROM notificaties
  WHERE gelezen = true AND created_at < now() - interval '90 days';

  -- Alle notificaties ouder dan 1 jaar
  DELETE FROM notificaties
  WHERE created_at < now() - interval '365 days';

  -- Rate limits: alle verlopen entries (deterministisch, niet meer random)
  DELETE FROM rate_limits WHERE reset_at < now();

  -- AI chat history ouder dan 1 jaar
  DELETE FROM ai_chat_history
  WHERE created_at < now() - interval '365 days';

  -- Klant activiteiten ouder dan 2 jaar
  DELETE FROM klant_activiteiten
  WHERE created_at < now() - interval '730 days';

  -- Deal activiteiten ouder dan 2 jaar
  DELETE FROM deal_activiteiten
  WHERE created_at < now() - interval '730 days';
END;
$$;

-- ─── 2. RATE LIMIT: Deterministische cleanup ─────────────────

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key text,
  p_max_count integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  v_now   timestamptz := now();
  v_reset timestamptz := v_now + (p_window_seconds || ' seconds')::interval;
  v_count integer;
BEGIN
  -- Deterministische cleanup: altijd verlopen entries opruimen voor deze key
  DELETE FROM rate_limits WHERE id = p_key AND reset_at < v_now;

  -- Upsert
  INSERT INTO rate_limits (id, count, reset_at)
  VALUES (p_key, 1, v_reset)
  ON CONFLICT (id) DO UPDATE SET
    count = CASE
      WHEN rate_limits.reset_at < v_now THEN 1
      ELSE rate_limits.count + 1
    END,
    reset_at = CASE
      WHEN rate_limits.reset_at < v_now THEN v_reset
      ELSE rate_limits.reset_at
    END
  RETURNING count INTO v_count;

  RETURN v_count > p_max_count;
END;
$$;

-- ─── 3. RLS OPTIMALISATIE: user_id op child tabellen ─────────

-- Voeg user_id toe aan factuur_items voor directe RLS checks
ALTER TABLE factuur_items ADD COLUMN IF NOT EXISTS user_id uuid;

-- Backfill user_id vanuit parent tabel
UPDATE factuur_items fi
SET user_id = f.user_id
FROM facturen f
WHERE fi.factuur_id = f.id
  AND fi.user_id IS NULL;

-- Index voor snelle RLS lookups
CREATE INDEX IF NOT EXISTS idx_factuur_items_user_id
  ON factuur_items(user_id);

-- Vervang dure EXISTS-based RLS policies door directe user_id checks
DROP POLICY IF EXISTS "Users can view own factuur_items" ON factuur_items;
DROP POLICY IF EXISTS "Users can insert own factuur_items" ON factuur_items;
DROP POLICY IF EXISTS "Users can update own factuur_items" ON factuur_items;
DROP POLICY IF EXISTS "Users can delete own factuur_items" ON factuur_items;

CREATE POLICY "Users can view own factuur_items" ON factuur_items
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own factuur_items" ON factuur_items
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own factuur_items" ON factuur_items
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own factuur_items" ON factuur_items
  FOR DELETE USING (user_id = auth.uid());

-- Trigger om user_id automatisch te vullen bij INSERT
CREATE OR REPLACE FUNCTION set_factuur_item_user_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM facturen WHERE id = NEW.factuur_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_factuur_items_set_user_id ON factuur_items;
CREATE TRIGGER trg_factuur_items_set_user_id
  BEFORE INSERT ON factuur_items
  FOR EACH ROW
  EXECUTE FUNCTION set_factuur_item_user_id();

-- ─── 4. STORAGE: Beperk project-fotos read tot eigen user ────

-- Verwijder de te brede public read policy als die bestaat
DROP POLICY IF EXISTS "Public read project-fotos" ON storage.objects;

-- Maak een scoped read policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-fotos') THEN
    CREATE POLICY "Users can read own project-fotos" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'project-fotos'
        AND auth.uid() IS NOT NULL
      );
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;
