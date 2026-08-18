# AVG: inzage, uitvoer en verwijdering

Wat er is, waar de grenzen liggen, en wat een verwijderpad moet raken
voordat iemand er een gaat bouwen.

Stand: augustus 2026.

> **Lees dit eerst: de migratiemap is hier geen betrouwbare bron.**
> `supabase/migrations` zegt dat `offerte_items`, `factuur_items`,
> `werkbon_regels` en 34 andere tabellen geen `organisatie_id` hebben.
> In de database hébben ze die kolom wel. Een uitvoer die op de
> migratiemap was gebouwd, had offertes zonder regels en facturen zonder
> regels opgeleverd, en niemand had het gemerkt. Elk getal in dit
> document is daarom tegen de live database gemeten, en bij elke telling
> staat de query waarmee je het zelf nagaat. Andersom geldt hetzelfde:
> migratie 189 (`bedrijfsprofielen`) staat in de map, maar die tabel
> bestaat niet.

## 1. Wat het export-endpoint doet

`api/org-export.ts`, bereikbaar als `GET /api/org-export`. De knop staat
in Instellingen > Bedrijf en is alleen zichtbaar voor een admin.

- Alleen een **admin** van de organisatie. Een monteur krijgt 403.
- De organisatie komt uit `profiles` van de beller. Een `organisatie_id`
  in het verzoek wordt geweigerd, niet genegeerd.
- **99 tabellen.** Dat is alles met een `organisatie_id`-kolom (107 in
  het live schema) min de acht die in paragraaf 2 staan, plus de eigen
  rij uit `organisaties`.
- Eén JSON-document met per tabel de rijen, het aantal rijen per tabel,
  de weggelaten kolomnamen en de uitleg bij wat er niet in zit.
- Twee verzoeken per uur per gebruiker.

Gemeten op de zwaarste organisatie (1909 klanten): 33.682 rijen,
16,0 MB plat JSON, 2,8 MB gecomprimeerd, 21,6 seconden. `maxDuration`
staat op 120.

De tabellenlijst opnieuw afleiden uit de database, bijvoorbeeld na een
migratie:

```sql
select table_name
from information_schema.columns
where table_schema = 'public'
  and column_name = 'organisatie_id'
order by table_name;
```

### Waarom de organisatie-kolom de grens is

Het endpoint werkt met de service-role key en die gaat langs RLS heen. De
enige echte afscherming is dus de `.eq('organisatie_id', ...)` die elke
query meekrijgt. Dat maakt de keuze om alléén tabellen met die kolom te
exporteren geen halve maatregel maar de veilige kant: heeft een tabel de
kolom niet, dan geeft PostgREST fout 42703 in plaats van alle rijen. Het
faalt naar de kant waar niemand data van een andere organisatie ziet.

### Welke kolommen eruit gaan

Het filter werkt op **kolomnaam** en niet op tabelnaam. Een nieuwe tabel
met een geheim erin is dan vanzelf gedekt, ook als niemand een lijst
bijwerkt. De regex:

```
/encrypted|token|password|api_key|secret|sleutel|credential|geheim/i
```

De vier voor de hand liggende woorden (`encrypted`, `token`, `password`,
`api_key`) zijn niet genoeg. `app_settings` bevat namelijk ook:

- `exact_online_client_secret`
- `snelstart_koppelsleutel`

Twee echte geheimen, op `secret` en op het Nederlandse `sleutel`. Vandaar
de aanvulling. Het filter loopt ook door JSONB-velden heen, zodat een
geheim in een genest object niet alsnog meelift.

In de gemeten uitvoer werden 17 kolommen weggelaten:

```
app_settings.eboekhouden_api_token          offertes.publiek_token
app_settings.exact_online_client_secret     offertes.publiek_token_verloopt_op
app_settings.kvk_api_key                    project_portalen.token
app_settings.mollie_api_key                 tekening_goedkeuringen.token
app_settings.moneybird_api_token            tekening_goedkeuringen.token_verloopt_op
app_settings.probo_api_key                  uitnodigingen.token
app_settings.snelstart_koppelsleutel        website_chat_gesprekken.bezoeker_token
facturen.betaal_token                       inkoopfactuur_inbox_config.imap_password_encrypted
facturen.betaal_token_verloopt_op
```

Het filter is ruimer dan strikt nodig, en dat is de bedoeling. Het haalt
ook `publiek_token_verloopt_op` (een datum) en de tellers `input_tokens`
en `output_tokens` weg. Een vervaldatum te veel gewist is hinderlijk, een
geheim te veel meegestuurd is een datalek. De weggelaten kolomnamen staan
in de uitvoer onder `verwijderde_kolommen`, zodat de ontvanger ziet wát
er ontbreekt.

Wat het filter terecht laat staan, ter controle: `klanten.postcode`,
`facturen.factuur_postcode`, `werkbonnen.locatie_postcode`,
`kostenplaatsen.code`, `audit_log.ip_hash`, `klanten.gepinde_notitie`.

## 2. Wat er NIET in de uitvoer zit

### Bestanden in de opslag

**Storage-bestanden zitten niet in de database en dus niet in de
uitvoer.** De verwijzingen (paden en URL's) staan wel in de rijen, de
bytes niet. Dertien buckets, live geteld:

| Bucket | Zichtbaarheid | Aangemaakt in migratie |
|---|---|---|
| `project-fotos` | publiek | 026 / 028 |
| `documenten` | publiek | migration_046, 040 |
| `documenten-prive` | privé | 182 |
| `facturen` | privé | 095 |
| `inkoopfacturen` | privé | migration_050 |
| `email-attachments` | privé | 107 |
| `abonnement-facturen` | privé | 154 |
| `maatjes` | privé | 121 |
| `portaal-bestanden` | privé | 036 |
| `nieuwsbrief-media` | publiek | 181 |
| `avatars` | publiek | **geen** |
| `briefpapier` | publiek | **geen** |
| `factuur-bijlagen` | privé | **geen** (097 verwijst naar "aparte storage-SQL") |

De laatste drie zijn met de hand in het Supabase-dashboard gemaakt. Voor
`avatars` en `briefpapier` bestaat alleen een migratie die de policies
repareert (067, 084), niet één die de bucket aanmaakt. Wie de buckets uit
de migratiemap opsomt, mist ze dus. Dat is precies het soort omissie dat
een verwijderpad stil laat falen: de rijen zijn weg, de bestanden staan er
nog. De lijst live ophalen kan met `storage.listBuckets()` of via
`select id, public from storage.buckets`.

Let ook op de zichtbaarheid: vier buckets zijn publiek. Bestanden daarin
zijn met de URL door iedereen op te halen, ook na het verwijderen van een
account, zolang het bestand zelf er nog staat.

### `emails`

Bewust weggelaten, en de enige grote inhoudelijke uitzondering. De
gesynchroniseerde mailbox is 19.383 rijen, ongeveer 30 MB JSON. Vercel
begrenst het antwoord van een serverless functie op 4,5 MB. Dat past niet,
ook niet gecomprimeerd, en de rest van de uitvoer zou er dan ook niet
meer bij passen. De berichten staan bovendien onveranderd in de mailbox
bij de eigen mailprovider van de klant; doen. houdt daar een kopie van.

Zonder `emails` blijft de uitvoer op 2,8 MB gecomprimeerd. Dat is onder de
grens, maar niet ruim: bij ongeveer 40 procent groei loopt hij ertegenaan.
Het endpoint kiest daarom zelf en zichtbaar:

1. onder 4 MB gaat het antwoord ongecomprimeerd de deur uit;
2. daarboven gzipped (gemeten compressie op deze data: 8,5 keer);
3. past het dan nog niet, dan volgt een 413 met de aantallen per tabel.

Liever een duidelijke fout dan een half bestand dat zich voordoet als een
volledige uitvoer. De structurele oplossing staat in paragraaf 5: uitvoer
naar een bucket schrijven en een signed URL teruggeven. Dan kan `emails`
er ook bij.

### Tabellen zonder `organisatie_id`

Twaalf tabellen missen de kolom en zijn dus niet per organisatie af te
bakenen. Met hun huidige aantal rijen:

| Tabel | Rijen | Hangt aan |
|---|---|---|
| `inkoopfactuur_regels` | 454 | `inkoopfacturen` |
| `email_attachment_cache` | 294 | `emails` (zelf ook niet in de uitvoer) |
| `leads` | 210 | `lead_formulieren` |
| `offerte_opvolg_log` | 134 | `offertes` |
| `portaal_activiteiten` | 92 | `project_portalen` |
| `ingeplande_berichten` | 33 | `emails` |
| `offerte_opvolg_stappen` | 7 | `offerte_opvolg_schemas` |
| `support_berichten` | 6 | `support_gesprekken` |
| `nieuwsbrieven` | 3 | organisatie, via `user_id` |
| `nieuwsbrief_afmeldingen` | 0 | `nieuwsbrieven` |
| `nieuwsbrief_events` | 0 | `nieuwsbrieven` |
| `push_abonnementen` | 0 | `profiles` |

`inkoopfactuur_regels` is hiervan de vervelendste: zonder die regels is
een geëxporteerde inkoopfactuur een kop met een totaal en geen inhoud.
Ze toevoegen kan met een tweede ronde queries op
`inkoopfactuur_id in (...)`, in blokken omdat een URL niet oneindig lang
is. Dat is een bewuste vervolgstap, geen regelwijziging. Het alternatief,
`organisatie_id` aan die tabellen toevoegen en backfillen, is netter en
helpt ook het verwijderpad.

Geen verlies, wel voor de volledigheid: `csp_violations`, `rate_limits` en
`support_presence` zijn techniek, `wachtlijst` is aanmeldingen van vóór
het account, en `emails_list_view` is een view op `emails`.

### Rijen met een lege `organisatie_id`

De selectie gebeurt op `organisatie_id`. Rijen waarin die kolom leeg is
gebleven vallen daarmee buiten élke uitvoer, van welke organisatie ook.
Gemeten, en dus een echt gat in de volledigheid:

| Tabel | Rijen totaal | Zonder `organisatie_id` |
|---|---|---|
| `portaal_reacties` | 139 | **139** |
| `ai_chat_history` | 40 | **40** |
| `ai_usage` | 16 | 15 |
| `werkbon_items` | 80 | 15 |
| `portaal_bestanden` | 30 | 11 |
| `credit_transacties` | 9 | 7 |
| `ai_chats` | 6 | 6 |
| `portaal_items` | 290 | 6 |

Dit vraagt een backfill, niet een ruimere selectie. Alle rijen zonder
`organisatie_id` meenemen zou betekenen dat de ene organisatie de
reacties van de andere in haar uitvoer krijgt. Zoek zoiets op met:

```sql
select count(*) from portaal_reacties where organisatie_id is null;
```

Bij `portaal_reacties` en `ai_chat_history` is het 100 procent van de
rijen: die tabellen zijn nooit gebackfild na het toevoegen van de kolom.

### Inloggegevens

`user_email_settings` en `exact_tokens` gaan er nooit in, ook al hebben ze
inmiddels wel een `organisatie_id`. Het zijn inloggegevens, geen
bedrijfsgegevens, en ze horen per persoon. Wat er na het kolomfilter van
over zou blijven is bovendien een leeg omhulsel.

### Verder weggelaten

- `email_send_idempotency`: technisch logboek tegen dubbele verzending.
- `seo_kansen`: hoort bij de website signcompany.nl, niet bij de app.
- Vier backup-tabellen uit eerdere opschoonacties
  (`klanten_merge_backup_20260722`, `credit_transacties_backup_20260726`,
  `visualizer_credits_backup_20260726`,
  `klanten_debiteurennummer_backup_20260722`). Momentopnames van rijen
  die in hun huidige vorm al in de uitvoer staan.

## 3. Waarom een verwijderpad server-side moet

Niet uit voorkeur, maar omdat een losse `DELETE FROM organisaties`
halverwege stukloopt.

Van de foreign keys naar `organisaties` heeft maar een deel
`ON DELETE CASCADE`. Geteld in de migratiemap, en dus **indicatief**: de
migratiemap bleek over de kolommen al onbetrouwbaar, dus behandel deze
verdeling als een vermoeden en niet als een feit.

| Gedrag | Aantal tabellen (migratiemap) |
|---|---|
| `ON DELETE CASCADE` | 22 |
| `ON DELETE SET NULL` | 0 |
| Geen `ON DELETE`-clausule (dus `NO ACTION`) | 34 |
| Kolom `organisatie_id` zonder enige foreign key | 9 |

Natellen tegen de echte database, want dít is het getal dat telt. Deze
query is de bron, niet de tabel hierboven:

```sql
-- Verdeling van de foreign keys die naar organisaties wijzen
select
  case c.confdeltype
    when 'c' then 'ON DELETE CASCADE'
    when 'n' then 'ON DELETE SET NULL'
    when 'd' then 'ON DELETE SET DEFAULT'
    when 'r' then 'ON DELETE RESTRICT'
    when 'a' then 'geen ON DELETE (NO ACTION)'
  end as gedrag,
  count(*) as aantal,
  string_agg(t.relname, ', ' order by t.relname) as tabellen
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_class f on f.oid = c.confrelid
where c.contype = 'f'
  and f.relname = 'organisaties'
group by 1
order by 2 desc;
```

```sql
-- Tabellen met organisatie_id maar zonder foreign key erop.
-- Hier ruimt Postgres niets voor je op en waarschuwt hij ook niet.
select c.relname as tabel
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
where a.attname = 'organisatie_id'
  and a.attnum > 0
  and not a.attisdropped
  and c.relkind = 'r'
  and n.nspname = 'public'
  and not exists (
    select 1
    from pg_constraint k
    join pg_class f on f.oid = k.confrelid
    where k.contype = 'f'
      and k.conrelid = c.oid
      and a.attnum = any (k.conkey)
      and f.relname = 'organisaties'
  )
order by 1;
```

De drie gevallen lopen elk anders af:

1. **`ON DELETE CASCADE`.** Gaat goed, en dat is meteen het risico: deze
   tabellen zijn stil weg zodra de organisatie-rij weg is. Wie eerst wil
   exporteren en dan verwijderen, heeft na de DELETE geen tweede kans.
2. **Geen `ON DELETE`-clausule.** Dat is `NO ACTION`, en dat betekent geen
   "niets doen" maar "weigeren": de DELETE breekt af op een
   foreign-key-violation zodra er ook maar één `klant`, `offerte` of
   `factuur` aan de organisatie hangt. Een losse DELETE faalt hier dus, en
   faalt halverwege, met de eerste helft misschien al doorgevoerd als
   iemand het per query heeft gedaan in plaats van in één transactie.
3. **Geen foreign key.** Volgens de migratiemap onder andere `audit_log`,
   `kb_articles`, `kb_categories`, `support_gesprekken`, `seo_kansen`,
   `website_aanvragen`, `website_chat_gesprekken`,
   `website_chat_berichten` en `website_chat_aanwezigheid`. Postgres
   controleert hier niets en ruimt hier niets op. Deze rijen blijven staan
   met een `organisatie_id` dat naar niets meer wijst, en niemand krijgt
   daar een foutmelding over. Dit is de gevaarlijkste categorie: het
   lijkt gelukt.

Daar komt bij dat de klant niet alleen in `public` staat: er hangen
`auth.users`-accounts aan de profielen, en die verdwijnen niet mee. Alleen
de service-role key kan die opruimen, dus kan dit niet vanuit de browser.

## 4. Wat een verwijderpad moet raken

In deze volgorde, en per stap met een teller die vastlegt hoeveel rijen er
weg zijn. Anders is achteraf niet te bewijzen dat het gebeurd is.

1. **Bestandspaden eerst oogsten.** De paden staan in de rijen. Verwijder
   je de rijen eerst, dan zijn de bestanden onvindbaar en blijven ze
   staan. Relevante plekken: `documenten`, `factuur_bijlagen`,
   `inkoopfacturen`, `project_fotos`, `werkbon_fotos`,
   `werkbon_afbeeldingen`, `portaal_bestanden`,
   `abonnement_facturen.pdf_storage_path`,
   `facturen.pdf_storage_path`, `profiles` (`avatar_url`, `logo_url`,
   `handtekening_afbeelding`), `app_settings.handtekening_afbeelding`,
   `organisaties.logo_url`, `email_attachment_cache`,
   `signing_visualisaties`.
2. **De 12 tabellen zonder `organisatie_id`** uit paragraaf 2, via de
   id's van hun bovenliggende rij. Eerst controleren welke daarvan al
   cascaden vanaf die ouder: dezelfde query als in paragraaf 3, met
   `f.relname` op `inkoopfacturen`, `offertes`, `project_portalen`,
   `support_gesprekken`, `nieuwsbrieven`, `lead_formulieren`. Wat
   cascadeert hoef je niet zelf te doen, de rest wel.
3. **De 99 tabellen uit `TABELLEN` in `api/org-export.ts`**, plus
   `emails`, `email_send_idempotency`, de vier backup-tabellen en
   `bedrijfsprofielen` als migratie 189 dan gedraaid is. Kinderen voor
   ouders.
4. **`user_email_settings` en `exact_tokens`** voor elke `user_id` in de
   organisatie. Deze hangen aan de persoon, en de tokens moeten ook bij
   de leverancier zelf worden ingetrokken (Exact, Mollie) als dat kan.
5. **Rijen met een lege `organisatie_id`** uit de tabel in paragraaf 2
   zijn hier een probleem: die zijn niet aan een organisatie toe te
   wijzen en blijven dus staan. Backfill vóór de eerste verwijdering, of
   leg vast dat ze bewaard blijven en waarom.
6. **De 13 buckets** uit paragraaf 2, live opgehaald en niet uit deze
   lijst overgeschreven. Let op de padconventies: sommige buckets zijn
   per `user_id` ingedeeld, andere per `organisatie_id`, en `avatars`,
   `briefpapier` en `factuur-bijlagen` hebben geen creatie-migratie
   waarin die conventie is vastgelegd. Voor die drie moet je de indeling
   in de code nazoeken, niet aannemen.
7. **`auth.users`** van elk profiel in de organisatie, via
   `supabaseAdmin.auth.admin.deleteUser`.
8. **`organisaties`** als laatste.
9. **Wat er niet weg mag.** `audit_log` is het bewijs dát er verwijderd
   is. Een logboek dat zichzelf wist is geen logboek. Overweeg de
   audit-regel te bewaren met alleen het organisatie-id, de actie en de
   datum, en dat expliciet in het bewaarbeleid op te nemen. Hetzelfde
   geldt voor `abonnement_facturen`: op facturen zit een fiscale
   bewaarplicht van zeven jaar, die vóór het recht op verwijdering gaat.

Verder, voordat iemand hieraan begint:

- Bouw het als **soft delete met een wachttijd**, niet als directe DELETE.
  Een `verwijderd_op` plus een nachtelijke opruimer is terug te draaien in
  de dagen dat dat nog kan; een DELETE niet.
- Zet de export **verplicht vóór** de verwijdering en bewaar de uitvoer
  buiten de database. Zie categorie 1 in paragraaf 3: na de DELETE is er
  geen tweede kans.
- Eén transactie per stap waar dat kan, en log per stap.
- Test op een kopie. Niet op productie, en niet 's nachts.

## 5. Openstaand

- [ ] `docs/DAAN_KNOWLEDGE.md` regel 1214 tot 1221, de sectie "Hoe
      exporteer ik mijn gegevens?", zegt nu dat een volledige uitvoer via
      antony@signcompany.nl gaat. **Zodra `api/org-export.ts` live staat
      moet die tekst naar de knop in Instellingen > Bedrijf verwijzen**,
      met daarbij eerlijk wat er niet in zit (mailbox en bestanden).
      Zolang de deploy niet gedaan is blijft de tekst staan: hij mag niet
      vooruitlopen op iets dat er nog niet is.
- [ ] Uitvoer naar een bucket met een signed URL. Heft de 4,5 MB-grens
      op, maakt `emails` mogelijk en haalt de tijdsdruk van de functie.
      Vraagt een nieuwe bucket, dus een migratie.
- [ ] `organisatie_id` toevoegen en backfillen op de 12 tabellen uit
      paragraaf 2. Lost het gat in de uitvoer én de helft van het
      verwijderpad op.
- [ ] Backfill van de rijen met een lege `organisatie_id`, te beginnen bij
      `portaal_reacties` (139 van 139) en `ai_chat_history` (40 van 40).
- [ ] Verwijderpad. Ontwerp staat hierboven, bouwen is niet gebeurd.
- [ ] Bewaartermijnen. De AVG vraagt niet alleen om uitvoer en
      verwijdering op verzoek, maar ook om niet eeuwig bewaren zonder
      grondslag. Er is nu geen enkele automatische opschoning.
- [ ] Verwerkersovereenkomst en de lijst subverwerkers (Supabase, Vercel,
      Resend, Mollie, Anthropic, Upstash, Sentry) horen bij dit dossier,
      maar staan hier nog niet in.
