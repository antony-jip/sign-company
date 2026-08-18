BEGIN;

-- Voor tekening_goedkeuringen: teamleden moeten elkaars tekeningen
-- in projecten kunnen zien. User_id policies zijn te strikt.
CREATE POLICY "Org members manage tekening_goedkeuringen"
ON public.tekening_goedkeuringen
FOR ALL TO authenticated
USING (organisatie_id = auth_organisatie_id())
WITH CHECK (organisatie_id = auth_organisatie_id());

-- RLS aan op alle 7 tabellen
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btw_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grootboek ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kortingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tekening_goedkeuringen ENABLE ROW LEVEL SECURITY;

COMMIT;
