import { isLabelVoor } from '@/utils/offerteSpecs'

export interface KlantSpec {
  label: string
  waarde: string
}

interface ItemVoorSpecs {
  detail_regels?: { label?: string | null; waarde?: string | null }[] | null
  breedte_mm?: number | null
  hoogte_mm?: number | null
  oppervlakte_m2?: number | null
}

/**
 * De terugweg naar het portaal komt uit de querystring. Alles wat geen
 * portaalpad is (een externe link, javascript:) mag nooit als href landen.
 */
export function veiligeTerugUrl(ruw: string | null | undefined): string | null {
  if (!ruw) return null
  return /^\/portaal\/[A-Za-z0-9_-]{8,}$/.test(ruw) ? ruw : null
}

/** Zelfde schrijfwijze als de PDF: "OPmerking" wordt "Opmerking", RAL blijft RAL. */
function netjesLabel(label: string): string {
  if (!/[a-z]/.test(label)) return label
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
}

/**
 * De specs van een regel zoals de PDF ze toont (pdfService, detailRegelsVoor),
 * zodat webpagina en PDF hetzelfde vertellen. De afmeting uit de calculatie
 * alleen als er geen eigen formaat-regel staat, anders staat de maat er twee
 * keer. Korting hoort op de pagina bij de prijs en staat hier dus niet.
 */
export function klantSpecs(item: ItemVoorSpecs): KlantSpec[] {
  const eigen = (item.detail_regels ?? [])
    .map((r) => ({ label: (r?.label ?? '').trim(), waarde: (r?.waarde ?? '').trim() }))
    .filter((r) => r.label && r.waarde)

  const specs: KlantSpec[] = []
  const heeftEigenFormaat = eigen.some((r) => isLabelVoor('formaat', r.label))
  if (item.breedte_mm && item.hoogte_mm && !heeftEigenFormaat) {
    const m2 = item.oppervlakte_m2 || (item.breedte_mm / 1000) * (item.hoogte_mm / 1000)
    specs.push({
      label: 'Afmeting',
      waarde: `${item.breedte_mm} × ${item.hoogte_mm} mm (${m2.toFixed(2).replace('.', ',')} m²)`,
    })
  }
  for (const regel of eigen) {
    specs.push({ label: netjesLabel(regel.label.replace(/:+$/, '')), waarde: regel.waarde })
  }
  return specs
}

export type BijlageSoort = 'afbeelding' | 'pdf'

/** Oudere regels hebben geen bijlage_type; dan beslist de extensie. */
export function bijlageSoort(url?: string | null, mime?: string | null): BijlageSoort | null {
  if (!url) return null
  if (mime?.startsWith('image/')) return 'afbeelding'
  if (mime === 'application/pdf') return 'pdf'
  if (url.startsWith('data:image/')) return 'afbeelding'
  const pad = url.split('?')[0].toLowerCase()
  if (/\.(png|jpe?g|webp|gif)$/.test(pad)) return 'afbeelding'
  if (pad.endsWith('.pdf')) return 'pdf'
  return null
}

export function voornaam(naam?: string | null): string {
  return (naam ?? '').trim().split(/\s+/)[0] ?? ''
}

const STANDAARD_KOPKLEUR = '#1A535C'

/** Kopkleur uit de portaalinstellingen; alles wat geen #rrggbb is valt terug op petrol. */
export function kopKleur(ruw?: string | null): string {
  const kleur = typeof ruw === 'string' ? ruw.trim() : ''
  return /^#[0-9a-fA-F]{6}$/.test(kleur) ? kleur : STANDAARD_KOPKLEUR
}

/** Een lichte kopkleur (wit, geel) krijgt donkere tekst, anders valt de bedrijfsnaam weg. */
export function isLichteKleur(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62
}

/**
 * De link in de offertemail. Met een portaal erbij krijgt de klant de terugweg
 * naar het portaal mee, zodat de offerte het eerste is wat hij ziet zonder dat
 * het portaal onvindbaar wordt.
 */
/** Een publieke offertelink is bruikbaar als hij bestaat en nog niet verlopen is. */
export function publiekTokenBruikbaar(token?: string | null, verlooptOp?: string | null, nu: Date = new Date()): token is string {
  if (!token) return false
  return !verlooptOp || new Date(verlooptOp).getTime() > nu.getTime()
}

export function offertePaginaUrl(origin: string, publiekToken: string, portaalToken?: string | null): string {
  const basis = `${origin}/offerte-bekijken/${publiekToken}`
  return portaalToken ? `${basis}?terug=${encodeURIComponent(`/portaal/${portaalToken}`)}` : basis
}
