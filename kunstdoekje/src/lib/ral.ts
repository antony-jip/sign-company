// RAL-kleuren en frameprijzen voor de maatwerk RAL-frame pagina (/ral-frame).
// Kleuren ter inspiratie · élke RAL-kleur is mogelijk (op aanvraag gespoten).

export interface RalColor {
  code: string
  naam: string
  hex: string
  trending?: boolean
}

export interface RalCategorie {
  key: string
  label: string
  kleuren: RalColor[]
}

export const RAL_CATEGORIEEN: RalCategorie[] = [
  {
    key: 'trending',
    label: 'Trending 2025',
    kleuren: [
      { code: '3014', naam: 'Antique Pink', hex: '#D36E70', trending: true },
      { code: '6021', naam: 'Sage Green', hex: '#89AC76', trending: true },
      { code: '8028', naam: 'Terra Brown', hex: '#8E402A', trending: true },
      { code: '8003', naam: 'Clay Brown', hex: '#734222', trending: true },
      { code: '9001', naam: 'Crème', hex: '#FDF4E3', trending: true },
      { code: '7044', naam: 'Silk Grey', hex: '#CAC4B0', trending: true },
      { code: '3015', naam: 'Light Pink', hex: '#EA899A', trending: true },
      { code: '5024', naam: 'Pastel Blue', hex: '#5D9B9B', trending: true },
      { code: '6034', naam: 'Pastel Turquoise', hex: '#7CADAC', trending: true },
      { code: '1019', naam: 'Grey Beige', hex: '#9E9764', trending: true },
      { code: '5008', naam: 'Grey Blue', hex: '#26252D', trending: true },
      { code: '5022', naam: 'Night Blue', hex: '#252850', trending: true },
    ],
  },
  {
    key: 'pastel',
    label: 'Pastel',
    kleuren: [
      { code: '3015', naam: 'Light Pink', hex: '#EA899A' },
      { code: '5024', naam: 'Pastel Blue', hex: '#5D9B9B' },
      { code: '6019', naam: 'Pastel Green', hex: '#BDECB6' },
      { code: '6034', naam: 'Pastel Turquoise', hex: '#7CADAC' },
      { code: '4009', naam: 'Pastel Violet', hex: '#A18594' },
      { code: '1013', naam: 'Oyster White', hex: '#EAE6CA' },
    ],
  },
  {
    key: 'earth',
    label: 'Aardse tinten',
    kleuren: [
      { code: '8028', naam: 'Terra Brown', hex: '#8E402A' },
      { code: '8003', naam: 'Clay Brown', hex: '#734222' },
      { code: '8001', naam: 'Ochre Brown', hex: '#955F20' },
      { code: '8004', naam: 'Copper Brown', hex: '#8E402A' },
      { code: '8019', naam: 'Grey Brown', hex: '#403A3A' },
      { code: '8025', naam: 'Pale Brown', hex: '#755C48' },
      { code: '1000', naam: 'Green Beige', hex: '#BEBD7F' },
      { code: '1011', naam: 'Brown Beige', hex: '#8A6642' },
      { code: '6006', naam: 'Grey Olive', hex: '#3E3B32' },
      { code: '6013', naam: 'Reed Green', hex: '#6C7156' },
      { code: '6003', naam: 'Olive Green', hex: '#424632' },
      { code: '7010', naam: 'Tarpaulin Grey', hex: '#4C514A' },
    ],
  },
  {
    key: 'neutrals',
    label: 'Warme neutralen',
    kleuren: [
      { code: '7044', naam: 'Silk Grey', hex: '#CAC4B0' },
      { code: '7032', naam: 'Pebble Grey', hex: '#B8B799' },
      { code: '7047', naam: 'Telegrey 4', hex: '#D0D0D0' },
      { code: '7023', naam: 'Concrete Grey', hex: '#686C5E' },
      { code: '1001', naam: 'Beige', hex: '#C2B078' },
      { code: '1015', naam: 'Light Ivory', hex: '#E6D690' },
      { code: '7001', naam: 'Zilvergrijs', hex: '#8A9597' },
      { code: '7035', naam: 'Lichtgrijs', hex: '#D7D7D7' },
    ],
  },
  {
    key: 'white',
    label: 'Wit & crème',
    kleuren: [
      { code: '9010', naam: 'Pure White', hex: '#FFFFFF' },
      { code: '9001', naam: 'Crème wit', hex: '#FDF4E3' },
      { code: '9002', naam: 'Gebroken wit', hex: '#E7EBDA' },
      { code: '9016', naam: 'Traffic White', hex: '#F6F6F6' },
      { code: '1019', naam: 'Grey Beige', hex: '#9E9764' },
      { code: '1035', naam: 'Pearl Beige', hex: '#6A5D4D' },
    ],
  },
  {
    key: 'black',
    label: 'Zwart & donker',
    kleuren: [
      { code: '9005', naam: 'Jet Black', hex: '#0A0A0A' },
      { code: '9004', naam: 'Signaal zwart', hex: '#282828' },
      { code: '9017', naam: 'Verkeerszwart', hex: '#1E1E1E' },
      { code: '7016', naam: 'Anthracite Grey', hex: '#383E42' },
      { code: '7021', naam: 'Zwartgrijs', hex: '#23282B' },
      { code: '8022', naam: 'Zwartbruin', hex: '#212121' },
    ],
  },
  {
    key: 'statement',
    label: 'Statement',
    kleuren: [
      { code: '3004', naam: 'Purple Red', hex: '#75151E' },
      { code: '5005', naam: 'Signal Blue', hex: '#1E2460' },
      { code: '3020', naam: 'Traffic Red', hex: '#CC0605' },
      { code: '2004', naam: 'Pure Orange', hex: '#F44611' },
      { code: '4008', naam: 'Signal Violet', hex: '#924B8B' },
      { code: '6024', naam: 'Traffic Green', hex: '#308446' },
      { code: '1003', naam: 'Signal Yellow', hex: '#E5BE01' },
      { code: '5010', naam: 'Gentiaanblauw', hex: '#0E294B' },
      { code: '6005', naam: 'Mosgroen', hex: '#2F4F4F' },
      { code: '3005', naam: 'Wijnrood', hex: '#5E2129' },
      { code: '3009', naam: 'Oxiderood', hex: '#642424' },
      { code: '1021', naam: 'Cadmium Yellow', hex: '#F3DA0B' },
      { code: '6018', naam: 'Yellow Green', hex: '#57A639' },
      { code: '5015', naam: 'Sky Blue', hex: '#2271B3' },
      { code: '3024', naam: 'Luminous Red', hex: '#F80000' },
      { code: '2009', naam: 'Traffic Orange', hex: '#F54021' },
      { code: '4003', naam: 'Heather Violet', hex: '#DE4C8A' },
      { code: '6038', naam: 'Brilliant Green', hex: '#00BB2D' },
    ],
  },
  {
    key: 'rainbow',
    label: 'Regenboog',
    kleuren: [
      { code: '1003', naam: 'Signal Yellow', hex: '#E5BE01' },
      { code: '2004', naam: 'Pure Orange', hex: '#F44611' },
      { code: '3020', naam: 'Traffic Red', hex: '#CC0605' },
      { code: '4008', naam: 'Signal Violet', hex: '#924B8B' },
      { code: '5005', naam: 'Signal Blue', hex: '#1E2460' },
      { code: '6024', naam: 'Traffic Green', hex: '#308446' },
    ],
  },
  {
    key: 'home',
    label: 'Huisstijl',
    kleuren: [
      { code: '5014', naam: 'Pigeon Blue', hex: '#606E8C' },
      { code: '6029', naam: 'Mint Green', hex: '#20603D' },
      { code: '1018', naam: 'Zinc Yellow', hex: '#F8F32B' },
      { code: '3012', naam: 'Beige Red', hex: '#C1876B' },
      { code: '5007', naam: 'Brilliant Blue', hex: '#3E5F8A' },
      { code: '6017', naam: 'May Green', hex: '#4C9141' },
      { code: '4005', naam: 'Blue Lilac', hex: '#6C4675' },
      { code: '2002', naam: 'Vermillion', hex: '#CB2821' },
    ],
  },
  {
    key: 'industrial',
    label: 'Industrieel',
    kleuren: [
      { code: '3011', naam: 'Brown Red', hex: '#781F19' },
      { code: '6014', naam: 'Yellow Olive', hex: '#47402E' },
      { code: '8017', naam: 'Chocolate Brown', hex: '#45322E' },
      { code: '7013', naam: 'Brown Grey', hex: '#464531' },
      { code: '5000', naam: 'Violet Blue', hex: '#354D73' },
      { code: '1017', naam: 'Saffron Yellow', hex: '#F5D033' },
    ],
  },
  {
    key: 'nature',
    label: 'Water & natuur',
    kleuren: [
      { code: '5018', naam: 'Turquoise Blue', hex: '#3F888F' },
      { code: '6027', naam: 'Light Green', hex: '#84C3BE' },
      { code: '6035', naam: 'Pearl Green', hex: '#1C542D' },
      { code: '5021', naam: 'Water Blue', hex: '#256D7B' },
      { code: '6028', naam: 'Pine Green', hex: '#2C5545' },
      { code: '5013', naam: 'Cobalt Blue', hex: '#1E213D' },
    ],
  },
  {
    key: 'summer',
    label: 'Warme zomer',
    kleuren: [
      { code: '1034', naam: 'Pastel Yellow', hex: '#EAA221' },
      { code: '2003', naam: 'Pastel Orange', hex: '#FF7514' },
      { code: '1028', naam: 'Melon Yellow', hex: '#F4A900' },
      { code: '2008', naam: 'Bright Red Orange', hex: '#F75E25' },
      { code: '1014', naam: 'Ivory', hex: '#E1CC4F' },
      { code: '1032', naam: 'Broom Yellow', hex: '#D6AE01' },
    ],
  },
]

export interface RalMaat {
  label: string
  prijsCents: number
}

// RAL-frame prijzen (incl. spuiten in gewenste kleur), per formaat.
export const RAL_MATEN: RalMaat[] = [
  { label: '45 × 70', prijsCents: 22612 },
  { label: '53 × 80', prijsCents: 24800 },
  { label: '60 × 90', prijsCents: 27500 },
  { label: '67 × 100', prijsCents: 29500 },
  { label: '80 × 120', prijsCents: 34500 },
  { label: '95 × 140', prijsCents: 39500 },
  { label: '108 × 160', prijsCents: 44900 },
  { label: '120 × 180', prijsCents: 52500 },
]

export const RAL_HERO_IMAGES = [
  'https://kunstdoekje.nl/wp-content/uploads/2025/10/Generated-Image-September-16-2025-7_59PM.webp',
  'https://kunstdoekje.nl/wp-content/uploads/2025/10/Generated-Image-September-16-2025-8_20PM.webp',
  'https://kunstdoekje.nl/wp-content/uploads/2025/10/Generated-Image-September-16-2025-8_17PM.webp',
  'https://kunstdoekje.nl/wp-content/uploads/2025/10/Generated-Image-September-16-2025-8_14PM.webp',
  'https://kunstdoekje.nl/wp-content/uploads/2025/10/Generated-Image-September-16-2025-8_11PM-1.webp',
  'https://kunstdoekje.nl/wp-content/uploads/2025/10/Generated-Image-September-16-2025-8_06PM.webp',
  'https://kunstdoekje.nl/wp-content/uploads/2025/10/Generated-Image-September-16-2025-7_57PM.webp',
]
