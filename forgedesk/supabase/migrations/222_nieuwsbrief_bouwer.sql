-- Nieuwsbrief-bouwer: blokken-document, editormodus, gekozen template en
-- ontvanger-selectie per nieuwsbrief. Tabel blijft user-scoped (zie 149).
BEGIN;

ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS blokken JSONB;
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS editor_modus TEXT NOT NULL DEFAULT 'html'
  CHECK (editor_modus IN ('blokken', 'html'));
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS template_key TEXT;
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS ontvangers JSONB NOT NULL DEFAULT '{"type":"alle"}'::jsonb;
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS test_verstuurd_op TIMESTAMPTZ;

-- Gerichte verzendingen lopen niet via een broadcast maar per mail; events
-- komen dan binnen met een tag nieuwsbrief_id in plaats van broadcast_id.
ALTER TABLE nieuwsbrief_events DROP CONSTRAINT IF EXISTS nieuwsbrief_events_type_check;
ALTER TABLE nieuwsbrief_events ADD CONSTRAINT nieuwsbrief_events_type_check
  CHECK (type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'));

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('222_nieuwsbrief_bouwer.sql') ON CONFLICT DO NOTHING;
