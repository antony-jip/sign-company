-- NIET AUTOMATISCH UITVOEREN
-- Herstelt het publieke lek (alleen gebruiken als Batch 2B live issues veroorzaakt)
CREATE POLICY "Public can view by token" ON public.tekening_goedkeuringen
FOR SELECT TO public USING (true);
