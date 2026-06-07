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

## Projecten

**Waar in de app:** route `/projecten` (menu-item "Projecten"). Een nieuw
project maak je op `/projecten/nieuw`, een project open je op `/projecten/:id`.

**Wat het doet:** Het project is de plek waar al het werk voor één klus
samenkomt: van offerte en akkoord tot productie, montage en factuur. In het
projectoverzicht zie je al je projecten met status, fase, klant, deadline en
geplande montage. In het project zelf (het cockpit) heb je alles van die klus
op één scherm.

**Belangrijkste acties:**
- Een nieuw project aanmaken voor een klant.
- Zoeken en filteren op status; met het filter "Met aandacht" zie je projecten
  die op jou wachten.
- Vanuit het project een offerte, werkbon, montageafspraak of factuur maken.
- Documenten uploaden en met de klant delen via het portaal.

**Het project-cockpit:** Het cockpit (het overzicht binnen een project) bundelt
onder andere:
- een **fase-balk** die laat zien waar het project staat in het traject;
- een **"wat nu"-suggestie** met de logische volgende stap;
- een **acties-kaart** met snelknoppen (offerte, werkbon, montage, factuur);
- een overzicht van **taken en offertes**;
- een **montage-sectie** met geplande afspraken en monteurs;
- een **klantkaart** met contactgegevens;
- een **bestanden-sectie** en een **activiteitenoverzicht**;
- een **portaal-paneel** dat toont wat de klant in het portaal gedaan heeft.

**Veelvoorkomende vragen:**
- *Wat betekent het filter "Met aandacht"?* Dat zijn projecten die op een actie
  van jou wachten, bijvoorbeeld een offerte die nog akkoord moet krijgen of een
  werkbon die nog afgemeld moet worden.
- *Hoe maak ik een werkbon voor de monteur?* Vanuit het project via de
  acties-kaart; je kiest welke onderdelen meegaan.
- *Kan een project meerdere klanten hebben?* Nee, één project hoort bij één
  klant. Een klant kan wel meerdere projecten hebben.
- *Waar zie ik wat de klant in het portaal gedaan heeft?* In het portaal-paneel
  van het cockpit.
- *Hoe plan ik montage in?* Vanuit het project via de acties-kaart, of in de
  module Planning.

**Tips:**
- Volg de "wat nu"-suggestie als leidraad; die wijst naar de logische volgende
  stap.
- Upload tekeningen en foto's in het project, dan staat alles bij elkaar en kun
  je het direct met de klant delen.

**Gerelateerde modules:** Offertes, Werkbonnen, Planning, Facturen,
Klantportaal, Tijdregistratie, Nacalculatie.

---

## Werkbonnen

**Waar in de app:** route `/werkbonnen` (menu-item "Werkbonnen"); een werkbon
open je op `/werkbonnen/:id`. Op de telefoon heeft de monteur een
vereenvoudigde weergave.

**Wat het doet:** Een werkbon is de werkinstructie voor de monteur op locatie.
Hij bevat klant- en locatiegegevens, wat er gedaan moet worden, foto's of
tekeningen van het eindresultaat, en ruimte voor de terugkoppeling en
handtekening van de monteur.

**Belangrijkste acties:**
- Een nieuwe werkbon maken, los of vanuit een project (dan kies je welke
  onderdelen meegaan).
- Foto's, een logo of een pdf op de werkbon plaatsen en het formaat aanpassen
  (klein, normaal of groot).
- De werkbon als pdf bekijken en delen.
- De terugkoppeling van de monteur verwerken (gewerkte uren, opmerkingen,
  foto's) en de werkbon afronden.

**Veelvoorkomende vragen:**
- *Hoe voeg ik foto's aan een werkbon toe?* Sleep een bestand op de werkbon of
  kies een bestand, en pas daarna de plaats en het formaat aan.
- *Wat is het verschil tussen een werkbon en een leveringsbon?* Een werkbon is
  de instructie voor de monteur; een leveringsbon (pakbon) is het bewijs van
  wat er bij de klant geleverd is.
- *Kan de monteur de werkbon op de telefoon gebruiken?* Ja, op mobiel is er een
  vereenvoudigde weergave voor de monteur.
- *Hoe rond ik een werkbon af?* Verwerk de terugkoppeling van de monteur en zet
  de werkbon op afgerond/afgetekend.

**Tips:**
- Voeg duidelijke foto's of een tekening toe; dat voorkomt vragen op locatie.
- Maak werkbonnen vanuit het project, dan staan de klant- en projectgegevens er
  meteen goed op.

**Gerelateerde modules:** Projecten, Planning, Leveringsbonnen.

---

## Bestelbonnen

**Waar in de app:** route `/bestelbonnen` (menu-item "Bestelbonnen"); een
bestelbon open je op `/bestelbonnen/:id`.

**Wat het doet:** Een bestelbon is je inkoopbestelling naar een leverancier
voor materiaal of onderdelen. Je legt vast wat je bestelt, koppelt het aan een
project en houdt bij wat er binnen is.

**Belangrijkste acties:**
- Een nieuwe bestelbon maken met regels (omschrijving, aantal, prijs).
- De bestelbon koppelen aan een project.
- De status bijwerken (van concept naar besteld en ontvangen).
- De bestelbon als pdf downloaden om naar de leverancier te sturen.

**Veelvoorkomende vragen:**
- *Naar wie stuur ik de bestelbon?* Naar je leverancier; download de pdf en
  mail die.
- *Kan ik een bestelbon aan een project koppelen?* Ja, dan zie je de
  inkoopkosten terug bij het project.

**Tips:**
- Houd de ontvangststatus bij, zodat je weet wat er nog moet komen.

**Gerelateerde modules:** Projecten, Leveranciers, Leveringsbonnen, Voorraad.

---

## Leveringsbonnen (pakbonnen)

**Waar in de app:** route `/leveringsbonnen` (menu-item "Leveringsbonnen"); een
leveringsbon open je op `/leveringsbonnen/:id`.

**Wat het doet:** Een leveringsbon (pakbon) is de lijst van wat je bij de klant
aflevert. Hij dient als bewijs van levering en kan door de klant worden
afgetekend.

**Belangrijkste acties:**
- Een nieuwe leveringsbon maken, los of vanuit een project.
- Regels invullen met omschrijving, aantal en eenheid.
- De leveringsbon als pdf afdrukken of downloaden.
- De status bijwerken (van concept naar geleverd en getekend).

**Veelvoorkomende vragen:**
- *Wat is het verschil met een werkbon?* De werkbon is de instructie voor de
  monteur; de leveringsbon is het bewijs van wat er geleverd is.
- *Kan ik regels overnemen uit een project?* Ja, je kunt een leveringsbon
  vanuit een project maken.

**Tips:**
- Laat de klant de leveringsbon aftekenen als bevestiging van ontvangst.

**Gerelateerde modules:** Projecten, Werkbonnen, Bestelbonnen.

## Planning (montage)

**Waar in de app:** route `/planning` (menu-item "Planning"). Op de telefoon is
er een aparte mobiele weergave.

**Wat het doet:** De planning is uitsluitend voor **montage**: het inplannen van
fysieke klussen op locatie. Je ziet een week- of maandweergave met een baan per
monteur (of per rolgroep), waarin je afspraken kunt verslepen. De planning
waarschuwt voor dubbele boekingen en toont het weer en sluitings-/feestdagen.

> **Let op het verschil:** Planning gaat alléén over montage. Al het andere werk
> (offertes opvolgen, inkoop, administratie) hoort thuis in **Taken**.

**Belangrijkste acties:**
- Wisselen tussen week- en maandweergave.
- Een nieuwe montageafspraak maken (titel, datum, tijd, monteurs).
- Afspraken verslepen tussen monteurs en dagen.
- De banen groeperen per rol (monteurs, productie, verkoop, overig) en lege
  banen verbergen.
- De weekplanning afdrukken.
- Vanuit een afspraak een werkbon maken.

**Veelvoorkomende vragen:**
- *Hoe plan ik een montage in?* Maak een nieuwe afspraak of sleep er een naar
  de juiste dag en monteur.
- *Wat betekent het rode waarschuwingsteken op een afspraak?* Een conflict: die
  monteur heeft op dat moment al een andere afspraak.
- *Waarom zie ik de planning van mijn collega's?* doen. is transparant binnen je
  bedrijf; iedereen ziet ieders planning.
- *Hoe maak ik vanuit de planning een werkbon?* Open de afspraak en maak daar de
  werkbon aan.
- *Waarom staat hier geen offerte-opvolging of administratie?* Dat is geen
  montage; daarvoor gebruik je Taken.

**Tips:**
- Gebruik de weerinformatie bij het plannen van buitenwerk.
- Verberg lege banen voor overzicht, of toon ze juist allemaal als je de
  capaciteit wilt plannen.

**Gerelateerde modules:** Taken, Werkbonnen, Projecten, Team.

---

## Taken

**Waar in de app:** route `/taken` (menu-item "Taken"). Op de telefoon is er een
aparte mobiele weergave.

**Wat het doet:** Taken is voor al het werk **rondom** de montage: offertes
opvolgen, inkoop regelen, administratie, terugbellen, enzovoort. Je beheert je
taken in een week-, maand- of baanweergave (per persoon), met prioriteiten en
statussen.

> **Let op het verschil:** Taken is alles behalve montage. De fysieke montage
> zelf plan je in **Planning**.

**Belangrijkste acties:**
- Een nieuwe taak maken met een prioriteit (van laag tot kritiek).
- Taken toewijzen aan jezelf of een collega.
- Filteren op persoon (standaard "Iedereen") en op project of losse taken.
- Wisselen tussen week-, maand- en baanweergave.
- Een taak op klaar zetten of verwijderen (verwijderen kun je nog 5 seconden
  ongedaan maken via de melding).

**Veelvoorkomende vragen:**
- *Waarom zie ik taken van anderen?* doen. is transparant; iedereen ziet en
  plant ieders taken. Filter op jezelf als je alleen je eigen taken wilt zien.
- *Wat is het verschil tussen een projecttaak en een losse taak?* Een
  projecttaak hoort bij een project, een losse taak staat op zichzelf.
- *Ik heb per ongeluk een taak verwijderd, kan ik dat terugdraaien?* Ja, klik
  binnen 5 seconden op "Ongedaan maken" in de melding.
- *Hoort een montageafspraak hier ook?* Nee, montage plan je in Planning.

**Tips:**
- Gebruik prioriteiten om je dag te ordenen; kritieke taken vallen op.
- Filter op jezelf voor focus, of laat "Iedereen" staan om het teamoverzicht te
  houden.

**Gerelateerde modules:** Planning, Projecten, Offertes, Klanten.

---

## Team en medewerkers

**Waar in de app:** route `/team` (menu-item "Team"); teaminstellingen ook via
Instellingen.

**Wat het doet:** Hier beheer je je teamleden: wie er in je organisatie zit,
hun rol en hun status. Je nodigt nieuwe collega's uit en beheert verlof en
beschikbaarheid.

**Belangrijkste acties:**
- Een nieuw teamlid uitnodigen via het e-mailadres.
- De rol van een medewerker instellen of wijzigen (zoals admin, medewerker,
  monteur, verkoop of productie).
- Een medewerker deactiveren.
- Verlof en beschikbaarheid bijhouden.

**Veelvoorkomende vragen:**
- *Hoe nodig ik een collega uit?* Voer het e-mailadres in en kies een rol; de
  collega krijgt een uitnodiging per e-mail om een account aan te maken.
- *Wat bepaalt de rol?* De rol bepaalt onder andere in welke groep iemand in de
  planning valt en welke toegang iemand heeft.
- *Wat gebeurt er als ik een medewerker deactiveer?* Die persoon kan niet meer
  inloggen, maar de gegevens blijven bewaard.
- *Hoeveel gebruikers zitten er in het abonnement?* Het tarief van €79 per maand
  is inclusief een aantal gebruikers; voor meer gebruikers is hello@doen.team het
  contactadres. (Exacte aantallen: controleer de pagina Abonnement.)

**Tips:**
- Een rol kun je later altijd aanpassen.
- Houd verlof bij, dan houdt de planning daar rekening mee.

**Gerelateerde modules:** Planning, Taken, Instellingen.

---

## Booking (online afspraken)

**Waar in de app:** beheer op route `/booking` (menu-item "Booking"). De
openbare boekingspagina voor klanten staat op `/boeken/:userId` (geen inloggen
nodig).

**Wat het doet:** Met booking laat je klanten zelf online een afspraak inplannen
via een openbare link. Je stelt beschikbare tijdsloten in; klanten kiezen een
moment en jij bevestigt.

**Belangrijkste acties:**
- Beschikbare tijdsloten toevoegen (dag, tijd, medewerker).
- De openbare boekingslink kopiëren en delen.
- Binnengekomen afspraken bevestigen of annuleren.

**Veelvoorkomende vragen:**
- *Hoe deel ik mijn boekingslink?* Kopieer de link in het booking-beheer en
  plak die in een e-mail, op je website of in een bericht.
- *Wat gebeurt er als een klant boekt?* De afspraak komt binnen met de status
  gepland; jij bevestigt hem daarna.
- *Hoeft de klant in te loggen?* Nee, de boekingspagina is openbaar.

**Tips:**
- Zet alleen tijdsloten open die je echt beschikbaar hebt.

**Gerelateerde modules:** Planning, Team.

<!-- EINDE -->
