-- ============================================================
-- 056: RPC functie get_my_portaal_items (SECURITY DEFINER)
-- Omzeilt RLS zodat de eigenaar reacties + bestanden kan zien
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_portaal_items(p_portaal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_portaal_owner UUID;
  v_org_id UUID;
  v_user_org UUID;
  result JSONB;
BEGIN
  -- Huidige gebruiker
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Niet geautoriseerd';
  END IF;

  -- Check eigenaar of organisatie-lid
  SELECT user_id, organisatie_id INTO v_portaal_owner, v_org_id
  FROM project_portalen
  WHERE id = p_portaal_id;

  IF v_portaal_owner IS NULL THEN
    RAISE EXCEPTION 'Portaal niet gevonden';
  END IF;

  IF v_portaal_owner != v_user_id THEN
    IF v_org_id IS NOT NULL THEN
      SELECT organisatie_id INTO v_user_org FROM profiles WHERE id = v_user_id;
      IF v_user_org IS NULL OR v_user_org != v_org_id THEN
        RAISE EXCEPTION 'Geen toegang';
      END IF;
    ELSE
      RAISE EXCEPTION 'Geen toegang';
    END IF;
  END IF;

  -- Haal items op met bestanden en reacties
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'user_id', i.user_id,
      'project_id', i.project_id,
      'portaal_id', i.portaal_id,
      'type', i.type,
      'offerte_id', i.offerte_id,
      'factuur_id', i.factuur_id,
      'titel', i.titel,
      'omschrijving', i.omschrijving,
      'label', i.label,
      'status', i.status,
      'bekeken_op', i.bekeken_op,
      'mollie_payment_url', i.mollie_payment_url,
      'bedrag', i.bedrag,
      'zichtbaar_voor_klant', i.zichtbaar_voor_klant,
      'volgorde', i.volgorde,
      'sort_order', i.sort_order,
      'notitie', i.notitie,
      'bericht_type', i.bericht_type,
      'bericht_tekst', i.bericht_tekst,
      'foto_url', i.foto_url,
      'afzender', i.afzender,
      'created_at', i.created_at,
      'updated_at', i.updated_at,
      'bestanden', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', b.id,
            'portaal_item_id', b.portaal_item_id,
            'bestandsnaam', b.bestandsnaam,
            'mime_type', b.mime_type,
            'grootte', b.grootte,
            'url', b.url,
            'thumbnail_url', b.thumbnail_url,
            'uploaded_by', b.uploaded_by,
            'created_at', b.created_at
          )
        )
        FROM portaal_bestanden b WHERE b.portaal_item_id = i.id
      ), '[]'::jsonb),
      'reacties', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'portaal_item_id', r.portaal_item_id,
            'type', r.type,
            'bericht', r.bericht,
            'klant_naam', r.klant_naam,
            'foto_url', r.foto_url,
            'created_at', r.created_at
          )
          ORDER BY r.created_at ASC
        )
        FROM portaal_reacties r WHERE r.portaal_item_id = i.id
      ), '[]'::jsonb)
    )
    ORDER BY i.created_at DESC
  ) INTO result
  FROM portaal_items i
  WHERE i.portaal_id = p_portaal_id;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
