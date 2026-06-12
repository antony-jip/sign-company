import type { Artwork, Fabric, Format, FrameColor, CartLineInput, PricedLine } from './types'

/**
 * Kernformule van Kunstdoekje.
 *
 * De PRINT (artwork) beïnvloedt de prijs NIET. De prijs wordt bepaald door:
 *   - het formaat       (basisprijs van het doek)
 *   - de stofkeuze      (meerprijs velvet / deco / deco-PET)
 *   - wel/geen lijst    (lijstprijs hoort bij het formaat)
 *   - de lijstkleur     (meerprijs, bv. RAL op aanvraag)
 *
 * Dit is de ENIGE bron van waarheid voor prijzen en draait uitsluitend
 * server-side, zodat de client prijzen nooit kan manipuleren.
 */
export function unitPriceCents(opts: {
  format: Format
  fabric: Fabric
  frameColor: FrameColor
  metLijst: boolean
}): number {
  const { format, fabric, frameColor, metLijst } = opts
  let price = format.base_price_cents
  price += fabric.surcharge_cents
  if (metLijst) {
    price += format.frame_price_cents
    price += frameColor.surcharge_cents
  }
  return Math.max(0, Math.round(price))
}

export interface Catalog {
  formats: Map<string, Format>
  fabrics: Map<string, Fabric>
  frameColors: Map<string, FrameColor>
  artworks: Map<string, Artwork>
}

/** Bereken één regel uit een client-input + de catalogus. Gooit bij ongeldige refs. */
export function priceLine(line: CartLineInput, cat: Catalog): PricedLine {
  const format = cat.formats.get(line.formatId)
  const fabric = cat.fabrics.get(line.fabricId)
  const frameColor = cat.frameColors.get(line.frameColorId)
  if (!format) throw new Error(`Onbekend formaat: ${line.formatId}`)
  if (!fabric) throw new Error(`Onbekende stof: ${line.fabricId}`)
  if (!frameColor) throw new Error(`Onbekende lijstkleur: ${line.frameColorId}`)

  if (format.is_maatwerk) {
    throw new Error('Maatwerk-formaat kan niet via de standaard checkout — gebruik offerte')
  }

  const artwork = line.artworkId ? cat.artworks.get(line.artworkId) : undefined
  if (line.artworkId && !artwork) throw new Error(`Onbekend artwork: ${line.artworkId}`)
  if (!line.artworkId && !line.customUploadId) {
    throw new Error('Regel mist zowel artwork als custom upload')
  }

  const aantal = Math.max(1, Math.floor(line.aantal || 1))
  const unit = unitPriceCents({ format, fabric, frameColor, metLijst: line.metLijst })

  return {
    input: { ...line, aantal },
    artwork,
    format,
    fabric,
    frameColor,
    unitPriceCents: unit,
    lineTotalCents: unit * aantal,
    titelSnapshot: artwork?.titel ?? 'Eigen foto',
    formatSnapshot: format.label,
    fabricSnapshot: fabric.label,
    frameSnapshot: line.metLijst ? frameColor.label : 'Zonder lijst',
    imageUrlSnapshot: artwork?.image_url ?? null,
  }
}

export interface PricedOrder {
  lines: PricedLine[]
  subtotalCents: number
  shippingCents: number
  totalCents: number
  btwCents: number
}

/** Bereken een volledige order incl. verzendkosten en btw-aandeel. */
export function priceOrder(
  lines: CartLineInput[],
  cat: Catalog,
  opts: { shippingCents: number; btwPercent: number },
): PricedOrder {
  const priced = lines.map((l) => priceLine(l, cat))
  const subtotalCents = priced.reduce((sum, l) => sum + l.lineTotalCents, 0)
  const shippingCents = opts.shippingCents
  const totalCents = subtotalCents + shippingCents
  // Btw zit inclusief in de prijs; bereken het btw-aandeel van het totaal.
  const btwCents = Math.round(totalCents - totalCents / (1 + opts.btwPercent / 100))
  return { lines: priced, subtotalCents, shippingCents, totalCents, btwCents }
}

/** Laagste "compleet"-prijs (doek + lijst) over alle standaardformaten — voor "vanaf €X". */
export function vanafCompleetCents(
  formats: Format[],
  fabrics: Fabric[],
  frameColors: FrameColor[],
): number {
  const std = formats.filter((f) => !f.is_maatwerk)
  if (!std.length || !fabrics.length || !frameColors.length) return 0
  const minFabric = Math.min(...fabrics.map((f) => f.surcharge_cents))
  const minFrame = Math.min(...frameColors.map((f) => f.surcharge_cents))
  return Math.min(
    ...std.map((f) => f.base_price_cents + f.frame_price_cents + minFabric + minFrame),
  )
}

/** Formatteer centen naar "€ 1.234,56" (NL). */
export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}
