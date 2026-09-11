# Eindcontrole geluid, Film4 (133,4 s, 30 fps)

Gecontroleerd op code en tijdlijn, niet op gehoor: `src/v4/Film4.tsx` (KLANKEN, CURSOR), `src/v4/Extra.tsx` (Geluid4), `src/v4/beats4.ts`, `assets/audio.json`, `team/MOTION.md`, `team/HIGHEND.md`, `src/v2/Cursor.tsx`.

## 1. Oordeel

De sync klopt: alle 17 kliks liggen exact op de klik-landing (stap-ms + 780), alle 6 statustikken liggen exact op de landing van de punt (statusVlucht + 700 = statusLand), alle 8 dolly's hebben een zwiep op het vertrek, en elke Sequence start 2 frames (66 ms) vóór de hit zoals HIGHEND 19 vraagt. Wat ontbreekt is de tweede laag: de vier meldingen, de twee handtekeningen, de split-flap "verstuurd", en het slepen in de planning zijn nu stom, terwijl de bestanden ervoor (`ding`, `pen`, `flap`, `landing`) al in de map staan. De muziek-envelope is het grootste punt: `muziekUitOp` staat op `S.eind + 5000` en valt dus buiten de film, waardoor er nergens ducking is en de drie stiltes uit HIGHEND 19 (muziek op 0,15) niet bestaan; de indie-rock op 0,32 loopt onafgebroken door tot de eindfade.

## 2. Cues zoals ze nu zijn (34)

Alle cues starten 2 f (66 ms) vóór de genoemde ms (`msNaarFrames(ms) - 2`), Sequence-lengte 2500 ms.

| ms | bestand | vol | reden |
|---:|---|---:|---|
| 4600 | inslag | 0,70 | O.inslagOp, de kaartjes slaan in op de punt |
| 6300 | landing | 0,50 | O.puntLandt, de punt landt in het logo |
| 14200 | klik | 0,60 | H1.klikProject, "Project aanmaken" in de mail |
| 15200 | zwiep | 0,35 | H1.dollyOp, mail naar cockpit |
| 23900 | klik | 0,60 | H1.klikTaak, tab "Taak" |
| 26400 | klik | 0,60 | H1.klikTaakSanne, Sanne kiezen |
| 27300 | klik | 0,60 | H1.klikTaakToevoegen, taak toevoegen |
| 30300 | landing | 0,55 | H1.statusLand, punt landt op "aangemaakt" |
| 31600 | klik | 0,60 | H1.klikOfferteMaken |
| 31800 | zwiep | 0,35 | H2.dollyOp, cockpit naar editor (200 ms na de klik) |
| 45200 | klik | 0,60 | H2.klikVerstuur |
| 46200 | klik | 0,60 | H2.klikPortaal, keuze "via portaal" |
| 47900 | landing | 0,55 | H2.statusLand, "verstuurd" |
| 49400 | zwiep | 0,35 | H3.dollyOp, editor naar portaal |
| 52500 | klik | 0,60 | H3.klikBekijken |
| 57700 | klik | 0,60 | H3.klikBevestig |
| 59100 | zwiep | 0,35 | H3.terugOp, portaal terug naar cockpit |
| 62700 | landing | 0,55 | H3.statusLand, "getekend" |
| 66300 | klik | 0,60 | H4.klikWerkbon, menu Acties |
| 67900 | klik | 0,60 | H4.klikWerkbonMaken |
| 69500 | zwiep | 0,35 | H4.dollyOp, cockpit naar planning |
| 75100 | klik | 0,60 | H4.klikKoppel |
| 76300 | klik | 0,60 | H4.klikInplannen |
| 78100 | landing | 0,55 | H4.statusLand, "ingepland" |
| 81000 | zwiep | 0,35 | H5.dollyOp, planning naar telefoon |
| 84300 | klik | 0,60 | H5.klikNaFoto |
| 89200 | landing | 0,55 | H5.statusLand, "gedaan" |
| 92100 | zwiep | 0,35 | H6.dollyOp, telefoon naar cockpit |
| 93900 | klik | 0,60 | H6.klikFinancieel, tab Financieel |
| 95100 | klik | 0,60 | H6.klikFactuurMaken |
| 96700 | klik | 0,60 | H6.klikVerstuur |
| 103500 | landing | 0,55 | H6.statusLand, "betaald" |
| 106600 | zwiep | 0,40 | S.overgangOp, uitzoom naar het slot |
| 126500 | landing | 0,60 | S.puntValt + 700, punt landt in het wordmark |

Muziek nu: `muziek-h.mp3` (128 bpm indie-rock, 2:20), volume = 0,32 × in (0 tot 1000 ms lineair) × uitP × eindP. uitP zakt naar 0,3 rond `muziekUitOp` = 138.400 ms, dat is 5 s ná het einde van de film en doet dus niets. eindP fadet van 130.900 naar 133.200. Geen ducking op de sfx-momenten.

Dichtheid nu: kortste afstand tussen twee cues is 200 ms (31600 klik, 31800 zwiep), verder alles > 900 ms. Geen dubbele cues. Stiltes zonder sfx langer dan 3 s: 6300 tot 14200, 15200 tot 23900, 31800 tot 45200, 36 s aan pushes zonder zwiep. Niet te druk; eerder te leeg op de gebeurtenissen die iets betekenen.

## 3. Punten op belang

1. **Muziek-envelope, hele film.** `muziekUitOp = S.eind + 5000` ligt buiten de film, dus uitP is overal 1 en het commentaar "blijft daarna als zacht bed onder Daan" is niet waar: Daan krijgt de volle 0,32 stadionrock. Anders: `muziekUitOp={S.overgangOp}` (106.600) en de reductie van 0,7 naar 0,5, zodat het slot op 0,16 ligt. Daarnaast de drie stiltes uit HIGHEND 19 in de volume-functie: na de inslag (4.700 tot 6.200), na het tekenen van de klant (58.100 tot 59.000, tot de terug-zwiep) en na betaald (100.900 tot 103.400, tot de statuslanding), telkens naar 0,15 met 300 ms in en uit. Zonder deze dips heeft "stilte" in deze film geen betekenis.

2. **Meldingen zonder ding: 27.900, 42.800, 60.400, 100.400.** Vier Melding4-toasts komen stil binnen terwijl `ding.mp3` (twee marimba-noten, 1,2 s) klaarstaat en al in het Klank4-type zit. Anders: `ding` op H1.meldingTaakOp, H2.meldingOp, H3.meldingOp en H6.meldingOp, volume 0,40. Afstanden naar de dichtstbijzijnde cue: 600, 2400, 1300 en 3100 ms, dus vrij.

3. **Handtekeningen stil: 54.600 en 86.900.** De klant tekent 1700 ms lang in het portaal (H3.tekenOp) en de monteur zet zijn streek op de telefoon (H5.tekenOp + 900 = streekOp, 1100 ms). `pen.mp3` (2,0 s) staat in de map maar niet in het type. Anders: `pen` op 54.600 (0,45) en 86.900 (0,45). Vereist één regel in Extra.tsx: `bestand: 'klik' | 'landing' | 'inslag' | 'zwiep' | 'ding' | 'flap' | 'pen'`.

4. **Slepen in de planning stil: 72.200 en 73.600.** De belofte van H4 is "Eén sleep. De montage staat", maar oppakken en neerzetten zijn stom. Anders: `klik` 0,40 op H4.sleepOp (de kaart komt los, lift 220 ms) en `landing` 0,50 op H4.landOp (landVeer, demping 15). Afstand tot de zwiep ervoor: 2700 ms; tot klikKoppel erna: 1500 ms.

5. **Split-flap "verstuurd" zonder flap: 46.500.** De statuswissel concept naar verstuurd is een SplitFlap (OfferteEditor regel 140) en `flap.mp3` is er precies voor gemaakt. Anders: `flap` 0,50 op H2.flapOp. Let op: 300 ms na de klik op 46.200; dat is onder de 400 ms-regel maar boven de 120 ms-maskeergrens, en het is oorzaak en gevolg (klik, dan de flip). Ik houd de klik erin en zet hem op 0,45. Strikt alternatief: de klik op 46.200 schrappen en alleen de flap laten spreken.

6. **Klik en zwiep op 31.600 en 31.800, 200 ms.** Enige plek waar twee cues binnen 400 ms vallen. Ook hier oorzaak en gevolg (klik "Offerte maken" start de dolly). Boven de 120 ms-grens, dus geen maskering. Anders: laten staan; niets verschuiven, want de zwiep moet op het vertrek en de klik op de landing. Wel de klik naar 0,50 zodat de zwiep erna niet wegvalt.

7. **"daan." landt stil: 108.500.** De grootste tekst van de film (220 px, veer met demping 16) komt binnen zonder tik, terwijl de punt van het wordmark op 126.500 wél een landing krijgt. Anders: `landing` 0,40 op S.introNaamOp. 1900 ms na de overgangs-zwiep.

8. **Vinkje in het portaal stil: 56.500.** H3.vinkOp zet het akkoord-vinkje zonder cursorstap en zonder geluid. Anders: `klik` 0,35 op 56.500. De pen-staart (54.600 + 2000) loopt er 100 ms overheen, dat is een staart, geen transient; geen conflict. 1200 ms voor klikBevestig.

9. **Na-foto landt stil: 84.750.** De foto schuift met een enter-ease (400 ms) in de sectie Na. Anders: `landing` 0,35 op H5.fotoOp, 450 ms na de klik op 84.300, dus binnen de regel.

10. **Pushes zonder zwiep: 35.500, 37.600, 39.600, 54.200, 56.700, 100.400, 102.200.** Zeven pushes en pulls van 400 ms zijn stil. Dat is goed: het zijn detailbewegingen binnen een paneel, en op 54.200 en 100.400 zit al een pen respectievelijk ding vlakbij. Niets toevoegen; ik noem het zodat het een keuze is en geen vergeten cue.

11. **Typ-geluid bewust weg: 24.400, 53.200, 86.000.** Drie keer wordt er getypt (taaktitel, naam klant, naam op de telefoon). `typ.mp3` is 2,5 s en zou op 86.000 dwars door de pen op 86.900 lopen, en op 53.200 tegen de push en pen aan. Niet toevoegen; de kliks en pen dragen die scènes.

12. **Muziek-einde controleren op gehoor.** Het bestand is 2:20 (140 s), de film 133,4 s; de eindfade (130.900 tot 133.200) valt in wat volgens de prompt het "explosive final chorus" is, en het "triumphant ending" van het bestand valt buiten de film. Als het slot te hard eindigt: `startFrom={msNaarFrames(6600)}` op de Audio zodat het einde van het bestand op S.eind valt, en dan luisteren of de inslag op 4.600 nog ergens op valt. Dit is niet uit code te beoordelen.

Werkbon-toast op 68.380 ("Werkbon aangemaakt met 3 items", Cockpit): een vijfde ding zou kunnen, 480 ms na de klik en 1100 ms voor de zwiep. Ik laat hem weg; het is een klein in-app bevestiginkje en H4 heeft al vier cues in 3 s.

Na de voorgestelde lijst: 46 cues in 133 s, kortste afstanden 200 ms (31.600/31.800) en 300 ms (46.200/46.500), beide bewuste paren, al het andere ≥ 450 ms. Stiltes zonder sfx van meer dan 3 s blijven bestaan op 6.300 tot 14.200, 15.200 tot 23.900, 33.000 tot 42.800, 108.500 tot 126.500.

## 4. Voorgestelde KLANKEN-lijst

Eerst in `src/v4/Extra.tsx` het type verruimen:

```ts
export type Klank4 = { ms: number; bestand: 'klik' | 'landing' | 'inslag' | 'zwiep' | 'ding' | 'flap' | 'pen'; volume?: number }
```

En de Geluid4-aanroep in Film4.tsx: `muziekUitOp={S.overgangOp}` in plaats van `S.eind + 5000`, met in de volume-functie de reductie op 0,5 en de drie dips:

```ts
const dip = (van: number, tot: number) => 1 - 0.53 * Math.min(vlak(ms, van, van + 300), 1 - vlak(ms, tot - 300, tot))
const stil = dip(O.inslagOp + 100, O.puntLandt - 100) * dip(H3.klaarOp + 60, H3.terugOp - 100) * dip(H6.betaaldOp + 300, H6.statusLand - 100)
const uitP = 1 - 0.5 * vlak(ms, muziekUitOp - 250, muziekUitOp + 150, thema.ease.exit)
return 0.32 * inP * uitP * eindP * stil
```

(0,32 × 0,47 = 0,15 in de stiltes; 0,32 × 0,5 = 0,16 onder Daan en het slot.)

Dan de lijst, zelfde vorm als nu:

```ts
// Geluid: tik op elke landing van de punt, diepere tik op elk statuswoord,
// ding op elke melding, pen op elke handtekening, flap op de split-flap,
// zwiep op elk dolly-vertrek. Pushes en typen blijven stil.
const KLANKEN: Klank4[] = [
  // Opening
  { ms: O.inslagOp, bestand: 'inslag', volume: 0.7 },
  { ms: O.puntLandt, bestand: 'landing', volume: 0.5 },
  // Kliks op de landing (stap-ms + 780)
  ...CURSOR.filter((c) => c.klik).map((c): Klank4 => ({ ms: c.ms + 780, bestand: 'klik', volume: c.ms + 780 === H1.klikOfferteMaken || c.ms + 780 === H2.klikPortaal ? 0.5 : 0.6 })),
  // Statuswoorden: diepere tik op de landing van de punt
  ...[H1, H2, H3, H4, H5, H6].map((h): Klank4 => ({ ms: h.statusLand, bestand: 'landing', volume: 0.55 })),
  // Dolly's: zwiep op het vertrek
  ...[H1, H2, H3, H4, H5, H6].map((h): Klank4 => ({ ms: h.dollyOp, bestand: 'zwiep', volume: 0.35 })),
  { ms: H3.terugOp, bestand: 'zwiep', volume: 0.35 },
  { ms: S.overgangOp, bestand: 'zwiep', volume: 0.4 },
  // Meldingen
  { ms: H1.meldingTaakOp, bestand: 'ding', volume: 0.4 },
  { ms: H2.meldingOp, bestand: 'ding', volume: 0.4 },
  { ms: H3.meldingOp, bestand: 'ding', volume: 0.4 },
  { ms: H6.meldingOp, bestand: 'ding', volume: 0.4 },
  // Split-flap concept naar verstuurd
  { ms: H2.flapOp, bestand: 'flap', volume: 0.5 },
  // Handtekeningen: klant in het portaal, monteur op de telefoon; vinkje ertussen
  { ms: H3.tekenOp, bestand: 'pen', volume: 0.45 },
  { ms: H3.vinkOp, bestand: 'klik', volume: 0.35 },
  { ms: H5.tekenOp + 900, bestand: 'pen', volume: 0.45 },
  // Planning: kaart oppakken en neerzetten
  { ms: H4.sleepOp, bestand: 'klik', volume: 0.4 },
  { ms: H4.landOp, bestand: 'landing', volume: 0.5 },
  // Na-foto landt in de werkbon
  { ms: H5.fotoOp, bestand: 'landing', volume: 0.35 },
  // Slot: "daan." landt, de punt landt in het wordmark
  { ms: S.introNaamOp, bestand: 'landing', volume: 0.4 },
  { ms: S.puntValt + 700, bestand: 'landing', volume: 0.6 },
]
```

Uitgeschreven in ms (46): 4600 inslag, 6300 landing, 14200 klik, 15200 zwiep, 23900 klik, 26400 klik, 27300 klik, 27900 ding, 30300 landing, 31600 klik 0,5, 31800 zwiep, 42800 ding, 45200 klik, 46200 klik 0,5, 46500 flap, 47900 landing, 49400 zwiep, 52500 klik, 54600 pen, 56500 klik 0,35, 57700 klik, 59100 zwiep, 60400 ding, 62700 landing, 66300 klik, 67900 klik, 69500 zwiep, 72200 klik 0,4, 73600 landing 0,5, 75100 klik, 76300 klik, 78100 landing, 81000 zwiep, 84300 klik, 84750 landing 0,35, 86900 pen, 89200 landing, 92100 zwiep, 93900 klik, 95100 klik, 96700 klik, 100400 ding, 103500 landing, 106600 zwiep, 108500 landing 0,4, 126500 landing.
