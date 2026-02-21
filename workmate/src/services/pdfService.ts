import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Offerte, OfferteItem, Klant, Profile } from '@/types'

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

function getBrandColor(profiel: PdfBedrijfsProfiel): [number, number, number] {
  if (profiel.primaireKleur) return hexToRgb(profiel.primaireKleur)
  return [41, 65, 122] // default dark blue
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

function addHeader(
  doc: jsPDF,
  bedrijfsProfiel: PdfBedrijfsProfiel,
  title: string,
  nummer: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const brand = getBrandColor(bedrijfsProfiel)

  // Company logo + name area
  let nameX = 20
  if (bedrijfsProfiel.logo_url) {
    try {
      doc.addImage(bedrijfsProfiel.logo_url, 'PNG', 20, 15, 25, 20)
      nameX = 50 // shift name to the right of logo
    } catch {
      // Logo loading failed, just show text
    }
  }
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...brand)
  doc.text(bedrijfsProfiel.bedrijfsnaam || 'Uw Bedrijf', nameX, 30)

  // Company details (right side)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  const rightX = pageWidth - 20
  let rightY = 20

  if (bedrijfsProfiel.bedrijfs_adres) {
    doc.text(bedrijfsProfiel.bedrijfs_adres, rightX, rightY, { align: 'right' })
    rightY += 5
  }
  if (bedrijfsProfiel.email) {
    doc.text(bedrijfsProfiel.email, rightX, rightY, { align: 'right' })
    rightY += 5
  }
  if (bedrijfsProfiel.telefoon) {
    doc.text(`Tel: ${bedrijfsProfiel.telefoon}`, rightX, rightY, { align: 'right' })
    rightY += 5
  }
  if (bedrijfsProfiel.kvk_nummer) {
    doc.text(`KvK: ${bedrijfsProfiel.kvk_nummer}`, rightX, rightY, { align: 'right' })
    rightY += 5
  }
  if (bedrijfsProfiel.btw_nummer) {
    doc.text(`BTW: ${bedrijfsProfiel.btw_nummer}`, rightX, rightY, { align: 'right' })
    rightY += 5
  }

  // Divider line
  const lineY = 42
  doc.setDrawColor(...brand)
  doc.setLineWidth(0.5)
  doc.line(20, lineY, pageWidth - 20, lineY)

  // Document title and number
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...brand)
  doc.text(title, 20, lineY + 12)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`Nummer: ${nummer}`, 20, lineY + 19)
  doc.text(`Datum: ${formatDate(new Date().toISOString())}`, 20, lineY + 25)

  return lineY + 32
}

function addClientInfo(
  doc: jsPDF,
  klant: Partial<Klant>,
  startY: number
): number {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(60, 60, 60)
  doc.text('Aan:', 20, startY)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)

  let y = startY + 6
  if (klant.bedrijfsnaam) {
    doc.setFont('helvetica', 'bold')
    doc.text(klant.bedrijfsnaam, 20, y)
    doc.setFont('helvetica', 'normal')
    y += 5
  }
  if (klant.contactpersoon) {
    doc.text(`t.a.v. ${klant.contactpersoon}`, 20, y)
    y += 5
  }
  if (klant.adres) {
    doc.text(klant.adres, 20, y)
    y += 5
  }
  if (klant.postcode || klant.stad) {
    doc.text(`${klant.postcode || ''} ${klant.stad || ''}`.trim(), 20, y)
    y += 5
  }
  if (klant.land && klant.land !== 'Nederland') {
    doc.text(klant.land, 20, y)
    y += 5
  }

  return y + 5
}

function addFooter(doc: jsPDF, bedrijfsProfiel: Partial<Profile>): void {
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageCount = doc.getNumberOfPages()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer line
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20)

    // Footer text
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)

    const footerParts: string[] = []
    if (bedrijfsProfiel.bedrijfsnaam) footerParts.push(bedrijfsProfiel.bedrijfsnaam)
    if (bedrijfsProfiel.kvk_nummer) footerParts.push(`KvK: ${bedrijfsProfiel.kvk_nummer}`)
    if (bedrijfsProfiel.btw_nummer) footerParts.push(`BTW: ${bedrijfsProfiel.btw_nummer}`)

    doc.text(footerParts.join(' | '), 20, pageHeight - 14)
    doc.text(`Pagina ${i} van ${pageCount}`, pageWidth - 20, pageHeight - 14, {
      align: 'right',
    })
  }
}

// ============ OFFERTE PDF ============

export function generateOffertePDF(
  offerte: Offerte,
  items: OfferteItem[],
  klant: Partial<Klant>,
  bedrijfsProfiel: PdfBedrijfsProfiel
): jsPDF {
  const brand = getBrandColor(bedrijfsProfiel)
  const doc = new jsPDF()

  // Header
  let y = addHeader(doc, bedrijfsProfiel, 'Offerte', offerte.nummer)

  // Client info
  y = addClientInfo(doc, klant, y)

  // Offerte details
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)

  if (offerte.titel) {
    doc.setFont('helvetica', 'bold')
    doc.text(`Betreft: ${offerte.titel}`, 20, y)
    doc.setFont('helvetica', 'normal')
    y += 8
  }

  if (offerte.geldig_tot) {
    doc.text(`Geldig tot: ${formatDate(offerte.geldig_tot)}`, 20, y)
    y += 8
  }

  // Items table
  const tableBody = items.map((item, index) => [
    (index + 1).toString(),
    item.beschrijving,
    item.aantal.toString(),
    formatCurrency(item.eenheidsprijs),
    item.btw_percentage > 0 ? `${item.btw_percentage}%` : '-',
    item.korting_percentage > 0 ? `${item.korting_percentage}%` : '-',
    formatCurrency(item.totaal),
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'Omschrijving', 'Aantal', 'Eenheidsprijs', 'BTW', 'Korting', 'Totaal']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: brand,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [60, 60, 60],
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  })

  // Totals
  const finalY = (doc as any).lastAutoTable?.finalY || y + 20
  let totalsY = finalY + 10

  const pageWidth = doc.internal.pageSize.getWidth()
  const totalsX = pageWidth - 70

  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)

  doc.setFont('helvetica', 'normal')
  doc.text('Subtotaal:', totalsX, totalsY)
  doc.text(formatCurrency(offerte.subtotaal), pageWidth - 20, totalsY, { align: 'right' })
  totalsY += 7

  doc.text('BTW:', totalsX, totalsY)
  doc.text(formatCurrency(offerte.btw_bedrag), pageWidth - 20, totalsY, { align: 'right' })
  totalsY += 7

  // Total line
  doc.setDrawColor(...brand)
  doc.setLineWidth(0.5)
  doc.line(totalsX, totalsY - 2, pageWidth - 20, totalsY - 2)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...brand)
  doc.text('Totaal:', totalsX, totalsY + 5)
  doc.text(formatCurrency(offerte.totaal), pageWidth - 20, totalsY + 5, { align: 'right' })

  // Notes
  totalsY += 20
  if (offerte.notities) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...brand)
    doc.text('Opmerkingen:', 20, totalsY)
    totalsY += 6

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(9)
    const splitNotes = doc.splitTextToSize(offerte.notities, pageWidth - 40)
    doc.text(splitNotes, 20, totalsY)
    totalsY += splitNotes.length * 5 + 5
  }

  // Terms and conditions
  if (offerte.voorwaarden) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...brand)
    doc.text('Voorwaarden:', 20, totalsY)
    totalsY += 6

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(8)
    const splitTerms = doc.splitTextToSize(offerte.voorwaarden, pageWidth - 40)
    doc.text(splitTerms, 20, totalsY)
  }

  // Footer
  addFooter(doc, bedrijfsProfiel)

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
  bedrijfsProfiel: PdfBedrijfsProfiel
): jsPDF {
  const doc = new jsPDF()
  const brand = getBrandColor(bedrijfsProfiel)

  // Header — adjust label for creditnota/voorschot/eindafrekening
  const typeLabels: Record<string, string> = {
    standaard: 'Factuur',
    voorschot: 'Voorschotfactuur',
    creditnota: 'Creditnota',
    eindafrekening: 'Eindafrekening',
  }
  const headerLabel = typeLabels[factuurData.factuur_type || 'standaard'] || 'Factuur'
  let y = addHeader(doc, bedrijfsProfiel, headerLabel, factuurData.nummer)

  // Client info
  y = addClientInfo(doc, klant, y)

  // Invoice details
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)

  if (factuurData.titel) {
    doc.setFont('helvetica', 'bold')
    doc.text(`Betreft: ${factuurData.titel}`, 20, y)
    doc.setFont('helvetica', 'normal')
    y += 6
  }

  doc.text(`Factuurdatum: ${formatDate(factuurData.datum)}`, 20, y)
  y += 5
  doc.text(`Vervaldatum: ${formatDate(factuurData.vervaldatum)}`, 20, y)
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

  autoTable(doc, {
    startY: y,
    head: [['#', 'Omschrijving', 'Aantal', 'Eenheidsprijs', 'BTW', 'Totaal']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: brand,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [60, 60, 60],
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  })

  // Totals
  const finalY = (doc as any).lastAutoTable?.finalY || y + 20
  let totalsY = finalY + 10

  const pageWidth = doc.internal.pageSize.getWidth()
  const totalsX = pageWidth - 70

  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)

  doc.setFont('helvetica', 'normal')
  doc.text('Subtotaal:', totalsX, totalsY)
  doc.text(formatCurrency(factuurData.subtotaal), pageWidth - 20, totalsY, { align: 'right' })
  totalsY += 7

  doc.text('BTW:', totalsX, totalsY)
  doc.text(formatCurrency(factuurData.btw_bedrag), pageWidth - 20, totalsY, { align: 'right' })
  totalsY += 7

  doc.setDrawColor(...brand)
  doc.setLineWidth(0.5)
  doc.line(totalsX, totalsY - 2, pageWidth - 20, totalsY - 2)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...brand)
  doc.text('Totaal:', totalsX, totalsY + 5)
  doc.text(formatCurrency(factuurData.totaal), pageWidth - 20, totalsY + 5, { align: 'right' })

  // Payment info
  totalsY += 20

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...brand)
  doc.text('Betaalinformatie:', 20, totalsY)
  totalsY += 6

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(9)

  const betaalInfo = factuurData.betaalvoorwaarden ||
    `Wij verzoeken u vriendelijk het totaalbedrag van ${formatCurrency(factuurData.totaal)} over te maken voor ${formatDate(factuurData.vervaldatum)} onder vermelding van factuurnummer ${factuurData.nummer}.`

  const splitPayment = doc.splitTextToSize(betaalInfo, pageWidth - 40)
  doc.text(splitPayment, 20, totalsY)

  // Notes
  if (factuurData.notities) {
    totalsY += splitPayment.length * 5 + 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...brand)
    doc.text('Opmerkingen:', 20, totalsY)
    totalsY += 6

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(9)
    const splitNotes = doc.splitTextToSize(factuurData.notities, pageWidth - 40)
    doc.text(splitNotes, 20, totalsY)
  }

  // Online betaallink
  if (factuurData.betaal_link) {
    totalsY += 15
    // Check if we need a new page
    if (totalsY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      totalsY = 20
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...brand)
    doc.text('Online betalen:', 20, totalsY)
    totalsY += 6

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(9)
    doc.text('Betaal direct via de onderstaande link:', 20, totalsY)
    totalsY += 5

    doc.setTextColor(41, 98, 218)
    doc.textWithLink(factuurData.betaal_link, 20, totalsY, {
      url: factuurData.betaal_link,
    })
  }

  // Footer
  addFooter(doc, bedrijfsProfiel)

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
  bedrijfsProfiel?: PdfBedrijfsProfiel
): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const profile = bedrijfsProfiel || {}
  const brand = getBrandColor(profile)

  // Header
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...brand)
  doc.text(profile.bedrijfsnaam || 'Rapport', 20, 30)

  // Type label
  const typeLabels: Record<string, string> = {
    project: 'Projectrapport',
    financieel: 'Financieel Rapport',
    klant: 'Klantrapport',
    algemeen: 'Rapport',
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(typeLabels[type], 20, 38)

  // Divider
  doc.setDrawColor(...brand)
  doc.setLineWidth(0.5)
  doc.line(20, 42, pageWidth - 20, 42)

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...brand)
  doc.text(data.titel, 20, 54)

  // Date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Datum: ${formatDate(data.datum || new Date().toISOString())}`, 20, 61)

  let y = 72

  // Summary
  if (data.samenvatting) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...brand)
    doc.text('Samenvatting', 20, y)
    y += 7

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const splitSummary = doc.splitTextToSize(data.samenvatting, pageWidth - 40)
    doc.text(splitSummary, 20, y)
    y += splitSummary.length * 5 + 8
  }

  // Sections
  for (const sectie of data.secties) {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage()
      y = 20
    }

    // Section heading
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...brand)
    doc.text(sectie.kop, 20, y)
    y += 7

    // Section content
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const splitContent = doc.splitTextToSize(sectie.inhoud, pageWidth - 40)
    doc.text(splitContent, 20, y)
    y += splitContent.length * 5 + 5

    // Section table
    if (sectie.tabel) {
      autoTable(doc, {
        startY: y,
        head: [sectie.tabel.headers],
        body: sectie.tabel.rijen,
        theme: 'striped',
        headStyles: {
          fillColor: brand,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [60, 60, 60],
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        margin: { left: 20, right: 20 },
      })

      y = (doc as any).lastAutoTable?.finalY + 10 || y + 20
    }

    y += 5
  }

  // Footer
  addFooter(doc, profile)

  return doc
}
