import { describe, it, expect, beforeAll } from 'vitest'

process.env.VITE_SUPABASE_URL ||= 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-key'

type Regel = { eenheidsprijs: number; btw_percentage: number; totaal: number; aantal: number }
let regelUitTotalen: (beschrijving: string, subtotaal: number, btwBedrag: number) => Regel

beforeAll(async () => {
  const mod = await import('../../api/exact-sync-factuur')
  regelUitTotalen = mod.regelUitTotalen
})

// Voorschot- en eindafrekeningsfacturen hebben alleen kopbedragen. De regel die
// daaruit gemaakt wordt moet het btw-bedrag op de cent reproduceren, anders
// boekt Exact een ander bedrag dan er op de factuur van de klant staat.
describe('regelUitTotalen', () => {
  it('herkent het zuivere tarief van 21 procent', () => {
    const regel = regelUitTotalen('Voorschot 30%', 1000, 210)
    expect(regel.btw_percentage).toBe(21)
    expect(regel.eenheidsprijs).toBe(1000)
    expect(regel.totaal).toBe(1000)
    expect(regel.aantal).toBe(1)
  })

  it('herkent 9 procent en 0 procent', () => {
    expect(regelUitTotalen('x', 1000, 90).btw_percentage).toBe(9)
    expect(regelUitTotalen('x', 1000, 0).btw_percentage).toBe(0)
  })

  it('rekent bij een gemengd tarief het werkelijke percentage uit', () => {
    // 21% over de helft en 9% over de andere helft geeft 15% gemiddeld. Dat is
    // geen Exact-btw-code, dus de bestaande controle hoort hem daarna te weigeren
    // in plaats van hem stil op 21 te boeken.
    expect(regelUitTotalen('x', 1000, 150).btw_percentage).toBe(15)
  })

  it('werkt ook voor een creditnota met negatieve bedragen', () => {
    const regel = regelUitTotalen('Creditnota', -1000, -210)
    expect(regel.btw_percentage).toBe(21)
    expect(regel.eenheidsprijs).toBe(-1000)
  })

  it('houdt centen heel bij een voorschot met een schuin bedrag', () => {
    const regel = regelUitTotalen('Voorschot 33%', 333.33, 70)
    expect(regel.eenheidsprijs).toBe(333.33)
    expect(regel.btw_percentage).toBe(21)
  })
})
