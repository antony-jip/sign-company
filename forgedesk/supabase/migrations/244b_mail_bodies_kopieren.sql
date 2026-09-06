-- Mailteksten overzetten naar email_bodies, in blokken van 2000.
--
-- Hoort bij migratie 244. Bewust geen onderdeel daarvan: 24.000 mails in één
-- transactie is honderden MB en loopt in de SQL-editor in een time-out.
--
-- GEBRUIK: draai dit bestand net zo vaak tot de uitvoer 0 is. Elke ronde
-- verplaatst maximaal 2000 mails en duurt een paar seconden. Tussendoor stoppen
-- mag: de app leest wat nog niet is overgezet gewoon uit de oude kolom.
--
-- Veilig om opnieuw te draaien.

DO $$
DECLARE
  verplaatst integer;
BEGIN
  WITH blok AS (
    SELECT id, user_id, body_html, body_text
    FROM emails
    WHERE body_html IS NOT NULL
    LIMIT 2000
  ), ingevoegd AS (
    INSERT INTO email_bodies (email_id, user_id, body_html, body_text)
    SELECT id, user_id, body_html, body_text FROM blok
    ON CONFLICT (email_id) DO NOTHING
    RETURNING email_id
  )
  UPDATE emails e
     SET body_html = NULL
    FROM blok b
   WHERE e.id = b.id;

  GET DIAGNOSTICS verplaatst = ROW_COUNT;
  RAISE NOTICE 'Overgezet in deze ronde: %', verplaatst;
  RAISE NOTICE 'Nog te doen: %', (SELECT count(*) FROM emails WHERE body_html IS NOT NULL);
END $$;

-- Klaar als "Nog te doen" 0 is. Daarna één keer:
--   INSERT INTO doen_migraties (bestand) VALUES ('244b_mail_bodies_kopieren.sql') ON CONFLICT DO NOTHING;
