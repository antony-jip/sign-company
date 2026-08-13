-- 206: factuurregels transactioneel vervangen
--
-- replaceFactuurItems deed client-side lees-oude-ids, insert-nieuwe,
-- delete-oude in drie losse statements. Twee gebruikers die dezelfde factuur
-- tegelijk opslaan lazen dezelfde oude ids, insertten elk hun eigen set en
-- deleteten allebei alleen de oude: de factuur eindigde met de regels van
-- beide gebruikers dubbel. Eén plpgsql-functie draait in één transactie.
--
-- SECURITY INVOKER: de org-scoped RLS-policies van factuur_items blijven
-- volledig gelden. (De abonnement-write-lock uit 111 staat niet op
-- factuur_items zelf; die grijpt een stap eerder, op de facturen-header.)

BEGIN;

CREATE OR REPLACE FUNCTION vervang_factuur_items(p_factuur_id uuid, p_items jsonb)
RETURNS SETOF factuur_items
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM factuur_items WHERE factuur_id = p_factuur_id;

  RETURN QUERY
  INSERT INTO factuur_items
    (factuur_id, user_id, organisatie_id, beschrijving, aantal, eenheidsprijs,
     btw_percentage, korting_percentage, totaal, volgorde, grootboek_code, detail_regels)
  SELECT
    p_factuur_id,
    auth.uid(),
    auth_organisatie_id(),
    COALESCE(x.beschrijving, ''),
    COALESCE(x.aantal, 1),
    COALESCE(x.eenheidsprijs, 0),
    COALESCE(x.btw_percentage, 21),
    COALESCE(x.korting_percentage, 0),
    COALESCE(x.totaal, 0),
    COALESCE(x.volgorde, 0),
    COALESCE(x.grootboek_code, ''),
    COALESCE(x.detail_regels, '[]'::jsonb)
  FROM jsonb_to_recordset(p_items) AS x(
    beschrijving text,
    aantal numeric,
    eenheidsprijs numeric,
    btw_percentage numeric,
    korting_percentage numeric,
    totaal numeric,
    volgorde integer,
    grootboek_code text,
    detail_regels jsonb
  )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION vervang_factuur_items(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vervang_factuur_items(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION vervang_factuur_items(uuid, jsonb) TO service_role;

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('206_vervang_factuur_items_rpc.sql') ON CONFLICT DO NOTHING;
