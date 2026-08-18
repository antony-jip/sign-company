-- Team-leden lezen mails die aan een project van hun organisatie zijn gekoppeld.
--
-- De `emails`-tabel is user-scoped (mailbox-credentials zijn persoonlijk).
-- Dat klopt voor de inbox-flow. Maar zodra een thread aan een project gekoppeld
-- is, hoort het projectteam de communicatie te kunnen lezen — dat is precies
-- waarom de koppel-feature er is.
--
-- Postgres RLS combineert meerdere SELECT-policies via OR. Deze nieuwe policy
-- staat dus naast de bestaande user_id-policy: een email is leesbaar als (a)
-- je de eigenaar bent, OF (b) hij hangt aan een thread die gekoppeld is aan
-- een project van jouw organisatie. Cross-org reads blijven uitgesloten omdat
-- de check via organisatie_id van de koppeling loopt.

DROP POLICY IF EXISTS "Team-leden zien mails via project-koppeling" ON emails;
CREATE POLICY "Team-leden zien mails via project-koppeling"
  ON emails FOR SELECT
  USING (
    thread_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM email_project_koppelingen epk
      WHERE epk.thread_id = emails.thread_id
        AND epk.organisatie_id IN (
          SELECT organisatie_id FROM profiles WHERE id = auth.uid()
        )
    )
  );
