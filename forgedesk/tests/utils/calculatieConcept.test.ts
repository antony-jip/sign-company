import { describe, it, expect } from 'vitest'
import { bouwCalculatieConcept } from '../../src/utils/calculatieConcept'
import { berekenCalculatieTotalen } from '../../src/utils/calculatieBerekening'
import type { CalculatieProduct } from '../../src/types'

function maakProduct(overrides: Partial<CalculatieProduct>): CalculatieProduct {
  return {
    id: 'p',
    naam: '',
    categorie: 'Materiaal',
    eenheid: 'stuks',
    inkoop_prijs: 0,
    verkoop_prijs: 0,
    standaard_marge: 35,
    btw_percentage: 21,
    actief: true,
    notitie: '',
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

const CATALOGUS: CalculatieProduct[] = [
  maakProduct({
    id: 'beachflag',
    naam: 'Beachflag',
    categorie: 'Materiaal',
    eenheid: 'stuks',
    inkoop_prijs: 96,
    verkoop_prijs: 177.6,
    standaard_marge: 85,
    btw_percentage: 21,
  }),
  maakProduct({
    id: 'montage',
    naam: 'Montage',
    categorie: 'Arbeid',
    eenheid: 'uur',
    inkoop_prijs: 40,
    verkoop_prijs: 75,
    standaard_marge: 87.5,
    btw_percentage: 21,
  }),
]

describe('bouwCalculatieConcept', () => {
  it('lege input -> niets te doen, klaar', () => {
    const concept = bouwCalculatieConcept({ klant: 'KWS Vegetables', regels: [] }, CATALOGUS)
    expect(concept).toEqual({
      klant: 'KWS Vegetables',
      regels: [],
      totalen: {
        totaalInkoop: 0,
        totaalVerkoop: 0,
        totaalKorting: 0,
        margeBedrag: 0,
        margePercentage: 0,
      },
      vragen: [],
      klaar: true,
    })
  })

  it('gevonden product zonder inkoop/marge -> catalogus-inkoop + standaard-marge', () => {
    const concept = bouwCalculatieConcept(
      { klant: 'KWS', regels: [{ type: 'product', omschrijving: 'beachflag', aantal: 2 }] },
      CATALOGUS,
    )
    expect(concept.klaar).toBe(true)
    expect(concept.vragen).toEqual([])
    expect(concept.regels).toHaveLength(1)
    const r = concept.regels[0]
    expect(r.product_id).toBe('beachflag')
    expect(r.product_naam).toBe('Beachflag')
    expect(r.eenheid).toBe('stuks')
    expect(r.btw_percentage).toBe(21)
    expect(r.aantal).toBe(2)
    expect(r.inkoop_prijs).toBe(96)
    // standaard_marge 85% -> 96 * 1.85 = 177.6
    expect(r.verkoop_prijs).toBe(177.6)
    expect(r.marge_percentage).toBe(85)
    expect(concept.totalen).toEqual(berekenCalculatieTotalen(concept.regels))
  })

  it('product met inkoop + marge procent -> verkoop via markup', () => {
    const concept = bouwCalculatieConcept(
      {
        klant: 'KWS',
        regels: [
          { type: 'product', omschrijving: 'beachflag', aantal: 1, inkoop: 96, marge: 85, marge_type: 'procent' },
        ],
      },
      CATALOGUS,
    )
    expect(concept.klaar).toBe(true)
    const r = concept.regels[0]
    expect(r.inkoop_prijs).toBe(96)
    expect(r.verkoop_prijs).toBe(177.6) // 96 * 1.85
    expect(r.marge_percentage).toBe(85)
  })

  it('product met inkoop + marge bedrag -> verkoop = inkoop + bedrag, marge% afgeleid', () => {
    const concept = bouwCalculatieConcept(
      {
        klant: 'KWS',
        regels: [
          { type: 'product', omschrijving: 'beachflag', aantal: 1, inkoop: 96, marge: 85, marge_type: 'bedrag' },
        ],
      },
      CATALOGUS,
    )
    expect(concept.klaar).toBe(true)
    const r = concept.regels[0]
    expect(r.verkoop_prijs).toBe(181) // 96 + 85
    // markup = (181 - 96) / 96 * 100 = 88.5416..., afgerond op 1 decimaal
    expect(r.marge_percentage).toBe(88.5)
  })

  it('montage via catalogus -> aantal = uren, tarief uit product (niet verzonnen)', () => {
    const concept = bouwCalculatieConcept(
      { klant: 'KWS', regels: [{ type: 'montage', omschrijving: 'montage buiten', uren: 2 }] },
      CATALOGUS,
    )
    expect(concept.klaar).toBe(true)
    expect(concept.vragen).toEqual([])
    const r = concept.regels[0]
    expect(r.product_id).toBe('montage')
    expect(r.eenheid).toBe('uur')
    expect(r.aantal).toBe(2)
    expect(r.inkoop_prijs).toBe(40)
    expect(r.verkoop_prijs).toBe(75)
  })

  it('ontbrekend product -> vraag, regel weggelaten, niet klaar', () => {
    const concept = bouwCalculatieConcept(
      { klant: 'KWS', regels: [{ type: 'product', omschrijving: 'dibond 4mm', aantal: 1 }] },
      CATALOGUS,
    )
    expect(concept.regels).toEqual([])
    expect(concept.klaar).toBe(false)
    expect(concept.vragen).toHaveLength(1)
    expect(concept.vragen[0].veld).toBe('regel[0].product')
  })

  it('marge zonder marge_type -> vraag met opties procent/bedrag', () => {
    const concept = bouwCalculatieConcept(
      {
        klant: 'KWS',
        regels: [{ type: 'product', omschrijving: 'beachflag', aantal: 1, inkoop: 96, marge: 85 }],
      },
      CATALOGUS,
    )
    expect(concept.regels).toEqual([])
    expect(concept.klaar).toBe(false)
    expect(concept.vragen).toHaveLength(1)
    expect(concept.vragen[0].veld).toBe('regel[0].marge')
    expect(concept.vragen[0].opties).toEqual(['procent', 'bedrag'])
  })

  it('ambigu product (meerdere matches) -> vraag met opties', () => {
    const catalogus: CalculatieProduct[] = [
      maakProduct({ id: 'd3', naam: 'Dibond 3mm', eenheid: 'm²' }),
      maakProduct({ id: 'd4', naam: 'Dibond 4mm', eenheid: 'm²' }),
    ]
    const concept = bouwCalculatieConcept(
      { klant: 'KWS', regels: [{ type: 'product', omschrijving: 'dibond', aantal: 1 }] },
      catalogus,
    )
    expect(concept.regels).toEqual([])
    expect(concept.klaar).toBe(false)
    expect(concept.vragen).toHaveLength(1)
    expect(concept.vragen[0].opties).toEqual(['Dibond 3mm', 'Dibond 4mm'])
  })

  it('montage-tarief niet gevonden (geen uur-product) -> vraag, geen verzonnen tarief', () => {
    const catalogus: CalculatieProduct[] = [
      maakProduct({ id: 'beachflag', naam: 'Beachflag', eenheid: 'stuks', inkoop_prijs: 96, verkoop_prijs: 177.6 }),
    ]
    const concept = bouwCalculatieConcept(
      { klant: 'KWS', regels: [{ type: 'montage', uren: 3 }] },
      catalogus,
    )
    expect(concept.regels).toEqual([])
    expect(concept.klaar).toBe(false)
    expect(concept.vragen).toHaveLength(1)
    expect(concept.vragen[0].veld).toBe('regel[0].montage')
  })

  it('gemengde input -> zekere regels ingevuld, twijfel als vraag, totalen over zekere regels', () => {
    const concept = bouwCalculatieConcept(
      {
        klant: 'KWS',
        regels: [
          { type: 'product', omschrijving: 'beachflag', aantal: 2 },
          { type: 'product', omschrijving: 'onbekend frame', aantal: 1 },
          { type: 'montage', uren: 2 },
        ],
      },
      CATALOGUS,
    )
    expect(concept.regels).toHaveLength(2)
    expect(concept.vragen).toHaveLength(1)
    expect(concept.klaar).toBe(false)
    expect(concept.totalen).toEqual(berekenCalculatieTotalen(concept.regels))
  })
})
