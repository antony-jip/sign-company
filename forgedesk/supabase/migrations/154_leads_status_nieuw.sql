-- Leads: startstatus 'nieuw' toevoegen.
-- Migratie 153 kende alleen 'benaderd' als default, waardoor elke geimporteerde
-- lead binnenkwam alsof er al contact was geweest. De hele lijst stond daardoor
-- op benaderd terwijl er nog niemand gemaild was.

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('nieuw', 'benaderd', 'gereageerd', 'geen_interesse', 'follow-up_later'));

ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'nieuw';

-- De bestaande vulling is nooit benaderd: alles terug naar de startstatus.
-- status_sinds blijft staan; die zegt sinds wanneer de rij op deze status staat
-- en dat moment is nu.
UPDATE leads
SET status = 'nieuw', status_sinds = now()
WHERE status = 'benaderd';
