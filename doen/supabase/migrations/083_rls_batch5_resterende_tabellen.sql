BEGIN;

UPDATE emails e
SET organisatie_id = p.organisatie_id
FROM profiles p
WHERE p.id = e.user_id
  AND e.organisatie_id IS NULL;

ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portaal_bestanden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portaal_reacties ENABLE ROW LEVEL SECURITY;

COMMIT;
