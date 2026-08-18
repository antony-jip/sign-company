-- Migration 133: SnelStart omzetgrootboek per BTW-tarief
--
-- SnelStart-omzetgrootboeken zijn tariefgebonden (grootboekfunctie omzet
-- hoog/laag/onbelast); één grootboek voor alle tarieven wordt door de API
-- geweigerd. snelstart_grootboek_id blijft het grootboek voor het hoge
-- tarief; laag en onbelast krijgen eigen kolommen.

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS snelstart_grootboek_laag_id TEXT,
  ADD COLUMN IF NOT EXISTS snelstart_grootboek_nul_id TEXT;

COMMENT ON COLUMN app_settings.snelstart_grootboek_id IS
  'SnelStart omzetgrootboek voor BTW hoog (21%)';
COMMENT ON COLUMN app_settings.snelstart_grootboek_laag_id IS
  'SnelStart omzetgrootboek voor BTW laag (9%)';
COMMENT ON COLUMN app_settings.snelstart_grootboek_nul_id IS
  'SnelStart omzetgrootboek voor onbelaste omzet (0%)';
