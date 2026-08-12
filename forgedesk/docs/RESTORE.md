# Herstel na dataverlies

> Aangemaakt tijdens de auditronde van 12 aug 2026. Aanleiding: in de hele repo
> stond nul over backups. De enige drie treffers op "runbook" waren eerdere
> audits die constateerden dat het ontbrak.

Dit document is bewust kort. Een draaiboek dat niemand leest helpt niet.

## Wat wel en niet reproduceerbaar is

| | Reproduceerbaar | Hoe |
|---|---|---|
| Schema | **ja** | 217 migraties in `supabase/migrations/` |
| Data | **nee** | alleen uit een backup |
| Storage-bestanden | **nee** | en die zitten **niet** in een Postgres-backup |

Twee dingen om te weten voordat je erop vertrouwt.

**Het schema in de bestanden is niet gelijk aan de database.** Er is geen
`schema_migrations`-tabel en geen enkele migratie schrijft erin, dus er is geen
machine-leesbare administratie van wat gedraaid is. Aantoonbaar uit de pas:
`072_rls_batch2_referentie.sql:62` maakt een policy op tabel `grootboek`, terwijl
`001_create_all_tables.sql:409` `grootboeken` aanmaakt; `047` en `078` verwijzen
naar een tabel `events` die geen migratie aanmaakt. Die statements hadden moeten
falen. Een schema-herbouw puur uit de map levert dus niet de huidige database op.

**Storage staat los.** Tien buckets, waarvan `documenten`, `project-fotos`,
`portaal-bestanden` en `nieuwsbrief-media` publiek. Een database-restore brengt
de rijen terug die naar bestanden verwijzen, niet de bestanden zelf. Padconventies
die je nodig hebt om per organisatie terug te zoeken: `facturen` =
`{organisatie_id}/{factuur_id}.pdf` (`095:32`), `maatjes` = eerste map in het pad
is de `organisatie_id` (`121:85`).

## Stap 0, eenmalig: zet PITR aan en test het

**Dit is nog niet gedaan.** Of Point-in-Time Recovery aanstaat is niet uit de repo
te bepalen (er is geen `config.toml`). Controleer het in het Supabase-dashboard
onder Database → Backups.

Zonder PITR heb je alleen de dagelijkse snapshot van je plan. Met 163 facturen en
196 offertes is een dag verlies overkomelijk maar niet leuk; het wordt pijnlijker
per klant die erbij komt.

Doe daarna één keer een echte restore-test. Een backup die nooit is
teruggezet is een aanname, geen backup. Herstel naar een **nieuw** project, niet
over productie heen, en controleer daar:

```sql
select count(*) from facturen;      -- verwacht ~163
select count(*) from offertes;      -- verwacht ~196
select count(*) from organisaties;
select max(datum) from ai_briefings;
```

Schrijf de uitkomst en de datum onderaan dit bestand.

## Herstelscenario's

### A. Iemand heeft rijen verwijderd binnen één organisatie

Meest waarschijnlijke geval. Elk teamlid heeft `DELETE` op vrijwel alle
org-tabellen, en migratie 111 laat DELETE bewust open (alleen INSERT en UPDATE
zijn achter de abonnementscheck gezet).

1. Bepaal het tijdstip zo nauw mogelijk. `audit_log_feature` kan helpen, maar
   dekt alleen 7 entiteiten en 6 acties, en verwijderingen worden in de praktijk
   **niet** gelogd: de waarde `'verwijderd'` is toegestaan maar er is geen enkele
   `logWijziging`-aanroep die hem gebruikt.
2. Restore naar een **apart** project op een tijdstip vóór de verwijdering.
3. Haal daar alleen de betrokken rijen uit en zet die terug in productie. Doe
   dit per tabel in FK-volgorde: eerst `klanten` en `projecten`, dan `offertes`
   en `facturen`, dan de regeltabellen.

Zet nooit een volledige restore over productie heen voor het herstel van één
organisatie. Je verliest dan alles wat de andere organisaties sinds dat tijdstip
hebben gedaan.

### B. Een organisatie is als geheel verwijderd

Sinds migratie `190` kan dit niet meer vanuit de app: het DELETE-recht op
`organisaties` is ingetrokken. Voor 190 was het theoretisch mogelijk, maar in de
praktijk beschermd door foreign keys: van de 77 FK's naar `organisaties(id)`
hebben 21 `ON DELETE CASCADE` en **56 geen `ON DELETE`-clausule**. Postgres
blokkeert de delete daarop.

Gebeurt het toch via de service-role, let dan op de asymmetrie: de 21
cascade-tabellen zijn leeg, de 56 andere staan er nog met een `organisatie_id`
die naar niets meer wijst. Herstel dan de `organisaties`-rij met hetzelfde `id`
en de cascade-tabellen uit de backup; de rest sluit daarna automatisch weer aan.

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
  `npx trigger.dev@latest deploy` opnieuw, anders draaien de 13 jobs op oude code
  zonder dat iemand het merkt.
- **Secrets** staan in Vercel en in het Trigger.dev-dashboard, niet in de repo.
  `EMAIL_ENCRYPTION_KEY` en `INTEGRATION_ENCRYPTION_KEY` zijn hierbij het
  belangrijkst: raken die kwijt, dan zijn alle mailwachtwoorden en
  boekhoudtokens onleesbaar en moet elke klant opnieuw koppelen. Er is geen
  sleutelrotatiepad; `scripts/hersleutel-mailwachtwoorden.mjs` migreert alleen
  het *formaat*, met dezelfde sleutel.
- 14 env-vars die de code gebruikt staan niet in `.env.example`, waaronder
  `NIEUWSBRIEF_WEBHOOK_TOKEN`, `SNELSTART_SUBSCRIPTION_KEY` en `SENTRY_DSN`. Een
  verse deploy mist die stil.

## Log van restore-tests

| Datum | Door | Scenario | Uitkomst |
|---|---|---|---|
| _nog geen test uitgevoerd_ | | | |
