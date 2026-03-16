-- ============================================================
-- 033: Performance indexes voor schaalbaarheid
-- Composite indexes op veelgebruikte query-patronen
-- ============================================================

-- Offertes: user + status + datum (dashboard filters, lijstpagina)
CREATE INDEX IF NOT EXISTS idx_offertes_user_status_date
  ON offertes(user_id, status, created_at DESC);

-- Projecten: user + status (actieve projecten filter)
CREATE INDEX IF NOT EXISTS idx_projecten_user_status
  ON projecten(user_id, status);

-- Facturen: user + status + factuurdatum (factuurlijst, vervallen filters)
CREATE INDEX IF NOT EXISTS idx_facturen_user_status_date
  ON facturen(user_id, status, factuurdatum DESC);

-- Werkbonnen: user + status + datum
CREATE INDEX IF NOT EXISTS idx_werkbonnen_user_status_date
  ON werkbonnen(user_id, status, created_at DESC);

-- Taken: user + status + deadline (takenlijst, deadline filters)
CREATE INDEX IF NOT EXISTS idx_taken_user_status_deadline
  ON taken(user_id, status, deadline);

-- Notificaties: vervang slechte index (gelezen zonder user_id)
DROP INDEX IF EXISTS idx_notificaties_gelezen;
CREATE INDEX IF NOT EXISTS idx_notificaties_user_unread
  ON notificaties(user_id, gelezen, created_at DESC);

-- Emails: inbox type filtering (gedeelde inbox)
CREATE INDEX IF NOT EXISTS idx_emails_user_inbox_type
  ON emails(user_id, inbox_type, datum DESC);

-- Klanten: user + status (actieve klanten filter)
CREATE INDEX IF NOT EXISTS idx_klanten_user_status
  ON klanten(user_id, status);

-- Klant activiteiten: klant + datum (activiteit feed)
CREATE INDEX IF NOT EXISTS idx_klant_activiteiten_klant_datum
  ON klant_activiteiten(klant_id, created_at DESC);

-- Deal activiteiten: deal + datum (deal timeline)
CREATE INDEX IF NOT EXISTS idx_deal_activiteiten_deal_datum
  ON deal_activiteiten(deal_id, created_at DESC);

-- Deals: user + fase (pipeline view)
CREATE INDEX IF NOT EXISTS idx_deals_user_fase
  ON deals(user_id, fase);

-- Bestelbonnen: user + status
CREATE INDEX IF NOT EXISTS idx_bestelbonnen_user_status
  ON bestelbonnen(user_id, status, created_at DESC);

-- Leveringsbonnen: user + status
CREATE INDEX IF NOT EXISTS idx_leveringsbonnen_user_status
  ON leveringsbonnen(user_id, status, created_at DESC);

-- Uitgaven: user + datum (kostenoverzicht)
CREATE INDEX IF NOT EXISTS idx_uitgaven_user_datum
  ON uitgaven(user_id, datum DESC);

-- Partial index: alleen ongelezen notificaties (veel kleiner, veel sneller)
CREATE INDEX IF NOT EXISTS idx_notificaties_user_ongelezen
  ON notificaties(user_id, created_at DESC)
  WHERE gelezen = false;

-- Partial index: alleen openstaande facturen
CREATE INDEX IF NOT EXISTS idx_facturen_user_openstaand
  ON facturen(user_id, vervaldatum)
  WHERE status IN ('verzonden', 'herinnering', 'aanmaning');

-- Partial index: actieve projecten
CREATE INDEX IF NOT EXISTS idx_projecten_user_actief
  ON projecten(user_id, start_datum)
  WHERE status IN ('gepland', 'actief', 'in_productie');
