-- 259: de admin-cockpit — één plek waar samenkomt wat er in het bedrijf
-- gebeurt. Vervangt het optellen aan de clientkant van dashboard, financieel,
-- forecast en rapportages (elk met een eigen definitie van "omzet") door één
-- serverfunctie met één set definities.
--
-- Alles draait als SECURITY INVOKER: de RLS van de onderliggende tabellen
-- filtert op de eigen organisatie vóór er geaggregeerd wordt. Wie de cockpit
-- mag zien (alleen rol admin) beslist de app; de data is per definitie al
-- die van de eigen organisatie.
--
-- Datumkolommen in de oude tabellen zijn TEXT met '' als default (zie 001 en
-- 199); cockpit_datum() maakt daar veilig een date van, of NULL.
--
-- Bedragen zijn ex btw (zie src/utils/btwWeergave.ts: subtotaal, anders
-- totaal - btw, anders totaal). Creditnota's staan negatief in de tabel en
-- trekken zich dus vanzelf af.

BEGIN;

CREATE OR REPLACE FUNCTION cockpit_datum(p TEXT)
RETURNS date
LANGUAGE sql IMMUTABLE STRICT
AS $$
  SELECT CASE WHEN p ~ '^\d{4}-\d{2}-\d{2}' THEN LEFT(p, 10)::date END
$$;

-- Zelfde regel voor tijdstempels die als TEXT zijn opgeslagen (offertes.verstuurd_op).
CREATE OR REPLACE FUNCTION cockpit_tijdstip(p TEXT)
RETURNS timestamptz
LANGUAGE sql STABLE STRICT
AS $$
  SELECT CASE WHEN p ~ '^\d{4}-\d{2}-\d{2}' THEN p::timestamptz END
$$;

CREATE OR REPLACE FUNCTION cockpit_ex_btw(p_subtotaal NUMERIC, p_btw NUMERIC, p_totaal NUMERIC)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_subtotaal, 0) <> 0 THEN p_subtotaal
    WHEN COALESCE(p_totaal, 0) <> 0 AND COALESCE(p_btw, 0) <> 0 THEN p_totaal - p_btw
    ELSE COALESCE(p_subtotaal, p_totaal, 0)
  END
$$;

-- Openstaand ex btw: betaald komt incl btw binnen en wordt naar rato
-- teruggerekend, zoals openstaandExBtw() in de app.
CREATE OR REPLACE FUNCTION cockpit_openstaand_ex_btw(p_subtotaal NUMERIC, p_btw NUMERIC, p_totaal NUMERIC, p_betaald NUMERIC)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
  SELECT cockpit_ex_btw(p_subtotaal, p_btw, p_totaal)
       - CASE
           WHEN COALESCE(p_betaald, 0) = 0 THEN 0
           WHEN COALESCE(p_totaal, 0) = 0 OR cockpit_ex_btw(p_subtotaal, p_btw, p_totaal) = 0 THEN p_betaald
           ELSE p_betaald * cockpit_ex_btw(p_subtotaal, p_btw, p_totaal) / p_totaal
         END
$$;

-- portaal_items heeft RLS op user_id (049), niet op organisatie: met een
-- gewone view ziet een beheerder alleen wat hij zelf verstuurde. Deze
-- hulpfunctie leest als definer en filtert zelf op de organisatie van de
-- aanroeper via het project, zodat het hele team in beeld is.
CREATE OR REPLACE FUNCTION cockpit_portaal_wacht()
RETURNS TABLE (
  id UUID, organisatie_id UUID, titel TEXT, klant TEXT, dagen INT,
  detail JSONB, href TEXT, sinds TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, pr.organisatie_id,
    COALESCE(NULLIF(p.titel, ''), p.type)::text,
    pr.klant_naam::text,
    (CURRENT_DATE - p.created_at::date)::int,
    jsonb_build_object('type', p.type, 'status', p.status, 'project_id', p.project_id, 'bekeken_op', p.bekeken_op),
    ('/projecten/' || p.project_id)::text,
    p.created_at
  FROM portaal_items p
  JOIN projecten pr ON pr.id = p.project_id
  WHERE p.status IN ('verstuurd', 'bekeken')
    AND p.type IN ('offerte', 'tekening', 'opdrachtbevestiging')
    AND pr.organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION cockpit_portaal_wacht() FROM anon, public;
GRANT EXECUTE ON FUNCTION cockpit_portaal_wacht() TO authenticated;

-- ── Signalen: wat aandacht verdient, als losse rijen met een link ──
-- CREATE OR REPLACE VIEW laat later geen kolomwijziging toe (§10.6); eerst
-- droppen zodat een herdraai na een half gelukte run ook slaagt.
DROP VIEW IF EXISTS cockpit_signalen;
DROP VIEW IF EXISTS cockpit_per_maand;
CREATE VIEW cockpit_signalen
WITH (security_invoker = on) AS
-- Offertes die op de klant wachten
SELECT
  'offerte_wacht'::text                                   AS soort,
  o.id, o.organisatie_id,
  COALESCE(NULLIF(o.titel, ''), o.nummer)                 AS titel,
  o.klant_naam                                            AS klant,
  cockpit_ex_btw(o.subtotaal, o.btw_bedrag, o.totaal)     AS bedrag,
  (CURRENT_DATE - cockpit_datum(o.verstuurd_op))          AS dagen,
  jsonb_build_object(
    'nummer', o.nummer,
    'status', o.status,
    'keer_bekeken', COALESCE(o.aantal_keer_bekeken, 0),
    'verloopt_op', cockpit_datum(o.geldig_tot),
    'verlopen', cockpit_datum(o.geldig_tot) < CURRENT_DATE
  )                                                       AS detail,
  '/offertes/' || o.id || '/detail'                       AS href,
  cockpit_tijdstip(o.verstuurd_op)                        AS sinds
FROM offertes o
WHERE o.status IN ('verzonden', 'bekeken', 'wijziging_gevraagd')
  AND cockpit_datum(o.verstuurd_op) IS NOT NULL

UNION ALL
-- Offertes die op een collega-check wachten
SELECT
  'offerte_check', o.id, o.organisatie_id,
  COALESCE(NULLIF(o.titel, ''), o.nummer), o.klant_naam,
  cockpit_ex_btw(o.subtotaal, o.btw_bedrag, o.totaal),
  (CURRENT_DATE - COALESCE(o.check_gevraagd_op, o.updated_at)::date),
  jsonb_build_object('nummer', o.nummer, 'gevraagd_aan', o.check_gevraagd_aan),
  '/offertes/' || o.id || '/bewerken',
  COALESCE(o.check_gevraagd_op, o.updated_at)
FROM offertes o
WHERE o.check_status = 'open'

UNION ALL
-- Facturen die open staan (vervallen of niet)
SELECT
  'factuur_open', f.id, f.organisatie_id,
  COALESCE(NULLIF(f.titel, ''), f.nummer), f.klant_naam,
  cockpit_openstaand_ex_btw(f.subtotaal, f.btw_bedrag, f.totaal, f.betaald_bedrag),
  (CURRENT_DATE - cockpit_datum(f.vervaldatum)),
  jsonb_build_object(
    'nummer', f.nummer,
    'status', f.status,
    'vervaldatum', cockpit_datum(f.vervaldatum),
    'online_bekeken', COALESCE(f.online_bekeken, false),
    'herinneringen', (f.herinnering_1_verstuurd IS NOT NULL)::int + (f.herinnering_2_verstuurd IS NOT NULL)::int + (f.herinnering_3_verstuurd IS NOT NULL)::int,
    'aanmaning', f.aanmaning_verstuurd IS NOT NULL,
    'opvolging_actief', COALESCE(f.opvolging_actief, true),
    'peppol_status', f.peppol_status
  ),
  '/facturen/' || f.id,
  COALESCE(f.verzonden_op, f.created_at)
FROM facturen f
WHERE f.status IN ('verzonden', 'open', 'vervallen')
  AND cockpit_openstaand_ex_btw(f.subtotaal, f.btw_bedrag, f.totaal, f.betaald_bedrag) > 0.005

UNION ALL
-- Peppol-verzending mislukt
SELECT
  'factuur_peppol_mislukt', f.id, f.organisatie_id,
  COALESCE(NULLIF(f.titel, ''), f.nummer), f.klant_naam,
  cockpit_ex_btw(f.subtotaal, f.btw_bedrag, f.totaal),
  NULL::int,
  jsonb_build_object('nummer', f.nummer, 'fout', f.peppol_fout),
  '/facturen/' || f.id,
  f.updated_at
FROM facturen f
WHERE f.peppol_status = 'mislukt'

UNION ALL
-- Werkbonnen afgerond maar nog niet gefactureerd
SELECT
  'werkbon_te_factureren', w.id, w.organisatie_id,
  COALESCE(NULLIF(w.werkbon_nummer, ''), 'Werkbon'), k.bedrijfsnaam,
  NULL::numeric,
  (CURRENT_DATE - cockpit_datum(w.datum)),
  jsonb_build_object('project_id', w.project_id, 'datum', cockpit_datum(w.datum)),
  '/werkbonnen/' || w.id,
  w.updated_at
FROM werkbonnen w
LEFT JOIN klanten k ON k.id = w.klant_id
WHERE w.status = 'afgerond' AND w.factuur_id IS NULL

UNION ALL
-- Portaal: verstuurd of bekeken, nog geen antwoord van de klant. Geen bedrag:
-- wat het portaal toont is incl. btw, de rest van de cockpit is ex btw.
SELECT
  'portaal_wacht', w.id, w.organisatie_id, w.titel, w.klant,
  NULL::numeric, w.dagen, w.detail, w.href, w.sinds
FROM cockpit_portaal_wacht() w

UNION ALL
-- Projecten: zonder planning, deadline dichtbij of over budget
SELECT
  'project_' || s.soort, pr.id, pr.organisatie_id,
  pr.naam, pr.klant_naam,
  pr.budget,
  CASE WHEN s.soort = 'deadline' THEN (cockpit_datum(pr.eind_datum) - CURRENT_DATE) END,
  jsonb_build_object(
    'status', pr.status,
    'prioriteit', pr.prioriteit,
    'eind_datum', cockpit_datum(pr.eind_datum),
    'budget', pr.budget,
    'besteed', pr.besteed
  ),
  '/projecten/' || pr.id,
  pr.updated_at
FROM projecten pr
CROSS JOIN LATERAL (
  SELECT 'zonder_planning' AS soort
  WHERE pr.status IN ('te-plannen', 'akkoord-klant')
    AND NOT EXISTS (SELECT 1 FROM montage_afspraken m WHERE m.project_id = pr.id AND m.status <> 'afgerond')
  UNION ALL
  SELECT 'deadline'
  WHERE pr.status NOT IN ('afgerond', 'gefactureerd', 'on-hold')
    AND cockpit_datum(pr.eind_datum) IS NOT NULL
    AND cockpit_datum(pr.eind_datum) <= CURRENT_DATE + 7
  UNION ALL
  SELECT 'over_budget'
  WHERE pr.status NOT IN ('afgerond', 'gefactureerd')
    AND COALESCE(pr.budget, 0) > 0
    AND COALESCE(pr.besteed, 0) >= pr.budget * COALESCE(pr.budget_waarschuwing_pct, 90) / 100.0
) s
WHERE COALESCE(pr.is_template, false) = false

UNION ALL
-- Inkoopfacturen die op review wachten
SELECT
  'inkoop_review', i.id, i.organisatie_id,
  COALESCE(NULLIF(i.factuur_nummer, ''), 'Inkoopfactuur'), i.leverancier_naam,
  cockpit_ex_btw(i.subtotaal, i.btw_bedrag, i.totaal),
  (CURRENT_DATE - i.created_at::date),
  jsonb_build_object('status', i.status, 'vervaldatum', i.vervaldatum, 'vertrouwen', i.extractie_vertrouwen),
  '/facturen?tab=inkoop',
  i.created_at
FROM inkoopfacturen i
WHERE i.status IN ('nieuw', 'verwerkt')

UNION ALL
-- Montages die gepland stonden in het verleden en nooit zijn afgerond
SELECT
  'montage_niet_afgerond', m.id, m.organisatie_id,
  COALESCE(NULLIF(m.titel, ''), m.project_naam), m.klant_naam,
  NULL::numeric,
  (CURRENT_DATE - cockpit_datum(m.datum)),
  jsonb_build_object('datum', cockpit_datum(m.datum), 'monteurs', to_jsonb(m.monteurs), 'project_id', m.project_id),
  CASE WHEN m.project_id IS NOT NULL THEN '/projecten/' || m.project_id ELSE '/planning' END,
  m.updated_at
FROM montage_afspraken m
WHERE m.status IN ('gepland', 'onderweg', 'bezig')
  AND cockpit_datum(m.datum) < CURRENT_DATE;

-- ── Cijfers per maand (12 maanden), voor de reeks in de cockpit ──
CREATE VIEW cockpit_per_maand
WITH (security_invoker = on) AS
SELECT organisatie_id, maand,
  SUM(gefactureerd) AS gefactureerd,
  SUM(ontvangen)    AS ontvangen,
  SUM(inkoop)       AS inkoop
FROM (
  SELECT organisatie_id, LEFT(NULLIF(factuurdatum, ''), 7) AS maand,
         cockpit_ex_btw(subtotaal, btw_bedrag, totaal) AS gefactureerd, 0::numeric AS ontvangen, 0::numeric AS inkoop
  FROM facturen WHERE status <> 'concept'
  UNION ALL
  SELECT organisatie_id, LEFT(NULLIF(betaaldatum, ''), 7),
         0, cockpit_ex_btw(subtotaal, btw_bedrag, totaal), 0
  FROM facturen WHERE status = 'betaald'
  UNION ALL
  -- inkoopfacturen.factuur_datum is een echte DATE (migratie 050).
  SELECT organisatie_id, to_char(factuur_datum, 'YYYY-MM'),
         0, 0, cockpit_ex_btw(subtotaal, btw_bedrag, totaal)
  FROM inkoopfacturen WHERE status = 'goedgekeurd'
) r
WHERE maand IS NOT NULL
GROUP BY organisatie_id, maand;

-- ── Eén aanroep voor het hele scherm ──
-- p_van/p_tot: de periode voor de periodecijfers (gefactureerd, ontvangen,
-- inkoop, conversie). Signalen en openstaand zijn altijd "nu".
-- Alleen een beheerder krijgt iets terug; voor anderen is het resultaat NULL.
-- De RLS van de tabellen beperkt sowieso tot de eigen organisatie.
CREATE OR REPLACE FUNCTION cockpit_overzicht(p_van date, p_tot date)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH sig AS (
    SELECT * FROM cockpit_signalen ORDER BY sinds ASC
  ),
  open_facturen AS (
    SELECT cockpit_openstaand_ex_btw(subtotaal, btw_bedrag, totaal, betaald_bedrag) AS open_ex,
           (CURRENT_DATE - cockpit_datum(vervaldatum)) AS dagen_over
    FROM facturen
    WHERE status IN ('verzonden', 'open', 'vervallen')
  )
  SELECT jsonb_build_object(
    'peildatum', CURRENT_DATE,
    'periode', jsonb_build_object('van', p_van, 'tot', p_tot),
    'signalen', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'soort', soort, 'id', id, 'titel', titel, 'klant', klant, 'bedrag', bedrag,
        'dagen', dagen, 'detail', detail, 'href', href, 'sinds', sinds
      ) ORDER BY sinds ASC)
      FROM sig
    ), '[]'::jsonb),
    'cijfers', jsonb_build_object(
      'pijplijn', COALESCE((SELECT SUM(bedrag) FROM sig WHERE soort = 'offerte_wacht'), 0),
      'pijplijn_aantal', (SELECT COUNT(*) FROM sig WHERE soort = 'offerte_wacht'),
      'gefactureerd', COALESCE((
        SELECT SUM(cockpit_ex_btw(subtotaal, btw_bedrag, totaal)) FROM facturen
        WHERE status <> 'concept' AND cockpit_datum(factuurdatum) BETWEEN p_van AND p_tot
      ), 0),
      'ontvangen', COALESCE((
        SELECT SUM(cockpit_ex_btw(subtotaal, btw_bedrag, totaal)) FROM facturen
        WHERE status = 'betaald' AND cockpit_datum(betaaldatum) BETWEEN p_van AND p_tot
      ), 0),
      'inkoop', COALESCE((
        SELECT SUM(cockpit_ex_btw(subtotaal, btw_bedrag, totaal)) FROM inkoopfacturen
        WHERE status = 'goedgekeurd' AND factuur_datum BETWEEN p_van AND p_tot
      ), 0),
      'openstaand', COALESCE((SELECT SUM(open_ex) FROM open_facturen), 0),
      'openstaand_aantal', (SELECT COUNT(*) FROM open_facturen WHERE open_ex > 0.005),
      'ouderdom', jsonb_build_object(
        'nog_niet_vervallen', COALESCE((SELECT SUM(open_ex) FROM open_facturen WHERE dagen_over IS NULL OR dagen_over <= 0), 0),
        'd1_30',  COALESCE((SELECT SUM(open_ex) FROM open_facturen WHERE dagen_over BETWEEN 1 AND 30), 0),
        'd31_60', COALESCE((SELECT SUM(open_ex) FROM open_facturen WHERE dagen_over BETWEEN 31 AND 60), 0),
        'd61_90', COALESCE((SELECT SUM(open_ex) FROM open_facturen WHERE dagen_over BETWEEN 61 AND 90), 0),
        'd90_plus', COALESCE((SELECT SUM(open_ex) FROM open_facturen WHERE dagen_over > 90), 0)
      ),
      'conversie', (
        SELECT jsonb_build_object(
          'totaal', COUNT(*),
          'gewonnen', COUNT(*) FILTER (WHERE status IN ('goedgekeurd', 'gefactureerd')),
          'verloren', COUNT(*) FILTER (WHERE status IN ('afgewezen', 'verlopen')),
          'open', COUNT(*) FILTER (WHERE status IN ('verzonden', 'bekeken', 'wijziging_gevraagd')),
          'gewonnen_bedrag', COALESCE(SUM(cockpit_ex_btw(subtotaal, btw_bedrag, totaal)) FILTER (WHERE status IN ('goedgekeurd', 'gefactureerd')), 0)
        )
        FROM offertes
        WHERE created_at::date BETWEEN p_van AND p_tot
      ),
      'per_maand', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('maand', maand, 'gefactureerd', gefactureerd, 'ontvangen', ontvangen, 'inkoop', inkoop) ORDER BY maand)
        FROM cockpit_per_maand
        WHERE maand >= to_char(CURRENT_DATE - INTERVAL '11 months', 'YYYY-MM')
      ), '[]'::jsonb)
    ),
    'nu', jsonb_build_object(
      'ingeklokt', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', id, 'medewerker', medewerker_naam, 'project', project_naam, 'project_id', project_id, 'sinds', gestart_op) ORDER BY gestart_op)
        FROM tijd_sessies
      ), '[]'::jsonb),
      'montages_vandaag', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', id, 'titel', COALESCE(NULLIF(titel, ''), project_naam), 'klant', klant_naam, 'start', start_tijd, 'status', status, 'monteurs', to_jsonb(monteurs), 'project_id', project_id) ORDER BY start_tijd)
        FROM montage_afspraken
        WHERE cockpit_datum(datum) = CURRENT_DATE
      ), '[]'::jsonb),
      'montages_week', (
        SELECT COUNT(*) FROM montage_afspraken
        WHERE cockpit_datum(datum) BETWEEN CURRENT_DATE AND CURRENT_DATE + 6
      ),
      -- planning_afwezigheid.medewerker_id is TEXT (127): een medewerkers.id
      -- óf 'profile-<uuid>' voor een teamlid zonder medewerkerkaart.
      'afwezig_vandaag', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'medewerker', COALESCE(m.naam, NULLIF(TRIM(COALESCE(pf.voornaam, '') || ' ' || COALESCE(pf.achternaam, '')), ''), a.medewerker_id),
          'type', a.type, 'tot', a.eind_datum
        ))
        FROM planning_afwezigheid a
        LEFT JOIN medewerkers m ON m.id::text = a.medewerker_id
        LEFT JOIN profiles pf ON a.medewerker_id = 'profile-' || pf.id::text
        WHERE cockpit_datum(a.start_datum::text) <= CURRENT_DATE AND cockpit_datum(a.eind_datum::text) >= CURRENT_DATE
      ), '[]'::jsonb),
      'team_actief', (SELECT COUNT(*) FROM medewerkers WHERE status = 'actief'),
      'uitnodigingen_open', (SELECT COUNT(*) FROM uitnodigingen WHERE status = 'open' OR status = 'verstuurd')
    ),
    'systeem', jsonb_build_object(
      'peppol_mislukt', (SELECT COUNT(*) FROM facturen WHERE peppol_status = 'mislukt'),
      'exact_sync_fouten', (SELECT COUNT(*) FROM facturen WHERE exact_sync_fout IS NOT NULL),
      'herinnering_fouten_14d', (SELECT COUNT(*) FROM factuur_opvolg_log WHERE resultaat = 'fout' AND verzonden_op >= now() - INTERVAL '14 days'),
      'laatste_nachtploeg', (
        SELECT jsonb_build_object('status', status, 'gestart_op', gestart_op, 'klaar_op', klaar_op, 'fout', fout, 'voorstellen', voorstellen)
        FROM ai_rondes ORDER BY gestart_op DESC LIMIT 1
      ),
      'organisatie', (
        SELECT jsonb_build_object('abonnement_status', abonnement_status, 'trial_einde', trial_einde)
        FROM organisaties LIMIT 1
      )
    )
  )
  WHERE EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
$$;
REVOKE EXECUTE ON FUNCTION cockpit_overzicht(date, date) FROM anon, public;
GRANT EXECUTE ON FUNCTION cockpit_overzicht(date, date) TO authenticated;
GRANT SELECT ON cockpit_signalen, cockpit_per_maand TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('259_cockpit.sql') ON CONFLICT DO NOTHING;
