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

## Offertes

**Waar in de app:** route `/offertes` (menu-item "Offertes"). Een offerte maak
je op `/offertes/nieuw` en bewerk je op `/offertes/:id/bewerken`.

**Wat het doet:** Hier maak, verstuur en beheer je al je offertes. Het
overzicht is een kanban-bord waar offertes door fases lopen: van concept naar
verstuurd, bekeken, akkoord en gefactureerd (met aparte plekken voor
afgewezen, verlopen en wijziging-gevraagd). Je sleept een offerte naar een
andere fase of bewerkt hem in de editor.

**Belangrijkste acties:**
- Een nieuwe offerte maken: kies de klant, geef een titel; het nummer wordt
  automatisch toegekend.
- Regels toevoegen met omschrijving, aantal, prijs, btw en korting.
- Prijzen opbouwen met de calculator: uren maal uurtarief plus materiaal plus
  marge. Per regel kun je een gedetailleerde calculatie maken.
- Prijsvarianten of optionele regels toevoegen, zodat de klant zelf kan kiezen.
- Een offerte versturen per e-mail (met pdf) of via een openbare link waarmee
  de klant online kan accepteren.
- Een offerte opvolgen met een herinnering.
- Offerteregels kopiëren en in een andere offerte plakken (handig voor
  terugkerend werk).

**Prijzen ex of inclusief btw:** In de app werk je standaard met bedragen
**exclusief btw** (het hoofdbedrag staat groot ex btw, met het inclusief-bedrag
klein eronder). Wat de **klant** ziet in de pdf en de online offerte is het
bedrag **inclusief btw**.

**Versies:** Tijdens het bewerken worden je wijzigingen automatisch bewaard en
kun je versies (momentopnamen) opslaan en terugdraaien. De klant ziet alleen de
versie die jij verstuurd hebt.

**Veelvoorkomende vragen:**
- *Hoe verstuur ik een offerte?* Open de offerte en kies versturen; je kunt
  per e-mail versturen met pdf, en/of een openbare link delen waarmee de klant
  online accepteert.
- *Kan ik een offerte aanpassen nadat ik hem verstuurd heb?* Maak een nieuwe
  versie en verstuur die opnieuw. De klant ziet welk versienummer hij heeft.
- *Hoe zie ik of de klant de offerte bekeken heeft?* De offerte schuift op het
  bord naar "Bekeken" en je krijgt dit terug in het overzicht.
- *Werkt de app met bedragen ex of inclusief btw?* In de app ex btw, voor de
  klant inclusief btw.
- *Wat gebeurt er als de klant akkoord geeft?* De offerte komt op "Akkoord" te
  staan en je kunt er een factuur en/of werkbon uit maken.
- *Kan ik regels uit een eerdere offerte hergebruiken?* Ja, kopieer de regels
  en plak ze in de nieuwe offerte.

**Tips:**
- Markeer dure of extra onderdelen als optioneel; klanten waarderen de keuze en
  het verhoogt de kans op akkoord.
- Zet de geldigheidsdatum ruim genoeg, zodat de klant tijd heeft om te
  beslissen.
- Controleer de pdf-preview vóór versturen, zodat logo en huisstijl goed staan.

**Gerelateerde modules:** Klanten, Deals, Facturen, Klantportaal, Projecten,
Calculatie-instellingen.

---

## Inkoopoffertes

**Waar in de app:** route `/inkoopoffertes` (menu-item "Inkoopoffertes").

**Wat het doet:** Hier verzamel je offertes die je van je leveranciers
ontvangt. Je uploadt de pdf, de app leest de regels (product, aantal, prijs)
eruit, en je kunt die inkoopprijzen gebruiken als basis voor je eigen offerte
en marge.

**Belangrijkste acties:**
- Een inkoopofferte uploaden (pdf) en de leverancier kiezen.
- De automatisch herkende regels controleren en corrigeren.
- De inkoopprijzen gebruiken bij het opbouwen van je eigen klantofferte.

**Veelvoorkomende vragen:**
- *Waarvoor gebruik ik inkoopoffertes?* Om leveranciersprijzen vast te leggen
  en je verkoopmarge op te bouwen.
- *Moet ik de herkende prijzen controleren?* Ja, controleer de uitgelezen
  regels altijd voordat je ze gebruikt.

**Tips:**
- Bewaar inkoopoffertes als onderbouwing van je marge per project.

**Gerelateerde modules:** Offertes, Leveranciers, Inkoopfacturen.

---

## Facturen

**Waar in de app:** route `/facturen` (menu-item "Facturen"). De module heeft
tabs voor verkoopfacturen en inkoopfacturen.

**Wat het doet:** Hier maak en beheer je je verkoopfacturen. Je kunt een
factuur handmatig opstellen of automatisch uit een geaccepteerde offerte laten
maken, versturen naar de klant, betalingen bijhouden, herinneringen sturen en
creditnota's of voorschot- en eindafrekeningen maken.

**Belangrijkste acties:**
- Een nieuwe factuur maken, of een factuur maken vanuit een offerte (de regels
  worden overgenomen).
- Een voorschotfactuur maken (een percentage van de offerte) en later een
  eindafrekening.
- Een creditnota maken op een bestaande factuur.
- Een factuur als pdf downloaden of als UBL (e-factuur) exporteren.
- Een betalingsherinnering sturen.
- Een factuur als betaald markeren.

**Factuurstatussen (globaal):** concept, verstuurd, betaald, en vervallen
(over de vervaldatum). Een gecrediteerde factuur is afgesloten met een
creditnota.

**Veelvoorkomende vragen:**
- *Hoe maak ik een factuur uit een offerte?* Kies bij het aanmaken voor "vanuit
  offerte" en selecteer de geaccepteerde offerte; de regels worden overgenomen.
- *Hoe stuur ik een herinnering?* Open de factuur en kies een herinnering te
  versturen; dit kan in oplopende toon naarmate de factuur langer openstaat.
- *Hoe markeer ik een factuur als betaald?* Zet de status zelf op betaald.
  Let op: de koppeling met Exact stuurt gegevens éérst naar Exact, de
  betaald-status vink je in doen. zelf af.
- *Wat is een UBL-bestand?* Een e-factuur in een standaardformaat dat je kunt
  inlezen in boekhoudsoftware.
- *Wat is het verschil tussen een voorschot en een creditnota?* Een voorschot
  is een deelbetaling vooraf (positief bedrag), een creditnota is een
  terugboeking (negatief bedrag).

**Tips:**
- Vul betaaldatums in; dat houdt je openstaande bedragen en cashflow
  inzichtelijk.
- Een factuur die op "vervallen" staat, is een seintje om een herinnering te
  sturen of te bellen.

**Gerelateerde modules:** Offertes, Klanten, Inkoopfacturen, Financieel,
Rapportages, Klantportaal (online betalen).

---

## Inkoopfacturen

**Waar in de app:** route `/facturen`, tab "Inkoop" (oude links zoals
`/inkoopfacturen` leiden hierheen).

**Wat het doet:** Facturen van je leveranciers worden automatisch opgehaald uit
een aparte e-mailinbox. De app leest met behulp van AI het bedrag, de datum, het
factuurnummer en de leverancier uit de pdf. Jij controleert en keurt goed of
af, en de factuur wordt gekoppeld aan je uitgaven.

**Belangrijkste acties:**
- De inkoop-inbox synchroniseren om nieuwe facturen op te halen.
- De automatisch uitgelezen gegevens laten extraheren en controleren.
- Een inkoopfactuur goedkeuren of afwijzen.
- De e-mailinbox eenmalig instellen (IMAP-gegevens + verbinding testen).

**Veelvoorkomende vragen:**
- *Hoe komen inkoopfacturen binnen?* Via een gekoppelde e-mailinbox waar je
  leveranciersfacturen naartoe laat sturen; doen. haalt ze automatisch op.
- *Klopt de uitgelezen informatie altijd?* Niet altijd. Controleer de bedragen
  en gegevens voordat je goedkeurt.
- *Waarom wordt mijn factuur niet opgehaald?* Controleer of de mail met bijlage
  in de juiste inbox/het juiste label terechtkomt en of de verbinding nog werkt.
- *Wat gebeurt er met afgewezen facturen?* Die worden gearchiveerd en tellen
  niet mee in je overzichten.

**Tips:**
- Loop de te beoordelen inkoopfacturen geregeld na, zodat je uitgaven actueel
  blijven.
- Het uitlezen met AI kent een maandlimiet; bij vragen daarover is
  hello@doen.team het contactadres.

**Gerelateerde modules:** Facturen, Leveranciers, Uitgaven (Financieel),
Voorraad.

<!-- EINDE -->
