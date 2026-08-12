import { describe, it, expect } from 'vitest'
import { stelProjectVoor, voorstelbareProjecten } from '../../src/utils/inkoopProjectVoorstel'
import type { Project } from '../../src/types'

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    klant_id: 'k1',
    naam: 'Gevelreclame Jansen',
    beschrijving: '',
    status: 'actief',
    prioriteit: 'medium',
    budget: 0,
    besteed: 0,
    voortgang: 0,
    team_leden: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Project
}

describe('voorstelbareProjecten', () => {
  it('laat afgeronde, gefactureerde en template-projecten vallen', () => {
    const lijst = [
      project({ id: 'a', status: 'actief' }),
      project({ id: 'b', status: 'afgerond' }),
      project({ id: 'c', status: 'gefactureerd' }),
      project({ id: 'd', status: 'actief', is_template: true }),
      project({ id: 'e', status: 'te-factureren' }),
    ]
    expect(voorstelbareProjecten(lijst).map(p => p.id)).toEqual(['a', 'e'])
  })
})

describe('stelProjectVoor · geen voorstel', () => {
  const projecten = [project({ id: 'a', project_nummer: 'P2026-014' })]

  it('doet niets zonder velden op de factuur', () => {
    expect(stelProjectVoor({ referentie_kenmerk: null, vermoedelijk_project: null }, projecten)).toBeNull()
    expect(stelProjectVoor({ referentie_kenmerk: '  ', vermoedelijk_project: '' }, projecten)).toBeNull()
  })

  it('doet niets als de velden ontbreken (migratie 197 nog niet gedraaid)', () => {
    expect(stelProjectVoor({}, projecten)).toBeNull()
  })

  it('doet niets bij tekst die niets raakt', () => {
    expect(stelProjectVoor({ referentie_kenmerk: 'ORDER 99887' }, projecten)).toBeNull()
  })

  it('stelt een afgerond project niet voor, ook niet bij een exacte treffer', () => {
    const afgerond = [project({ id: 'a', project_nummer: 'P2026-014', status: 'afgerond' })]
    expect(stelProjectVoor({ referentie_kenmerk: 'P2026-014' }, afgerond)).toBeNull()
  })
})

describe('stelProjectVoor · op projectnummer', () => {
  const projecten = [
    project({ id: 'a', project_nummer: 'P2026-014', naam: 'Gevelreclame Jansen' }),
    project({ id: 'b', project_nummer: 'P2026-015', naam: 'Vlaggenmasten Bakker' }),
  ]

  it('vindt het nummer los in de referentie', () => {
    const voorstel = stelProjectVoor({ referentie_kenmerk: 'PO: P2026-014' }, projecten)
    expect(voorstel?.project.id).toBe('a')
    expect(voorstel?.reden).toBe('nummer')
    expect(voorstel?.bron).toBe('referentie_kenmerk')
  })

  it('negeert schrijfwijze en scheidingstekens', () => {
    expect(stelProjectVoor({ referentie_kenmerk: 'p 2026 / 014' }, projecten)?.project.id).toBe('a')
  })

  it('vindt het nummer binnen een langer kenmerk', () => {
    expect(stelProjectVoor({ referentie_kenmerk: 'INK-P2026014-A' }, projecten)?.project.id).toBe('a')
  })

  it('kijkt ook in vermoedelijk_project', () => {
    const voorstel = stelProjectVoor({ vermoedelijk_project: 'project P2026-015' }, projecten)
    expect(voorstel?.project.id).toBe('b')
    expect(voorstel?.bron).toBe('vermoedelijk_project')
  })

  it('doet niets als twee projecten hetzelfde nummer raken', () => {
    const dubbel = [
      project({ id: 'a', project_nummer: '2026-014' }),
      project({ id: 'b', project_nummer: '2026-014' }),
    ]
    expect(stelProjectVoor({ referentie_kenmerk: '2026-014' }, dubbel)).toBeNull()
  })

  it('matcht niet op een nummer van twee tekens', () => {
    const kort = [project({ id: 'a', project_nummer: '14' })]
    expect(stelProjectVoor({ referentie_kenmerk: 'Factuur 14 juli, bedrag 1400' }, kort)).toBeNull()
  })

  it('laat een kort nummer niet in een langer woord matchen', () => {
    const kort = [project({ id: 'a', project_nummer: '140' })]
    expect(stelProjectVoor({ referentie_kenmerk: 'ORDER1409' }, kort)).toBeNull()
    expect(stelProjectVoor({ referentie_kenmerk: 'ref 140' }, kort)?.project.id).toBe('a')
  })
})

describe('stelProjectVoor · op projectnaam', () => {
  const projecten = [
    project({ id: 'a', project_nummer: 'P2026-014', naam: 'Gevelreclame Jansen' }),
    project({ id: 'b', project_nummer: 'P2026-015', naam: 'Vlaggenmasten Bakker' }),
  ]

  it('vindt de naam middenin een omschrijving', () => {
    const voorstel = stelProjectVoor({ vermoedelijk_project: 'Levering t.b.v. gevelreclame jansen' }, projecten)
    expect(voorstel?.project.id).toBe('a')
    expect(voorstel?.reden).toBe('naam')
  })

  it('negeert dubbele spaties en kapitalen', () => {
    expect(stelProjectVoor({ vermoedelijk_project: 'VLAGGENMASTEN   BAKKER' }, projecten)?.project.id).toBe('b')
  })

  it('matcht niet op een naam korter dan vijf tekens', () => {
    const kort = [project({ id: 'a', naam: 'Vlag', project_nummer: undefined })]
    expect(stelProjectVoor({ vermoedelijk_project: 'Vlag met mast en toebehoren' }, kort)).toBeNull()
  })

  it('doet niets als twee projectnamen in dezelfde tekst zitten', () => {
    expect(
      stelProjectVoor({ vermoedelijk_project: 'Gevelreclame Jansen en Vlaggenmasten Bakker' }, projecten)
    ).toBeNull()
  })

  it('laat een nummertreffer voorgaan op een naamtreffer bij een ander project', () => {
    const voorstel = stelProjectVoor(
      { referentie_kenmerk: 'P2026-015', vermoedelijk_project: 'Gevelreclame Jansen' },
      projecten
    )
    expect(voorstel?.project.id).toBe('b')
    expect(voorstel?.reden).toBe('nummer')
  })
})
