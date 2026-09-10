# doen. film

Motion graphic van 75 seconden, 9:16 (1080x1920), voor de Sibon-app. Eén klus
van mail tot betaald, in twee camera's: jij en je klant. Eigen Remotion-root,
volledig los van de app in `../src`. De app wordt er niet door geraakt.

## Draaien

```
cd film
npm install
npm run dev          # Remotion Studio, scrubben per scene of de hele film
npm run render       # out/doen-film.mp4, H.264, crf 18
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
