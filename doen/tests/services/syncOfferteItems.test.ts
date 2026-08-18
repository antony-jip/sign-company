import { describe, it, expect } from 'vitest'
import { partitionOfferteItemSync } from '../../src/utils/offerteItemSync'

const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'
const UUID_C = '33333333-3333-4333-8333-333333333333'

describe('partitionOfferteItemSync', () => {
  it('behoudt bestaande UUID-items en verwijdert weggehaalde', () => {
    const { keptIds, insertIndices, deleteIds } = partitionOfferteItemSync(
      [UUID_A, UUID_B],
      [UUID_A, UUID_B, UUID_C],
    )
    expect(keptIds).toEqual([UUID_A, UUID_B])
    expect(insertIndices).toEqual([])
    expect(deleteIds).toEqual([UUID_C]) // C is verwijderd door de gebruiker
  })

  it('behandelt new-* ids als insert, niet als update', () => {
    const { keptIds, insertIndices, deleteIds } = partitionOfferteItemSync(
      [UUID_A, 'new-1720000000000-abc123'],
      [UUID_A],
    )
    expect(keptIds).toEqual([UUID_A])
    expect(insertIndices).toEqual([1])
    expect(deleteIds).toEqual([])
  })

  it('insert een UUID dat niet bij deze offerte hoort (bv. geplakt uit andere offerte)', () => {
    // UUID_B bestaat niet in deze offerte → nooit upserten op dat id (zou een
    // rij van een andere offerte kunnen overschrijven), dus insert als nieuw.
    const { keptIds, insertIndices, deleteIds } = partitionOfferteItemSync(
      [UUID_B],
      [UUID_A],
    )
    expect(keptIds).toEqual([])
    expect(insertIndices).toEqual([0])
    expect(deleteIds).toEqual([UUID_A])
  })

  it('lege items-lijst verwijdert alle bestaande rijen', () => {
    const { keptIds, insertIndices, deleteIds } = partitionOfferteItemSync(
      [],
      [UUID_A, UUID_B],
    )
    expect(keptIds).toEqual([])
    expect(insertIndices).toEqual([])
    expect(deleteIds.sort()).toEqual([UUID_A, UUID_B].sort())
  })

  it('lege bestaande set → alles insert, niets verwijderd', () => {
    const { keptIds, insertIndices, deleteIds } = partitionOfferteItemSync(
      [UUID_A, 'new-x'],
      [],
    )
    expect(keptIds).toEqual([])
    expect(insertIndices).toEqual([0, 1])
    expect(deleteIds).toEqual([])
  })

  it('behandelt undefined id als insert', () => {
    const { insertIndices } = partitionOfferteItemSync([undefined], [])
    expect(insertIndices).toEqual([0])
  })

  it('een niet-canoniek uuid-achtig id wordt niet behouden', () => {
    // Ontbrekende versie/variant-nibbles → geen match, dus insert.
    const { insertIndices, deleteIds } = partitionOfferteItemSync(
      ['not-a-uuid'],
      [UUID_A],
    )
    expect(insertIndices).toEqual([0])
    expect(deleteIds).toEqual([UUID_A])
  })
})
