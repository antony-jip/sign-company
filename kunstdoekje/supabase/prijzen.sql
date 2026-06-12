-- ============================================================================
-- Kunstdoekje — prijsmatrix (formaat × stof)
-- ----------------------------------------------------------------------------
-- De echte prijzen passen niet in "basis + vaste stof-meerprijs": de meerprijs
-- van Fluweel en van de lijst verschilt per formaat. Daarom een expliciete
-- prijsmatrix. Dit is vanaf nu DE bron van waarheid voor prijzen.
--
-- Prijzen incl. 21% btw, in centen. Psychologische ,95-prijspunten, afgerond
-- naar boven vanaf de aangeleverde tarieven (zie docs/marktonderzoek.md §3).
--
-- Draai dit NA schema.sql en import_kunstdoekje.sql in de Supabase SQL Editor.
-- Idempotent: opnieuw draaien werkt prijzen bij.
-- ============================================================================

-- 1. Prijsmatrix-tabel
create table if not exists format_fabric_prices (
  id                   uuid primary key default gen_random_uuid(),
  format_id            uuid not null references formats(id) on delete cascade,
  fabric_id            uuid not null references fabrics(id) on delete cascade,
  doek_price_cents     int  not null,  -- los doek (herhaalaankoop)
  compleet_price_cents int  not null,  -- doek + luxe lijst
  created_at           timestamptz not null default now(),
  unique (format_id, fabric_id)
);

alter table format_fabric_prices enable row level security;
drop policy if exists "catalogus leesbaar" on format_fabric_prices;
create policy "catalogus leesbaar" on format_fabric_prices for select using (true);

-- 2. Nieuw formaat 120 x 180 (stond niet in de WooCommerce-attributen, wel in de prijslijst)
insert into formats (label, breedte_cm, hoogte_cm, base_price_cents, frame_price_cents, sort)
values ('120 x 180', 120, 180, 0, 0, 8)
on conflict (label) do update set breedte_cm = excluded.breedte_cm, hoogte_cm = excluded.hoogte_cm, sort = excluded.sort;

-- 3. Verouderde prijsvelden neutraliseren (matrix is nu leidend)
update formats set base_price_cents = 0, frame_price_cents = 0 where not is_maatwerk;
update fabrics set surcharge_cents = 0;

-- 4. De prijsmatrix
insert into format_fabric_prices (format_id, fabric_id, doek_price_cents, compleet_price_cents)
select f.id, s.id, v.doek, v.compleet
from (values
  -- ── Deco ──────────────────────────────────────────
  ('45 x 70',   'deco',    4995, 15995),
  ('53 x 80',   'deco',    5995, 16995),
  ('60 x 90',   'deco',    6995, 17995),
  ('67 x 100',  'deco',    7995, 18995),
  ('80 x 120',  'deco',    9995, 24995),
  ('95 x 140',  'deco',   11995, 29995),
  ('108 x 160', 'deco',   13995, 34995),
  ('120 x 180', 'deco',   15995, 39995),
  -- ── Fluweel ───────────────────────────────────────
  ('45 x 70',   'velvet',  8995, 19995),
  ('53 x 80',   'velvet',  9995, 21995),
  ('60 x 90',   'velvet', 10995, 22995),
  ('67 x 100',  'velvet', 11995, 23995),
  ('80 x 120',  'velvet', 13995, 29995),
  ('95 x 140',  'velvet', 15995, 35995),
  ('108 x 160', 'velvet', 18995, 42995),
  ('120 x 180', 'velvet', 19995, 49995)
) as v(fmt, fabric, doek, compleet)
join formats f on f.label = v.fmt
join fabrics s on s.key = v.fabric
on conflict (format_id, fabric_id) do update
  set doek_price_cents = excluded.doek_price_cents,
      compleet_price_cents = excluded.compleet_price_cents;
