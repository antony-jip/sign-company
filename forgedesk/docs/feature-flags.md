# Feature flags — aan- en uitzetten zonder deploy

Een feature flag is een rij in de tabel `feature_flags` (migratie 200). Je
zet hem om in de **Supabase SQL Editor** en de volgende paginalading van de
app volgt. Geen build, geen deploy, geen wachten op Vercel.

Dat is het hele punt: bij de rewrites die nog komen (mailsync naar een
queue, echte PWA, paginatie, support-inbox) moet er een knop zijn waarmee je
om 23:00 iets uitzet zonder een release te draaien.

## De drie standen

Een flag heeft géén twee standen maar drie. De afwezigheid van een rij is
een echte stand: "hierover is niets gezegd."

| Wat er in de tabel staat | Wat de app doet |
| --- | --- |
| geen rij | `onbekend` — nieuwe code blijft uit, bestaande code blijft aan |
| globale rij `aan = true` | aan voor alle organisaties zonder eigen rij |
| globale rij `aan = false` | **uit voor iedereen.** Harde stop, een org-rij kan dit niet overrulen |
| rij met `organisatie_id` | geldt alleen voor die organisatie, gaat vóór een globale `true` |

Twee gevolgen om te onthouden:

- **Piloten doe je zonder globale rij.** Zet je de globale rij op `false` om
  "iedereen behalve die ene" te bedoelen, dan doet niemand mee — `false` is
  een noodstop, niet een default. Laat de globale rij weg en geef alleen de
  pilot-organisatie een rij op `true`.
- **Een mislukte query verandert niets.** Kan de app de flags niet ophalen,
  dan is er geen enkele rij en staat dus geen enkele flag op `aan`; een
  feature die achter `staatUit()` hangt blijft gewoon staan. Een hapering in
  de database zet nooit een halve rewrite live en dooft nooit een werkende
  module.

## Een flag uitzetten

Dit is het statement dat je in de SQL Editor typt. Studio (de visualizer)
is de eerste consument:

```sql
-- Studio uit voor iedereen
UPDATE public.feature_flags
SET aan = false,
    reden = 'Studio dicht: <waarom, met datum>',
    aangepast_op = now()
WHERE naam = 'module_studio' AND organisatie_id IS NULL;
```

## Weer aanzetten

```sql
UPDATE public.feature_flags
SET aan = true,
    reden = 'Weer open: <waarom>',
    aangepast_op = now()
WHERE naam = 'module_studio' AND organisatie_id IS NULL;
```

## Alleen bij één organisatie uitzetten

```sql
INSERT INTO public.feature_flags (naam, organisatie_id, aan, reden)
VALUES ('module_studio', '<organisatie-uuid>', false, 'Op verzoek van de klant')
ON CONFLICT (naam, organisatie_id) WHERE organisatie_id IS NOT NULL DO UPDATE
  SET aan = false, reden = EXCLUDED.reden, aangepast_op = now();
```

Die `WHERE organisatie_id IS NOT NULL` hoort erbij: de uniciteit van
org-rijen zit in een partiële index (zie migratie 200), en Postgres kan die
alleen als conflict-doel gebruiken als je het predicaat meegeeft.

De uitzondering weer opheffen: verwijder de rij.

```sql
DELETE FROM public.feature_flags
WHERE naam = 'module_studio' AND organisatie_id = '<organisatie-uuid>';
```

## Een nieuwe flag piloten bij één organisatie

Geen globale rij aanleggen, alleen de pilot-organisatie:

```sql
INSERT INTO public.feature_flags (naam, organisatie_id, aan, reden)
VALUES ('mailsync_queue', '<organisatie-uuid>', true, 'Pilot week 34')
ON CONFLICT (naam, organisatie_id) WHERE organisatie_id IS NOT NULL DO UPDATE
  SET aan = true, reden = EXCLUDED.reden, aangepast_op = now();
```

Bevalt het, dan zet je de globale rij erbij en gaat iedereen mee:

```sql
INSERT INTO public.feature_flags (naam, organisatie_id, aan, reden)
VALUES ('mailsync_queue', NULL, true, 'Uitgerold na pilot')
ON CONFLICT (naam) WHERE organisatie_id IS NULL DO UPDATE
  SET aan = true, reden = EXCLUDED.reden, aangepast_op = now();
```

## Zien wat er aanstaat

```sql
SELECT naam,
       COALESCE(organisatie_id::text, 'GLOBAAL') AS bereik,
       aan,
       reden,
       aangepast_op
FROM public.feature_flags
ORDER BY naam, organisatie_id NULLS FIRST;
```

## Een flag gebruiken in code

Twee hooks, en de keuze tussen die twee is de belangrijkste beslissing:

```tsx
import { useFeatureAan, useFeatureUitgezet } from '@/contexts/FeatureFlagsContext'

// NIEUWE code achter een schakelaar. Alleen aan bij een expliciete 'aan',
// dus onbekend of een mislukte query = oude pad.
const queueAan = useFeatureAan('mailsync_queue')

// BESTAANDE code kunnen doven. Alleen uit bij een expliciete 'uit', dus
// onbekend of een mislukte query = de feature blijft staan zoals vandaag.
const studioUit = useFeatureUitgezet('module_studio')
```

Voor een rewrite gebruik je `useFeatureAan` op het nieuwe pad. Voor een
uitzetknop op iets dat al live is `useFeatureUitgezet`. Gebruik nooit
`useFeatureAan` om iets te dragen dat vandaag al aanstaat: dan verdwijnt het
op het moment dat de flag-query faalt, of zodra iemand de rij weghaalt.

De rijen worden één keer per sessie geladen (`FeatureFlagsProvider`, via
`lib/queryCache.ts`), dus een extra `useFeature...` in een component kost
geen extra request.

## Een nieuwe flag toevoegen

1. Kies een naam van kleine letters, cijfers en underscores — de tabel
   dwingt dat af met een CHECK, zodat een typefout in de SQL Editor niet
   stil een rij oplevert die nooit gelezen wordt.
2. Gebruik de naam in code via `useFeatureAan` of `useFeatureUitgezet`.
3. Hangt er een hele module aan, zet het pad dan in `MODULE_FLAGS` in
   `src/lib/featureFlags.ts`. Dan verdwijnt de module in één keer uit
   zijbalk, topbalk, mobiele balk én de route — een menu-item dat naar een
   dichte deur wijst is erger dan geen menu-item.
4. Voeg de rij toe met SQL (zie hierboven). Een migratie is niet nodig; de
   tabel is data, geen schema.

## Waarom niemand behalve service_role kan schrijven

De RLS-policy op `feature_flags` staat alleen `SELECT` toe, en alleen op de
globale rijen plus de eigen organisatie. Er is geen INSERT-, UPDATE- of
DELETE-policy, dus de app kan een flag niet omzetten — alleen `service_role`
en de SQL Editor kunnen dat.

Dat is opzet. Een schakelaar die de gebruiker zelf kan omzetten is een
instelling, en instellingen staan al in `app_settings`. Een flag is er juist
voor het geval dat *jij* iets moet kunnen tegenhouden dat de gebruiker aan
wil hebben.
