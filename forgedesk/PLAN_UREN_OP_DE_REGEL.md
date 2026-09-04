# Plan · Sprint 1 van 4 · Uren op de regel

Status: **voorstel**, wacht op akkoord. Niets gebouwd, niets gecommit.
Sprint 2 t/m 4 (weekstaat en fiattering, planmomenten en bezetting, geld en
uitzonderingen) staan in de Gripp-analyse en volgen hierop.

Ontwerpregel voor deze sprint: **niets slopen.** Alleen nieuwe, nullable
kolommen. Geen bestaande lezer van `tijdregistraties`, `offerte_items` of
`taken` hoeft aangepast. Elke fase levert iets zichtbaars op en is los terug te
draaien. `MontagePlanningLayout.tsx` en `FactuurEditor.tsx` worden niet
aangeraakt.

## 1. Aanleiding

In Gripp staat op elke verkochte bewerking een bolletje: 6,5 van de 10 uur
grafische werkvoorbereiding geschreven, 20,75 van de 22,5 uur beletteren. Dat
is het scherm dat een Gripp-gebruiker de hele dag open heeft, en het is de bron
van alles daarachter: nacalculatie, onderhanden werk, bezetting, nettowinst.

doen. kan dat scherm niet tonen. Niet omdat de uren ontbreken, maar omdat ze
nergens aan elkaar hangen.

## 2. Wat er al is (en dus niet opnieuw gebouwd wordt)

| Onderdeel | Locatie |
|---|---|
| Uren per bewerking uit de calculatie, inclusief correctie en tarief per veld | `QuoteCreation.tsx:554-633` (`urenPerVeld`, `totaalUren`, `tariefPerVeld`) |
| De bewerkingen zelf, per organisatie instelbaar | `app_settings.calculatie_uren_velden`, standaard Montage, Voorbereiding, Ontwerp & DTP, Applicatie (`profielService.ts:204`, `CalculatieTab.tsx:1968`) |
| Correctie per veld, bewaard op de offerte | `offertes.uren_correctie JSONB` (`QuoteCreation.tsx:809, 1233`) |
| Tijdregistraties met project, taak, medewerker, duur, tarief, facturabel | `migrations/001:49`, org-RLS in `048`, service `tijdregistratieService.ts` |
| Inklokken dat nette urenregels schrijft | `tijdSessieService.ts:91` (`stopTijdSessie`) |
| Project laadt zijn uren, offertes en taken al | `ProjectDetail.tsx:477-622` (`projectTaken`, `projectOffertes`, `projectTijdregistraties`) |
| Taak kent geschatte en bestede tijd | `Taak.geschatte_tijd`, `Taak.bestede_tijd` (`types/index.ts:328`) |
| Werkbon kent gewerkte uren | `Werkbon.uren_gewerkt`, ingevuld bij afronden in `WerkbonDetail.tsx:353` |
| Standaard uurtarief | `app_settings.standaard_uurtarief`, `Medewerker.uurtarief` |
| Takenkaart op het project met knop Nieuwe taak | `cockpit/TakenOfferteGrid.tsx:160`, `ProjectDetail.tsx:1867` |

De rekenkant klopt dus al. Wat ontbreekt zijn drie koppelingen en één scherm.

## 3. Waarom het nu niet werkt

1. **Het budget verlaat de editor niet.** `urenPerVeld` is een `useMemo` in
   `QuoteCreation`. Zodra je de offerte sluit is het weg. Het project weet niet
   dat er 45 uur montage verkocht is.
2. **Een urenregel weet niet waarvoor hij is.** `tijdregistraties` heeft
   `project_id` en `taak_id`, geen bewerking. Dertig uur op een project is
   dertig uur, of dat nu printen of monteren was.
3. **Een taak weet niet uit welke bewerking hij komt.** Taken worden met de hand
   aangemaakt (`TaakNieuwSheet`), los van de offerte.
4. **Werkbon-uren verdampen.** `uren_gewerkt` komt op de PDF
   (`werkbonPdfService.ts:740`) en nergens anders.
5. **Kostprijs bestaat niet.** `Medewerker.uurtarief` is het verkooptarief.
   Nettowinst is daardoor niet te berekenen.

## 4. Ontwerp

### 4.1 De bewerking is de sleutel, niet de offerteregel

Gripp hangt uren aan een `offerprojectline`. doen. heeft al een eigen, kleinere
sleutel: het **urenveld** (de bewerking). Die is per organisatie instelbaar,
wordt al uit de calculatie afgeleid, en is precies wat een signmaker in zijn
hoofd heeft: montage, voorbereiding, DTP, applicatie.

Dus: budget en geschreven uren worden per **project × urenveld** vergeleken.

Overwogen alternatief: `offerte_item_id` op de urenregel, zoals Gripp. Afgevallen
voor deze sprint. Een offerteregel in doen. is een verkoopregel ("30 auto's
beletteren"), de uren zitten in de calculatie eronder verdeeld over meerdere
bewerkingen. Een monteur schrijft "montage", niet "regel 3". Per regel kan later
alsnog, bovenop dit.

### 4.2 Budget berekenen, niet bewaren

Het budget per project per urenveld wordt **live** berekend uit de offertes van
het project (`offertes.project_id`), via dezelfde logica als de editor. Geen
nieuwe kolom, geen backfill, geen tweede waarheid.

Welke offertes tellen mee (besluit Antony, 4 sep): `goedgekeurd` en
`gefactureerd` als **vast** budget, `verzonden` en `bekeken` als **verwacht**
budget. Heeft een project alleen verwachte offertes, dan toont de kaart het
budget met het label "verwacht" en een lichtere balk. Zodra er één goedgekeurde
offerte is, tellen alleen de vaste mee, zodat een verlopen alternatief het
budget niet opblaast. `concept`, `afgewezen`, `verlopen` en
`wijziging_gevraagd` tellen nooit mee.

Daarvoor wordt de `useMemo` uit `QuoteCreation.tsx:558-633` verplaatst naar een
pure functie `src/utils/offerteUren.ts`:

```ts
export function berekenOfferteUren(
  items: OfferteItem[],
  urenVelden: string[],
  urenCorrectie?: Record<string, number>,
): { urenPerVeld: Record<string, number>; totaalUren: number; tariefPerVeld: Record<string, number>; materiaalKosten: number }
```

`QuoteCreation` roept de functie aan en houdt exact hetzelfde gedrag. Een
vitest-test met een fixture (drie regels, twee opties, een detailregel "4 uur")
bewijst dat de uitkomst gelijk is aan de huidige `useMemo`. Dit is de enige
wijziging in de offerte-editor in deze sprint.

Let op: `getPrijsDataRegels(item)` (meetellende prijsopties) moet mee naar de
util, want het budget moet de gekozen varianten volgen.

### 4.3 Migratie 233 (232 is de laatste in de map)

```sql
BEGIN;

-- Bewerking op de urenregel. NULL = niet toegewezen, wordt getoond als Overig.
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS urenveld TEXT;
ALTER TABLE tijd_sessies      ADD COLUMN IF NOT EXISTS urenveld TEXT;

-- Bewerking waar een taak uit voortkomt. Uren op de taak erven dit veld.
ALTER TABLE taken ADD COLUMN IF NOT EXISTS urenveld TEXT;

-- Bewerking van een catalogusproduct. Gevuld wint van de naam-matching.
ALTER TABLE calculatie_producten ADD COLUMN IF NOT EXISTS urenveld TEXT;

-- Kostprijs per uur (wat een uur kost, niet wat het oplevert).
-- Op de urenregel als momentopname, net als uurtarief.
ALTER TABLE medewerkers      ADD COLUMN IF NOT EXISTS kostprijs_uur NUMERIC(10,2);
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS kostprijs_uur NUMERIC(10,2);
ALTER TABLE app_settings     ADD COLUMN IF NOT EXISTS standaard_kostprijs_uur NUMERIC(10,2);

-- Werkbon-uren maar één keer boeken, en per organisatie kiezen op wie.
ALTER TABLE werkbonnen   ADD COLUMN IF NOT EXISTS uren_geboekt_op TIMESTAMPTZ;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS werkbon_uren_verdelen BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tijdregistraties_project_urenveld
  ON tijdregistraties (project_id, urenveld);

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('233_uren_per_bewerking.sql') ON CONFLICT DO NOTHING;
```

Geen nieuwe tabellen, dus geen nieuwe policies. De bestaande org-policies op
deze tabellen dekken de kolommen. `tests/migrations/rlsInvarianten.test.ts`
blijft groen zonder aanpassing.

### 4.4 Het scherm: uren per bewerking op het project

Nieuw component `src/components/projects/cockpit/UrenPerBewerkingCard.tsx`,
geplaatst in `ProjectDetail` naast `TijdCard`. Niet ín `ProjectDetail`
gebouwd: dat bestand is 3500 regels.

Per urenveld één rij:

```
Montage          27,0 / 45,0 u   ████████░░░░  60%
Voorbereiding    11,75 / 30,0 u  ████░░░░░░░░  39%
Ontwerp & DTP     6,5 / 10,0 u   ███████░░░░░  65%
Applicatie       20,75 / 22,5 u  ███████████░  92%   (oranje vanaf 90, rood vanaf 100)
Overig            3,0 u          (uren zonder bewerking, alleen als > 0)
```

Bronnen: begroot uit 4.2, geschreven uit `projectTijdregistraties` (al geladen)
gegroepeerd op `urenveld`. Geen nieuwe query.

Onderaan, alleen zichtbaar voor admin en alleen als er een kostprijs bekend is:

```
Verkocht ex btw     € 37.352,60
Materiaal inkoop    € 13.159,20   (som inkoop_prijs × aantal van materiaalregels)
Urenkosten          €  4.525,00   (90,5 u × kostprijs)
Indicatie marge     € 19.668,40   53%
```

Kostprijs per uur = `medewerker.kostprijs_uur` van de schrijver, anders
`app_settings.standaard_kostprijs_uur`. Geen van beide gezet: de regel Urenkosten
en Indicatie marge worden niet getoond. Zo verschijnt er nooit een verzonnen
getal.

Als het project geen goedgekeurde offerte met uren heeft, toont de kaart alleen
de geschreven uren per bewerking. De kaart verbergt zichzelf als er niets te
tonen is.

### 4.5 Uren schrijven met een bewerking

Drie plekken krijgen één extra keuzelijst, gevuld met
`settings.calculatie_uren_velden` plus de optie Overig (leeg):

| Plek | Wijziging |
|---|---|
| `TijdregistratieLayout.tsx` formulier | Veld Bewerking, optioneel. Voorkeuze: het urenveld van de gekozen taak, anders leeg. |
| Inklokken (`TijdCard.tsx` → `startTijdSessie`) | Zelfde keuzelijst in het inklokpaneel. `tijd_sessies.urenveld` gaat mee naar `stopTijdSessie` en komt op de registratie. |
| `TaakNieuwSheet.tsx` | Veld Bewerking op de taak. |

Uurtarief-voorkeuze verandert mee, alleen als **standaardwaarde** in het
formulier, niet in wat er opgeslagen wordt: tarief van het urenveld uit de
offertes van het project (`tariefPerVeld`), anders `medewerker.uurtarief`,
anders `settings.standaard_uurtarief`, anders de huidige 65. De hardgecodeerde
65 in `TijdregistratieLayout.tsx:167` wordt daarmee een laatste terugval.

Bestaande urenregels houden `urenveld = NULL` en tellen als Overig. Niets
verandert aan nacalculatie, budgetbewaking, klant-urentab of facturatie, die
lezen dit veld niet.

### 4.6 Taken uit de bewerkingen

Knop **Taken uit offerte** op `TakenOfferteGrid`, naast Nieuwe taak. Alleen
zichtbaar als het project een goedgekeurde offerte met uren heeft.

Gedrag, in `projectService.ts`:

```ts
export async function maakTakenUitBewerkingen(projectId: string): Promise<Taak[]>
```

1. Bereken `urenPerVeld` voor het project (4.2).
2. Voor elk veld met uren > 0 waarvoor het project **nog geen** taak met dat
   `urenveld` heeft: `createTaak({ titel: veld, project_id, klant_id,
   offerte_id: eerste goedgekeurde offerte, urenveld: veld, geschatte_tijd:
   uren, status: 'todo', prioriteit: 'medium', toegewezen_aan: '' })`.
3. Toast: "4 taken aangemaakt" of "Alle bewerkingen hebben al een taak".

Idempotent: twee keer klikken maakt niets dubbel. Bestaande handmatige taken
blijven staan. Toewijzen aan een persoon blijft handwerk; automatisch toewijzen
op vaardigheden is sprint 3.

Dit is Gripps knop "Taken aanmaken" met het vinkje "voeg taken met hetzelfde
product samen" standaard aan.

### 4.7 Werkbon-uren worden urenregels

In `WerkbonDetail.tsx` afronden (regel 341-357), **na** de geslaagde
`updateWerkbon` en alleen als `urenGewerkt > 0 && projectId &&
!werkbon.uren_geboekt_op`:

```ts
await createTijdregistratie({
  project_id: projectId,
  urenveld: montageVeld,            // 'Montage' als dat in calculatie_uren_velden staat, anders null
  medewerker_id: eigenMedewerker?.id,
  medewerker_naam: medewerkerNaam,
  omschrijving: `Werkbon ${werkbonNummer}`,
  datum,
  start_tijd: '', eind_tijd: '',
  duur_minuten: Math.round(urenGewerkt * 60),
  uurtarief: tariefVoorkeuze,       // zelfde ladder als 4.5
  facturabel: true,
  gefactureerd: false,
})
await updateWerkbon(werkbonId, { uren_geboekt_op: new Date().toISOString() })
```

Fire-and-forget met `logger.warn`, net als het automatisch afronden van de
montage eronder: een mislukte boeking mag het afronden van de werkbon niet
blokkeren. `uren_geboekt_op` voorkomt dubbel boeken als iemand de werkbon
opnieuw afrondt.

Op wie de uren komen (besluit Antony, 4 sep): standaard op de afronder. Met
de organisatie-instelling **Werkbon-uren verdelen over monteurs** aan, worden
de uren gelijk verdeeld over de `monteurs` van de gekoppelde montageafspraak,
gematcht op naam tegen `medewerkers.naam`. Namen die niet matchen vallen terug
op de afronder, met de naam in de omschrijving. De instelling staat standaard
uit, omdat niet elke firma de monteurs op de afspraak precies bijhoudt. Daarvoor
komt `app_settings.werkbon_uren_verdelen BOOLEAN DEFAULT false` in migratie
233 bij, met een schakelaar in de werkbon-instellingen.

### 4.8 Wat bewust niet in deze sprint zit

- **Regelsoort Fixed / nacalculatie / niet-factureerbaar.** Pas relevant zodra
  uren naar facturen gaan met een status (sprint 2, samen met fiattering).
- **Contracturen en bezetting.** Sprint 3.
- **Budgetsignaal bij 90 procent.** Sprint 4, één trigger op de nachtploeg.
- **Backfill van bestaande urenregels naar een bewerking.** Niet te raden;
  Overig is eerlijker.
- **Nacalculatie-pagina aanpassen.** Blijft werken zoals nu; de kaart op het
  project is de nieuwe plek voor lopend werk.

## 5. Fases

Elke fase is één of meer commits op branch `feature/uren-op-de-regel`, elk met
de review-loop uit CLAUDE.md §8. Baselines gemeten op 4 sep **op `main`**, de
basis van deze branch: `npx tsc --noEmit` 35 fouten, `npm run typecheck:api`
3 fouten (cron-email-sync, cron-mailsync-werker, portaal-upload), en één
falende test die er al stond (`tests/lib/mailsyncQueue.test.ts`, de kopie-check
op `api/fetch-emails.ts`; de fix zit op `supabase-dieet`). Geen van drie mag
verslechteren.

### Fase 0 · Fundament (halve dag)

- Migratie `233_uren_per_bewerking.sql` (4.3), door Antony te draaien.
- Types: `urenveld?: string | null` op `Tijdregistratie`, `TijdSessie`, `Taak`;
  `kostprijs_uur?: number | null` op `Medewerker`; `standaard_kostprijs_uur` op
  `AppSettings`; `uren_geboekt_op?: string | null` op `Werkbon`.
- `CalculatieTab`: veld Standaard kostprijs per uur, alleen admin.
- `TeamLayout`: veld Kostprijs per uur op de medewerker, alleen admin.

Acceptatie: build groen, tsc niet gestegen. Let op: de app draait NIET
identiek zonder migratie 233. Nieuwe velden gaan als `null` mee en PostgREST
weigert een onbekende kolom, dus inklokken, uitklokken en het opslaan van
urenregels, taken, medewerkers, producten en instellingen falen tot 233
gedraaid is. Lezen werkt wel. Daarom: 233 draaien vóór merge naar `main`
(gedaan op 4 sep 2026).

### Fase 1 · Het budget de editor uit (1,5 dag)

- `src/utils/offerteUren.ts` met `berekenOfferteUren` en `getPrijsDataRegels`
  (4.2), `QuoteCreation` gebruikt de util.
- `tests/utils/offerteUren.test.ts`: fixture, verwachte uitkomst is de huidige
  editor-uitkomst; tweede test voor een prijsvariant die niet meetelt.
- `src/services/projectUrenService.ts`: `getProjectUrenBudget(projectId)` →
  offertes van het project met status goedgekeurd of gefactureerd, hun items,
  `berekenOfferteUren` per offerte, gesommeerd per veld inclusief
  `uren_correctie`.
- `UrenPerBewerkingCard` (4.4) zonder het kostenblok.

Acceptatie: op een project met een goedgekeurde offerte met calculatie staan
de begrote uren per bewerking op het project en kloppen ze met de sidebar van
de offerte. Geschreven uren tonen als Overig (want nog zonder veld). Een project
zonder offerte of uren toont de kaart niet. Offerte-editor gedraagt zich
identiek (test bewijst het).

### Fase 2 · Schrijven met een bewerking (1 dag)

- Keuzelijst Bewerking in `TijdregistratieLayout`, `TijdCard` (inklokken) en
  `TaakNieuwSheet` (4.5).
- `startTijdSessie` en `stopTijdSessie` geven `urenveld` door.
- Uurtarief-voorkeuze via de ladder in 4.5.
- Kaart toont nu geschreven uren per bewerking en de balk.

Acceptatie: inklokken met bewerking Montage en uitklokken geeft een urenregel
met `urenveld = 'Montage'`, en de balk Montage op het project loopt op. Oude
urenregels blijven zichtbaar als Overig. Bewuste afwijking (review 4 sep):
"een urenregel op een taak erft de bewerking" is niet gebouwd, omdat het veld
Taak in het urenformulier vrije tekst is en geen taak koppelt; de taakdialoog
op het bord kreeg het veld in plaats van `TaakNieuwSheet` (mobiele snelinvoer
zonder project). Nacalculatie en klant-urentab tonen
dezelfde totalen als vóór de sprint.

### Fase 3 · Taken uit de bewerkingen (halve dag)

- `maakTakenUitBewerkingen` (4.6) plus knop op `TakenOfferteGrid`.
- `TaskChecklistView` toont `geschatte_tijd` als die groter is dan 0 (kleine
  toevoeging, alleen weergave).

Acceptatie: knop maakt per bewerking met uren één taak met de juiste
`geschatte_tijd`; tweede klik maakt niets; handmatige taken blijven staan.

### Fase 4 · Werkbon en kostprijs (1 dag)

- Werkbon-uren naar urenregel (4.7).
- Kostenblok op de kaart (4.4), alleen admin, alleen met bekende kostprijs.

Acceptatie: werkbon afronden met 3 uur op een project geeft één urenregel van
180 minuten met bewerking Montage, één keer, ook na opnieuw afronden. Met een
kostprijs van 40 en 90,5 geschreven uur toont de kaart Urenkosten 3.620,00 en
de marge daarop. Zonder kostprijs geen kostenblok. Werkbon-PDF onveranderd.

### Einde sprint

`@QAA` tegen de acceptatiecriteria, `@senior-backend-reviewer` over de hele
branch, gate-update. Totaal 4,5 bouwdag.

## 6. Risico's en hoe ze afgevangen zijn

| Risico | Maatregel |
|---|---|
| De extractie uit `QuoteCreation` verandert stilletjes de offertetotalen | Test in fase 1 vergelijkt util met de bestaande uitkomst; `urenCorrectieBedrag` en de sidebar raken de util alleen via dezelfde return-waarden |
| Budget en editor lopen uit elkaar | Er is geen bewaard budget; beide rekenen met dezelfde functie op dezelfde items |
| Naam-matching van bewerkingen (`includes`) telt een regel dubbel of niet | Bestaand gedrag, ongewijzigd. Eerste `break` in de loop blijft. Wel benoemen in de kaart met een tooltip "op basis van calculatieregels die op de bewerking matchen" |
| Werkbon-uren dubbel geboekt | `uren_geboekt_op` |
| Werkbon-uren op de verkeerde persoon | Vraag 2; tot die beantwoord is: op de afronder, met de werkbonnaam in de omschrijving zodat het herkenbaar en corrigeerbaar is |
| Kostprijs zichtbaar voor de werkplaats | Alleen achter `isAdminUser`; het veld staat niet in de medewerker-zelfbewerking |
| Migratie nog niet gedraaid op productie | Alle nieuwe velden optioneel; select `*` op tabellen zonder de kolom faalt niet; inserts sturen `urenveld` alleen mee als de gebruiker iets koos |
| `ProjectDetail` groeit verder | Kaart is een los component; `ProjectDetail` krijgt één import en één regel JSX |

## 7. Besluiten (Antony, 4 sep 2026)

1. **Budget:** goedgekeurd en gefactureerd tellen als vast, verzonden en
   bekeken als verwacht. Uitgewerkt in 4.2.
2. **Werkbon-uren:** verdelen over de monteurs van de montageafspraak, maar
   als optie per organisatie, standaard uit. Uitgewerkt in 4.7.
3. **Bewerking bij schrijven:** optioneel, Overig als vangnet.
4. **Kostprijs:** alleen admin.
5. **Naam in de UI:** Bewerking.

Aanvullingen na eigen review, akkoord Antony (4 sep):

6. **Bewerking op het catalogusproduct.** `calculatie_producten.urenveld`;
   gevuld wint van de naam-matching, leeg valt terug op de naam. Keuzelijst in
   de productcatalogus (fase 1).
7. **Kostprijs als momentopname.** `tijdregistraties.kostprijs_uur` wordt bij
   schrijven gevuld uit medewerker, anders organisatie-standaard. De kaart
   rekent met de momentopname, niet met de actuele kostprijs.
8. Onbekende bewerkingen (na hernoemen van een urenveld) tonen onder hun oude
   naam, niet als Overig. `Taak.bestede_tijd` blijft ongebruikt; de takenkaart
   toont de som van urenregels op de taak. Inklokken houdt de bewerking
   voorgevuld: uit de taak, anders de enige bewerking met open budget, anders
   leeg.

Status: **in aanbouw** op branch `feature/uren-op-de-regel` (afgezet van
`main`, dat bij migratie 230 stopt; 231 en 232 zitten op `supabase-dieet`,
233 blijft uniek op beide).

| Fase | Commit | Stand |
|---|---|---|
| 0 Fundament | `8d55a007` | klaar; migratie 233 gedraaid op productie, 4 sep 2026 |
| 1 Budget op het project | `0594fdb3` | klaar; util met oracle-test, kaart naast TijdCard, bewerking op catalogusproduct |
| 2 Schrijven met bewerking | `07ddaf37` | klaar; urenformulier, inklokpaneel, TijdCard en taakdialoog. Bewust niet: `TaakNieuwSheet` (mobiele snelinvoer zonder project); taken uit de offerte krijgen hun bewerking via fase 3 |
| 3 Taken uit bewerkingen | `18c101aa` (merge) | klaar; knop Taken uit offerte, idempotent per bewerking, schatting en bewerking zichtbaar op de checklist. Bewust zonder deadline op gegenereerde taken; geen unieke constraint op (project, bewerking), dus twee gebruikers tegelijk kunnen dubbel aanmaken |
| 4 Werkbon en kostprijs | `985bd7ac` (merge) | klaar; werkbon-uren als urenregels via beide afrond-paden (WerkbonDetail en WerkbonMonteurView), verdelen over gematchte monteurs als de instelling aan staat, kostenblok admin-only met "N urenregels zonder kostprijs niet meegeteld". Bewust: geen materiaalregel in de marge (materiaalKosten is verkoopwaarde, geen inkoop), dus het blok heet "Uren verkocht", "Urenkosten", "Indicatie marge" op uren. Partiële boeking bij een storing halverwege kan dubbel boeken bij opnieuw afronden; zichtbaar via de omschrijving "Werkbon WB-…" |

Let op vóór mergen naar `main`: draai migratie 233 eerst. Zonder de kolommen
falen het opslaan van een product (urenveld), een medewerker (kostprijs_uur),
de calculatie-instellingen (standaard_kostprijs_uur), de werkbon-instellingen
(werkbon_uren_verdelen) en elke nieuwe urenregel (urenveld, kostprijs_uur).
Lezen blijft overal werken.
