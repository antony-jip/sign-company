import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Offerte, OfferteItem, Klant, Profile, DocumentStyle, WerkbonRegel, WerkbonFoto } from '@/types'
import { getJsPdfFontFamily } from '@/lib/documentTemplates'
import { round2 } from '@/utils/budgetUtils'

// jspdf-autotable adds lastAutoTable to jsPDF instances
interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number }
}

// Extended profile type for PDF with branding
interface PdfBedrijfsProfiel extends Partial<Profile> {
  primaireKleur?: string
}

// ============ HELPERS ============

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return [isNaN(r) ? 41 : r, isNaN(g) ? 65 : g, isNaN(b) ? 122 : b]
}

function getBrandColor(profiel: PdfBedrijfsProfiel, docStyle?: DocumentStyle | null): [number, number, number] {
  if (docStyle?.primaire_kleur) return hexToRgb(docStyle.primaire_kleur)
  if (profiel.primaireKleur) return hexToRgb(profiel.primaireKleur)
  return [41, 65, 122] // default dark blue
}

function getTextColor(docStyle?: DocumentStyle | null): [number, number, number] {
  if (docStyle?.tekst_kleur) return hexToRgb(docStyle.tekst_kleur)
  return [60, 60, 60]
}

function getTableHeaderColor(docStyle?: DocumentStyle | null, brand?: [number, number, number]): [number, number, number] {
  if (docStyle?.tabel_header_kleur) return hexToRgb(docStyle.tabel_header_kleur)
  return brand || [41, 65, 122]
}

function getTableTheme(docStyle?: DocumentStyle | null): 'striped' | 'grid' | 'plain' {
  return docStyle?.tabel_stijl || 'striped'
}

function getHeadingFont(docStyle?: DocumentStyle | null): string {
  if (docStyle?.heading_font) return getJsPdfFontFamily(docStyle.heading_font)
  return 'helvetica'
}

function getBodyFont(docStyle?: DocumentStyle | null): string {
  if (docStyle?.body_font) return getJsPdfFontFamily(docStyle.body_font)
  return 'helvetica'
}

function getBaseFontSize(docStyle?: DocumentStyle | null): number {
  return docStyle?.font_grootte_basis || 10
}

function getMargins(docStyle?: DocumentStyle | null): { top: number; bottom: number; left: number; right: number } {
  return {
    top: docStyle?.marge_boven ?? 15,
    bottom: docStyle?.marge_onder ?? 20,
    left: docStyle?.marge_links ?? 20,
    right: docStyle?.marge_rechts ?? 20,
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ============ BRIEFPAPIER BACKGROUND ============

function addBriefpapierBackground(doc: jsPDF, docStyle: DocumentStyle | null | undefined, pageNum: number): void {
  if (!docStyle?.briefpapier_url || docStyle.briefpapier_modus === 'geen') return
  if (docStyle.briefpapier_modus === 'alleen_eerste_pagina' && pageNum > 1) return

  try {
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.addImage(docStyle.briefpapier_url, 'PNG', 0, 0, pageWidth, pageHeight)
  } catch {
    // Briefpapier loading failed silently
  }
}

// ============ STYLED HEADER ============

function addHeader(
  doc: jsPDF,
  bedrijfsProfiel: PdfBedrijfsProfiel,
  title: string,
  nummer: string,
  docStyle?: DocumentStyle | null
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const brand = getBrandColor(bedrijfsProfiel, docStyle)
  const margins = getMargins(docStyle)
  const headingFont = getHeadingFont(docStyle)
  const bodyFont = getBodyFont(docStyle)
  const baseFontSize = getBaseFontSize(docStyle)

  // Briefpapier background for page 1
  addBriefpapierBackground(doc, docStyle, 1)

  // Check if header should be shown
  if (docStyle && !docStyle.toon_header) {
    return margins.top + 10
  }

  const logoPositie = docStyle?.logo_positie || 'links'
  const logoGrootte = docStyle?.logo_grootte ?? 100
  const logoScale = logoGrootte / 100

  // Company logo + name area
  let nameX = margins.left
  const logoW = 25 * logoScale
  const logoH = 20 * logoScale

  if (bedrijfsProfiel.logo_url) {
    try {
      if (logoPositie === 'rechts') {
        doc.addImage(bedrijfsProfiel.logo_url, 'PNG', pageWidth - margins.right - logoW, margins.top, logoW, logoH)
      } else if (logoPositie === 'midden') {
        doc.addImage(bedrijfsProfiel.logo_url, 'PNG', (pageWidth - logoW) / 2, margins.top, logoW, logoH)
      } else {
        doc.addImage(bedrijfsProfiel.logo_url, 'PNG', margins.left, margins.top, logoW, logoH)
        nameX = margins.left + logoW + 5
      }
    } catch {
      // Logo loading failed, just show text
    }
  }

  // Company name
  const nameY = margins.top + 15
  doc.setFontSize(baseFontSize * 2.2)
  doc.setFont(headingFont, 'bold')
  doc.setTextColor(...brand)

  if (logoPositie === 'midden') {
    doc.text(bedrijfsProfiel.bedrijfsnaam || 'Uw Bedrijf', pageWidth / 2, nameY + logoH + 5, { align: 'center' })
  } else if (logoPositie === 'rechts') {
    doc.text(bedrijfsProfiel.bedrijfsnaam || 'Uw Bedrijf', margins.left, nameY)
  } else {
    doc.text(bedrijfsProfiel.bedrijfsnaam || 'Uw Bedrijf', nameX, nameY)
  }

  // Company details (opposite side of logo)
  doc.setFontSize(baseFontSize - 1)
  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(100, 100, 100)

  const detailsAlign = logoPositie === 'rechts' ? 'left' : 'right'
  const detailsX = logoPositie === 'rechts' ? margins.left : pageWidth - margins.right
  let rightY = margins.top + 5

  if (logoPositie !== 'midden') {
    if (bedrijfsProfiel.bedrijfs_adres) {
      doc.text(bedrijfsProfiel.bedrijfs_adres, detailsX, rightY, { align: detailsAlign })
      rightY += 5
    }
    const displayTel = bedrijfsProfiel.bedrijfs_telefoon || bedrijfsProfiel.telefoon
    if (displayTel) {
      doc.text(`Tel: ${displayTel}`, detailsX, rightY, { align: detailsAlign })
      rightY += 5
    }
    const displayEmail = bedrijfsProfiel.bedrijfs_email || bedrijfsProfiel.email
    if (displayEmail) {
      doc.text(displayEmail, detailsX, rightY, { align: detailsAlign })
      rightY += 5
    }
    if (bedrijfsProfiel.kvk_nummer) {
      doc.text(`KvK: ${bedrijfsProfiel.kvk_nummer}`, detailsX, rightY, { align: detailsAlign })
      rightY += 5
    }
    if (bedrijfsProfiel.btw_nummer) {
      doc.text(`BTW: ${bedrijfsProfiel.btw_nummer}`, detailsX, rightY, { align: detailsAlign })
      rightY += 5
    }
  }

  // Divider line
  const lineY = margins.top + 27
  doc.setDrawColor(...brand)
  doc.setLineWidth(0.5)
  doc.line(margins.left, lineY, pageWidth - margins.right, lineY)

  // Document title and number
  doc.setFontSize(baseFontSize * 1.6)
  doc.setFont(headingFont, 'bold')
  doc.setTextColor(...brand)
  doc.text(title, margins.left, lineY + 12)

  doc.setFontSize(baseFontSize)
  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`Nummer: ${nummer}`, margins.left, lineY + 19)
  doc.text(`Datum: ${formatDate(new Date().toISOString())}`, margins.left, lineY + 25)

  return lineY + 32
}

// ============ STYLED CLIENT INFO ============

function addClientInfo(
  doc: jsPDF,
  klant: Partial<Klant>,
  startY: number,
  docStyle?: DocumentStyle | null
): number {
  const margins = getMargins(docStyle)
  const bodyFont = getBodyFont(docStyle)
  const baseFontSize = getBaseFontSize(docStyle)
  const textColor = getTextColor(docStyle)

  doc.setFontSize(baseFontSize)
  doc.setFont(bodyFont, 'bold')
  doc.setTextColor(...textColor)
  doc.text('Aan:', margins.left, startY)

  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(...textColor)

  let y = startY + 6
  if (klant.bedrijfsnaam) {
    doc.setFont(bodyFont, 'bold')
    doc.text(klant.bedrijfsnaam, margins.left, y)
    doc.setFont(bodyFont, 'normal')
    y += 5
  }
  if (klant.contactpersoon) {
    doc.text(`t.a.v. ${klant.contactpersoon}`, margins.left, y)
    y += 5
  }
  if (klant.adres) {
    doc.text(klant.adres, margins.left, y)
    y += 5
  }
  if (klant.postcode || klant.stad) {
    doc.text(`${klant.postcode || ''} ${klant.stad || ''}`.trim(), margins.left, y)
    y += 5
  }
  if (klant.land && klant.land !== 'Nederland') {
    doc.text(klant.land, margins.left, y)
    y += 5
  }

  return y + 5
}

// ============ STYLED FOOTER ============

function addFooter(doc: jsPDF, bedrijfsProfiel: Partial<Profile>, docStyle?: DocumentStyle | null): void {
  if (docStyle && !docStyle.toon_footer) return

  const pageCount = doc.getNumberOfPages()
  const margins = getMargins(docStyle)
  const bodyFont = getBodyFont(docStyle)

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Get per-page dimensions (portrait vs landscape pages differ)
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()

    // Add briefpapier background on subsequent pages
    if (i > 1) addBriefpapierBackground(doc, docStyle, i)

    // Detect landscape pages (bijlage pages): only show page number, no line or company text
    const isLandscape = pw > ph

    doc.setFontSize(8)
    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(150, 150, 150)

    if (!isLandscape) {
      // Footer line
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(margins.left, ph - margins.bottom, pw - margins.right, ph - margins.bottom)

      // Footer text (company info)
      let footerText = ''
      if (docStyle?.footer_tekst) {
        footerText = docStyle.footer_tekst
      } else {
        const footerParts: string[] = []
        if (bedrijfsProfiel.bedrijfsnaam) footerParts.push(bedrijfsProfiel.bedrijfsnaam)
        if (bedrijfsProfiel.kvk_nummer) footerParts.push(`KvK: ${bedrijfsProfiel.kvk_nummer}`)
        if (bedrijfsProfiel.btw_nummer) footerParts.push(`BTW: ${bedrijfsProfiel.btw_nummer}`)
        if (bedrijfsProfiel.iban) footerParts.push(`IBAN: ${bedrijfsProfiel.iban}`)
        footerText = footerParts.join(' | ')
      }

      doc.text(footerText, margins.left, ph - margins.bottom + 6)
      doc.text(`Pagina ${i} van ${pageCount}`, pw - margins.right, ph - margins.bottom + 6, {
        align: 'right',
      })
    } else {
      // Landscape: only page number, bottom-right
      doc.text(`Pagina ${i} van ${pageCount}`, pw - 10, ph - 5, {
        align: 'right',
      })
    }
  }
}

// ============ TABLE STYLE HELPERS ============

function getAutoTableStyles(brand: [number, number, number], docStyle?: DocumentStyle | null) {
  const tableHeaderColor = getTableHeaderColor(docStyle, brand)
  const textColor = getTextColor(docStyle)
  const tableTheme = getTableTheme(docStyle)
  const bodyFont = getBodyFont(docStyle)
  const baseFontSize = getBaseFontSize(docStyle)

  return {
    theme: tableTheme,
    headStyles: {
      fillColor: tableHeaderColor,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: baseFontSize - 1,
      font: bodyFont,
    },
    bodyStyles: {
      fontSize: baseFontSize - 1,
      textColor: textColor,
      font: bodyFont,
    },
    alternateRowStyles: {
      fillColor: tableTheme === 'striped' ? [245, 247, 250] as [number, number, number] : undefined,
    },
  }
}

// ============ OFFERTE PDF ============

export function generateOffertePDF(
  offerte: Offerte,
  items: OfferteItem[],
  klant: Partial<Klant>,
  bedrijfsProfiel: PdfBedrijfsProfiel,
  docStyle?: DocumentStyle | null
): jsPDF {
  const brand = getBrandColor(bedrijfsProfiel, docStyle)
  const margins = getMargins(docStyle)
  const headingFont = getHeadingFont(docStyle)
  const bodyFont = getBodyFont(docStyle)
  const baseFontSize = getBaseFontSize(docStyle)
  const textColor = getTextColor(docStyle)
  const doc = new jsPDF()

  // Header
  let y = addHeader(doc, bedrijfsProfiel, 'Offerte', offerte.nummer, docStyle)

  // Client info
  y = addClientInfo(doc, klant, y, docStyle)

  // Offerte details
  doc.setFontSize(baseFontSize)
  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(...textColor)

  if (offerte.titel) {
    doc.setFont(bodyFont, 'bold')
    const versieText = offerte.versie && offerte.versie > 1 ? ` (v${offerte.versie})` : ''
    doc.text(`Betreft: ${offerte.titel}${versieText}`, margins.left, y)
    doc.setFont(bodyFont, 'normal')
    y += 8
  }

  if (offerte.geldig_tot) {
    doc.text(`Geldig tot: ${formatDate(offerte.geldig_tot)}`, margins.left, y)
    y += 8
  }

  // FIX 13: Split verplichte en optionele items
  const verplichteItems = items.filter(i => !i.is_optioneel)
  const optioneleItems = items.filter(i => i.is_optioneel)

  // Build table body helper
  const buildItemRow = (item: OfferteItem, index: number) => {
    let beschrijving = item.beschrijving
    // FIX 9: Append dimension info
    if (item.breedte_mm && item.hoogte_mm) {
      const m2 = item.oppervlakte_m2 || ((item.breedte_mm / 1000) * (item.hoogte_mm / 1000))
      beschrijving += `\nAfmeting: ${item.breedte_mm} × ${item.hoogte_mm} mm (${m2.toFixed(2)} m²)`
    }
    return [
      (index + 1).toString(),
      beschrijving,
      item.aantal.toString(),
      formatCurrency(item.eenheidsprijs),
      item.btw_percentage > 0 ? `${item.btw_percentage}%` : '-',
      item.korting_percentage > 0 ? `${item.korting_percentage}%` : '-',
      formatCurrency(item.totaal),
    ]
  }

  // Items table — verplichte items
  const tableBody = verplichteItems.map((item, index) => buildItemRow(item, index))

  const tableStyles = getAutoTableStyles(brand, docStyle)
  const pageWidth = doc.internal.pageSize.getWidth()

  autoTable(doc, {
    startY: y,
    head: [['#', 'Omschrijving', 'Aantal', 'Eenheidsprijs', 'BTW', 'Korting', 'Totaal']],
    body: tableBody,
    theme: tableStyles.theme,
    headStyles: tableStyles.headStyles,
    bodyStyles: tableStyles.bodyStyles,
    alternateRowStyles: tableStyles.alternateRowStyles,
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margins.left, right: margins.right },
  })

  // Totals
  const finalY = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY || y + 20
  let totalsY = finalY + 10

  const totalsX = pageWidth - margins.right - 50

  doc.setFontSize(baseFontSize)
  doc.setTextColor(...textColor)

  doc.setFont(bodyFont, 'normal')
  doc.text('Subtotaal:', totalsX, totalsY)
  doc.text(formatCurrency(offerte.subtotaal), pageWidth - margins.right, totalsY, { align: 'right' })
  totalsY += 7

  doc.text('BTW:', totalsX, totalsY)
  doc.text(formatCurrency(offerte.btw_bedrag), pageWidth - margins.right, totalsY, { align: 'right' })
  totalsY += 7

  // FIX 16: Afrondingskorting
  if (offerte.afrondingskorting_excl_btw && offerte.afrondingskorting_excl_btw !== 0) {
    doc.text('Afrondingskorting:', totalsX - 15, totalsY)
    doc.text(formatCurrency(offerte.afrondingskorting_excl_btw), pageWidth - margins.right, totalsY, { align: 'right' })
    totalsY += 7
  }

  // Total line
  doc.setDrawColor(...brand)
  doc.setLineWidth(0.5)
  doc.line(totalsX, totalsY - 2, pageWidth - margins.right, totalsY - 2)

  doc.setFont(headingFont, 'bold')
  doc.setFontSize(baseFontSize + 2)
  doc.setTextColor(...brand)
  doc.text('Totaal:', totalsX, totalsY + 5)
  doc.text(formatCurrency(offerte.totaal), pageWidth - margins.right, totalsY + 5, { align: 'right' })

  // FIX 13: Optionele items sectie
  if (optioneleItems.length > 0) {
    totalsY += 20
    // Check page space
    if (totalsY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      totalsY = margins.top || 20
    }

    doc.setFont(headingFont, 'bold')
    doc.setFontSize(baseFontSize)
    doc.setTextColor(...brand)
    doc.text('Optioneel:', margins.left, totalsY)
    totalsY += 5

    const optioneleTableBody = optioneleItems.map((item, index) => buildItemRow(item, index))

    autoTable(doc, {
      startY: totalsY,
      head: [['#', 'Omschrijving', 'Aantal', 'Eenheidsprijs', 'BTW', 'Korting', 'Totaal']],
      body: optioneleTableBody,
      theme: tableStyles.theme,
      headStyles: { ...tableStyles.headStyles, fillColor: [180, 160, 80] },
      bodyStyles: { ...tableStyles.bodyStyles, fontStyle: 'italic' },
      alternateRowStyles: tableStyles.alternateRowStyles,
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margins.left, right: margins.right },
    })

    const optFinalY = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY || totalsY + 20
    let optTotalsY = optFinalY + 8

    const optSubtotaal = round2(optioneleItems.reduce((s, i) => s + i.totaal, 0))
    const optBtw = round2(optioneleItems.reduce((s, i) => s + i.totaal * (i.btw_percentage / 100), 0))

    doc.setFontSize(baseFontSize - 1)
    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(...textColor)
    doc.text('Subtotaal optioneel:', totalsX - 15, optTotalsY)
    doc.text(formatCurrency(optSubtotaal), pageWidth - margins.right, optTotalsY, { align: 'right' })
    optTotalsY += 6

    doc.text('Totaal incl opties:', totalsX - 15, optTotalsY)
    doc.setFont(bodyFont, 'bold')
    doc.text(formatCurrency(round2(offerte.totaal + optSubtotaal + optBtw)), pageWidth - margins.right, optTotalsY, { align: 'right' })

    totalsY = optTotalsY + 5
  }

  // Notes
  totalsY += 20
  if (offerte.notities) {
    doc.setFontSize(baseFontSize)
    doc.setFont(headingFont, 'bold')
    doc.setTextColor(...brand)
    doc.text('Opmerkingen:', margins.left, totalsY)
    totalsY += 6

    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(...textColor)
    doc.setFontSize(baseFontSize - 1)
    const splitNotes = doc.splitTextToSize(offerte.notities, pageWidth - margins.left - margins.right)
    doc.text(splitNotes, margins.left, totalsY)
    totalsY += splitNotes.length * 5 + 5
  }

  // Terms and conditions
  if (offerte.voorwaarden) {
    doc.setFontSize(baseFontSize)
    doc.setFont(headingFont, 'bold')
    doc.setTextColor(...brand)
    doc.text('Voorwaarden:', margins.left, totalsY)
    totalsY += 6

    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(baseFontSize - 2)
    const splitTerms = doc.splitTextToSize(offerte.voorwaarden, pageWidth - margins.left - margins.right)
    doc.text(splitTerms, margins.left, totalsY)
  }

  // ============ BIJLAGE / TEKENING PAGINA'S (Landscape A4) ============
  // Per item met bijlage_url: professioneel gestylede pagina met logo, specs box en tekening
  const bijlageItems = items.filter(i => i.bijlage_url && i.bijlage_type !== 'application/pdf')
  for (const bijlageItem of bijlageItems) {
    doc.addPage('a4', 'landscape')
    const pgW = doc.internal.pageSize.getWidth()   // 297mm
    const pgH = doc.internal.pageSize.getHeight()   // 210mm
    addBriefpapierBackground(doc, docStyle, doc.getNumberOfPages())

    const bMargin = 10

    // --- Logo (linksboven) ---
    let logoEndX = bMargin
    if (bedrijfsProfiel.logo_url) {
      try {
        const logoMaxW = 30
        const logoMaxH = 20
        const logoProps = doc.getImageProperties(bedrijfsProfiel.logo_url)
        const logoAspect = logoProps.width / logoProps.height
        let logoW = logoMaxW
        let logoH = logoW / logoAspect
        if (logoH > logoMaxH) {
          logoH = logoMaxH
          logoW = logoH * logoAspect
        }
        doc.addImage(bedrijfsProfiel.logo_url, 'PNG', bMargin, bMargin, logoW, logoH)
        logoEndX = bMargin + logoW + 5
      } catch {
        // Logo loading failed, skip
      }
    }

    // --- Specs box (rechts van logo, of volle breedte als geen logo) ---
    const extraVelden = bijlageItem.extra_velden || {}
    const detailRegels = bijlageItem.detail_regels || []
    const getField = (label: string): string => {
      if (extraVelden[label]) return extraVelden[label]
      const regel = detailRegels.find(r => r.label === label)
      return regel?.waarde || ''
    }

    const specItems: { label: string; value: string }[] = [
      { label: 'Omschrijving', value: bijlageItem.beschrijving || '' },
      { label: 'Afmeting', value: getField('Afmeting') || (bijlageItem.breedte_mm && bijlageItem.hoogte_mm ? `${bijlageItem.breedte_mm} × ${bijlageItem.hoogte_mm} mm` : '') },
      { label: 'Materiaal', value: getField('Materiaal') },
      { label: 'Aantal', value: bijlageItem.aantal ? `${bijlageItem.aantal} stuk` : '' },
      { label: 'Lay-out', value: getField('Lay-out') },
      { label: 'Montage', value: getField('Montage') },
      { label: 'Opmerking', value: getField('Opmerking') },
    ].filter(s => s.value)

    // 2-column layout: split specs into left and right columns
    const leftCol: { label: string; value: string }[] = []
    const rightCol: { label: string; value: string }[] = []
    specItems.forEach((spec, i) => {
      if (i % 2 === 0) leftCol.push(spec)
      else rightCol.push(spec)
    })

    const lineHeight = 5
    const boxPadding = 4
    const boxX = logoEndX
    const boxY = bMargin
    const boxWidth = pgW - boxX - bMargin
    const maxRows = Math.max(leftCol.length, rightCol.length)
    const boxHeight = (maxRows * lineHeight) + (boxPadding * 2)
    const colWidth = boxWidth / 2

    // Specs box background
    doc.setFillColor(248, 248, 250)
    doc.setDrawColor(230, 230, 235)
    doc.setLineWidth(0.5)
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD')

    // Draw spec items in 2 columns
    const drawSpecCol = (col: { label: string; value: string }[], startX: number) => {
      col.forEach((spec, i) => {
        const y = boxY + boxPadding + 3 + (i * lineHeight)
        doc.setFont(bodyFont, 'bold')
        doc.setFontSize(8)
        doc.setTextColor(130, 130, 130)
        doc.text(spec.label, startX + 4, y)
        doc.setFont(bodyFont, 'normal')
        doc.setFontSize(9)
        doc.setTextColor(40, 40, 40)
        doc.text(spec.value, startX + 32, y)
      })
    }
    drawSpecCol(leftCol, boxX)
    drawSpecCol(rightCol, boxX + colWidth)

    // --- Separator ---
    const sepY = boxY + boxHeight + 3
    doc.setDrawColor(220, 220, 225)
    doc.setLineWidth(0.3)
    doc.line(bMargin, sepY, pgW - bMargin, sepY)

    // --- Tekening / Foto ---
    const imgY = sepY + 3
    const imgMaxW = pgW - 2 * bMargin
    const availableH = pgH - imgY - bMargin

    try {
      const imgProps = doc.getImageProperties(bijlageItem.bijlage_url!)
      const widthRatio = imgMaxW / imgProps.width
      const heightRatio = availableH / imgProps.height
      const ratio = Math.min(widthRatio, heightRatio)
      const imgW = imgProps.width * ratio
      const imgH = imgProps.height * ratio
      // Center horizontally
      const imgX = bMargin + (imgMaxW - imgW) / 2
      const format = bijlageItem.bijlage_type === 'image/png' ? 'PNG' : 'JPEG'
      doc.addImage(bijlageItem.bijlage_url!, format, imgX, imgY, imgW, imgH, undefined, 'MEDIUM')
    } catch {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.rect(bMargin, imgY, imgMaxW, availableH)
      doc.setFontSize(10)
      doc.setFont(bodyFont, 'normal')
      doc.setTextColor(180, 180, 180)
      doc.text('Bijlage niet beschikbaar', bMargin + imgMaxW / 2, imgY + availableH / 2, { align: 'center' })
    }
  }

  // Footer
  addFooter(doc, bedrijfsProfiel, docStyle)

  return doc
}

// ============ FACTUUR PDF ============

export function generateFactuurPDF(
  factuurData: {
    nummer: string
    titel: string
    datum: string
    vervaldatum: string
    subtotaal: number
    btw_bedrag: number
    totaal: number
    notities?: string
    betaalvoorwaarden?: string
    factuur_type?: string
    betaal_link?: string
  },
  items: OfferteItem[],
  klant: Partial<Klant>,
  bedrijfsProfiel: PdfBedrijfsProfiel,
  docStyle?: DocumentStyle | null
): jsPDF {
  const doc = new jsPDF()
  const brand = getBrandColor(bedrijfsProfiel, docStyle)
  const margins = getMargins(docStyle)
  const headingFont = getHeadingFont(docStyle)
  const bodyFont = getBodyFont(docStyle)
  const baseFontSize = getBaseFontSize(docStyle)
  const textColor = getTextColor(docStyle)

  // Header — adjust label for creditnota/voorschot/eindafrekening
  const typeLabels: Record<string, string> = {
    standaard: 'Factuur',
    voorschot: 'Voorschotfactuur',
    creditnota: 'Creditnota',
    eindafrekening: 'Eindafrekening',
  }
  const headerLabel = typeLabels[factuurData.factuur_type || 'standaard'] || 'Factuur'
  let y = addHeader(doc, bedrijfsProfiel, headerLabel, factuurData.nummer, docStyle)

  // Client info
  y = addClientInfo(doc, klant, y, docStyle)

  // Invoice details
  doc.setFontSize(baseFontSize)
  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(...textColor)

  if (factuurData.titel) {
    doc.setFont(bodyFont, 'bold')
    doc.text(`Betreft: ${factuurData.titel}`, margins.left, y)
    doc.setFont(bodyFont, 'normal')
    y += 6
  }

  doc.text(`Factuurdatum: ${formatDate(factuurData.datum)}`, margins.left, y)
  y += 5
  doc.text(`Vervaldatum: ${formatDate(factuurData.vervaldatum)}`, margins.left, y)
  y += 8

  // Items table
  const tableBody = items.map((item, index) => [
    (index + 1).toString(),
    item.beschrijving,
    item.aantal.toString(),
    formatCurrency(item.eenheidsprijs),
    item.btw_percentage > 0 ? `${item.btw_percentage}%` : '-',
    formatCurrency(item.totaal),
  ])

  const tableStyles = getAutoTableStyles(brand, docStyle)
  const pageWidth = doc.internal.pageSize.getWidth()

  autoTable(doc, {
    startY: y,
    head: [['#', 'Omschrijving', 'Aantal', 'Eenheidsprijs', 'BTW', 'Totaal']],
    body: tableBody,
    theme: tableStyles.theme,
    headStyles: tableStyles.headStyles,
    bodyStyles: tableStyles.bodyStyles,
    alternateRowStyles: tableStyles.alternateRowStyles,
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margins.left, right: margins.right },
  })

  // Totals
  const finalY = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY || y + 20
  let totalsY = finalY + 10

  const totalsX = pageWidth - margins.right - 50

  doc.setFontSize(baseFontSize)
  doc.setTextColor(...textColor)

  doc.setFont(bodyFont, 'normal')
  doc.text('Subtotaal:', totalsX, totalsY)
  doc.text(formatCurrency(factuurData.subtotaal), pageWidth - margins.right, totalsY, { align: 'right' })
  totalsY += 7

  doc.text('BTW:', totalsX, totalsY)
  doc.text(formatCurrency(factuurData.btw_bedrag), pageWidth - margins.right, totalsY, { align: 'right' })
  totalsY += 7

  doc.setDrawColor(...brand)
  doc.setLineWidth(0.5)
  doc.line(totalsX, totalsY - 2, pageWidth - margins.right, totalsY - 2)

  doc.setFont(headingFont, 'bold')
  doc.setFontSize(baseFontSize + 2)
  doc.setTextColor(...brand)
  doc.text('Totaal:', totalsX, totalsY + 5)
  doc.text(formatCurrency(factuurData.totaal), pageWidth - margins.right, totalsY + 5, { align: 'right' })

  // Payment info
  totalsY += 20

  doc.setFontSize(baseFontSize)
  doc.setFont(headingFont, 'bold')
  doc.setTextColor(...brand)
  doc.text('Betaalinformatie:', margins.left, totalsY)
  totalsY += 6

  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(...textColor)
  doc.setFontSize(baseFontSize - 1)

  // Show IBAN prominently if available
  if (bedrijfsProfiel.iban) {
    doc.text(`IBAN: ${bedrijfsProfiel.iban}`, margins.left, totalsY)
    totalsY += 5
    if (bedrijfsProfiel.bedrijfsnaam) {
      doc.text(`t.n.v. ${bedrijfsProfiel.bedrijfsnaam}`, margins.left, totalsY)
      totalsY += 6
    }
  }

  const betaalInfo = factuurData.betaalvoorwaarden ||
    `Wij verzoeken u vriendelijk het totaalbedrag van ${formatCurrency(factuurData.totaal)} over te maken voor ${formatDate(factuurData.vervaldatum)} onder vermelding van factuurnummer ${factuurData.nummer}.`

  const splitPayment = doc.splitTextToSize(betaalInfo, pageWidth - margins.left - margins.right)
  doc.text(splitPayment, margins.left, totalsY)

  // Notes
  if (factuurData.notities) {
    totalsY += splitPayment.length * 5 + 8
    doc.setFontSize(baseFontSize)
    doc.setFont(headingFont, 'bold')
    doc.setTextColor(...brand)
    doc.text('Opmerkingen:', margins.left, totalsY)
    totalsY += 6

    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(baseFontSize - 1)
    const splitNotes = doc.splitTextToSize(factuurData.notities, pageWidth - margins.left - margins.right)
    doc.text(splitNotes, margins.left, totalsY)
  }

  // Online betaallink
  if (factuurData.betaal_link) {
    totalsY += 15
    if (totalsY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      totalsY = margins.top
    }

    doc.setFontSize(baseFontSize)
    doc.setFont(headingFont, 'bold')
    doc.setTextColor(...brand)
    doc.text('Online betalen:', margins.left, totalsY)
    totalsY += 6

    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(...textColor)
    doc.setFontSize(baseFontSize - 1)
    doc.text('Betaal direct via de onderstaande link:', margins.left, totalsY)
    totalsY += 5

    doc.setTextColor(41, 98, 218)
    doc.textWithLink(factuurData.betaal_link, margins.left, totalsY, {
      url: factuurData.betaal_link,
    })
  }

  // Footer
  addFooter(doc, bedrijfsProfiel, docStyle)

  return doc
}

// ============ RAPPORT PDF ============

export function generateRapportPDF(
  data: {
    titel: string
    datum: string
    secties: {
      kop: string
      inhoud: string
      tabel?: {
        headers: string[]
        rijen: string[][]
      }
    }[]
    samenvatting?: string
  },
  type: 'project' | 'financieel' | 'klant' | 'algemeen' = 'algemeen',
  bedrijfsProfiel?: PdfBedrijfsProfiel,
  docStyle?: DocumentStyle | null
): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const profile = bedrijfsProfiel || {}
  const brand = getBrandColor(profile, docStyle)
  const margins = getMargins(docStyle)
  const headingFont = getHeadingFont(docStyle)
  const bodyFont = getBodyFont(docStyle)
  const baseFontSize = getBaseFontSize(docStyle)

  // Briefpapier
  addBriefpapierBackground(doc, docStyle, 1)

  // Header
  doc.setFontSize(baseFontSize * 2.2)
  doc.setFont(headingFont, 'bold')
  doc.setTextColor(...brand)
  doc.text(profile.bedrijfsnaam || 'Rapport', margins.left, 30)

  // Type label
  const typeLabels: Record<string, string> = {
    project: 'Projectrapport',
    financieel: 'Financieel Rapport',
    klant: 'Klantrapport',
    algemeen: 'Rapport',
  }

  doc.setFontSize(baseFontSize + 4)
  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(typeLabels[type], margins.left, 38)

  // Divider
  doc.setDrawColor(...brand)
  doc.setLineWidth(0.5)
  doc.line(margins.left, 42, pageWidth - margins.right, 42)

  // Title
  doc.setFontSize(baseFontSize + 6)
  doc.setFont(headingFont, 'bold')
  doc.setTextColor(...brand)
  doc.text(data.titel, margins.left, 54)

  // Date
  doc.setFontSize(baseFontSize)
  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Datum: ${formatDate(data.datum || new Date().toISOString())}`, margins.left, 61)

  let y = 72

  // Summary
  if (data.samenvatting) {
    doc.setFontSize(baseFontSize + 1)
    doc.setFont(headingFont, 'bold')
    doc.setTextColor(...brand)
    doc.text('Samenvatting', margins.left, y)
    y += 7

    doc.setFontSize(baseFontSize - 1)
    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(60, 60, 60)
    const splitSummary = doc.splitTextToSize(data.samenvatting, pageWidth - margins.left - margins.right)
    doc.text(splitSummary, margins.left, y)
    y += splitSummary.length * 5 + 8
  }

  // Sections
  const tableStyles = getAutoTableStyles(brand, docStyle)

  for (const sectie of data.secties) {
    if (y > 250) {
      doc.addPage()
      addBriefpapierBackground(doc, docStyle, doc.getNumberOfPages())
      y = margins.top
    }

    doc.setFontSize(baseFontSize + 2)
    doc.setFont(headingFont, 'bold')
    doc.setTextColor(...brand)
    doc.text(sectie.kop, margins.left, y)
    y += 7

    doc.setFontSize(baseFontSize - 1)
    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(60, 60, 60)
    const splitContent = doc.splitTextToSize(sectie.inhoud, pageWidth - margins.left - margins.right)
    doc.text(splitContent, margins.left, y)
    y += splitContent.length * 5 + 5

    if (sectie.tabel) {
      autoTable(doc, {
        startY: y,
        head: [sectie.tabel.headers],
        body: sectie.tabel.rijen,
        theme: tableStyles.theme,
        headStyles: { ...tableStyles.headStyles, fontSize: baseFontSize - 2 },
        bodyStyles: { ...tableStyles.bodyStyles, fontSize: baseFontSize - 2 },
        alternateRowStyles: tableStyles.alternateRowStyles,
        margin: { left: margins.left, right: margins.right },
      })

      y = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ? (doc as JsPDFWithAutoTable).lastAutoTable!.finalY + 10 : y + 20
    }

    y += 5
  }

  // Footer
  addFooter(doc, profile, docStyle)

  return doc
}

// ============ BESTELBON PDF ============

export function generateBestelbonPDF(
  bestelbonData: {
    nummer: string
    onderwerp: string
    besteldatum: string
    verwachte_leverdatum?: string
    notities?: string
    totaal_bedrag: number
  },
  regels: { beschrijving: string; aantal: number; eenheidsprijs: number; eenheid?: string }[],
  leverancier: Partial<{ naam: string; adres?: string; postcode?: string; stad?: string }>,
  bedrijfsProfiel: PdfBedrijfsProfiel,
  docStyle?: DocumentStyle | null
): jsPDF {
  const doc = new jsPDF()
  const brand = getBrandColor(bedrijfsProfiel, docStyle)
  const margins = getMargins(docStyle)
  const headingFont = getHeadingFont(docStyle)
  const bodyFont = getBodyFont(docStyle)
  const baseFontSize = getBaseFontSize(docStyle)
  const textColor = getTextColor(docStyle)

  let y = addHeader(doc, bedrijfsProfiel, 'Bestelbon', bestelbonData.nummer, docStyle)

  // Leverancier info
  if (leverancier.naam) {
    doc.setFontSize(baseFontSize)
    doc.setFont(bodyFont, 'bold')
    doc.setTextColor(...textColor)
    doc.text('Aan:', margins.left, y)
    doc.setFont(bodyFont, 'normal')
    y += 6
    doc.text(leverancier.naam, margins.left, y)
    y += 5
    if (leverancier.adres) { doc.text(leverancier.adres, margins.left, y); y += 5 }
    if (leverancier.postcode || leverancier.stad) {
      doc.text(`${leverancier.postcode || ''} ${leverancier.stad || ''}`.trim(), margins.left, y)
      y += 5
    }
    y += 5
  }

  // Details
  doc.setFontSize(baseFontSize)
  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(...textColor)
  if (bestelbonData.onderwerp) {
    doc.setFont(bodyFont, 'bold')
    doc.text(`Betreft: ${bestelbonData.onderwerp}`, margins.left, y)
    doc.setFont(bodyFont, 'normal')
    y += 6
  }
  doc.text(`Besteldatum: ${formatDate(bestelbonData.besteldatum)}`, margins.left, y)
  y += 5
  if (bestelbonData.verwachte_leverdatum) {
    doc.text(`Verwachte levering: ${formatDate(bestelbonData.verwachte_leverdatum)}`, margins.left, y)
    y += 5
  }
  y += 5

  // Items table
  const tableBody = regels.map((r, i) => [
    (i + 1).toString(),
    r.beschrijving,
    r.aantal.toString(),
    r.eenheid || 'stuk',
    formatCurrency(r.eenheidsprijs),
    formatCurrency(Math.round(r.aantal * r.eenheidsprijs * 100) / 100),
  ])

  const tableStyles = getAutoTableStyles(brand, docStyle)
  const pageWidth = doc.internal.pageSize.getWidth()

  autoTable(doc, {
    startY: y,
    head: [['#', 'Omschrijving', 'Aantal', 'Eenheid', 'Prijs', 'Totaal']],
    body: tableBody,
    theme: tableStyles.theme,
    headStyles: tableStyles.headStyles,
    bodyStyles: tableStyles.bodyStyles,
    alternateRowStyles: tableStyles.alternateRowStyles,
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margins.left, right: margins.right },
  })

  // Total
  const finalY = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY || y + 20
  let totalsY = finalY + 10

  doc.setFont(headingFont, 'bold')
  doc.setFontSize(baseFontSize + 2)
  doc.setTextColor(...brand)
  doc.text('Totaal:', pageWidth - margins.right - 50, totalsY + 5)
  doc.text(formatCurrency(bestelbonData.totaal_bedrag), pageWidth - margins.right, totalsY + 5, { align: 'right' })

  // Notes
  if (bestelbonData.notities) {
    totalsY += 20
    doc.setFontSize(baseFontSize)
    doc.setFont(headingFont, 'bold')
    doc.setTextColor(...brand)
    doc.text('Opmerkingen:', margins.left, totalsY)
    totalsY += 6
    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(baseFontSize - 1)
    const splitNotes = doc.splitTextToSize(bestelbonData.notities, pageWidth - margins.left - margins.right)
    doc.text(splitNotes, margins.left, totalsY)
  }

  addFooter(doc, bedrijfsProfiel, docStyle)
  return doc
}

// ============ LEVERINGSBON PDF ============

export function generateLeveringsbonPDF(
  leveringsbonData: {
    nummer: string
    onderwerp: string
    leverdatum: string
    notities?: string
    handtekening_data?: string
  },
  regels: { beschrijving: string; aantal: number; eenheid?: string }[],
  klant: Partial<Klant>,
  bedrijfsProfiel: PdfBedrijfsProfiel,
  docStyle?: DocumentStyle | null
): jsPDF {
  const doc = new jsPDF()
  const brand = getBrandColor(bedrijfsProfiel, docStyle)
  const margins = getMargins(docStyle)
  const headingFont = getHeadingFont(docStyle)
  const bodyFont = getBodyFont(docStyle)
  const baseFontSize = getBaseFontSize(docStyle)
  const textColor = getTextColor(docStyle)

  let y = addHeader(doc, bedrijfsProfiel, 'Leveringsbon', leveringsbonData.nummer, docStyle)

  // Klant info
  y = addClientInfo(doc, klant, y, docStyle)

  // Details
  doc.setFontSize(baseFontSize)
  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(...textColor)
  if (leveringsbonData.onderwerp) {
    doc.setFont(bodyFont, 'bold')
    doc.text(`Betreft: ${leveringsbonData.onderwerp}`, margins.left, y)
    doc.setFont(bodyFont, 'normal')
    y += 6
  }
  doc.text(`Leverdatum: ${formatDate(leveringsbonData.leverdatum)}`, margins.left, y)
  y += 8

  // Items table — NO prices (pure delivery proof)
  const tableBody = regels.map((r, i) => [
    (i + 1).toString(),
    r.beschrijving,
    r.aantal.toString(),
    r.eenheid || 'stuk',
  ])

  const tableStyles = getAutoTableStyles(brand, docStyle)

  autoTable(doc, {
    startY: y,
    head: [['#', 'Omschrijving', 'Aantal', 'Eenheid']],
    body: tableBody,
    theme: tableStyles.theme,
    headStyles: tableStyles.headStyles,
    bodyStyles: tableStyles.bodyStyles,
    alternateRowStyles: tableStyles.alternateRowStyles,
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 30, halign: 'center' },
    },
    margin: { left: margins.left, right: margins.right },
  })

  let endY = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY || y + 20

  // Notities
  if (leveringsbonData.notities) {
    endY += 10
    doc.setFontSize(baseFontSize)
    doc.setFont(headingFont, 'bold')
    doc.setTextColor(...brand)
    doc.text('Opmerkingen:', margins.left, endY)
    endY += 6
    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(baseFontSize - 1)
    const pageWidth = doc.internal.pageSize.getWidth()
    const splitNotes = doc.splitTextToSize(leveringsbonData.notities, pageWidth - margins.left - margins.right)
    doc.text(splitNotes, margins.left, endY)
    endY += splitNotes.length * 5
  }

  // Handtekening
  endY += 15
  if (endY > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage()
    addBriefpapierBackground(doc, docStyle, doc.getNumberOfPages())
    endY = margins.top
  }

  doc.setFontSize(baseFontSize)
  doc.setFont(headingFont, 'bold')
  doc.setTextColor(...brand)
  doc.text('Handtekening voor ontvangst:', margins.left, endY)
  endY += 8

  if (leveringsbonData.handtekening_data) {
    try {
      doc.addImage(leveringsbonData.handtekening_data, 'PNG', margins.left, endY, 60, 30)
    } catch {
      doc.setDrawColor(200, 200, 200)
      doc.rect(margins.left, endY, 80, 30)
    }
  } else {
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.rect(margins.left, endY, 80, 30)
    doc.setFontSize(8)
    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(180, 180, 180)
    doc.text('Handtekening', margins.left + 40, endY + 18, { align: 'center' })
  }

  addFooter(doc, bedrijfsProfiel, docStyle)
  return doc
}

// ============ WERKBON PDF ============

export function generateWerkbonPDF(
  werkbonData: {
    werkbon_nummer: string
    datum: string
    start_tijd?: string
    eind_tijd?: string
    pauze_minuten?: number
    locatie_adres: string
    locatie_stad?: string
    locatie_postcode?: string
    kilometers?: number
    km_tarief?: number
    omschrijving?: string
    klant_handtekening?: string
    klant_naam_getekend?: string
    getekend_op?: string
  },
  regels: WerkbonRegel[],
  fotos: WerkbonFoto[],
  klant: Partial<Klant>,
  projectNaam: string,
  bedrijfsProfiel: PdfBedrijfsProfiel,
  docStyle?: DocumentStyle | null
): jsPDF {
  const doc = new jsPDF()
  const brand = getBrandColor(bedrijfsProfiel, docStyle)
  const margins = getMargins(docStyle)
  const headingFont = getHeadingFont(docStyle)
  const bodyFont = getBodyFont(docStyle)
  const baseFontSize = getBaseFontSize(docStyle)
  const textColor = getTextColor(docStyle)
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header
  let y = addHeader(doc, bedrijfsProfiel, 'Werkbon', werkbonData.werkbon_nummer, docStyle)

  // Client info
  y = addClientInfo(doc, klant, y, docStyle)

  // Werkbon details
  doc.setFontSize(baseFontSize)
  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(...textColor)

  if (projectNaam) {
    doc.setFont(bodyFont, 'bold')
    doc.text(`Project: ${projectNaam}`, margins.left, y)
    doc.setFont(bodyFont, 'normal')
    y += 6
  }

  doc.text(`Datum: ${formatDate(werkbonData.datum)}`, margins.left, y)
  y += 5

  if (werkbonData.start_tijd || werkbonData.eind_tijd) {
    const tijdParts: string[] = []
    if (werkbonData.start_tijd) tijdParts.push(`Start: ${werkbonData.start_tijd}`)
    if (werkbonData.eind_tijd) tijdParts.push(`Eind: ${werkbonData.eind_tijd}`)
    if (werkbonData.pauze_minuten) tijdParts.push(`Pauze: ${werkbonData.pauze_minuten} min`)
    doc.text(tijdParts.join('  |  '), margins.left, y)
    y += 5
  }

  // Locatie
  const locatieParts = [werkbonData.locatie_adres, werkbonData.locatie_postcode, werkbonData.locatie_stad].filter(Boolean)
  if (locatieParts.length > 0) {
    doc.text(`Locatie: ${locatieParts.join(', ')}`, margins.left, y)
    y += 5
  }

  if (werkbonData.kilometers && werkbonData.kilometers > 0) {
    doc.text(`Kilometers: ${werkbonData.kilometers} km \u00d7 \u20ac${(werkbonData.km_tarief || 0).toFixed(2)} = ${formatCurrency(werkbonData.kilometers * (werkbonData.km_tarief || 0))}`, margins.left, y)
    y += 5
  }

  y += 5

  // Omschrijving
  if (werkbonData.omschrijving) {
    doc.setFont(headingFont, 'bold')
    doc.setTextColor(...brand)
    doc.text('Werkzaamheden:', margins.left, y)
    y += 6
    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(...textColor)
    doc.setFontSize(baseFontSize - 1)
    const splitOmschr = doc.splitTextToSize(werkbonData.omschrijving, pageWidth - margins.left - margins.right)
    doc.text(splitOmschr, margins.left, y)
    y += splitOmschr.length * 5 + 5
    doc.setFontSize(baseFontSize)
  }

  // Regels tabel
  if (regels.length > 0) {
    const tableBody = regels.map((regel, index) => {
      if (regel.type === 'arbeid') {
        return [
          (index + 1).toString(),
          regel.omschrijving,
          'Arbeid',
          `${regel.uren || 0} uur`,
          formatCurrency(regel.uurtarief || 0),
          formatCurrency(regel.totaal),
        ]
      }
      return [
        (index + 1).toString(),
        regel.omschrijving,
        regel.type === 'materiaal' ? 'Materiaal' : 'Overig',
        `${regel.aantal || 0} ${regel.eenheid || 'stuks'}`,
        formatCurrency(regel.prijs_per_eenheid || 0),
        formatCurrency(regel.totaal),
      ]
    })

    const tableStyles = getAutoTableStyles(brand, docStyle)

    autoTable(doc, {
      startY: y,
      head: [['#', 'Omschrijving', 'Type', 'Hoeveelheid', 'Prijs', 'Totaal']],
      body: tableBody,
      theme: tableStyles.theme,
      headStyles: tableStyles.headStyles,
      bodyStyles: tableStyles.bodyStyles,
      alternateRowStyles: tableStyles.alternateRowStyles,
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 28, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
      },
      margin: { left: margins.left, right: margins.right },
    })

    y = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY || y + 20
    y += 8

    // Totalen
    const subtotaal = round2(regels.filter((r) => r.factureerbaar).reduce((sum, r) => sum + r.totaal, 0))
    const kmKosten = round2((werkbonData.kilometers || 0) * (werkbonData.km_tarief || 0))
    const totaalExcl = round2(subtotaal + kmKosten)
    const btw = round2(totaalExcl * 0.21)
    const totaalIncl = round2(totaalExcl + btw)

    const totalsX = pageWidth - margins.right - 50

    doc.setFontSize(baseFontSize)
    doc.setTextColor(...textColor)
    doc.setFont(bodyFont, 'normal')
    doc.text('Subtotaal:', totalsX, y)
    doc.text(formatCurrency(subtotaal), pageWidth - margins.right, y, { align: 'right' })
    y += 6

    if (kmKosten > 0) {
      doc.text('Kilometers:', totalsX, y)
      doc.text(formatCurrency(kmKosten), pageWidth - margins.right, y, { align: 'right' })
      y += 6
    }

    doc.text('BTW (21%):', totalsX, y)
    doc.text(formatCurrency(btw), pageWidth - margins.right, y, { align: 'right' })
    y += 6

    doc.setDrawColor(...brand)
    doc.setLineWidth(0.5)
    doc.line(totalsX, y - 2, pageWidth - margins.right, y - 2)

    doc.setFont(headingFont, 'bold')
    doc.setFontSize(baseFontSize + 2)
    doc.setTextColor(...brand)
    doc.text('Totaal:', totalsX, y + 4)
    doc.text(formatCurrency(totaalIncl), pageWidth - margins.right, y + 4, { align: 'right' })
    y += 15
  }

  // Foto's
  const validFotos = fotos.filter((f) => f.url && f.url.startsWith('data:'))
  if (validFotos.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage()
      addBriefpapierBackground(doc, docStyle, doc.getNumberOfPages())
      y = margins.top
    }

    doc.setFontSize(baseFontSize)
    doc.setFont(headingFont, 'bold')
    doc.setTextColor(...brand)
    doc.text("Foto's:", margins.left, y)
    y += 8

    const photoW = 50
    const photoH = 38
    const photosPerRow = Math.floor((pageWidth - margins.left - margins.right + 5) / (photoW + 5))
    let col = 0

    for (const foto of validFotos) {
      if (y + photoH + 10 > doc.internal.pageSize.getHeight() - margins.bottom) {
        doc.addPage()
        addBriefpapierBackground(doc, docStyle, doc.getNumberOfPages())
        y = margins.top
        col = 0
      }

      const x = margins.left + col * (photoW + 5)
      try {
        doc.addImage(foto.url, 'JPEG', x, y, photoW, photoH, undefined, 'MEDIUM')
        doc.setFontSize(7)
        doc.setFont(bodyFont, 'normal')
        doc.setTextColor(100, 100, 100)
        const typeLabel = foto.type === 'voor' ? 'Voor' : foto.type === 'na' ? 'Na' : 'Overig'
        doc.text(typeLabel, x + photoW / 2, y + photoH + 4, { align: 'center' })
      } catch {
        // Photo failed to load
      }

      col++
      if (col >= photosPerRow) {
        col = 0
        y += photoH + 8
      }
    }
    if (col > 0) y += photoH + 8
    y += 5
  }

  // Handtekening
  if (werkbonData.klant_handtekening || werkbonData.klant_naam_getekend) {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      addBriefpapierBackground(doc, docStyle, doc.getNumberOfPages())
      y = margins.top
    }

    doc.setFontSize(baseFontSize)
    doc.setFont(headingFont, 'bold')
    doc.setTextColor(...brand)
    doc.text('Handtekening klant:', margins.left, y)
    y += 8

    if (werkbonData.klant_handtekening) {
      try {
        doc.addImage(werkbonData.klant_handtekening, 'PNG', margins.left, y, 60, 30)
        y += 33
      } catch {
        doc.setDrawColor(200, 200, 200)
        doc.rect(margins.left, y, 80, 30)
        y += 33
      }
    }

    doc.setFontSize(baseFontSize - 1)
    doc.setFont(bodyFont, 'normal')
    doc.setTextColor(...textColor)
    if (werkbonData.klant_naam_getekend) {
      doc.text(`Naam: ${werkbonData.klant_naam_getekend}`, margins.left, y)
      y += 5
    }
    if (werkbonData.getekend_op) {
      doc.text(`Datum: ${formatDate(werkbonData.getekend_op)}`, margins.left, y)
    }
  }

  addFooter(doc, bedrijfsProfiel, docStyle)

  return doc
}
