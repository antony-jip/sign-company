// Gedeelde TypeScript-types die de Supabase-tabellen weerspiegelen.

export interface Category {
  id: string
  slug: string
  naam: string
  beschrijving: string | null
  sort: number
}

export interface Artwork {
  id: string
  slug: string
  titel: string
  beschrijving: string | null
  kunstenaar: string | null
  category_id: string | null
  image_url: string
  thumb_url: string | null
  tags: string[]
  is_featured: boolean
  is_active: boolean
  sort: number
}

export interface Format {
  id: string
  label: string
  breedte_cm: number
  hoogte_cm: number
  ratio: string | null
  base_price_cents: number
  frame_price_cents: number
  is_maatwerk: boolean
  is_active: boolean
  sort: number
}

/**
 * Prijsmatrix: de werkelijke prijzen per formaat × stof (incl. btw, in centen).
 * doek = los doek (herhaalaankoop), compleet = doek + luxe lijst.
 * Dit is de bron van waarheid — de losse surcharge-velden op formats/fabrics
 * zijn hiermee vervallen.
 */
export interface FormatFabricPrice {
  id: string
  format_id: string
  fabric_id: string
  doek_price_cents: number
  compleet_price_cents: number
}

export interface Fabric {
  id: string
  key: string
  label: string
  beschrijving: string | null
  surcharge_cents: number
  is_active: boolean
  sort: number
}

export interface FrameColor {
  id: string
  key: string
  label: string
  hex: string | null
  surcharge_cents: number
  is_active: boolean
  sort: number
}

export type OrderStatus =
  | 'open' | 'pending' | 'paid' | 'failed' | 'expired' | 'canceled' | 'refunded'

// Eén geconfigureerd doek zoals de client het naar de server stuurt.
// LET OP: de client stuurt GEEN prijzen — die berekent de server opnieuw.
export interface CartLineInput {
  artworkId?: string
  customUploadId?: string
  formatId: string
  fabricId: string
  frameColorId: string
  metLijst: boolean
  aantal: number
}

export interface CustomerInput {
  email: string
  naam?: string
  telefoon?: string
  adres?: string
  postcode?: string
  plaats?: string
  land?: string
  opmerking?: string
}

export interface CheckoutRequest {
  items: CartLineInput[]
  customer: CustomerInput
}

// Resultaat van de prijsberekening per regel (server-side).
export interface PricedLine {
  input: CartLineInput
  artwork?: Artwork
  format: Format
  fabric: Fabric
  frameColor: FrameColor
  unitPriceCents: number
  lineTotalCents: number
  titelSnapshot: string
  formatSnapshot: string
  fabricSnapshot: string
  frameSnapshot: string
  imageUrlSnapshot: string | null
}
