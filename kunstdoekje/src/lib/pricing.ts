import type {
  Artwork, Fabric, Format, FormatFabricPrice, FrameColor, CartLineInput, PricedLine,
} from './types'

/**
 * Kernprijsmodel van Kunstdoekje.
 *
 * De PRINT (artwork) beïnvloedt de prijs niet. De prijs komt uit de
 * PRIJSMATRIX per formaat × stof (tabel format_fabric_prices):
 *   - los doek      → doek_price_cents
 *   - compleet      → compleet_price_cents (doek + luxe lijst)
 *   + lijstkleur-meerprijs (bv. RAL op aanvraag), alleen bij compleet.
 *
 * Dit draait uitsluitend server-side voor orders, zodat de client prijzen
 * nooit kan manipuleren. De Configurator gebruikt dezelfde functie client-side
 * puur voor weergave.
 */
export function unitPriceCents(opts: {
  price: FormatFabricPrice
  frameColor: FrameColor
  metLijst: boolean
}): number {
  const { price, frameColor, metLijst } = opts
  const cents = metLijst
    ? price.compleet_price_cents + frameColor.surcharge_cents
    : price.doek_price_cents
  return Math.max(0, Math.round(cents))
}

/** Sleutel voor de prijsmatrix-map. */
export const priceKey = (formatId: string, fabricId: string) => `${formatId}:${fabricId}`

export interface Catalog {
  formats: Map<string, Format>
  fabrics: Map<string, Fabric>
  frameColors: Map<string, FrameColor>
  artworks: Map<string, Artwork>
  prices: Map<string, FormatFabricPrice> // key: priceKey(format_id, fabric_id)
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

  const price = cat.prices.get(priceKey(line.formatId, line.fabricId))
  if (!price) {
    throw new Error(`Geen prijs bekend voor ${format.label} in ${fabric.label}`)
  }

  const artwork = line.artworkId ? cat.artworks.get(line.artworkId) : undefined
  if (line.artworkId && !artwork) throw new Error(`Onbekend artwork: ${line.artworkId}`)
  if (!line.artworkId && !line.customUploadId) {
    throw new Error('Regel mist zowel artwork als custom upload')
  }

  const aantal = Math.max(1, Math.floor(line.aantal || 1))
  const unit = unitPriceCents({ price, frameColor, metLijst: line.metLijst })

  return {
    input: { ...line, aantal },
    artwork,
    format,
    fabric,
    frameColor,
    unitPriceCents: unit,
    lineTotalCents: unit * aantal,
    kortingPct: 0,
    unitPriceVoorKortingCents: unit,
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

/**
 * Combideal: wie een compleet doek (met lijst) bestelt, krijgt 25% korting op
 * elk los doek (zonder lijst) in dezelfde order. Wordt zowel server-side
 * (checkout, bron van waarheid) als client-side (cart-weergave) toegepast.
 */
export const COMBIDEAL_PCT = 25

export function combidealUnitCents(unitCents: number): number {
  return Math.round(unitCents * (1 - COMBIDEAL_PCT / 100))
}

/** Pas de combideal toe op geprijsde regels (muteert kopieën, niet de input). */
function applyCombideal(lines: PricedLine[]): PricedLine[] {
  const heeftFrame = lines.some((l) => l.input.metLijst)
  if (!heeftFrame) return lines
  return lines.map((l) => {
    if (l.input.metLijst) return l
    const unit = combidealUnitCents(l.unitPriceCents)
    return {
      ...l,
      kortingPct: COMBIDEAL_PCT,
      unitPriceVoorKortingCents: l.unitPriceCents,
      unitPriceCents: unit,
      lineTotalCents: unit * l.input.aantal,
    }
  })
}

/** Bereken een volledige order incl. combideal, verzendkosten en btw-aandeel. */
export function priceOrder(
  lines: CartLineInput[],
  cat: Catalog,
  opts: { shippingCents: number; btwPercent: number },
): PricedOrder {
  const priced = applyCombideal(lines.map((l) => priceLine(l, cat)))
  const subtotalCents = priced.reduce((sum, l) => sum + l.lineTotalCents, 0)
  const shippingCents = opts.shippingCents
  const totalCents = subtotalCents + shippingCents
  // Btw zit inclusief in de prijs; bereken het btw-aandeel van het totaal.
  const btwCents = Math.round(totalCents - totalCents / (1 + opts.btwPercent / 100))
  return { lines: priced, subtotalCents, shippingCents, totalCents, btwCents }
}

/** Laagste "compleet"-prijs over de hele matrix — voor "vanaf €X" op kaarten. */
export function vanafCompleetCents(
  prices: FormatFabricPrice[],
  frameColors: FrameColor[],
): number {
  if (!prices.length || !frameColors.length) return 0
  const minFrame = Math.min(...frameColors.map((f) => f.surcharge_cents))
  return Math.min(...prices.map((p) => p.compleet_price_cents)) + minFrame
}

/** Formatteer centen naar "€ 1.234,56" (NL). */
export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}
