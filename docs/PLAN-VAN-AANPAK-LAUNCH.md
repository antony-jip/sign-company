# Plan van aanpak — doen. marketing-site live & EU-klaar

_Opgesteld 17 juli 2026. Analyse + uitgevoerde verbeteringen + resterende stappen.
Betreft de Next.js marketing-site in `src/` (niet `forgedesk/`)._

---

## 1. Korte conclusie

De site is **inhoudelijk en visueel bijna live-klaar**. Sterke basis: strak
petrol/flame-designsysteem, echte diepgang (10 modules, 4 vertical-landingspagina's,
20 kennisbankartikelen, 32 FAQ's), unieke SEO-titels/-descriptions per pagina, werkende
CTA's naar `app.doen.team/register` en een complete, on-brand 404.

Wat de site **tegenhield voor livegang** waren vooral randvoorwaarden, geen content:
juridische pagina's (AVG), meetbaarheid (geen analytics), e-mail-deliverability en een
architectuur die vastzat op één domein. De belangrijkste technische en juridische gaten
zijn in deze sessie gedicht; wat overblijft is werk dat jouw input of een externe
partij vereist (bedrijfsgegevens, DNS, vertalingen, keuze analytics).

**Winnen we op SEO / worden we marktleider?** De fundering is goed genoeg om vindbaar te
worden op de kern-zoektermen ("software voor signmakers", per branche en per module). Om
échte organische marktleider te worden mist vooral **breedte van zoek-gerichte content**
en **interne linkstructuur** — geen quick fix, wel een duidelijk pad (zie §5).

---

## 2. Wat is er in deze sessie uitgevoerd

### Multi-domein-fundering (Stap 1 van EU-uitrol)
- **`src/lib/site.ts`** — één bron voor `SITE_URL`, `APP_URL`, `CONTACT_EMAIL`, locale,
  valuta en de `LOCALES`-map voor hreflang. Alles env-gestuurd met de NL-productie als
  default, zodat hetzelfde codebase op een ander domein draait door alleen env te zetten.
- Alle hardgecodeerde `doen.team` / `app.doen.team` / `hello@doen.team` in de infra- en
  UI-bestanden vervangen door deze config (layout, structured-data, sitemap, robots,
  contact-route, Navbar, Hero, CTASection, PricingSection, PrijzenContent, VerticalContent,
  OverContent, Footer, ContactContent). _(De euro-bedragen in de app-mock `AppShowcase.tsx`
  zijn bewust gelaten — dat is illustratieve UI, geen echte content.)_
- `<html lang>` en `og:locale` komen nu uit de config i.p.v. hardgecodeerd `nl`.

### SEO-hardening
- **`src/lib/seo.ts`** — helpers `alternatesFor()` (canonical + hreflang + x-default) en
  `pageMetadata()` (unieke title/description + canonical + eigen OG/Twitter-kaart). Toegepast
  op alle statische én dynamische pagina's, zodat elke gedeelde link nu een **eigen
  OG-titel/omschrijving** heeft i.p.v. de globale doen.-kaart.
- **hreflang-scaffold**: staat klaar. Zodra je een taal/land toevoegt aan `LOCALES`
  genereren alle pagina's automatisch wederkerige hreflang-links — dan concurreren de
  landendomeinen elkaar niet weg in Google.
- **Structured data uitgebreid** (`src/lib/structured-data.ts`):
  - `Organization` verrijkt (foundingDate 1983, description, contactPoint).
  - Nieuw: `WebSite`-schema op de homepage.
  - Nieuw: `BreadcrumbList` op alle diepe routes (kennisbank, vertical, module).
  - Nieuw: `Article`-schema op elk kennisbankartikel (met `dateModified` voor
    versheidssignaal).
- **Sitemap** (`src/app/sitemap.ts`): `priority` + `changeFrequency` per route,
  `lastModified` op artikelen; legal-pagina's toegevoegd.
- **robots** (`src/app/robots.ts`): `host`-directive + sitemap via config.
- **Soft-404 gedicht**: `/features/[onbekende-slug]` gaf een 200 met de overzichtspagina;
  nu `dynamicParams = false` → echte 404, geen dun geïndexeerde duplicaten meer.

### Juridisch / AVG (was launch-blocker)
- Drie nieuwe, on-brand pagina's: **`/privacy`**, **`/cookies`**, **`/voorwaarden`**
  (gedeelde `LegalLayout` + `.legal-prose`-styling). Volwaardige NL-teksten met duidelijk
  gemarkeerde `[...]`-placeholders voor de bedrijfs-/entiteitsgegevens.
- Footer uitgebreid met een **juridische linkrij** en een **bedrijfsidentiteitsregel**
  (`een product van [bedrijfsnaam] · KvK [KvK-nummer]`) als zichtbare invulherinnering.

### Contactformulier & UX
- **Honeypot-spambescherming** toegevoegd (verborgen `website`-veld; server doet alsof het
  lukt zonder te mailen als een bot 'm vult).
- Afzender/ontvanger van de contactmail nu **env-gestuurd** (`CONTACT_MAIL_FROM`,
  `CONTACT_INBOX`) — klaar om de resend.dev-testafzender te vervangen door een geverifieerd
  domein.
- Succesmelding krijgt `role="status"` + `aria-live` (screenreader-toegankelijkheid).

> ⚠️ **Build niet lokaal geverifieerd in deze omgeving**: `npm install` wordt geblokkeerd
> door het egress-beleid (403 op een transitieve package). Draai daarom vóór merge lokaal
> `npm run build` als laatste controle. De wijzigingen zijn type-veilig opgezet en
> geïsoleerd, maar een echte build is de eindcheck.

---

## 3. Wat mist er nog vóór livegang (jouw input nodig)

| # | Item | Waarom blocker | Actie |
|---|------|----------------|-------|
| 1 | **Bedrijfsgegevens invullen** | Wettelijk verplicht (KvK-identificatie, AVG) | Vul `[bedrijfsnaam]`, `[KvK-nummer]`, `[BTW-nummer]`, `[adres]`, termijnen in de legal-pagina's + Footer. |
| 2 | **Legal juridisch laten checken** | Templates, geen definitief advies | Laat privacy/cookies/voorwaarden nalezen door een jurist. |
| 3 | **E-mail-afzender verifiëren** | resend.dev-testafzender = spamrisico | Verifieer `signcompany.nl`/`doen.team` in Resend, zet `CONTACT_MAIL_FROM` + `RESEND_API_KEY` in productie-env. |
| 4 | **Analytics kiezen & plaatsen** | Zonder meten weet je niet of je organisch wint | Kies privacyvriendelijk (Plausible/GA4/Vercel). Bij tracking-cookies: cookie-consent-banner toevoegen + `/cookies` bijwerken. |
| 5 | **Productie-env variabelen** | Nieuwe config verwacht ze | Zet minimaal `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY` (defaults = huidige NL-situatie, dus veilig als je niks zet). |

### Aanbevolen, niet-blokkerend
- **Social proof**: nog geen testimonials, klantlogo's of cases — de grootste
  vertrouwens-winst voor B2B-conversie na de juridische pagina's.
- **Dynamische OG-afbeeldingen per pagina** (artikel/vertical/module): titels staan nu al
  uniek in de OG-metadata; per-pagina *beeld* is de volgende stap (bewust uitgesteld omdat
  `next/og` niet zonder build te verifiëren is).
- **Dode wachtlijst-code** (`supabase_wachtlijst.sql` + ongebruikte supabase-dep) opruimen.
- **Social-media-links** in de footer zodra kanalen live zijn (+ `sameAs` in Organization).

---

## 4. Draaien op andere EU-domeinen (doen.de / .fr / .be / .es)

**Aanbevolen architectuur: één codebase, path-based locale-routing met `next-intl`,
uitgeserveerd per ccTLD.** ccTLD's geven het sterkste lokale-SEO- en vertrouwenssignaal;
één deployment houdt onderhoud laag. Niet forken per land.

Gefaseerd:
1. **✅ Config de-hardcoden** — gedaan. Domein/e-mail/locale/valuta zitten in `site.ts`.
2. **`next-intl` + `app/[locale]`** introduceren, eerst met alleen `nl`. hreflang-scaffold
   staat al klaar in `LOCALES`.
3. **Teksten externaliseren** naar message-catalogi (`messages/nl.json`, `de.json`, …). Dit
   is de grootste klus: ± 7.900 regels inline-NL in de componenten (met name
   `AppShowcase.tsx` en `FeaturesContent.tsx`). Prioriteer Hero/Nav/Footer/Pricing/Features
   boven de mock-UI.
4. **Per land afmaken**: professionele vertaling + per-land prijs/btw-label (`ex. btw` →
   `zzgl. MwSt.`/`HT`/`más IVA`) + jurisdictie-eigen legal + ccTLD-mapping. Doe één markt
   end-to-end als template, repliceer daarna.

Aandachtspunten: kennisbankartikelen zijn **JSX-content**, geen strings — die moeten per
taal (her)geschreven worden, niet machinaal ge-keyed. Overweeg per-locale artikelbestanden
of een headless CMS. `.be` heeft zowel `nl-BE` als `fr-BE` nodig.

---

## 5. Winnen we op SEO / worden we marktleider?

**Fundering (goed):** unieke, keyword-gerichte titels/descriptions per pagina; module- en
vertical-landingspagina's die de kerncluster "software voor signmakers/autobelettering/
grootformaat/lichtreclame" afdekken; nette heading-hiërarchie; volledige structured data
(nu incl. Breadcrumb + Article + WebSite); schone sitemap/robots; snel, mobiel-first.

**Wat marktleiderschap nog in de weg staat:**
1. **Te weinig zoek-gerichte content.** Van de 20 kennisbankartikelen zijn er ± 3 echt op
   zoekintentie geschreven; de rest is product-uitleg voor bestaande gebruikers. → Bouw een
   set commerciële/informatieve artikelen rond zoektermen ("wat kost signsoftware",
   "offerte maken gevelreclame", "werkbon-app kiezen", "boekhouding koppelen signbedrijf",
   vergelijkingen, how-to's).
2. **Interne links bijna afwezig.** Artikelen linken nauwelijks naar elkaar of naar de
   module-/vertical-pagina's. → Bouw topic-clusters: elk artikel linkt contextueel naar de
   relevante module- en branchepagina (en omgekeerd). Dit versterkt precies de pagina's
   waarmee je wilt ranken.
3. **Autoriteit/backlinks** — buiten de code: vakmedia, partnerpagina's, brancheverenigingen.
4. **Meten** — zonder analytics + Search Console geen sturing. Zet dit als eerste op (zie §3).

**Reëel beeld:** met de huidige basis word je goed vindbaar op de niche-termen. "Marktleider
organisch" is haalbaar maar vergt een doorlopend content- + linkprogramma (maanden), niet
één sprint. De techniek staat je nu niet meer in de weg.

---

## 6. Prioriteit voor livegang (samengevat)

1. Bedrijfsgegevens + legal-check (§3.1–3.2) — **blocker**
2. E-mail-afzender verifiëren (§3.3) — **blocker voor deliverability**
3. Analytics + (indien nodig) consent (§3.4) — **nodig om succes te meten**
4. Productie-env zetten + `npm run build` als eindcheck (§3.5 + §2-waarschuwing)
5. Daarna live. Parallel starten: social proof (§3) en het content/link-programma (§5).
