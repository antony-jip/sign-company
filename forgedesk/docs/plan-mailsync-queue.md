# Mailsync naar een queue

Implementatieklaar ontwerp. Geen code gewijzigd, geen database bevraagd. Alle
beweringen over de huidige situatie staan met `bestand:regel` erbij, zodat de
bouwsessie ze niet opnieuw hoeft op te zoeken.

Waarom dit een ontwerp is en geen bouw: dit is het pad waarlangs de mail van een
echt bedrijf binnenkomt, `api/*` is lokaal niet te draaien met plain `vite`, en
een blinde herschrijving is hier het grootste risico van de hele roadmap.

---

## 1. Wat er nu staat, gemeten

### 1.1 Hoe sync wordt getriggerd

Er zijn drie triggers, en ze draaien alle drie tegelijk. Dat is de kern van het
probleem.

| Trigger | Frequentie | Bestand |
| --- | --- | --- |
| Vercel cron | elke 3 minuten | `vercel.json:56-59` (`*/3 * * * *` op `/api/cron-email-sync`) |
| UI-poll | desktop 180s, mobiel 90s | `src/components/email/EmailLayout.tsx:1571` (`const tempo = isDesktop ? 180_000 : 90_000`) |
| Tab weer in beeld | drempel desktop 60s, mobiel 15s | `src/components/email/EmailLayout.tsx:1595-1598` |

Daarnaast de handmatige verversknop en de eerste load, beide via
`handleRefresh` · `src/components/email/EmailLayout.tsx:1209-1214`.

Alle vier de wegen komen uit op hetzelfde endpoint: `POST /api/fetch-emails`
(`src/services/gmailService.ts:360`). De cron roept dat endpoint over HTTP aan
in plaats van de IMAP-logica te kopiëren, omdat `api/*`-bestanden niets uit
`src/` mogen importeren (`CLAUDE.md:61`, en de motivatie staat in
`api/cron-email-sync.ts:9-11`).

`maxDuration`:

- `api/cron-email-sync.ts`: **60 seconden** · `vercel.json:47` en
  `api/cron-email-sync.ts:102`.
- `api/fetch-emails.ts`: **60 seconden** · `api/fetch-emails.ts:202`. Staat niet
  in de `functions`-blok van `vercel.json`, dus de `export const config` doet
  hier het werk.

De cron houdt zelf een zachtere deadline aan: `DEADLINE_MS = 50_000`
(`api/cron-email-sync.ts:35`), bewust onder de 60 zodat de samenvatting nog
terugkomt.

Binnen `fetch-emails` zitten nog twee eigen zachte deadlines voor de
nabewerking: `MATCH_DEADLINE_MS = 10_000` voor de sales-sweep
(`api/fetch-emails.ts:625`) en `LEAD_DEADLINE_MS = 8_000` voor de lead-sweep
(`api/fetch-emails.ts:706`).

Het `snel`-vlaggetje slaat die twee sweeps over (`api/fetch-emails.ts:217`,
`629`, `707`). Mobiel vraagt altijd de snelle variant, desktop niet:
`!isDesktopRef.current` · `src/components/email/EmailLayout.tsx:401`. De cron
vraagt hem bewust niet, zodat de sweeps daar landen waar niemand op wacht
(`api/cron-email-sync.ts:158-160`).

### 1.2 Het watermerk: ná het verwerken, en dat is de goede kant

Het watermerk is `email_sync_state.last_seen_uid`, per `(user_id, folder)`
(`supabase/migrations/131_email_sync_state.sql:12-26`). De tabel houdt ook
`uidvalidity` bij, zodat een UIDVALIDITY-wissel op de server tot een
re-bootstrap leidt in plaats van tot verkeerde UID's
(`api/fetch-emails.ts:300-307`).

De volgorde in een incrementele run:

1. lees `last_seen_uid` · `api/fetch-emails.ts:289-294`
2. zoek UID's boven de waterlijn, sorteer oplopend · `api/fetch-emails.ts:324-329`
3. haal berichten op, houd `maxUidGezien` bij · `api/fetch-emails.ts:349-360`
4. upsert in `emails`, in batches van 50 · `api/fetch-emails.ts:476-488`
5. **schuif het watermerk pas hierna op** · `api/fetch-emails.ts:577-597`

Stap 5 staat achter een expliciete poort:

```ts
if (errors.length === 0 && (maxUidGezien > 0 || !stateBruikbaar)) {
```

`api/fetch-emails.ts:577`. Het commentaar erboven (`:574-576`) benoemt precies
waarom: schuift de waterlijn op terwijl de upsert faalde, dan valt die mail bij
de volgende run buiten het incrementele venster en verdwijnt hij stil.

**Gedrag bij een crash halverwege.** Sterft de functie tussen stap 2 en stap 5,
dan is het watermerk niet opgeschoven en haalt de volgende run exact dezelfde
UID-verzameling opnieuw op. Die tweede keer wordt gededupliceerd door de
upsert met `onConflict: 'user_id,message_id'` en `ignoreDuplicates: true`
(`api/fetch-emails.ts:484-487`), gedekt door een echte unique constraint
(`supabase/migrations/038_fix_email_unique_constraint.sql:11-12`).

Netto: **at-least-once ophalen, exactly-once rij.** Een crash dupliceert dus
niet en maakt niets kwijt. Dat is de goede kant om op te falen, en het is de
belangrijkste eigenschap die het queue-ontwerp niet mag breken.

Er zijn twee uitzonderingen op die garantie, beide gemeten:

**(a) Mail zonder Message-ID dupliceert wel.** De constraint is
`UNIQUE (user_id, message_id)` zonder `NULLS NOT DISTINCT`, en migratie 038
zegt dat zelf: "NULLs in message_id worden door PostgreSQL als distinct
behandeld, dus dit blokkeert geen inserts met NULL message_id"
(`supabase/migrations/038_fix_email_unique_constraint.sql:9-10`). De code zet
`message_id: messageId || null` (`api/fetch-emails.ts:386`). De
per-rij-fallback verderop dedupliceert zulke mail wel, op `uid + imap_folder`
(`api/fetch-emails.ts:524-542`), maar die fallback draait alleen als de
batch-upsert al gefaald is (`api/fetch-emails.ts:496-499`). In het normale pad
levert elke herhaalde ophaal van een bericht zonder Message-ID dus een nieuwe
rij op.

**(b) Het watermerk schuift op basis van een verouderde lezing.** De nieuwe
waarde is `Math.max(oude gelezen waarde, maxUidGezien)`
(`api/fetch-emails.ts:578`), waarbij de oude waarde uit stap 1 komt. Bij twee
overlappende runs kan dat de waterlijn omlaag zetten: run A leest 100, run B
leest 100 en schrijft 150, run A schrijft daarna `max(100, 120) = 120`. Geen
dataverlies (de volgende run haalt 121 tot 150 opnieuw op en dedupliceert),
maar de `Math.max` is geen echte monotone garantie. Dat zou
`last_seen_uid = GREATEST(last_seen_uid, $1)` in één UPDATE moeten zijn, wat
PostgREST niet kan uitdrukken en dus een RPC vraagt.

### 1.3 Twee gelijktijdige syncs van dezelfde mailbox

**Er is geen slot. Nergens.** `grep` op `pg_try_advisory`, `advisory_lock` en
`FOR UPDATE SKIP LOCKED` over `supabase/`, `api/` en `src/` geeft nul treffers.

Twee gelijktijdige syncs van dezelfde mailbox zijn niet uitzonderlijk maar de
norm: de cron tikt elke 3 minuten (`vercel.json:58`) en de mobiele UI-poll elke
90 seconden (`src/components/email/EmailLayout.tsx:1571`). Wie de app openheeft,
heeft structureel overlap.

Wat er dan gebeurt:

- Beide runs openen hun eigen IMAP-verbinding naar dezelfde mailbox
  (`api/fetch-emails.ts:257-268`). Elf `api/`-endpoints openen IMAP-verbindingen
  (`ImapFlow`-treffers in `api/fetch-emails.ts`, `read-email.ts`,
  `backfill-emails.ts`, `email-imap-action.ts`, `prefetch-email-bodies.ts`,
  `classificeer-aanvraag.ts`, `email-attachment.ts`, `test-email-connection.ts`,
  `inkoopfactuur-sync.ts`, `inkoopfactuur-test-connection.ts`,
  `inkoopfactuur-save-config.ts`), dus het verbindingsbudget van de mailserver
  is een gedeelde, ongecoördineerde bron.
- Beide zoeken hetzelfde UID-venster op en halen dezelfde berichten op. Dubbel
  IMAP-werk, dubbele bandbreedte.
- De rijen blijven correct: de upsert dedupliceert op `(user_id, message_id)`
  (`api/fetch-emails.ts:484-487`), behalve voor de mail zonder Message-ID uit
  1.2(a).
- Het watermerk kan tijdelijk terugzakken, zie 1.2(b).
- **De pushmelding kan verdwijnen.** De cron stuurt alleen een melding als zijn
  eigen `synced` groter dan nul is (`api/cron-email-sync.ts:170`). Heeft de
  UI-poll de mail net weggeschreven, dan telt de cron nul nieuwe rijen (want
  `select()` op de upsert telt alleen echt ingevoegde rijen,
  `api/fetch-emails.ts:488-491`) en blijft de melding weg.
- De enige rem is een rate limit van 30 verzoeken per 60 seconden per gebruiker
  (`api/fetch-emails.ts:232`), en die is een teller, geen slot. Bovendien is
  niet zeker dat hij werkt: de helper is fail-open (`data === true` of anders
  niet gelimiteerd, `api/fetch-emails.ts:11-14`) en migratie 145 zegt zelf dat
  de tabel eerder nooit in productie stond
  (`supabase/migrations/145_rate_limits_functioneel_en_hardened.sql:2-7`).

### 1.4 Hoeveel accounts past er in één run, en wat als de tijd om is

Per ronde: **8 accounts.** `MAX_PER_RONDE = 8` · `api/cron-email-sync.ts:33`.
De accounts worden parallel afgehandeld met `Promise.all`
(`api/cron-email-sync.ts:147`), met de motivatie dat elke gebruiker zijn eigen
IMAP-server heeft (`api/cron-email-sync.ts:144-146`).

De kandidatenlijst is: alle rijen in `user_email_settings` met een adres en een
wachtwoord (`api/cron-email-sync.ts:117-121`), gefilterd op wie de afgelopen
7 dagen is ingelogd (`ACTIEF_BINNEN_DAGEN = 7` · `api/cron-email-sync.ts:30`,
filter op `:126`).

Als de tijd om is: **stil de rest overslaan.**

```ts
const resterend = DEADLINE_MS - (Date.now() - gestartOp)
if (resterend <= 5_000) return { userId, ok: false, reden: 'deadline' }
```

`api/cron-email-sync.ts:148-149`. Die uitkomst belandt in het `mislukt`-veld van
de HTTP-respons (`api/cron-email-sync.ts:184`). Niemand leest die respons: het
is een Vercel-cron, er is geen abonnee. Een mislukte sync schrijft
`console.warn` (`api/cron-email-sync.ts:165`, `:173`) en verder niets. Er is
geen enkele plek in de app waar Antony ziet dat een mailbox niet meer
gesynchroniseerd wordt.

Twee gemeten gevolgen die niet in het ontwerp van de cron zaten:

**Verhongering door de sorteervolgorde.** De cron sorteert op
`email_sync_state.updated_at`, oudste eerst, en pakt de eerste 8
(`api/cron-email-sync.ts:130-141`). Maar `updated_at` wordt alleen bijgewerkt
als er echt iets is opgehaald: de poort op `api/fetch-emails.ts:577` is
`errors.length === 0 && (maxUidGezien > 0 || !stateBruikbaar)`. Een
incrementele run zonder nieuwe mail heeft `maxUidGezien === 0` en
`stateBruikbaar === true`, dus de rij wordt niet aangeraakt. Een stille mailbox
houdt daarmee permanent zijn oude `updated_at` en staat dus permanent vooraan
in de sortering. De sortering is in de praktijk niet "langst niet gesynct
eerst" maar "langst geen mail ontvangen eerst". Zijn er meer dan 8 stille
mailboxen, dan komen de actieve mailboxen achteraan en mogelijk nooit aan de
beurt. Hoeveel accounts er zijn, is zonder database niet vast te stellen; zie
sectie 6.

**De backfill vervuilt dezelfde sorteersleutel.** `api/backfill-emails.ts:325-331`
schrijft `updated_at` bij op dezelfde rij, terwijl een backfill oudere mail
ophaalt en niets zegt over de verstheid van de inbox. Een desktop-sessie die op
de achtergrond backfillt (`src/components/email/EmailLayout.tsx:437-460`, max
8 batches per map) duwt zijn eigen account dus achteraan in de cron-wachtrij.

**Een dood account blijft eeuwig een IMAP-slot kosten.** Een verkeerd
wachtwoord levert elke 3 minuten opnieuw een mislukte IMAP-login op
(`api/cron-email-sync.ts:147-176`); er is geen teller, geen backoff en geen
uitschakeling. Alleen een `console.warn` op `:165`.

### 1.5 Samenvatting van de zwakke plekken

| # | Zwakke plek | Bewijs |
| --- | --- | --- |
| 1 | Geen enkel slot per mailbox, terwijl overlap de norm is | geen treffers op advisory locks; `vercel.json:58` versus `EmailLayout.tsx:1571` |
| 2 | Werk overslaan is stil en onzichtbaar | `api/cron-email-sync.ts:149`, `:184` |
| 3 | Sorteersleutel verhongert actieve mailboxen | `api/cron-email-sync.ts:139` versus `api/fetch-emails.ts:577` |
| 4 | Mail zonder Message-ID dupliceert bij herhaald ophalen | `038_fix_email_unique_constraint.sql:9-10`, `api/fetch-emails.ts:386` |
| 5 | Falend account wordt nooit uitgezet | `api/cron-email-sync.ts:147-176` |

---

## 2. Het patroon dat er al staat

Er hoeft geen nieuw queue-patroon verzonnen te worden. `ingeplande_berichten`
is er al een, en het ontwerp hieronder is er bewust een kopie van, zodat er niet
twee mechanieken naast elkaar staan.

**Tabel.** `supabase/migrations/061_ingeplande_berichten.sql:1-20`, later
uitgebreid met `retry_count` en `bron`
(`supabase/migrations/130_email_outbox_retry.sql:10-17`) en met de status
`verwerken` (`supabase/migrations/120_ingeplande_berichten_verwerken_status.sql:6-8`).
Statusdomein: `wachtend`, `verwerken`, `verzonden`, `geannuleerd`, `mislukt`.

**Due-index, precies wat een queue nodig heeft:**

```sql
CREATE INDEX IF NOT EXISTS idx_ingeplande_berichten_due
  ON ingeplande_berichten (scheduled_at)
  WHERE status = 'wachtend';
```

`supabase/migrations/130_email_outbox_retry.sql:20-22`.

**Claim met compare-and-swap.** `api/cron-verzend-geplande-berichten.ts:190-197`:

```ts
const { data: claimed } = await supabaseAdmin
  .from('ingeplande_berichten')
  .update({ status: 'verwerken' })
  .eq('id', bericht.id)
  .eq('status', 'wachtend')
  .select('id')
  .maybeSingle()
if (!claimed) continue
```

De `.eq('status', 'wachtend')` in de UPDATE is de CAS: verliest deze run de
race, dan raakt de UPDATE nul rijen, komt er niets terug uit `.select()` en gaat
de run door naar het volgende bericht.

**Backoff.** `api/cron-verzend-geplande-berichten.ts:381`:
`const RETRY_DELAYS_MIN = [1, 5, 15]`. Bij een fout gaat de rij terug naar
`wachtend` met `retry_count + 1` en een nieuwe `scheduled_at`
(`:384-392`); is het budget op, dan `status = 'mislukt'` met `foutmelding`
(`:399-406`).

**Wat er in dat patroon ontbreekt, en wat ik dus niet ga kopiëren.** De claim
zet `status = 'verwerken'` en er is geen `geclaimd_op`, geen lease en geen
opruimer. Sterft het proces tussen de claim (`:190`) en de afronding (`:291`),
dan blijft de rij voor altijd op `verwerken` staan. De due-query kijkt alleen
naar `status = 'wachtend'` (`:167`), dus die rij wordt nooit meer opgepakt.

Erger nog, hij is ook niet te zien. De statuslabels in de UI zijn:

```ts
const STATUS_LABEL: Record<IngeplandBericht['status'], string> = {
  wachtend: 'Wachtend', verzonden: 'Verzonden',
  geannuleerd: 'Geannuleerd', mislukt: 'Mislukt',
}
```

`src/components/email/IngeplandeBerichtenLijst.tsx:22-27`. `verwerken` staat er
niet in, en het TypeScript-type kent de status ook niet
(`src/types/index.ts:2344`), terwijl de database-CHECK hem wel toestaat
(`120_ingeplande_berichten_verwerken_status.sql:8`). De lijst-query filtert niet
op status (`src/services/emailService.ts:518-526`), dus zo'n rij rendert wel,
maar met een leeg statuslabel, op 60 procent dekking, zonder annuleerknop
(`IngeplandeBerichtenLijst.tsx:88-115`).

Een vastgelopen rij is dus onzichtbaar én onherstelbaar. Dat is exact het gat
dat het ontwerp hieronder dichtzet met een lease en een opruimer.

---

## 3. Ontwerp

### 3.1 Datamodel

Eén tabel, `mailsync_taken`. RLS op `user_id`, want een mailbox is persoonlijk;
dat is de expliciete uitzondering op de `organisatie_id`-regel
(`CLAUDE.md:52`, zelfde keuze als `email_sync_state`,
`131_email_sync_state.sql:9-10`).

```sql
-- 201: wachtrij voor onbeheerde mailsync.
-- Vervangt de fan-out-lus in api/cron-email-sync.ts door claimbare taken.
-- RLS user_id-scoped: persoonlijke mailbox, zelfde uitzondering als
-- emails/user_email_settings/email_sync_state (CLAUDE.md par. 2).

CREATE TABLE IF NOT EXISTS mailsync_taken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder TEXT NOT NULL,
  soort TEXT NOT NULL DEFAULT 'incrementeel'
    CHECK (soort IN ('incrementeel', 'bootstrap', 'backfill', 'nabewerking')),
  status TEXT NOT NULL DEFAULT 'wachtend'
    CHECK (status IN ('wachtend', 'verwerken', 'gedaan', 'mislukt')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Lease: dit is wat ingeplande_berichten mist.
  geclaimd_op TIMESTAMPTZ,
  geclaimd_door TEXT,
  lease_tot TIMESTAMPTZ,

  retry_count INTEGER NOT NULL DEFAULT 0,
  uitstel_count INTEGER NOT NULL DEFAULT 0,
  foutmelding TEXT,
  fout_soort TEXT CHECK (fout_soort IN ('auth', 'netwerk', 'database', 'onbekend')),
  gemeld_op TIMESTAMPTZ,

  laatste_duur_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Drie indexen, elk met een reden:

```sql
-- 1. Coalescing. Hoogstens één open taak per mailbox per soort. Dit is de
--    index die het dubbel-inplannen onmogelijk maakt: de producent hoeft
--    niet te weten of er al werk staat, de database weigert het tweede.
CREATE UNIQUE INDEX IF NOT EXISTS mailsync_taken_open_unique
  ON mailsync_taken (user_id, folder, soort)
  WHERE status IN ('wachtend', 'verwerken');

-- 2. Due-scan. Spiegel van idx_ingeplande_berichten_due (migratie 130).
CREATE INDEX IF NOT EXISTS mailsync_taken_due
  ON mailsync_taken (scheduled_at)
  WHERE status = 'wachtend';

-- 3. Opruimer. Verlopen leases vinden zonder de hele tabel te scannen.
CREATE INDEX IF NOT EXISTS mailsync_taken_lease
  ON mailsync_taken (lease_tot)
  WHERE status = 'verwerken';
```

Plus de vier RLS-policies (SELECT, INSERT, UPDATE, DELETE) op
`user_id = auth.uid()`, letterlijk het patroon van
`131_email_sync_state.sql:37-44`. SELECT is de belangrijkste: daarmee kan de
client zijn eigen taakstatus lezen en kan de zichtbaarheid uit 3.5 zonder nieuw
endpoint gebouwd worden.

Het migratienummer 201 is een aanname: migratie 200 is het
feature-flag-mechanisme op een andere branch, en het hoogste nummer in deze
worktree is 189 (`supabase/migrations/189_bedrijfsprofielen.sql`). Per
`CLAUDE.md:81-83` moet het eerstvolgende vrije nummer uit `schema_migrations`
komen, en dat is zonder database niet te lezen.

### 3.2 De claim, letterlijk

Als SQL, zodat de bedoeling ondubbelzinnig is:

```sql
UPDATE mailsync_taken
   SET status        = 'verwerken',
       geclaimd_op   = now(),
       geclaimd_door = $2,                          -- Vercel request-id
       lease_tot     = now() + interval '90 seconds',
       updated_at    = now()
 WHERE id     = $1
   AND status = 'wachtend'                          -- <== dit is de CAS
RETURNING id, user_id, folder, soort, retry_count, uitstel_count;
```

`api/*` gebruikt supabase-js en geen raw SQL, dus in de praktijk:

```ts
const leaseTot = new Date(Date.now() + 90_000).toISOString()
const { data: geclaimd } = await supabaseAdmin
  .from('mailsync_taken')
  .update({
    status: 'verwerken',
    geclaimd_op: new Date().toISOString(),
    geclaimd_door: runId,
    lease_tot: leaseTot,
    updated_at: new Date().toISOString(),
  })
  .eq('id', taak.id)
  .eq('status', 'wachtend')
  .select('id, user_id, folder, soort, retry_count, uitstel_count')
  .maybeSingle()
if (!geclaimd) continue
```

Identiek aan `api/cron-verzend-geplande-berichten.ts:190-197`, met de lease
erbij. Eén afwijking van de SQL: PostgREST kan `now() + interval` niet in een
UPDATE-payload uitdrukken, dus `lease_tot` wordt in JavaScript berekend. Dat
introduceert klokverschil tussen de Vercel-runtime en Postgres. De opruimer
compenseert dat met een ruime marge (zie 3.3), en `geclaimd_op` blijft
bewust `now()` uit de database, zodat er altijd één betrouwbare
databasetijd op de rij staat.

### 3.3 De grens tussen claimen en afronden

Dit is de kern. Zes momenten in een taakrun, en per moment wat er gebeurt als
het proces daar sterft.

De volgorde binnen één claim:

1. **claim** (CAS hierboven) · rij is `verwerken`, lease loopt 90 seconden
2. **IMAP openen** en UID's boven het watermerk zoeken
3. **berichten ophalen** uit IMAP
4. **`emails`-rijen wegschrijven** (upsert, idempotent)
5. **watermerk opschuiven** (`email_sync_state.last_seen_uid`)
6. **afronden**: `status = 'gedaan'`, lease leeggemaakt

Regel: **stap 5 vóór stap 6, en stap 4 vóór stap 5.** Alleen in die volgorde is
elke tussentijdse dood veilig. Uitgeschreven:

| Sterft tussen | Watermerk | Rijen | Herstel | Kosten |
| --- | --- | --- | --- | --- |
| 1 en 2 | onaangeroerd | geen | opruimer zet terug op `wachtend` | tot 150s vertraging |
| 2 en 3 | onaangeroerd | geen | idem | idem |
| 3 en 4 | onaangeroerd | geen | idem, exact dezelfde UID's | dubbel IMAP-werk, één ronde |
| midden in 4 | onaangeroerd | helft weggeschreven | idem; de helft die er al staat botst op `UNIQUE (user_id, message_id)` en wordt genegeerd door `ignoreDuplicates` | dubbel IMAP-werk, geen dubbele rij |
| 4 en 5 | onaangeroerd | volledig | idem, alles wordt opnieuw opgehaald en genegeerd | dubbel IMAP-werk |
| 5 en 6 | opgeschoven | volledig | opruimer zet terug op `wachtend`; de volgende run vindt nul nieuwe UID's en is direct klaar | één lege IMAP-ronde |

De invariant in één zin: **het watermerk is het laatste dat opschuift, en het
schuift alleen op over berichten die bewijsbaar zijn opgeslagen.** Dat is
precies wat `api/fetch-emails.ts:577` vandaag al doet
(`errors.length === 0 && ...`), en de queue mag dat niet omdraaien. Zou stap 5
vóór stap 4 komen, dan zou elke crash mail definitief kwijtmaken in
plaats van dupliceren, en dupliceren is repareerbaar terwijl kwijt niet
repareerbaar is.

**De opruimer.** Zelf ook een CAS, zodat twee gelijktijdige opruimers niet
dezelfde taak twee keer terugzetten:

```sql
UPDATE mailsync_taken
   SET status        = 'wachtend',
       retry_count   = retry_count + 1,
       fout_soort    = 'onbekend',
       foutmelding   = 'lease verlopen: proces gestorven of functietijd op',
       scheduled_at  = now(),
       geclaimd_op   = NULL,
       geclaimd_door = NULL,
       lease_tot     = NULL,
       updated_at    = now()
 WHERE status    = 'verwerken'
   AND lease_tot < now() - interval '60 seconds'
RETURNING id, user_id;
```

De marge van 60 seconden boven de lease van 90 dekt het klokverschil uit 3.2
en garandeert dat een nog levende functie (maxDuration 60) nooit onder zijn
eigen taak wordt weggetrokken. Effectieve maximale wachttijd na een dood
proces: 150 seconden plus de intervaltijd van de opruimer.

Cruciaal: de opruimer verhoogt `retry_count`. Zonder dat blijft een taak die
structureel de functietijd overschrijdt eeuwig rondgaan zonder ooit in de
dodebrievenbus te belanden.

**Afronden van een terugkerende taak.** Een incrementele sync is geen eenmalig
werkstuk. Twee opties: de rij op `gedaan` zetten en een nieuwe inplannen, of
de rij hergebruiken door hem terug te zetten op `wachtend` met
`scheduled_at = now() + interval '3 minutes'`. Het tweede is beter, want het
houdt de coalescing-index betekenisvol (er is precies één rij per mailbox, altijd)
en het houdt de tabel klein. Dan is er ook geen `gedaan`-status nodig in de
praktijk, maar hij blijft in het CHECK-domein staan voor de bootstrap- en
backfill-taken, die wel eindig zijn.

### 3.4 Idempotentie

**De natuurlijke sleutel bestaat al** en dekt bijna alles: `message_id` uit de
RFC 5322-header, samen met `user_id`, afgedwongen door
`UNIQUE (user_id, message_id)`
(`supabase/migrations/038_fix_email_unique_constraint.sql:11-12`) en gebruikt
als `onConflict` in de upsert (`api/fetch-emails.ts:484-487`). Dat is een
sterkere garantie dan een markeertabel, want hij zit op de rij zelf en kan niet
uit de pas lopen met de werkelijkheid.

**Het gat is de mail zonder Message-ID** (zie 1.2(a)). Voorstel: synthetiseer
er een uit de IMAP-identiteit, die per definitie stabiel is zolang UIDVALIDITY
niet wisselt:

```
<uid-{uid}.{uidvalidity}.{imap_folder-hash}@sync.doen.local>
```

Waarom dit de goede vorm is:

- Deterministisch over runs, dus de bestaande unique constraint dekt daarna
  100 procent van de rijen zonder nieuwe index en zonder tweede
  `onConflict`-pad. PostgREST kan namelijk niet in één upsert tussen twee
  conflictdoelen kiezen, dus een partiële index op
  `(user_id, imap_folder, uid) WHERE message_id IS NULL` zou een aparte
  codepad vragen.
- Het herkenbare domein `@sync.doen.local` maakt later leesbaar dat de waarde
  gesynthetiseerd is en niet van de afzender komt.
- Een gesynthetiseerd id matcht nooit een `In-Reply-To`, en dat is correct: een
  bericht zonder Message-ID kan door niemand ge-refereerd worden. De threading
  op `api/fetch-emails.ts:438-442` blijft dus intact.

Wel opletten: `message_id` wordt ook elders als sleutel gebruikt, onder andere
in `inkoopfacturen` (`supabase/migrations/migration_050_inkoopfacturen_module.sql:74-76`).
Een gesynthetiseerd id mag daar niet als echte header-waarde worden
doorgegeven. Bij de bouw checken.

**Is `email_send_idempotency` hier een bruikbaar patroon? Nee, en dat is een
bewuste keuze.** Die tabel is `(organisatie_id, idempotency_key)` met de sleutel
als primary key (`supabase/migrations/104_email_send_idempotency.sql:9-14`), en
de helper is expliciet **fail-open**: bij een onverwachte databasefout geeft
`checkAndMark` `true` terug, met de motivatie dat een mogelijk dubbele mail
acceptabeler is dan een gemiste mail
(`src/trigger/utils/idempotency.ts:23-25`, `:41-46`).

Voor uitgaande mail is dat de juiste afweging. Voor inkomende mail is hij precies
omgekeerd: een dubbele inbox-rij ziet de gebruiker onmiddellijk en die is niet
door een retry te herstellen, terwijl een vertraagde rij zichzelf oplost bij de
volgende ronde. Bovendien is er voor uitgaande mail geen natuurlijke sleutel
(een verzending heeft geen identiteit vóór hij bestaat) en voor inkomende mail
wel. Dus: natuurlijke sleutel plus constraint, geen markeertabel.

De nabewerkingssweeps hebben ook geen markeertabel nodig, die zijn al idempotent
door constructie: de sales-sweep filtert op `beantwoord = false`, heeft een
race-guard in de UPDATE-WHERE en houdt een in-memory `alreadyMatched`-set bij
(`api/fetch-emails.ts:613-616`, `:682-692`).

### 3.5 Backoff en dodebrievenbus

**Foutklassen eerst, want ze horen niet dezelfde behandeling te krijgen.**

| `fout_soort` | Voorbeeld | Behandeling |
| --- | --- | --- |
| `auth` | IMAP-authenticatie geweigerd, of ontsleutelen mislukt (`api/fetch-emails.ts:53`, `:71`, `:83`) | **geen backoff**, direct `mislukt` plus signaal |
| `netwerk` | timeout, verbinding weg, HTTP 5xx | backoff volgens de tabel hieronder |
| `database` | upsert faalt (`api/fetch-emails.ts:496`) | backoff, watermerk blijft staan |
| eigen deadline | tijd op vóór het werk klaar was | direct terug op `wachtend`, `uitstel_count + 1`, `retry_count` **niet** verhoogd |

De `auth`-uitzondering is geen detail. Een verkeerd wachtwoord elke minuut
opnieuw bij Gmail aanbieden is de manier om het account door Gmail zelf
geblokkeerd te krijgen. Vandaag gebeurt precies dat, elke 3 minuten, eindeloos
(`api/cron-email-sync.ts:147-176`).

Het onderscheid tussen `retry_count` en `uitstel_count` is de tweede
belangrijke keuze. Een grote mailbox die vier ronden nodig heeft om zijn
achterstand in te lopen is niet aan het falen, en mag zijn foutbudget daar niet
aan opmaken. `uitstel_count` krijgt zijn eigen plafond (voorstel 20) om een
taak te vangen die binnen geen enkel venster af kan.

**Backoff.** Het bestaande `RETRY_DELAYS_MIN = [1, 5, 15]`
(`api/cron-verzend-geplande-berichten.ts:381`) is te kort voor een sync: daar
wacht een mens op een mail, hier niet, en de veelvoorkomende fout is er een die
in 15 minuten niet overgaat. Voorstel:

```ts
const RETRY_DELAYS_MIN = [1, 3, 10, 30, 60, 180, 360]
```

Zeven pogingen, samen ruim 10 uur. Daarna `status = 'mislukt'`, en de taak
wordt **niet** opnieuw ingeplaatst. De dodebrievenbus is dus geen aparte tabel
maar de eindstatus plus de bewaarde `foutmelding` en `fout_soort`, exact zoals
`ingeplande_berichten` het doet (`api/cron-verzend-geplande-berichten.ts:399-406`).

Een account dat 20 keer faalt bestaat in dit ontwerp dus niet. Na 7 pogingen is
het stil, en het kost geen IMAP-slot meer. Er wordt pas weer een taak
aangemaakt als de gebruiker iets doet dat intentie bewijst: het e-mailscherm
openen, of zijn verbinding opnieuw opslaan. Dat is het verschil met vandaag,
waar een dood account voor altijd meedoet in de ronde van 8.

**Hoe Antony dit ziet zonder in de logs te kijken.** Drie lagen, goedkoopste
eerst. Geen nieuw beheerderdashboard.

1. **Verbindingsstatus in het bestaande e-mailinstellingenscherm.** Laatst
   gesynct, volgende poging, aantal mislukte pogingen, de foutmelding. Eén
   query op `mailsync_taken` plus `email_sync_state`, en dank zij de
   `user_id`-RLS-policy kan de client die zelf lezen. Geen nieuw endpoint.
   Klein. Geen migratie na 201.
2. **Banner in het e-mailscherm** als de eigen mailbox op `mislukt` staat: "Mail
   wordt niet meer opgehaald, controleer je verbinding." Met een knop "opnieuw
   proberen" die `status` op `wachtend` zet en `retry_count` op 0. Die knop is
   de handmatige herstart van de dodebrievenbus, en hij is de enige die nodig
   is. Klein.
3. **Eén pushmelding** bij de overgang naar `mislukt`, via de bestaande route
   `api/push-verstuur` (zoals gebruikt op `api/cron-email-sync.ts:91-96`),
   afgeschermd door `gemeld_op` op de rij zodat het één melding is en niet één
   per ronde. Klein.

Les uit sectie 2, expliciet als bouwvoorschrift: de statuslabel-map in de UI
moet volledig zijn over het CHECK-domein in de database. Bij
`ingeplande_berichten` is dat niet zo, en daar rendert een rij op `verwerken`
met een leeg badge (`src/components/email/IngeplandeBerichtenLijst.tsx:22-27`
versus `120_ingeplande_berichten_verwerken_status.sql:8`). Dezelfde fout twee
keer maken is hier goed te vermijden.

### 3.6 Wat expliciet buiten de queue blijft

De UI-poll blijft `POST /api/fetch-emails` direct aanroepen. De queue is er
voor het onbeheerde pad.

Waarom: de interactieve aanroep heeft een synchroon antwoord nodig (de
verversknop wacht erop, `src/components/email/EmailLayout.tsx:1214-1220`), hij
is begrensd door een mens, en hij heeft al een eigen rem
(`api/fetch-emails.ts:232`). Hem door de queue duwen betekent dat een
trek-om-te-verversen pas na de volgende werkerronde iets oplevert, en dat is
een merkbare verslechtering voor het oplossen van een probleem dat de gebruiker
niet heeft.

Gevolg: overlap tussen de UI en de werker blijft bestaan. Dat is acceptabel,
want die overlap is vandaag al veilig (idempotent op `message_id`, watermerk
schuift na het verwerken op) en de queue maakt hem niet erger. Wat de queue wél
wegneemt is de overlap tussen cron-ronden onderling en de fan-out van 8
accounts in één functie.

---

## 4. Migratiepad in stappen

De app is in gebruik. Geen big bang. Elke stap is los te deployen en los terug
te draaien.

Sinds kort bestaat er een feature-flag-mechanisme (`src/lib/featureFlags.ts`,
migratie 200, op een andere branch en dus niet in deze worktree te lezen). Het
kent drie standen (aan, uit, onbekend) en twee hooks: `useFeatureAan` faalt
dicht voor nieuwe code, `useFeatureUitgezet` faalt open om iets bestaands te
doven. Het ontwerp hieronder gebruikt dat en ontwerpt geen eigen uitzetknop.

Eén belangrijke beperking om bij de bouw te verifiëren: dat zijn React-hooks in
`src/lib/`, en `api/*`-bestanden mogen niets uit `src/` importeren
(`CLAUDE.md:61`). De serverzijde moet de vlagtabel uit migratie 200 dus zelf
inline uitlezen, met dezelfde naam en dezelfde drie standen. De standaardstand
voor de serverkant moet expliciet gekozen worden per vlag, want "onbekend"
betekent bij `mailsync_queue` (nieuw pad) dicht en bij
`mailsync_oude_cron_lus` (bestaand pad doven) open.

Twee vlaggen, met tegengestelde faalrichting:

- **`mailsync_queue`** dekt het nieuwe pad. Faalt dicht: staat de vlag op
  onbekend, dan gebeurt er niets nieuws.
- **`mailsync_oude_cron_lus`** dooft de bestaande fan-out-lus in
  `api/cron-email-sync.ts:147-176`. Faalt open: staat de vlag op onbekend, dan
  blijft de oude lus mail ophalen. Dit is de vlag die in noodgeval ingezet wordt
  om terug te vallen, en de faalrichting maakt dat veilig.

| Stap | Wat | Omvang | Migratie | Antony's hand |
| --- | --- | --- | --- | --- |
| 0 | de SQL-vragen uit sectie 6 uitvoeren, om `MAX_PER_RONDE` en het aantal accounts echt te weten | klein | nee | ja, in de SQL-editor |
| 1 | tabel `mailsync_taken` plus indexen plus RLS aanmaken. Niemand leest of schrijft hem | klein | ja | ja, migratie draaien |
| 2 | producent bijbouwen: `cron-email-sync` schrijft taken **en** blijft daarnaast doen wat hij nu doet. Schaduwmodus, niemand consumeert | klein | nee | nee |
| 3 | werker bouwen: nieuwe cron `/api/cron-mailsync-werker`, elke minuut, met claim, lease, opruimer, backoff. Achter `mailsync_queue` **plus** een allowlist van user-id's, in eerste instantie alleen Antony zelf | groot | nee | ja, vlag aanzetten |
| 4 | oude lus doven voor de allowlist: `mailsync_oude_cron_lus` slaat exact die user-id's over | klein | nee | ja, vlag zetten |
| 5 | allowlist verbreden, in twee of drie ronden | klein | nee | ja, per ronde |
| 6 | oude lus helemaal doven, `mailsync_queue` voor iedereen aan | klein | nee | ja, vlag zetten |
| 7 | oude codepad verwijderen, niet eerder dan een week na stap 6 | klein | nee | nee |

**De gevaarlijke koppeling zit tussen stap 3 en stap 4** en verdient het om
apart genoemd te worden. Tussen die twee stappen synchroniseren twee paden
dezelfde mailbox. Dat is niet stuk (de idempotentie uit 3.4 dekt het, en de
overlap bestaat vandaag al tussen cron en UI-poll), maar het is wel dubbel
IMAP-werk en dubbele verbindingsdruk op de mailserver. Houd het venster tussen
stap 3 en stap 4 daarom kort, en doe stap 3 met precies één mailbox.

De omgekeerde fout is erger en moet niet gebeuren: stap 4 vóór stap 3. Dan is
de oude lus gedoofd en haalt de werker nog niets op. Dat is stille stilte op het
pad waarlangs de mail van een echt bedrijf binnenkomt.

**De terugweg.** Per stap:

- Stap 1: geen terugweg nodig. Een ongebruikte tabel doet niets. Bewust niet
  droppen bij een terugval, want de rijen zijn na de terugval nog geldig.
- Stap 2: `mailsync_queue` op uit. De producent stopt met schrijven; de
  bestaande rijen blijven staan en zijn niet schadelijk, want er is geen
  consument.
- Stap 3 tot 6: `mailsync_oude_cron_lus` op onbekend of uit, dan is de oude lus
  weer aan (faalt open), en `mailsync_queue` op uit, dan doet de werker niets
  meer (faalt dicht). Dat is twee vlagwissels en geen deploy.
- Als de vlagtabel zelf onbereikbaar is: Vercel Instant Rollback naar de vorige
  deployment.

**Waarom dit veilig terugdraait, en dit is de belangrijkste ontwerpkeuze in het
hele migratiepad:** het nieuwe pad introduceert **geen tweede watermerk**. De
werker roept hetzelfde `/api/fetch-emails` aan en dat schrijft hetzelfde
`email_sync_state.last_seen_uid` (`api/fetch-emails.ts:591-593`). Heeft de
werker de waterlijn opgeschoven en val je terug op de oude lus, dan gaat die
gewoon verder waar de werker gebleven was. Zou de queue een eigen voortgang
bijhouden, dan zou elke terugval een gat of een dubbele ronde betekenen.

Bij het inplannen dekt de coalescing-index (`mailsync_taken_open_unique`) de
herstart: bij aan- en uitzetten kan de producent nooit een tweede open taak
voor dezelfde mailbox maken, ongeacht hoe vaak hij het probeert.

---

## 5. Nog uit te werken

Dit document is gecommit voordat het ontwerp helemaal rond was, zodat het
meetwerk niet verloren gaat. Wat nog ontbreekt:

- **De werker zelf op codeniveau.** Hoeveel taken per ronde claimen, en of één
  werkerronde meerdere mailboxen parallel doet zoals nu
  (`api/cron-email-sync.ts:147`) of strikt serieel. Serieel is voorspelbaarder
  voor het leasegedrag, parallel is nodig om het huidige tempo te halen. Deze
  keuze hangt aan het aantal accounts uit vraag 1 in sectie 6.
- **Waar de opruimer draait.** Als aparte cron, of aan het begin van elke
  werkerronde. Het tweede is goedkoper en heeft geen extra `vercel.json`-regel
  nodig, maar loopt niet als de werker helemaal niet meer draait.
- **Wie de taken aanmaakt voor een nieuwe gebruiker.** Nu is het lidmaatschap
  van de ronde impliciet: een rij in `user_email_settings` plus een login
  binnen 7 dagen (`api/cron-email-sync.ts:117-126`). In het nieuwe model moet
  iemand expliciet een taak aanmaken. Kandidaten: bij het opslaan van de
  e-mailinstellingen, en een dagelijkse aanvulronde.
- **De nabewerking als eigen taaksoort.** De `soort`-kolom heeft
  `nabewerking` al in het CHECK-domein, maar of de sales- en lead-sweeps
  (`api/fetch-emails.ts:629`, `:707`) losgetrokken moeten worden van de
  ophaal-taak is niet uitgewerkt. Argument voor: ze hebben een eigen
  faalprofiel en eigen deadlines. Argument tegen: ze zijn nu al idempotent en
  overslaan kost niets.
- **De backfill.** Die heeft zijn eigen voortgangsvelden
  (`backfill_low_uid`, `backfill_done`, `131_email_sync_state.sql:19-20`) en
  wordt nu door de desktop-UI aangedreven
  (`src/components/email/EmailLayout.tsx:437-460`). Als taaksoort in deze queue
  hoort hij thuis, maar het is een aparte stap na stap 7.
- **De sorteervolgorde-verhongering uit 1.4** wordt door dit ontwerp opgelost
  via `scheduled_at` in plaats van `updated_at`, maar dat is niet expliciet
  uitgeschreven als eigen paragraaf.

---

## 6. Niet geverifieerd

Alles hieronder is zonder de productiedatabase of zonder een echte run niet
vast te stellen. De SQL erbij is wat het zou antwoorden.

**1. Hoeveel accounts zijn er, en past `MAX_PER_RONDE = 8` daarbij.** Dit is de
belangrijkste onbekende van het hele document: is het aantal actieve accounts
kleiner dan 8, dan is de verhongering uit 1.4 theoretisch en is de hele queue
minder urgent. Is het groter, dan verliest een deel van de accounts nu
structureel ronden.

```sql
SELECT count(*) AS met_credentials
  FROM user_email_settings
 WHERE gmail_address IS NOT NULL
   AND encrypted_app_password IS NOT NULL;

SELECT count(*) AS actief_7d
  FROM auth.users
 WHERE last_sign_in_at >= now() - interval '7 days'
   AND id IN (SELECT user_id FROM user_email_settings
               WHERE gmail_address IS NOT NULL
                 AND encrypted_app_password IS NOT NULL);
```

**2. Hoe scheef de sorteervolgorde nu al staat.** Als hier rijen met een
`updated_at` van weken oud tussen staan, is de verhongering uit 1.4 echt en
meetbaar.

```sql
SELECT user_id, folder, updated_at, now() - updated_at AS achterstand,
       last_seen_uid
  FROM email_sync_state
 WHERE folder = 'inbox'
 ORDER BY updated_at ASC;
```

**3. Of er nu al rijen vastzitten op `verwerken`.** Dit toetst of het gat in het
bestaande patroon (sectie 2) zich al heeft voorgedaan.

```sql
SELECT id, user_id, scheduled_at, retry_count, foutmelding
  FROM ingeplande_berichten
 WHERE status = 'verwerken'
 ORDER BY scheduled_at;
```

**4. Of de dubbele-rij-bug uit 1.2(a) zich al voordoet.**

```sql
SELECT count(*) AS zonder_message_id
  FROM emails
 WHERE message_id IS NULL;

SELECT user_id, imap_folder, uid, count(*)
  FROM emails
 WHERE message_id IS NULL
 GROUP BY 1, 2, 3
HAVING count(*) > 1
 ORDER BY count(*) DESC
 LIMIT 20;
```

**5. Of de rate limit uit `api/fetch-emails.ts:232` echt werkt.** Migratie 145
zegt zelf dat de tabel eerder niet in productie bestond
(`145_rate_limits_functioneel_en_hardened.sql:2-7`) en de helper is fail-open
(`api/fetch-emails.ts:11-14`). Extra reden voor twijfel: het geheugen bij dit
project meldt dat de database achterloopt op de migratiemap.

```sql
SELECT to_regclass('public.rate_limits') AS tabel_bestaat;
SELECT count(*) FROM rate_limits WHERE id LIKE 'fetch-emails:%';
```

**6. Het eerstvolgende vrije migratienummer.** Het hoogste in deze worktree is
189, en migratie 200 (feature-flags) staat op een andere branch. Per
`CLAUDE.md:81-83` is `schema_migrations` de bron.

```sql
SELECT * FROM schema_migrations ORDER BY 1 DESC LIMIT 20;
```

**7. Hoe lang een echte sync per mailbox duurt (p95).** Zonder dat getal zijn
`DEADLINE_MS = 50_000` en `MAX_PER_RONDE = 8`
(`api/cron-email-sync.ts:33-35`) niet gevalideerd, en is ook de lease van 90
seconden uit 3.2 een aanname. Alleen te meten met een echte run, of uit de
Vercel-functielogs van `/api/cron-email-sync`. De nieuwe kolom
`laatste_duur_ms` in 3.1 is er om dit vanaf stap 2 wél te weten.

**8. Of het verbindingsbudget van de mailserver geraakt wordt.** Elf
`api/`-endpoints openen IMAP-verbindingen; Gmail begrenst het aantal
gelijktijdige IMAP-verbindingen per account. Of dat plafond nu geraakt wordt,
is alleen uit de IMAP-foutmeldingen in de Vercel-logs te zien.

**9. Of `push_nieuwe_mail` überhaupt aanstaat** voor de betrokken gebruikers.
De melding in `api/cron-email-sync.ts:75` stopt zonder die vlag, dus de
zichtbaarheidslaag 3 uit 3.5 valt of staat hiermee.

```sql
SELECT count(*) FILTER (WHERE push_nieuwe_mail) AS aan,
       count(*)                                 AS totaal
  FROM profiles;
```
