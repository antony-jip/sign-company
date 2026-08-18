-- Vervolgpapier support: aparte achtergrond voor pagina 2+
ALTER TABLE document_styles ADD COLUMN IF NOT EXISTS vervolgpapier_url TEXT NOT NULL DEFAULT '';

-- Uitbreiden briefpapier_modus met 'eerste_en_vervolg'
ALTER TABLE document_styles DROP CONSTRAINT IF EXISTS document_styles_briefpapier_modus_check;
ALTER TABLE document_styles ADD CONSTRAINT document_styles_briefpapier_modus_check
  CHECK (briefpapier_modus IN ('geen', 'achtergrond', 'alleen_eerste_pagina', 'eerste_en_vervolg'));
