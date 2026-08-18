import { describe, it, expect } from 'vitest'
import {
  bestandsExtensie,
  stelMapVoor,
  isLopendProject,
  kiesVoorgesteldProject,
  MAP_BIJLAGEN,
} from '../../src/utils/bijlageVoorstel'
import type { Project } from '../../src/types'

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    klant_id: 'k1',
    naam: 'Gevelreclame',
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

describe('bestandsExtensie', () => {
  it('leest de extensie in kleine letters', () => {
    expect(bestandsExtensie('Logo.AI')).toBe('ai')
  })

  it('geeft leeg terug zonder extensie', () => {
    expect(bestandsExtensie('scan')).toBe('')
    expect(bestandsExtensie('.gitignore')).toBe('')
    expect(bestandsExtensie('bestand.')).toBe('')
  })

  it('gebruikt alleen het laatste deel', () => {
    expect(bestandsExtensie('gevel.v2.eps')).toBe('eps')
  })
})

describe('stelMapVoor', () => {
  it('ziet aanleveringen en ontwerpen als Ontwerpen', () => {
    for (const naam of ['logo.ai', 'drukbestand.eps', 'proef.pdf', 'icoon.svg', 'oud.cdr']) {
      expect(stelMapVoor(naam)).toBe('Ontwerpen')
    }
  })

  it('ziet bitmapbeeld als situatiefoto', () => {
    for (const naam of ['gevel.jpg', 'pand.JPEG', 'situatie.png', 'foto.heic', 'shot.webp']) {
      expect(stelMapVoor(naam)).toBe("Foto's")
    }
  })

  it('houdt onbekende types in de bestaande map', () => {
    expect(stelMapVoor('offerte.docx')).toBe(MAP_BIJLAGEN)
    expect(stelMapVoor('aanlevering.zip')).toBe(MAP_BIJLAGEN)
  })

  it('valt terug op content-type als de naam geen extensie heeft', () => {
    expect(stelMapVoor('bijlage', 'application/pdf')).toBe('Ontwerpen')
    expect(stelMapVoor('bijlage', 'image/svg+xml')).toBe('Ontwerpen')
    expect(stelMapVoor('bijlage', 'image/jpeg')).toBe("Foto's")
    expect(stelMapVoor('bijlage', 'image/png; charset=binary')).toBe("Foto's")
    expect(stelMapVoor('bijlage', 'application/octet-stream')).toBe(MAP_BIJLAGEN)
    expect(stelMapVoor('bijlage')).toBe(MAP_BIJLAGEN)
  })

  it('laat de extensie voorgaan op een afwijkend content-type', () => {
    expect(stelMapVoor('logo.ai', 'application/octet-stream')).toBe('Ontwerpen')
  })
})

describe('isLopendProject', () => {
  it('rekent afgerond en gefactureerd als afgesloten', () => {
    expect(isLopendProject(project({ status: 'afgerond' }))).toBe(false)
    expect(isLopendProject(project({ status: 'gefactureerd' }))).toBe(false)
  })

  it('rekent de rest als lopend', () => {
    for (const status of ['gepland', 'actief', 'in-review', 'on-hold', 'te-factureren', 'te-plannen', 'akkoord-klant', 'ingepland'] as const) {
      expect(isLopendProject(project({ status }))).toBe(true)
    }
  })
})

describe('kiesVoorgesteldProject', () => {
  it('stelt het enige lopende project voor', () => {
    const p = project({ id: 'a' })
    expect(kiesVoorgesteldProject([p])?.id).toBe('a')
  })

  it('negeert afgesloten projecten bij het tellen', () => {
    const lopend = project({ id: 'a' })
    const klaar = project({ id: 'b', status: 'gefactureerd' })
    expect(kiesVoorgesteldProject([lopend, klaar])?.id).toBe('a')
  })

  it('gokt niet bij meerdere lopende projecten', () => {
    expect(kiesVoorgesteldProject([project({ id: 'a' }), project({ id: 'b' })])).toBeNull()
  })

  it('geeft niets terug zonder lopend project', () => {
    expect(kiesVoorgesteldProject([])).toBeNull()
    expect(kiesVoorgesteldProject([project({ status: 'afgerond' })])).toBeNull()
  })
})
