-- ============================================================================
-- Kunstdoekje — Supabase schema
-- ----------------------------------------------------------------------------
-- Kernidee: een "kunstdoek" is een PRINT (artwork) op een doek. De prijs hangt
-- NIET af van de print, maar van het FORMAAT (+ stofkeuze + lijst). Dezelfde
-- print kan dus in elk formaat / elke stof besteld worden voor dezelfde prijs.
--
-- Prijsformule (server-side, zie src/lib/pricing.ts):
--   stuksprijs = format.base_price_cents
--              + fabric.surcharge_cents
--              + (met_lijst ? format.frame_price_cents : 0)
--              + frame_color.surcharge_cents
-- ============================================================================

-- UUID helper (Supabase heeft pgcrypto standaard beschikbaar)
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Reference data: categorieën
-- ----------------------------------------------------------------------------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  naam        text not null,
  beschrijving text,
  sort        int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Artworks (de prints) — prijsonafhankelijk, alleen het beeld verschilt
-- ----------------------------------------------------------------------------
create table if not exists artworks (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  titel         text not null,
  beschrijving  text,
  kunstenaar    text,
  category_id   uuid references categories(id) on delete set null,
  image_url     text not null,            -- hoofdbeeld (hoge resolutie / origineel)
  thumb_url     text,                     -- optioneel kleiner beeld voor grids
  tags          text[] not null default '{}',
  is_featured   boolean not null default false,
  is_active     boolean not null default true,
  -- herkomst t.b.v. migratie vanuit WooCommerce
  woo_id        bigint unique,
  woo_sku       text,
  sort          int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_artworks_category on artworks(category_id);
create index if not exists idx_artworks_active   on artworks(is_active);
create index if not exists idx_artworks_tags     on artworks using gin(tags);

-- ----------------------------------------------------------------------------
-- Formaten — bepalen de basisprijs (+ lijstprijs per formaat)
-- ----------------------------------------------------------------------------
create table if not exists formats (
  id                uuid primary key default gen_random_uuid(),
  label             text not null unique,   -- bv. "70 x 100"
  breedte_cm        numeric(6,1) not null,
  hoogte_cm         numeric(6,1) not null,
  ratio             text,                   -- bv. "7:10"
  base_price_cents  int  not null,          -- prijs van het losse doek (zonder lijst)
  frame_price_cents int  not null default 0,-- meerprijs voor de lijst in dit formaat
  is_maatwerk       boolean not null default false, -- true = prijs op aanvraag
  is_active         boolean not null default true,
  sort              int  not null default 0,
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Stoffen — meerprijs t.o.v. basis (velvet / deco / deco gerecycled PET)
-- ----------------------------------------------------------------------------
create table if not exists fabrics (
  id              uuid primary key default gen_random_uuid(),
  key             text not null unique,     -- 'velvet' | 'deco' | 'deco_pet'
  label           text not null,
  beschrijving    text,
  surcharge_cents int  not null default 0,
  is_active       boolean not null default true,
  sort            int  not null default 0
);

-- ----------------------------------------------------------------------------
-- Lijstkleuren — meerprijs (bv. RAL op aanvraag)
-- ----------------------------------------------------------------------------
create table if not exists frame_colors (
  id              uuid primary key default gen_random_uuid(),
  key             text not null unique,     -- 'zwart' | 'wit' | 'grijs' | 'ral'
  label           text not null,
  hex             text,                     -- voor swatch in de UI
  surcharge_cents int  not null default 0,
  is_active       boolean not null default true,
  sort            int  not null default 0
);

-- ----------------------------------------------------------------------------
-- Custom uploads — klant uploadt eigen foto ("eigen kunstdoek")
-- ----------------------------------------------------------------------------
create table if not exists custom_uploads (
  id          uuid primary key default gen_random_uuid(),
  storage_path text not null,               -- pad in Supabase Storage bucket
  public_url  text,
  bestandsnaam text,
  breedte_px  int,
  hoogte_px   int,
  dpi         int,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Orders
-- ----------------------------------------------------------------------------
create type order_status as enum ('open', 'pending', 'paid', 'failed', 'expired', 'canceled', 'refunded');

create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique,   -- bv. KD-2026-000123 (mensvriendelijk)
  status            order_status not null default 'open',
  -- klantgegevens
  email             text not null,
  naam              text,
  telefoon          text,
  -- bezorgadres
  adres             text,
  postcode          text,
  plaats            text,
  land              text default 'NL',
  opmerking         text,
  -- bedragen (alle bedragen in centen, ex/incl btw expliciet)
  subtotal_cents    int not null default 0,
  shipping_cents    int not null default 0,
  total_cents       int not null default 0,
  btw_cents         int not null default 0,
  valuta            text not null default 'EUR',
  -- Mollie
  mollie_payment_id text unique,
  mollie_status     text,
  betaalmethode     text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_email  on orders(email);

-- ----------------------------------------------------------------------------
-- Order items — een geconfigureerd doek (print + formaat + stof + lijst)
-- ----------------------------------------------------------------------------
create table if not exists order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete cascade,
  -- configuratie (snapshot, zodat historische orders kloppen blijven)
  artwork_id        uuid references artworks(id) on delete set null,
  custom_upload_id  uuid references custom_uploads(id) on delete set null,
  format_id         uuid references formats(id) on delete set null,
  fabric_id         uuid references fabrics(id) on delete set null,
  frame_color_id    uuid references frame_colors(id) on delete set null,
  met_lijst         boolean not null default true,
  -- snapshot velden (mens-leesbaar, los van FK's)
  titel_snapshot    text,
  format_snapshot   text,
  fabric_snapshot   text,
  frame_snapshot    text,
  image_url_snapshot text,
  -- prijs
  aantal            int not null default 1 check (aantal > 0),
  unit_price_cents  int not null,
  line_total_cents  int not null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_order_items_order on order_items(order_id);

-- ----------------------------------------------------------------------------
-- Offerte-aanvragen (maatwerk / zakelijk) — los van de Mollie-checkout
-- ----------------------------------------------------------------------------
create table if not exists quote_requests (
  id           uuid primary key default gen_random_uuid(),
  type         text not null default 'maatwerk',  -- 'maatwerk' | 'zakelijk' | 'contact'
  naam         text,
  email        text not null,
  telefoon     text,
  bedrijf      text,
  bericht      text,
  gewenst_formaat text,
  fabric_key   text,
  upload_id    uuid references custom_uploads(id) on delete set null,
  status       text not null default 'nieuw',     -- 'nieuw' | 'in_behandeling' | 'afgehandeld'
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_artworks_updated on artworks;
create trigger trg_artworks_updated before update on artworks
  for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Order-nummer generator (KD-JAAR-volgnummer)
-- ----------------------------------------------------------------------------
create sequence if not exists order_seq start 1;
create or replace function gen_order_number() returns text as $$
  select 'KD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_seq')::text, 6, '0');
$$ language sql;

-- ============================================================================
-- Row Level Security
-- ----------------------------------------------------------------------------
-- Publiek (anon) mag de catalogus LEZEN. Schrijven naar orders gebeurt
-- uitsluitend server-side via de service_role key (API routes), zodat prijzen
-- nooit door de client gemanipuleerd kunnen worden.
-- ============================================================================
alter table categories     enable row level security;
alter table artworks       enable row level security;
alter table formats        enable row level security;
alter table fabrics        enable row level security;
alter table frame_colors   enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;
alter table custom_uploads enable row level security;
alter table quote_requests enable row level security;

-- Publieke leesrechten op de catalogus
create policy "catalogus leesbaar" on categories   for select using (true);
create policy "catalogus leesbaar" on artworks      for select using (is_active);
create policy "catalogus leesbaar" on formats       for select using (is_active);
create policy "catalogus leesbaar" on fabrics       for select using (is_active);
create policy "catalogus leesbaar" on frame_colors  for select using (is_active);

-- Publiek mag offerte-aanvragen en uploads aanmaken (contactformulier / eigen foto)
create policy "publiek mag offerte aanmaken" on quote_requests for insert with check (true);
create policy "publiek mag upload registreren" on custom_uploads for insert with check (true);

-- orders / order_items: GEEN policies voor anon => alleen service_role (bypass RLS)
