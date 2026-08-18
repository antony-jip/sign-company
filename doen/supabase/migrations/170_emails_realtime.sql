BEGIN;

-- ============================================================
-- 170: E-mail realtime
--
-- De mailmodule wachtte op een IMAP-ronde voordat nieuwe mail in
-- beeld kwam: de client riep fetch-emails aan en las Supabase pas
-- opnieuw uit toen die respons binnen was. Op een telefoon zijn
-- dat tientallen seconden. Met deze publication schuift nieuwe
-- mail binnen zodra de rij landt — of die nu door de eigen sync,
-- een tweede apparaat of de cron is weggeschreven.
--
-- Alleen INSERT wordt afgenomen door de client. Dat is bewust:
-- een verse mail komt zonder body binnen (fetch-emails haalt
-- envelope + flags, geen body), dus de payload is een header-rij.
-- De UPDATE die later body_html vult zou wél zwaar zijn en heeft
-- geen abonnee.
--
-- RLS op emails is `user_id = auth.uid()` (migratie 001), en
-- realtime respecteert RLS per socket. Elke gebruiker krijgt dus
-- alleen zijn eigen mail. Geen policy-wijziging nodig.
-- ============================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE emails;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
