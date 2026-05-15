-- Communicatie-tab instellingen op app_settings.
-- onboarding_dag_offsets / trial_reminder_offsets vervangen de hardcoded
-- wait.for({days:2/4}) in trigger/onboarding-sequence.ts en de hardcoded
-- 5/2/0-array in trigger/trial-reminder.ts.
-- doen_communicatie_tab_enabled is de feature flag voor de nieuwe
-- supertab; default false zodat fase 4 hem per-org kan activeren.
-- Bestaande org-scoped RLS op app_settings dekt deze kolommen automatisch.

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS onboarding_dag_offsets int[] NOT NULL DEFAULT '{3,7}';

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS trial_reminder_offsets int[] NOT NULL DEFAULT '{5,2,0}';

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS doen_communicatie_tab_enabled boolean NOT NULL DEFAULT false;
