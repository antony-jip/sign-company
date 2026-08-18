import type { WerkbonAfbeelding, WerkbonAfbeeldingLayout, WerkbonBlokType } from '@/types'

/**
 * Canvas-werkruimte per item in millimeters.
 * 267 x 100 mm = landscape A4 (297x210) minus 15mm marges links/rechts/onder.
 * 1:1 mapping met PDF content-block — coord-render kan rechtstreeks plaatsen.
 */
export const CANVAS_WERKRUIMTE_MM = {
  breedte: 267,
  hoogte: 100,
} as const

/**
 * Snap-grid in mm. Drag/resize ronden af op dit raster.
 * Shift-toets in de editor omzeilt de snap voor vrije plaatsing.
 */
export const CANVAS_SNAP_GRID_MM = 5

/**
 * Minimum element-afmeting in mm. Onder deze maat is een element
 * onbruikbaar op print; size-badge wordt rood ter waarschuwing.
 * Hard-clamp ligt niet hier — alleen visuele signalering.
 */
export const CANVAS_MIN_ELEMENT_MM = 15

/**
 * Soft-cap aantal elementen per item-canvas. Bij overschrijding toont
 * de drop-handler een toast.info, maar blokkeert niet (geen hard-block
 * conform §8.3 v1.2 masterplan).
 */
export const CANVAS_SOFT_CAP_ELEMENTS = 6

/**
 * Default z-index per blok-type. Logo komt boven foto/pdf zodat
 * branding altijd zichtbaar blijft. Geen handmatige layers-UI in fase 3.
 */
export const CANVAS_Z_INDEX_DEFAULTS: Record<WerkbonBlokType, number> = {
  foto: 1,
  pdf: 1,
  logo: 2,
}

/**
 * Cascade-offset bij multi-drop op leeg canvas: element i krijgt
 * positie (5 + i*10, 5 + i*10) mm zodat ze niet stapelen.
 */
export const CANVAS_DROP_CASCADE_OFFSET_MM = 10
export const CANVAS_DROP_CASCADE_START_MM = 5

/**
 * Default logo-afmeting in mm bij drop zonder bekende bron-ratio.
 * Vierkant 40x40 sluit aan op fase-1-gedrag (rechtsboven-pill).
 */
export const CANVAS_LOGO_DEFAULT_MM = 40

/**
 * Type-guard: heeft deze afbeelding canvas-coordinaten?
 * Aanwezigheid van canvas_x_mm is de canonieke check — gebruikt door
 * de PDF coord-router (D3) en de item-card mode-switch (E3).
 * Beide checken hetzelfde veld zodat editor en render nooit divergeren.
 */
export function heeftCanvasCoords(layout: WerkbonAfbeeldingLayout | undefined): boolean {
  return layout?.canvas_x_mm !== undefined
}

/**
 * Heeft een item minstens één canvas-geplaatste afbeelding?
 * True = item rendert via fase-3 coord-pad; false = legacy flow-pad.
 */
export function itemHeeftCanvasData(afbeeldingen: WerkbonAfbeelding[]): boolean {
  return afbeeldingen.some((a) => heeftCanvasCoords(a.layout))
}

/**
 * Leest de aspect-ratio (breedte/hoogte) uit een image-blob via een
 * tijdelijke object-URL. Wordt bij drop gebruikt om de canvas-afmetingen
 * direct aan de source-ratio te koppelen, zodat object-contain geen
 * letterbox-witruimte introduceert in de editor en het selectie-frame
 * strak om de zichtbare pixels valt.
 *
 * Faalt stil naar 1 (vierkant) als de blob niet decodeerbaar is.
 */
export function getImageBlobRatio(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const r = img.naturalWidth / img.naturalHeight
      URL.revokeObjectURL(url)
      resolve(r > 0 && Number.isFinite(r) ? r : 1)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(1)
    }
    img.src = url
  })
}

/**
 * Berekent canvas-element afmetingen op basis van de bron-aspect-ratio.
 * Streeft naar maximaal 80mm langste zijde (40mm voor logo's), clampt
 * tegen de werkruimte (267x100mm) met 10mm marge zodat een element altijd
 * binnen het werkblad past.
 */
export function deriveCanvasSize(ratio: number, isLogo: boolean): { w: number; h: number } {
  const target = isLogo ? CANVAS_LOGO_DEFAULT_MM : 80
  let w: number
  let h: number
  if (ratio >= 1) {
    w = target
    h = w / ratio
  } else {
    h = target
    w = h * ratio
  }
  const maxW = CANVAS_WERKRUIMTE_MM.breedte - 10
  const maxH = CANVAS_WERKRUIMTE_MM.hoogte - 10
  if (h > maxH) {
    h = maxH
    w = h * ratio
  }
  if (w > maxW) {
    w = maxW
    h = w / ratio
  }
  return { w, h }
}
