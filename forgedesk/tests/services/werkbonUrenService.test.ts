import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppSettings, Medewerker, MontageAfspraak, Werkbon } from '@/types'

const aangemaakteRegistraties: Record<string, unknown>[] = []
const werkbonUpdates: { id: string; updates: Record<string, unknown> }[] = []
const claims: string[] = []
let afspraak: MontageAfspraak | null = null
let claimAntwoord = true
let insertFaalt = false

vi.mock('@/services/tijdregistratieService', () => ({
  createTijdregistraties: async (entries: Record<string, unknown>[]) => {
    if (insertFaalt) throw new Error('insert mislukt')
    entries.forEach((entry) => aangemaakteRegistraties.push(entry))
    return entries.map((entry, i) => ({ ...entry, id: `reg-${i + 1}` }))
  },
}))

vi.mock('@/services/werkbonService', () => ({
  claimWerkbonUren: async (id: string) => {
    claims.push(id)
    return claimAntwoord
  },
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

const { boekWerkbonUren, montageVeld, verdeelMinuten, geboektMelding, matchMonteurs } = await import('@/services/werkbonUrenService')

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
  return { standaard_uurtarief: 70, standaard_kostprijs_uur: 45, werkbon_uren_verdelen: false, ...extra } as AppSettings
}

beforeEach(() => {
  aangemaakteRegistraties.length = 0
  werkbonUpdates.length = 0
  claims.length = 0
  afspraak = null
  claimAntwoord = true
  insertFaalt = false
})

describe('montageVeld', () => {
  it('kiest Montage exact, anders het eerste veld met montage erin, anders niets', () => {
    expect(montageVeld(URENVELDEN)).toBe('Montage')
    expect(montageVeld(['DTP', 'Montage intern', 'Demontage'])).toBe('Montage intern')
    expect(montageVeld(['DTP', 'Printen'])).toBeNull()
  })
})

describe('verdeelMinuten', () => {
  it('verdeelt op hele minuten en legt de rest bij de eerste', () => {
    expect(verdeelMinuten(180, 2)).toEqual([90, 90])
    expect(verdeelMinuten(100, 3)).toEqual([34, 33, 33])
    expect(verdeelMinuten(5, 1)).toEqual([5])
  })
})

describe('matchMonteurs', () => {
  it('matcht op medewerker-id, en op naam voor oude afspraken', () => {
    const uit = matchMonteurs(['mw-1', ' KEES BAKKER ', 'onbekend', 'mw-1'], [jan, piet, kees])
    expect(uit).toEqual([jan, kees])
  })
})

describe('boekWerkbonUren', () => {
  it('claimt eerst en boekt dan één regel op de afronder met bewerking Montage en kostprijs-momentopname', async () => {
    const regels = await boekWerkbonUren({ werkbon: werkbon(), afronder: jan, medewerkers: [jan, piet], settings: settings(), urenVelden: URENVELDEN })
    expect(claims).toEqual(['wb-1'])
    expect(regels).toHaveLength(1)
    expect(aangemaakteRegistraties[0]).toMatchObject({
      project_id: 'proj-1',
      urenveld: 'Montage',
      medewerker_id: 'mw-1',
      medewerker_naam: 'Jan de Vries',
      omschrijving: 'Werkbon WB-2026-0042',
      datum: '2026-09-04',
      duur_minuten: 180,
      uurtarief: 80,
      kostprijs_uur: 40,
      facturabel: true,
      gefactureerd: false,
    })
    expect(werkbonUpdates).toHaveLength(0)
    expect(geboektMelding(regels)).toBe('3 uur geboekt op het project')
  })

  it('verdeelt over de monteurs van de afspraak (op id) als de organisatie dat wil', async () => {
    afspraak = { id: 'ma-1', monteurs: ['mw-1', 'mw-3', 'mw-onbekend'] } as MontageAfspraak
    const regels = await boekWerkbonUren({
      werkbon: werkbon({ montage_afspraak_id: 'ma-1' }),
      afronder: piet,
      medewerkers: [jan, piet, kees],
      settings: settings({ werkbon_uren_verdelen: true }),
      urenVelden: URENVELDEN,
    })
    expect(regels).toHaveLength(2)
    expect(aangemaakteRegistraties.map((r) => [r.medewerker_id, r.duur_minuten, r.kostprijs_uur])).toEqual([
      ['mw-1', 90, 40],
      ['mw-3', 90, 35],
    ])
  })

  it('valt terug op de afronder als de instelling uit staat, en als geen monteur matcht', async () => {
    afspraak = { id: 'ma-1', monteurs: ['mw-1', 'mw-3'] } as MontageAfspraak
    await boekWerkbonUren({
      werkbon: werkbon({ montage_afspraak_id: 'ma-1' }),
      afronder: piet,
      medewerkers: [jan, piet, kees],
      settings: settings({ werkbon_uren_verdelen: false }),
      urenVelden: URENVELDEN,
    })
    expect(aangemaakteRegistraties.map((r) => r.medewerker_id)).toEqual(['mw-2'])

    aangemaakteRegistraties.length = 0
    afspraak = { id: 'ma-1', monteurs: ['mw-niemand'] } as MontageAfspraak
    await boekWerkbonUren({
      werkbon: werkbon({ montage_afspraak_id: 'ma-1' }),
      afronder: piet,
      medewerkers: [jan, piet, kees],
      settings: settings({ werkbon_uren_verdelen: true }),
      urenVelden: URENVELDEN,
    })
    expect(aangemaakteRegistraties.map((r) => r.medewerker_id)).toEqual(['mw-2'])
  })

  it('gebruikt de afrondernaam als de afronder geen medewerker-record heeft', async () => {
    await boekWerkbonUren({ werkbon: werkbon(), afronder: null, afronderNaam: 'antony@signcompany.nl', medewerkers: [], settings: settings(), urenVelden: URENVELDEN })
    expect(aangemaakteRegistraties[0]).toMatchObject({ medewerker_naam: 'antony@signcompany.nl', kostprijs_uur: 45, uurtarief: 80 })
    expect(aangemaakteRegistraties[0].medewerker_id).toBeUndefined()
  })

  it('doet niets als de uren al geboekt zijn of als een ander de claim al heeft', async () => {
    const al = await boekWerkbonUren({ werkbon: werkbon({ uren_geboekt_op: '2026-09-04T09:00:00Z' }), afronder: jan, medewerkers: [jan], settings: settings(), urenVelden: URENVELDEN })
    expect(al).toEqual([])
    expect(claims).toHaveLength(0)

    claimAntwoord = false
    const verloren = await boekWerkbonUren({ werkbon: werkbon(), afronder: jan, medewerkers: [jan], settings: settings(), urenVelden: URENVELDEN })
    expect(verloren).toEqual([])
    expect(claims).toEqual(['wb-1'])
    expect(aangemaakteRegistraties).toHaveLength(0)
  })

  it('draait de claim terug en gooit als de insert faalt', async () => {
    insertFaalt = true
    await expect(boekWerkbonUren({ werkbon: werkbon(), afronder: jan, medewerkers: [jan], settings: settings(), urenVelden: URENVELDEN })).rejects.toThrow('insert mislukt')
    expect(claims).toEqual(['wb-1'])
    expect(werkbonUpdates).toEqual([{ id: 'wb-1', updates: { uren_geboekt_op: null } }])
  })

  it('doet niets zonder project of zonder uren', async () => {
    expect(await boekWerkbonUren({ werkbon: werkbon({ project_id: undefined }), afronder: jan, medewerkers: [jan], settings: settings(), urenVelden: URENVELDEN })).toEqual([])
    expect(await boekWerkbonUren({ werkbon: werkbon({ uren_gewerkt: 0 }), afronder: jan, medewerkers: [jan], settings: settings(), urenVelden: URENVELDEN })).toEqual([])
    expect(claims).toHaveLength(0)
    expect(aangemaakteRegistraties).toHaveLength(0)
  })
})
