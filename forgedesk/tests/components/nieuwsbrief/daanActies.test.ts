import { describe, expect, it } from 'vitest'
import { pasDaanActieToe, type DaanStand } from '@/components/nieuwsbrief/daanActies'
import { leegDocument, maakBlok, type KopBlok, type KnopBlok } from '@/components/nieuwsbrief/nieuwsbriefBlokken'

function stand(): DaanStand {
  const doc = leegDocument()
  const kop = { ...maakBlok('kop'), id: 'k1', tekst: 'Lange kop' } as KopBlok
  const tekst = { ...maakBlok('tekst'), id: 't1' }
  const footer = { ...maakBlok('footer'), id: 'f1' }
  doc.blokken = [kop, tekst, footer]
  return { doc, onderwerp: 'Oud', preheader: '' }
}

describe('pasDaanActieToe', () => {
  it('vervangt een blok en houdt het id', () => {
    const r = pasDaanActieToe(stand(), { actie: 'vervang', id: 'k1', blok: { type: 'kop', tekst: 'Kort', niveau: 2 } })
    expect(r?.omschrijving).toBe('Kop aangepast')
    const kop = r!.stand.doc.blokken[0] as KopBlok
    expect(kop.id).toBe('k1')
    expect(kop.tekst).toBe('Kort')
    expect(kop.niveau).toBe(2)
  })

  it('repareert ongeldige velden bij vervangen', () => {
    const r = pasDaanActieToe(stand(), { actie: 'vervang', id: 'k1', blok: { type: 'kop', tekst: 'X', niveau: 9, uitlijning: 'schuin' } })
    const kop = r!.stand.doc.blokken[0] as KopBlok
    expect(kop.niveau).toBe(1)
    expect(kop.uitlijning).toBe('links')
  })

  it('voegt toe na een blok, of bovenaan bij na=null', () => {
    const a = pasDaanActieToe(stand(), { actie: 'voeg_toe', na: 't1', blok: { type: 'knop', tekst: 'Bekijk', url: 'https://signcompany.nl/projecten' } })
    expect(a!.stand.doc.blokken.map(b => b.type)).toEqual(['kop', 'tekst', 'knop', 'footer'])
    expect((a!.stand.doc.blokken[2] as KnopBlok).url).toBe('https://signcompany.nl/projecten')
    const b = pasDaanActieToe(stand(), { actie: 'voeg_toe', na: null, blok: { type: 'lijn' } })
    expect(b!.stand.doc.blokken[0].type).toBe('lijn')
  })

  it('verwijdert en verplaatst op id; onbekend id doet niets', () => {
    const weg = pasDaanActieToe(stand(), { actie: 'verwijder', id: 't1' })
    expect(weg!.stand.doc.blokken.map(b => b.id)).toEqual(['k1', 'f1'])
    const verplaatst = pasDaanActieToe(stand(), { actie: 'verplaats', id: 'k1', na: 't1' })
    expect(verplaatst!.stand.doc.blokken.map(b => b.id)).toEqual(['t1', 'k1', 'f1'])
    expect(pasDaanActieToe(stand(), { actie: 'verwijder', id: 'bestaat-niet' })).toBeNull()
  })

  it('zet onderwerp en preheader, niets bij gelijk', () => {
    const r = pasDaanActieToe(stand(), { actie: 'onderwerp', onderwerp: 'Nieuw', preheader: 'Regel' })
    expect(r!.stand.onderwerp).toBe('Nieuw')
    expect(r!.stand.preheader).toBe('Regel')
    expect(pasDaanActieToe(stand(), { actie: 'onderwerp', onderwerp: 'Oud' })).toBeNull()
  })

  it('bouwt alles opnieuw en negeert rommel', () => {
    const r = pasDaanActieToe(stand(), { actie: 'alles', blokken: [{ type: 'header' }, null, { type: 'onzin' }, { type: 'tekst', html: '<p>Hoi</p>' }] })
    expect(r!.stand.doc.blokken.map(b => b.type)).toEqual(['header', 'tekst'])
    expect(pasDaanActieToe(stand(), { actie: 'alles', blokken: [] })).toBeNull()
  })

  it('laat het oorspronkelijke document ongemoeid', () => {
    const s = stand()
    pasDaanActieToe(s, { actie: 'verwijder', id: 'k1' })
    expect(s.doc.blokken).toHaveLength(3)
  })
})
