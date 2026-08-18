-- Server-side body_text truncate voor de email-lijst.
-- Bespaart 50-80% list-payload: een gemiddelde body_text is enkele KB,
-- maar voor de preview-snippet hebben we maar 200 chars nodig.
-- security_invoker = on zorgt dat RLS van de onderliggende emails-tabel
-- correct geerfd wordt - zonder die optie zou de view auth bypassen.

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
  cached_at
FROM emails;

GRANT SELECT ON emails_list_view TO authenticated;
