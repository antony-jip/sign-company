# Regie: de doen.-film

## Wat de film moet doen
Zichzelf verkopen aan signmakers in de Sibon-app, meestal op mute, vaak op een
telefoon. Eén reactie: "dat wil ik ook." De kijker kent het vak, niet de software.
Dus: laat zien wat het oplevert, in vaktaal, met echte schermen.

## Het verhaal in één zin
Losse tools smelten samen tot doen. Uit een mail ontstaat een project, in dat
project gebeurt alles, de klant kijkt via het portaal mee tot en met betaald.

## De spine (beats in src/v2/beats.ts)
1. Opening: losse tools zweven, Flame-punt ontsteekt, alles smelt samen tot doen.,
   belofte "Alles wat een signmaker nodig heeft. In één app."
2. Dashboard opent. Nieuwe aanvraag komt binnen. Klik op Email.
3. Mail: aanvraag herkend door Daan, klantkaart vult zich, Project aanmaken, bijlage
   naar het project.
4. Cockpit vouwt open: Voortgang, Briefing, Klant, Taken, Offertes, Tijd, Team, Portaal.
5. Offerte: regels, calculatie open, marge in beeld, Verstuur via portaal, flap
   concept naar verstuurd, fase In review.
6. Portaal (klant): offerte bekijken, naam, handtekening, Bevestigen. Terug: melding,
   Flame-stip naar de fasebalk, Akkoord klant.
7. Montage: één sleep in de planning, fase Ingepland.
8. Inklokken, telefoon op locatie: Na foto, foto in het portaal.
9. Mail uit het project: composer, tekst, Uit project voegt tekening toe, Opvolgen
   aan, Verzenden.
10. Financieel: Factuur maken, Verstuur, melding betaald via Mollie, hartslag
    Gefactureerd naar Betaald.
11. Pull-back naar alle schermen, "Eén project. Alles erin.", end card.

## Regels die niet onderhandelbaar zijn
- Eén camera, geen harde cuts van dashboard tot pull-back. Zwenken, geen springen.
- Elke klik veroorzaakt zichtbaar het volgende. Klik eerst, gevolg daarna, nooit
  andersom. Klik landt op klikX + 80 ms.
- De fasebalk is de hartslag: elke fase-sprong is een hold van minstens 900 ms
  waarin niets anders beweegt.
- Alles wat leesbaar moet zijn staat tussen 15 en 75 procent van de hoogte en is
  minimaal 26 filmpx hoog in 4:3 (1440 x 1080).
- UI komt uit de app: echte componenten of nagebouwd met de app-klassen. Nooit
  verzonnen UX. Als de app het niet zo doet, doet de film het ook niet.
- Premium motion: 350 tot 600 ms, signatuurcurve cubic-bezier(0.16, 1, 0.3, 1),
  exits sneller dan entrances, geen overshoot behalve de cursor (8 procent).
- Eén speels element: de Flame-cursor. De rest is rustig en zeker.
- Statuswoorden eindigen op een Flame-punt en flippen als split-flap.
- Kleuren uit de app (kleuren.gen.json), fonts Instrument Sans, Inter, DM Mono.
- Geen emoji, geen em-dashes, doen. altijd lowercase met Flame-punt.

## Werkwijze van het team
- Copywriter: src/v2/copy.ts (beloften, uitleg-regels, statuswoorden). Zie team/COPY.md.
- Animator: src/v2/FilmV2.tsx, Wereld.tsx, Cursor.tsx, Belofte.tsx, kern/. Zie team/MOTION.md.
- Bouwers: src/v2/schermen/*. Zie src/v2/BOUWREGELS.md.
- Regisseur: beoordeelt op frames en geeft getallen terug. Zie team/UITLEG.md voor
  de vraag "snapt de kijker wat hij ziet".
- Iedereen: `npx tsc --noEmit` schoon voor eigen bestanden, stills renderen met
  `./stills.sh DoenFilm2 <frames>`, bekijken, verbeteren. Rapporteer kort en concreet.
