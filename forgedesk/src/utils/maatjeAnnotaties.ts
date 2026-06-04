import type { MaatjeAnnotatie, MaatjeKleur, MaatjePunt } from '@/types'

/**
 * Brand-kleuren voor annotaties. Hex-waarden zodat ze 1:1 op het canvas
 * gerenderd kunnen worden (geen Tailwind-tokens in canvas-context).
 */
export const MAATJE_KLEUREN: Record<MaatjeKleur, string> = {
  flame: '#F15025',
  petrol: '#1A535C',
  groen: '#2D6B48',
  wit: '#FFFFFF',
}

export const MAATJE_RENDER_KWALITEIT = 0.85

/** Tekst-kleur die leesbaar contrasteert met de gekozen annotatie-kleur. */
function contrastTekst(kleur: MaatjeKleur): string {
  return kleur === 'wit' ? '#1A1A1A' : '#FFFFFF'
}

function denormaliseer(punt: MaatjePunt, breedte: number, hoogte: number): { x: number; y: number } {
  return { x: punt.x * breedte, y: punt.y * hoogte }
}

interface TekenSchaal {
  lijnDikte: number
  pijlKop: number
  tekstPx: number
  labelPx: number
}

function bepaalSchaal(breedte: number, hoogte: number): TekenSchaal {
  const basis = Math.min(breedte, hoogte)
  const lijnDikte = Math.max(2, basis * 0.006)
  return {
    lijnDikte,
    pijlKop: lijnDikte * 4,
    tekstPx: Math.max(14, basis * 0.045),
    labelPx: Math.max(12, basis * 0.034),
  }
}

function tekenMaatlijn(
  ctx: CanvasRenderingContext2D,
  annotatie: Extract<MaatjeAnnotatie, { type: 'maatlijn' }>,
  breedte: number,
  hoogte: number,
  schaal: TekenSchaal,
) {
  const kleur = MAATJE_KLEUREN[annotatie.kleur]
  const van = denormaliseer(annotatie.van, breedte, hoogte)
  const naar = denormaliseer(annotatie.naar, breedte, hoogte)

  ctx.strokeStyle = kleur
  ctx.lineWidth = schaal.lijnDikte
  ctx.lineCap = 'round'

  // Hoofdlijn
  ctx.beginPath()
  ctx.moveTo(van.x, van.y)
  ctx.lineTo(naar.x, naar.y)
  ctx.stroke()

  // Loodrechte eind-tikken zodat de meetlijn als maatvoering leesbaar is
  const dx = naar.x - van.x
  const dy = naar.y - van.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const tik = schaal.lijnDikte * 3
  for (const p of [van, naar]) {
    ctx.beginPath()
    ctx.moveTo(p.x - nx * tik, p.y - ny * tik)
    ctx.lineTo(p.x + nx * tik, p.y + ny * tik)
    ctx.stroke()
  }

  if (annotatie.cm != null) {
    const label = `${annotatie.cm} cm`
    const mx = (van.x + naar.x) / 2
    const my = (van.y + naar.y) / 2
    // 'inter' voor de cm-waarden (brand-conventie)
    ctx.font = `600 ${schaal.labelPx}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const padding = schaal.labelPx * 0.45
    const breedteTekst = ctx.measureText(label).width
    const boxW = breedteTekst + padding * 2
    const boxH = schaal.labelPx + padding * 1.2
    const r = boxH / 3
    ctx.fillStyle = kleur
    tekenAfgerondeRechthoek(ctx, mx - boxW / 2, my - boxH / 2, boxW, boxH, r)
    ctx.fill()
    ctx.fillStyle = contrastTekst(annotatie.kleur)
    ctx.fillText(label, mx, my)
  }
}

function tekenPijl(
  ctx: CanvasRenderingContext2D,
  annotatie: Extract<MaatjeAnnotatie, { type: 'pijl' }>,
  breedte: number,
  hoogte: number,
  schaal: TekenSchaal,
) {
  const kleur = MAATJE_KLEUREN[annotatie.kleur]
  const van = denormaliseer(annotatie.van, breedte, hoogte)
  const naar = denormaliseer(annotatie.naar, breedte, hoogte)
  const hoek = Math.atan2(naar.y - van.y, naar.x - van.x)

  ctx.strokeStyle = kleur
  ctx.fillStyle = kleur
  ctx.lineWidth = schaal.lijnDikte
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(van.x, van.y)
  ctx.lineTo(naar.x, naar.y)
  ctx.stroke()

  const k = schaal.pijlKop
  ctx.beginPath()
  ctx.moveTo(naar.x, naar.y)
  ctx.lineTo(naar.x - k * Math.cos(hoek - Math.PI / 6), naar.y - k * Math.sin(hoek - Math.PI / 6))
  ctx.lineTo(naar.x - k * Math.cos(hoek + Math.PI / 6), naar.y - k * Math.sin(hoek + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
}

function tekenTekst(
  ctx: CanvasRenderingContext2D,
  annotatie: Extract<MaatjeAnnotatie, { type: 'tekst' }>,
  breedte: number,
  hoogte: number,
  schaal: TekenSchaal,
) {
  if (!annotatie.tekst) return
  const kleur = MAATJE_KLEUREN[annotatie.kleur]
  const pos = denormaliseer(annotatie.positie, breedte, hoogte)
  // 'Plus Jakarta Sans' voor losse tekst (brand-conventie)
  ctx.font = `600 ${schaal.tekstPx}px "Plus Jakarta Sans", system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  // Donkere stroke achter de tekst houdt witte/lichte tekst leesbaar op foto
  ctx.lineWidth = schaal.tekstPx * 0.14
  ctx.strokeStyle = annotatie.kleur === 'wit' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)'
  ctx.strokeText(annotatie.tekst, pos.x, pos.y)
  ctx.fillStyle = kleur
  ctx.fillText(annotatie.tekst, pos.x, pos.y)
}

function tekenAfgerondeRechthoek(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Tekent alle annotaties op een context met afmetingen breedte x hoogte (px).
 * Gebruikt zowel door de live editor-overlay als door de platte render, zodat
 * editor en render nooit divergeren (een teken-bron).
 */
export function tekenAnnotaties(
  ctx: CanvasRenderingContext2D,
  annotaties: MaatjeAnnotatie[],
  breedte: number,
  hoogte: number,
) {
  const schaal = bepaalSchaal(breedte, hoogte)
  for (const a of annotaties) {
    if (a.type === 'maatlijn') tekenMaatlijn(ctx, a, breedte, hoogte, schaal)
    else if (a.type === 'pijl') tekenPijl(ctx, a, breedte, hoogte, schaal)
    else if (a.type === 'tekst') tekenTekst(ctx, a, breedte, hoogte, schaal)
  }
}

async function laadBitmap(bron: Blob | string): Promise<ImageBitmap> {
  // Voor URL's eerst als blob ophalen zodat het canvas niet 'tainted' raakt
  // (signed URL is cross-origin); dan decoderen via createImageBitmap.
  const blob = typeof bron === 'string' ? await (await fetch(bron)).blob() : bron
  return createImageBitmap(blob)
}

/**
 * Platte render: foto + annotaties samengevoegd tot een JPEG-blob op de
 * natuurlijke (gecomprimeerde) resolutie van de foto. Niet op schermgrootte,
 * zodat de render scherp blijft in werkbon/PDF (principe 2).
 */
export async function renderMaatje(
  bron: Blob | string,
  annotaties: MaatjeAnnotatie[],
): Promise<Blob> {
  const bitmap = await laadBitmap(bron)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas niet ondersteund')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  tekenAnnotaties(ctx, annotaties, canvas.width, canvas.height)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Render mislukt'))),
      'image/jpeg',
      MAATJE_RENDER_KWALITEIT,
    )
  })
}
