# Regie, eindcontrole v4 (133,4 s)

Bekeken: vel-00 t/m vel-22 (een frame per halve seconde), beats4.ts en Film4.tsx.

Leesnoot vooraf: de tijdcode in de vellen loopt ongeveer 0,6 s achter op de beats. Voorbeelden: "verstuurd" heeft statusOp 47,3 s en staat pas in het frame met label 48,0 s; "slim gedaan." heeft regelOp 129,7 s en staat pas in het frame 130,5 s; de hoofdstukkaart "offerte." (kaartOp 31,9 s) staat pas in frame 32,5 s. Hieronder noem ik de beat-tijd uit beats4.ts en tussen haakjes het frame waarin je het ziet.

## 1. Oordeel

De ruggengraat staat: zes hoofdstukken, een project, een punt die van mail tot betaald meeloopt, en wie de app niet kent kan de keten mail, offerte, klant tekent, planning, werkbon, betaald zonder uitleg volgen. De fouten zitten op de naden: het slot van hoofdstuk 1 breekt twee van je eigen regels tegelijk, de werkbon-klik in hoofdstuk 4 is onzichtbaar, de kaart van hoofdstuk 6 staat nog op beeld bij de eerste klik, en de Daan-intro loopt over het eerste Daan-frame heen. Niets hoeft herbouwd; het is een stuk of tien beat-verschuivingen en twee tekstwijzigingen.

## 2. Punten, op belang

### 1. Hoofdstuk 1 eindigt zonder punt en met tekst onder de klik (30,3 tot 31,8 s; frames 31,0 tot 32,5)
Wat er mis is: "aangemaakt" landt op 30,3 s, maar de punt vertrekt al op 30,82 s naar "Offerte maken" (klik 31,6 s, cursorstap 780 ms eerder). Het statuswoord staat daarna 0,9 s zonder punt op beeld (frame 31,5 en 32,0: "aangemaakt" kaal, de punt zit rechtsboven op de knop) en de klik op "Offerte maken" valt terwijl het statuswoord nog staat. Dat is tegen "statuswoord met de punt als laatste teken" en tegen "nooit tekst en klik tegelijk". In frame 32,5 hangt "aangemaakt" ook nog uitfadend onder de kaart "offerte.".
Wat anders moet (beats4.ts, H1): rondStap 1400 naar 1200 (rondleiding van 4,2 naar 3,6 s, ruim genoeg). Daardoor schuiven klikTaak, taakDialoogOp, taakTypOp, klikTaakSanne, taakKiesOp, klikTaakToevoegen, taakKlaarOp, meldingTaakOp elk 600 ms naar voren (klikTaak 23300, meldingTaakOp 27300). meldingTaakUit 28900. statusVlucht 29000, statusOp 29100, statusLand 29700. klikOfferteMaken blijft 31600. In Film4.tsx het H1-statuswoord laten vertrekken als de punt vertrekt: `uit={H1.klikOfferteMaken - 800}` in plaats van `H1.eind - 100`. Dan staat het woord 1,1 s compleet en verdwijnt het samen met de punt.

### 2. De klik op Acties in hoofdstuk 4 gebeurt buiten beeld (66,3 s; frames 66,5 tot 67,5)
Wat er mis is: de punt schuift naar de onderrand van het beeld (x ongeveer 82 %, y 99 %) en blijft daar drie frames hangen; er is geen knop te zien. Dan verschijnt de dialoog "Werkbon maken" (frame 67,5) zonder zichtbare oorzaak. Oorzaak in de code: `data-doel="acties-werkbon"` zit in het Acties-blok in de rechterkolom van de cockpit, onder de vouw (Cockpit.tsx regel 354). In hoofdstuk 1 scrolde de pagina 300 px voor het portaal-blok; in hoofdstuk 4 niet, dus het doel ligt onder de zichtbare rand.
Wat anders moet (Film4.tsx, cockpitStand.scrollY): scroll de cockpit ook hier 300 px omhoog van H4.klikWerkbon - 900 tot H4.klikWerkbon - 400 (zelfde vlak-curve als in H1) en terug van H4.werkbonKlaarOp + 300 tot + 800, zodat de Acties-kaart in beeld staat als de punt erop klikt en de dialoog een zichtbare oorzaak heeft.

### 3. Kaart "betaald. jij" staat nog op beeld bij de klik op Financieel (93,9 s; frame 94,5)
Wat er mis is: kaartUit 94000 plus 250 ms exit betekent dat de kaart tot 94,25 s zichtbaar is; klikFinancieel valt op 93,9 s. In frame 94,5 staat de grote "betaald." over de cockpit en zit de punt tegelijk op de tab Financieel. Tekst en klik tegelijk.
Wat anders moet (beats4.ts, H6): kaartUit 93300 (kaart dekt de dolly tot 93,3 s en is weg op 93,55 s), klikFinancieel 94100, financieelOp 94300. De rest van H6 kan blijven; tussen financieelOp en klikFactuurMaken (95,1 s) blijft 0,8 s.

### 4. Daan-intro botst met het eerste Daan-frame (111,2 tot 111,6 s; frame 112,0)
Wat er mis is: introUit 111200 met 400 ms exit, frameOp 111400. In frame 112,0 staan "doen. wordt ondersteund door jouw slimme collega." en de grote "daan." nog half op beeld terwijl links al "leest je mail en zet de aanvraag klaar." en rechts de mailbox inschuiven. Twee koppen door elkaar op het rustigste moment van de film.
Wat anders moet (beats4.ts, S): introUit 110800. De intro duurt dan 3,2 s (naam vanaf 108,5 s, dus 2,3 s "daan. powered by Claude"), en er zit 200 ms lucht voor frameOp. frameOp, frameDuur en gridOp blijven staan.

### 5. De klant krijgt de offerte binnen, maar niemand ziet dat; en de naam wordt getypt in een onleesbaar klein formulier (50,8 tot 54,6 s; frames 51,0 tot 54,5)
Wat er mis is: de eerste portaalpagina (Sign Company-kop, kaart "Offerte OFF-2026-0042", knop Bekijken) staat vanaf 50,8 s onder de kaart "portaal." die tot 51,95 s zichtbaar is; de klik op Bekijken valt op 52,5 s. Netto 0,55 s schone pagina (alleen frame 53,0). Dit is het enige moment dat uitlegt wat "portaal" voor de klant betekent. Daarna wordt de naam "Pieter van der Berg" getypt (53,2 tot 54,2 s) in de volle pagina waar het formulier rechts ongeveer een tiende van de breedte is (frames 54,0 en 54,5: "Pieter" onleesbaar); de push naar het formulier komt pas daarna.
Wat anders moet (beats4.ts, H3): kaartUit 51100 (kaart 1,6 s, "geen inlog, geen app" staat dan nog 0,9 s), zodat de portaalpagina 1,1 s schoon staat voor Bekijken. Dan push eerst, naam daarna: pushOp 53000, pushTot 53400, naamOp 53500, tekenOp 54700; vinkOp 56500, pullOp 56700 en pullTot 57100 blijven.

### 6. Melding en statuswoord tegelijk in hoofdstuk 3 (62,1 tot 62,7 s; frame 63,0)
Wat er mis is: statusOp 62100 ligt voor meldingUit 62400. In frame 63,0 staat rechtsboven nog "Klant akkoord · je klant." terwijl linksonder "getekend" opkomt en de punt aanvliegt. In hoofdstuk 1 gebeurt hetzelfde 300 ms lang (frame 30,5: melding "taak toegewezen" plus "aangemaakt."), dat lost punt 1 op.
Wat anders moet (beats4.ts, H3): meldingUit 61800 (melding 1,4 s, gelijk aan de kortste in de film), rest ongewijzigd. Dan is de melding weg op 62,1 s als het woord verschijnt.

### 7. Logo hangt 1,7 s stil en de kaart "mail." landt bovenop "doen." (8,9 tot 11,4 s; frames 9,5 tot 11,5)
Wat er mis is: na belofteUit 8900 staat het logo tot de duik (10,0 s, zichtbaar vanaf 10,6 s) onbewogen in beeld; pushOp 9400 is in de frames niet te zien. Daarna verschijnt de kaart "mail. jij" (kaartOp 10300) midden over de letters "e" en "n" van het logo (frame 11,0) en schuift het mailpaneel er nog doorheen (frame 11,5: logo, paneel en kaart in een beeld). Tekst over tekst. Daarna wacht de punt van 11,4 tot 12,9 s in de lege studio rechts naast het mailpaneel (frames 12,0 tot 13,5), buiten de app.
Wat anders moet: O.belofteUit 9300 (belofte 2,7 s, de dode hold wordt 0,7 s). In Film4.tsx regel 131 de opening eerder wegdraaien: `openingZicht = 1 - vlak(t, O.eind + 200, O.eind + 800)` in plaats van + 1400 en + 2000, zodat het logo weg is voor de kaart op 10,3 s. Voor de punt een extra cursorstap zonder klik op OVERDRACHT_MS + 700 met doel 'project-aanmaken' (hover), zodat hij bij de app hoort in plaats van ernaast te zweven.

### 8. Bij de pushes in hoofdstuk 2 en 3 is het rechterderde van het beeld leeg (35,9 tot 40,0 s en 54,6 tot 56,7 s; frames 36,5 tot 39,5 en 55,0 tot 57,0)
Wat er mis is: bij de push op de marge ligt de rechterrand van het paneel op ongeveer 66 % van de beeldbreedte en is de linkerrand afgesneden (frame 36,5: paneelrand op 795 van cel 480 tot 960). Idem bij de urenpush (frame 38,5) en bij de handtekening-push in H3 (frame 55,0: rand op 69 %). Vier seconden lang studio-achtergrond in een derde van het beeld terwijl de kolom met totaal en marge juist het onderwerp is.
Wat anders moet (Film4.tsx, STOPS regel 47 en 49): de dx van de drie pushes verkleinen tot de rechterrand van het paneel op de beeldrand ligt; op het oog moet de camera ongeveer een derde beeldbreedte naar links (schatting dx 520 naar 200 voor H2, 530 naar 220 voor H3). Zoom 1,4 en 1,5 zelf kloppen.

### 9. De belofte over de marge komt na de uren-omweg (40,4 s; frames 41,0 tot 43,0)
Wat er mis is: de push op de marge duurt tot 37,6 s, daarna gaat de camera naar het urenblok met "overzicht in je uren" (38,1 tot 39,6 s), trekt terug, en pas dan komt "Je marge zie je vóór je verstuurt". Het argument wordt onderbroken door een zijstap; wie de app niet kent koppelt de belofte aan de uren, niet aan de marge die drie seconden eerder in beeld stond.
Wat anders moet (beats4.ts, H2): belofte in de hold op de marge: belofteOp 36100, belofteUit 38300. Daarna de uren: urenPushOp 38400, urenPushTot 38800, urenLabelOp 38900, urenLabelUit 40400, pullOp 40400, pullTot 40800. meldingOp 42800 en alles daarna ongewijzigd (er blijft 2,0 s rust op de volle editor voor Sanne's melding).

### 10. "Betaald" staat drie keer in een hoofdstuk, twee keer tegelijk (103,9 tot 106,1 s; frames 105,0 tot 106,5)
Wat er mis is: kaart "betaald.", statuswoord "betaald." en belofte "Factuur eruit. Betaald." De belofte eindigt boven in beeld op precies het woord dat onderin al met de punt staat. Het slotakkoord van de film klinkt daardoor als een herhaling in plaats van een bevestiging.
Wat anders moet (Film4.tsx regel 262): belofte "Factuur eruit. Geld binnen" met kernwoord "Geld binnen". Statuswoord en kaart blijven "betaald.".

### 11. De dolly van mail naar project landt op een leeg wit paneel (15,2 tot 16,4 s; frames 16,5 en 17,0)
Wat er mis is: cockpitOp 16300 ligt op het einde van de dolly, de blokken bouwen op tot 17,0 s. Tijdens de hele camerabeweging is het projectpaneel een wit vlak, en bij aankomst staat er alleen een titel. Het leest als een pagina die nog laadt, op het moment dat de film juist "mail wordt project" wil laten zien.
Wat anders moet (beats4.ts, H1): cockpitOp 15500, zodat de pagina staat als de camera aankomt (blokken klaar op 16,2 s). belofteOp 16800 blijft.

### 12. De hoofdstukteller "1 / 6" is nauwelijks te zien (elke kaart; frames 12,0, 32,5, 50,5, 70,5, 82,0, 93,0)
Wat er mis is: de teller staat linksboven (96, 72) in 40 px petrol op 70 %, ver van het woord midden in beeld; in de frames is het een vaag cijfer in de hoek. Hij is de enige aanwijzing hoe lang de film nog duurt en waar je zit in de keten, en die functie vervult hij nu niet.
Wat anders moet (Tekst.tsx, Hoofdstukkaart): de teller bij het woord zetten, gecentreerd boven "mail." als "1 / 6" in 34 px op 60 %, met dezelfde inP-veer. Of hem laten staan en naar 100 % en 48 px brengen.

## 3. Wat goed werkt en zo moet blijven

- De opening (0 tot 9 s): losse tool-kaartjes, de punt die ze naar zich toe trekt, inslag, logo, belofte. In vijf seconden staat het probleem en de oplossing zonder een woord uitleg.
- Hoofdstukkaart tijdens elke dolly, met "wie": jij, je klant, je monteur op locatie. Het perspectief wisselt zonder dat iemand het hoeft te zeggen. "geen inlog, geen app" op de portaalkaart is de beste regel van de film.
- De punt als cursor die als laatste teken op het statuswoord landt (hoofdstuk 2 tot en met 6 kloppen). De landing is elke keer een kleine beloning; daarom weegt punt 1 zo zwaar.
- Labels "je collega." en "je klant." op de meldingen: zonder die twee woorden zou de kijker niet weten wiens scherm hij ziet.
- Hoofdstuk 3: de handtekening in de push, het rode Bevestigen, "Offerte geaccepteerd", en dan terug naar jouw project met de melding. Dat is de kern van het product en hij is helder.
- Hoofdstuk 4: de sleep leest goed (frames 73,0 tot 74,0), de dialoog volgt direct op de landing.
- Koppelingen-regel met de vier namen (Exact Online, Moneybird, e-Boekhouden, Mollie) in 2,6 s: precies genoeg.
- Het Daan-slot in drie 50/50-frames met de voortgangsstippen linksonder en dezelfde kop, en de eindkaart die 2,4 s stil blijft staan op doen. / slim gedaan. / doen.team.
