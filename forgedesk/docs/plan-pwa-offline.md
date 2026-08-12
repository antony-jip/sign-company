# Echte PWA met mutation-queue

Implementatieklaar ontwerp. Geen code gewijzigd, geen database bevraagd, geen
npm-package geïnstalleerd. Alle beweringen over de huidige situatie staan met
`bestand:regel` erbij.

De scope is bewust smal: dit is geen ontwerp om de hele app offline te maken,
maar om een monteur op een dak zijn werk niet te laten verliezen.

---

## 1. Wat er vandaag echt is, gemeten

### 1.1 Manifest: bestaat, en is compleet

`public/manifest.json` (52 regels), gekoppeld in `index.html:7`.
`display: "standalone"` (`manifest.json:10`), `start_url: "/"` (`:8`),
`scope: "/"` (`:9`), `theme_color`/`background_color` `#F8F7F5` (`:12-13`), en
drie iconen waaronder een maskable van 512 (`:15-34`). Drie snelkoppelingen
naar `/offertes/nieuw`, `/planning` en `/taken` (`:35-51`).

`index.html` heeft ook de iOS-metatags: `apple-mobile-web-app-capable`
(`index.html:19`), `apple-mobile-web-app-title` (`:21`), een
`apple-touch-icon` (`:6`, één maat), en twee `theme-color`-varianten voor
licht en donker (`:17-18`).

Aan de installeerbaarheid ontbreekt dus vrijwel niets. Wat ontbreekt is
`beforeinstallprompt`: nul treffers in de hele repo. Er is geen
installeer-uitnodiging, alleen statische uitleg in
`src/components/settings/PushMeldingenKaart.tsx:92-99`.

### 1.2 Service worker: bestaat, maar raakt geen enkel verzoek aan

`public/sw.js` (55 regels). De kop zegt zelf wat hij is:

> Bewust geen precaching en geen runtime-cache: offline werken is een eigen
> project. Deze worker raakt geen enkel verzoek aan en heeft dus ook geen
> cache-invalidatie nodig.

`public/sw.js:4-7`. Wat er in zit: `install` met `skipWaiting()` (`:12`),
`activate` met `clients.claim()` (`:13`), een `push`-handler (`:15-36`) en een
`notificationclick`-handler (`:38-55`).

Wat er niet in zit: **geen `fetch`-listener**. Er is dus per definitie geen
cache, en `grep` op `caches.`, `CacheStorage` en `cache.addAll` over `src/`,
`public/` en `api/` geeft nul treffers.

Cachet die worker dus iets? Nee. Niets.

### 1.3 De belangrijkste meting: de worker wordt bijna nooit geregistreerd

`navigator.serviceWorker.register('/sw.js', { scope: '/' })` staat op één
plek: `src/lib/push.ts:59`, in `registreerWorker()` (`:56-60`). De enige
aanroeper is `zetPushAan()` (`src/lib/push.ts:94`). En `@/lib/push` wordt maar
door één component geïmporteerd: `src/components/settings/PushMeldingenKaart.tsx:9`,
die alleen vanuit `src/components/settings/EmailTab.tsx:931` gerenderd wordt.

Gevolg: **wie nooit naar Instellingen, Email is gegaan en daar de
meldingen-schakelaar heeft omgezet, heeft helemaal geen service worker.**
`src/main.tsx` (90 regels) registreert er geen.

Dat is de meting die het hele item van karakter verandert. Er is niet "een
service worker die nog geen cache doet". Er is voor de meeste gebruikers geen
service worker.

### 1.4 Geen enkel PWA-gereedschap in de build

`vite.config.ts` heeft twee plugins: `react()` (`:48`) en een eigen
inline-plugin `stub-framer-motion` (`:50-62`). Geen `vite-plugin-pwa`, geen
workbox, geen PWA-configuratie.

`package.json`: geen `vite-plugin-pwa`, geen `workbox-*`, geen `idb`, geen
`dexie`, geen `localforage`, geen `@tanstack/react-query`. Wel `web-push`
(`package.json:60`), maar dat is de serverkant van de meldingen.

Er is dus ook geen query-cache die overleeft: `src/lib/queryCache.ts` is twee
`Map`s in het geheugen en weigert expliciet de schijf (`queryCache.ts:3-6`),
en wordt bij uitloggen geleegd.

### 1.5 Er zijn al drie offline-mechanismen, alle drie met een eigen gebrek

Dit is het patroon dat er al staat, en waar het ontwerp op moet voortbouwen in
plaats van er een vierde naast te zetten.

**(a) `src/utils/maatjeOfflineQueue.ts` (88 regels), IndexedDB, met Blobs.**
DB `doen_maatjes` (`:10`), versie 1 (`:28`), store `wachtrij` (`:11`), keyPath
`id` (`:31`), **geen enkele index** (`:31` maakt de store en verder niets).
`origineel` en `render` zijn echte `Blob`s in de rij (`:17-18`), met de
motivatie dat localStorage geen Blobs van honderden kilobytes aan kan (`:3-8`).
Drie functies: `wachtrijToevoegen` (`:38-51`), `wachtrijAlles` (`:53-73`),
`wachtrijVerwijderen` (`:75-88`). Elke functie opent een eigen verbinding en
sluit hem in `finally` (`:49`, `:71`, `:86`). Lezen faalt zacht (leeg array bij
elke fout, `:54`, `:58-60`, `:68-70`), schrijven gooit (`:39`).

Drie gebreken, alle drie gemeten:

1. **De vulvoorwaarde is te streng.** In `MaatjeKladblok.tsx:254` gaat een
   mislukte upload alleen de wachtrij in als `navigator.onLine === false`.
   Anders `throw err` (`:267`). Op een dak met één streepje is `navigator.onLine`
   gewoon `true`, want dat vlaggetje betekent alleen "er is een
   netwerkinterface", niet "er is internet". Precies in het scenario waar de
   wachtrij voor bedoeld is, wordt de foto dus weggegooid.
2. **Eén rotte peer blokkeert de hele rij.** `flushWachtrij`
   (`MaatjeKladblok.tsx:114-131`) doet bij de eerste fout een `break` (`:126`),
   met het commentaar "waarschijnlijk weer offline, stoppen". Er is geen
   pogingenteller, geen maximum, geen dodebrievenbus. Een item dat structureel
   faalt houdt alles achter zich vast, voor altijd.
3. **De flush draait alleen als dit scherm open is.** Aankoppelen, `online`-event,
   dat is het (`MaatjeKladblok.tsx:135-141`). Wie een foto maakt en de app
   sluit, leegt zijn wachtrij nooit. Er is niets op app-niveau.

Bijkomend: `wachtrijAlles()` doet `getAll()` (`:64`), dus om te tellen hoeveel
items er wachten worden alle foto's uit alle rijen in het geheugen
gedeserialiseerd. `verversWachtrij` doet exact dat, alleen voor een `.length`
(`MaatjeKladblok.tsx:110-112`).

**(b) `src/utils/werkbonOfflineQueue.ts` (64 regels), localStorage, geen Blobs.**
Key `doen_werkbon_feedback_queue` (`:11`), vorm
`Record<werkbonId, { payload, ts }>` (`:13`), één entry per werkbon met
"laatste wint" (`:8-9`). Flush op `:44-63`.

Deze heeft juist twee dingen goed die (a) mist: hij is **coalescerend** (één
entry per werkbon, dus tien keer typen geeft niet tien items) en hij heeft een
**echte conflictregel**: een werkbon die inmiddels `afgerond` is wordt zonder
replay gewist (`:50-56`). Dat is een expliciete keuze van "de server wint",
en het is een goede keuze.

Wat hij mist: de wissing is volledig stil. `clearWerkbonFeedback(id)` op `:54`
en verder niets. De monteur die op een dak drie uur en een klanthandtekening
heeft ingevuld, en wiens werkbon in de tussentijd op het kantoor is afgerond,
verliest dat zonder een woord. Verder geen pogingenteller en geen verlooptijd
(`:59-62` logt en laat staan).

En: de payload is `Partial<Werkbon>` als JSON in localStorage (`:12`, `:24`),
inclusief `klant_handtekening`, en dat is een base64-data-URL
(`WerkbonMonteurView.tsx:178`). Een handtekening in localStorage vreet aan een
budget van rond de 5 MB dat de hele app deelt.

**(c) `src/lib/mailCache.ts`, IndexedDB, leescache.** DB `doen-mail` (`:18`),
versie 1 (`:19`), store `lijsten` (`:20`), keyPath `sleutel` (`:43`), maximale
leeftijd 7 dagen (`:23`), eigenaarsleutel uit `userId` plus `organisatie_id`
(`:57`). Volledig faalzacht: `openDb()` geeft `null` bij elke fout (`:47-51`).
Gebruikt door `EmailLayout.tsx` (schrijven `:328`, lezen `:476`) en geleegd bij
uitloggen of orgwissel via `AuthContext.tsx:9`.

Dit is het bewijs dat het patroon werkt: de e-maillijst staat er binnen
milliseconden terwijl de query vier tot zes seconden kost
(`EmailLayout.tsx:466-471`). En het is ook het bewijs dat er twee keer los van
elkaar hetzelfde `indexedDB.open`-boilerplate is uitgeschreven
(`maatjeOfflineQueue.ts:26-36` en `mailCache.ts:34-54`).

### 1.6 De offline-banner die iets belooft dat niet waar is

`src/components/layouts/AppLayout.tsx:25-34`:

```tsx
<WifiOff className="h-4 w-4" />
Je bent offline. Wijzigingen worden niet opgeslagen
```

`AppLayout.tsx:31`. Dat is de enige app-brede offline-uiting, en hij is voor
twee van de drie mechanismen hierboven onjuist: maatjes en
werkbon-feedback worden juist wel bewaard. De banner leert de monteur dus dat
zijn werk verloren is, waarop hij het opnieuw intypt, waarop je dubbele
invoer krijgt.

`useOnlineStatus` (`src/hooks/useOnlineStatus.ts`, 18 regels) is
`navigator.onLine` plus twee listeners (`:4`, `:9-10`). Er is geen
bereikbaarheidstest, geen heartbeat.

### 1.7 Offline-fouten zijn onzichtbaar in Sentry

`src/main.tsx:68-72` heeft een globale `unhandledrejection`-handler die stil
terugkeert bij meldingen die `Failed to fetch`, `NetworkError` of `AbortError`
bevatten. Dat is exact de foutklasse die een offline flush oplevert. Verder
draait `public/sw.js` in een eigen global scope zonder Sentry-SDK, dus fouten
in de worker worden nergens gemeld.

---

## 2. Voor wie ontwerpen we, en welke schermen

### 2.1 Het mobiele menu

`src/lib/navigatie.ts:76`:

```ts
export const MOBIELE_NAV_LABELS = ['Dashboard', 'Projecten', 'Email', 'Maatjes']
```

Dat is de startset voor wie zijn mobiele menu nooit heeft ingesteld; de eigen
keuze staat op `profiles.mobiel_menu_items` (`navigatie.ts:72-75`, migratie
169). `MOBIELE_NAV_MAX = 3` is het aantal moduleslots in de onderbalk, met
Daan en "Meer" er altijd naast (`navigatie.ts:78-81`); `MobileTabBar.tsx:47-52`
rekent met `MOBIELE_NAV_MAX` of `+1` afhankelijk van of Daan aanstaat.

Het commentaar erboven is de opdracht: "Mobiel is bewust lean: alleen het
hoogstnodige voor de buitendienst" (`navigatie.ts:71`).

**Werkbonnen staat niet in de standaardset**, terwijl dat het scherm van de
monteur is (`/werkbonnen`, `navigatie.ts:30`). Wie op een dak een werkbon
invult, is dus iemand die zijn menu zelf heeft ingesteld, of iemand die via
"Meer" navigeert.

### 2.2 Er is al een expliciete monteur-modus

`src/App.tsx:85-89`: `MaatjesRoute()` rendert `isDesktop ? <MaatjeBeheer /> : <MaatjeKladblok />`.
Dezelfde route is op de telefoon een ander scherm. Dat is het bewijs dat de
splitsing tussen binnendienst en buitendienst in deze app al bestaat, en dat
het ontwerp die splitsing kan gebruiken in plaats van hem te verzinnen.

### 2.3 De vier schermen die een monteur op een dak echt gebruikt

| Scherm | Bestand | Wat hij daar doet |
| --- | --- | --- |
| Werkbon-monteurweergave | `src/components/werkbonnen/WerkbonMonteurView.tsx` | uren, opmerkingen, foto's, klanthandtekening |
| Maatjes-kladblok | `src/components/maatjes/MaatjeKladblok.tsx` (464 regels) | foto maken, maten erop tekenen, opslaan |
| Maatje-editor | `src/components/maatjes/MaatjeEditor.tsx` (693 regels) | het tekenwerk zelf, doet geen netwerk (`:12`, `:15`) |
| Project bekijken | `/projecten` | opzoeken waar hij is en wat er moet gebeuren |

Wat een monteur op een dak nodig heeft, in deze volgorde: hij moet kunnen
**vastleggen** (foto, maat, uren, handtekening) en hij moet kunnen
**opzoeken** (welk project, welk adres, wat is de opdracht). Vastleggen is de
harde eis, want dat is werk dat verdwijnt als het niet lukt. Opzoeken is
prettig maar niet dringend: dat kan hij bij het hek doen, met bereik.

Dit ontwerp gaat daarom **volledig over vastleggen**. De offline-app-shell en
het offline kunnen lezen van projectdata is een tweede, losse beslissing, en
die staat in sectie 7 als vraag, niet als plan.

### 2.4 Wat die schermen nu schrijven

De maatjes-componenten doen zelf **nul** Supabase-aanroepen; alles loopt via
`src/services/maatjeService.ts` (219 regels), tabel `maatjes`, bucket `maatjes`
(`:7`). `createMaatje` (`:88-135`) doet twee storage-uploads (`:97-98`) en
daarna één insert (`:100-113`). Niet atomair: de uploads kunnen lukken en de
insert falen. Weergave via `createSignedUrl(pad, 3600)` (`:54`), dus een
privébucket met URL's die na een uur verlopen.

De monteur schrijft in de werkbon precies vijf velden, en dat is de hele lijst
(`WerkbonMonteurView.tsx:175-181`):

```ts
const payload = {
  uren_gewerkt: urenGewerkt,
  monteur_opmerkingen: monteurOpmerkingen || undefined,
  klant_handtekening: handtekeningData,
  klant_naam_getekend: klantNaamGetekend || undefined,
  getekend_op: handtekeningData ? new Date().toISOString() : undefined,
}
```

Autosave met een debounce van 1000 ms (`:174`, `:195`), uit bij een afgeronde
werkbon (`:172`), plus een laatste flush bij het wegnavigeren (`:212-226`).

Foto's gaan een heel ander pad: `resizeImage(file, 1200)` (`:241`), een pad
`werkbon-fotos/{werkbon.id}/{Date.now()}-{random}-{naam}` (`:243`),
`uploadFile` naar bucket `documenten-prive`
(`src/services/storageService.ts:8`, upload op `:81`), dan
`createWerkbonFoto(...)` (`:247-253`) wat inserteert in `werkbon_fotos`
(`src/services/werkbonService.ts:265`). Maximaal drie tegelijk (`:261`).

**En bij een fout gebeurt er niets.** `catch` logt, zet `lastError`, en dan
een toast (`WerkbonMonteurView.tsx:255-263`). De foto is weg. Er is geen
wachtrij voor werkbonfoto's.

---

## 3. Welke mutaties offline mogen. Streng, en dus weinig.

De regel die ik hieronder per geval toepas:

> **Zet alleen mutaties in de wachtrij die óf optellend zijn (een nieuwe rij
> waar niemand anders aan zit), óf één-schrijver op een veldenset die alleen
> dit toestel bezit. Nooit een nummeruitgifte. Nooit een statusovergang waar
> ander werk van afhangt.**

### JA, drie stuks

**1. Werkbonfoto.** Dit is de grootste winst en het duidelijkste geval. Nu
verdwijnt een mislukte foto met alleen een toast
(`WerkbonMonteurView.tsx:255-263`). Het is optellend (een nieuwe rij in
`werkbon_fotos`), er is geen nummer bij betrokken, en het pad is al uniek
gemaakt met een tijdstempel en een willekeurig deel (`:243`). De Blob is al
verkleind naar 1200 px (`:241`), dus de opslagkosten op het toestel zijn
bekend en beperkt. Een foto van een afgemonteerde letterbak op een dak is
niet opnieuw te maken zonder een tweede rit, en dat is precies de kosten die
dit voorkomt.

**2. Werkbon-feedback, die vijf velden.** Bestaat al
(`werkbonOfflineQueue.ts`), maar hoort naar IndexedDB verhuisd te worden,
omdat de klanthandtekening een base64-data-URL is die nu in localStorage
belandt (`:12`, `WerkbonMonteurView.tsx:178`). Eén monteur, één toestel, één
werkbon: dat staat letterlijk als motivatie in de code
(`werkbonOfflineQueue.ts:9`). Geen nummers, geen sequentie.

**3. Nieuw maatje.** Bestaat al, maar met de verkeerde vulvoorwaarde
(`MaatjeKladblok.tsx:254`, zie 1.5(a)). De correctie is klein en belangrijk:
**elke** netwerkfout gaat de wachtrij in, ongeacht wat `navigator.onLine`
beweert.

### NEE, en waarom precies

**4. Factuur. Nee, en dit is het gevaarlijkste geval.**

`getMaxNummer` (`src/services/supabaseHelpers.ts:128-151`) is een gewone
client-side `SELECT` van alle rijen met die prefix, gevolgd door een
`Math.max`-reduce in JavaScript (`:139-148`). Geen `order`, geen `limit(1)`,
geen aggregaat, geen sequence, geen `FOR UPDATE`, geen advisory lock, geen
RPC. `grep` op `nextval` en `CREATE SEQUENCE` over `supabase/migrations/`
levert alleen de interne SaaS-facturatie op
(`154_abonnement_factuurnummer_seq`), niet de klantfacturen.

De enige bescherming is de unique index
(`supabase/migrations/141_factuur_nummer_unique.sql:23`) plus een
online retry-lus: `createFactuur` probeert vijf keer, en hergenereert bij
foutcode `23505` het nummer (`src/services/factuurService.ts:47-60`).

Die lus kán offline niet werken, want hergenereren betekent de tabel opnieuw
lezen (`factuurService.ts:42`). Een offline uitgedeeld factuurnummer is dus
een gok die bij het legen van de wachtrij op een unique violation knalt, in
een context waar de gebruiker niet meer weet welke factuur het was. En een
factuurnummer is een doorlopende reeks met een fiscale betekenis: hier is een
gat of een duplicaat niet een bug maar een probleem met de boekhouding.

Er is één variant die wél kan, en die noem ik alleen om hem expliciet buiten
scope te zetten: een factuur offline opslaan als **concept zonder nummer**.
Het datamodel staat dat al toe, de migratie heet letterlijk
`140_factuur_concept_leeg_nummer_uniek.sql`, en het nummer wordt in de UI ook
pas bij "Verwerken" toegekend
(`src/components/invoices/FactuurEditor.tsx:1152-1159`). Maar een monteur op
een dak maakt geen facturen, dus dit hoort niet in dit ontwerp.

**5. Offerte-, project- en werkbonnummer. Nee, zelfde reden.** Alle drie via
`getMaxNummer`: `offerteService.ts:1085`, `projectService.ts:659`,
`werkbonService.ts:51`. Alle drie met een unique index die bij de flush
toeslaat: `058_offerte_nummer_unique.sql:15`,
`142_werkbon_project_nummer_unique.sql:21,25`. Een nieuwe werkbon offline
aanmaken kan dus niet; een bestaande werkbon offline invullen wel.

**6. Werkbon afronden. Nee.** Twee redenen. Afronden is de handeling waar het
factureren op volgt, dus het is een statusovergang waar ander werk van
afhangt. En de bestaande conflictregel gaat er kapot van: de flush gooit een
buffer weg als de werkbon al `afgerond` is
(`werkbonOfflineQueue.ts:53-55`). Is de afronding zelf het gebufferde item,
dan is er geen serverwaarde meer om tegen te toetsen en verliest die regel zijn
betekenis. De autosave staat om dezelfde reden al uit voor afgeronde
werkbonnen (`WerkbonMonteurView.tsx:172`).

Afronden blijft dus een online-handeling. Dat is geen beperking maar een
kleine UX-taak: de afrondknop moet uitgezet zijn met uitleg als er geen
verbinding is, niet falen als je erop drukt.

**7. Maatje koppelen aan een project, of verwijderen. Nee.**
`koppelMaatjes` gooit als er nul rijen geraakt zijn
(`src/services/maatjeService.ts:178`), en dat is exact de controle die offline
niet uit te voeren is. Verwijderen in een wachtrij zetten is bovendien
onomkeerbaar bij een verkeerde flush-volgorde: verwijder-dan-schrijf en
schrijf-dan-verwijder geven een ander resultaat, en dat is precies het soort
ordeningsprobleem dat je in een offline app niet wil hebben.

**8. Alles in Email. Nee.** De mailmodule heeft al een leescache
(`mailCache.ts`) en het versturen heeft al een outbox aan de serverkant
(`ingeplande_berichten` met `bron = 'outbox'`,
`supabase/migrations/130_email_outbox_retry.sql:12`). Een derde
verzendwachtrij op het toestel zetten geeft twee outboxen die elkaar niet
kennen.

---

## 4. Ontwerp: de mutation-queue

### 4.1 Opslag, in de stijl van `maatjeOfflineQueue.ts`

Zelfde vorm: raw `indexedDB.open`, verbinding per aanroep openen en in
`finally` sluiten, lezen faalt zacht, schrijven gooit. Geen npm-package nodig
(zie sectie 7).

Eén database, `doen_offline`, versie 1, met **twee** stores. Dat is de enige
bewuste afwijking van het bestaande patroon, en de reden is gemeten: een
`getAll()` op een store met foto-Blobs deserialiseert elke foto in het
geheugen, ook als je alleen wil weten hoeveel items er wachten
(`maatjeOfflineQueue.ts:64` gebruikt in `MaatjeKladblok.tsx:110-112` voor een
`.length`). Met dertig foto's in de rij is dat op een telefoon een echt
probleem.

```ts
// store 1: 'mutaties' · klein, JSON, veilig om helemaal te lezen
interface Mutatie {
  id: string                    // crypto.randomUUID()
  soort: 'werkbon_feedback' | 'werkbon_foto' | 'maatje_nieuw'
  entiteit_id: string           // werkbon.id, of de maatje-uuid
  eigenaar: string              // maakEigenaarSleutel(userId, organisatieId)
  payload: Record<string, unknown>
  gewijzigde_velden: string[]   // alleen wat de gebruiker echt aanraakte
  basis_versie: string | null    // updated_at zoals het toestel hem kende
  heeft_blobs: boolean
  aangemaakt: number
  pogingen: number
  laatste_fout: string | null
  fout_soort: 'netwerk' | 'rechten' | 'weg' | 'conflict' | null
  status: 'wachtend' | 'bezig' | 'vast'
}

// store 2: 'blobs' · keyPath 'id', één rij per mutatie
interface MutatieBlobs {
  id: string                    // gelijk aan Mutatie.id
  bestanden: Record<string, Blob>
}
```

Indexen op `mutaties`, en dit is het tweede verschil met het bestaande
patroon, dat er nul heeft (`maatjeOfflineQueue.ts:31`):

```
'op_status_tijd'   → ['status', 'aangemaakt']   FIFO per status, zonder alles te lezen
'op_entiteit'      → ['soort', 'entiteit_id']   coalescing, zie hieronder
```

De `eigenaar`-sleutel is overgenomen van `mailCache.ts:57`
(`maakEigenaarSleutel(userId, organisatieId)`). Reden: wisselt iemand van
organisatie of logt hij uit, dan mag de wachtrij van de vorige eigenaar niet
opeens onder de nieuwe worden weggeschreven. `AuthContext.tsx:9` doet dat al
voor de mailcache; de mutatiewachtrij hoort daar aan te haken, met dit
verschil: **niet wissen bij uitloggen, wel verbergen**. Een openstaande foto
weggooien omdat iemand uitlogt is dataverlies.

**Coalescing.** Voor `werkbon_feedback` geldt "één open mutatie per werkbon,
laatste wint", precies zoals `werkbonOfflineQueue.ts:8-9` het al doet: bij een
nieuwe buffer wordt de bestaande mutatie voor dezelfde `(soort, entiteit_id)`
vervangen, met de vereniging van de `gewijzigde_velden`. Voor `werkbon_foto`
en `maatje_nieuw` geldt dat niet: elke foto is een eigen item.

### 4.2 De flush

Wat er anders moet dan nu, in volgorde van belang:

**1. Niet stoppen bij de eerste fout.** `MaatjeKladblok.tsx:126` doet een
`break`. In plaats daarvan per item classificeren en doorgaan naar het
volgende. De hele ronde afbreken mag alleen bij een duidelijke
"netwerk-is-weg"-fout, want dan is verder proberen zinloos.

**2. Op app-niveau draaien, niet per scherm.** Nu draaien beide flushes alleen
zolang een bepaald scherm gekoppeld is (`MaatjeKladblok.tsx:135-141`,
`WerkbonMonteurView.tsx:199-205`). De nieuwe flush hoort in `AppLayout`, naast
`OfflineBanner` (`AppLayout.tsx:25-34`), met drie triggers: bij koppelen, op
het `online`-event, en op `visibilitychange` naar zichtbaar. Die derde is er
omdat een telefoon een tab bevriest: de monteur stopt de telefoon in zijn zak
met een volle wachtrij, rijdt naar huis, en haalt hem er weer uit. Op dat
moment is er bereik en is er geen `online`-event, want de verbinding is nooit
zichtbaar weggevallen.

**3. Serieel, met een pogingenteller.** Eén item tegelijk, `pogingen + 1` vóór
de poging (niet erna, want een crash tussen de poging en het bijwerken van de
teller moet als poging tellen, zelfde argument als bij de queue in
`plan-mailsync-queue.md`). Bij vijf pogingen: `status = 'vast'`.

**4. Verwijderen pas ná bevestiging.** De rij uit de wachtrij halen mag pas als
de server heeft bevestigd, precies zoals `MaatjeKladblok.tsx:121-122` het al
doet (`createMaatje` en dan pas `wachtrijVerwijderen`). Sterft het proces
ertussen, dan wordt de mutatie opnieuw aangeboden, en daarom is
idempotentie nodig:

- `werkbon_feedback`: van nature idempotent, het is een UPDATE met vaste
  waarden.
- `maatje_nieuw`: **nu niet idempotent.** `createMaatje` doet twee uploads en
  een insert (`maatjeService.ts:97-113`) met een pad dat uit het nieuwe
  `maatje_id` komt (`:10-12`), dus een tweede poging maakt een tweede rij. Fix:
  genereer het id bij het in de wachtrij zetten en gebruik het bij de flush, zodat
  het storagepad gelijk blijft (`upsert: true` staat al aan, `:29`) en de insert
  op de primaire sleutel botst in plaats van te dupliceren.
- `werkbon_foto`: **nu ook niet idempotent.** Het pad bevat `Date.now()` en een
  willekeurig deel (`WerkbonMonteurView.tsx:243`), dus een tweede poging
  uploadt naar een tweede pad en inserteert een tweede rij. Fix: bepaal het
  pad bij het in de wachtrij zetten, zet het in de payload, en gebruik de
  `mutatie.id` erin. Dan is het pad stabiel over pogingen. Voor de rij in
  `werkbon_fotos` is er geen natuurlijke sleutel; de goedkoopste oplossing is
  vóór de insert controleren of er al een rij met die `url` bestaat. Een unique
  index op `(werkbon_id, url)` zou het netter afdwingen, maar dat is een
  migratie en dus een aparte beslissing.

### 4.3 Conflictresolutie

Dit is het punt waarop offline-apps stukgaan, dus hier de regel expliciet, met
de verdediging erbij.

**De regel: per veld laatste-schrijver-wint, met de server die wint op de
statusovergang, en niets wordt stil weggegooid.**

Uitgewerkt in drie gevallen.

**Geval 1: dezelfde werkbon offline en online gewijzigd, verschillende velden.**
Per-veld laatste-schrijver-wint. Alleen de velden in `gewijzigde_velden` gaan
mee in de UPDATE. Verdediging: die vijf velden hebben in de praktijk precies
één schrijver, en dat is geen aanname maar staat in de code als motivatie
("één monteur op één toestel, dus last-write is prima",
`werkbonOfflineQueue.ts:9`). Binnen die velden is er dus niemand om van te
verliezen.

Waarom het per veld moet en niet per object: de huidige payload bevat altijd
alle vijf de velden (`WerkbonMonteurView.tsx:175-181`), ook die de monteur
nooit heeft aangeraakt. Heeft het kantoor `monteur_opmerkingen` bijgewerkt
terwijl de monteur offline was, dan overschrijft een objectbrede flush die
kantoorwijziging met een oudere waarde. Met `gewijzigde_velden` gebeurt dat
niet.

**Geval 2: de werkbon is inmiddels afgerond.** De server wint, de mutatie
wordt niet toegepast. Dat is de bestaande regel
(`werkbonOfflineQueue.ts:53-55`) en die blijft, want een afgeronde werkbon is
de basis voor een factuur en mag niet achteraf van onder de factuur worden
gewijzigd.

Maar hij mag niet meer stil zijn. Nu is het `clearWerkbonFeedback(id)` en
klaar (`:54`). In het nieuwe ontwerp gaat de mutatie naar `status = 'vast'`
met `fout_soort = 'conflict'` en blijft hij in het overzicht staan, met wat er
in stond, tot de gebruiker hem zelf wegzet. Zo kan de monteur zien dat zijn
drie uur en zijn handtekening niet zijn aangekomen, en waarom.

**Geval 3: dezelfde werkbon, hetzelfde veld, beide gewijzigd.** Hier verliest
iemand, dat is onvermijdelijk. De offline schrijver wint, en het overschreven
werk wordt gelogd in het overzicht ("uren_gewerkt van 4 naar 6 gezet, de
serverwaarde was 5").

**Waarom niet aan de gebruiker vragen?** Omdat de gebruiker een monteur is en
het conflict pas minuten tot uren later boven komt, in een andere context, en
mogelijk op een ander toestel of bij een andere persoon. Een dialoog "welke
versie wil je" is op dat moment niet te beantwoorden: hij weet de andere
waarde niet meer en hij weet niet meer waarom. Een automatische regel plus een
zichtbaar logboek van wat er is overschreven is eerlijker dan een keuze die
niemand kan maken. De enige plek waar het verlies echt onacceptabel is, geval
2, lossen we daarom niet op met een vraag maar met bewaren en tonen.

**Foto's kennen geen conflict.** Het zijn inserts van nieuwe rijen. Het enige
risico is dubbel toevoegen, en dat is een idempotentievraag (4.2) en geen
conflictvraag.

**`basis_versie` is er niet voor het oplossen maar voor het herkennen.** Bij
het in de wachtrij zetten wordt `werkbon.updated_at` meegenomen. Wijkt die bij
de flush af van de serverwaarde, dan weet je dat er iemand tussen heeft
gezeten en kun je geval 3 loggen in plaats van blind overschrijven. Zonder dat
veld zie je het verschil niet en is elk logboek een gok.

### 4.4 Hoe de gebruiker het ziet

Een stille wachtrij die niet leegloopt is erger dan geen wachtrij. Dus:

**Vervang de banner.** `AppLayout.tsx:31` zegt nu "Je bent offline.
Wijzigingen worden niet opgeslagen", en dat wordt met een wachtrij een
onwaarheid die actief schade doet. Drie standen, op dezelfde plek, app-breed:

| Stand | Tekst |
| --- | --- |
| offline, wachtrij leeg | Geen verbinding. Foto's en uren worden bewaard en later verstuurd. |
| wachtrij niet leeg | 3 items wachten op verzending. |
| item vast | 1 item kon niet verstuurd worden. Tik om te bekijken. |

De tweede stand hoort ook te verschijnen als je online bent, want een
wachtrij die niet leegloopt terwijl er verbinding is, is precies het geval dat
nu onzichtbaar is.

**Tikken opent een lijst,** met per item wat het is (foto, uren, maatje), bij
welke werkbon of welk project het hoort, hoe lang het wacht, en bij een vast
item wat er mis is plus een knop "opnieuw proberen".

**Bevestiging per ronde, niet per item.** Eén toast "3 items verstuurd" na een
geslaagde flush. Vijftien toasts achter elkaar maakt het scherm van een
monteur onbruikbaar, en dat is dezelfde afweging die de mailmelding al maakt
("bij meerdere mails één melding met een telling",
`api/cron-email-sync.ts:64-66`).

De teller mag de foto's niet inlezen. Daarom staan de Blobs in een tweede
store (4.1): tellen en tonen gaat over `mutaties`, de bestanden worden pas bij
het versturen aangeraakt.

### 4.5 Wat er gebeurt met een mutatie die permanent faalt

Vier klassen, en de behandeling verschilt per klasse.

| `fout_soort` | Herkenning | Behandeling |
| --- | --- | --- |
| `netwerk` | `Failed to fetch`, `NetworkError`, `AbortError` | opnieuw, tot 5 pogingen, dan `vast` |
| `rechten` | HTTP 403, Postgres `42501`, RLS geweigerd | direct `vast`, nooit opnieuw |
| `weg` | 0 rijen geraakt, HTTP 404, FK-fout `23503` | direct `vast` |
| `conflict` | werkbon `afgerond` | direct `vast`, met de inhoud bewaard |

**Nooit automatisch weggooien.** Een `vast` item blijft in de indicator staan
tot de gebruiker er iets mee doet. Dat is bewuste wrijving: het alternatief is
stil verlies, en bij een foto is die foto de enige kopie. Voor precies dat
geval, `weg` bij een `werkbon_foto`, hoort er een uitweg te zijn: de foto naar
het toestel opslaan of naar een andere werkbon hangen. Weggooien mag alleen de
gebruiker.

Bij `rechten` niet opnieuw proberen, want de oorzaak verandert niet door
wachten (iemand is uit de organisatie gehaald, of de RLS-policy klopt niet) en
elke poging is een mislukte netwerkronde.

**Quotum.** IndexedDB kan `QuotaExceededError` gooien en dat wordt vandaag
nergens opgevangen: niet in `maatjeOfflineQueue.ts:38-51`, niet in
`mailCache.ts`. Met foto's in de wachtrij is een volle telefoon een reëel
scenario. Regel: bij een vol quotum weigert het in de wachtrij zetten met een
duidelijke melding ("telefoon vol, deze foto is niet bewaard"), in plaats van
stil te falen. Beter een monteur die weet dat het niet gelukt is dan een
monteur die denkt dat het wel gelukt is.

**Zichtbaarheid in Sentry.** De filter in `main.tsx:68-72` slikt exact de
foutklasse die een flush oplevert. Een `vast` geraakte mutatie hoort daarom
expliciet naar Sentry gemeld te worden op het moment dat hij `vast` wordt, met
de `fout_soort` erbij, want anders is het enige signaal een monteur die belt.

---

## 5. Migratiepad in stappen

Elke stap los te deployen. De vlaggen komen uit het feature-flag-mechanisme
van migratie 200 (`src/lib/featureFlags.ts`, andere branch): drie standen (aan,
uit, onbekend), `useFeatureAan` faalt dicht voor nieuwe code,
`useFeatureUitgezet` faalt open om iets bestaands te doven.

| Stap | Wat | Omvang | Migratie | Antony's hand |
| --- | --- | --- | --- | --- |
| 1 | service worker registreren bij het opstarten in plaats van alleen achter de meldingen-schakelaar (`push.ts:56-60`) | klein | nee | nee |
| 2 | `doen_offline` bouwen: de twee stores, de indexen, de API. Niemand gebruikt hem | klein | nee | nee |
| 3 | `werkbon_foto` erop, achter `offline_wachtrij` (`useFeatureAan`, faalt dicht). Grootste winst, geen bestaand gedrag om stuk te maken | groot | nee | ja, vlag aan |
| 4 | app-brede indicator plus de lijst, en de banner in `AppLayout.tsx:31` herschrijven | groot | nee | nee |
| 5 | `werkbon_feedback` van localStorage naar de nieuwe wachtrij, met een eenmalige overzetting van bestaande entries | groot | nee | ja, vlag aan |
| 6 | `maatje_nieuw` overzetten, en de `navigator.onLine`-voorwaarde uit `MaatjeKladblok.tsx:254` halen | klein | nee | ja, vlag aan |
| 7 | oude paden verwijderen: `werkbonOfflineQueue.ts`, `maatjeOfflineQueue.ts` | klein | nee | nee |

Stap 1 is veilig los te doen en hoort eerst, omdat er nu voor de meeste
gebruikers geen worker is (1.3). Zolang die worker geen `fetch`-handler heeft,
verandert registreren functioneel niets: hij vangt geen verzoek af. Het zet
alleen de voorwaarde klaar.

Stap 3 vóór stap 5 is bewust. De werkbonfoto is nieuw gedrag, dus daar valt
niets terug te draaien. De werkbon-feedback werkt vandaag al, dus daar is een
regressie mogelijk, en die wil je pas riskeren als de wachtrij zich in
productie op de foto's heeft bewezen.

De terugweg: de vlaggen op uit. Bij stap 5 en 6 betekent dat wel dat wat er in
`doen_offline` staat blijft staan terwijl het oude pad weer schrijft. Daarom
hoort de overzetting in stap 5 een kopie te zijn en geen verplaatsing: laat de
localStorage-entries staan tot de nieuwe wachtrij ze bevestigd heeft
verstuurd.

Bij stap 5 zit één echte val: de flush van het oude en het nieuwe pad zouden
dezelfde payload twee keer kunnen aanbieden. Voor de feedback is dat
onschadelijk (idempotente UPDATE met dezelfde waarden), en dat is precies
waarom deze mutatiesoort de veilige is om te migreren.

---

## 6. Wat dit ontwerp expliciet niet doet

**Geen offline app-shell.** De app moet geladen zijn voordat je het bereik
verliest. Voor het echte scenario is dat verdedigbaar: de monteur opent de app
bij het hek, waar bereik is, en klimt daarna het dak op. Het tabblad blijft
leven, de wachtrij werkt. Wat er niet werkt is een harde herlaadactie zonder
bereik.

Dat is een echte beperking en ik doe niet alsof dat niet zo is. Maar de shell
cachen betekent een precache-manifest met gehashte bestandsnamen bijhouden, en
dat is precies het probleem dat `public/sw.js:4-7` bewust heeft vermeden
("een service worker die bestanden vasthoudt is berucht om vastzittende
versies"). Het is een eigen beslissing met een eigen risicoprofiel, en die
hoort niet meegesmokkeld te worden in een ontwerp dat over vastleggen gaat.

**Geen offline lezen van projectdata.** Zou nuttig zijn (adres, opdracht), en
`mailCache.ts` bewijst dat het patroon er is. Maar het is comfort, geen
dataverlies, en het vraagt een antwoord op de vraag hoe oud gecachte
klantgegevens mogen zijn.

**Geen Background Sync.** De `sync`-event in de service worker zou de flush
laten draaien zonder dat de app open staat, wat precies is wat een monteur
wil. Maar het is alleen Chromium: geen Safari, dus geen iPhone. De
buitendienst op iOS zou het stil niet hebben, en een offline-mechanisme dat
op de helft van de toestellen stil iets anders doet is erger dan er een dat
overal hetzelfde doet. De flush hoort dus op `online` plus
`visibilitychange` in de pagina. Background Sync kan er later bovenop als
extra voor Android.

---

## 7. Vraag aan Antony: npm-packages

**Dit is een expliciete vraag, want nieuwe packages vragen zijn toestemming
(`CLAUDE.md:23`).** Er staat nu geen enkele offline-afhankelijkheid in
`package.json`.

Mijn advies is de vraag te splitsen, omdat de twee helften een heel verschillend
risico hebben.

**Voor de mutation-queue: geen package nodig. Bouwen zonder.** Het bestaande
hand-geschreven patroon werkt en is 88 regels
(`maatjeOfflineQueue.ts`). Er is geen technische reden om daar een
afhankelijkheid voor binnen te halen.

**`idb` (ongeveer 1,5 kB gzip): nice-to-have, geen noodzaak.** Het zet
IndexedDB in promises. Het zou het boilerplate wegnemen dat nu twee keer los
van elkaar is uitgeschreven (`maatjeOfflineQueue.ts:26-36` en
`mailCache.ts:34-54`), en met cursors en indexen erbij wordt dat boilerplate
groter. Ik zou het niet vragen voor deze bouw. Als de wachtrij staat en er een
derde IndexedDB-gebruiker bij komt, wordt het een redelijk voorstel.

**`vite-plugin-pwa` plus `workbox-window`: dit is de echte vraag, en alleen
nodig als de offline app-shell erbij hoort.** Zonder zo'n plugin moet de lijst
gehashte bundelnamen met de hand worden bijgehouden, en die lijst gaat
verouderen. Met de plugin krijg je precaching en een `navigateFallback` voor
de SPA-route (`vercel.json:9` doet die rewrite nu serverside).

De keerzijde is precies het bezwaar dat in `public/sw.js:4-7` staat: een
cachende worker brengt een versieprobleem mee dat deze codebase bewust niet
heeft. En het voegt een stap toe aan de build.

**Concreet voorstel, ter beslissing:** bouw eerst de wachtrij met nul nieuwe
packages. Beslis pas over `vite-plugin-pwa` als de app-shell op tafel komt, en
dan als eigen onderwerp met een eigen afweging. Dan is die vraag ook beter te
beantwoorden, want dan is bekend hoe vaak een monteur in de praktijk tegen een
harde herlaadactie zonder bereik aanloopt.

---

## 8. Nog uit te werken

- **De precieze detectie van de foutklassen** uit 4.5 tegen de echte
  antwoorden van supabase-js. Welke fout een RLS-weigering oplevert versus een
  lege update is niet uit de code te lezen zonder het te draaien.
- **Waar `gewijzigde_velden` vandaan komt.** `WerkbonMonteurView.tsx` heeft nu
  één `userChangedRef` voor alles (`:166`, `:171`), geen bijhouding per veld.
  Dat is een kleine maar echte uitbreiding aan dat scherm.
- **Wat er gebeurt met de wachtrij bij uitloggen of orgwissel.** Het ontwerp
  zegt verbergen en niet wissen (4.1), maar wie de items dan later leegmaakt is
  niet uitgewerkt.
- **Het overzicht-scherm zelf** uit 4.4 is als gedrag beschreven, niet als
  ontwerp.
- **De afrondknop offline uitzetten** (geval 6 in sectie 3) is als taak
  genoemd, niet uitgewerkt.

---

## 9. Niet geverifieerd

**1. Of het `|| undefined`-patroon in de payload velden echt niet leegmaakt.**
`WerkbonMonteurView.tsx:176` en `:179` zetten een leeg veld op `undefined`, en
`JSON.stringify` laat sleutels met `undefined` weg, dus PostgREST ziet ze niet
en werkt ze niet bij. Als dat klopt, kan een monteur een eerder ingevulde
opmerking niet meer leegmaken, online noch offline. De code leest zo, maar het
is niet gedraaid en het hangt af van hoe supabase-js het lichaam
serialiseert. Te testen met een `update` met een expliciet leeg veld.

**2. Hoeveel monteurs de app daadwerkelijk op een telefoon gebruiken, en op
welk platform.** Bepaalt of het Background-Sync-argument in sectie 6 zwaar
weegt. Niet uit de code te halen.

```sql
-- indicatie: wie heeft een eigen mobiel menu ingesteld
SELECT count(*) FILTER (WHERE mobiel_menu_items IS NOT NULL) AS eigen_menu,
       count(*) AS totaal
  FROM profiles;
```

**3. Hoe vaak een upload nu echt mislukt.** Dat is de grootte van het probleem,
en het is niet te meten, want de `catch` op
`WerkbonMonteurView.tsx:255-259` logt alleen naar de console en de filter in
`main.tsx:68-72` houdt netwerkfouten uit Sentry. Zonder dat getal is de
urgentie van dit hele item een aanname. Kleinste stap om het te weten:
`Sentry.captureMessage` in die `catch`, los van al het bovenstaande.

**4. Hoeveel foto's een monteur op een dag maakt, en dus hoeveel ruimte de
wachtrij nodig heeft.** `resizeImage(file, 1200)`
(`WerkbonMonteurView.tsx:241`) begrenst de maat, maar niet het aantal. Bepaalt
of het quotum-scenario uit 4.5 theoretisch is of dagelijks.

```sql
SELECT date_trunc('day', created_at) AS dag, count(*) AS fotos
  FROM werkbon_fotos
 GROUP BY 1 ORDER BY 1 DESC LIMIT 30;
```

**5. Of `werkbon_fotos` een unique constraint op de url heeft.** De
idempotentie-oplossing in 4.2 valt of staat hiermee. In de migratiemap heb ik
er geen gevonden, maar het geheugen bij dit project meldt dat de database
achterloopt op de migratiemap, dus de andere kant kan ook waar zijn.

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'werkbon_fotos';
```

**6. Of de service worker in productie überhaupt actief is bij de mensen die
push aan hebben gezet.** `push.ts:48` leest de registratie, maar of die
registratie op de toestellen van de buitendienst leeft, is alleen op een
toestel te zien (chrome://serviceworker-internals, of Safari's ontwikkelmenu).

**7. Of het CSP-beleid een cachende worker toestaat.** `vercel.json:28` heeft
`worker-src 'self' blob:`, wat er goed uitziet, maar het beleid staat op
`Content-Security-Policy-Report-Only`, dus wat er gebeurt zodra het
afdwingend wordt is niet getest.

**8. Of er nu al items in de bestaande wachtrijen vastzitten.** Alleen op een
toestel te zien: `localStorage['doen_werkbon_feedback_queue']` en de
IndexedDB-database `doen_maatjes`. Als daar iets in staat dat er weken staat,
is het `break`-probleem uit 1.5(a) geen theorie.
