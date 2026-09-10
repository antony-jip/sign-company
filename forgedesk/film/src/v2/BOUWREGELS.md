# Bouwregels voor schermen in film/src/v2

- Een scherm is `({ t, stand }) => JSX`. `t` = ms sinds filmstart, `stand` = wat er op dat moment
  waar is (statussen, ms-momenten waarop iets verschijnt). Alles deterministisch uit `t`.
  Geen CSS-transitions of -animaties, geen `animate-*`-klassen, geen setState-timers.
- Desktopschermen zitten in `<AppVenster actief="Planning" moduleTitel="Planning" tabs={[...]}>`
  uit `../DesktopChrome` (1440 x 1080 css-px). De inhoud is `position: absolute; inset: 0`.
- Telefoonschermen zijn 390 x 844 css-px, zonder AppVenster.
- Klassen komen uit de app (`../../src/index.css` is geladen): `doen-slate-surface`, `doen-panel`,
  `doen-subtitel`, `badge-flame`, `btn-primary-flame`, `text-flame`, `bg-petrol`, `font-heading`,
  `font-mono`, `text-muted-foreground`, `border-border`, `bg-card`, `rounded-2xl`. Iconen: lucide-react.
- Echte app-componenten uit `@/components/...` mogen, als ze niet aan Supabase, auth of router
  hangen (stubs bestaan voor `react-router-dom`, `@/contexts/AuthContext`, `@/services/*`).
  Voorbeelden die werken: `ProjectFaseBar`, `KlantCard`, `TeamCard`, `TakenOfferteGrid`,
  `WerkbonMonteurFeedback`, alle `portaal/*`-kaarten, `HandtekeningVeld`.
- Elke knop waar de cursor op klikt krijgt `data-doel="korte-naam"`. Anders vindt de cursor hem
  niet. Tekst-doelen kunnen ook: de cursor zoekt `tekst:Inklokken` op exacte knoptekst.
- Mockdata uit `../../mockData` (klant, contact, project, offerte, offerteItems, montage,
  medewerkers, factuur, werkbonNummer, fotoNa). Tijdhelpers uit `../../tijd`: `vlak(t, van, tot)`
  0..1 met ease, `veer(t, vanMs)` spring, `lerp`, `ease`. Tekst-typen: `typ`, `tel`, `euro` uit
  `../../kern/Typ`. Statuswoord-flip: `SplitFlap` uit `../../kern/SplitFlap`.
- Kleuren uit `../../brand` (`merk.flame`, `merk.petrol`) of app-klassen. Geen losse hex, behalve
  waar de app zelf een hex gebruikt (statuskleuren als #3A7D52, #C0451A, #2D6B48, #6A5A8A).
- Geen nieuwe npm-pakketten. Geen wijzigingen buiten `film/src/v2/`.
- Controle: `cd film && npx tsc --noEmit 2>&1 | grep src/v2/` moet leeg zijn voor jouw bestanden,
  dan `./stills.sh Proef<Naam> 60 150` en bekijk `out/Proef<Naam>-60.png`. Vergelijk met de
  referentie-screenshot en pas aan tot het er als de app uitziet. De film is 1080 x 1920: zet je
  scherm in de proef geschaald op 1040 breed, gecentreerd, zoals `src/v2/Proef.tsx` doet.
- Geen em-dashes, geen emoji. Nederlandse namen. Commentaar alleen waar iets niet voor de hand ligt.
