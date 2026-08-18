BEGIN;

CREATE POLICY "Org members manage factuur_items"
ON public.factuur_items FOR ALL TO authenticated
USING (organisatie_id = auth_organisatie_id())
WITH CHECK (organisatie_id = auth_organisatie_id());

ALTER TABLE public.klanten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerte_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factuur_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projecten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taken ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montage_afspraken ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tijdregistraties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medewerkers ENABLE ROW LEVEL SECURITY;

COMMIT;
