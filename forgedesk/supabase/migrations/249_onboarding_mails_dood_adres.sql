-- Twee onboarding-mails verwijzen naar een postbus die niemand leest.
--
-- `hello@doen.team` wordt niet gelezen; alle hulpvragen lopen via het
-- contactformulier (zie src/lib/contact.ts). De code-terugvallen in
-- src/trigger/utils/templates.ts zeggen dat allang goed, maar de rijen in de
-- database komen nog uit migratie 103 en die winnen. Dat zijn precies de mails
-- die een nieuwe gebruiker op dag 3 en dag 7 krijgt: het moment waarop hij een
-- vraag heeft.
--
-- Alleen rijen aanpassen die de oude tekst nog letterlijk bevatten, zodat een
-- zelf bijgewerkte template niet overschreven wordt.
--
-- Veilig om opnieuw te draaien. Raakt geen drukke tabel.

BEGIN;
SET LOCAL lock_timeout = '4s';
SET LOCAL statement_timeout = '60s';

UPDATE email_templates
   SET body = REPLACE(body, 'Vragen? Mail ons op hello@doen.team.', 'Vragen? Stel ze via doen.team/contact.')
 WHERE body LIKE '%hello@doen.team%';

UPDATE email_templates
   SET body = REPLACE(body, 'hello@doen.team', 'doen.team/contact')
 WHERE body LIKE '%hello@doen.team%';

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('249_onboarding_mails_dood_adres.sql') ON CONFLICT DO NOTHING;
