import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Taak } from '@/types'
import type { ProjectUrenBudget } from '@/services/projectUrenService'

const bestaandeTaken: Taak[] = []
let budget: ProjectUrenBudget

const getProjectUrenBudget = vi.fn(async () => budget)
const getProject = vi.fn(async (id: string) => ({ id, klant_id: 'klant-1', naam: 'Vloot beletteren' }))
const getTakenByProject = vi.fn(async () => [...bestaandeTaken])
const createTaak = vi.fn(async (taak: Omit<Taak, 'id' | 'created_at' | 'updated_at'>) => {
  const nieuw = { ...taak, id: `taak-${bestaandeTaken.length + 1}`, created_at: 'nu', updated_at: 'nu' } as Taak
  bestaandeTaken.push(nieuw)
  return nieuw
})

vi.mock('@/services/projectUrenService', () => ({ getProjectUrenBudget }))
vi.mock('@/services/projectService', () => ({ getProject, getTakenByProject, createTaak }))

const { maakTakenUitBewerkingen } = await import('@/services/projectTakenService')

const VELDEN = ['Montage', 'Voorbereiding', 'Ontwerp & DTP', 'Applicatie']

function vastBudget(): ProjectUrenBudget {
  return {
    soort: 'vast',
    perVeld: {
      'Montage': { uren: 45, tarief: 65 },
      'Voorbereiding': { uren: 0, tarief: 0 },
      'Ontwerp & DTP': { uren: 6.5, tarief: 75 },
      'Applicatie': { uren: 22.456, tarief: 65 },
    },
    totaalUren: 73.96,
    materiaalKosten: 1200,
    offerteIds: ['off-1', 'off-2'],
  }
}

beforeEach(() => {
  bestaandeTaken.length = 0
  budget = vastBudget()
  vi.clearAllMocks()
})

describe('maakTakenUitBewerkingen', () => {
  it('maakt per bewerking met uren één taak met de uren als schatting en de bewerking als urenveld', async () => {
    const { aangemaakt, overgeslagen } = await maakTakenUitBewerkingen('proj-1', VELDEN)

    expect(overgeslagen).toEqual([])
    expect(aangemaakt.map((t) => t.titel)).toEqual(['Montage', 'Ontwerp & DTP', 'Applicatie'])
    expect(createTaak).toHaveBeenCalledTimes(3)

    const applicatie = aangemaakt.find((t) => t.titel === 'Applicatie')!
    expect(applicatie.urenveld).toBe('Applicatie')
    expect(applicatie.geschatte_tijd).toBe(22.46)
    expect(applicatie.project_id).toBe('proj-1')
    expect(applicatie.klant_id).toBe('klant-1')
    expect(applicatie.offerte_id).toBe('off-1')
    expect(applicatie.status).toBe('todo')
    expect(applicatie.prioriteit).toBe('medium')
    expect(applicatie.toegewezen_aan).toBe('')
    expect(applicatie.bestede_tijd).toBe(0)
  })

  it('maakt bij een tweede aanroep niets dubbel en meldt de bewerkingen als overgeslagen', async () => {
    await maakTakenUitBewerkingen('proj-1', VELDEN)
    createTaak.mockClear()

    const { aangemaakt, overgeslagen } = await maakTakenUitBewerkingen('proj-1', VELDEN)

    expect(aangemaakt).toEqual([])
    expect(overgeslagen).toEqual(['Montage', 'Ontwerp & DTP', 'Applicatie'])
    expect(createTaak).not.toHaveBeenCalled()
    expect(bestaandeTaken).toHaveLength(3)
  })

  it('laat handmatige taken staan en vult alleen de bewerkingen aan die nog ontbreken', async () => {
    bestaandeTaken.push({ id: 'hand-1', titel: 'Klant bellen', urenveld: null } as Taak)
    bestaandeTaken.push({ id: 'hand-2', titel: 'Montage bus 3', urenveld: 'Montage' } as Taak)

    const { aangemaakt, overgeslagen } = await maakTakenUitBewerkingen('proj-1', VELDEN)

    expect(overgeslagen).toEqual(['Montage'])
    expect(aangemaakt.map((t) => t.titel)).toEqual(['Ontwerp & DTP', 'Applicatie'])
    expect(bestaandeTaken.map((t) => t.id)).toContain('hand-1')
  })

  it('maakt niets als het project geen meetellende offerte heeft', async () => {
    budget = { soort: 'geen', perVeld: {}, totaalUren: 0, materiaalKosten: 0, offerteIds: [] }

    const { aangemaakt, overgeslagen } = await maakTakenUitBewerkingen('proj-1', VELDEN)

    expect(aangemaakt).toEqual([])
    expect(overgeslagen).toEqual([])
    expect(createTaak).not.toHaveBeenCalled()
    expect(getProject).not.toHaveBeenCalled()
  })
})
