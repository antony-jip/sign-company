-- Tweede postvak activeren. PAS DRAAIEN als branch mail-outlook live staat
-- (code die account_id gebruikt) én de eerste gebruiker een tweede postvak
-- wil koppelen. Tot die tijd zijn de oude unieke sleutels op user_id
-- ongevaarlijk en houden ze de oude code werkend.
--
-- Wat er weggaat: user_email_settings UNIQUE (user_id) uit migratie 037,
-- emails UNIQUE (user_id, message_id) uit 038 en email_sync_state
-- UNIQUE (user_id, folder) uit 131. De vervangers op account_id staan in 245.
--
-- OPEN PUNT VOOR DEZE MIGRATIE DRAAIT.
-- Zolang emails_user_message_id_unique bestaat, vangt die een postvak dat
-- ontkoppeld en opnieuw gekoppeld wordt op. Daarna niet meer: ontkoppelen zet
-- emails.account_id op NULL (FK ON DELETE SET NULL in 245), opnieuw koppelen
-- levert een nieuw account_id op, en dan haalt de sync de hele mailbox binnen
-- als een tweede set rijen. Bij 24.000 mails is dat 24.000 dubbelen zonder
-- herstelknop in de app. Los dat eerst op (ontkoppelen als soft-delete, zodat
-- opnieuw koppelen hetzelfde postvak-id terugkrijgt) en draai deze migratie
-- pas daarna.
--
-- Ook eerst nodig: het postvak-formulier moet weigeren op te slaan zonder te
-- weten wélk postvak het bijwerkt. Zonder die poort valt schrijfPostvak na deze
-- migratie terug op een update op user_id en krijgen álle postvakken hetzelfde
-- adres. (Die poort zit sinds deze branch in api/email-settings.ts; controleer
-- dat die live staat.)

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
