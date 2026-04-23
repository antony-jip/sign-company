BEGIN;

-- Per-user voorkeur: kleine ⓘ/help-icoontjes naast titels en instellingen
-- die uitleg geven over wat een functie doet. Default aan voor nieuwe users,
-- uit voor bestaande users (zodat ze niet verrast worden door ineens overal
-- hint-icoontjes).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_hints_tonen BOOLEAN NOT NULL DEFAULT true;

UPDATE public.profiles
SET ui_hints_tonen = false
WHERE created_at < NOW();

COMMIT;
