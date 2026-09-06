-- Tweede postvak activeren. PAS DRAAIEN als branch mail-outlook live staat
-- (code die account_id gebruikt) én de eerste gebruiker een tweede postvak
-- wil koppelen. Tot die tijd zijn de oude unieke sleutels op user_id
-- ongevaarlijk en houden ze de oude code werkend.
--
-- Wat er weggaat: user_email_settings UNIQUE (user_id) uit migratie 037,
-- emails UNIQUE (user_id, message_id) uit 038 en email_sync_state
-- UNIQUE (user_id, folder) uit 131. De vervangers op account_id staan in 245.

BEGIN;

ALTER TABLE user_email_settings DROP CONSTRAINT IF EXISTS user_email_settings_user_id_key;
CREATE INDEX IF NOT EXISTS idx_user_email_settings_user ON user_email_settings (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_email_settings_standaard ON user_email_settings (user_id) WHERE is_standaard;

-- Naam uit migratie 038 (constraint), met de oudere indexnaam uit 031 als vangnet.
ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_user_message_id_unique;
DROP INDEX IF EXISTS emails_user_message_id_unique;

ALTER TABLE email_sync_state DROP CONSTRAINT IF EXISTS email_sync_state_user_id_folder_key;

-- Rijen zonder account_id (ouder dan 245) hangen we aan het standaardpostvak.
UPDATE emails e SET account_id = s.id
FROM user_email_settings s WHERE s.user_id = e.user_id AND s.is_standaard AND e.account_id IS NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('246_mail_tweede_postvak_activeren.sql') ON CONFLICT DO NOTHING;
