-- ============================================================
-- 032: Rate limits tabel + portaal database indexes
-- ============================================================

-- Rate limits tabel (vervangt in-memory Maps in serverless functies)
CREATE TABLE IF NOT EXISTS rate_limits (
  id text PRIMARY KEY,            -- 'endpoint:ip'
  count integer DEFAULT 1,
  reset_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);

-- Database functie voor atomic rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key text,
  p_max_count integer,
  p_window_seconds integer
) RETURNS boolean AS $$
DECLARE
  v_now timestamptz := now();
  v_reset timestamptz := v_now + (p_window_seconds || ' seconds')::interval;
  v_count integer;
BEGIN
  -- Verwijder verlopen entries (1% kans per aanroep)
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE reset_at < v_now;
  END IF;

  -- Atomic upsert: als verlopen of nieuw → reset, anders increment
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
$$ LANGUAGE plpgsql;

-- ============================================================
-- Portaal indexes voor snelle queries bij 100+ gebruikers
-- ============================================================

-- Voor usePortaalHerinnering: items per user + status + datum
CREATE INDEX IF NOT EXISTS idx_portaal_items_user_status
  ON portaal_items(user_id, status, created_at DESC);

-- Voor portaal-get: items per portaal die zichtbaar zijn
CREATE INDEX IF NOT EXISTS idx_portaal_items_portaal_zichtbaar
  ON portaal_items(portaal_id, zichtbaar_voor_klant);

-- Voor reacties lookup per item
CREATE INDEX IF NOT EXISTS idx_portaal_reacties_item
  ON portaal_reacties(portaal_item_id);

-- Voor bestanden lookup per item
CREATE INDEX IF NOT EXISTS idx_portaal_bestanden_item
  ON portaal_bestanden(portaal_item_id);
