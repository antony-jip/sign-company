-- Migration: carry 'wacht_op_reactie' (Opvolgen) through the scheduled-mail flow
-- so a scheduled mail with follow-up lands in the Sales Inbox "Wacht"-tab once
-- the cron sends it (the cron copies this onto the emails row).

ALTER TABLE ingeplande_berichten ADD COLUMN IF NOT EXISTS wacht_op_reactie BOOLEAN DEFAULT FALSE;
