import { describe, it, expect } from 'vitest'
import { beoordeelHerstel, isChunkLoadError } from '../../src/utils/chunkErrorHandler'

describe('isChunkLoadError', () => {
  it('herkent de MIME-fout van een SPA-rewrite op een verdwenen chunk', () => {
    expect(isChunkLoadError(new Error("'text/html' is not a valid JavaScript MIME type."))).toBe(true)
  })

  it('herkent een mislukte dynamic import', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/x.js'))).toBe(true)
  })

  it('laat gewone fouten met rust', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
  })
})

describe('beoordeelHerstel', () => {
  it('herlaadt bij de eerste chunk-fout', () => {
    const besluit = beoordeelHerstel(null, 1_000)
    expect(besluit.herlaad).toBe(true)
    expect(JSON.parse(besluit.nieuweStaat).pogingen).toBe(1)
  })

  it('herlaadt ook direct na een eerdere poging — geen foutscherm door timing', () => {
    const eerste = beoordeelHerstel(null, 1_000)
    const tweede = beoordeelHerstel(eerste.nieuweStaat, 1_500)
    expect(tweede.herlaad).toBe(true)
  })

  it('stopt na twee pogingen binnen het venster (geen reload-loop)', () => {
    const eerste = beoordeelHerstel(null, 1_000)
    const tweede = beoordeelHerstel(eerste.nieuweStaat, 2_000)
    const derde = beoordeelHerstel(tweede.nieuweStaat, 3_000)
    expect(derde.herlaad).toBe(false)
  })

  it('begint opnieuw na een minuut zonder fouten', () => {
    const eerste = beoordeelHerstel(null, 1_000)
    const tweede = beoordeelHerstel(eerste.nieuweStaat, 2_000)
    const later = beoordeelHerstel(tweede.nieuweStaat, 2_000 + 61_000)
    expect(later.herlaad).toBe(true)
    expect(JSON.parse(later.nieuweStaat).pogingen).toBe(1)
  })

  it('negeert onleesbare opslag', () => {
    expect(beoordeelHerstel('geen json', 1_000).herlaad).toBe(true)
  })
})
