import { describe, it, expect, beforeAll } from 'vitest'

process.env.VITE_SUPABASE_URL ||= 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-key'

type Bouw = typeof import('../../api/billit-sync-factuur')['bouwBillitOrder']
let bouwBillitOrder: Bouw

beforeAll(async () => {
  const mod = await import('../../api/billit-sync-factuur')
  bouwBillitOrder = mod.bouwBillitOrder
})

const klant = { btw_nummer: 'BE 0437.299.999', email: 'a@b.be', telefoon: '+32 3 123', debiteurennummer: '1001', adres: 'Meir 10', stad: 'Antwerpen', postcode: '2000', land: 'BE' }
const items = [
  { beschrijving: 'Lichtreclame', aantal: 2, eenheidsprijs: 400, btw_percentage: 21, korting_percentage: 10, totaal: 720 },
  { beschrijving: 'Montage', aantal: 1, eenheidsprijs: 200, btw_percentage: 6, korting_percentage: 0, totaal: 200 },
]

describe('bouwBillitOrder', () => {
  it('stuurt echte aantallen als die exact sluiten, anders 1 × regeltotaal', () => {
    const order = bouwBillitOrder({ nummer: 'F-2026-0042', factuurdatum: '2026-09-01T00:00:00Z', vervaldatum: '2026-10-01', isCredit: false, klantNaam: 'Bakkerij Peeters', klant, items }) as any
    expect(order.OrderType).toBe('Invoice')
    expect(order.OrderDirection).toBe('Income')
    expect(order.OrderNumber).toBe('F-2026-0042')
    expect(order.OrderDate).toBe('2026-09-01')
    expect(order.ExpiryDate).toBe('2026-10-01')
    expect(order.OrderLines).toEqual([
      { Quantity: 1, UnitPriceExcl: 720, Description: 'Lichtreclame (2 × €400.00) (10% korting)', VATPercentage: 21 },
      { Quantity: 1, UnitPriceExcl: 200, Description: 'Montage', VATPercentage: 6 },
    ])
    const zonderKorting = bouwBillitOrder({ nummer: 'F-4', isCredit: false, klantNaam: 'X', klant, items: [{ beschrijving: 'Borden', aantal: 3, eenheidsprijs: 12.5, btw_percentage: 21, korting_percentage: 0, totaal: 37.5 }] }) as any
    expect(zonderKorting.OrderLines[0]).toEqual({ Quantity: 3, UnitPriceExcl: 12.5, Description: 'Borden', VATPercentage: 21 })
  })

  it('normaliseert oude vrije-tekstlanden naar een ISO-code', () => {
    const order = bouwBillitOrder({ nummer: 'F-5', isCredit: false, klantNaam: 'X', klant: { ...klant, land: 'België' }, items }) as any
    expect(order.Customer.Addresses[0].CountryCode).toBe('BE')
  })

  it('schoont het btw-nummer op en zet het landcode-adres', () => {
    const order = bouwBillitOrder({ nummer: 'F-1', isCredit: false, klantNaam: 'X', klant, items }) as any
    expect(order.Customer.VATNumber).toBe('BE0437299999')
    expect(order.Customer.Nr).toBe('1001')
    expect(order.Customer.Addresses[0]).toMatchObject({ AddressType: 'InvoiceAddress', City: 'Antwerpen', Zipcode: '2000', CountryCode: 'BE' })
  })

  it('maakt van een creditnota een CreditNote met positieve bedragen en zonder vervaldatum', () => {
    const order = bouwBillitOrder({ nummer: 'C-1', vervaldatum: '2026-10-01', isCredit: true, klantNaam: 'X', klant, items: items.map((i) => ({ ...i, totaal: -i.totaal })) }) as any
    expect(order.OrderType).toBe('CreditNote')
    expect(order.ExpiryDate).toBeUndefined()
    expect(order.OrderLines.map((l: any) => [l.Quantity, l.UnitPriceExcl])).toEqual([[1, 720], [1, 200]])
  })

  it('stuurt het werkelijke btw-percentage door (verlegd = regels op 0%)', () => {
    const order = bouwBillitOrder({ nummer: 'F-2', isCredit: false, klantNaam: 'X', klant, items: items.map((i) => ({ ...i, btw_percentage: 0 })) }) as any
    expect(order.OrderLines.every((l: any) => l.VATPercentage === 0)).toBe(true)
  })

  it('valt terug op NL zonder klantgegevens', () => {
    const order = bouwBillitOrder({ nummer: 'F-3', isCredit: false, klantNaam: 'Onbekend', klant: null, items }) as any
    expect(order.Customer.Addresses[0].CountryCode).toBe('NL')
    expect(order.Customer.VATNumber).toBeUndefined()
  })
})
