-- 065: Onboarding trigger timestamp voor dedup/retry
ALTER TABLE organisaties
  ADD COLUMN IF NOT EXISTS onboarding_getriggerd_op TIMESTAMPTZ DEFAULT NULL;
