# DOEN-VIDEO-FRAMEWORK

PROJECT: product-demo video van doen. in Remotion (~/doen-video).
FORGEDESK BRON: ~/sign-company/forgedesk (Vite/React app, Tailwind 3.4).

## FORMAAT
Hoofd 1920x1080 16:9 30fps (web hero + YouTube). Variant 1080x1920 9:16 voor social.
Duur 75-90s. Hero-loop = scenes 1,3,6,7 (ca 30s, loopt naadloos).

## REGELS
NL in code/UI/comments, EN in commit messages. Geen em-dashes, geen emojis. Geen extra
npm packages zonder toestemming. Build na elke wijziging. Een scene per commit, max 3
files. Werkwijze = analyse, STOP, akkoord, bouwen. Nooit door een gate zonder akkoord
van Antony.

## MERK-TOKENS (merk-laag = doen. identiteit)
- Flame #F15025 (accent, spaarzaam)
- Petrol #1A535C (dominant)
- off-white #F8F7F5
- ink #1A1A18

Module-kleuren:
- projecten petrol
- offertes flame
- facturen #2D6B48
- klanten #3A6B8C
- planning #9A5A48
- werkbonnen #C44830
- team #5A5A55
- email #6A5A8A

## APP-CONTENT (FORGEdesk warm-pastel, voor mockups)
- pageBg #F4F3F0
- card #FFFFFE
- accent #CC8A3F
- status sage / mist / coral

Lees de echte waarden uit forgedesk src/index.css en tailwind.config.js en port ze
naar v4-stijl in index.css.

## FONTS
- Bricolage Grotesque 800 (koppen)
- Inter (body) -- zoals forgedesk zelf; niet DM Sans
- DM Mono (cijfers/bedragen)

Via @remotion/google-fonts.

## FLAME DOT
`<span style={{color:'#F15025'}}>.</span>` direct achter statuswoord.

## STORYLINE (7 scenes)
1. Cold open (doen. wordmark + dot, "alles voor je signbedrijf. op een plek.").
2. Het probleem (versnipperde tools vallen weg, doen. blijft over).
3. Daan + offerte = HELD-SCENE (chat: "Maak offerte voor Jansen, 3 lichtbakken").
   Daan maakt het PROJECT aan en opent de offerte-editor; de offerte vul je zelf.
   Daan kan (nog) geen offertes aanmaken -- niet als capability tonen.
4. De hele workflow (snelle module-montage in eigen kleuren).
5. De monteur (iPhone, werkbon op de bouwplaats).
6. De prijs (EUR 208 doorgestreept, EUR 79 groeit, "geen verborgen kosten").
7. CTA (doen., app.doen.team, "30 dagen gratis. geen contract. begin vandaag.").

## PORT-STRATEGIE (sectie 5b)
Held-scenes niet natekenen. Lees het echte forgedesk-component, neem JSX + classNames
exact over, strip data/context/hooks (Supabase, AuthContext, react-router), hardcode
realistische voorbeelddata, en laat beweging van Remotion komen
(useCurrentFrame/interpolate), niet van de component. Snelle niet-bewegende schermen
(scene 4) mogen een hoge-res screenshot zijn.

## FASEN
0. Setup (brand.ts, fonts.ts, FlameDot.tsx, geporte tokens in index.css,
   DoenDemo-compositie in Root.tsx 1920x1080 30fps met placeholder).
1. Foundation (DeviceFrame browser+iPhone, scene-wrapper, entrance-helpers).
2. Scenes (een per commit, port held-scenes).
3. Assembly + render (Series, audio, hero-loop + 9:16, render naar out/).
