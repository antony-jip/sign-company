import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppSettings, Medewerker, MontageAfspraak, Werkbon } from '@/types'

const aangemaakteRegistraties: Record<string, unknown>[] = []
const werkbonUpdates: { id: string; updates: Record<string, unknown> }[] = []
let afspraak: MontageAfspraak | null = null

vi.mock('@/services/tijdregistratieService', () => ({
  createTijdregistratie: async (entry: Record<string, unknown>) => {
    aangemaakteRegistraties.push(entry)
    return { ...entry, id: `reg-${aangemaakteRegistraties.length}` }
  },
}))

vi.mock('@/services/werkbonService', () => ({
  updateWerkbon: async (id: string, updates: Record<string, unknown>) => {
    werkbonUpdates.push({ id, updates })
    return { id, ...updates }
  },
}))

vi.mock('@/services/planningService', () => ({
  getMontageAfspraak: async () => afspraak,
}))

vi.mock('@/services/projectUrenService', () => ({
  getProjectUrenBudget: async () => ({
    soort: 'vast',
    perVeld: { Montage: { uren: 10, tarief: 80 } },
    totaalUren: 10,
    materiaalKosten: 0,
    offerteIds: ['off-1'],
  }),
}))

const { boekWerkbonUren, montageVeld, verdeelMinuten, geboektMelding } = await import('@/services/werkbonUrenService')

const URENVELDEN = ['Montage', 'Voorbereiding', 'Ontwerp & DTP', 'Applicatie']

function medewerker(id: string, naam: string, extra: Partial<Medewerker> = {}): Medewerker {
  return { id, naam, email: `${id}@doen.test`, uurtarief: 65, status: 'actief', ...extra } as Medewerker
}

const jan = medewerker('mw-1', 'Jan de Vries', { kostprijs_uur: 40 })
const piet = medewerker('mw-2', 'Piet Jansen')
const kees = medewerker('mw-3', 'Kees Bakker', { kostprijs_uur: 35 })

function werkbon(extra: Partial<Werkbon> = {}): Werkbon {
  return {
    id: 'wb-1',
    werkbon_nummer: 'WB-2026-0042',
    klant_id: 'klant-1',
    project_id: 'proj-1',
    datum: '2026-09-04',
    status: 'afgerond',
    uren_gewerkt: 3,
    toon_briefpapier: true,
    created_at: '2026-09-04T08:00:00Z',
    ...extra,
  }
}

function settings(extra: Partial<AppSettings> = {}): AppSettings {
  return { standaard_uurtarief: 75, standaard_kostprijs_uur: 30, werkbon_uren_verdelen: false, ...extra } as AppSettings
}

beforeEach(() => {
  aangemaakteRegistraties.length = 0
  werkbonUpdates.length = 0
  afspraak = null
})

describe('montageVeld', () => {
  it('kiest Montage exact, anders het eerste veld met montage erin, anders niets', () => {
    expect(montageVeld(URENVELDEN)).toBe('Montage')
    expect(montageVeld(['DTP', 'Montage buiten', 'Montage binnen'])).toBe('Montage buiten')
    expect(montageVeld(['DTP', 'Print'])).toBeNull()
  })
})

describe('verdeelMinuten', () => {
  it('verdeelt op hele minuten en legt de rest bij de eerste', () => {
    expect(verdeelMinuten(180, 2)).toEqual([90, 90])
    expect(verdeelMinuten(100, 3)).toEqual([34, 33, 33])
    expect(verdeelMinuten(180, 1)).toEqual([180])
  })
})

describe('boekWerkbonUren', () => {
  it('boekt één regel op de afronder met bewerking Montage en een kostprijs-momentopname', async () => {
    const regels = await boekWerkbonUren({
      werkbon: werkbon(), afronder: jan, medewerkers: [jan, piet], settings: settings(), urenVelden: URENVELDEN,
    })

    expect(regels).toHaveLength(1)
    expect(aangemaakteRegistraties).toHaveLength(1)
    expect(aangemaakteRegistraties[0]).toMatchObject({
      project_id: 'proj-1',
      urenveld: 'Montage',
      medewerker_id: 'mw-1',
      medewerker_naam: 'Jan de Vries',
      omschrijving: 'Werkbon WB-2026-0042',
      datum: '2026-09-04',
      start_tijd: '',
      eind_tijd: '',
      duur_minuten: 180,
      uurtarief: 80,
      kostprijs_uur: 40,
      facturabel: true,
      gefactureerd: false,
    })
    expect(werkbonUpdates).toHaveLength(1)
    expect(werkbonUpdates[0].id).toBe('wb-1')
    expect(typeof werkbonUpdates[0].updates.uren_geboekt_op).toBe('string')
    expect(geboektMelding(regels)).toBe('3 uur geboekt op het project')
  })

  it('verdeelt over de gematchte monteurs van de afspraak als de organisatie dat wil', async () => {
    afspraak = { id: 'ma-1', monteurs: [' jan de vries ', 'KEES BAKKER', 'Onbekende Naam'] } as MontageAfspraak

    const regels = await boekWerkbonUren({
      werkbon: werkbon({ montage_afspraak_id: 'ma-1', uren_gewerkt: 2.5 }),
      afronder: piet,
      medewerkers: [jan, piet, kees],
      settings: settings({ werkbon_uren_verdelen: true }),
      urenVelden: URENVELDEN,
    })

    expect(regels).toHaveLength(2)
    expect(aangemaakteRegistraties.map((r) => [r.medewerker_id, r.duur_minuten, r.kostprijs_uur])).toEqual([
      ['mw-1', 75, 40],
      ['mw-3', 75, 35],
    ])
    expect(werkbonUpdates).toHaveLength(1)
  })

  it('valt terug op de afronder als de instelling uit staat, ook met monteurs op de afspraak', async () => {
    afspraak = { id: 'ma-1', monteurs: ['Jan de Vries', 'Kees Bakker'] } as MontageAfspraak

    await boekWerkbonUren({
      werkbon: werkbon({ montage_afspraak_id: 'ma-1' }),
      afronder: piet,
      medewerkers: [jan, piet, kees],
      settings: settings(),
      urenVelden: URENVELDEN,
    })

    expect(aangemaakteRegistraties).toHaveLength(1)
    expect(aangemaakteRegistraties[0]).toMatchObject({ medewerker_id: 'mw-2', duur_minuten: 180, kostprijs_uur: 30 })
  })

  it('doet niets als de uren al geboekt zijn', async () => {
    const regels = await boekWerkbonUren({
      werkbon: werkbon({ uren_geboekt_op: '2026-09-04T10:00:00Z' }),
      afronder: jan, medewerkers: [jan], settings: settings(), urenVelden: URENVELDEN,
    })

    expect(regels).toEqual([])
    expect(aangemaakteRegistraties).toHaveLength(0)
    expect(werkbonUpdates).toHaveLength(0)
  })

  it('doet niets zonder project of zonder uren', async () => {
    await boekWerkbonUren({
      werkbon: werkbon({ project_id: undefined }),
      afronder: jan, medewerkers: [jan], settings: settings(), urenVelden: URENVELDEN,
    })
    await boekWerkbonUren({
      werkbon: werkbon({ uren_gewerkt: 0 }),
      afronder: jan, medewerkers: [jan], settings: settings(), urenVelden: URENVELDEN,
    })

    expect(aangemaakteRegistraties).toHaveLength(0)
    expect(werkbonUpdates).toHaveLength(0)
  })
})
