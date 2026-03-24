/**
 * UBL 2.1 (NLCIUS) XML Invoice Generator
 *
 * Genereert een geldige UBL 2.1 XML factuur conform de Nederlandse NLCIUS standaard
 * voor B2B e-facturatie. Ondersteunt standaard facturen en creditnota's.
 */

import type { Factuur, FactuurItem, Klant, Profile } from '@/types'

// XML escaping
function esc(val: string | number | undefined | null): string {
  if (val == null) return ''
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function amount(val: number): string {
  return val.toFixed(2)
}

function dateStr(val: string | undefined): string {
  if (!val) return new Date().toISOString().split('T')[0]
  return val.split('T')[0]
}

interface UBLInput {
  factuur: Pick<Factuur, 'nummer' | 'titel' | 'factuurdatum' | 'vervaldatum' | 'subtotaal' | 'btw_bedrag' | 'totaal' | 'factuur_type' | 'notities' | 'voorwaarden'> & { kostenplaats_code?: string; credit_voor_nummer?: string }
  items: (Pick<FactuurItem, 'beschrijving' | 'aantal' | 'eenheidsprijs' | 'btw_percentage' | 'korting_percentage' | 'totaal' | 'volgorde'> & { grootboek_code?: string })[]
  klant: Partial<Klant>
  profiel: Partial<Profile>
}

export function generateUBLInvoice({ factuur, items, klant, profiel }: UBLInput): string {
  const isCreditnota = factuur.factuur_type === 'creditnota' || factuur.factuur_type === 'credit'
  const docType = isCreditnota ? 'CreditNote' : 'Invoice'
  const ns = isCreditnota
    ? 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2'
    : 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'

  // Groepeer items per BTW-percentage
  const btwGroepen = new Map<number, { taxable: number; tax: number }>()
  for (const item of items) {
    const pct = item.btw_percentage
    const existing = btwGroepen.get(pct) || { taxable: 0, tax: 0 }
    const kortingFactor = 1 - (item.korting_percentage || 0) / 100
    const lineNet = item.aantal * item.eenheidsprijs * kortingFactor
    existing.taxable += lineNet
    existing.tax += lineNet * (pct / 100)
    btwGroepen.set(pct, existing)
  }

  const lines: string[] = []

  // XML declaration
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')

  // Root element
  lines.push(`<${docType}`)
  lines.push(`  xmlns="${ns}"`)
  lines.push('  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"')
  lines.push('  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">')

  // BT-24: Customization ID (NLCIUS)
  lines.push('  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:nen.nl:nlcius:v1.0</cbc:CustomizationID>')
  // BT-23: Profile ID (basic)
  lines.push('  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>')

  // BT-1: Invoice number
  lines.push(`  <cbc:ID>${esc(factuur.nummer)}</cbc:ID>`)
  // BT-2: Issue date
  lines.push(`  <cbc:IssueDate>${dateStr(factuur.factuurdatum)}</cbc:IssueDate>`)

  if (!isCreditnota) {
    // BT-9: Due date
    lines.push(`  <cbc:DueDate>${dateStr(factuur.vervaldatum)}</cbc:DueDate>`)
  }

  // BT-3: Invoice type code (380 = commercial invoice, 381 = credit note)
  lines.push(`  <cbc:${isCreditnota ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'}>${isCreditnota ? '381' : '380'}</cbc:${isCreditnota ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'}>`)

  // BT-22: Notes
  if (factuur.notities) {
    lines.push(`  <cbc:Note>${esc(factuur.notities)}</cbc:Note>`)
  }

  // BT-5: Currency
  lines.push('  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>')

  // BT-19: AccountingCost (kostenplaats)
  if (factuur.kostenplaats_code) {
    lines.push(`  <cbc:AccountingCost>${esc(factuur.kostenplaats_code)}</cbc:AccountingCost>`)
  }

  // BG-3: Billing reference (credit note → original invoice)
  if (isCreditnota && factuur.credit_voor_nummer) {
    lines.push('  <cac:BillingReference>')
    lines.push('    <cac:InvoiceDocumentReference>')
    lines.push(`      <cbc:ID>${esc(factuur.credit_voor_nummer)}</cbc:ID>`)
    lines.push('    </cac:InvoiceDocumentReference>')
    lines.push('  </cac:BillingReference>')
  }

  // BG-4: Seller (leverancier)
  lines.push('  <cac:AccountingSupplierParty>')
  lines.push('    <cac:Party>')
  if (profiel.bedrijfsnaam) {
    lines.push('      <cac:PartyName>')
    lines.push(`        <cbc:Name>${esc(profiel.bedrijfsnaam)}</cbc:Name>`)
    lines.push('      </cac:PartyName>')
  }
  lines.push('      <cac:PostalAddress>')
  if (profiel.bedrijfs_adres) {
    lines.push(`        <cbc:StreetName>${esc(profiel.bedrijfs_adres)}</cbc:StreetName>`)
  }
  lines.push('        <cac:Country>')
  lines.push('          <cbc:IdentificationCode>NL</cbc:IdentificationCode>')
  lines.push('        </cac:Country>')
  lines.push('      </cac:PostalAddress>')
  if (profiel.kvk_nummer) {
    lines.push('      <cac:PartyLegalEntity>')
    lines.push(`        <cbc:RegistrationName>${esc(profiel.bedrijfsnaam)}</cbc:RegistrationName>`)
    lines.push(`        <cbc:CompanyID schemeID="0106">${esc(profiel.kvk_nummer)}</cbc:CompanyID>`)
    lines.push('      </cac:PartyLegalEntity>')
  }
  if (profiel.btw_nummer) {
    lines.push('      <cac:PartyTaxScheme>')
    lines.push(`        <cbc:CompanyID>${esc(profiel.btw_nummer)}</cbc:CompanyID>`)
    lines.push('        <cac:TaxScheme>')
    lines.push('          <cbc:ID>VAT</cbc:ID>')
    lines.push('        </cac:TaxScheme>')
    lines.push('      </cac:PartyTaxScheme>')
  }
  if (profiel.email || profiel.bedrijfs_email) {
    lines.push('      <cac:Contact>')
    lines.push(`        <cbc:ElectronicMail>${esc(profiel.bedrijfs_email || profiel.email)}</cbc:ElectronicMail>`)
    if (profiel.bedrijfs_telefoon || profiel.telefoon) {
      lines.push(`        <cbc:Telephone>${esc(profiel.bedrijfs_telefoon || profiel.telefoon)}</cbc:Telephone>`)
    }
    lines.push('      </cac:Contact>')
  }
  lines.push('    </cac:Party>')
  lines.push('  </cac:AccountingSupplierParty>')

  // BG-7: Buyer (klant)
  lines.push('  <cac:AccountingCustomerParty>')
  lines.push('    <cac:Party>')
  if (klant.bedrijfsnaam) {
    lines.push('      <cac:PartyName>')
    lines.push(`        <cbc:Name>${esc(klant.bedrijfsnaam)}</cbc:Name>`)
    lines.push('      </cac:PartyName>')
  }
  lines.push('      <cac:PostalAddress>')
  if (klant.adres) lines.push(`        <cbc:StreetName>${esc(klant.adres)}</cbc:StreetName>`)
  if (klant.stad) lines.push(`        <cbc:CityName>${esc(klant.stad)}</cbc:CityName>`)
  if (klant.postcode) lines.push(`        <cbc:PostalZone>${esc(klant.postcode)}</cbc:PostalZone>`)
  lines.push('        <cac:Country>')
  lines.push(`          <cbc:IdentificationCode>${esc(klant.land || 'NL')}</cbc:IdentificationCode>`)
  lines.push('        </cac:Country>')
  lines.push('      </cac:PostalAddress>')
  if (klant.kvk_nummer) {
    lines.push('      <cac:PartyLegalEntity>')
    lines.push(`        <cbc:RegistrationName>${esc(klant.bedrijfsnaam)}</cbc:RegistrationName>`)
    lines.push(`        <cbc:CompanyID schemeID="0106">${esc(klant.kvk_nummer)}</cbc:CompanyID>`)
    lines.push('      </cac:PartyLegalEntity>')
  }
  if (klant.btw_nummer) {
    lines.push('      <cac:PartyTaxScheme>')
    lines.push(`        <cbc:CompanyID>${esc(klant.btw_nummer)}</cbc:CompanyID>`)
    lines.push('        <cac:TaxScheme>')
    lines.push('          <cbc:ID>VAT</cbc:ID>')
    lines.push('        </cac:TaxScheme>')
    lines.push('      </cac:PartyTaxScheme>')
  }
  if (klant.email) {
    lines.push('      <cac:Contact>')
    lines.push(`        <cbc:ElectronicMail>${esc(klant.email)}</cbc:ElectronicMail>`)
    if (klant.telefoon) lines.push(`        <cbc:Telephone>${esc(klant.telefoon)}</cbc:Telephone>`)
    lines.push('      </cac:Contact>')
  }
  lines.push('    </cac:Party>')
  lines.push('  </cac:AccountingCustomerParty>')

  // BG-16: Payment means (IBAN)
  if (profiel.iban) {
    lines.push('  <cac:PaymentMeans>')
    lines.push('    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>') // SEPA credit transfer
    lines.push(`    <cbc:PaymentID>${esc(factuur.nummer)}</cbc:PaymentID>`)
    lines.push('    <cac:PayeeFinancialAccount>')
    lines.push(`      <cbc:ID>${esc(profiel.iban)}</cbc:ID>`)
    lines.push('    </cac:PayeeFinancialAccount>')
    lines.push('  </cac:PaymentMeans>')
  }

  // Payment terms
  if (factuur.voorwaarden) {
    lines.push('  <cac:PaymentTerms>')
    lines.push(`    <cbc:Note>${esc(factuur.voorwaarden)}</cbc:Note>`)
    lines.push('  </cac:PaymentTerms>')
  }

  // BG-23: Tax total
  lines.push('  <cac:TaxTotal>')
  lines.push(`    <cbc:TaxAmount currencyID="EUR">${amount(factuur.btw_bedrag)}</cbc:TaxAmount>`)
  for (const [pct, group] of btwGroepen) {
    lines.push('    <cac:TaxSubtotal>')
    lines.push(`      <cbc:TaxableAmount currencyID="EUR">${amount(group.taxable)}</cbc:TaxableAmount>`)
    lines.push(`      <cbc:TaxAmount currencyID="EUR">${amount(group.tax)}</cbc:TaxAmount>`)
    lines.push('      <cac:TaxCategory>')
    lines.push(`        <cbc:ID>${pct === 0 ? 'Z' : 'S'}</cbc:ID>`)
    lines.push(`        <cbc:Percent>${pct}</cbc:Percent>`)
    lines.push('        <cac:TaxScheme>')
    lines.push('          <cbc:ID>VAT</cbc:ID>')
    lines.push('        </cac:TaxScheme>')
    lines.push('      </cac:TaxCategory>')
    lines.push('    </cac:TaxSubtotal>')
  }
  lines.push('  </cac:TaxTotal>')

  // BG-22: Legal monetary totals
  lines.push('  <cac:LegalMonetaryTotal>')
  lines.push(`    <cbc:LineExtensionAmount currencyID="EUR">${amount(factuur.subtotaal)}</cbc:LineExtensionAmount>`)
  lines.push(`    <cbc:TaxExclusiveAmount currencyID="EUR">${amount(factuur.subtotaal)}</cbc:TaxExclusiveAmount>`)
  lines.push(`    <cbc:TaxInclusiveAmount currencyID="EUR">${amount(factuur.totaal)}</cbc:TaxInclusiveAmount>`)
  lines.push(`    <cbc:PayableAmount currencyID="EUR">${amount(factuur.totaal)}</cbc:PayableAmount>`)
  lines.push('  </cac:LegalMonetaryTotal>')

  // BG-25: Invoice lines
  const lineTag = isCreditnota ? 'CreditNoteLine' : 'InvoiceLine'
  const qtyTag = isCreditnota ? 'CreditedQuantity' : 'InvoicedQuantity'

  for (const item of items) {
    const kortingFactor = 1 - (item.korting_percentage || 0) / 100
    const lineNet = item.aantal * item.eenheidsprijs * kortingFactor

    lines.push(`  <cac:${lineTag}>`)
    lines.push(`    <cbc:ID>${item.volgorde}</cbc:ID>`)
    lines.push(`    <cbc:${qtyTag} unitCode="EA">${item.aantal}</cbc:${qtyTag}>`)
    lines.push(`    <cbc:LineExtensionAmount currencyID="EUR">${amount(lineNet)}</cbc:LineExtensionAmount>`)

    // BT-133: AccountingCost per regel (grootboekrekening)
    if (item.grootboek_code) {
      lines.push(`    <cbc:AccountingCost>${esc(item.grootboek_code)}</cbc:AccountingCost>`)
    }

    // Korting op regelniveau
    if (item.korting_percentage > 0) {
      const kortingBedrag = item.aantal * item.eenheidsprijs * (item.korting_percentage / 100)
      lines.push('    <cac:AllowanceCharge>')
      lines.push('      <cbc:ChargeIndicator>false</cbc:ChargeIndicator>')
      lines.push(`      <cbc:AllowanceChargeReason>Korting ${item.korting_percentage}%</cbc:AllowanceChargeReason>`)
      lines.push(`      <cbc:Amount currencyID="EUR">${amount(kortingBedrag)}</cbc:Amount>`)
      lines.push('    </cac:AllowanceCharge>')
    }

    lines.push('    <cac:Item>')
    lines.push(`      <cbc:Name>${esc(item.beschrijving)}</cbc:Name>`)
    lines.push('      <cac:ClassifiedTaxCategory>')
    lines.push(`        <cbc:ID>${item.btw_percentage === 0 ? 'Z' : 'S'}</cbc:ID>`)
    lines.push(`        <cbc:Percent>${item.btw_percentage}</cbc:Percent>`)
    lines.push('        <cac:TaxScheme>')
    lines.push('          <cbc:ID>VAT</cbc:ID>')
    lines.push('        </cac:TaxScheme>')
    lines.push('      </cac:ClassifiedTaxCategory>')
    lines.push('    </cac:Item>')
    lines.push('    <cac:Price>')
    lines.push(`      <cbc:PriceAmount currencyID="EUR">${amount(item.eenheidsprijs)}</cbc:PriceAmount>`)
    lines.push('    </cac:Price>')
    lines.push(`  </cac:${lineTag}>`)
  }

  lines.push(`</${docType}>`)

  return lines.join('\n')
}

/** Download UBL XML als bestand */
export function downloadUBLXml(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
