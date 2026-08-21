import { describe, it, expect } from 'vitest'
import { renderDocument, renderBlokWrapper, maakBlok, STANDAARD_STIJL, normaliseerDocument, type AfbeeldingBlok, type KnopBlok, type KolommenBlok, type TekstBlok } from '@/components/nieuwsbrief/nieuwsbriefBlokken'
import { buildPreviewHtml } from '@/components/nieuwsbrief/nieuwsbriefShell'
import { NIEUWSBRIEF_TEMPLATES } from '@/components/nieuwsbrief/nieuwsbriefTemplates'

describe('blokken-renderer', () => {
  it('rendert een afbeelding op breedte-percentage met radius en uitlijning', () => {
    const b = { ...(maakBlok('afbeelding') as AfbeeldingBlok), url: 'https://x.nl/a.webp', alt: 'Gevel', breedtePct: 50, radius: 0, uitlijning: 'links' as const }
    const html = renderBlokWrapper(b, STANDAARD_STIJL, true)
    expect(html).toContain('width="268"')
    expect(html).toContain('border-radius:0px')
    expect(html).toContain('align="left"')
    expect(html).toContain('alt="Gevel"')
  })

  it('zet knopkleur, radius en formaat om en houdt mso-padding-alt', () => {
    const b = { ...(maakBlok('knop') as KnopBlok), kleur: '#123456', radius: 2, grootte: 'groot' as const }
    const html = renderBlokWrapper(b, STANDAARD_STIJL, true)
    expect(html).toContain('background:#123456')
    expect(html).toContain('border-radius:2px')
    expect(html).toContain('padding:17px 36px')
    expect(html).toContain('mso-padding-alt')
  })

  it('verdeelt kolommen volgens de verhouding', () => {
    const b = { ...(maakBlok('kolommen') as KolommenBlok), verhouding: '1:2' as const }
    const html = renderBlokWrapper(b, STANDAARD_STIJL, true)
    expect(html).toContain('width="31%"')
    expect(html).toContain('width="65%"')
  })

  it('past blok-opmaak toe: achtergrond, ruimte en mobiel verbergen', () => {
    const b = { ...(maakBlok('tekst') as TekstBlok), opmaak: { achtergrond: '#EEEEEE', ruimteBoven: 8, verbergMobiel: true } }
    const html = renderBlokWrapper(b, STANDAARD_STIJL, false)
    expect(html).toContain('background:#EEEEEE')
    expect(html).toContain('padding:24px 16px 16px')
    expect(html).toContain('class="mobiel-verbergen"')
  })

  it('escapet gebruikerstekst in koppen en knoppen', () => {
    const kop = { ...maakBlok('kop'), tekst: '<script>x</script>' }
    expect(renderBlokWrapper(kop as never, STANDAARD_STIJL, true)).not.toContain('<script>')
  })

  it('shell bevat dark-mode meta, mso-conditional en webfont buiten mso', () => {
    const html = buildPreviewHtml('<p>hoi</p>', { ...STANDAARD_STIJL, font: "'Inter',Arial,sans-serif" }, { preheader: 'Pre' })
    expect(html).toContain('name="color-scheme" content="light dark"')
    expect(html).toContain('<!--[if mso]><table')
    expect(html).toContain('<!--[if !mso]><!--><style>@import')
    expect(html).toContain('&zwnj;&nbsp;')
    expect(html).toContain('lang="nl"')
  })

  it('elke template rendert zonder lege placeholders behalve afbeeldingen', () => {
    for (const t of NIEUWSBRIEF_TEMPLATES) {
      const doc = t.maak()
      const html = renderDocument(doc)
      expect(html.length).toBeGreaterThan(500)
      expect(html).not.toContain('undefined')
      expect(normaliseerDocument(JSON.parse(JSON.stringify(doc))).blokken.length).toBe(doc.blokken.length)
    }
  })
})
