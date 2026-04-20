-- NIET AUTOMATISCH UITVOEREN
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.btw_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_styles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.grootboek DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kortingen DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tekening_goedkeuringen DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members manage tekening_goedkeuringen"
  ON public.tekening_goedkeuringen;
