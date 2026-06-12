-- ============================================================================
-- Kunstdoekje — seed data
-- ----------------------------------------------------------------------------
-- Prijzen hieronder zijn PLACEHOLDERS op basis van het publieke productmodel.
-- Vervang ze door de echte tarieven (bv. uit de WooCommerce-export) voordat je
-- live gaat. Alle bedragen in CENTEN, inclusief btw.
-- ============================================================================

-- Stoffen --------------------------------------------------------------------
insert into fabrics (key, label, beschrijving, surcharge_cents, sort) values
  ('velvet',   'Velvet',                 'Luxe velours met diepe kleurweergave',            0,    1),
  ('deco',     'Deco',                   'Klassieke matte decostof',                        -1500, 2),
  ('deco_pet', 'Deco gerecycled (PET)',  'Duurzame decostof van gerecycled PET',            0,    3)
on conflict (key) do nothing;

-- Lijstkleuren ---------------------------------------------------------------
insert into frame_colors (key, label, hex, surcharge_cents, sort) values
  ('zwart', 'Zwart', '#111111', 0,    1),
  ('wit',   'Wit',   '#f5f5f5', 0,    2),
  ('grijs', 'Grijs', '#8a8d91', 0,    3),
  ('ral',   'RAL op aanvraag', null,  2500, 4)
on conflict (key) do nothing;

-- Formaten (proportioneel 70–160 cm) -----------------------------------------
-- base_price_cents = los doek; frame_price_cents = meerprijs voor de lijst.
insert into formats (label, breedte_cm, hoogte_cm, ratio, base_price_cents, frame_price_cents, sort) values
  ('70 x 50',   70,  50,  '7:5',  4995,  3500,  1),
  ('70 x 100',  70,  100, '7:10', 6995,  4500,  2),
  ('90 x 60',   90,  60,  '3:2',  6995,  4500,  3),
  ('100 x 70',  100, 70,  '10:7', 7995,  5000,  4),
  ('120 x 80',  120, 80,  '3:2',  8995,  5500,  5),
  ('120 x 90',  120, 90,  '4:3',  9495,  5500,  6),
  ('140 x 100', 140, 100, '7:5',  10995, 6500,  7),
  ('160 x 120', 160, 120, '4:3',  12995, 7500,  8)
on conflict (label) do nothing;

-- Maatwerk-formaat (prijs op aanvraag) ---------------------------------------
insert into formats (label, breedte_cm, hoogte_cm, ratio, base_price_cents, frame_price_cents, is_maatwerk, sort)
values ('Maatwerk', 0, 0, null, 0, 0, true, 99)
on conflict (label) do nothing;

-- Categorieën ----------------------------------------------------------------
insert into categories (slug, naam, sort) values
  ('abstract',    'Abstract',          1),
  ('natuur',      'Natuur & Landschap',2),
  ('botanisch',   'Botanisch',         3),
  ('dieren',      'Dieren',            4),
  ('steden',      'Steden & Reizen',   5),
  ('zwartwit',    'Zwart-wit',         6)
on conflict (slug) do nothing;

-- Voorbeeld-artworks (placeholders, vervang via WooCommerce-import) -----------
insert into artworks (slug, titel, beschrijving, image_url, tags, is_featured, sort, category_id)
select v.slug, v.titel, v.beschrijving, v.image_url, v.tags, v.is_featured, v.sort, c.id
from (values
  ('gouden-bladeren', 'Gouden Bladeren', 'Warme botanische compositie in goudtinten', 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=1600', array['botanisch','goud'], true,  1, 'botanisch'),
  ('blauwe-oceaan',   'Blauwe Oceaan',   'Rustgevend abstract zeegezicht',             'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1600', array['natuur','blauw'],   true,  2, 'natuur'),
  ('stadslicht',      'Stadslicht',      'Moody skyline bij nacht',                    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600', array['steden','nacht'],   false, 3, 'steden'),
  ('abstracte-vlakken','Abstracte Vlakken','Minimalistische kleurvlakken',            'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600', array['abstract'],         true,  4, 'abstract')
) as v(slug, titel, beschrijving, image_url, tags, is_featured, sort, cat_slug)
join categories c on c.slug = v.cat_slug
on conflict (slug) do nothing;
