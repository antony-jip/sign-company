import jsPDF from 'jspdf'
import type { WerkbonItem, Klant, Profile, DocumentStyle } from '@/types'
import { getJsPdfFontFamily } from '@/lib/documentTemplates'

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
  toon_briefpapier: boolean
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}

function getBrandColor(profiel: PdfBedrijfsProfiel, docStyle?: DocumentStyle | null): [number, number, number] {
  const kleur = docStyle?.primaryColor || profiel.primaireKleur || '#2563eb'
  return hexToRgb(kleur)
}

function getTextColor(docStyle?: DocumentStyle | null): [number, number, number] {
  if (docStyle?.textColor) {
    try { return hexToRgb(docStyle.textColor) } catch { /* use default */ }
  }
  return [30, 30, 30]
}

function getHeadingFont(docStyle?: DocumentStyle | null): string {
  return getJsPdfFontFamily(docStyle?.headingFont || 'helvetica')
}

function getBodyFont(docStyle?: DocumentStyle | null): string {
  return getJsPdfFontFamily(docStyle?.bodyFont || 'helvetica')
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateString
  }
}

/**
 * Genereert een liggend A4 (landscape) werkbon PDF als instructieblad voor monteurs.
 * GEEN prijzen — puur omschrijvingen, afmetingen, afbeeldingen en notities.
 */
export function generateWerkbonInstructiePDF(
  werkbonData: WerkbonPdfData,
  items: WerkbonItem[],
  klant: Partial<Klant>,
  projectNaam: string,
  bedrijfsProfiel: PdfBedrijfsProfiel,
  docStyle?: DocumentStyle | null
): jsPDF {
  // Landscape A4
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

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
    if (werkbonData.toon_briefpapier && bedrijfsProfiel.logo_url) {
      try {
        doc.addImage(bedrijfsProfiel.logo_url, 'JPEG', marginLeft, y, 25, 15, undefined, 'MEDIUM')
      } catch {
        // logo failed
      }
    }

    const headerX = werkbonData.toon_briefpapier && bedrijfsProfiel.logo_url ? marginLeft + 30 : marginLeft

    // Werkbon nummer + titel
    doc.setFont(headingFont, 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...brand)
    doc.text(`WERKBON ${werkbonData.werkbon_nummer}`, headerX, y + 5)

    if (werkbonData.titel) {
      doc.setFont(bodyFont, 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...textColor)
      doc.text(werkbonData.titel, headerX, y + 11)
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

    // Scheiding
    y += 18
    doc.setDrawColor(...brand)
    doc.setLineWidth(0.5)
    doc.line(marginLeft, y, pageWidth - marginRight, y)

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

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const hasImage = item.afbeeldingen.length > 0
    const hasNote = !!item.interne_notitie
    const hasDimensions = !!(item.afmeting_breedte_mm || item.afmeting_hoogte_mm)

    // Bereken geschatte hoogte voor dit item
    const estimatedHeight = hasImage ? 90 : 40

    // Nieuwe pagina als niet genoeg ruimte
    if (y + estimatedHeight > availableHeight) {
      y = addNewPage()
    }

    // ─── Item layout: afbeelding links, info rechts ───
    const itemStartY = y

    if (hasImage) {
      // Layout: afbeelding links (4:3 ratio), tekst rechts
      const imgWidth = contentWidth * 0.45
      const imgHeight = imgWidth * 0.75 // 4:3 ratio
      const textX = marginLeft + imgWidth + 10
      const textWidth = contentWidth - imgWidth - 10

      // Afbeelding
      const firstImage = item.afbeeldingen[0]
      if (firstImage?.url) {
        try {
          doc.addImage(firstImage.url, 'JPEG', marginLeft, y, imgWidth, imgHeight, undefined, 'MEDIUM')
          // Border rond afbeelding
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.3)
          doc.rect(marginLeft, y, imgWidth, imgHeight)
        } catch {
          // afbeelding laden mislukt - teken placeholder
          doc.setDrawColor(200, 200, 200)
          doc.setFillColor(245, 245, 245)
          doc.rect(marginLeft, y, imgWidth, imgHeight, 'FD')
          doc.setFontSize(8)
          doc.setTextColor(150, 150, 150)
          doc.text('Afbeelding niet beschikbaar', marginLeft + imgWidth / 2, y + imgHeight / 2, { align: 'center' })
        }
      }

      // Tekst rechts naast afbeelding
      let textY = y + 2

      // Item nummer + omschrijving
      doc.setFont(headingFont, 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...brand)
      doc.text(`${i + 1}.`, textX, textY)

      doc.setFont(headingFont, 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...textColor)
      const omschrLines = doc.splitTextToSize(item.omschrijving, textWidth - 10)
      doc.text(omschrLines, textX + 8, textY)
      textY += omschrLines.length * 5 + 4

      // Afmetingen
      if (hasDimensions) {
        doc.setFont(bodyFont, 'bold')
        doc.setFontSize(14)
        doc.setTextColor(...brand)
        doc.text(`${item.afmeting_breedte_mm || '?'} \u00d7 ${item.afmeting_hoogte_mm || '?'} mm`, textX, textY)
        textY += 8
      }

      // Notitie
      if (hasNote) {
        textY += 2
        // Geel achtergrondvlak
        const noteLines = doc.splitTextToSize(item.interne_notitie || '', textWidth - 6)
        const noteHeight = noteLines.length * 4.5 + 6
        doc.setFillColor(255, 251, 235) // warm yellow
        doc.setDrawColor(252, 211, 77)
        doc.roundedRect(textX, textY, textWidth, noteHeight, 2, 2, 'FD')

        doc.setFont(bodyFont, 'bold')
        doc.setFontSize(7)
        doc.setTextColor(161, 98, 7)
        doc.text('NOTITIE', textX + 3, textY + 4)

        doc.setFont(bodyFont, 'normal')
        doc.setFontSize(9)
        doc.setTextColor(120, 53, 15)
        doc.text(noteLines, textX + 3, textY + 9)
        textY += noteHeight + 3
      }

      // Extra afbeeldingen (kleiner, naast elkaar)
      if (item.afbeeldingen.length > 1) {
        textY += 2
        const thumbW = 30
        const thumbH = 22
        let thumbX = textX
        for (let ai = 1; ai < item.afbeeldingen.length && ai < 5; ai++) {
          const afb = item.afbeeldingen[ai]
          if (afb?.url) {
            try {
              doc.addImage(afb.url, 'JPEG', thumbX, textY, thumbW, thumbH, undefined, 'MEDIUM')
              doc.setDrawColor(200, 200, 200)
              doc.setLineWidth(0.2)
              doc.rect(thumbX, textY, thumbW, thumbH)
            } catch { /* skip */ }
          }
          thumbX += thumbW + 3
          if (thumbX + thumbW > pageWidth - marginRight) break
        }
        textY += thumbH + 3
      }

      y = Math.max(itemStartY + imgHeight + 5, textY + 5)
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
