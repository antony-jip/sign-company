-- 215: BCC-adres op betalingsherinneringen
--
-- Per organisatie een optioneel kopie-adres (BCC) voor elke herinnerings-
-- en aanmaningsmail, zodat de eigen administratie meekijkt met wat er
-- daadwerkelijk naar klanten gaat. Geldt voor de automatische cron en de
-- handmatige verzending; leeg = geen kopie.

BEGIN;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS herinnering_bcc_adres text;

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('215_herinnering_bcc.sql') ON CONFLICT DO NOTHING;
