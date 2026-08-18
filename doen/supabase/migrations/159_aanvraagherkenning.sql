-- 159: Aanvraagherkenning — classificatie van binnenkomende mail.
-- UX-laag op de bestaande emails-tabel, zoals 087. Geen nieuwe RLS-policies:
-- de bestaande user-scoped policies (auth.uid() = user_id) beschermen deze
-- kolommen automatisch.
--
-- NULL in is_aanvraag betekent "nog niet beoordeeld". Bestaande mail blijft
-- dus ongemoeid en krijgt geen kaart te zien.

ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_aanvraag BOOLEAN NULL;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS aanvraag_zekerheid SMALLINT NULL;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS aanvraag_samenvatting TEXT NULL;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS aanvraag_beoordeeld_op TIMESTAMPTZ NULL;
-- Weggeklikte kaarten blijven weg, ook na een herbeoordeling van de thread.
ALTER TABLE emails ADD COLUMN IF NOT EXISTS aanvraag_verborgen BOOLEAN NOT NULL DEFAULT FALSE;

-- Hot path: het latere inbox-filter "aanvragen". Alleen de mails die de
-- drempel halen staan in de index.
CREATE INDEX IF NOT EXISTS idx_emails_aanvraag_open
  ON emails(user_id, datum DESC)
  WHERE is_aanvraag = TRUE AND aanvraag_verborgen = FALSE;

-- De kandidaat-selectie in fetch-emails zoekt op nog-niet-beoordeelde inbox-mail.
CREATE INDEX IF NOT EXISTS idx_emails_aanvraag_onbeoordeeld
  ON emails(user_id, datum DESC)
  WHERE is_aanvraag IS NULL;

-- Aparte teller voor de herkenning, zodat in de instellingen zichtbaar is wat
-- deze functie kost los van de schrijf-acties van Daan. De kosten tellen ook
-- gewoon mee in geschatte_kosten, dus het maandbudget blijft één bedrag.
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS aanvraag_calls INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS aanvraag_kosten NUMERIC(10,4) NOT NULL DEFAULT 0;

-- De reader leest zijn email-object uit de lijst-view, dus de nieuwe kolommen
-- moeten daar ook in staan. Kolomvolgorde van 106 blijft ongewijzigd; nieuwe
-- kolommen komen erachteraan zodat CREATE OR REPLACE VIEW niet klaagt.
CREATE OR REPLACE VIEW emails_list_view
WITH (security_invoker = on) AS
SELECT
  id,
  user_id,
  gmail_id,
  uid,
  message_id,
  van,
  aan,
  onderwerp,
  datum,
  gelezen,
  starred,
  labels,
  bijlagen,
  map,
  from_name,
  from_address,
  imap_folder,
  pinned,
  snoozed_until,
  thread_id,
  attachment_meta,
  has_attachments,
  LEFT(body_text, 200) AS body_text,
  fts,
  created_at,
  updated_at,
  cached_at,
  is_aanvraag,
  aanvraag_zekerheid,
  aanvraag_samenvatting,
  aanvraag_beoordeeld_op,
  aanvraag_verborgen
FROM emails;

GRANT SELECT ON emails_list_view TO authenticated;

NOTIFY pgrst, 'reload schema';
