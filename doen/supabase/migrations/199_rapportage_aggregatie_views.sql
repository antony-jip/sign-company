-- 199: server-side aggregatie voor de rapportage-pagina's.
--
-- Waarom: PostgREST levert nooit meer dan 1000 rijen per request. /rapportages,
-- /nacalculatie en /forecast telden hun totalen client-side op over ruwe
-- lijst-queries, dus zodra een organisatie over die grens groeit rekent zo'n
-- pagina stil over een deel van de data en presenteert dat als het totaal.
-- Deze views geven één rij per organisatie en dimensie terug, waardoor het
-- aantal rijen niet meer met de datagroei meeschaalt.
--
-- security_invoker = on is hier niet optioneel: zonder die optie draait de view
-- met de rechten van de eigenaar en zou een aggregaat over ALLE organisaties
-- teruggeven. Mét de optie geldt de RLS van de onderliggende tabel, wordt er
-- dus eerst op de eigen organisatie gefilterd en pas daarna geaggregeerd.
--
-- Datumkolommen in deze tabellen zijn TEXT (zie 001) en hebben '' als default.
-- Daarom knippen de maand-buckets met LEFT(...,7) in plaats van te casten naar
-- date: een cast klapt op een leeg of half ingevuld veld, LEFT niet. NULLIF
-- maakt van '' een NULL-bucket in plaats van een bucket met de naam ''.

-- ── Uren per medewerker (Rapportages: medewerker-productiviteit) ──
CREATE OR REPLACE VIEW rapportage_uren_per_medewerker
WITH (security_invoker = on) AS
SELECT
  organisatie_id,
  medewerker_id,
  COUNT(*)                                        AS aantal_registraties,
  COUNT(DISTINCT project_id)                      AS aantal_projecten,
  SUM(duur_minuten)                               AS minuten,
  ROUND(SUM(duur_minuten) / 60.0, 2)              AS uren,
  ROUND(SUM(duur_minuten / 60.0 * uurtarief), 2)  AS kosten
FROM tijdregistraties
GROUP BY organisatie_id, medewerker_id;

-- ── Uren per project (Nacalculatie: tijdkosten per project) ──
CREATE OR REPLACE VIEW rapportage_uren_per_project
WITH (security_invoker = on) AS
SELECT
  organisatie_id,
  project_id,
  COUNT(*)                                        AS aantal_registraties,
  SUM(duur_minuten)                               AS minuten,
  ROUND(SUM(duur_minuten) / 60.0, 2)              AS uren,
  ROUND(SUM(duur_minuten / 60.0 * uurtarief), 2)  AS tijdkosten
FROM tijdregistraties
GROUP BY organisatie_id, project_id;

-- ── Uitgaven per project (Nacalculatie: materiaal- en inkoopkosten) ──
CREATE OR REPLACE VIEW rapportage_uitgaven_per_project
WITH (security_invoker = on) AS
SELECT
  organisatie_id,
  project_id,
  COUNT(*)                             AS aantal_uitgaven,
  ROUND(SUM(bedrag_excl_btw), 2)       AS totaal_excl_btw,
  ROUND(SUM(bedrag_incl_btw), 2)       AS totaal_incl_btw
FROM uitgaven
GROUP BY organisatie_id, project_id;

-- ── Open deals per fase (Forecast: pipeline-tabel) ──
-- De gewogen waarde rondt hier één keer af over de som; de pagina rondde per
-- deal af. Dat kan een paar cent verschillen op een groot aantal deals.
CREATE OR REPLACE VIEW rapportage_deals_per_fase
WITH (security_invoker = on) AS
SELECT
  organisatie_id,
  fase,
  COUNT(*)                                                                AS aantal,
  ROUND(SUM(verwachte_waarde), 2)                                         AS pipeline_waarde,
  ROUND(SUM(verwachte_waarde * COALESCE(kans_percentage, 50) / 100.0), 2)  AS gewogen_waarde,
  ROUND(AVG(COALESCE(kans_percentage, 50)), 0)                            AS gem_kans_percentage
FROM deals
WHERE status = 'open'
GROUP BY organisatie_id, fase;

-- ── Open deals per verwachte sluitmaand (Forecast: grafiek) ──
-- maand IS NULL = open deals zonder verwachte sluitdatum. De pagina schuift die
-- naar "over twee maanden"; die aanname hoort in de UI, niet in de view.
CREATE OR REPLACE VIEW rapportage_deals_forecast_per_maand
WITH (security_invoker = on) AS
SELECT
  organisatie_id,
  NULLIF(LEFT(verwachte_sluitdatum, 7), '')                               AS maand,
  COUNT(*)                                                                AS aantal,
  ROUND(SUM(verwachte_waarde), 2)                                         AS pipeline_waarde,
  ROUND(SUM(verwachte_waarde * COALESCE(kans_percentage, 50) / 100.0), 2)  AS gewogen_waarde
FROM deals
WHERE status = 'open'
GROUP BY organisatie_id, NULLIF(LEFT(verwachte_sluitdatum, 7), '');

-- ── Voorraadwaarde (Rapportages: voorraad-blok) ──
-- Eén rij per organisatie. Inactieve artikelen tellen mee, net als in de UI.
CREATE OR REPLACE VIEW rapportage_voorraad_waarde
WITH (security_invoker = on) AS
SELECT
  organisatie_id,
  COUNT(*)                                                                          AS aantal_artikelen,
  COUNT(*) FILTER (WHERE huidige_voorraad <= COALESCE(minimum_voorraad, 0))          AS aantal_onder_minimum,
  ROUND(SUM(huidige_voorraad * COALESCE(inkoop_prijs, 0)), 2)                        AS voorraad_waarde
FROM voorraad_artikelen
GROUP BY organisatie_id;

-- ── Inkoopoffertes (Inkoopoffertes: de vier KPI-kaarten) ──
-- aantal_regels via een gecorreleerde subquery: joinen op inkoop_regels zou
-- io.totaal per regel dupliceren en het inkooptotaal opblazen.
CREATE OR REPLACE VIEW rapportage_inkoop_totalen
WITH (security_invoker = on) AS
SELECT
  io.organisatie_id,
  COUNT(*)                             AS aantal_offertes,
  COUNT(DISTINCT io.leverancier_naam)  AS aantal_leveranciers,
  ROUND(SUM(io.totaal), 2)             AS totaal_inkoop,
  (SELECT COUNT(*) FROM inkoop_regels r WHERE r.organisatie_id = io.organisatie_id) AS aantal_regels
FROM inkoop_offertes io
GROUP BY io.organisatie_id;

GRANT SELECT ON rapportage_uren_per_medewerker        TO authenticated;
GRANT SELECT ON rapportage_uren_per_project           TO authenticated;
GRANT SELECT ON rapportage_uitgaven_per_project       TO authenticated;
GRANT SELECT ON rapportage_deals_per_fase             TO authenticated;
GRANT SELECT ON rapportage_deals_forecast_per_maand   TO authenticated;
GRANT SELECT ON rapportage_voorraad_waarde            TO authenticated;
GRANT SELECT ON rapportage_inkoop_totalen             TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── Verificatie ──
-- Alle zeven views moeten hier staan met security_invoker=true. Staat er een
-- view met false of ontbreekt de optie, dan aggregeert die over alle
-- organisaties en moet hij opnieuw aangemaakt worden vóór gebruik.
SELECT
  c.relname AS view_naam,
  COALESCE(
    (SELECT o FROM unnest(c.reloptions) AS o WHERE o LIKE 'security_invoker=%'),
    'ONTBREEKT'
  ) AS invoker_optie
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND c.relname LIKE 'rapportage_%'
ORDER BY c.relname;

-- Optionele tweede check, per view één regel per organisatie:
--   SELECT * FROM rapportage_voorraad_waarde;
--   SELECT * FROM rapportage_deals_per_fase ORDER BY pipeline_waarde DESC;

-- Laatste statement: markeer de migratie als gedraaid. doen_migraties komt uit
-- migratie 198; is 198 nog niet gedraaid dan faalt alleen deze regel met
-- "relation doen_migraties does not exist". Dat is onschuldig, de views
-- hierboven zijn dan al aangemaakt.
INSERT INTO doen_migraties (bestand) VALUES ('199_rapportage_aggregatie_views.sql') ON CONFLICT DO NOTHING;
