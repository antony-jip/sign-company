# Plan · Service worker en webpush

Status: **voorstel, nog niet gebouwd.** Opgesteld augustus 2026 na de
mobiele UX-ronde.

## Waarom

De mobiele app is inmiddels een goede mobiele website. Twee lagen
ontbreken om hem als app te laten aanvoelen:

1. **Offline.** Er is geen service worker, dus zonder bereik is er niets.
   De `OfflineBanner` zegt nu eerlijk "wijzigingen worden niet
   opgeslagen" — dat is de erkenning dat die laag ontbreekt. Op een
   bouwplaats of in een parkeergarage is de app daarmee onbruikbaar.
2. **Push.** Nieuwe mail komt binnen via een cron van drie minuten plus
   een realtime-abonnement, maar alleen zolang de app openstaat. Zonder
   push moet je de app openen om te weten dat er iets is.

Het manifest is al compleet (iconen incl. maskable, `display:
standalone`, shortcuts). De service worker is het enige dat ontbreekt om
van installeerbaar naar echt-een-app te gaan.

## Randvoorwaarden om vooraf te beslissen

**Nieuwe dependencies.** Volgens `CLAUDE.md` mag dat niet zonder
expliciete toestemming. Twee keuzes:

| | Met packages | Zonder |
|---|---|---|
| Service worker | `vite-plugin-pwa` (workbox): precache-manifest per build, updateflow, ~1 dag werk | Handgeschreven `public/sw.js` + registratie: volledige controle, maar cache-invalidatie per release schrijf je zelf, ~2-3 dagen |
| Push server-side | `web-push` (VAPID-ondertekening) | Zelf VAPID/JWT ondertekenen met `crypto` — foutgevoelig, afgeraden |

Advies: `vite-plugin-pwa` en `web-push`. Beide zijn de facto standaard
en klein. Zonder `web-push` zou ik push niet doen.

**iOS-beperking, en die is bepalend.** Webpush werkt op iOS pas vanaf
16.4 én uitsluitend als de gebruiker de site aan zijn beginscherm heeft
toegevoegd. In Safari als gewone tab krijg je niets. Antony moet doen.
dus installeren voordat push iets doet. Dat is geen bug maar een
gegeven, en het hoort in de onboarding.

## Fase 1 — Service worker en app-shell offline

Doel: de app start zonder netwerk en toont wat je het laatst zag.
Bewust **lezen, niet schrijven**.

1. `vite-plugin-pwa` in `vite.config.ts`, `registerType: 'prompt'`.
   Bewust geen `autoUpdate`: een release die zichzelf midden in het
   invullen van een offerte doorvoert, is erger dan een dag oude versie.
2. Precache de build-assets. Navigatie-fallback naar `index.html`.
3. Runtime-cache, network-first met korte timeout, voor de
   Supabase-lijstqueries die de app bij opstart doet (`emails_list_view`,
   projecten, klanten). Stale-while-revalidate voor logo's en avatars.
4. **Niet cachen:** alles onder `/api/*`, auth-tokens, en elke
   POST/PATCH. Een gecachet antwoord op een mutatie is datacorruptie.
5. Update-melding in de UI: een discrete balk "nieuwe versie klaar ·
   herladen", die de bestaande `OfflineBanner` als patroon volgt.
6. `OfflineBanner` herschrijven: hij mag dan zeggen wat wél kan
   ("je kijkt naar opgeslagen gegevens") in plaats van alleen wat niet.

**Risico.** Een service worker is berucht om vastzittende caches. Nodig:
een `SKIP_WAITING`-boodschap, een versienummer in de cache-key, en een
noodluik (`/?nosw=1` dat unregistert) voordat dit naar productie gaat.

**Buiten scope:** offline schrijven. Mutaties in een wachtrij zetten en
later synchroniseren betekent conflictafhandeling, volgnummers voor
offertes en facturen die je niet offline mag uitdelen, en RLS-checks die
pas bij synchronisatie falen. Dat is een eigen project, geen fase.

## Fase 2 — Webpush voor nieuwe mail

1. **Migratie:** tabel `push_abonnementen` (`user_id`, `endpoint`,
   `p256dh`, `auth`, `user_agent`, `aangemaakt_op`). RLS op `user_id`,
   niet op `organisatie_id` — een pushabonnement hoort bij een toestel
   van één persoon. Zelfde uitzondering als de e-mailcredentials.
2. **Toestemming vragen op het juiste moment.** Niet bij het opstarten.
   Wel na een handeling die het uitlegt: bij het inschakelen van een
   "waarschuw me bij nieuwe mail"-schakelaar in Instellingen > E-mail.
   Eén weigering is permanent, dus de vraag moet raak zijn.
3. **Verzendkant:** `api/push-verstuur.ts`, VAPID-sleutels als
   env-vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
   Verlopen endpoints (410/404) meteen opruimen, anders groeit de tabel
   vol met dode toestellen.
4. **Trigger:** `api/cron-email-sync.ts` weet al hoeveel mail er per
   gebruiker binnenkwam (`synced`). Dat is het natuurlijke haakje — geen
   nieuwe polling nodig.
5. **Inhoud:** afzender en onderwerp, met een deeplink naar `/email`.
   Geen berichttekst in de notificatie: die staat op een vergrendelscherm
   dat anderen kunnen zien.
6. **Groeperen:** één melding per ronde bij meerdere mails ("3 nieuwe
   berichten"), niet één per mail. Anders is het na een halve dag
   onbruikbaar.

**Ook te beslissen:** willen we push alleen voor mail, of ook voor
portaal-reacties en toegewezen taken? De `notificaties`-tabel bestaat al
en staat al in de realtime-publicatie; die zou een tweede bron kunnen
zijn met dezelfde infrastructuur.

## Volgorde en inschatting

| Stap | Inschatting | Waarde |
|---|---|---|
| Fase 1 · service worker + app-shell | 1-2 dagen incl. noodluik en testen | App start zonder bereik |
| Fase 1b · runtime-cache lijsten | 0,5 dag | Laatst geziene data zichtbaar |
| Fase 2 · push-infrastructuur | 1 dag | — |
| Fase 2b · mail-trigger + UI | 0,5 dag | Melding op je vergrendelscherm |

Fase 2 kan zonder fase 1, maar niet zonder service worker — die is de
drager van beide. Fase 1 eerst is dus geen keuze maar een volgorde.

## Wat dit níet oplost

- Offline een offerte maken of een werkbon aftekenen. Zie hierboven.
- Achtergrond-synchronisatie op iOS: `Background Sync` en
  `Periodic Sync` ondersteunt Safari niet. Push blijft daar de enige
  manier om iets te weten zonder de app te openen.
- Push in Safari als gewone tab. Alleen geïnstalleerd.
