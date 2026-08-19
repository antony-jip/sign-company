# Plan · Inklokken op project

Status: **uitgevoerd**, alle drie de fases. Fase 1 en 2 staan op main; fase 3 op
`feature/inklokken-fase-3`. Migratie 219 moet nog op productie gedraaid worden.

## 1. Aanleiding

Het logboek op het project laat zien *wat* er gebeurd is, niet *hoelang* iemand
eraan gewerkt heeft. Gevraagd: een stopwatch per project die je aanzet en waarbij
collega's zien dat Antony ingeklokt staat.

## 2. Wat er al is (en dus niet opnieuw gebouwd wordt)

| Onderdeel | Locatie |
|---|---|
| Tabel `tijdregistraties` | `migrations/001_missing_tables.sql:49`, org-RLS in `048` |
| CRUD-service | `src/services/tijdregistratieService.ts` |
| Nacalculatie rekent met deze uren | `NacalculatieLayout.tsx:131` |
| Budgetbewaking rekent met deze uren | `utils/budgetUtils.ts:28` |
| Klant-tab "Uren" | `ClientProfile.tsx:594` |
| Project laadt zijn uren al | `ProjectDetail.tsx:1129` (`projectTijdregistraties`) |
| Eigen medewerkerprofiel afleiden | `ProjectDetail.tsx:461` (`eigenMedewerker`) |
| Realtime-patroon om te kopiëren | `cockpit/PortaalCompactBlock.tsx:718` |

De boekhoudkant klopt dus al. Wat ontbreekt is een **lopende** sessie.

## 3. Waarom de huidige stopwatch niet volstaat

`TijdregistratieLayout.tsx:194-203` houdt de timer in React-state:

- refresh of tabblad dicht = teller weg, niets geboekt
- onzichtbaar voor collega's, dus "wie werkt eraan" is niet te zien
- `medewerker_id` wordt bij stop niet gezet (`regel 294-305`)
- uurtarief hardgecodeerd op 65 (`regel 300`)
- staat op een losse pagina, niet op het project

## 4. Ontwerp

### 4.1 Aparte tabel voor lopende sessies

Nieuwe tabel `tijd_sessies` voor wat *nu loopt*. Bij uitklokken schrijft die één
nette rij in `tijdregistraties` en verdwijnt de sessie.

Overwogen alternatief: een `loopt`-vlag op `tijdregistraties` zelf. Afgevallen —
een lopende sessie zou dan als 0-minutenrij opduiken in nacalculatie, budget,
klant-urentab, rapportages en facturatie. Vijf bestaande consumenten aanpassen
tegenover nul met een aparte tabel.

### 4.2 Migratie 219 (218 is bezet door de nog te draaien drive-sync)

```sql
CREATE TABLE IF NOT EXISTS tijd_sessies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  medewerker_id UUID,
  medewerker_naam TEXT,
  project_id UUID REFERENCES projecten ON DELETE CASCADE NOT NULL,
  taak_id UUID REFERENCES taken ON DELETE SET NULL,
  omschrijving TEXT,
  gestart_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tijd_sessies_een_per_persoon
  ON tijd_sessies(user_id);
CREATE INDEX IF NOT EXISTS idx_tijd_sessies_project ON tijd_sessies(project_id);
```

- **Eén sessie per persoon is een databaseregel**, geen UI-belofte. Dubbeltellen
  kan technisch niet.
- Org-RLS `FOR ALL USING (organisatie_id = auth_organisatie_id())` volgens het
  patroon van migratie 048. Iedereen in de organisatie ziet elkaars lopende
  sessie; dat is precies de vraag en past bij de productfilosofie.
- `ALTER PUBLICATION supabase_realtime ADD TABLE tijd_sessies` (patroon 035/170).
- Sluit af met de `doen_migraties`-INSERT.

### 4.3 Gedrag (jouw vier keuzes)

1. **Eén tegelijk, auto-uitklokken.** Inklokken op B terwijl A loopt: A wordt
   geboekt, B start. Toast meldt wat er geboekt is.
2. **Alleen start en stop.** Geen pauze. Even weg = uitklokken, later opnieuw
   inklokken; dat geeft twee eerlijke regels.
3. **Auto-stop na 12 uur, nul uren geboekt.** In twee lagen, zodat correctheid
   niet van een cron afhangt: de leeskant toont een sessie ouder dan 12 uur nooit
   meer als lopend maar als "vergeten uit te klokken", en een nachtelijke cron
   ruimt hem op en stuurt de medewerker een notificatie om het handmatig te
   corrigeren. Er wordt in dit geval **geen** tijdregistratie aangemaakt.
4. **Tarief van de medewerker** (`medewerkers.uurtarief`), terugval
   `instellingen.standaard_uurtarief`. `facturabel` standaard aan, achteraf per
   regel uit te zetten op de urenpagina.

### 4.4 UI

**Kaart "Tijd." in de rechterkolom van het project**, onder Team (`ProjectDetail.tsx:2014`):

- staat niemand ingeklokt: knop `Inklokken`
- jij loopt: lopende teller `1:12:04` + knop `Uitklokken`
- collega loopt: `Antony · ingeklokt sinds 09:12 · 1u 12m` met een levende punt
- altijd onderaan: `totaal 6u 30m geboekt` met doorklik naar de urenpagina

De teller telt client-side op vanaf `gestart_op` uit de database, dus refresh,
tweede tabblad en tweede laptop tonen hetzelfde getal. Realtime-abonnement plus
polling-terugval van 30s, zoals `PortaalCompactBlock`.

**Chip in de TopNav** (`TopNav.tsx:337`) zodra je zelf ergens ingeklokt staat:
projectnaam + lopende tijd, klik = naar dat project. Zo vergeet je het niet.

**Activiteitenfeed** krijgt een `tijd`-type: "Antony boekte 1u 12m" na uitklokken.
Afgeleid uit `tijdregistraties`, past in het bestaande `buildActivityFeed`.

Visuele uitwerking volgt `.claude/skills/doen-design/SKILL.md`; geen emoji,
Flame-punt op statuswoorden.

## 5. Fasering

**Fase 1 · fundament + de kaart** (dit is de gevraagde feature)
- `supabase/migrations/219_tijd_sessies.sql`
- `TijdSessie` in `src/types/index.ts`
- `src/services/tijdSessieService.ts` + re-export in de barrel
- `src/hooks/useTijdSessies.ts` (realtime, tikkende teller, 12-uursgrens)
- `src/components/projects/cockpit/TijdCard.tsx`
- inhaken in `ProjectDetail.tsx` (kaart tonen, uren herladen na uitklokken)

**Fase 2 · niet vergeten**
- chip in `TopNav.tsx`
- `tijd`-event in `ActiviteitFeed.tsx`
- `api/cron-tijd-sessies-opruimen.ts` + cron-regel in `vercel.json` (03:30)

**Fase 3 · opruimen**
- de losse React-timer in `TijdregistratieLayout.tsx` vervangen door dezelfde
  gedeelde sessie, zodat er niet twee stopwatches naast elkaar bestaan die
  elkaar niet zien

Fase 3 is de reden dat dit "goed ingebouwd" wordt in plaats van een tweede
mechaniek ernaast. Wil je alleen fase 1 en 2, dan blijft die oude timer bestaan
en dat wordt verwarrend.

## 6. Testen

- `tests/services/tijdSessie.test.ts`: auto-uitklokken boekt de juiste duur;
  tarief valt correct terug; sessie ouder dan 12 uur boekt niets
- `tests/migrations/rlsInvarianten.test.ts` pakt de nieuwe tabel automatisch mee
- poorten: `npm run build`, `npx tsc --noEmit` (aantal fouten niet hoger dan de
  nulmeting vooraf), `npm run typecheck:api` voor de cron, `npm run test:run`

## 7. Aannames, zeg het als een ervan niet klopt

- Inklokken gebeurt **per project**, niet per taak. `taak_id` zit wel in het
  schema zodat dat later kan zonder migratie.
- Iedereen mag zien wie ingeklokt staat; uitklokken kan alleen jezelf.
  Correcties op andermans uren gaan via de bestaande urenpagina.
- De kaart werkt op mobiel, maar er komt in deze fase geen inklokknop op de
  werkbon voor monteurs onderweg.
- Handmatig uren toevoegen blijft waar het is: de urenpagina.
