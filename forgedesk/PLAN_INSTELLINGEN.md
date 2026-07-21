# Plan · Instellingen herzien

Status: **voorstel**, niet gestart. Bewust geparkeerd tot na de livegang.
Aanleiding: het instellingenscherm is meegegroeid tot dertien categorieën in
een platte lijst, en Claude's instellingenmodal als referentie.

## Het probleem

Niet dat het lelijk is. Dat het **twee verschillende dingen** op één hoop legt.

| Wat het is | Voorbeelden | Gedrag van de gebruiker |
|---|---|---|
| Voorkeuren | profiel, weergave, thema, abonnement, beveiliging, apparaten | Duikt erin, zet iets om, is binnen een minuut weg |
| Werkschermen | calculatie, briefpapier, documenten, teamleden, integraties, importeren | Zit er twintig minuten in, voert data in, wil terug kunnen linken |

Die twee verdienen een andere container. Nu krijgen ze dezelfde.

Daar komt bij: dertien items in een ongegroepeerde lijst zijn te veel om te
scannen. Je leest ze allemaal om er één te vinden.

## Waarom niet simpelweg Claude kopiëren

Claude's modal werkt daar omdat instellingen er bijzaak zijn: je verliest je
plek in het gesprek niet. Bij doen. zou diezelfde modal de calculatiemodule en
het briefpapierontwerp in een krap kader duwen, zonder eigen URL per onderdeel
en onwerkbaar op mobiel. De vorm kopiëren zonder de aanleiding levert hier
slechtere UX op dan wat er nu staat.

## Voorstel in drie stappen

Elke stap is op zichzelf waardevol en apart te releasen. Stoppen na stap 1 mag.

### Stap 1 · Hergroeperen en zoeken

De grootste winst, en het minste risico. Geen routing-wijziging.

- Zoekveld boven de categorielijst, filtert op categorie- én subtabnaam.
  Dertien items scannen wordt: typen wat je zoekt.
- Groepskopjes in de linkerkolom in plaats van één platte lijst:

  **Account** · Profiel, Weergave, Beveiliging, Apparaten
  **Bedrijf** · Bedrijfsgegevens, Team, Abonnement
  **Werk** · Offertes, Projecten, Documenten, Briefpapier, Calculatie
  **Koppelingen** · E-mail, Integraties, Portaal, Inkoopfacturen, Importeren
  **doen.** · Daan AI, What's new

- Naamgeving gelijktrekken. Nu staan er categorieën die naar een module heten
  ("Offertes", "Projecten") naast categorieën die naar een handeling heten
  ("Importeren"). Kies één register.

### Stap 2 · Voorkeuren naar een modal

Alleen de lichte helft: Profiel, Weergave, Beveiliging, Apparaten, Abonnement.

- Opent vanuit het accountmenu en vanuit `/instellingen`.
- React Router background-location zodat het scherm eronder blijft staan en het
  kruisje je terugbrengt waar je was. `useLocation().state.background`.
- Deeplinks blijven werken: `/instellingen?tab=bedrijf` opent de modal met die
  sectie actief. Direct binnenkomen zonder achtergrond rendert het dashboard
  eronder.
- Esc sluit, klik buiten sluit, focus-trap erin.

### Stap 3 · Werkschermen naar echte pagina's

Calculatie, Briefpapier, Documenten, Team, Integraties, Importeren krijgen een
eigen route onder `/beheer/...`, met de instellingenmodal als vindplek die
ernaartoe linkt. Pas doen als stap 1 en 2 staan; dit raakt de meeste bestanden.

## Wat er nu al klopt en niet weg mag

- `tabToSectionMap` en de `?tab=`-deeplinks. Daar hangen de Aan de slag-tegels
  op het dashboard en het accountmenu aan.
- Het accountmenu onderin de sidebar. Dat is functioneel al completer dan
  Claude's variant en heeft geen verbouwing nodig.
- `SubTabNav` als patroon binnen een sectie.

## Openstaand besluit

Of Abonnement bij Account of bij Bedrijf hoort. Het is een bedrijfsafspraak,
maar de knop wordt ingedrukt door een persoon.
