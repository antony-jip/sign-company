-- 139: Nieuwe factuur-status 'open'
-- "Verwerken" kent een definitief factuurnummer toe en zet de status op 'open'
-- (definitief, klaar om te versturen). Pas bij daadwerkelijk versturen wordt
-- de status 'verzonden'. Breidt de bestaande CHECK-constraint uit.

ALTER TABLE facturen DROP CONSTRAINT IF EXISTS facturen_status_check;
ALTER TABLE facturen ADD CONSTRAINT facturen_status_check
  CHECK (status IN ('concept', 'open', 'verzonden', 'betaald', 'vervallen', 'gecrediteerd'));
