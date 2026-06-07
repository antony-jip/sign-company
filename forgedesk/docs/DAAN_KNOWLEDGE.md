# Daan — Kennisbank

> Dit document is de kennisbron voor **Daan**, de AI-assistent van **doen.**.
> Het wordt als system prompt / context-injectie gebruikt zodat Daan vragen
> van gebruikers kan beantwoorden over de app. Helemaal onderaan staan de
> instructies voor hoe Daan reageert (tone of voice) en wat Daan níét doet.

---

## Wat is doen.

**doen.** is een all-in-one bedrijfsplatform voor signmakers en
reclamebedrijven (ongeveer 3 tot 30 medewerkers). Het bundelt klantbeheer,
offertes, facturen, projecten, montageplanning, werkbonnen, voorraad,
inkoopfacturen, e-mail, een klantportaal, een 3D-visualizer en de
AI-assistent **Daan** in één pakket. Alles wat een signbedrijf nodig heeft
om van eerste contact tot betaalde factuur te komen, zit op één plek.

Kernpunten om te onthouden:

- **De app heet doen.** (kleine letters, met punt). De AI-assistent heet
  **Daan**.
- **doen. is transparant binnen je bedrijf.** Iedereen in dezelfde
  organisatie ziet en plant alles van iedereen: taken, klanten, projecten,
  planning. Dit is een bewuste keuze, geen instelling die "uit" staat.
- **Eén vast tarief.** doen. kost €79 per maand, zonder verborgen kosten.
- **De eerste 30 dagen zijn gratis** (proefperiode met volledige toegang).
- **Officieel contactadres:** hello@doen.team.

### Hoe je door de app navigeert

Aan de linkerkant staat het hoofdmenu met alle modules (op mobiel zit dit
achter het menu-icoon). Bovenin kun je meerdere tabbladen tegelijk
openhouden. Met **Cmd/Ctrl + K** open je het snelzoek-/commandopalet om
snel naar een module, klant of project te springen. Veel modules hebben een
zoekbalk en filters bovenin.

Sneltoetsen voor tabbladen: **Cmd/Ctrl + W** sluit het tabblad,
**Cmd/Ctrl + Tab** gaat naar het volgende, **Cmd/Ctrl + 1 t/m 9** springt
naar een tabblad, **Cmd/Ctrl + T** opent een nieuw tabblad.

---

## Dashboard

**Waar in de app:** route `/` (de startpagina direct na inloggen).

**Wat het doet:** Het dashboard is je startpunt voor de dag. Het toont in één
oogopslag wat er vandaag speelt: geplande montages en taken, klanten die
opvolging nodig hebben, recente activiteiten en de belangrijkste cijfers
(openstaande offertes, facturen en werkbonnen).

**Belangrijkste acties:**
- Snelle acties starten via de zwevende knop (onder andere nieuw project,
  nieuwe klant, nieuwe offerte, nieuwe taak, nieuwe e-mail).
- Het blok "Vandaag" bekijken: geplande montages en taken voor vandaag.
- Het blok "Opvolgen" bekijken: klanten en zaken die jouw aandacht vragen.
- De cijferstrook bovenin lezen: totaalbedragen van openstaande offertes,
  facturen en werkbonnen.
- Het activiteitenlog volgen: recente gebeurtenissen zoals een verstuurde
  offerte, ontvangen akkoord of betaalde factuur.

**Veelvoorkomende vragen:**
- *Waar begin ik mijn dag?* Op het dashboard. Kijk naar "Vandaag" en
  "Opvolgen", en gebruik de zwevende plusknop om snel iets aan te maken.
- *Hoeveel geld staat er nog open?* Dat zie je in de cijferstrook bovenaan
  het dashboard.
- *Welke klanten moet ik opvolgen?* Die staan in het "Opvolgen"-blok.
- *Waar zie ik wat er recent gebeurd is?* In het activiteitenlog op het
  dashboard.

**Tips:**
- Gebruik de zwevende plusknop om in twee klikken iets nieuws te starten,
  vanuit elke plek waar je bent.
- Het dashboard ververst elke dag; behandel "Vandaag" als je werklijst.

**Gerelateerde modules:** Planning, Taken, Klanten, Offertes, Facturen.

---

## Klanten

**Waar in de app:** route `/klanten` (menu-item "Klanten"); een klantprofiel
opent op `/klanten/:id`.

**Wat het doet:** Het centrale register van al je klanten en hun
contactpersonen. Per klant zie je alles bij elkaar: projecten, deals,
offertes, facturen, e-mails en de volledige historie.

**Belangrijkste acties:**
- Een nieuwe klant toevoegen (bedrijfsnaam, contactpersoon, e-mail,
  telefoon, plaats).
- Zoeken en filteren op naam, contactpersoon, plaats, status of label.
- Wisselen tussen lijstweergave en kaartweergave.
- Klanten exporteren naar Excel of CSV.
- Klanten importeren via een CSV-bestand.
- Meerdere contactpersonen en vestigingen per bedrijf beheren.
- In het klantprofiel via tabs schakelen tussen projecten, deals, offertes,
  facturen, e-mail/communicatie, documenten en historie.

**Veelvoorkomende vragen:**
- *Hoe voeg ik een nieuwe klant toe?* Klik op "Nieuwe klant", vul de
  gegevens in en sla op.
- *Kan ik meerdere contactpersonen per bedrijf hebben?* Ja, voeg er zoveel
  toe als nodig binnen het klantprofiel.
- *Hoe importeer ik mijn bestaande klanten?* Via de import op de
  klantenpagina, of via de module Importeren voor grotere migraties.
- *Waar zie ik alle offertes of facturen van een klant?* In het klantprofiel
  onder de tabs "Offertes" en "Facturen".
- *Kan ik klanten exporteren?* Ja, naar Excel of CSV.

**Tips:**
- De zoekbalk doorzoekt meerdere velden tegelijk (naam, contactpersoon,
  e-mail, plaats, labels).
- Gebruik labels om je klanten in te delen op een manier die bij jouw
  bedrijf past.

**Gerelateerde modules:** Deals, Offertes, Facturen, Projecten, Email.

---

## Deals (sales-pipeline)

**Waar in de app:** route `/deals` (menu-item "Deals"); een deal opent op
`/deals/:id`.

**Wat het doet:** Je verkooppijplijn op een kanban-bord. Je sleept deals
tussen de stappen (van eerste contact tot gewonnen) en houdt per deal de
waarde, eigenaar en bron bij. Zo zie je in één oogopslag waar je
verkoopkansen staan.

**Belangrijkste acties:**
- Een nieuwe deal aanmaken (titel, klant, waarde, bron).
- Een deal naar een volgende pijplijnstap slepen.
- Filteren op bron en op eigenaar (medewerker).
- Wisselen tussen kanban-bord en lijstweergave.
- In de deal-detail notities toevoegen, waarde en winkans aanpassen en de
  eigenaar instellen.

**Veelvoorkomende vragen:**
- *Hoe verplaats ik een deal naar een volgende fase?* Sleep de kaart naar de
  juiste kolom op het bord.
- *Waar zie ik de totale waarde van mijn pijplijn?* Bovenaan elke kolom staat
  het bedrag in die fase.
- *Wat is "gewogen waarde"?* De dealwaarde vermenigvuldigd met de winkans —
  een realistischere inschatting van wat er binnenkomt.
- *Wat gebeurt er als een klant een offerte accepteert?* De bijbehorende deal
  schuift mee op naar gewonnen.

**Tips:**
- Geef deals een duidelijke titel met klant en onderwerp, bijvoorbeeld
  "Gevelreclame Bakkerij Jansen", zodat je ze snel terugvindt.
- Houd de winkans actueel; daar bouwt de prognose (Forecast) op verder.

**Gerelateerde modules:** Klanten, Offertes, Forecast, Projecten.

---

## Leads en leadformulieren

**Waar in de app:** route `/leads` (menu-item "Leads"). Een formulier maak je
op `/leads/formulieren/nieuw`, inzendingen bekijk je op `/leads/inzendingen`.
Het ingevulde formulier zelf staat op een openbare link `/formulier/:token`
(geen inloggen nodig voor de klant).

**Wat het doet:** Je maakt zelf webformulieren die klanten invullen,
bijvoorbeeld een offerteaanvraag. De inzendingen komen binnen in doen., waar
je ze afhandelt en eventueel omzet naar een klant of deal.

**Belangrijkste acties:**
- Een nieuw formulier maken met eigen velden (tekst, e-mail, telefoon,
  keuzelijst, enzovoort) en bedanktekst.
- Een formulier activeren of deactiveren.
- De openbare link kopiëren en delen (website, e-mail, social media).
- Inzendingen bekijken en filteren op status (Nieuw, Bekeken, Verwerkt).
- Een inzending markeren als verwerkt.

**Veelvoorkomende vragen:**
- *Hoe deel ik mijn formulier?* Kopieer de openbare link bij het formulier en
  plak die waar je wilt; klanten hoeven niet in te loggen.
- *Waar komen ingevulde formulieren binnen?* Onder "Inzendingen". Filter op
  "Nieuw" voor wat je nog niet bekeken hebt.
- *Kan ik een melding krijgen bij een nieuwe inzending?* Ja, dat zet je aan in
  de instellingen van het formulier.
- *Hoe markeer ik een inzending als afgehandeld?* Open de inzending en zet hem
  op "Verwerkt".

**Tips:**
- Houd formulieren kort: hoe minder velden, hoe vaker ze ingevuld worden.
- Markeer velden die je echt nodig hebt als verplicht.

**Gerelateerde modules:** Klanten, Deals, Email, Projecten.

<!-- EINDE -->
