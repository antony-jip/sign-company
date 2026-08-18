BEGIN;

-- Drop Allow all policy op briefpapier bucket.
-- Users manage own briefpapier policy blijft staan (strikte
-- per-user folder check).
DROP POLICY IF EXISTS "Allow all" ON storage.objects;

COMMIT;
