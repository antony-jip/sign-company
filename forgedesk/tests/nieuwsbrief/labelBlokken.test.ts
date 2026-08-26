import { describe, it, expect } from 'vitest'
import { renderBlokWrapper, maakBlok, STANDAARD_STIJL, LABEL_EIND, LABEL_START } from '@/components/nieuwsbrief/nieuwsbriefBlokken'

// De markers hier en de knip-functie in api/nieuwsbrief-verzend.ts moeten
// exact op elkaar passen. Verandert er een, dan gaat een blok dat voor één
// label bedoeld was naar iedereen, of naar niemand.
describe('renderBlokWrapper met alleenLabel', () => {
  const stijl = STANDAARD_STIJL

  it('zet geen markers als er geen label staat', () => {
    const blok = maakBlok('kop')
    const html = renderBlokWrapper(blok, stijl, true)
    expect(html).not.toContain('doen:label')
  })

  it('omhult het blok met de markers van het label', () => {
    const blok = { ...maakBlok('kop'), opmaak: { alleenLabel: 'Retail' } }
    const html = renderBlokWrapper(blok, stijl, true)
    expect(html.startsWith(LABEL_START('Retail'))).toBe(true)
    expect(html.endsWith(LABEL_EIND)).toBe(true)
  })

  it('negeert een label dat alleen uit spaties bestaat', () => {
    const blok = { ...maakBlok('kop'), opmaak: { alleenLabel: '   ' } }
    expect(renderBlokWrapper(blok, stijl, true)).not.toContain('doen:label')
  })
})
