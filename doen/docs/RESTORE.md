# Herstel na dataverlies

> Aangemaakt tijdens de auditronde van 12 aug 2026. Aanleiding: in de hele repo
> stond nul over backups. De enige drie treffers op "runbook" waren eerdere
> audits die constateerden dat het ontbrak.

Dit document is bewust kort. Een draaiboek dat niemand leest helpt niet.

## Wat wel en niet reproduceerbaar is

| | Reproduceerbaar | Hoe |
|---|---|---|
| Schema | **nee** | de migratiemap is onvolledig, zie hieronder |
| Data | **nee** | alleen uit een backup |
| Storage-bestanden | **nee** | en die zitten **niet** in een Postgres-backup |

Drie dingen om te weten voordat je erop vertrouwt.

**Het schema is niet uit de map te herbouwen.** Het scherpste bewijs:
**geen enkele migratie maakt de tabel `organisaties` aan.**
`030_create_organisaties_uitnodigingen.sql` opent met
`ALTER TABLE organisaties ADD COLUMN`, met de comment "tabel bestaat mogelijk
al". Een herbouw op een lege database sterft dus al bij 030.

Daarnaast loopt de map uit de pas met de database:
`072_rls_batch2_referentie.sql:62` maakt een policy op tabel `grootboek`, terwijl
`001_create_all_tables.sql:409` `grootboeken` aanmaakt; `047:23,54` en `078:18`
verwijzen naar een tabel `events` die geen migratie aanmaakt. Die statements
hadden moeten falen.

**Er is geen bijgehouden migratie-administratie.** Geen enkele migratie schrijft
naar `schema_migrations`, terwijl `CLAUDE.md` je wél opdraagt die tabel te
checken voor het volgende vrije nummer. Een Supabase-project heeft altijd
`supabase_migrations.schema_migrations`, maar bij handmatig plakken in de SQL
Editor blijft die leeg of stale. Ga er dus niet van uit dat je eruit kunt
aflezen wat gedraaid is; controleer per geval met een `SELECT` op
`pg_policies` / `information_schema`.

**Storage staat los van de database.** Een restore brengt de rijen terug die naar
bestanden verwijzen, niet de bestanden zelf.

Belangrijk bij een herbouw naar een vers project: **niet elke bucket wordt door
een migratie aangemaakt.** `avatars` is er zeker één (gelezen via
`profielService.ts:65,71`, nergens aangemaakt). Tel de buckets daarom niet uit de
map, maar lijst ze uit de database en vergelijk:

```sql
select id, name, public from storage.buckets order by name;
```

Buckets die alleen in code voorkomen moet je bij een herbouw met de hand
aanmaken, inclusief de juiste `public`-vlag; anders faalt de eerste upload pas
maanden later. Padconventies om per organisatie terug te zoeken: `facturen` =
`{organisatie_id}/{factuur_id}.pdf`
(`095_facturen_pdf_storage_exact_bijlage.sql:32`), `maatjes` = eerste map in het
pad is de `organisatie_id` (`121:85`).

## Stap 0, eenmalig: zet PITR aan en test het

**Dit is nog niet gedaan.** Of Point-in-Time Recovery aanstaat is niet uit de repo
te bepalen (er is geen `config.toml`). Controleer het in het Supabase-dashboard
onder Database → Backups.

Zonder PITR heb je alleen de dagelijkse snapshot van je plan. Bij het huidige
volume is een dag verlies overkomelijk maar niet leuk; het wordt pijnlijker per
klant die erbij komt.

Doe daarna één keer een echte restore-test. Een backup die nooit is
teruggezet is een aanname, geen backup. Herstel naar een **nieuw** project, niet
over productie heen.

Noteer eerst de stand op productie, dan die op de restore, en vergelijk de twee.
Vaste getallen in dit document zouden binnen een week verouderd zijn.

```sql
select 'facturen' as tabel, count(*) from facturen
union all select 'offertes',      count(*) from offertes
union all select 'klanten',       count(*) from klanten
union all select 'projecten',     count(*) from projecten
union all select 'organisaties',  count(*) from organisaties;

select max(datum) from ai_briefings;   -- draait de nachtploeg nog?
```

Schrijf beide uitkomsten en de datum onderaan dit bestand.

## Herstelscenario's

### A. Iemand heeft rijen verwijderd binnen één organisatie

Meest waarschijnlijke geval. Elk teamlid heeft `DELETE` op vrijwel alle
org-tabellen, en migratie 111 laat DELETE bewust open (alleen INSERT en UPDATE
zijn achter de abonnementscheck gezet).

1. Bepaal het tijdstip zo nauw mogelijk. Reken er niet op dat
   `audit_log_feature` je dat vertelt. Drie redenen, oplopend in ernst:
   het dekt maar 7 entiteiten en 6 acties (`088:23-24`, `089:16-18`);
   verwijderingen staan er de facto niet in, want de toegestane waarde
   `'verwijderd'` wordt door geen enkele `logWijziging`-aanroep gebruikt;
   en `ProjectsList.tsx:788` logt `actie: 'datum_gewijzigd'`, een waarde die
   **niet** in de CHECK van `088:24` staat. Die insert faalt op de constraint en
   wordt stil geslikt (`auditLogger.ts:82` gooit nooit,
   `profielService.ts:680` doet alleen `console.warn`). Er kunnen dus gaten in
   de log zitten zonder dat iemand het ooit heeft gezien.
2. Restore naar een **apart** project op een tijdstip vóór de verwijdering.
3. Haal daar alleen de betrokken rijen uit en zet die terug in productie. Doe
   dit per tabel in FK-volgorde: eerst `klanten` en `projecten`, dan `offertes`
   en `facturen`, dan de regeltabellen.

Zet nooit een volledige restore over productie heen voor het herstel van één
organisatie. Je verliest dan alles wat de andere organisaties sinds dat tijdstip
hebben gedaan.

### B. Een organisatie is als geheel verwijderd

**Zodra migratie `190` gedraaid is** kan dit niet meer vanuit de app: het
DELETE-recht op `organisaties` is dan ingetrokken. Controleer dat ter plekke, want
190 draait handmatig en er is geen administratie om het aan af te lezen:

```sql
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'organisaties';
-- geen rij met cmd = 'DELETE' betekent: 190 is gedraaid
```

Ook vóór 190 was het in de praktijk beschermd door foreign keys. De kerntabellen
(klanten, projecten, offertes, facturen, werkbonnen) verwijzen naar
`organisaties(id)` **zonder** `ON DELETE`-clausule (`047:14-20`), dus NO ACTION,
en Postgres blokkeert de delete zodra er één rij aan hangt.

Gebeurt het toch via de service-role, let dan op de asymmetrie: de tabellen met
`ON DELETE CASCADE` zijn leeg, de tabellen zonder staan er nog met een
`organisatie_id` die naar niets meer wijst. Welke welke zijn:

```sql
select conrelid::regclass as tabel, confdeltype
from pg_constraint
where contype = 'f' and confrelid = 'public.organisaties'::regclass
order by confdeltype, tabel;
-- 'c' = CASCADE (weg), 'a' = NO ACTION (staat er nog)
```

Herstel dan de `organisaties`-rij met hetzelfde `id` en de cascade-tabellen uit
de backup; de rest sluit daarna automatisch weer aan.

### C. Een migratie heeft schade aangericht

`supabase/rollbacks/` bevat 19 schema-rollbacks. Twee datamigraties hebben een
eigen backup-tabel gemaakt en dat is het goede patroon:
`klanten_merge_backup_20260722` (`156:21`, met restore-instructie op `:488`) en
`klanten_debiteurennummer_backup_20260722` (`157:20`).

Twee migraties hebben dat **niet** gedaan en zijn dus niet terug te draaien
zonder backup: `migration_041_fix_import_system.sql:10-16` verwijdert rijen uit
vijf kerntabellen op `import_bron = 'james_pro'` en dropt daarna de kolom waarop
gefilterd werd, en `058_offerte_nummer_unique.sql:9` verwijdert alle offertes
zonder nummer, zonder transactie.

Regel voor nieuwe datamigraties: maak eerst een `*_backup_<datum>`-tabel, zet de
restore-query in een comment, en draai de migratie in één `BEGIN/COMMIT`.

## Wat dit draaiboek niet dekt

- **Trigger.dev** deployt niet mee met Vercel. Na een herstel van de repo moet
  `npx trigger.dev@latest deploy` opnieuw, anders draaien de achtergrondjobs op
  oude code zonder dat iemand het merkt. Er staan 13 taakdefinities in
  `src/trigger/`, waarvan `example.ts` boilerplate is;
  `trigger.config.ts:5` spreekt zelf van twaalf.
- **Secrets** staan in Vercel en in het Trigger.dev-dashboard, niet in de repo.
  `EMAIL_ENCRYPTION_KEY` en `INTEGRATION_ENCRYPTION_KEY` zijn hierbij het
  belangrijkst: raken die kwijt, dan zijn alle mailwachtwoorden en
  boekhoudtokens onleesbaar en moet elke klant opnieuw koppelen. Er is geen
  sleutelrotatiepad; `scripts/hersleutel-mailwachtwoorden.mjs` migreert alleen
  het *formaat*, met dezelfde sleutel.
- Ongeveer dertien env-vars die de code gebruikt staan niet in `.env.example`,
  waaronder `NIEUWSBRIEF_WEBHOOK_TOKEN`, `SNELSTART_SUBSCRIPTION_KEY` en
  `SENTRY_DSN`. Een verse deploy mist die stil. Vertrouw niet op een
  `process.env`-grep om ze te vinden: `TRIGGER_SECRET_KEY` staat ook niet in
  `.env.example` en wordt impliciet door de Trigger.dev-SDK gelezen, dus die
  komt in zo'n grep niet voor. Vergelijk bij een herbouw de Vercel- en
  Trigger.dev-omgevingen naast elkaar, niet de code.

## Log van restore-tests

| Datum | Door | Scenario | Uitkomst |
|---|---|---|---|
| _nog geen test uitgevoerd_ | | | |
