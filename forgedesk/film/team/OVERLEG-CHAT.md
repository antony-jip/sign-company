# Context voor overleg over de doen.-productfilm

Ik ben Antony, founder van doen., een SaaS-app voor signmakers (reclamebedrijven, letterzetters, gevelreclame). Ik heb een productfilm van 98 seconden laten bouwen die de app verkoopt aan signmakers die hem nog niet kennen. De film werkt zonder geluid (social, beurs, website) en heeft muziek en geluidseffecten voor wie ze aanzet. Er is geen voice-over en geen ondertiteling. Ik stuur de video mee.

Mijn oordeel: de film is op zich goed, maar hij gaat te snel en geeft te weinig guidance. Ik snap hem omdat ik de app ken. Iemand die dit voor het eerst ziet, weet halverwege niet meer waar hij is, wat hij ziet, en waarom het ertoe doet. Ik wil met jou uitzoeken wat er precies moet veranderen, en daar een concrete instructielijst van maken voor de bouwer (een AI-agent in mijn codebase, die de film in Remotion bouwt en alles per milliseconde kan bijsturen).

## Wat de film vertelt

Kernverhaal: uit een mail ontstaat een project, en in dat project gebeurt alles. Slotbelofte: "Eén project. Alles erin." Einde: het logo van doen. met "slim gedaan."

Tijdlijn (seconden), één doorlopende camera door een ruimte met schermen:

| Tijd | Wat je ziet | Tekst in beeld |
|---|---|---|
| 0-5 | Negen losse tools (mail, Excel-offerte, WhatsApp, agenda, papieren werkbon, boekhouding, foto's, post-its, telefoon) zweven en worden naar één punt getrokken | |
| 5-11 | Inslag, het doen.-logo verschijnt | "Van mail tot betaald. In één app" |
| 11-13 | Dashboard, cursor klikt op Email | |
| 13-19 | Mail-app: aanvraag van klant opent, klik "Maak project", bijlage (tekening) naar het project | "Je mail is je werkvoorraad" + kleine uitleg |
| 19-27 | Projectpagina (de "cockpit") opent. Rondleiding: zeven labels na elkaar (Voortgang, Briefing, Taken en offertes, Klant, Tijd, Team, Portaal), elk 0,64 s | labels op de blokken |
| 27-31 | Taak maken vanuit het project: "Even telefonisch contact opnemen", toewijzen aan collega Sanne, melding | |
| 31-34 | Zoom op de voortgangsbalk | "Eén klik. Het project staat" + uitleg |
| 34-45 | Offerte-editor: regels, calculatie openen (inkoop, verkoop, marge), collega-check aanvragen, Sanne keurt goed, Verstuur via portaal | "Je marge zie je vóór je verstuurt" + uitleg |
| 46-48 | Terug op het project: fase springt naar In review | |
| 48-53 | Klantportaal (wat de klant ziet): offerte bekijken, naam, handtekening, Bevestigen | "Klant tekent. Jij ziet het meteen" + uitleg |
| 54-57 | Terug op het project: melding "klant akkoord", fase Akkoord klant | |
| 57-62 | Planning: montage-kaart slepen naar donderdag | "Eén sleep. De montage staat" + uitleg |
| 62-63 | Terug op het project: fase Ingepland | |
| 63-66 | Werkbon maken vanuit het project (dialoog, 3 items) | |
| 66-70 | Telefoon van de monteur op locatie: na-foto maken, handtekening | "Werkbon op locatie. Niets overtypen" + uitleg |
| 71-78 | Mail schrijven vanuit het project, bijlage kiezen "Uit project" (tekening), Opvolgen aan, Verzenden | "Tekening erbij. Zonder zoeken" + uitleg |
| 78-83 | Financieel-tab: factuur maken, versturen, melding "betaald", fase Betaald | "Factuur eruit. Betaald" + uitleg |
| 83-88 | Camera trekt terug: alle schermen in beeld, de gevel van de klant met het nieuwe lichtreclamebord gaat aan | |
| 88-91 | Logo van doen. met elf module-kaarten eromheen (projecten, offertes, planning, werkbonnen, portaal, facturen, klanten, taken, email, maatjes, Daan) | "Eén project. Alles erin" |
| 91-98 | Eindkaart | "slim gedaan." |

## Welke guidance-middelen er nu al zijn

- Schermtitel linksboven bij elk nieuw scherm (Mail, Project, Offerte, Klantportaal, Planning, Werkbon op locatie, Mail uit het project, Financieel). Staat 2,1 s.
- Een "belofte" per scherm: één grote regel tekst op een glaskaart, met een kernwoord in oranje, plus een kleine uitlegregel eronder.
- Rondleiding op de projectpagina: zeven genummerde labels na elkaar.
- Fasebalk onderin (Gepland, In review, Akkoord klant, Ingepland, Betaald) die meespringt.
- Meldingen (toasts) rechtsboven bij akkoord, betaald, taak, collega-check.
- Grote cursor die elke klik laat zien; elke klik veroorzaakt het volgende.
- Labels "jij" en "je klant" bij het portaal, en "Sanne ziet" bij de collega-melding.

## Wat de bouwer kan aanpassen

Alles zit in één tijdlijn in milliseconden. Concreet bij te sturen:

- Duur van elk shot en elke hold (bijvoorbeeld "hold 1,5 s na de handtekening voordat de camera terugvliegt").
- Volgorde van scènes, scènes schrappen of samenvoegen.
- Alle tekst: schermtitels, beloften, uitlegregels, labels, meldingen.
- Extra guidance-elementen: langere titels met een subregel ("Klantportaal: dit ziet je klant"), tussenkaarten tussen hoofdstukken, een hoofdstuk-nummer of voortgangsindicator, pijlen of markeringen op een knop vóór de klik, een uitleg-label naast de cursor ("klik: Verstuur via portaal"), een "jij / je klant / je collega"-aanduiding, langere rondleiding.
- Tempo van de cursor en van de camerabewegingen.
- Volgorde en aantal labels in de rondleiding.
- Muziek en geluidseffecten.

Beperkingen: geen voice-over (film moet zonder geluid werken), geen ondertiteling die het beeld dichtzet, tekst niet kleiner dan nu (leesbaarheid op telefoon), UI moet de echte app blijven. Lengte mag langer worden als het nodig is, maar liever niet ver boven 2 minuten. Kortere film met minder scènes is ook een optie.

## Wat ik van jou wil

1. Kijk naar de video als iemand die doen. niet kent. Zeg per scène waar je afhaakt of iets niet begrijpt, en waarom.
2. Beoordeel of het probleem vooral tempo is (te weinig tijd per shot), guidance (te weinig uitleg van wat je ziet), of structuur (te veel scènes, geen hoofdstukken).
3. Maak daarna een concrete instructielijst voor de bouwer. Per punt: welke scène (met tijd), wat er precies verandert (tekst, duur in seconden, plek in beeld), en waarom. Zo specifiek dat de bouwer het zonder verdere vragen kan uitvoeren. Vermeld ook wat er weg mag.
4. Geef één voorstel voor de totale lengte en het aantal scènes.

Schrijf de instructielijst in het Nederlands, zonder emoji en zonder gedachtestreepjes.
