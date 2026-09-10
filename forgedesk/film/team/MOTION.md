# MOTION.md  (30 fps: 1 s = 30 f)

Gebundeld uit: video-shotcraft (157 shotkaarten), LottieFiles motion-design-skill,
Emil Kowalski (animate, review-standards), iart-ai motion-design-skills,
noamdorr saas-product-demo-video (cursor-wiskunde), codeverbojan remotion-cinematic.
Bronnen staan in de scratchpad onder skills/, motionskill/ en shotcraft/.

## Persoonlijkheid
Premium-corporate: geen overshoot op camera of tekst, max 3 procent op kaarten.
Twee curves voor 90 procent van de film. Eén speels element: de Flame-cursor.

## Timing (ms / frames)
| Element                | Duur              | Curve  |
| micro (hover, klik)    | 100-160 / 3-5     | ui-out |
| tooltip, chip, badge   | 150-200 / 5-6     | ui-out |
| kaart, paneel, rij     | 300-400 / 9-12    | enter  |
| modal, sheet           | 400-500 / 12-15   | enter  |
| tekstregel-reveal      | 400-600 / 12-18   | enter  |
| camerabeweging         | 1200-2000 / 36-60 | camera |
| hold na kerninfo       | >= 1000 / 30      | stil   |
| rust na bulk-entree    | >= 500 / 15       | stil   |
Exit = 70 procent van entree. Duur schaalt met sqrt(afstand): 2x afstand = 1,4x duur.
Eerste versie is altijd te snel: openingsboog >= 3 s, typen 3 f per teken, 11 f adem
tussen typen en reactie.

## Easings (Easing.bezier)
enter  (0.16, 1, 0.3, 1)      entree, landing
ui-out (0.23, 1, 0.32, 1)     kleine UI-feedback
move   (0.65, 0, 0.35, 1)     verplaatsing op scherm
exit   (0.7, 0, 0.84, 0)      verdwijnen
camera (0.22, 0.61, 0.36, 1)  push, pan, pull
Springs (Remotion): kaart damping 200 (geen bounce); chip damping 14, stiffness 140, mass 0,7.
Nooit linear behalve voortgang. Nooit ease-in op entree. Nooit scale vanaf 0: start
0,94-0,97 + opacity 0 + translateY 8-16 px. Blur 2 px verbergt lelijke crossfades.

## Stagger
Lijst/grid 2-4 f per item, totaal < 15 f. Kaarten 4-6 f. Woorden 3 f, overlap 60 procent.
Zelfde curve voor de hele groep, alleen de starttijd verschilt. Groep van 8+: versnellend,
dan 15 f stil. Max 1/3 van de elementen tegelijk in beweging. Geen beweging groter dan
1/3 scherm zonder tussenkeyframe.

## Drie lagen
Hoofd 100 procent amplitude, landt op de beat. Secundair (schaduw, label, icoon) 30-50
procent, 2-3 f later, andere curve. Ambient (gradient, drift) 10-20 procent, > 2 s per
cyclus, sin-gedreven, nooit stil maar nooit opvallend. Counter-motion: achtergrond
tegengesteld op 20-30 procent snelheid. Exact één held per frame.

## Camerataal
Eén beweging per beat. Push-in 1,00 naar 1,06-1,12 om een detail te tonen; pull-out om
context te geven; pan om te volgen; slow push 1,00 naar 1,14 over 120 f met ease-in als
spanningsopbouw. Nooit combineren: push + pan + rotate in één shot; zoom + dutch angle;
twee full-frame impacten binnen 16 beats. Max 3 full-frame impacten per film. Geen
handheld shake. Tekstshots recht van voren. Parallax bg/mid/fg = 0,2 / 0,6 / 1,2x.
Na kerninformatie >= 1 s stil voordat de camera vertrekt.

## Cursor
Hotspot (4,3) in de 24-viewBox; positie = doel - tip * scale. Arc-pad (kwadratische
bezier), 18-30 f per verplaatsing, curve move. Aankomst: 6-9 f hover (scale 1,10), klik
scale 0,9 gedurende 4 f, ripple 26 px van 0,3 naar 1,9 in 10 f. Camera en cursor uit
dezelfde keyframetabel; de cursor is nooit later dan de camera. Typen 3 f per teken, caret
vast tijdens typen, daarna knipperen op 8 f.

## Tekst-reveals
Woorden: opacity 0 naar 1, translateY 12 px naar 0, blur 4 px naar 0, 10 f per woord,
overlap 60 procent. Eén benadrukt woord per kop, kleur 5 f na landing. Kop hold >= 30 f.
Cijfers tellen op met tabular-nums, 18-36 f, curve enter. Leesbare tekst >= 56 px
effectief op 1080p (in 4:3 op 1440 x 1080: >= 40 px).

## Oorzaak-gevolg checklist (per UI-shot)
[ ] Trigger zichtbaar vóór het effect (cursor, klik).
[ ] Effect start 2-4 f na de klik, nooit ervoor.
[ ] Nieuwe elementen komen uit de trigger (transform-origin op de bron), niet uit het midden.
[ ] Landing is een echt slot in de layout, niets blijft zweven.
[ ] Na het gevolg >= 15 f stil voordat de camera beweegt.
[ ] De kijker kan de handeling nadoen op echte snelheid.
[ ] Elke beweging heeft een naam: feedback, ruimte, status, uitleg.
[ ] Geen Math.random of Date.now; alles deterministisch uit t.
[ ] Stills op frame 0, midden en laatste gecontroleerd vóór render.
[ ] SFX 2-3 f vóór de visuele hit; minstens 3 stiltes per film.
