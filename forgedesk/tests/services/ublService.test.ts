import { describe, it, expect } from 'vitest'
import { generateUBLInvoice } from '@/services/ublService'
import { CUSTOMIZATION_NLCIUS, CUSTOMIZATION_PEPPOL_BIS3 } from '@/lib/peppol'

const factuur = {
  nummer: 'F-2026-0042',
  titel: 'Gevelreclame',
  factuurdatum: '2026-09-01T00:00:00Z',
  vervaldatum: '2026-10-01T00:00:00Z',
  subtotaal: 1000,
  btw_bedrag: 210,
  totaal: 1210,
  factuur_type: 'standaard',
  notities: '',
  voorwaarden: 'Betaling binnen 30 dagen',
}

const items = [
  { beschrijving: 'Lichtreclame', aantal: 2, eenheidsprijs: 400, btw_percentage: 21, korting_percentage: 0, totaal: 800, volgorde: 1 },
  { beschrijving: 'Montage', aantal: 1, eenheidsprijs: 200, btw_percentage: 21, korting_percentage: 0, totaal: 200, volgorde: 2 },
]

const nlProfiel = {
  bedrijfsnaam: 'Sign Company B.V.',
  bedrijfs_adres: 'Industrieweg 12, 1234 AB, Amsterdam',
  bedrijfs_land: 'NL',
  kvk_nummer: '12345678',
  btw_nummer: 'NL123456789B01',
  iban: 'NL00 BANK 0123 4567 89',
  bedrijfs_email: 'info@signcompany.nl',
}

const beProfiel = {
  bedrijfsnaam: 'Reclame Antwerpen BV',
  bedrijfs_adres: 'Noorderlaan 1, 2030, Antwerpen',
  bedrijfs_land: 'BE',
  kvk_nummer: '',
  btw_nummer: 'BE 0437.299.999',
  iban: 'BE68 5390 0754 7034',
  bedrijfs_email: 'info@reclame.be',
}

const nlKlant = { bedrijfsnaam: 'De Vries B.V.', adres: 'Kerkstraat 1', postcode: '5678 CD', stad: 'Rotterdam', land: 'NL', kvk_nummer: '87654321', btw_nummer: 'NL987654321B01', email: 'a@devries.nl' }
const beKlant = { bedrijfsnaam: 'Bakkerij Peeters', adres: 'Meir 10', postcode: '2000', stad: 'Antwerpen', land: 'BE', kvk_nummer: '', btw_nummer: 'BE0123456749', email: 'b@peeters.be' }

function tag(xml: string, naam: string): string[] {
  return [...xml.matchAll(new RegExp(`<${naam}[^>]*>([^<]*)</${naam}>`, 'g'))].map((m) => m[1])
}

describe('generateUBLInvoice · Nederlandse leverancier', () => {
  const xml = generateUBLInvoice({ factuur, items, klant: nlKlant, profiel: nlProfiel })

  it('gebruikt NLCIUS en het Peppol-billing-profiel', () => {
    expect(xml).toContain(`<cbc:CustomizationID>${CUSTOMIZATION_NLCIUS}</cbc:CustomizationID>`)
    expect(xml).toContain('<cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>')
  })

  it('zet een EndpointID op KvK (0106) voor beide partijen', () => {
    expect(xml).toContain('<cbc:EndpointID schemeID="0106">12345678</cbc:EndpointID>')
    expect(xml).toContain('<cbc:EndpointID schemeID="0106">87654321</cbc:EndpointID>')
  })

  it('splitst het bedrijfsadres en zet het land uit het profiel', () => {
    expect(xml).toContain('<cbc:StreetName>Industrieweg 12</cbc:StreetName>')
    expect(xml).toContain('<cbc:PostalZone>1234 AB</cbc:PostalZone>')
    expect(xml).toContain('<cbc:CityName>Amsterdam</cbc:CityName>')
    expect(tag(xml, 'cbc:IdentificationCode')).toEqual(['NL', 'NL'])
  })

  it('vult BuyerReference met het factuurnummer als er geen klantreferentie is', () => {
    expect(xml).toContain('<cbc:BuyerReference>F-2026-0042</cbc:BuyerReference>')
    const metRef = generateUBLInvoice({ factuur: { ...factuur, klant_referentie: 'PO-778' }, items, klant: nlKlant, profiel: nlProfiel })
    expect(metRef).toContain('<cbc:BuyerReference>PO-778</cbc:BuyerReference>')
  })

  it('houdt de UBL-volgorde binnen Party aan: TaxScheme vóór LegalEntity', () => {
    const tax = xml.indexOf('<cac:PartyTaxScheme>')
    const legal = xml.indexOf('<cac:PartyLegalEntity>')
    expect(tax).toBeGreaterThan(-1)
    expect(tax).toBeLessThan(legal)
  })

  it('haalt spaties uit de IBAN', () => {
    expect(xml).toContain('<cbc:ID>NL00BANK0123456789</cbc:ID>')
  })

  it('rekent de btw-groep en totalen door', () => {
    expect(xml).toContain('<cbc:TaxAmount currencyID="EUR">210.00</cbc:TaxAmount>')
    expect(xml).toContain('<cbc:TaxableAmount currencyID="EUR">1000.00</cbc:TaxableAmount>')
    expect(xml).toContain('<cbc:PayableAmount currencyID="EUR">1210.00</cbc:PayableAmount>')
    expect(tag(xml, 'cbc:ID').filter((v) => v === 'S')).toHaveLength(3)
  })
})

describe('generateUBLInvoice · Belgische leverancier', () => {
  const xml = generateUBLInvoice({ factuur, items, klant: beKlant, profiel: beProfiel })

  it('gebruikt Peppol BIS 3.0 in plaats van NLCIUS', () => {
    expect(xml).toContain(`<cbc:CustomizationID>${CUSTOMIZATION_PEPPOL_BIS3}</cbc:CustomizationID>`)
    expect(xml).not.toContain('nlcius')
  })

  it('leidt het ondernemingsnummer af uit het btw-nummer en gebruikt schema 0208', () => {
    expect(xml).toContain('<cbc:EndpointID schemeID="0208">0437299999</cbc:EndpointID>')
    expect(xml).toContain('<cbc:CompanyID schemeID="0208">0437299999</cbc:CompanyID>')
    expect(xml).toContain('<cbc:EndpointID schemeID="0208">0123456749</cbc:EndpointID>')
  })

  it('zet BE als land voor beide partijen', () => {
    expect(tag(xml, 'cbc:IdentificationCode')).toEqual(['BE', 'BE'])
  })

  it('normaliseert het btw-nummer in PartyTaxScheme', () => {
    expect(xml).toContain('<cbc:CompanyID>BE0437299999</cbc:CompanyID>')
    expect(xml).not.toContain('BE 0437.299.999')
  })
})

describe('generateUBLInvoice · oude vrije-tekstlanden', () => {
  it('vertaalt "Nederland" en "België" naar ISO-codes in plaats van ze letterlijk over te nemen', () => {
    const xml = generateUBLInvoice({ factuur, items, klant: { ...beKlant, land: 'België' }, profiel: { ...nlProfiel, bedrijfs_land: 'Nederland' } })
    expect(tag(xml, 'cbc:IdentificationCode')).toEqual(['NL', 'BE'])
    expect(xml).not.toContain('>Nederland<')
  })

  it('weigert een e-factuur zonder Peppol-identifier in plaats van stil een onbruikbare UBL te maken', () => {
    expect(() => generateUBLInvoice({ factuur, items, klant: { bedrijfsnaam: 'X' }, profiel: { bedrijfsnaam: 'Y' } })).toThrow(/eigen bedrijf/)
    expect(() => generateUBLInvoice({ factuur, items, klant: { bedrijfsnaam: 'X' }, profiel: nlProfiel })).toThrow(/klant/)
  })

  it('eist een volledig verkoopadres en een klantnaam', () => {
    expect(() => generateUBLInvoice({ factuur, items, klant: nlKlant, profiel: { ...nlProfiel, bedrijfs_adres: 'Industrieweg 12' } })).toThrow(/postcode en plaats/)
    expect(() => generateUBLInvoice({ factuur, items, klant: { ...nlKlant, bedrijfsnaam: '' }, profiel: nlProfiel })).toThrow(/bedrijfsnaam van de klant/)
  })
})

describe('generateUBLInvoice · btw verlegd', () => {
  const xml = generateUBLInvoice({
    factuur: { ...factuur, btw_bedrag: 0, totaal: 1000 },
    items: items.map((i) => ({ ...i, btw_percentage: 0 })),
    klant: { ...beKlant, btw_verlegd: true },
    profiel: nlProfiel,
  })

  it('gebruikt categorie AE met de EU-vrijstellingscode', () => {
    expect(tag(xml, 'cbc:ID').filter((v) => v === 'AE')).toHaveLength(3)
    expect(xml).toContain('<cbc:TaxExemptionReasonCode>VATEX-EU-AE</cbc:TaxExemptionReasonCode>')
    expect(xml).not.toContain('<cbc:ID>S</cbc:ID>')
    expect(xml).not.toContain('<cbc:ID>Z</cbc:ID>')
  })

  it('zet btw-totaal op nul en het te betalen bedrag op het netto', () => {
    expect(xml).toContain('<cbc:TaxAmount currencyID="EUR">0.00</cbc:TaxAmount>')
    expect(xml).toContain('<cbc:PayableAmount currencyID="EUR">1000.00</cbc:PayableAmount>')
  })

  it('zet bij België→België de medecontractant-tekst erbij, grensoverschrijdend art. 194/196, binnenlands niets', () => {
    expect(xml).toContain('art. 194/196')
    const nlnl = generateUBLInvoice({
      factuur: { ...factuur, btw_bedrag: 0, totaal: 1000 },
      items: items.map((i) => ({ ...i, btw_percentage: 0 })),
      klant: { ...nlKlant, btw_verlegd: true },
      profiel: nlProfiel,
    })
    expect(nlnl).not.toContain('Richtlijn')
    const be = generateUBLInvoice({
      factuur: { ...factuur, btw_bedrag: 0, totaal: 1000 },
      items: items.map((i) => ({ ...i, btw_percentage: 0 })),
      klant: { ...beKlant, btw_verlegd: true },
      profiel: beProfiel,
    })
    expect(be).toContain('medecontractant')
    expect(be).toContain('Verlegging van heffing.')
  })

  it('weigert een 0%-verlegging zonder btw-nummer van de klant', () => {
    expect(() => generateUBLInvoice({ factuur: { ...factuur, btw_bedrag: 0, totaal: 1000 }, items: items.map((i) => ({ ...i, btw_percentage: 0 })), klant: { ...nlKlant, btw_nummer: '', btw_verlegd: true }, profiel: nlProfiel })).toThrow(/btw-nummer/)
  })

  it('behandelt een 21%-factuur aan een verlegd-klant als gewone S-factuur', () => {
    const s = generateUBLInvoice({ factuur, items, klant: { ...beKlant, btw_verlegd: true }, profiel: nlProfiel })
    expect(tag(s, 'cbc:ID').filter((v) => v === 'S')).toHaveLength(3)
    expect(s).not.toContain('VATEX-EU-AE')
  })

  it('voegt notities en verleggingstekst samen in één Note (R002)', () => {
    const een = generateUBLInvoice({
      factuur: { ...factuur, btw_bedrag: 0, totaal: 1000, notities: 'Levering week 40' },
      items: items.map((i) => ({ ...i, btw_percentage: 0 })),
      klant: { ...beKlant, btw_verlegd: true },
      profiel: beProfiel,
    })
    // Alleen de Note op documentniveau telt (PaymentTerms heeft zijn eigen cbc:Note)
    const documentNotes = een.split('\n').filter((r) => r.startsWith('  <cbc:Note>'))
    expect(documentNotes).toHaveLength(1)
    expect(documentNotes[0]).toContain('Levering week 40')
    expect(documentNotes[0]).toContain('Verlegging van heffing.')
  })
})

describe('generateUBLInvoice · bedragen uit de regels', () => {
  it('rondt per regel af zodat regels, btw-subtotalen en kop exact sluiten', () => {
    const drie = [1, 2, 3].map((n) => ({ beschrijving: `Regel ${n}`, aantal: 1, eenheidsprijs: 33.33, btw_percentage: 21, korting_percentage: 0, totaal: 33.33, volgorde: n }))
    const xml = generateUBLInvoice({ factuur: { ...factuur, subtotaal: 99.99, btw_bedrag: 21, totaal: 120.99 }, items: drie, klant: nlKlant, profiel: nlProfiel })
    expect(xml).toContain('<cbc:TaxableAmount currencyID="EUR">99.99</cbc:TaxableAmount>')
    expect(xml).toContain('<cbc:TaxAmount currencyID="EUR">21.00</cbc:TaxAmount>')
    expect(xml).toContain('<cbc:PayableAmount currencyID="EUR">120.99</cbc:PayableAmount>')
  })

  it('schrijft korting als AllowanceCharge met basisbedrag en houdt de regel op netto', () => {
    const met = [{ beschrijving: 'Belettering', aantal: 2, eenheidsprijs: 400, btw_percentage: 21, korting_percentage: 10, totaal: 720, volgorde: 1 }]
    const xml = generateUBLInvoice({ factuur: { ...factuur, subtotaal: 720, btw_bedrag: 151.2, totaal: 871.2 }, items: met, klant: nlKlant, profiel: nlProfiel })
    expect(xml).toContain('<cbc:LineExtensionAmount currencyID="EUR">720.00</cbc:LineExtensionAmount>')
    expect(xml).toContain('<cbc:Amount currencyID="EUR">80.00</cbc:Amount>')
    expect(xml).toContain('<cbc:BaseAmount currencyID="EUR">800.00</cbc:BaseAmount>')
    expect(xml).toContain('<cbc:PriceAmount currencyID="EUR">400.0000</cbc:PriceAmount>')
  })

  it('laat een negatieve verrekenregel (voorschot) op een gewone factuur toe', () => {
    const met = [
      { beschrijving: 'Eindafrekening', aantal: 1, eenheidsprijs: 1000, btw_percentage: 21, korting_percentage: 0, totaal: 1000, volgorde: 1 },
      { beschrijving: 'Verrekening voorschot', aantal: 1, eenheidsprijs: -400, btw_percentage: 21, korting_percentage: 0, totaal: -400, volgorde: 2 },
    ]
    const xml = generateUBLInvoice({ factuur: { ...factuur, subtotaal: 600, btw_bedrag: 126, totaal: 726 }, items: met, klant: nlKlant, profiel: nlProfiel })
    expect(xml).toContain('<cbc:InvoicedQuantity unitCode="EA">-1</cbc:InvoicedQuantity>')
    expect(xml).toContain('<cbc:LineExtensionAmount currencyID="EUR">-400.00</cbc:LineExtensionAmount>')
    expect(xml).toContain('<cbc:PriceAmount currencyID="EUR">400.0000</cbc:PriceAmount>')
    expect(xml).toContain('<cbc:PayableAmount currencyID="EUR">726.00</cbc:PayableAmount>')
  })

  it('weigert als het opgeslagen totaal meer dan 5 cent afwijkt van de regels', () => {
    expect(() => generateUBLInvoice({ factuur: { ...factuur, totaal: 1300 }, items, klant: nlKlant, profiel: nlProfiel })).toThrow(/wijkt af/)
  })
})

describe('generateUBLInvoice · creditnota', () => {
  // doen. bewaart creditregels negatief; de UBL maakt er positieve bedragen van
  const creditItems = items.map((i) => ({ ...i, eenheidsprijs: -i.eenheidsprijs, totaal: -i.totaal }))
  const xml = generateUBLInvoice({
    factuur: { ...factuur, factuur_type: 'creditnota', credit_voor_nummer: 'F-2026-0040', subtotaal: -1000, btw_bedrag: -210, totaal: -1210 },
    items: creditItems,
    klant: nlKlant,
    profiel: nlProfiel,
  })

  it('maakt van negatieve doen.-regels positieve UBL-bedragen', () => {
    const neg = generateUBLInvoice({
      factuur: { ...factuur, factuur_type: 'creditnota', subtotaal: -1000, btw_bedrag: -210, totaal: -1210 },
      items: items.map((i) => ({ ...i, eenheidsprijs: -i.eenheidsprijs, totaal: -i.totaal })),
      klant: nlKlant,
      profiel: nlProfiel,
    })
    expect(neg).toContain('<cbc:PriceAmount currencyID="EUR">400.0000</cbc:PriceAmount>')
    expect(neg).toContain('<cbc:PayableAmount currencyID="EUR">1210.00</cbc:PayableAmount>')
    expect(neg).not.toContain('currencyID="EUR">-')
  })

  it('weigert een creditnota met een positieve regel', () => {
    expect(() => generateUBLInvoice({
      factuur: { ...factuur, factuur_type: 'creditnota', totaal: -544.5 },
      items: [{ ...items[0], eenheidsprijs: -400, totaal: -800 }, { ...items[1], totaal: 200 }],
      klant: nlKlant,
      profiel: nlProfiel,
    })).toThrow(/positieve regels/)
  })

  it('is een CreditNote met verwijzing naar de oorspronkelijke factuur', () => {
    expect(xml).toContain('<CreditNote')
    expect(xml).toContain('<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>')
    expect(xml).toContain('<cac:InvoiceDocumentReference>')
    expect(xml).toContain('<cbc:ID>F-2026-0040</cbc:ID>')
    expect(xml).toContain('<cbc:CreditedQuantity unitCode="EA">2</cbc:CreditedQuantity>')
    expect(xml).not.toContain('<cbc:DueDate>')
  })
})

describe('generateUBLInvoice · betalingskenmerk', () => {
  it('gebruikt voor een Belgische leverancier de gestructureerde mededeling als PaymentID', () => {
    const xml = generateUBLInvoice({ factuur, items, klant: beKlant, profiel: beProfiel })
    expect(xml).toContain('<cbc:PaymentID>002026004240</cbc:PaymentID>')
  })

  it('zet op een Belgische creditnota geen gestructureerde mededeling (niets te betalen)', () => {
    const xml = generateUBLInvoice({
      factuur: { ...factuur, factuur_type: 'creditnota', subtotaal: -1000, btw_bedrag: -210, totaal: -1210 },
      items: items.map((i) => ({ ...i, eenheidsprijs: -i.eenheidsprijs, totaal: -i.totaal })),
      klant: beKlant,
      profiel: beProfiel,
    })
    expect(xml).toContain('<cbc:PaymentID>F-2026-0042</cbc:PaymentID>')
  })

  it('houdt voor een Nederlandse leverancier het factuurnummer', () => {
    const xml = generateUBLInvoice({ factuur, items, klant: nlKlant, profiel: nlProfiel })
    expect(xml).toContain('<cbc:PaymentID>F-2026-0042</cbc:PaymentID>')
  })
})
