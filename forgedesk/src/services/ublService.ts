/**
 * UBL 2.1 XML factuur voor e-facturatie.
 *
 * Nederlandse leverancier: NLCIUS (de NL-verbijzondering van Peppol BIS 3.0).
 * Andere leverancier (België, ...): Peppol BIS Billing 3.0.
 * Beide partijen krijgen een EndpointID, want daarop routeert Peppol.
 * Ondersteunt standaard facturen, creditnota's en verlegde btw.
 */

import type { Factuur, FactuurItem, Klant, Profile } from '@/types'
import { landOfStandaard } from '@/lib/landen'
import { peppolIdentifier, peppolRechtspersoon, ublCustomizationId, PROFILE_PEPPOL_BILLING } from '@/lib/peppol'
import { gestructureerdeMededelingKaal } from '@/lib/betalingskenmerk'

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

// Zelfde splitsing als BedrijfTab: "Straat 1, 1234 AB, Stad".
function splitsBedrijfsAdres(adres: string | undefined): { straat: string; postcode: string; stad: string } {
  const delen = (adres || '').split(', ').map((d) => d.trim())
  if (delen.length >= 3) return { straat: delen[0], postcode: delen[1], stad: delen.slice(2).join(', ') }
  return { straat: adres || '', postcode: '', stad: '' }
}

interface UBLInput {
  factuur: Pick<Factuur, 'nummer' | 'titel' | 'factuurdatum' | 'vervaldatum' | 'subtotaal' | 'btw_bedrag' | 'totaal' | 'factuur_type' | 'notities' | 'voorwaarden'> & { kostenplaats_code?: string; credit_voor_nummer?: string; klant_referentie?: string | null }
  items: (Pick<FactuurItem, 'beschrijving' | 'aantal' | 'eenheidsprijs' | 'btw_percentage' | 'korting_percentage' | 'totaal' | 'volgorde'> & { grootboek_code?: string })[]
  klant: Partial<Klant>
  profiel: Partial<Profile>
}

// Btw-categorie (UNCL5305): S = standaard, Z = nultarief, AE = verlegd.
function btwCategorie(pct: number, verlegd: boolean): 'S' | 'Z' | 'AE' {
  if (verlegd) return 'AE'
  return pct === 0 ? 'Z' : 'S'
}

function taxCategoryLines(indent: string, pct: number, verlegd: boolean): string[] {
  const categorie = btwCategorie(pct, verlegd)
  const lines = [
    `${indent}<cbc:ID>${categorie}</cbc:ID>`,
    `${indent}<cbc:Percent>${verlegd ? 0 : pct}</cbc:Percent>`,
  ]
  if (categorie === 'AE') {
    lines.push(`${indent}<cbc:TaxExemptionReasonCode>VATEX-EU-AE</cbc:TaxExemptionReasonCode>`)
    lines.push(`${indent}<cbc:TaxExemptionReason>Btw verlegd</cbc:TaxExemptionReason>`)
  }
  lines.push(`${indent}<cac:TaxScheme>`)
  lines.push(`${indent}  <cbc:ID>VAT</cbc:ID>`)
  lines.push(`${indent}</cac:TaxScheme>`)
  return lines
}

export function generateUBLInvoice({ factuur, items, klant, profiel }: UBLInput): string {
  const isCreditnota = factuur.factuur_type === 'creditnota' || factuur.factuur_type === 'credit'
  const docType = isCreditnota ? 'CreditNote' : 'Invoice'
  const ns = isCreditnota
    ? 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2'
    : 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'

  const leveranciersLand = landOfStandaard(profiel.bedrijfs_land)
  const klantLand = landOfStandaard(klant.land)
  const verlegd = klant.btw_verlegd === true
  const leverancierAdres = splitsBedrijfsAdres(profiel.bedrijfs_adres)
  const leverancierEndpoint = peppolIdentifier({ land: leveranciersLand, btw_nummer: profiel.btw_nummer, kvk_nummer: profiel.kvk_nummer })
  const leverancierRechtspersoon = peppolRechtspersoon({ land: leveranciersLand, btw_nummer: profiel.btw_nummer, kvk_nummer: profiel.kvk_nummer })
  const klantEndpoint = peppolIdentifier({ land: klantLand, btw_nummer: klant.btw_nummer, kvk_nummer: klant.kvk_nummer })
  const klantRechtspersoon = peppolRechtspersoon({ land: klantLand, btw_nummer: klant.btw_nummer, kvk_nummer: klant.kvk_nummer })

  // Groepeer items per BTW-percentage
  const btwGroepen = new Map<number, { taxable: number; tax: number }>()
  for (const item of items) {
    const pct = verlegd ? 0 : item.btw_percentage
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

  // BT-24: Customization ID (NLCIUS voor NL, Peppol BIS 3.0 daarbuiten)
  lines.push(`  <cbc:CustomizationID>${ublCustomizationId(leveranciersLand)}</cbc:CustomizationID>`)
  // BT-23: Profile ID
  lines.push(`  <cbc:ProfileID>${PROFILE_PEPPOL_BILLING}</cbc:ProfileID>`)

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

  // BT-10: BuyerReference is verplicht in BIS 3.0; klantreferentie/PO, anders het factuurnummer
  lines.push(`  <cbc:BuyerReference>${esc(factuur.klant_referentie || factuur.nummer)}</cbc:BuyerReference>`)

  // BG-3: Billing reference (credit note → original invoice)
  if (isCreditnota && factuur.credit_voor_nummer) {
    lines.push('  <cac:BillingReference>')
    lines.push('    <cac:InvoiceDocumentReference>')
    lines.push(`      <cbc:ID>${esc(factuur.credit_voor_nummer)}</cbc:ID>`)
    lines.push('    </cac:InvoiceDocumentReference>')
    lines.push('  </cac:BillingReference>')
  }

  // BG-4: Seller (leverancier). Volgorde binnen cac:Party ligt vast in het
  // UBL-schema: EndpointID, PartyName, PostalAddress, PartyTaxScheme,
  // PartyLegalEntity, Contact.
  lines.push('  <cac:AccountingSupplierParty>')
  lines.push('    <cac:Party>')
  if (leverancierEndpoint) {
    lines.push(`      <cbc:EndpointID schemeID="${leverancierEndpoint.schemeID}">${esc(leverancierEndpoint.id)}</cbc:EndpointID>`)
  }
  if (profiel.bedrijfsnaam) {
    lines.push('      <cac:PartyName>')
    lines.push(`        <cbc:Name>${esc(profiel.bedrijfsnaam)}</cbc:Name>`)
    lines.push('      </cac:PartyName>')
  }
  lines.push('      <cac:PostalAddress>')
  if (leverancierAdres.straat) lines.push(`        <cbc:StreetName>${esc(leverancierAdres.straat)}</cbc:StreetName>`)
  if (leverancierAdres.stad) lines.push(`        <cbc:CityName>${esc(leverancierAdres.stad)}</cbc:CityName>`)
  if (leverancierAdres.postcode) lines.push(`        <cbc:PostalZone>${esc(leverancierAdres.postcode)}</cbc:PostalZone>`)
  lines.push('        <cac:Country>')
  lines.push(`          <cbc:IdentificationCode>${leveranciersLand}</cbc:IdentificationCode>`)
  lines.push('        </cac:Country>')
  lines.push('      </cac:PostalAddress>')
  if (profiel.btw_nummer) {
    lines.push('      <cac:PartyTaxScheme>')
    lines.push(`        <cbc:CompanyID>${esc(profiel.btw_nummer)}</cbc:CompanyID>`)
    lines.push('        <cac:TaxScheme>')
    lines.push('          <cbc:ID>VAT</cbc:ID>')
    lines.push('        </cac:TaxScheme>')
    lines.push('      </cac:PartyTaxScheme>')
  }
  // BT-27/BT-30: RegistrationName is verplicht, CompanyID alleen als we een geldig nummer hebben
  lines.push('      <cac:PartyLegalEntity>')
  lines.push(`        <cbc:RegistrationName>${esc(profiel.bedrijfsnaam)}</cbc:RegistrationName>`)
  if (leverancierRechtspersoon) {
    lines.push(`        <cbc:CompanyID schemeID="${leverancierRechtspersoon.schemeID}">${esc(leverancierRechtspersoon.id)}</cbc:CompanyID>`)
  }
  lines.push('      </cac:PartyLegalEntity>')
  if (profiel.email || profiel.bedrijfs_email) {
    lines.push('      <cac:Contact>')
    if (profiel.bedrijfs_telefoon || profiel.telefoon) {
      lines.push(`        <cbc:Telephone>${esc(profiel.bedrijfs_telefoon || profiel.telefoon)}</cbc:Telephone>`)
    }
    lines.push(`        <cbc:ElectronicMail>${esc(profiel.bedrijfs_email || profiel.email)}</cbc:ElectronicMail>`)
    lines.push('      </cac:Contact>')
  }
  lines.push('    </cac:Party>')
  lines.push('  </cac:AccountingSupplierParty>')

  // BG-7: Buyer (klant)
  lines.push('  <cac:AccountingCustomerParty>')
  lines.push('    <cac:Party>')
  if (klantEndpoint) {
    lines.push(`      <cbc:EndpointID schemeID="${klantEndpoint.schemeID}">${esc(klantEndpoint.id)}</cbc:EndpointID>`)
  }
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
  lines.push(`          <cbc:IdentificationCode>${klantLand}</cbc:IdentificationCode>`)
  lines.push('        </cac:Country>')
  lines.push('      </cac:PostalAddress>')
  if (klant.btw_nummer) {
    lines.push('      <cac:PartyTaxScheme>')
    lines.push(`        <cbc:CompanyID>${esc(klant.btw_nummer)}</cbc:CompanyID>`)
    lines.push('        <cac:TaxScheme>')
    lines.push('          <cbc:ID>VAT</cbc:ID>')
    lines.push('        </cac:TaxScheme>')
    lines.push('      </cac:PartyTaxScheme>')
  }
  lines.push('      <cac:PartyLegalEntity>')
  lines.push(`        <cbc:RegistrationName>${esc(klant.bedrijfsnaam)}</cbc:RegistrationName>`)
  if (klantRechtspersoon) {
    lines.push(`        <cbc:CompanyID schemeID="${klantRechtspersoon.schemeID}">${esc(klantRechtspersoon.id)}</cbc:CompanyID>`)
  }
  lines.push('      </cac:PartyLegalEntity>')
  if (klant.email) {
    lines.push('      <cac:Contact>')
    if (klant.telefoon) lines.push(`        <cbc:Telephone>${esc(klant.telefoon)}</cbc:Telephone>`)
    lines.push(`        <cbc:ElectronicMail>${esc(klant.email)}</cbc:ElectronicMail>`)
    lines.push('      </cac:Contact>')
  }
  lines.push('    </cac:Party>')
  lines.push('  </cac:AccountingCustomerParty>')

  // BG-16: Payment means (IBAN)
  if (profiel.iban) {
    lines.push('  <cac:PaymentMeans>')
    lines.push('    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>') // SEPA credit transfer
    // BT-83 betalingskenmerk: Belgische banken matchen op de gestructureerde mededeling
    const betalingskenmerk = leveranciersLand === 'BE' ? gestructureerdeMededelingKaal(factuur.nummer) : null
    lines.push(`    <cbc:PaymentID>${esc(betalingskenmerk ?? factuur.nummer)}</cbc:PaymentID>`)
    lines.push('    <cac:PayeeFinancialAccount>')
    lines.push(`      <cbc:ID>${esc(profiel.iban.replace(/\s/g, ''))}</cbc:ID>`)
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
  const btwTotaal = verlegd ? 0 : factuur.btw_bedrag
  lines.push('  <cac:TaxTotal>')
  lines.push(`    <cbc:TaxAmount currencyID="EUR">${amount(btwTotaal)}</cbc:TaxAmount>`)
  for (const [pct, group] of btwGroepen) {
    lines.push('    <cac:TaxSubtotal>')
    lines.push(`      <cbc:TaxableAmount currencyID="EUR">${amount(group.taxable)}</cbc:TaxableAmount>`)
    lines.push(`      <cbc:TaxAmount currencyID="EUR">${amount(group.tax)}</cbc:TaxAmount>`)
    lines.push('      <cac:TaxCategory>')
    lines.push(...taxCategoryLines('        ', pct, verlegd))
    lines.push('      </cac:TaxCategory>')
    lines.push('    </cac:TaxSubtotal>')
  }
  lines.push('  </cac:TaxTotal>')

  // BG-22: Legal monetary totals
  const teBetalen = verlegd ? factuur.subtotaal : factuur.totaal
  lines.push('  <cac:LegalMonetaryTotal>')
  lines.push(`    <cbc:LineExtensionAmount currencyID="EUR">${amount(factuur.subtotaal)}</cbc:LineExtensionAmount>`)
  lines.push(`    <cbc:TaxExclusiveAmount currencyID="EUR">${amount(factuur.subtotaal)}</cbc:TaxExclusiveAmount>`)
  lines.push(`    <cbc:TaxInclusiveAmount currencyID="EUR">${amount(teBetalen)}</cbc:TaxInclusiveAmount>`)
  lines.push(`    <cbc:PayableAmount currencyID="EUR">${amount(teBetalen)}</cbc:PayableAmount>`)
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
    lines.push(...taxCategoryLines('        ', item.btw_percentage, verlegd))
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
