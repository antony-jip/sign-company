import jsPDF from 'jspdf'
import type { WerkbonItem, WerkbonFoto, Klant, Profile, DocumentStyle, WerkbonTekstPositie } from '@/types'
import { getJsPdfFontFamily } from '@/lib/documentTemplates'
import { resolveImageToBase64, detectImageFormat } from '@/services/pdfService'
import { resolveSchaal } from '@/services/werkbonService'
import {
  itemHeeftCanvasData,
  heeftCanvasCoords,
  CANVAS_WERKRUIMTE_MM,
  CANVAS_Z_INDEX_DEFAULTS,
  CANVAS_LOGO_DEFAULT_MM,
} from '@/utils/werkbonCanvas'

interface PdfBedrijfsProfiel extends Partial<Profile> {
  primaireKleur?: string
}

interface WerkbonPdfData {
  werkbon_nummer: string
  titel?: string
  datum: string
  locatie_adres?: string
  locatie_stad?: string
  locatie_postcode?: string
  contact_naam?: string
  contact_telefoon?: string
  toon_briefpapier: boolean
  status?: string
  uren_gewerkt?: number
  monteur_opmerkingen?: string
  klant_handtekening?: string
  klant_naam_getekend?: string
  getekend_op?: string
  aanmaker_naam?: string
}

export interface WerkbonPdfOptions {
  fotos?: WerkbonFoto[]
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}

function getBrandColor(profiel: PdfBedrijfsProfiel, docStyle?: DocumentStyle | null): [number, number, number] {
  const kleur = docStyle?.primaire_kleur || profiel.primaireKleur || '#2563eb'
  return hexToRgb(kleur)
}

function getTextColor(docStyle?: DocumentStyle | null): [number, number, number] {
  if (docStyle?.tekst_kleur) {
    try { return hexToRgb(docStyle.tekst_kleur) } catch (err) { /* use default */ }
  }
  return [30, 30, 30]
}

function getHeadingFont(docStyle?: DocumentStyle | null): string {
  return getJsPdfFontFamily(docStyle?.heading_font || 'helvetica')
}

function getBodyFont(docStyle?: DocumentStyle | null): string {
  return getJsPdfFontFamily(docStyle?.body_font || 'helvetica')
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch (err) {
    return dateString
  }
}

/**
 * Genereert een liggend A4 (landscape) werkbon PDF als instructieblad voor monteurs.
 * GEEN prijzen — puur omschrijvingen, afmetingen, afbeeldingen en notities.
 */
export async function generateWerkbonInstructiePDF(
  werkbonData: WerkbonPdfData,
  items: WerkbonItem[],
  klant: Partial<Klant>,
  projectNaam: string,
  bedrijfsProfiel: PdfBedrijfsProfiel,
  docStyle?: DocumentStyle | null,
  options?: WerkbonPdfOptions
): Promise<jsPDF> {
  // Landscape A4
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Pre-resolve logo to base64 om race condition met browser-cache te vermijden:
  // synchroon `new Image() + img.src = url` had naturalWidth=0 bij eerste render
  // → fallback ratio + half-decoded image bij addImage. Nu base64 + getImageProperties.
  let logoBase64: string | null = null
  if (werkbonData.toon_briefpapier && bedrijfsProfiel.logo_url) {
    logoBase64 = await resolveImageToBase64(bedrijfsProfiel.logo_url)
  }

  // Pre-resolve item-afbeeldingen naar base64 + ratio zodat we object-contain
  // letterbox-renders kunnen doen (jsPDF.addImage rekt anders naar de box).
  const afbCache = new Map<string, { base64: string | null; ratio: number | null }>()
  for (const item of items) {
    for (const afb of item.afbeeldingen || []) {
      if (!afb.url || afbCache.has(afb.id)) continue
      const base64 = await resolveImageToBase64(afb.url)
      let ratio: number | null = null
      if (base64) {
        try {
          const props = doc.getImageProperties(base64)
          if (props.width && props.height) ratio = props.width / props.height
        } catch (err) {
          // leave ratio null; drawImageContain falls back to stretching
        }
      }
      afbCache.set(afb.id, { base64, ratio })
    }
  }

  // Terracotta strip at top (werkbon = uitvoering)
  const pgW0 = doc.internal.pageSize.getWidth()
  doc.setFillColor(154, 90, 72) // #9A5A48
  doc.rect(0, 0, pgW0, 1.5, 'F')

  const brand = getBrandColor(bedrijfsProfiel, docStyle)
  const textColor = getTextColor(docStyle)
  const headingFont = getHeadingFont(docStyle)
  const bodyFont = getBodyFont(docStyle)
  const pageWidth = doc.internal.pageSize.getWidth() // 297mm
  const pageHeight = doc.internal.pageSize.getHeight() // 210mm
  const marginLeft = 15
  const marginRight = 15
  const marginTop = 15
  const marginBottom = 15
  const contentWidth = pageWidth - marginLeft - marginRight

  let currentPage = 1

  function addPageHeader(y: number): number {
    // Logo + bedrijfsnaam (optioneel)
    let logoWidth = 0
    if (logoBase64) {
      try {
        const maxLogoH = 12
        const props = doc.getImageProperties(logoBase64)
        const ratio = props.width / props.height
        logoWidth = maxLogoH * ratio
        doc.addImage(logoBase64, detectImageFormat(logoBase64), marginLeft, y + 1, logoWidth, maxLogoH, undefined, 'MEDIUM')
      } catch (err) {
        // logo failed
      }
    }

    const headerX = logoWidth > 0 ? marginLeft + logoWidth + 5 : marginLeft

    // Werkbon nummer + titel
    doc.setFont(headingFont, 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...brand)
    doc.text(`WERKBON ${werkbonData.werkbon_nummer}`, headerX, y + 5)

    let leftY = y + 11
    if (werkbonData.titel) {
      doc.setFont(bodyFont, 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...textColor)
      doc.text(werkbonData.titel, headerX, leftY)
      leftY += 5
    }

    if (werkbonData.aanmaker_naam) {
      doc.setFont(bodyFont, 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...textColor)
      doc.text(`Aangemaakt door: ${werkbonData.aanmaker_naam}`, headerX, leftY)
    }

    // Rechts: klant + locatie + datum
    const rightX = pageWidth - marginRight
    doc.setFont(bodyFont, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...textColor)

    let rightY = y + 2
    if (klant.bedrijfsnaam) {
      doc.setFont(bodyFont, 'bold')
      doc.text(klant.bedrijfsnaam, rightX, rightY, { align: 'right' })
      rightY += 4
      doc.setFont(bodyFont, 'normal')
    }

    if (projectNaam) {
      doc.text(`Project: ${projectNaam}`, rightX, rightY, { align: 'right' })
      rightY += 4
    }

    const locatieParts = [werkbonData.locatie_adres, werkbonData.locatie_postcode, werkbonData.locatie_stad].filter(Boolean)
    if (locatieParts.length > 0) {
      doc.text(locatieParts.join(', '), rightX, rightY, { align: 'right' })
      rightY += 4
    }

    doc.text(`Datum: ${formatDate(werkbonData.datum)}`, rightX, rightY, { align: 'right' })
    rightY += 4

    if (werkbonData.contact_naam) {
      doc.text(`Contact: ${werkbonData.contact_naam}${werkbonData.contact_telefoon ? ` · ${werkbonData.contact_telefoon}` : ''}`, rightX, rightY, { align: 'right' })
      rightY += 4
    }

    // Scheiding (whitespace, geen lijn)
    y += 18

    return y + 5
  }

  function addNewPage(): number {
    doc.addPage('a4', 'landscape')
    currentPage++
    // Terracotta strip on new pages too
    doc.setFillColor(154, 90, 72) // #9A5A48
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 1.5, 'F')
    return addPageHeader(marginTop)
  }

  // Bepaal hoeveel items per pagina
  // Landscape A4 = 297 x 210mm
  // Na header: ~185mm beschikbaar
  // 1 item met grote afbeelding: ~170mm
  // 2 items: ~85mm elk

  let y = addPageHeader(marginTop)
  const availableHeight = pageHeight - marginBottom

  // Helper: teken één afbeelding met border (of placeholder)
  function drawImage(url: string, x: number, iy: number, w: number, h: number) {
    if (!url) {
      doc.setDrawColor(200, 200, 200)
      doc.setFillColor(245, 245, 245)
      doc.rect(x, iy, w, h, 'FD')
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('Afbeelding niet beschikbaar', x + w / 2, iy + h / 2, { align: 'center' })
      return
    }
    try {
      doc.addImage(url, 'JPEG', x, iy, w, h, undefined, 'MEDIUM')
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.rect(x, iy, w, h)
    } catch (err) {
      doc.setDrawColor(200, 200, 200)
      doc.setFillColor(245, 245, 245)
      doc.rect(x, iy, w, h, 'FD')
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('Afbeelding niet beschikbaar', x + w / 2, iy + h / 2, { align: 'center' })
    }
  }

  // Teken een afbeelding object-contain binnen een box: bron-aspect-ratio
  // behouden, witruimte rondom (geen fill, geen border — laat de pagina-bg
  // doorzichtig). Valt terug op drawImage als er geen base64+ratio is.
  function drawImageContain(
    base64: string | null,
    ratio: number | null,
    fallbackUrl: string,
    x: number,
    iy: number,
    boxW: number,
    boxH: number,
  ) {
    if (!base64 || !ratio) {
      drawImage(fallbackUrl, x, iy, boxW, boxH)
      return
    }
    const boxRatio = boxW / boxH
    let actualW = boxW
    let actualH = boxH
    if (ratio > boxRatio) {
      actualH = boxW / ratio
    } else {
      actualW = boxH * ratio
    }
    const xOff = (boxW - actualW) / 2
    const yOff = (boxH - actualH) / 2
    try {
      doc.addImage(base64, 'JPEG', x + xOff, iy + yOff, actualW, actualH, undefined, 'MEDIUM')
    } catch (err) {
      // base64 kon niet worden geplaatst — toon placeholder
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('Afbeelding niet beschikbaar', x + boxW / 2, iy + boxH / 2, { align: 'center' })
    }
  }

  const colGap = 6
  function sizeFor(schaalPercentage: number): { w: number; h: number } {
    if (schaalPercentage <= 40) {
      return { w: 85, h: 64 }
    }
    if (schaalPercentage <= 75) {
      return { w: 130, h: 98 }
    }
    return { w: 267, h: 100 }
  }

  const LOGO_BBOX = 40

  // Rendert het tekst-blok (itemnummer + omschrijving + afmetingen + notitie)
  // op een willekeurige (x, y) met opgegeven breedte. Retourneert de bottom-y.
  // Gebruikt door zowel het bestaande flow-pad als de tekst-positie-aware
  // single-image layout (fase 2, masterplan §8.2).
  function renderTekstBlok(
    item: WerkbonItem,
    itemIndex: number,
    tx: number,
    ty: number,
    tw: number,
  ): number {
    const hasDim = !!(item.afmeting_breedte_mm || item.afmeting_hoogte_mm)
    const hasNoteLocal = !!item.interne_notitie

    doc.setFont(headingFont, 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...brand)
    doc.text(`${itemIndex + 1}.`, tx, ty + 2)

    doc.setFont(headingFont, 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...textColor)
    const omschrLines = doc.splitTextToSize(item.omschrijving, tw - 12)
    doc.text(omschrLines, tx + 10, ty + 2)
    let localY = ty + omschrLines.length * 5 + 4

    if (hasDim) {
      doc.setFont(bodyFont, 'bold')
      doc.setFontSize(14)
      doc.setTextColor(...brand)
      doc.text(`${item.afmeting_breedte_mm || '?'} × ${item.afmeting_hoogte_mm || '?'} mm`, tx + 10, localY)
      localY += 8
    }

    if (hasNoteLocal) {
      localY += 2
      const noteLines = doc.splitTextToSize(item.interne_notitie || '', tw - 6)
      const noteHeight = noteLines.length * 4.5 + 6
      doc.setFillColor(255, 251, 235)
      doc.setDrawColor(252, 211, 77)
      doc.roundedRect(tx, localY, tw, noteHeight, 2, 2, 'FD')

      doc.setFont(bodyFont, 'bold')
      doc.setFontSize(7)
      doc.setTextColor(161, 98, 7)
      doc.text('NOTITIE', tx + 3, localY + 4)

      doc.setFont(bodyFont, 'normal')
      doc.setFontSize(9)
      doc.setTextColor(120, 53, 15)
      doc.text(noteLines, tx + 3, localY + 9)
      localY += noteHeight + 3
    }

    return localY
  }

  // Fase-3 coord-render: tekstblok bovenaan over volledige breedte, daarna
  // een canvas-area van 267x100mm waarin elke afbeelding op zijn absolute
  // (x_mm, y_mm, breedte_mm, hoogte_mm) wordt geplaatst. contentWidth is
  // exact 267mm (pageWidth 297 minus 2x 15mm marges), dus de canvas-coordinaten
  // mappen 1:1 op PDF-coordinaten — geen schaling nodig.
  function renderCanvasItem(item: WerkbonItem, itemIndex: number): void {
    // Page-break check op basis van de werkelijke tekstblok-hoogte per item.
    // Spiegelt 1-op-1 de maat-logica in renderTekstBlok (regel 305-356):
    //   omschr      = 4 top-pad + lines*5 + 4 bottom-pad
    //   afmeting    = +8 als aanwezig
    //   notitie     = +2 top-pad + lines*4.5 + 6 box-pad + 3 bottom-pad
    // Zo voorkomen we onnodige page-breaks bij korte items zonder notitie,
    // én clipping bij items met lange notities.
    const omschrLines = doc.splitTextToSize(item.omschrijving || '', contentWidth - 12).length || 1
    const hasDim = !!(item.afmeting_breedte_mm || item.afmeting_hoogte_mm)
    const noteLines = item.interne_notitie
      ? doc.splitTextToSize(item.interne_notitie, contentWidth - 6).length
      : 0
    const textEstimate = 8 + omschrLines * 5
      + (hasDim ? 8 : 0)
      + (noteLines > 0 ? 11 + noteLines * 4.5 : 0)

    const canvasH = CANVAS_WERKRUIMTE_MM.hoogte
    const estimatedHeight = textEstimate + 4 + canvasH + 5

    if (y + estimatedHeight > availableHeight) {
      y = addNewPage()
    }

    const textBottom = renderTekstBlok(item, itemIndex, marginLeft, y, contentWidth)
    const canvasY = textBottom + 4

    // Z-sort: lager z eerst (achter), tiebreaker created_at (newer-on-top).
    // Identieke fallback-logica als WerkbonCanvas zodat DOM-stacking in de
    // editor en PDF-stacking in de output nooit divergeren.
    const canvasElementen = [...item.afbeeldingen]
      .filter((a) => heeftCanvasCoords(a.layout))
      .sort((a, b) => {
        const blokA = a.layout?.blok_type ?? 'foto'
        const blokB = b.layout?.blok_type ?? 'foto'
        const za = a.layout?.z_index ?? CANVAS_Z_INDEX_DEFAULTS[blokA]
        const zb = b.layout?.z_index ?? CANVAS_Z_INDEX_DEFAULTS[blokB]
        if (za !== zb) return za - zb
        return a.created_at.localeCompare(b.created_at)
      })

    for (const afb of canvasElementen) {
      if (!afb.url) continue
      const layout = afb.layout!
      const blokType = layout.blok_type ?? 'foto'
      const defaultSize = blokType === 'logo' ? CANVAS_LOGO_DEFAULT_MM : 60
      const ex = marginLeft + (layout.canvas_x_mm ?? 0)
      const ey = canvasY + (layout.canvas_y_mm ?? 0)
      const ew = layout.canvas_breedte_mm ?? defaultSize
      const eh = layout.canvas_hoogte_mm ?? (blokType === 'logo' ? defaultSize : 40)
      const cached = afbCache.get(afb.id)
      drawImageContain(cached?.base64 ?? null, cached?.ratio ?? null, afb.url, ex, ey, ew, eh)
    }

    y = canvasY + canvasH + 5
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    // Per-item router (masterplan §8.3 v1.2): items met canvas-coordinaten
    // gaan via het coord-pad, alle andere items blijven op het bestaande
    // flow-pad. Geen migratie-data-write nodig — items zonder canvas_x_mm
    // (legacy + versie<3) volgen exact het oude gedrag.
    if (itemHeeftCanvasData(item.afbeeldingen)) {
      renderCanvasItem(item, i)
      if (i < items.length - 1) {
        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.2)
        doc.line(marginLeft, y, pageWidth - marginRight, y)
        y += 5
      }
      continue
    }

    const logos = item.afbeeldingen.filter((a) => a.layout?.blok_type === 'logo')
    // PDF-blok-type wordt bewust als foto behandeld: bij upload zet Stream E2
    // de eerste PDF-pagina om naar PNG/JPEG, dus zelfde render-pad als foto's
    // (masterplan §2.5).
    const fotos = item.afbeeldingen.filter((a) => a.layout?.blok_type !== 'logo')
    const hasImage = fotos.length > 0
    const hasNote = !!item.interne_notitie
    const hasDimensions = !!(item.afmeting_breedte_mm || item.afmeting_hoogte_mm)

    // Tekst-positie van de eerste foto bepaalt de layout-keuze voor het item.
    // Bij meerdere afbeeldingen valt het terug op 'onder' (het bestaande
    // flow-pad), zoals afgesproken in fase 2 (masterplan §8.2).
    const primair = fotos[0]
    const tekstPositie: WerkbonTekstPositie = primair?.layout?.tekst_positie ?? 'onder'
    const enkeleFotoMetPositie = hasImage && fotos.length === 1 && tekstPositie !== 'onder'

    // Bereken geschatte hoogte voor dit item
    const hasGroot = hasImage && fotos.some((a) => resolveSchaal(a) >= 76)
    const estimatedHeight = hasImage ? (hasGroot ? 150 : 90) : 40

    // Nieuwe pagina als niet genoeg ruimte
    if (y + estimatedHeight > availableHeight) {
      y = addNewPage()
    }

    // ─── Item layout: flow-row van afbeeldingen + tekst eronder ───
    const itemStartY = y

    // Logo-blok-type: vast 40×40mm rechtsboven binnen de item-block.
    // Bewust niet-flow: overschrijft NIET de tekst-block, maar kan overlappen
    // met een 'groot' foto-blok dat de volle contentbreedte gebruikt.
    // Vrij plaatsbaar pas in fase 3 (masterplan §2.4).
    const logoX = marginLeft + contentWidth - LOGO_BBOX
    for (const logo of logos) {
      if (!logo.url) continue
      const cached = afbCache.get(logo.id)
      drawImageContain(cached?.base64 ?? null, cached?.ratio ?? null, logo.url, logoX, itemStartY, LOGO_BBOX, LOGO_BBOX)
    }

    if (enkeleFotoMetPositie && primair?.url) {
      // Single-image layout met expliciete tekst-positie (fase 2, masterplan §8.2).
      // Tekst-positie semantiek: 'links'/'rechts' = side-by-side (tekst aan die
      // kant t.o.v. de afbeelding); 'boven' = tekst boven, image eronder.
      const { w: rawBoxW, h: rawBoxH } = sizeFor(resolveSchaal(primair))
      const cachedPrimair = afbCache.get(primair.id)

      let imageBottom: number
      let textBottom: number

      if (tekstPositie === 'links' || tekstPositie === 'rechts') {
        // Side-by-side: cap de boxbreedte op de helft minus colGap zodat er
        // ruimte overblijft voor de tekst-kolom (ook bij 'groot' = 267mm).
        const maxBoxW = (contentWidth - colGap) / 2
        const boxW = Math.min(rawBoxW, maxBoxW)
        const boxH = rawBoxH
        const tekstW = contentWidth - boxW - colGap

        const imageX = tekstPositie === 'links'
          ? marginLeft + tekstW + colGap
          : marginLeft
        const tekstX = tekstPositie === 'links'
          ? marginLeft
          : marginLeft + boxW + colGap

        drawImageContain(cachedPrimair?.base64 ?? null, cachedPrimair?.ratio ?? null, primair.url, imageX, y, boxW, boxH)
        imageBottom = y + boxH

        textBottom = renderTekstBlok(item, i, tekstX, y, tekstW)
      } else {
        // 'boven': tekst eerst, image eronder, gecentreerd.
        const boxW = Math.min(rawBoxW, contentWidth)
        const boxH = rawBoxH
        textBottom = renderTekstBlok(item, i, marginLeft, y, contentWidth)
        const imageY = textBottom + colGap
        const imageX = marginLeft + (contentWidth - boxW) / 2
        drawImageContain(cachedPrimair?.base64 ?? null, cachedPrimair?.ratio ?? null, primair.url, imageX, imageY, boxW, boxH)
        imageBottom = imageY + boxH
      }

      y = Math.max(imageBottom, textBottom) + 5
    } else if (hasImage) {
      const colW = (contentWidth - colGap) / 2  // tekst-kolom-breedte (= huidige "normaal")
      const col2X = marginLeft + colW + colGap

      // Flow-based afbeeldingen-render: per afbeelding bepaalt schaal_percentage
      // de bounding-box; volle breedte (>75%) forceert nieuwe rij.
      let rowX = marginLeft
      let rowY = y
      let rowMaxH = 0
      const rightEdge = marginLeft + contentWidth + 0.1
      // Render alleen de eerste twee afbeeldingen via flow; 3+ blijven via de
      // bestaande thumbnail-fallback hieronder (upload-flow maxt momenteel op 2).
      const flowCount = Math.min(2, fotos.length)
      for (let ai = 0; ai < flowCount; ai++) {
        const afb = fotos[ai]
        if (!afb?.url) continue
        const { w, h } = sizeFor(resolveSchaal(afb))
        if (rowX > marginLeft && rowX + w > rightEdge) {
          rowY += rowMaxH + colGap
          rowX = marginLeft
          rowMaxH = 0
        }
        const cached = afbCache.get(afb.id)
        drawImageContain(cached?.base64 ?? null, cached?.ratio ?? null, afb.url, rowX, rowY, w, h)
        rowX += w + colGap
        rowMaxH = Math.max(rowMaxH, h)
      }
      const imageBlockBottom = rowY + rowMaxH

      // Tekst-rij: omschrijving + afmetingen + notitie onder de afbeeldingen
      let textY = imageBlockBottom + 4

      // Item nummer + omschrijving
      doc.setFont(headingFont, 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...brand)
      doc.text(`${i + 1}.`, marginLeft, textY + 2)

      doc.setFont(headingFont, 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...textColor)
      const omschrLines = doc.splitTextToSize(item.omschrijving, colW - 12)
      doc.text(omschrLines, marginLeft + 10, textY + 2)
      textY += omschrLines.length * 5 + 4

      // Afmetingen
      if (hasDimensions) {
        doc.setFont(bodyFont, 'bold')
        doc.setFontSize(14)
        doc.setTextColor(...brand)
        doc.text(`${item.afmeting_breedte_mm || '?'} \u00d7 ${item.afmeting_hoogte_mm || '?'} mm`, marginLeft + 10, textY)
        textY += 8
      }

      // Notitie
      if (hasNote) {
        textY += 2
        const noteLines = doc.splitTextToSize(item.interne_notitie || '', colW - 6)
        const noteHeight = noteLines.length * 4.5 + 6
        doc.setFillColor(255, 251, 235)
        doc.setDrawColor(252, 211, 77)
        doc.roundedRect(marginLeft, textY, colW, noteHeight, 2, 2, 'FD')

        doc.setFont(bodyFont, 'bold')
        doc.setFontSize(7)
        doc.setTextColor(161, 98, 7)
        doc.text('NOTITIE', marginLeft + 3, textY + 4)

        doc.setFont(bodyFont, 'normal')
        doc.setFontSize(9)
        doc.setTextColor(120, 53, 15)
        doc.text(noteLines, marginLeft + 3, textY + 9)
        textY += noteHeight + 3
      }

      // Extra afbeeldingen (3+) als thumbnails rechtsonder.
      // Dead code zolang upload-flow op 2 maxt; behouden voor toekomstige
      // cap-verhoging. Gebruikt imageBlockBottom als anker i.p.v. de
      // verwijderde fixed imgH.
      if (fotos.length > 2) {
        let thumbY = imageBlockBottom + 4
        const thumbW = 30
        const thumbH = 22
        let thumbX = col2X
        for (let ai = 2; ai < fotos.length && ai < 6; ai++) {
          const afb = fotos[ai]
          if (afb?.url) {
            try {
              doc.addImage(afb.url, 'JPEG', thumbX, thumbY, thumbW, thumbH, undefined, 'MEDIUM')
              doc.setDrawColor(200, 200, 200)
              doc.setLineWidth(0.2)
              doc.rect(thumbX, thumbY, thumbW, thumbH)
            } catch (err) { /* skip */ }
          }
          thumbX += thumbW + 3
          if (thumbX + thumbW > pageWidth - marginRight) {
            thumbX = col2X
            thumbY += thumbH + 3
          }
        }
      }

      y = textY + 5
    } else {
      // Layout: geen afbeelding, volledige breedte tekst

      // Item nummer + omschrijving
      doc.setFont(headingFont, 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...brand)
      doc.text(`${i + 1}.`, marginLeft, y + 2)

      doc.setFont(headingFont, 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...textColor)
      const omschrLines = doc.splitTextToSize(item.omschrijving, contentWidth - 12)
      doc.text(omschrLines, marginLeft + 10, y + 2)
      y += omschrLines.length * 5 + 4

      // Afmetingen
      if (hasDimensions) {
        doc.setFont(bodyFont, 'bold')
        doc.setFontSize(14)
        doc.setTextColor(...brand)
        doc.text(`${item.afmeting_breedte_mm || '?'} \u00d7 ${item.afmeting_hoogte_mm || '?'} mm`, marginLeft + 10, y)
        y += 8
      }

      // Notitie
      if (hasNote) {
        const noteLines = doc.splitTextToSize(item.interne_notitie || '', contentWidth - 16)
        const noteHeight = noteLines.length * 4.5 + 6
        doc.setFillColor(255, 251, 235)
        doc.setDrawColor(252, 211, 77)
        doc.roundedRect(marginLeft, y, contentWidth, noteHeight, 2, 2, 'FD')

        doc.setFont(bodyFont, 'bold')
        doc.setFontSize(7)
        doc.setTextColor(161, 98, 7)
        doc.text('NOTITIE', marginLeft + 3, y + 4)

        doc.setFont(bodyFont, 'normal')
        doc.setFontSize(9)
        doc.setTextColor(120, 53, 15)
        doc.text(noteLines, marginLeft + 3, y + 9)
        y += noteHeight + 3
      }

      y += 5
    }

    // Scheiding tussen items
    if (i < items.length - 1) {
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.2)
      doc.line(marginLeft, y, pageWidth - marginRight, y)
      y += 5
    }
  }

  // ─── Handtekening rechtsonder op laatste pagina ───
  const hasSignature = werkbonData.klant_handtekening && werkbonData.klant_handtekening.startsWith('data:')
  const hasSigneeName = werkbonData.klant_naam_getekend && werkbonData.klant_naam_getekend.trim().length > 0
  if (hasSignature || hasSigneeName) {
    try {
      const sigX = pageWidth - marginRight - 70
      const sigY = pageHeight - 50

      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(sigX, sigY, pageWidth - marginRight, sigY)

      if (hasSignature) {
        try {
          doc.addImage(werkbonData.klant_handtekening!, 'PNG', sigX, sigY + 1, 55, 22)
        } catch { /* skip broken image */ }
      }

      doc.setFont(bodyFont, 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...textColor)

      if (hasSigneeName) {
        doc.text(werkbonData.klant_naam_getekend!, sigX, sigY + 27)
      }

      if (werkbonData.getekend_op) {
        doc.setFontSize(7)
        doc.setTextColor(150, 150, 150)
        doc.text(formatDate(werkbonData.getekend_op), sigX, sigY + 31)
      }

      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text('Handtekening klant', sigX, sigY - 2)
    } catch { /* skip signature section on error */ }
  }

  // ─── Monteur feedback sectie (alleen bij afgeronde werkbonnen) ───
  const isAfgerond = werkbonData.status === 'afgerond' || werkbonData.status === 'definitief'
  const hasFeedback = werkbonData.uren_gewerkt || werkbonData.monteur_opmerkingen || werkbonData.klant_handtekening || (options?.fotos && options.fotos.length > 0)

  if (isAfgerond && hasFeedback) {
    doc.addPage()
    let fy = marginTop

    // Sectie header
    doc.setFillColor(...brand)
    doc.rect(marginLeft, fy, pageWidth - marginLeft - marginRight, 8, 'F')
    doc.setFont(headingFont, 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text('MONTEUR FEEDBACK', marginLeft + 4, fy + 5.5)
    fy += 14

    // Uren
    if (werkbonData.uren_gewerkt) {
      doc.setFont(bodyFont, 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...textColor)
      doc.text('Uren gewerkt:', marginLeft, fy)
      doc.setFont(bodyFont, 'normal')
      doc.text(`${werkbonData.uren_gewerkt} uur`, marginLeft + 35, fy)
      fy += 7
    }

    // Opmerkingen
    if (werkbonData.monteur_opmerkingen) {
      doc.setFont(bodyFont, 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...textColor)
      doc.text('Opmerkingen:', marginLeft, fy)
      fy += 5
      doc.setFont(bodyFont, 'normal')
      doc.setFontSize(8)
      const opLines = doc.splitTextToSize(werkbonData.monteur_opmerkingen, pageWidth - marginLeft - marginRight)
      doc.text(opLines, marginLeft, fy)
      fy += opLines.length * 4 + 5
    }

    // Foto's
    const fotos = options?.fotos || []
    if (fotos.length > 0) {
      doc.setFont(bodyFont, 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...textColor)
      doc.text(`Foto's (${fotos.length})`, marginLeft, fy)
      fy += 6

      const fotoGroepen = [
        { label: 'Voor', items: fotos.filter(f => f.type === 'voor') },
        { label: 'Na', items: fotos.filter(f => f.type === 'na') },
        { label: 'Overig', items: fotos.filter(f => f.type === 'overig') },
      ]

      for (const groep of fotoGroepen) {
        if (groep.items.length === 0) continue
        doc.setFont(bodyFont, 'bold')
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(groep.label, marginLeft, fy)
        fy += 4

        let fx = marginLeft
        const fotoW = 50
        const fotoH = 37.5
        for (const foto of groep.items) {
          if (fx + fotoW > pageWidth - marginRight) {
            fx = marginLeft
            fy += fotoH + 4
          }
          if (fy + fotoH > pageHeight - 15) {
            doc.addPage()
            fy = marginTop
          }
          if (foto.url) {
            try {
              doc.addImage(foto.url, 'JPEG', fx, fy, fotoW, fotoH)
            } catch { /* skip broken images */ }
          }
          fx += fotoW + 4
        }
        fy += fotoH + 6
      }
    }

    // Handtekening
    if (werkbonData.klant_handtekening) {
      if (fy + 50 > pageHeight - 15) {
        doc.addPage()
        fy = marginTop
      }

      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(marginLeft, fy, pageWidth - marginRight, fy)
      fy += 6

      doc.setFont(headingFont, 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...textColor)
      doc.text('Handtekening klant', marginLeft, fy)
      fy += 6

      try {
        doc.addImage(werkbonData.klant_handtekening, 'PNG', marginLeft, fy, 60, 30)
      } catch { /* skip */ }
      fy += 34

      if (werkbonData.klant_naam_getekend) {
        doc.setFont(bodyFont, 'normal')
        doc.setFontSize(9)
        doc.text(`Naam: ${werkbonData.klant_naam_getekend}`, marginLeft, fy)
        fy += 5
      }
      if (werkbonData.getekend_op) {
        doc.setFont(bodyFont, 'normal')
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.text(`Datum: ${formatDate(werkbonData.getekend_op)}`, marginLeft, fy)
      }
    }
  }

  // Paginanummering
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont(bodyFont, 'normal')
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`${werkbonData.werkbon_nummer} — Pagina ${p} van ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
  }

  return doc
}
