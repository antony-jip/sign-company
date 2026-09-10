# doen. film

Motion graphic van 75 seconden, 9:16 (1080x1920), voor de Sibon-app. Eén klus
van mail tot betaald, in twee camera's: jij en je klant. Eigen Remotion-root,
volledig los van de app in `../src`. De app wordt er niet door geraakt.

## Versie 2: de cockpit als podium

`DoenFilm2` is de huidige film. Eén klus, één projectcockpit, één camera door een
2.5D-ruimte met desktopschermen (1440 x 1080 css-px op 0,62), 75 seconden.
Alles in `src/v2/`:

- `beats.ts`: elke beat in absolute ms (`B` eerste helft, `B2` tweede helft). Een
  klik landt op klikX + 80; gevolgen komen daarna.
- `FilmV2.tsx`: plekken van de schermen (`PLEK`), camera-stops (`STOPS`), cursorpad
  (`CURSOR`), beloften, meldingen, geluid, magneet en landing.
- `Wereld.tsx`: camera {x, y, zoom} met logaritmische zoom, `Scherm` met diepte
  (blur, kleiner, lichter), kantel en gloed.
- `Cursor.tsx`: de Flame-pijl. Doelen zijn `data-doel="..."` in de schermen of
  `tekst:Knoptekst`; de cursor meet ze in de DOM, dus ze kloppen ook tijdens een pan.
- `Belofte.tsx`: één regel per beat, kernwoord met stippellijn-selectie dat Flame kleurt.
- `Cockpit.tsx`: de projectcockpit uit de echte kaarten (ProjectFaseBar, BriefingCard,
  TakenOfferteGrid, KlantCard, TeamCard, ActiesCard) plus nagebouwd Tijd en Portaal.
- `schermen/`: MailApp, OfferteEditor, PortaalKlant (echte portaalcomponenten),
  Planning, Kanban, WerkbonTelefoon, FinancieelTab, MailComposer.
- `proef/`: losse composities per scherm (`ProefPlanning` enz.) om ze apart te bekijken.
- `Geluid.tsx`: muziek en effecten uit `public/audio/`, gegenereerd met
  `assets/audio.mjs` (MiniMax Music 2.6 en ElevenLabs Sound Effects v2 op FAL).
- `BOUWREGELS.md`: de afspraken voor nieuwe schermen.

Hero-shots via Seedance 2.5 staan in `assets/manifest.json` als type `hero`
(`hero-opening`, `hero-brug`, `hero-landing`); de opening gebruikt `hero-opening.mp4`.
Versie 1 (telefoon, zes scenes) staat nog als `DoenFilm` in `src/scenes/`.

## Draaien

```
cd film
npm install
npm run dev          # Remotion Studio, scrubben per scene of de hele film
npm run render       # out/doen-film.mp4 (v1); v2: npx remotion render DoenFilm2 out/doen-film-v2.mp4 --codec=h264 --crf=18
npm run still -- --frame=200   # één frame naar out/still.png
./stills.sh S3Akkoord 71 200   # controleframes per scene
npm run typecheck
```

## Hoe het in elkaar zit

- `src/Film.tsx` is de montage: acht `Sequence`s op ms-basis, plus het POV-label
  bovenin, de fasebalk onderin en de donkere banden waar tekst op staat.
- Elke scene in `src/scenes/` is `({ play, durationMs }) => JSX`. `play=false`
  bevriest de scene op haar eerste frame. Tijd komt uit `useSceneTijd` in
  `src/tijd.ts`: ms sinds scenestart, afgeleid van het frame, dus deterministisch.
  Alle beats staan als `S1.tikOp`-achtige constanten bovenin elke scene.
- `src/schillen/` zijn de telefoonschermen. Waar het kon staan daar de echte
  app-componenten in: het hele klantportaal, het tekenveld, de fasebalk, de
  fotosectie van de werkbon, TakenOfferteGrid. Wat te zwaar aan Supabase, auth of
  router hangt (mailreader, offerte-editor, planning, factuur) is nagebouwd met
  dezelfde Tailwind-klassen uit `../src/index.css`.
- `src/kern/` is het filmgereedschap: TelefoonFrame (390x844 op zoom, met een
  camera-focus die kan pannen), Caption, PovLabel, SplitFlap, TikRing/Tik,
  Toast, Sfeer, Wordmark, FaseBalkFilm.
- `src/mockData.ts` is de klus, in de echte types uit `../src/types`.
- `src/stubs/` schuift via webpack-aliassen onder de app-imports die netwerk of
  context nodig hebben (`remotion.config.ts`).

## Kleuren en fonts

Kleuren komen uit `../tailwind.config.js`. `remotion.config.ts` schrijft bij elke
bundel `theme.extend.colors` naar `src/kleuren.gen.json`; `src/brand.ts` leest
dat. Flame `#D24620`, Petrol `#1A535C`. Fonts via `@remotion/google-fonts`:
Instrument Sans (koppen), Inter (body), DM Mono (cijfers).

`tailwind.config.mjs` zet alle breakpoints buiten bereik, zodat app-componenten
altijd hun mobiele variant kiezen, ook al is de viewport 1080 breed.

## Sfeerbeelden (FAL)

`assets/manifest.json` heeft per beeld het model, de prompt en de seed.
`assets/genereer.mjs` genereert wat ontbreekt naar `public/sfeer/`:

```
npm run sfeer                    # alles wat nog niet bestaat
npm run sfeer -- gevel-avond     # één beeld opnieuw (overschrijft)
```

Leest `FAL_AI_API_KEY` uit `../.env.local`. De sleutel die daar op 10 sep 2026
stond was ongeldig; de sleutel in de Vercel-omgeving werkt.
Stills: `fal-ai/flux-pro/v1.1-ultra`. Clips: Kling 2.1 image-to-video op de still.
