import { describe, it, expect } from 'vitest'
import { gestructureerdeMededeling, gestructureerdeMededelingKaal } from '@/lib/betalingskenmerk'

describe('gestructureerdeMededeling', () => {
  it('maakt uit een factuurnummer een OGM met controlegetal mod 97', () => {
    // cijfers 20260042 → basis 0020260042, 20260042 mod 97 = 40
    expect(gestructureerdeMededeling('F-2026-0042')).toBe('+++002/0260/04240+++')
  })

  it('volgt het bekende voorbeeld: basis 1234567890 geeft controle 02', () => {
    expect(gestructureerdeMededeling('1234567890')).toBe('+++123/4567/89002+++')
  })

  it('zet controle 0 om in 97', () => {
    // 0000000097 mod 97 = 0 → 97
    expect(gestructureerdeMededeling('97')).toBe('+++000/0000/09797+++')
  })

  it('neemt de laatste tien cijfers en vult links aan', () => {
    expect(gestructureerdeMededeling('2026-0007')).toBe(gestructureerdeMededeling('00020260007'))
    expect(gestructureerdeMededelingKaal('2026-0007')).toHaveLength(12)
  })

  it('geeft null zonder cijfers', () => {
    expect(gestructureerdeMededeling('CONCEPT')).toBeNull()
    expect(gestructureerdeMededelingKaal('')).toBeNull()
  })
})
