# Kunstdoekje — webshop (Next.js + Supabase + Mollie)

Nieuwe, snelle webshop voor [kunstdoekje.nl](https://kunstdoekje.nl) ter
vervanging van de trage WordPress/WooCommerce-site. Draait op Vercel.

> **Status:** de **back-end** is gebouwd (database, prijsmodel, Mollie-checkout,
> WooCommerce-import, API-routes). De volledige front-end (home, shop,
> configurator, winkelwagen, checkout-UI) volgt als volgende stap.

## Kernidee

Een _kunstdoek_ is een **print** op doek. De **prijs hangt af van het formaat
(+ stof + lijst), niet van de print**. Dezelfde afbeelding kost in elk formaat
hetzelfde als elke andere afbeelding in dat formaat.

Prijzen komen uit de **prijsmatrix** `format_fabric_prices` (formaat × stof),
met per combinatie een *los doek*-prijs en een *compleet (doek + lijst)*-prijs
(`supabase/prijzen.sql`). Formule (`src/lib/pricing.ts`, server-side = enige
bron van waarheid):

```
stuksprijs = met lijst
  ? matrix[formaat][stof].compleet + lijstkleur.meerprijs   (bv. RAL)
  : matrix[formaat][stof].doek
```

## Architectuur

| Laag        | Keuze                                              |
| ----------- | -------------------------------------------------- |
| Frontend    | Next.js 14 (App Router) + Tailwind, op Vercel      |
| Database    | Supabase (Postgres) met Row Level Security         |
| Betalingen  | Mollie (iDEAL, kaarten, …)                          |
| Uploads     | Supabase Storage (eigen foto)                      |
| Migratie    | WooCommerce CSV-export → `scripts/import-woocommerce.ts` |

### Datamodel (`supabase/schema.sql`)

- `artworks` — de prints (beeld, titel, categorie, tags). Prijsonafhankelijk.
- `formats` — formaten + basisprijs + lijstprijs (bepaalt de prijs).
- `fabrics` — velvet / deco / deco-PET + meerprijs.
- `frame_colors` — zwart / wit / grijs / RAL + meerprijs.
- `orders` + `order_items` — bestellingen met prijssnapshot.
- `custom_uploads` — eigen-foto-uploads.
- `quote_requests` — maatwerk / zakelijk / contact.

**Veiligheid:** anon-rol mag alleen de catalogus lézen. Orders worden uitsluitend
server-side aangemaakt met de service-role key, en **prijzen worden altijd
server-side herberekend** — de client kan ze nooit manipuleren.

## Setup

### 1. Supabase

1. Maak een Supabase-project.
2. SQL Editor → plak en run `supabase/schema.sql`, daarna `supabase/seed.sql`.
3. Storage → New bucket → **`uploads`** (public).
4. Project Settings → API → noteer URL, anon key en **service_role** key.

### 2. Mollie

1. Maak een Mollie-account, activeer iDEAL.
2. Developers → API keys → kopieer de **test**-key (`test_…`) voor nu.

### 3. Env

```bash
cp .env.example .env.local
# vul Supabase + Mollie waarden in
```

### 4. Installeren & draaien

```bash
npm install
npm run dev        # http://localhost:3000
```

> Mollie-webhooks bereiken `localhost` niet. Test de betaal-flow op een Vercel
> preview-deploy, of gebruik een tunnel (bv. ngrok) en zet `NEXT_PUBLIC_BASE_URL`
> daarop.

## Catalogus migreren vanuit WooCommerce

```bash
# 1. WordPress admin → Producten → Exporteren → CSV
# 2. leg neer als data/woocommerce-products.csv
npm run import:woo -- ./data/woocommerce-products.csv
```

Het script importeert de **prints** (titel, beeld, categorie, tags) en logt de
aangetroffen Woo-prijzen zodat je de formaatprijzen in `seed.sql` kunt
kalibreren. Variaties (formaat/stof) worden overgeslagen — die zijn in dit model
referentiedata.

## API

| Endpoint                   | Methode | Doel                                       |
| -------------------------- | ------- | ------------------------------------------ |
| `/api/products`            | GET     | Catalogus + prijsopties (ISR-cache 60s)    |
| `/api/checkout`            | POST    | Order + Mollie-betaling aanmaken           |
| `/api/webhook/mollie`      | POST    | Betaalstatus verwerken (Mollie → ons)      |
| `/api/upload`              | POST    | Eigen foto uploaden (multipart)            |
| `/api/quote`               | POST    | Maatwerk-/offerte-/contactaanvraag         |

### Checkout-body

```jsonc
{
  "items": [
    {
      "artworkId": "uuid",      // of "customUploadId"
      "formatId": "uuid",
      "fabricId": "uuid",
      "frameColorId": "uuid",
      "metLijst": true,
      "aantal": 1
    }
  ],
  "customer": { "email": "klant@example.nl", "naam": "…", "adres": "…" }
}
```

Antwoord: `{ "checkoutUrl": "https://…mollie…", "orderNumber": "KD-2026-000001" }`
→ redirect de klant naar `checkoutUrl`.

## Deploy naar Vercel

1. Import dit repo in Vercel, **Root Directory = `kunstdoekje`**.
2. Zet de env-vars uit `.env.example` (incl. `NEXT_PUBLIC_BASE_URL` = je domein).
3. Zet in Mollie eventueel de live-key zodra alles getest is.

## Nog te doen (volgende stappen)

- [ ] Frontend: home, shop-grid, product-configurator met live prijs, cart, checkout-UI
- [ ] Bevestigingsmail bij betaling (Resend) + admin-notificatie
- [ ] Echte catalogus + prijzen importeren uit de WooCommerce-export
- [ ] Huisstijl/branding overnemen na scrape van de oude site
- [ ] Domein `kunstdoekje.nl` aan Vercel koppelen
