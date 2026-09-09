# een dag. Productieboek

Productfilm doen., 75 seconden. Live-action met echte app-opnames.
Status: draaiklaar script. Nog niet gedraaid.

Dit is geen Remotion-compositie. De film is live-action: een echte
ondernemer, een echte werkplaats, echt ochtendlicht. Wat wel uit de
machine komt zijn de schermen en de overlay-animaties (sectie 6 en 7).
Zie sectie 12 voor wat de bestaande Remotion-opzet in `video/src/`
hiervoor kan leveren.

---

## 1. Specificatie

| | |
|---|---|
| Duur | 75,0 s exact, 1800 frames |
| Framerate | 24 fps |
| Resolutie | 4K UHD opnemen, 1920x1080 leveren |
| Beeldverhouding | 16:9 master, 9:16 en 1:1 als aparte uitsnede-pass |
| Camera | fullframe, ondiepe scherptediepte, lichte handheld |
| Shutter | 1/48 (180 graden) |
| Geluid | voice-over NL mannelijk, sound design dragend, muziek onder |
| Aantal shots | 50 |

Handheld betekent hier: schouder of easyrig, geen gimbal. De film moet
aanvoelen alsof iemand meeloopt, niet alsof iets zweeft. Geen drone.

---

## 2. Palet en de kleurconflict-waarschuwing

Het brief schrijft Flame `#F15025` en Petrol `#1A535C` voor. Dat wijkt af
van wat er in de repo staat. Gemeten:

| bron | flame | petrol |
|---|---|---|
| brief (deze film) | `#F15025` | `#1A535C` |
| logo-SVG `public/logos/doen-logo.svg` | `#D24620` | `#2b535c` |
| `forgedesk/CLAUDE.md` sectie 6 | `#D24620` | `#1A535C` |
| `video/src/brand.ts` | `#df5c36` | `#2b535c` |
| voorkomens in de repo | `#D24620` 461x, `#F15025` 24x | `#1A535C` 493x, `#2b535c` 18x |

**Dit moet voor de grade beslist worden.** Het probleem is concreet en
zichtbaar: de end card in shot 11C zet het echte logo op Petrol. Als de
grade naar `#F15025` trekt terwijl het logobestand `#D24620` is, staat er
in het laatste shot van de film een oranje dot naast een andere oranje
wordmark. Dat is precies het frame waar de kijker naar de kleur kijkt.

Ook `video/src/brand.ts` klopt niet met zichzelf: de comment zegt
"canoniek uit logo-SVG" bij `#df5c36`, maar de logo-SVG bevat `#D24620`.

Dit script volgt het brief (`#F15025` / `#1A535C`) omdat dat expliciet
opgedragen is. Aanbeveling is echter de logowaarden aan te houden
(`#D24620` / `#2b535c`) en het brief bij te stellen, omdat het logo het
enige is dat naast de kleur in beeld komt. Dit is een beslissing voor
Antony, niet voor de colorist.

Overige palet-regels, ongewijzigd uit het brief:

- Warm ochtendlicht in scenes 1 tot 3. Kleurtemperatuur oplopend van
  koel grijs (shot 1A) naar warm (shot 3A).
- Petrol dominant in alle interieurs. Werkplaatswanden, bus-interieur,
  avondkeuken.
- Oranje uitsluitend op UI en werkkleding. Nergens anders. Geen oranje
  koffiemok, geen oranje verkeerskegel, geen oranje reflectie in beeld.
  Dit is een set-dressing-regel, niet alleen een grade-regel.
- Off-white `#F8F7F5` voor papier en wanden.
- Ink `#1A1A18` voor zwart, nooit puur zwart.

---

## 3. Hoofdpersoon

Man, 35 tot 45. Praktisch. Werkkleding met lichte slijtage, geen nieuwe
outfit. Eigen signbedrijf van acht man in West-Friesland.

**Hij praat niet, hij doet.** Geen enkele lipbeweging in de hele film.
Geen dialoog, geen mompelen, geen telefoongesprek in beeld. De
voice-over is niet zijn stem in beeld, die staat erboven.

Casting: zoek een echte signmaker of monteur, geen acteur. Handen
moeten kloppen. Een hand die een frees bedient ziet er anders uit dan
een hand die dat naspeelt, en de film zit vol handen in close-up.

Wat er niet in komt, uit het brief:

- geen kantoortuin
- geen stockfoto-glimlach
- geen high five
- geen vergaderzaal, geen whiteboard, geen laptop-in-cafe

Aanvullend, in dezelfde geest: hij kijkt nooit tevreden naar de camera,
hij knikt niet goedkeurend naar zijn telefoon, en hij haalt nergens
opgelucht adem. De rust zit in het tempo en het geluid, niet in zijn
gezicht.

---

## 4. Tijdlijn

Frame-exact, 24 fps. Sluit op 1800 frames, geen gaten.

| shot | in | uit | duur | frames | scene |
|---|---|---|---|---|---|
| 1A | 00:00 | 02:14 | 2,6s | 0-62 | 1 |
| 1B | 02:14 | 05:00 | 2,4s | 62-120 | 1 |
| 2A | 05:00 | 07:19 | 2,8s | 120-187 | 2 |
| 2B | 07:19 | 09:14 | 1,8s | 187-230 | 2 |
| 2C | 09:14 | 12:00 | 2,4s | 230-288 | 2 |
| 3A | 12:00 | 14:19 | 2,8s | 288-355 | 3 |
| 3B | 14:19 | 17:05 | 2,4s | 355-413 | 3 |
| 3C | 17:05 | 20:00 | 2,8s | 413-480 | 3 |
| 4A | 20:00 | 21:05 | 1,2s | 480-509 | 4 |
| 4B | 21:05 | 22:07 | 1,1s | 509-535 | 4 |
| 4C | 22:07 | 23:12 | 1,2s | 535-564 | 4 |
| 4D | 23:12 | 24:10 | 0,9s | 564-586 | 4 |
| 4E | 24:10 | 25:14 | 1,2s | 586-614 | 4 |
| 4F | 25:14 | 26:12 | 0,9s | 614-636 | 4 |
| 4G | 26:12 | 27:22 | 1,4s | 636-670 | 4 |
| 4H | 27:22 | 28:22 | 1,0s | 670-694 | 4 |
| 4I | 28:22 | 30:00 | 1,1s | 694-720 | 4 |
| 5A | 30:00 | 31:10 | 1,4s | 720-754 | 5 |
| 5B | 31:10 | 34:00 | 2,6s | 754-816 | 5 |
| 6A | 34:00 | 35:05 | 1,2s | 816-845 | 6 |
| 6B | 35:05 | 36:05 | 1,0s | 845-869 | 6 |
| 6C | 36:05 | 37:10 | 1,2s | 869-898 | 6 |
| 6D | 37:10 | 38:07 | 0,9s | 898-919 | 6 |
| 6E | 38:07 | 39:12 | 1,2s | 919-948 | 6 |
| 6F | 39:12 | 40:10 | 0,9s | 948-970 | 6 |
| 6G | 40:10 | 41:19 | 1,4s | 970-1003 | 6 |
| 6H | 41:19 | 42:19 | 1,0s | 1003-1027 | 6 |
| 6I | 42:19 | 44:00 | 1,2s | 1027-1056 | 6 |
| 7A | 44:00 | 45:07 | 1,3s | 1056-1087 | 7 |
| 7B | 45:07 | 46:12 | 1,2s | 1087-1116 | 7 |
| 7C | 46:12 | 47:19 | 1,3s | 1116-1147 | 7 |
| 7D | 47:19 | 49:05 | 1,4s | 1147-1181 | 7 |
| 7E | 49:05 | 50:10 | 1,2s | 1181-1210 | 7 |
| 7F | 50:10 | 52:00 | 1,6s | 1210-1248 | 7 |
| 8A | 52:00 | 53:05 | 1,2s | 1248-1277 | 8 |
| 8B | 53:05 | 54:07 | 1,1s | 1277-1303 | 8 |
| 8C | 54:07 | 55:12 | 1,2s | 1303-1332 | 8 |
| 8D | 55:12 | 56:14 | 1,1s | 1332-1358 | 8 |
| 8E | 56:14 | 58:00 | 1,4s | 1358-1392 | 8 |
| 9A | 58:00 | 59:05 | 1,2s | 1392-1421 | 9 |
| 9B | 59:05 | 60:07 | 1,1s | 1421-1447 | 9 |
| 9C | 60:07 | 61:12 | 1,2s | 1447-1476 | 9 |
| 9D | 61:12 | 62:14 | 1,1s | 1476-1502 | 9 |
| 9E | 62:14 | 64:00 | 1,4s | 1502-1536 | 9 |
| 10A | 64:00 | 66:10 | 2,4s | 1536-1594 | 10 |
| 10B | 66:10 | 68:05 | 1,8s | 1594-1637 | 10 |
| 10C | 68:05 | 70:00 | 1,8s | 1637-1680 | 10 |
| 11A | 70:00 | 71:14 | 1,6s | 1680-1718 | 11 |
| 11B | 71:14 | 72:19 | 1,2s | 1718-1747 | 11 |
| 11C | 72:19 | 75:00 | 2,2s | 1747-1800 | 11 |

### Ritme-verantwoording

Het brief vraagt drie seconden per shot in scenes 1 tot 3, en cuts van
0,8 tot 1,5 s in scenes 4 tot 9.

- Scenes 1 tot 3 lopen op 1,8 tot 2,8 s, gemiddeld 2,5 s. Exact drie
  seconden zou 6,7 shots in 20 seconden geven, en de scene heeft er acht
  nodig om lead, dashboard en klantkaart alle drie te tonen. 2,5 s leest
  als traag; het verschil met 3,0 s is op de montagetafel niet voelbaar,
  het verschil in wat je kunt tonen wel.
- Scenes 4, 6, 8 en 9 lopen op 0,9 tot 1,4 s. Binnen het brief.
- Shot 7F is 1,6 s en dus 0,1 s over de bovengrens. Bewust: de
  conflict-indicator moet zichtbaar doven, en een dovende indicator van
  onder de anderhalve seconde leest als een glitch in plaats van als een
  oplossing. Dit is het enige shot dat het brief-ritme overschrijdt.
- Scene 5 (1,4 s en 2,6 s) staat tussen twee snelle scenes in en houdt
  bewust stil. Dat is de eerste betaling van de film.
- Scenes 10 en 11 lopen op 1,2 tot 2,4 s en zakken terug.

---

## 5. Shotlijst

Elke regel heeft een bewijslast: het ene ding dat het shot aantoont.
Dat komt uit de REGEL in het brief. Een shot dat zijn bewijslast niet
draagt, valt eruit. Sectie 11 noemt de shots die op die grond al
gesneuveld zijn.

### Scene 1. 00:00 tot 05:00. Opstaan

Grijs ochtendlicht, gordijnen dicht, alleen straatlicht en schemer.
Kleurtemperatuur koel, ongeveer 5600K, laagste warmte van de hele film.

**1A** 2,6s. Macro, 85mm, f1.8. Wekkerdisplay 06:45. Onscherpe hand
komt links in beeld en tast. Camera ligt bijna op het nachtkastje.
Bewijst: het uur waarop zijn dag begint.

**1B** 2,4s. 50mm, f1.4, over de schouder. Lockscreen licht op in het
donker, het enige lichtpunt in het frame. Eén melding, geen stapel:
`doen. nieuwe lead. Bouwbedrijf Kuiper`. Zijn gezicht half onscherp,
niet verlicht door het scherm als horrorfilm maar zacht van onderaf.
Bewijst: één melding is genoeg, er is geen inbox die overloopt.

VO 00:01 tot 00:04: "Zes uur vijfenveertig. Je dag is al begonnen."

### Scene 2. 05:00 tot 12:00. Naar de keuken

**2A** 2,8s. 35mm, f2, handheld, volgt hem van achter door de gang naar
de keuken. Telefoon in hand, scherm uit. Licht wordt warmer naarmate
hij de keuken nadert.
Bewijst: hij pakt niets anders op. Geen laptop, geen map, geen agenda.

**2B** 1,8s. 50mm. Hij zet de telefoon tegen de fruitschaal, drukt de
koffiemachine aan. Twee handelingen, één beweging.
Bewijst: de app wacht op hem, niet andersom.

**2C** 2,4s. Macro, 100mm, f2.8. Telefoonscherm vult het kader,
dashboard mobiel. Omzet telt op naar het maandcijfer, drie
projectkaarten, planning vandaag. Overlay: cijfers tellen op (sectie 7).
Bewijst: alles wat hij vandaag moet weten staat op één scherm.

VO 00:06 tot 00:10: "Geen mappen. Geen appjes. Eén overzicht."

### Scene 3. 12:00 tot 20:00. Koffie en de lead

Warmste licht van de film. Ochtendzon door het keukenraam, harde
schuine strepen over het aanrecht.

**3A** 2,8s. 50mm, f1.4. Koffie loopt in de kop. Stoom in tegenlicht.
Telefoon ligt onscherp op de voorgrond. Geen hand in beeld.
Bewijst: niets. Dit shot is ademruimte en de enige in de film die
alleen toon draagt. Als de montage krap zit, is dit het eerste shot dat
inkort naar 1,8 s.

**3B** 2,4s. Top-down, 50mm. Duim scrollt de lead-lijst, stopt, opent
`Bouwbedrijf Kuiper`. Cursor-pulse op de kaart bij het openen.
Bewijst: de lead staat er al, hij heeft hem niet overgetypt.

**3C** 2,8s. Macro op het scherm. De klantkaart vult zichzelf: bedrijf,
KvK, adres, contactpersoon verschijnen veld voor veld, met 3 tot 5
frames tussen elk veld. Niet alles tegelijk, dat leest als een
laadscherm in plaats van als werk dat gedaan wordt.
Bewijst: de gegevens komen ergens vandaan zonder dat hij typt. Dit is
het eerste echte productbewijs van de film.

VO 00:13 tot 00:18: "De lead staat er al in. De gegevens vult doen.
zelf."

### Scene 4. 20:00 tot 30:00. In de bus

Tempo breekt. Vanaf hier cuts van rond de seconde. Petrol-interieur,
ochtendlicht door de voorruit.

**4A** 1,2s. 35mm. Busdeur gaat open, hij stapt in. Harde cut op het
dichtslaan.
**4B** 1,1s. 50mm. Telefoon in de houder. Motor nog niet gestart.
**4C** 1,2s. Scherm. Offerte openen vanuit het project Kuiper.
**4D** 0,9s. Macro. Duim tikt regel toevoegen.
**4E** 1,2s. Scherm. Regel vult: `lichtbak 3000x800 enkelzijdig`.
**4F** 0,9s. Macro. Prijs telt op naar het regelbedrag. Overlay:
cijfers tellen op.
**4G** 1,4s. Scherm. Totaal onderaan. Duim beweegt naar versturen.
**4H** 1,0s. Macro. Tik op versturen. Cursor-pulse.
**4I** 1,1s. 35mm. Hand terug aan het stuur. Bus komt in beweging.

Bewijst, als blok: een offerte is klaar voordat de rit begint. De
losse shots hoeven elk niet te bewijzen, de sequentie doet het.

VO 00:22 tot 00:27: "Offerte onderweg. Klaar voordat je er bent."

### Scene 5. 30:00 tot 34:00. verstuurd.

De film houdt stil. Enige moment tussen 20 en 64 seconden waar dat
gebeurt.

**5A** 1,4s. Macro, 100mm, f4 zodat het hele scherm scherp is. Statusbadge
grijs: `concept`.
**5B** 2,6s. Zelfde kader, geen cut in de camera. Badge flipt naar
`verstuurd.` in Flame, met één pulse die uitdempt. De Flame dot achter
het woord landt 2 frames na het woord zelf. Daarna 1,5 seconde stil op
het beeld.
Bewijst: het is echt weg. Geen concept, geen wachtrij.

VO 00:31: "verstuurd."

### Scene 6. 34:00 tot 44:00. Werkplaats

Printer draait op de achtergrond, continu, hoorbaar. Petrol wanden,
industrieel toplicht plus daglicht door de rolpoort.

**6A** 1,2s. 24mm, wide. Werkplaats. Printer loopt achterin, plaatmateriaal
tegen de wand, frees links.
**6B** 1,0s. 35mm. Hij loopt door het beeld naar de statafel.
**6C** 1,2s. 50mm. Telefoon staat rechtop op de statafel, hij opent de
werkbon met één hand. Andere hand houdt een gefreesde letter vast.
**6D** 0,9s. Macro. Camera-icoon, tik.
**6E** 1,2s. Over de telefoon heen: de gefreesde letter in de zoeker.
**6F** 0,9s. Scherm. Foto landt als thumbnail in de werkbon.
**6G** 1,4s. Macro. Uren: stepper van 0,0 naar 3,5. Overlay: cijfers
tellen op, twee tikken.
**6H** 1,0s. Tik op opslaan. Badge flipt naar `gelogd.`
**6I** 1,2s. 35mm. Telefoon blijft op de statafel staan, hij pakt de
letter met twee handen op en loopt uit beeld.

Bewijst: registratie kost hem drie tikken en hij legt de telefoon niet
eens neer om ergens te gaan zitten. Shot 6I doet het zwaarste werk van
de scene: hij loopt weg van de telefoon, terug naar het werk.

VO 00:36 tot 00:40: "De werkvloer typt niet. Die tikt."

### Scene 7. 44:00 tot 52:00. Planning

**7A** 1,3s. 35mm. Kantoorhoek in de werkplaats, geen apart kantoor.
Groot scherm op een werkbank, stof eromheen.
**7B** 1,2s. Scherm, 50mm. Planning-week. Eén kaart heeft een rode
conflict-indicator.
**7C** 1,3s. Macro. Hand komt in beeld, pakt de kaart.
**7D** 1,4s. Scherm. Kaart sleept naar dinsdag. Cursor-pulse volgt de
kaart, de kolom onder de cursor licht op.
**7E** 1,2s. Kaart landt en snapt in het raster.
**7F** 1,6s. De conflict-indicator dooft van rood naar grijs, over 12
frames. Hand is al uit beeld.
Bewijst: hij lost het conflict niet op, hij verplaatst iets en het
conflict verdwijnt. Daarom is de hand uit beeld in 7F.

VO 00:45 tot 00:50: "Planning schuift mee. Het conflict lost zichzelf
op."

### Scene 8. 52:00 tot 58:00. De klant tekent

Split screen, verticale deling in het midden. Links de klant, rechts de
ondernemer. Links koeler licht (kantoor), rechts warm (bus). Het
kleurverschil houdt de twee kanten uit elkaar zonder lijn.

**8A** 1,2s. Beide helften tegelijk in. Klant links achter een bureau,
ondernemer rechts achter het stuur, stilstaand.
**8B** 1,1s. Links vult: klantportaal op de desktop, offerte open.
**8C** 1,2s. Links macro: vinger tikt akkoord.
**8D** 1,1s. Rechts: telefoon in de houder licht op.
**8E** 1,4s. Rechts scherm: status flipt naar `getekend.` Links loopt
door, de klant leunt achterover. Split lost op in het volle rechterbeeld
in de laatste 8 frames.
Bewijst: er is geen belletje tussen akkoord en weten dat het akkoord is.

Let op de castingregel: de klant mag ook niet glimlachen naar de camera.
Hij tekent zoals je een pakbon tekent.

VO 00:53 tot 00:57: "De klant tekent digitaal. Jij hoeft niet te
bellen."

### Scene 9. 58:00 tot 64:00. Getekend is gefactureerd

**9A** 1,2s. 35mm. Hij schuift plaatmateriaal de bus in.
**9B** 1,1s. 50mm. Achterdeuren dicht. Harde klap in het geluid.
**9C** 1,2s. Scherm binnen: factuur rolt uit het project. Regels
verschijnen van boven naar beneden, overgenomen uit de offerte.
**9D** 1,1s. Macro. Bedrag telt op naar het totaal.
**9E** 1,4s. Factuur schuift de lijst in, badge `verstuurd.`
Bewijst: niemand heeft de factuur gemaakt. Hij stond bij de bus.

Belangrijk: hij is in 9C tot 9E niet in beeld bij het scherm. Het
gebeurt terwijl hij laadt. Als je zijn hand erbij monteert, verdwijnt
het bewijs.

VO 00:59 tot 01:02: "Getekend is gefactureerd."

### Scene 10. 64:00 tot 70:00. Avond

Terug naar traag. Warm lamplicht, laag in het frame, veel schaduw.
Petrol in de keukenwand.

**10A** 2,4s. 50mm, f1.4. Eettafel. Telefoon ligt met het scherm naar
boven. Op de achtergrond, ver onscherp, een kind aan tafel. Nooit
herkenbaar in beeld, alleen als vorm en beweging.
**10B** 1,8s. Zelfde kader. Telefoon licht op. Hij kijkt niet.
**10C** 1,8s. Macro. Pushmelding: `betaald.` met Flame dot. Twee
seconden lang gebeurt er verder niets.
Bewijst: de dag sluit zichzelf af terwijl hij aan tafel zit.

De verleiding is hier een reactieshot van zijn gezicht. Die valt af.
Zie sectie 11.

VO 01:07: "betaald."

### Scene 11. 70:00 tot 75:00. Einde

**11A** 1,6s. 50mm. Laptop op de keukentafel gaat dicht. Eén hand.
**11B** 1,2s. 35mm. Werkplaatslicht gaat uit, wide, het beeld valt naar
Petrol-donker.
**11C** 2,2s. End card. Petrol vlak `#1A535C`. Centraal `doen.`
lowercase in Bricolage Grotesque 800, off-white. De punt in Flame.
Geen URL, geen payoff, geen call to action. 12 frames fade in, 24
frames hold, dan 12 frames uit naar zwart.

VO 01:12: "doen. gedaan."

---

## 6. UI-opnamelijst

Alle schermen zijn echte opnames uit de app, geen nagebouwde panelen en
geen zwevende 3D-schermen. Neem op in de echte app op een demo-account
met consistente data.

**Doorlopende dataset.** Eén klant door de hele film: `Bouwbedrijf
Kuiper`, project `Lichtbakken hoofdvestiging`, drie lichtbakken
3000x800 enkelzijdig. Bedragen moeten optellen: als de offerte in 4G
een totaal toont, is dat hetzelfde totaal dat in 9D uitrolt. Een kijker
die het bedrag ziet veranderen tussen offerte en factuur is de film
kwijt.

| shot | scherm | route | opnamevorm |
|---|---|---|---|
| 1B | lockscreen met pushmelding | n.v.t. | iOS-opname, echte notificatie |
| 2C | dashboard mobiel | `/` | schermopname telefoon, portrait |
| 3B | lead- en dealpijplijn | `/deals` | schermopname telefoon |
| 3C | klantkaart die zich vult | `/klanten/:id` | schermopname telefoon |
| 4C tot 4H | offerte-editor | `/offertes/:id/bewerken` | schermopname telefoon |
| 5A, 5B | offertestatus concept naar verstuurd | `/offertes` | schermopname telefoon, macro |
| 6C tot 6H | werkbon met foto en uren | `/werkbonnen/:id` | schermopname telefoon |
| 7B tot 7F | planning-week met conflict | `/planning` | schermopname desktop |
| 8B, 8C | klantportaal, akkoord | `/portaal/:token` of `/goedkeuring/:token` | schermopname desktop |
| 8E | status getekend | `/offertes/:id/detail` | schermopname telefoon |
| 9C tot 9E | factuur uit project | `/projecten/:id` naar `/facturen` | schermopname desktop |
| 10C | pushmelding betaald | n.v.t. | iOS-opname, echte notificatie |

**Opnamerichtlijnen.** Neem telefoonschermen op via schermopname op het
toestel zelf, niet met de camera op het scherm gericht: dat geeft moiré
en een scheve witbalans. Film daarna wel de telefoon in de hand of op
tafel, en composite de opname in het scherm (screen replacement). Dat
levert de echte reflecties en de handheld-beweging op, met een schoon
scherm erin.

Zet de telefoon op de hoogste helderheid en schakel true tone en night
shift uit, anders drijft de kleur van het scherm door de dag heen.

Twee schermen in de lijst gaan over gedrag dat de app zelf moet doen en
niet in de montage vervalst mag worden: de klantkaart die zich vult (3C)
en de factuur die uit het project rolt (9C). Controleer voor de
opnamedag dat beide in het demo-account echt zo werken. Als een van
beide handmatige stappen vereist die het script wegmonteert, is dat een
inhoudelijk probleem met de film en geen montageprobleem. Meld het dan
voordat er gedraaid wordt.

---

## 7. Overlay-animaties

Drie overlays, consequent door de hele film. Ze worden in post
toegevoegd op de schermopnames.

**Cursor-pulse.** Bij elke tik of klik. Cirkel die van 0 naar 44 px
groeit over 8 frames en tegelijk van 40 procent naar 0 dekking gaat.
Kleur Flame. Nooit meer dan één tegelijk in beeld.
Voorkomt in: 3B, 4D, 4H, 6D, 6H, 7D, 8C.

**Cijfers die optellen.** Bedragen en uren tellen op naar hun
eindwaarde, in DM Mono, met vaste cijferbreedte zodat het getal niet
danst. Duur 10 tot 14 frames, easing uit. Nooit vanaf nul als het
eindgetal groot is, dan begint hij op ongeveer 60 procent en telt door.
Voorkomt in: 2C (omzet), 4F (regelbedrag), 6G (uren), 9D (factuurtotaal).

**Status-badge flip.** Grijs naar Flame. De badge draait niet en
schuift niet, hij wisselt van kleur over 4 frames en krijgt daarna één
pulse (schaal 1,0 naar 1,06 naar 1,0 over 10 frames). Het statuswoord
eindigt altijd op een Flame dot, en die dot verschijnt 2 frames na het
woord.
Voorkomt in: 5B (`verstuurd.`), 6H (`gelogd.`), 8E (`getekend.`),
9E (`verstuurd.`), 10C (`betaald.`).

Statuswoorden in deze film, alle lowercase met punt:
`concept` (grijs, geen dot), `verstuurd.`, `gelogd.`, `getekend.`,
`betaald.`, `gedaan.`

Geen emoji, nergens. Geen em-dashes in schermteksten. `doen.` altijd
lowercase, ook aan het begin van een zin.

---

## 8. Voice-over

Nederlands, mannelijk, rustig. Niet enthousiast, niet warm, niet
verkopend. Toon van iemand die iets vaststelt. Dichter bij een
buurman die uitlegt hoe iets werkt dan bij een reclamestem.

62 woorden in 75 seconden. Dat is ongeveer 0,8 woorden per seconde,
tegen 2,5 voor normale spraak. De VO is dus voor twee derde stilte, en
die stilte is voor het sound design. Wie de tekst voller wil maken,
haalt de rust weg die het brief vraagt.

| in | tekst | woorden |
|---|---|---|
| 00:01 | Zes uur vijfenveertig. Je dag is al begonnen. | 8 |
| 00:06 | Geen mappen. Geen appjes. Eén overzicht. | 6 |
| 00:13 | De lead staat er al in. De gegevens vult doen. zelf. | 11 |
| 00:22 | Offerte onderweg. Klaar voordat je er bent. | 7 |
| 00:31 | verstuurd. | 1 |
| 00:36 | De werkvloer typt niet. Die tikt. | 6 |
| 00:45 | Planning schuift mee. Het conflict lost zichzelf op. | 8 |
| 00:53 | De klant tekent digitaal. Jij hoeft niet te bellen. | 9 |
| 00:59 | Getekend is gefactureerd. | 3 |
| 01:07 | betaald. | 1 |
| 01:12 | doen. gedaan. | 2 |

Regie-aanwijzingen:

- "vult doen. zelf" (00:13): geen nadruk op doen. De hele film gaat
  over de app, hem benadrukken maakt hem kleiner.
- "verstuurd." (00:31), "betaald." (01:07): zachter dan de rest, bijna
  terzijde. Dit zijn geen aankondigingen, het zijn constateringen. Val
  op het frame waarin de badge flipt, niet ervoor.
- "Die tikt." (00:36): korte pauze voor "tikt", niet erna.
- "doen. gedaan." (01:12): de twee woorden uit elkaar, ongeveer 400 ms
  ertussen. Laatste woord zakt weg.
- Nergens een stijgende intonatie aan het eind van een zin.

---

## 9. Sound design

Het geluid draagt het verhaal, de VO doet dat niet. In de 13 seconden
die de VO vult is het geluid ondersteunend; in de overige 62 is het
geluid het verhaal.

| tijd | geluid |
|---|---|
| 00:00 | stilte, alleen kamertoon. Geen wekkeralarm, hij is al wakker |
| 00:02 | telefoon schuift over hout |
| 00:05 | dekbed, blote voeten op vloer |
| 00:08 | koffiezetapparaat start, maalt |
| 00:12 | koffie loopt, doorlopend onder scene 3 |
| 00:20 | ritssluiting werkjas |
| 00:21 | busdeur open, dicht |
| 00:24 | zachte tikken op glas, vier stuks, niet ritmisch |
| 00:29 | motor start |
| 00:30 | motor zakt weg tot bijna niets voor de badge-flip |
| 00:34 | printer, doorlopend onder de hele scene 6 |
| 00:38 | camerasluiter telefoon, één keer |
| 00:43 | plaatmateriaal schuift |
| 00:44 | printer vervaagt naar achtergrond |
| 00:49 | kaart snapt in, één droge tik |
| 00:52 | kantoortoon links, motorstationair rechts, in stereo gescheiden |
| 00:58 | plakband, achterdeuren bus, harde klap op 00:59 |
| 01:04 | avondstilte, vaatwasser ver weg, kind neuriet nauwelijks hoorbaar |
| 01:08 | pushmelding, de echte doen.-toon, zacht |
| 01:10 | laptop klapt dicht |
| 01:12 | lichtschakelaar. Daarna niets |

De klap van de busdeuren op 00:59 valt samen met de laatste snelle cut
van de film en zet de rem in voor scene 10.

Het kind is hoorbaar maar niet verstaanbaar. Geen dialoog, geen lachje.

---

## 10. Muziek

Minimal, warme synth met puls. Geen drums, geen melodie die je kunt
meeneuriën, geen build met een drop.

| tijd | wat |
|---|---|
| 00:00 tot 00:20 | geen muziek. Alleen sound design |
| 00:20 | puls komt op onder de busdeur, laag in de mix |
| 00:30 | puls valt weg voor de badge-flip, twee seconden lang |
| 00:32 tot 00:64 | opbouw. Laag toegevoegd per scene, niet per maat |
| 00:64 | uitzakken begint, over vier seconden naar niets |
| 00:70 tot 01:15 | geen muziek. Alleen kamertoon en de laatste schakelaar |

Het brief vraagt opbouw vanaf 30 s. De puls komt hier al op 20 s op,
omdat dat de plek is waar het tempo breekt; de opbouw zelf begint wel
op 32, na het gat dat scene 5 vrijmaakt. Dat gat is belangrijker dan de
opbouw: als de muziek doorloopt onder `verstuurd.`, verdwijnt de eerste
betaling van de film.

Tempo rond 100 bpm, maar zonder hoorbare maatstreep. De puls loopt
onder de snelle cuts door en synchroniseert er bewust niet mee. Cuts op
de maat maken er een reclame van.

---

## 11. Wat eruit valt

De REGEL uit het brief: elke scene bewijst dat het minder moeite kost
dan wat de kijker nu doet. Bewijst een shot dat niet, dan valt hij
eruit. Deze zijn op die grond geschrapt terwijl het script gemaakt
werd. Ze staan hier zodat ze op de set niet terugkomen.

- **Reactieshot na `betaald.` (scene 10).** Zijn gezicht dat opklaart.
  Bewijst niets over het product, alleen dat betaald worden fijn is.
  Dat wist de kijker al. Bovendien is het de stockfoto-glimlach onder
  een andere naam.
- **Team dat samen naar een scherm kijkt (scene 6).** Dit is de
  kantoortuin, verplaatst naar een werkplaats. Bewijst geen minder
  moeite.
- **Voor-en-na met een papieren map (scene 2).** Verleidelijk, want het
  toont het probleem. Maar het bewijst iets over vroeger, niet over
  doen., en het kost drie seconden uit een traag deel dat die niet heeft.
- **Notificaties die binnenstromen (scene 4).** Meerdere meldingen die
  stapelen leest als drukte. De film gaat over rust. Eén melding, in
  shot 1B, is het maximum voor de hele film.
- **Laptop opengeklapt op schoot in de bus (scene 4).** Onveilig en
  onwaar. Hij doet het op zijn telefoon, dat is juist het punt.
- **Handdruk of high five bij het akkoord (scene 8).** Expliciet
  uitgesloten in het brief, en het akkoord is digitaal: er is niemand
  om een hand te geven. Dat is de hele bewijslast van de scene.

Shot 3A (koffie) is het enige shot in de film dat zijn bewijslast niet
draagt. Het staat er als ademruimte voor het tempo breekt, en het is
daarom ook het eerste dat sneuvelt als de montage krap zit.

---

## 12. Wat de Remotion-opzet kan leveren

`video/src/` bevat de bestaande doen.-video (7 scenes, 30 fps,
motion graphics). Die film is niet deze film en wordt hier niet
aangepast.

Wel bruikbaar voor deze productie, als de echte app-opnames op een punt
tekortschieten:

- `src/brand.ts`, merk- en moduletokens. Let op de kleurafwijking in
  sectie 2 voordat je hier waarden uit overneemt.
- `src/components/FlameDot.tsx`, de statusdot.
- `src/scenes/screens/`, bestaande schermen: `DashboardScreen`,
  `OfferteScreen`, `WerkbonEditorScreen`, `PlanningScreen`,
  `PortaalScreen`, `FactuurScreen`.

Die schermen zijn gebouwd op 30 fps en 1920x1080. Voor deze film op
24 fps moeten frame-getallen herschaald worden (factor 0,8), anders
lopen de overlay-timings uit de pas met de tijdlijn in sectie 4.

Voorkeur blijft de echte app-opname. Het brief is expliciet: schermen
zijn echte app-opnames. Een nagebouwd scherm is een uitwijk, geen
gelijkwaardig alternatief, en op het punt waar het product zichzelf moet
bewijzen (3C en 9C) is het geen alternatief.

---

### Generatieve filmtest

`video/filmtest/filmtest.mjs` bestelt drie shots (1A, 6A, 10A) als echte
video bij fal, om te weten of het generatieve pad leeft voordat er 22
shots besteld worden. Die drie leunen alle drie op licht en sfeer en niet
op handeling; haalt een model die niet, dan haalt het de rest ook niet.
Kosten ongeveer $1,86. Zonder `--ja` rekent het script alleen.

Het patroon komt uit kunstdoekje `scripts/lib/falvideo.mjs`, met twee
afwijkingen die in het script zelf staan uitgelegd. De belangrijkste: daar
staat het negatief camerabeweging en handheld shake af omdat de wand stil
moet staan om een doek terug te plakken, en deze film vraagt juist lichte
handheld.

Wat de test niet dekt: de 27 schermshots. Een videomodel verzint UI, en
het brief verbiedt dat expliciet. Die blijven schermopname uit de echte
app, ook als de test slaagt.

Het kind in scene 10 blijft bewust buiten de test. Voor een commerciele
film een synthetisch kind laten genereren is een pad dat je niet inloopt
als je het ook gewoon kunt draaien; 10A test het avondlicht, en dat kan
zonder.

---

## 13. Productie

**Locaties.** Drie: woonhuis (slaapkamer, gang, keuken, eettafel),
werkplaats met kantoorhoek, en de bus. Kantoor van de klant voor scene
8 links kan een hoek van de werkplaatskantoorruimte zijn, anders
gedresseerd en koeler verlicht.

**Cast.** Hoofdpersoon. Klant (scene 8, alleen handen en romp nodig).
Kind (scene 10, alleen als onscherpe vorm, nooit herkenbaar). Voor het
kind geldt: schriftelijke toestemming van de ouders, ook al is het
onherkenbaar, en de opnametijd valt binnen wat voor die leeftijd is
toegestaan.

**Draaischema, twee dagen.**

Dag 1, werkplaats en bus: scenes 4, 5, 6, 7, 9, en 8 rechts. Begin met
scene 6 wide om het licht te zetten. De bus binnen kan hele dag, die
staat stil.

Dag 2, woonhuis: scenes 1, 2, 3, 8 links, 10, 11. Scene 1 en 2 vragen
schemer, dus die eerst, vanaf ongeveer een half uur voor zonsopgang.
Scene 3 direct daarna als de zon door het keukenraam komt. Scene 10 en
11 na zonsondergang. Het gat overdag is voor scene 8 links en voor de
schermopnames uit sectie 6.

**Props en set-dressing.** Wekker met display. Telefoon (één toestel,
door de hele film hetzelfde). Koffiemachine. Werkjas met rits, in
oranje van de werkkleding. Gefreesde letter of plaatlogo. Plaatmateriaal.
Rol plakband. Laptop. Groot scherm voor de kantoorhoek.

Belangrijk: loop de set af op oranje dat er niet hoort. De regel uit
sectie 2 (oranje alleen op UI en werkkleding) sneuvelt op de set, niet
in de grade, en een oranje jerrycan achterin de bus is achteraf duur
weg te halen.

**Continuïteit.** Zelfde werkkleding de hele film, zelfde telefoon,
zelfde klant en bedragen (sectie 6). De film speelt op één dag: de
ondernemer is 's avonds niet geschoren en 's ochtends niet ongeschoren.

---

## 14. Openstaande beslissingen

1. **Flame-waarde.** `#F15025` uit het brief of `#D24620` uit het logo.
   Blokkeert de grade en shot 11C. Zie sectie 2. Aanbeveling: `#D24620`.
2. **Petrol-waarde.** `#1A535C` (brief en app) of `#2b535c` (logo).
   Kleiner verschil, maar raakt hetzelfde end card.
3. **Demo-account.** Werken 3C (klantkaart vult zichzelf) en 9C
   (factuur uit project) echt zo in de app, zonder tussenstappen. Te
   controleren voor de opnamedag.
4. **Casting.** Echte signmaker of acteur. Sectie 3 beveelt een echte
   signmaker aan vanwege de handen in close-up.
