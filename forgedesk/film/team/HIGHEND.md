# HIGHEND.md: wat "high end SaaS" in 2026 concreet betekent voor de doen.-film

Onderzoek (sep 2026) naar wat Linear, Vercel, Raycast, Apple, Figma Config,
Studio Dumbar en de betere launchfilms feitelijk doen, vertaald naar getallen
voor deze film. Uitgangspunt: de film heeft al een aurora, een gradiëntrand,
dieptevervaging en een vignet (Wereld.tsx). Dit document zegt wat er nog
ontbreekt om "meer SaaS, high end, opbeurender, hipper" te halen, en wat we
juist moeten laten. 30 fps, 1440 x 1080, ~98 s. Geen nieuwe npm-pakketten.

## 1. Wat high end in 2026 concreet betekent

1. **Licht is het merk, niet de kleur.** Raycast is 98 procent achromatisch met
   één coral-accent; Linear haalde in 2025 nog meer kleur weg (warm grijs i.p.v.
   blauwgrijs). Premium leest als: veel rustige grond, één accent dat gloeit.
   Bron: Raycast DESIGN.md-analyse, Linear "A calmer interface".
   Waarom: kleur die overal zit, betekent niets meer; kleur die op één plek zit, wijst.

2. **Structuur voel je, je ziet hem niet.** Linear: minder scheidingslijnen,
   zachter contrast op borders, sidebar "een paar tandjes dimmer" zodat het
   werk de held is. Bron: Linear design refresh 2025.
   Waarom: elke lijn die je ziet is een lijn die concurreert met de inhoud.

3. **Gradiëntrand als lichtbron, niet als sticker.** De "rim" is een 1 px
   scherpe lijn plus een geblurde kopie eronder (blur 8-24 px, opacity 0,3-0,5),
   met een conic-gradient die traag draait (@property angle, 1,5-8 s).
   Bron: codetv.dev animated gradient border, Cruip, ibelick.
   Waarom: een gloed zonder scherpe lijn wordt smeer; een lijn zonder gloed wordt sticker.

4. **Aurora ademt traag: 8-18 s per cyclus, 3-4 tinten, blur 70-80 px, saturate 1,3-1,4.**
   Meer dan vier tinten wordt bruin. Body-tekst nooit direct op de aurora.
   Bron: superdesign.dev/styles/aurora, 21st.dev mesh/aurora.
   Waarom: snelle kleurverschuiving leest als screensaver; trage als licht.

5. **Glas met mate.** Paneel: backdrop-blur 14-20 px, vulling 4-8 procent wit
   (of 55 procent donker op dark), 1 px rand op 10 procent wit, een hairline
   toplicht. Apple Liquid Glass: speculaire glint max 6 px amplitude.
   Bron: superdesign aurora, Liquid Glass HIG-notities, LogRocket over Linear-stijl.
   Waarom: glas op elk vlak is 2023; glas op één zwevend element is 2026.

6. **Ease-out op alles wat binnenkomt, nooit ease-in op UI.** Standaard
   `cubic-bezier(0.23, 1, 0.32, 1)`, verplaatsing op scherm
   `cubic-bezier(0.77, 0, 0.175, 1)`, drawer `cubic-bezier(0.32, 0.72, 0, 1)`.
   UI onder 300 ms, modals 200-500 ms, stagger 30-80 ms.
   Bron: Emil Kowalski animate/STANDARDS.
   Waarom: ease-out laat het moment dat de kijker kijkt meteen gebeuren.

7. **Nooit vanaf scale(0); start 0,9-0,97 plus opacity 0, uit de trigger.**
   Popovers schalen vanuit de bron; modals vanuit het midden. Exit spiegelt
   entree en is korter. Bron: Kowalski, Apple-style keynote-notities.
   Waarom: dingen die uit het niets groeien, voelen als een gimmick.

8. **Cascade in plaats van gelijktijdig.** Vercel Geist: dialoog 300 ms, titel
   200 ms na 50 ms, body 200 ms na 100 ms, knoppen 150 ms na 150 ms.
   Bron: Geist motion-principes.
   Waarom: een cascade vertelt hiërarchie zonder een pijl te tekenen.

9. **Eén held per frame, en de held mag maar 30-80 ms voorsprong hebben.**
   Secundaire lagen (schaduw, label, gloed) volgen 2-3 f later met een andere
   curve. Bron: Apple keynote-analyses ("elementen reageren op elkaar").
   Waarom: dat volgen is precies wat "systeem" laat voelen i.p.v. losse lagen.

10. **Product in de eerste 3 seconden, geen logo-intro.** Launchfilms die
    werken openen midden in de workflow of met het resultaat; logo-animaties
    vooraf zijn de meest genoemde fout. Bron: Vidico, demopolish, Product Hunt-gids.
    Waarom: de kijker beslist in 3,7 s of hij blijft.

11. **Shots van 2-4 s, en elk concept krijgt één adem voor het volgende.**
    Retentie zakt hard na 90 s; niet omdat mensen ongeduldig zijn, maar omdat
    ze vulling herkennen (Wistia 2025). Bron: moonb, Wistia State of Video.
    Waarom: tempo komt niet van sneller, maar van zonder vulling.

12. **Geluid 1-2 frames vóór het beeld, transient op de hit.** Whoosh 10-20 ms
    vóór de camerabeweging, de luidste piek op het frame van de cut, lengte
    gelijk aan de transitie (400-500 ms). Minimaal 3 stiltes. Bron: SFX Engine,
    Sonilo whoosh-gids, Figma Config (warm digitaal, geen "poppy EDM").
    Waarom: het brein verwerkt geluid sneller; pre-cue maakt beeld responsief.

13. **60/30/10 op de film als geheel.** 60 procent grond (crème of diep petrol),
    30 procent secundair (petrol, zand, wit UI), 10 procent Flame, alleen op
    wat moet knallen. Bron: Fstoppers/No Film School (kleurregel in film),
    Theme & Color (brand).
    Waarom: Flame die overal zit is een huisstijl; Flame die op één plek zit is een signaal.

14. **Ritme boven versiering (Studio Dumbar).** Kinetische type leeft op beat,
    gewicht en tempo, niet op effecten; "sudden dimensionality": kort van 2D
    naar 3D en terug voor impact. Bron: Studio Dumbar Utah Jazz/OutSystems.
    Waarom: één goed getimede zwenk doet meer dan tien deeltjes.

15. **Restraint is de stijl.** Vercel Ship 2025 ging weg van "te glimmend, te
    luid" naar donker, reflecterend, gegrond. Figma Config koos 15 fps en riso
    om niet "smooth and slick" te zijn. Bron: Vercel Ship-platform, Figma Config 2025.
    Waarom: de top-studios trekken terug waar templates opvoeren.

## 2. Referentie-analyse van de twee beelden

**Beeld 1: witte promptkaart op zacht pastel, dunne gradiëntrand, donker kader.**
Wat het doet: één helder object (de kaart) op een licht dat ademt, met een
rand die het licht van de grond lijkt op te vangen. Het donkere kader zorgt dat
het pastel niet "web-wit" wordt maar als een lichtbron in een donkere ruimte leest.
Overnemen, in doen.-kleuren:
- Kaartradius groot: 28-32 px op 1440 (huidig RADIUS 28, goed). Bij de
  telefoon en losse chips 20-24 px.
- Grond: niet lavendel maar de eigen aurora, alleen lichter en zachter dan
  nu: Flame op alpha 0x22 (nu 0x30), petrol-licht groter (r 900), zand op 0x40,
  plus één koele vierde vlek: petrol op 0x18 in de hoek tegenover Flame.
  Saturate 1,3 op de blur-laag. Cyclus 12-16 s zoals nu.
- Rand: 1 px scherp (nu 2 px, iets dikker dan de referentie) plus gloed 12 px
  op 0,35. Gradiënt Flame naar zand naar petrol-licht naar Flame, draaiend
  360 graden in 8 s (deterministisch uit t).
- Kader: het donkere kader vertalen naar een diep-petrol (#081619) buitenrand
  van de wereld op de tekstbeats en het slot, niet op de UI-beats. Dus: de
  wereld is crème als je werkt, diep petrol als de film praat.

**Beeld 2: donker UI-scherm in perspectief met gloeiende oranje naar roze naar
paars randstrook.**
Wat het doet: het scherm kantelt 8-12 graden om de Y-as; de gloed zit op één
zijde (de kant naar de camera) en loopt uit naar de hoeken. De gradiënt is
warm naar koel, precies het bereik dat doen. al heeft: Flame naar petrol.
Overnemen:
- Kantel 8-10 graden rotateY op niet-actieve schermen (nu `kantel` aanwezig),
  actief scherm recht.
- Gloed asymmetrisch: linker- of rechterzijde 2x zo sterk als de rest, via een
  linear-gradient mask over de glowlaag (van 1 naar 0,35 over de breedte).
- Kleurverloop Flame #D24620 naar #E8875A (Flame-licht) naar petrol #1A535C.
  Geen roze of paars: die zijn niet van doen. en trekken de film naar template.
- Donkere variant alleen in de constellatie en op de eindkaart, waar de grond
  al diep petrol is. Daar mag de gloed op 0,6, op crème blijft hij op 0,35.

## 3. Ingrepen, gerangschikt op impact per moeite

Formaat: naam. Wat precies. Waar. Waarom. (I = impact, M = moeite, 1-5.)

1. **Donkere ademruimte rond de UI-beats.** I5 M2. Wereld-grond wisselt van
   crème naar #081619 op drie momenten: opening tot dashboardOp, pullback tot
   eind, en 600 ms rondom elke belofte-tekst (Belofte.tsx) met een crossfade
   van 500 ms, ease enter. Op de donkere grond gaat rim-opacity naar 0,6 en
   aurora-alpha 1,4x. Waar: opening, alle beloftes, constellatie, eindkaart.
   Waarom: beide referenties werken alleen omdat licht op donker zit.

2. **Draaiende gradiëntrand op het actieve scherm.** I4 M2. RAND wordt een
   conic-gradient met hoek = (t / 8000) * 360 graden, stops Flame 0, zand 0,3,
   petrol-licht 0,6, Flame 1. 1 px scherp via de bestaande mask-truc, gloed
   erachter blur 14 px op 0,35 (crème) of 0,6 (donker). Niet-actief scherm:
   statisch, 0,2. Waar: elke Scherm met gloed > 0. Waarom: nu is de rand een
   sticker; draaiend is hij een lichtbron.

3. **Speculaire veeg bij landing.** I4 M2. Bij elke camera-landing op een
   scherm (cockpitLand, editorOp, portaalOp, planningCamOp+, telefoonCamOp+,
   financieelOp) loopt een 1 px hairline-glint van linksboven naar rechtsonder
   over de rand: linear-gradient wit 0 naar 0,7 naar 0, 220 px breed, 600 ms,
   ease camera, 120 ms na de landing. Waarom: Liquid Glass-taal; het scherm
   "vangt licht" precies wanneer hij de held wordt.

4. **Echte scherptediepte in plaats van lineaire blur.** I4 M2. Nu
   blur = diepte * 2,6. Maak het een curve: blur = 0 tot diepte 0,25, dan
   kwadratisch tot 9 px bij diepte 1,5; brightness tot 0,9; extra: scale
   1 / (1 + diepte * 0,22) blijft. Tijdens een vlucht schuift de scherpte mee
   met de camera: het doelscherm wordt scherp op 60 procent van de vlucht, het
   vertrekscherm wazig vanaf 20 procent (rack focus). Waar: alle vluchten.
   Waarom: één scherp ding per frame is het verschil tussen mockup en camera.

5. **Push-in bij de klik, pull-out bij het gevolg.** I4 M2. Elke belangrijke
   klik (klikProject, klikVerstuur, klikBevestig, klikVerzenden,
   klikFactuurVerstuur) krijgt zoom 1,00 naar 1,05 over 320 ms (ease camera),
   eindpunt op de knop; het gevolg (flap, toast, fase) opent tijdens de
   terugbeweging 1,05 naar 1,00 over 700 ms. Waarom: Apple-keynote-ritme,
   oorzaak en gevolg in de camera zelf.

6. **Cascade op de cockpit-openvouw.** I4 M1. Cockpit-panelen: paneel 300 ms,
   koptekst 200 ms na 50 ms, inhoud 200 ms na 100 ms, knoppen 150 ms na 150 ms,
   panelen onderling gestaggerd 45 ms, alles ease uiUit, start scale 0,96.
   Waar: cockpitOp, rondleidingOp. Waarom: Geist-cascade; hiërarchie zonder pijlen.

7. **Woorden komen uit licht.** I3 M2. Belofte-reveal: per woord opacity 0
   naar 1, translateY 14 naar 0, blur 6 naar 0, 12 f per woord, overlap 60
   procent, plus een 2 f wit-naar-tekstkleur flits op het benadrukte woord
   (zoals Linear/Framer "text illuminate"). Kop letterspacing -0,035em blijft.
   Waar: alle Belofte-beats. Waarom: kinetische type met één lichtaccent leest
   als 2026; blur-reveal zonder accent als 2022.

8. **Flame op dieet: 10 procent.** I4 M1. Tel per frame de Flame-pixels.
   Flame alleen op: cursor, Flame-punt, actieve fase, primaire knop die zo
   geklikt wordt, betaald-melding. Alle andere Flame (badges, rails, chips die
   niet de held zijn) naar petrol of ink in de filmversie van de componenten.
   Waar: hele film. Waarom: 60/30/10; Raycast-les: één accent dat gloeit.

9. **Speed-ramp in de vluchten.** I3 M2. Camera-curve blijft, maar de
   dieptevervaging en de aurora krijgen een snelheidsterm: |d cam / dt|
   genormaliseerd 0-1 stuurt blur 0 naar 4 px op de niet-doelschermen en
   aurora-drift 1x naar 2,5x tijdens de vlucht, terug naar 1x binnen 400 ms
   na landing. Waar: alle 12 ZWIEPEN. Waarom: de wereld reageert op de
   camera; dat is wat "systeem" voelt.

10. **Gradiënt-lichtlek op de drie grote cuts, in eigen kleur.** I3 M1.
    Geen @remotion/light-leaks (nieuw pakket). Zelf: radial-gradient Flame
    0x66 naar transparant, 1400 px, mix-blend-mode screen, blur 40 px, glijdt
    van rechtsboven naar linksonder in 700 ms, opacity 0 naar 0,55 naar 0,
    ease inUit. Alleen op: inslagOp (opening), pullbackOp, eindkaartOp.
    Waarom: max 3 full-frame impacten per film (MOTION.md); dit zijn ze.

11. **Bento-onthulling in de constellatie.** I4 M3. De 8 modules komen niet
    als chips maar als kaarten (zelfde radius, 1 px rand, 0,2 gloed) in een
    asymmetrisch raster rond het logo: 2 grote, 4 middel, 2 klein. Stagger
    70 ms per kaart, elk vanuit zijn eigen richting (translate 24 px naar de
    kern), ease enter, totaal onder 15 f startspreiding. Daarna 15 f stil.
    Waar: constellatieOp tot logoOp. Waarom: bento is de 2025-2026 vorm van
    "alles in één"; chips zijn de 2021-vorm.

12. **Telefoon als glas.** I3 M2. TelefoonFrame: 1 px rand wit op 0,4, 20 px
    backdrop-blur op de statusbalk, speculaire glint over de bovenrand bij
    telefoonCamOp (zie 3). Foto-landing (fotoOp) scale 0,94 naar 1 met blur
    4 naar 0 in 400 ms. Waar: telefoonbeat. Waarom: de telefoon is het enige
    fysieke object in de film; hij mag het meest "materiaal" zijn.

13. **Micro-feedback op elke klik.** I3 M1. Knop: scale 0,97 gedurende 4 f
    (100-160 ms), dan terug in 5 f ease uiUit; ripple blijft. Toggle en chips
    150 ms. Waar: alle klik-beats. Waarom: Kowalski 100-160 ms drukfeedback;
    het is het kleinste ding dat het grootste verschil maakt in "echt".

14. **Cursor krijgt gewicht.** I2 M1. Arc-pad blijft; voeg 2 px motion-trail
    toe (drie schimmen op t-1, t-2, t-3 f, opacity 0,35/0,2/0,1) alleen als
    snelheid > 600 px/s. Waar: alle cursorreizen. Waarom: het ene speelse
    element mag voelen alsof het door lucht gaat.

15. **Hartslag zichtbaar als licht.** I3 M2. Bij elke fase-sprong: de
    gradiëntrand van het cockpit-scherm pulseert 1 keer (opacity 0,35 naar
    0,8 naar 0,35, 900 ms, ease inUit) precies in de hold van 900 ms. Waar:
    inReviewOp, akkoordKlantOp, ingeplandOp, betaaldOp. Waarom: de fasebalk is
    de hartslag; het licht maakt hem hoorbaar zonder geluid.

16. **Eindkaart: donker, stil, één gloed.** I4 M2. Grond #081619, aurora op
    0,5 en 20 s cyclus, logo op crème, Flame-punt met gloed 24 px op 0,5 die
    ademt 2,6 s, geen rand, geen chips, één regel "slim gedaan." plus url.
    Hold minimaal 4 s op de laatste tekst. Waar: eindkaartOp tot eind.
    Waarom: end cards die werken zijn één actie, hoog contrast, lang genoeg.

17. **Parallax-ratio vaststellen op 0,2 / 0,6 / 1,2.** I2 M1. Aurora nu 0,05,
    Gevel 0,8, schermen 1,0. Zet aurora op 0,2, gevel op 0,6, schermen 1,0,
    voorgrond-chips en toasts 1,2. Waar: hele wereld. Waarom: 0,05 is
    onzichtbaar, 0,8 zit te dicht op de schermen; de drie lagen scheiden zich nu niet.

18. **Grain en vignet met mate.** I2 M1. Eén statische ruis-PNG (tileable
    256 px) op mix-blend overlay, opacity 0,06, background-position schuift
    1 px per frame (deterministisch). Vignet blijft petrol 0x14, op donkere
    grond 0x40. Nooit over UI-tekst: isolation: isolate op de wereldlaag.
    Waar: hele film. Waarom: neemt de "te schone" render-look weg zonder
    dat het retro wordt.

19. **Geluid 2 f vooruit, en 3 stiltes.** I3 M1. Alle Klank-ms minus 66 ms
    (2 f); zwiep-lengte gelijk aan vluchtduur; drie stiltes van minimaal 1 s
    zonder sfx en met muziek op 0,15: na inslagOp, na akkoordKlantOp, na
    betaaldOp. Waar: Geluid.tsx. Waarom: sync-drempel 20 ms; stilte maakt de hits groter.

20. **Opening in 3 seconden bij het product.** I4 M3. Nu: tools zweven tot
    3200, inslag 5400, dashboard 10600. Voorstel: eerste frame is al het
    dashboard, wazig (blur 9, diepte 1,5, donkere grond); de tools zweven
    ervoor als voorgrond; de inslag op 2800 trekt scherpte naar het dashboard.
    Belofte-tekst schuift naar de cockpit-beat. Waar: opening. Waarom: elke
    bron zegt hetzelfde: product in de eerste 3 s, logo later.

## 4. Wat je juist niet doet

- Geen roze of paars in de gradiëntrand. Dat is de template-look van 2024;
  doen. is Flame naar petrol.
- Geen aurora achter leesbare UI-tekst. Alleen achter kaarten en beloftes.
- Geen glas op alles. Eén glazen object per beat (telefoon, toast, of chip).
- Geen deeltjes, geen sterren, geen "AI-sparkles", geen lens flares met
  hexagonen. Lichtlek max 3 keer, in merkkleur.
- Geen ease-in op UI, geen scale vanaf 0, geen bounce op kaarten (damping 200
  blijft). Bounce alleen op de cursor, max 8 procent.
- Geen shake, geen dutch angle, geen zoom plus pan plus rotate in één vlucht.
- Geen rim-gloed boven 0,6, geen blur boven 24 px op UI-lagen (Safari en
  render-tijd), aurora-blur is de uitzondering.
- Geen vijfde kleur in de aurora. Vier vlekken, anders wordt het bruin.
- Geen tekst onder 40 px effectief in 4:3. Geen belofte langer dan 7 woorden.
- Geen logo-intro. Geen 10 s "welkom bij doen.".
- Geen CSS-transitions of @keyframes in Remotion: alles uit t. @property
  conic-angle wordt dus een berekende hoek uit t, geen CSS-animatie.
- Geen nieuwe pakketten. Lichtlek, ruis en glint zelf bouwen met
  radial-gradient, mix-blend-mode en een PNG. @remotion/transitions is er al
  maar de film heeft één camera, dus alleen TransitionSeries.Overlay is
  relevant, en die hebben we niet nodig zolang Wereld zelf de overlay tekent.
- Geen Flame op meer dan 10 procent van het frame, behalve de inslag en de
  eindkaart-punt.

## 5. Bronnen

- Linear, A calmer interface for a product in motion (2025): https://linear.app/now/behind-the-latest-design-refresh
- LogRocket, Linear design: the SaaS design trend: https://blog.logrocket.com/ux-design/linear-design/
- Raycast design-system-analyse: https://getdesign.md/raycast/design-md en https://www.dark.design/website/raycast
- Vercel, Designing and building the Vercel Ship conference platform: https://vercel.com/blog/designing-and-building-the-vercel-ship-conference-platform
- Vercel Geist motion-principes (skill-samenvatting): https://lobehub.com/skills/joe-simo-skills-vercel-geist-design-system
- Figma, How we shaped the visual identity for Config 2025: https://www.figma.com/blog/how-we-shaped-the-visual-identity-for-config-2025/
- Emil Kowalski, animate SKILL.md: https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md
- Emil Kowalski, review-animations STANDARDS.md: https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md
- Superdesign, Aurora UI recipe and when it breaks: https://superdesign.dev/styles/aurora
- 21st.dev, CSS gradients for React: mesh, aurora, OKLCH: https://21st.dev/blog/css-gradient-components-react
- codetv.dev, Animated CSS gradient borders: https://codetv.dev/blog/animated-css-gradient-border
- ibelick, Animated gradient border: https://ibelick.com/blog/create-animated-gradient-borders-with-css
- Cruip, Animated gradient borders with Tailwind: https://cruip.com/animated-gradient-borders-with-tailwind-css/
- LogRocket, Liquid Glass effects with CSS and SVG: https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/
- Liquid Glass guide (specular max 6 px, spring response 0,3-0,5): https://github.com/giorgio-a11y/liquid-glass-guide/blob/main/LIQUID-GLASS-GUIDE.md
- Apple, Meet Liquid Glass (WWDC25): https://developer.apple.com/videos/play/wwdc2025/219/
- DEmotion, Apple style UI motion graphics: https://trydemotion.com/blog/apple-style-ui-motion-graphics
- Studio Dumbar, Utah Jazz 50 (rhythmic momentum, sudden dimensionality): https://studiodumbar.com/work/utah-jazz-50
- The Brand Identity, motion in branding with Studio Dumbar/DEPT: https://the-brandidentity.com/insight/how-to-meaningfully-incorporate-motion-into-branding-with-studio-dumbar-dia-and-connor-campbell
- Codrops, Lusion: digital craft meets experimentation: https://tympanus.net/codrops/2026/04/13/lusion-where-digital-craft-meets-ambitious-experimentation/
- Vidico, Best product launch videos: https://vidico.com/news/best-product-launch-videos/
- Demopolish, SaaS demo video best practices (geen logo-intro): https://demopolish.com/blog/saas-demo-video-best-practices/
- Vibrantsnap, Product Hunt launch video (3,7 s aandacht): https://www.vibrantsnap.com/blog/product-hunt-launch-video-guide
- Moonb, Ideal explainer video length (Wistia 2025): https://www.moonb.io/blog/how-long-should-an-explainer-video-be
- Content Beta, End your SaaS video with a strong CTA: https://www.contentbeta.com/blog/end-saas-video-with-cta/
- SFX Engine, How to sync sound effects with video: https://sfxengine.com/blog/how-to-sync-sound-effects-with-video
- Sonilo, Whoosh sound effect: motion, timing, mix: https://sonilo.com/ai-music/whoosh-sound-effect-guide
- No Film School, 60-30-10 color rule: https://nofilmschool.com/60-30-10-color-rule
- Theme & Color, 60-30-10 for web and brand: https://themeandcolor.com/blog/60-30-10-color-rule
- Animation Patterns, film overlay compositing (grain, vignet, blend): https://animationpatterns.art/animations/film-overlay-compositing/
- ui-incubator, bento scroll reveal (stagger 70 ms): https://www.ui-incubator.com/en/catalog/bento/bento-scroll-reveal
- Remotion, TransitionSeries en Overlay: https://www.remotion.dev/docs/transitions/transitionseries
- Remotion, LightLeak (ter referentie, niet installeren): https://www.remotion.dev/docs/light-leaks/light-leak
- Remotion, noise2D (ter referentie, niet installeren): https://www.remotion.dev/docs/noise/noise-2d
