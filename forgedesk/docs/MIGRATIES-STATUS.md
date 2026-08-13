# Migraties 190 en verder — wat is gedraaid en wat niet

> Opgeschreven in de auditronde van 12 aug 2026. Reden: er is geen bijgehouden
> migratie-administratie, dus zonder dit bestand is niet af te lezen wat er
> live staat. Migratie 198 lost dat structureel op.

## Gedraaid op productie

Deze drie zijn op 12 aug door Antony in de Supabase SQL Editor gedraaid, met de
verificatie-output teruggelezen. Ze zijn dus **klaar, niet opnieuw draaien**
(hoewel ze idempotent zijn).

| Migratie | Wat | Bevestigd door |
|---|---|---|
| `190_organisatie_delete_intrekken.sql` | DELETE-recht op `organisaties` ingetrokken | drie policies over, geen enkele met `cmd = DELETE` |
| `192_organisatie_id_backfill.sql` | `organisatie_id` gevuld via `profiles` | `emails_zonder_org` en `notificaties_zonder_org` beide 0 |
| `195_legacy_user_policies_droppen.sql` | 49 legacy user_id-policies gedropt over 23 tabellen | 0 overgeslagen, `legacy_policies_over` = 0. **LET OP: deze migratie had een fout, zie hieronder.** |

Effect daarvan: de abonnementsvergrendeling uit migratie 111 werkt sindsdien
echt. Die was ruim een jaar omzeilbaar omdat migratie 048 policynamen dropte die
nergens werden aangemaakt.

### Migratie 195 had een fout, en die heeft schade gedaan

De guard in 195 dropte een legacy-policy zodra de tabel daarna nog **een**
permissieve policy met `organisatie_id` overhield. Die guard toetste
**bestaan**, niet **dekking**. Op `emails` was de overgebleven policy
"Team-leden zien mails via project-koppeling": alleen `SELECT`, en alleen als
`thread_id` via `email_project_koppelingen` aan een project hangt.

Gevolg op productie, gemerkt op 13 aug: van 13.982 inbox-rijen was alleen nog
projectmail zichtbaar. En omdat de gedropte policy `FOR ALL` was, verdwenen ook
`UPDATE` en `DELETE`: gelezen markeren, sterren, snoozen en verwijderen faalden
stil. De sync bleef intact, want die draait als `service_role` en omzeilt RLS,
dus de mail kwám binnen en was alleen onzichtbaar. Dat maakte het lastig te
herkennen.

Herstel: **migratie 203**. Gedraaid en bevestigd, de inbox werkt weer.

Wat hieruit volgt en wat je moet weten voordat je nog eens policies dropt:

- **Een policy met `EXISTS` erin is een uitzondering, geen algemene toegang.**
  Dat onderscheid ontbrak in de guard.
- **Een test kan dit niet vangen.** 195 dropt via dynamische SQL in een lus over
  `pg_policies`, dus welke policies verdwijnen hangt af van wat er op dat moment
  in de database staat. `tests/migrations/rlsInvarianten.test.ts` vangt een
  ander, smaller geval en zegt dat er nu ook zo bij.
- **Draai `docs/rls-dekking.sql` na elke migratie die policies dropt.** Dat is
  de enige sluitende controle. Hij toont per tabel welke van de vier opdrachten
  geen dekking meer heeft.
- **De blast radius is compleet nagelopen en `emails` was het enige slachtoffer.**
  Niet alleen voor `SELECT`: migratie 048 maakt 25 policies en die zijn állemaal
  `FOR ALL USING (organisatie_id = auth_organisatie_id())`, op precies de
  tabellen die 195 raakte. Daar dekte de overlevende policy dus alle vier de
  opdrachten en was droppen inderdaad veilig, zoals de guard aannam.

  `emails` staat niet in die 048-lijst. Daar was de enige policy met
  `organisatie_id` de project-koppeling: alleen `SELECT`, en met een `EXISTS`.
  Eén tabel viel buiten het patroon, en dat was precies de tabel waar de guard
  blind voor was.

  Bij de eerste controle leek het om elf tabellen te gaan. Tien daarvan waren een
  fout in de meetquery zelf: omgekeerde operanden (`auth.uid() = user_id`),
  afwijkende kolomnamen (`gebruiker_id`, en bij `organisaties` gewoon `id`), en
  `service_role` niet herkend als bewuste keuze. Die drie valkuilen staan in
  `docs/rls-dekking.sql` verwerkt.

## Alleen lezen, veilig, mag altijd

| Migratie | Wat |
|---|---|
| `191_organisatie_id_diagnose.sql` | telt rijen zonder `organisatie_id`. Wijzigt niets. |
| `194_legacy_user_policies_dryrun.sql` | laat zien wat 195 zou droppen. Wijzigt niets. |

## Nog te draaien

**Volgorde maakt hier uit.** Draai ze in deze volgorde en plak de
verificatie-output terug.

Alles staat op branch **`audit/integratie`** (77 commits). `main` is onaangeroerd.

| # | Migratie | Waarom | Breekt er iets als je hem NIET draait? |
|---|---|---|---|
| 1 | `196_organisatie_id_default.sql` | `organisatie_id` krijgt `DEFAULT auth_organisatie_id()` op 24 tabellen. Dicht het lek waardoor `getOrgId()` een rij met `NULL` kon wegschrijven, die daarna voor niemand zichtbaar is. Geen `NOT NULL`, dus geen enkel insert-pad breekt. | Nee. Het lek blijft dan open. |
| 2 | `197_inkoopfacturen_referentie_kenmerk.sql` | Twee kolommen voor het projectvoorstel op inkoopfacturen. | Nee. De extractie valt terug op een update zonder die velden; de ruwe waarden staan in `raw_extractie_json`. |
| 3 | `198_doen_migraties_administratie.sql` | Maakt de tabel die dit document overbodig maakt. **Draai deze vóór 199 t/m 202**: die eindigen op een INSERT hierin. | Nee, maar dan faalt de laatste regel van elke volgende migratie. Onschadelijk, wel rommelig. |
| 4 | `199_rapportage_aggregatie_views.sql` | Zeven aggregatie-views voor de rapportages, elk met `security_invoker = on`. | Nee. De pagina's rekenen nu via paginatie en zijn correct zonder deze views; ze staan klaar als volgende stap. |
| 5 | `200_feature_flags.sql` | De uitzetknop. **Nodig voor 6 en 7**, want die twee hangen eraan. | Nee. Zonder rijen is elke vlag `onbekend`, en dat is precies het gedrag van vandaag. |
| 6 | `201_support_toewijzing.sql` | Toewijzing van supportgesprekken, met een trigger die de klant belet zichzelf een medewerker toe te wijzen. | Nee. Het endpoint probet de kolom en het schrijfpad geeft 503 met een eerlijke melding. |
| 7 | `202_mailsync_taken.sql` | De mailsync-wachtrij. | Nee. Zonder tabel én zonder vlagrij verandert er niets aan de mailsync. |

## De twee vlaggen staan UIT, en dat is opzet

`mailsync_queue` en `offline_queue` komen slapend mee. Zolang er geen rij in
`feature_flags` staat gedraagt de app zich exact zoals vandaag; dat is per pad
nagelopen en in tests vastgelegd. Zet ze pas aan als je dit hebt gedaan:

**Vóór `offline_queue`:** test met de hand op een iPhone of "Opslaan op telefoon"
echt een bestand oplevert. Dat is de ontsnappingsroute voor een vastgelopen foto,
en met `capture="environment"` is die foto de enige kopie. Werkt die knop niet,
dan is de uitweg er niet.

**Vóór `mailsync_queue`:** controleer of migratie **038** en **131** echt in de
database staan. Daar hangt de hele analyse aan. Staat 131 er niet, dan lopen
mailboxen permanent in bootstrap-modus, en dat is het verschil tussen "uitzetten
doet niets" en "dupliceert elke drie minuten". Weet ook dat aanzetten omkeerbaar
is voor het gedrag maar niet volledig voor de data: mails zonder Message-ID
krijgen een gesynthetiseerd id dat blijft staan. En er is nog geen zichtbaarheid:
een mailbox die vastloopt geeft een regel in de Vercel-logs en verder niets.
Houd de pilot daarom op één organisatie.

## Waarom 193 mist

Er is geen 193. Dat nummer was gereserveerd voor een `NOT NULL` op
`organisatie_id`, en die is **bewust niet gebouwd**: 9 van de 12 bestanden die in
`notificaties` inserten zetten die kolom niet, waaronder `mollie-webhook`,
`portaal-reactie`, `offerte-accepteren` en `goedkeuring-reactie`. Een blanket
constraint had het klantportaal- en betalingsmeldingspad omgelegd. Migratie 196
lost hetzelfde probleem op met een default in plaats van een verplichting.

## Vanaf 203

Houd `doen_migraties` bij: één INSERT-regel onderaan elke nieuwe migratie. 199
t/m 202 doen dat al. Dan is dit bestand geschiedenis en hoef je nooit meer te
gokken.

Verder blijft gelden wat in `CLAUDE.md` staat: neem het eerstvolgende vrije
nummer op basis van de bestandsnamen, gebruik alleen het `NNN_`-schema, en
verifieer ná het draaien tegen de database in plaats van tegen de migratiemap.
Die map beschrijft de database niet: `072:62` maakt een policy op `grootboek`
terwijl `001:409` `grootboeken` aanmaakt, `047`/`078` noemen een tabel `events`
die niemand aanmaakt, en `organisaties` wordt door geen enkele migratie
aangemaakt.
