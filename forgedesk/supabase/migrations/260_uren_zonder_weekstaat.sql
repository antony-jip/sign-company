-- 260: de weekstaat en het goedkeurscherm voor uren zijn uit de app. Nieuwe
-- uren komen direct als 'goedgekeurd' binnen (tijdregistratieService). Wat
-- er nog als concept of definitief stond had geen plek meer om vrijgegeven te
-- worden, en de schakelaar uren_goedkeuren in app_settings.functies hield de
-- beschermingstrigger uit migratie 241 actief zonder scherm om hem uit te
-- zetten. De trigger zelf blijft staan: zonder de sleutel is hij inert, en
-- mocht goedkeuren ooit terugkomen dan is hij er nog.

BEGIN;

UPDATE tijdregistraties
SET status = 'goedgekeurd'
WHERE status IN ('concept', 'definitief');

UPDATE app_settings
SET functies = functies - 'uren_goedkeuren' - 'uren_weekstaat' - 'uren_herinnering' - 'uren_herinnering_uur'
WHERE functies IS NOT NULL
  AND functies ?| ARRAY['uren_goedkeuren', 'uren_weekstaat', 'uren_herinnering', 'uren_herinnering_uur'];

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('260_uren_zonder_weekstaat.sql') ON CONFLICT DO NOTHING;
