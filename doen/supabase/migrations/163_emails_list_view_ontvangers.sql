-- 163: to_addresses en cc_addresses toevoegen aan de lijst-view.
-- De reader leest zijn email-object uit emails_list_view. Zonder deze twee
-- kolommen kan "Allen beantwoorden" de meelezers niet overnemen en verdwijnen
-- ze stilzwijgend uit de thread. De kolommen bestaan al sinds migratie 031 en
-- worden door de sync gevuld; alleen de view liep achter.
--
-- Kolomvolgorde van 106/159 blijft ongewijzigd; nieuwe kolommen komen
-- erachteraan zodat CREATE OR REPLACE VIEW niet klaagt.

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
  aanvraag_verborgen,
  to_addresses,
  cc_addresses
FROM emails;

GRANT SELECT ON emails_list_view TO authenticated;

NOTIFY pgrst, 'reload schema';
