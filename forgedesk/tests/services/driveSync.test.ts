import { describe, it, expect, beforeAll } from 'vitest'
import {
  kiesKlantMap,
  kiesVrijeNaam,
  normaliseerBedrijfsnaam,
  schoneNaam,
  type DriveBestand,
} from '../../src/trigger/utils/drive'
import { projectMapNaam, volgendePogingOver } from '../../src/trigger/drive-sync'

// Zie tests/api/supportMelding.test.ts: env vóór de import, anders gooit
// createClient op module-niveau.
type DriveStatusApi = typeof import('../../api/drive-status')
let api: DriveStatusApi

beforeAll(async () => {
  process.env.VITE_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  api = await import('../../api/drive-status')
})

function map(id: string, name: string, size?: number): DriveBestand {
  return size == null ? { id, name } : { id, name, size: String(size) }
}

/**
 * Deze keuzes bepalen in welke klantmap een bestand belandt. Een fout hier
 * levert geen foutmelding op maar een bestand in het archief van de verkeerde
 * klant, en dat merkt niemand.
 */
describe('kiesKlantMap', () => {
  const mappen = [
    map('1', 'ColliCare Logistics'),
    map('2', 'Van der Berg Bouw B.V.'),
    map('3', 'Jansen Signing'),
  ]

  it('vindt de map bij een exact gelijke naam', () => {
    const uit = kiesKlantMap('Jansen Signing', mappen)
    expect(uit).toEqual({ gevonden: mappen[2] })
  })

  it('vindt de bestaande map ondanks een rechtsvorm die alleen in doen. staat', () => {
    // Dit is het geval uit de praktijk: de klant heet "ColliCare Logistics AS"
    // en de map in Drive heet gewoon "ColliCare Logistics".
    const uit = kiesKlantMap('ColliCare Logistics AS', mappen)
    expect(uit).toEqual({ gevonden: mappen[0] })
  })

  it('trekt zich niets aan van hoofdletters en leestekens', () => {
    const uit = kiesKlantMap('van der berg bouw bv', mappen)
    expect(uit).toEqual({ gevonden: mappen[1] })
  })

  it('kiest niets bij twee mappen die op hetzelfde uitkomen', () => {
    // Geen van beide heet letterlijk zoals de klant, en na normaliseren zijn
    // ze niet uit elkaar te houden. Gokken zou betekenen: bestanden in de
    // verkeerde map.
    const dubbel = [map('a', 'Bakker Reclame'), map('b', 'Bakker Reclame B.V.')]
    const uit = kiesKlantMap('Bakker Reclame BV', dubbel)
    expect(uit).toHaveProperty('onduidelijk')
    if ('onduidelijk' in uit) expect(uit.onduidelijk).toHaveLength(2)
  })

  it('kiest de exacte naam als die er tussen de gelijkenden staat', () => {
    const dubbel = [map('a', 'Bakker Reclame BV'), map('b', 'Bakker Reclame')]
    expect(kiesKlantMap('Bakker Reclame', dubbel)).toEqual({ gevonden: dubbel[1] })
  })

  it('meldt geen map als er niets in de buurt komt', () => {
    expect(kiesKlantMap('Nieuwe Klant', mappen)).toEqual({ geen: true })
  })

  it('doet geen gok bij een bedrijfsnaam die alleen uit een rechtsvorm bestaat', () => {
    // Zonder deze grens komt elk bedrijf zonder eigen naam in dezelfde map.
    expect(kiesKlantMap('B.V.', mappen)).toEqual({ geen: true })
  })
})

describe('normaliseerBedrijfsnaam', () => {
  it('haalt rechtsvormen, leestekens en accenten weg', () => {
    expect(normaliseerBedrijfsnaam('Café Zoë & Zonen B.V.')).toBe('cafe zoe en zonen')
  })

  it('is leeg als er niets betekenisvols overblijft', () => {
    expect(normaliseerBedrijfsnaam('B.V.')).toBe('')
  })
})

describe('kiesVrijeNaam', () => {
  it('gebruikt de eigen naam in een lege map', () => {
    expect(kiesVrijeNaam('logo.pdf', 1200, [])).toEqual({ naam: 'logo.pdf' })
  })

  it('herkent hetzelfde bestand aan naam en grootte', () => {
    const bestaand = [map('x', 'logo.pdf', 1200)]
    expect(kiesVrijeNaam('logo.pdf', 1200, bestaand)).toEqual({ alAanwezig: bestaand[0] })
  })

  it('zet een ander bestand met dezelfde naam ernaast in plaats van eroverheen', () => {
    const bestaand = [map('x', 'logo.pdf', 1200)]
    expect(kiesVrijeNaam('logo.pdf', 9999, bestaand)).toEqual({ naam: 'logo (2).pdf' })
  })

  it('telt door zolang de naam bezet is', () => {
    const bestaand = [map('x', 'logo.pdf', 1), map('y', 'logo (2).pdf', 2)]
    expect(kiesVrijeNaam('logo.pdf', 3, bestaand)).toEqual({ naam: 'logo (3).pdf' })
  })

  it('kan overweg met een naam zonder extensie', () => {
    expect(kiesVrijeNaam('tekening', 5, [map('x', 'tekening', 9)])).toEqual({ naam: 'tekening (2)' })
  })
})

describe('schoneNaam', () => {
  it('vervangt schuine strepen zodat een naam geen mappad wordt', () => {
    expect(schoneNaam('offerte 12/2026.pdf')).toBe('offerte 12-2026.pdf')
  })

  it('valt terug op een naam als er niets overblijft', () => {
    expect(schoneNaam('   ')).toBe('naamloos')
  })
})

describe('projectMapNaam', () => {
  it('gebruikt het projectnummer', () => {
    expect(projectMapNaam({ project_nummer: 'PRJ-2026-245', naam: 'Gevelreclame' })).toBe('PRJ-2026-245')
  })

  it('valt terug op de projectnaam als er geen nummer is', () => {
    expect(projectMapNaam({ project_nummer: null, naam: 'Gevelreclame' })).toBe('Gevelreclame')
  })

  it('houdt een naam over als beide leeg zijn', () => {
    expect(projectMapNaam({ project_nummer: '  ', naam: null })).toBe('Project')
  })
})

describe('volgendePogingOver', () => {
  it('loopt op maar niet eindeloos', () => {
    expect(volgendePogingOver(1)).toBe(2 * 60_000)
    expect(volgendePogingOver(3)).toBe(8 * 60_000)
    expect(volgendePogingOver(9)).toBe(32 * 60_000)
  })
})

describe('leesMapId', () => {
  it('vist het id uit een geplakte maplink', () => {
    expect(api.leesMapId('https://drive.google.com/drive/folders/1AbC-dEfG_hIjK?usp=sharing'))
      .toBe('1AbC-dEfG_hIjK')
  })

  it('vist het id uit een open-link', () => {
    expect(api.leesMapId('https://drive.google.com/open?id=1AbC-dEfG_hIjK')).toBe('1AbC-dEfG_hIjK')
  })

  it('laat een kaal id met rust', () => {
    expect(api.leesMapId('  1AbC-dEfG_hIjK ')).toBe('1AbC-dEfG_hIjK')
  })
})
