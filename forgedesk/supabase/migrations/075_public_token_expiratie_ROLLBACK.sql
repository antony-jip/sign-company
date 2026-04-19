-- ROLLBACK van 075_public_token_expiratie.sql

DROP INDEX IF EXISTS idx_tekening_goedkeuringen_token;
ALTER TABLE tekening_goedkeuringen DROP CONSTRAINT IF EXISTS tekening_goedkeuringen_token_unique;
ALTER TABLE tekening_goedkeuringen DROP COLUMN IF EXISTS token_verloopt_op;

ALTER TABLE facturen DROP COLUMN IF EXISTS betaal_token_verloopt_op;

DROP INDEX IF EXISTS idx_offertes_publiek_token;
ALTER TABLE offertes DROP COLUMN IF EXISTS publiek_token_verloopt_op;
