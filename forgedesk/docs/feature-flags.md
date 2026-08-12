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
WHERE naam = 'module_studio' AND organisatie_id IS NULL
RETURNING naam, aan, reden;
```

De `RETURNING` staat er niet voor niets. Ontbreekt de globale rij, bijvoorbeeld
na een terugdraai of bij een nieuwe flag, dan is het resultaat "UPDATE 0" en
denk je dat je hebt uitgezet terwijl er niets is gebeurd. Zie je geen rij
terugkomen, gebruik dan de upsert-vorm uit de pilot-paragraaf.

### Twee grenzen die je moet kennen

**Een tabblad dat al open staat volgt niet.** De flags worden één keer per
sessie geladen, zonder TTL en zonder herhaalpoging. Zet je iets uit terwijl
iemand de app open heeft, dan ziet die persoon het pas na een echte
paginalading. Voor een noodstop op korte termijn is dat niet genoeg: vraag er
dan bij om te verversen.

**Niet elke flag heeft een serverkant.** Sinds de mailsync-wachtrij is er wél
een lezer in `api/` (zie hieronder), maar die zit alleen in de bestanden die
hem nodig hebben. `module_studio` heeft er geen: met die flag uit blijft
`/api/visualizer-chat` bereikbaar voor wie het pad kent. De knop haalt de
module uit de app, hij sluit het endpoint niet af.

### Wat `module_studio` precies sluit

Zodat je weet wat je koopt als je hem omzet:

- **Weg**: het menu-item in zijbalk, topbalk, mobiele balk en Meer, de route
  `/visualizer` (die stuurt naar de startpagina), de knop "Bekijk in de app" in
  het kennisbank-artikel, en élke knop "Nieuwe visualisatie" — ook die in
  projectdetail, in offerteregels en in de mailcomposer. Er kan dus geen enkele
  nieuwe AI-generatie meer starten en er lopen geen credits weg.
- **Blijft**: visualisaties die er al zijn. Die blijven zichtbaar en te
  downloaden. Dat is opzet: dat is data van de klant, en data verstoppen is geen
  module uitzetten.
- **Blijft ook**: `/api/visualizer-chat`, zie de grens hierboven, en de
  vermelding van Studio in Daans systeemprompt. Daan kan er dus nog naar
  verwijzen.

### Wat `offline_queue` precies aanzet

Nieuwe code, dus `useFeatureAan`: zonder rij gebeurt er niets en gedraagt de
app zich exact zoals vandaag.

- **Werkbonfoto's** die niet geüpload konden worden verhuizen van de lijst in
  het geheugen naar IndexedDB (`doen_offline`), zodat ze een herlaad of een
  crash overleven. "Opnieuw versturen" loopt dan via de gedeelde flush, een
  vastgelopen foto toont waaróm, en er komt een knop "Opslaan op telefoon"
  bij zodat de enige kopie te redden is voor je hem weggooit.
- **Maatjes** gaan de bestaande wachtrij in bij elke fout die aantoonbaar
  geen antwoord kreeg, in plaats van alleen bij `navigator.onLine === false`.
  Een serverweigering (RLS, 400, 413) blijft gooien.
- **De offline-banner** vertelt hoeveel er wacht, ook als je online bent, en
  belooft niet langer dat wijzigingen verloren gaan.
- De flush draait app-breed (bij openen, op `online` en op
  `visibilitychange`) in plaats van alleen zolang één scherm openstaat.

Aanzetten voor één organisatie, en dat is de aangeraden eerste stap:

```sql
INSERT INTO public.feature_flags (naam, organisatie_id, aan, reden)
VALUES ('offline_queue', '<organisatie-uuid>', true, 'Pilot buitendienst')
ON CONFLICT (naam, organisatie_id) WHERE organisatie_id IS NOT NULL DO UPDATE
  SET aan = true, reden = EXCLUDED.reden, aangepast_op = now()
RETURNING naam, aan, reden;
```

Terugdraaien is de rij weghalen. Wat er op dat moment in `doen_offline`
staat blijft staan (weggooien zou dataverlies zijn) en komt weer in beeld
zodra de vlag terug aan gaat.

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

## De serverkant

Sinds de mailsync-wachtrij (migratie 202) is er ook een lezer in `api/`. Die
was er niet, en dat was precies het gat: mailsync draait onbeheerd op de
server, dus een clientvlag zou daar niets tegenhouden.

Hij zit in `api/cron-mailsync-werker.ts` en `api/fetch-emails.ts`, in beide
gevallen ingeplakt tussen de markers `GEDEELD-MET-API BEGIN` en `EINDE`.
Geen import, want `api/*` mag niets uit `src/` halen (CLAUDE.md §2). De
getypte tweeling van dat blok staat in `src/lib/mailsyncQueue.ts`, en
`tests/lib/mailsyncQueue.test.ts` faalt zodra een van de kopieën uit de pas
loopt of andere uitkomsten geeft dan `src/lib/featureFlags.ts`.

Wat je moet weten als je hem ergens anders ook wilt gebruiken:

- **Dezelfde drie standen, dezelfde voorrangsregels.** Globale `false` wint
  altijd, een org-rij gaat vóór een globale `true`, geen rij is `onbekend`.
- **Hij faalt dicht, altijd.** Een queryfout, een ontbrekende tabel, een
  ontbrekende rij: allemaal UIT. Anders dan op de client is er hier geen
  variant die open faalt. Wil je iets bestaands kunnen doven, bouw dan een
  eigen lezer met de omgekeerde standaard en zet dat er expliciet bij — de
  serverkant heeft geen bestaand gedrag te beschermen, dus stil niets doen is
  hier de veilige uitkomst.
- **Hij leest met de service-role**, dus zonder RLS. De organisatie waarop
  hij resolveert komt uit `profiles.organisatie_id` van de gebruiker om wie
  het gaat, niet uit een sessie.
- **Kort in cache per invocatie, niet per request.** Een module-variabele met
  30 seconden TTL: een warme functie hergebruikt de rijen, een koude haalt ze
  opnieuw op. Ook een mislukking gaat de cache in, anders loopt elke ronde
  opnieuw tegen dezelfde ontbrekende tabel aan.

Praktisch gevolg voor het omzetten van een serverflag: waar de client pas na
een echte paginalading volgt, volgt de server binnen ongeveer een halve
minuut. Geen deploy nodig.

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
