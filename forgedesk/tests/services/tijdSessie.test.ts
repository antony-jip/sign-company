import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase draait niet in de test: isSupabaseConfigured false duwt de service
// naar het localStorage-pad, en dat vervangen we door een in-memory store.
const store = new Map<string, unknown[]>()
const aangemaakteRegistraties: Record<string, unknown>[] = []

vi.mock('@/services/supabaseHelpers', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
  assertId: (id: unknown, label = 'id') => {
    if (!id || typeof id !== 'string') throw new Error(`Ongeldig ${label}`)
  },
  getLocalData: (key: string) => [...(store.get(key) || [])],
  setLocalData: (key: string, data: unknown[]) => { store.set(key, data) },
  generateId: () => `id-${store.size}-${Math.round(performance.now() * 1000)}`,
  now: () => new Date().toISOString(),
  getOrgId: async () => 'org-1',
}))

vi.mock('@/services/tijdregistratieService', () => ({
  createTijdregistratie: async (entry: Record<string, unknown>) => {
    aangemaakteRegistraties.push(entry)
    return { ...entry, id: `reg-${aangemaakteRegistraties.length}` }
  },
}))

const {
  sessieSeconden, isVerlopen, startTijdSessie, stopTijdSessie, getEigenTijdSessie,
  MAX_SESSIE_UREN,
} = await import('@/services/tijdSessieService')

import type { TijdSessie } from '@/types'

function sessie(minutenGeleden: number, extra: Partial<TijdSessie> = {}): TijdSessie {
  const gestart = new Date(Date.now() - minutenGeleden * 60_000).toISOString()
  return {
    id: 'sessie-1',
    user_id: 'user-1',
    medewerker_id: 'mw-1',
    medewerker_naam: 'Antony Bootsma',
    project_id: 'proj-1',
    project_naam: 'Textielframes 3x',
    gestart_op: gestart,
    created_at: gestart,
    updated_at: gestart,
    ...extra,
  }
}

beforeEach(() => {
  store.clear()
  aangemaakteRegistraties.length = 0
})

describe('sessieduur', () => {
  it('rekent seconden vanaf de starttijd in de database, niet vanaf een lokale teller', () => {
    expect(sessieSeconden(sessie(90))).toBeGreaterThanOrEqual(5399)
    expect(sessieSeconden(sessie(90))).toBeLessThanOrEqual(5401)
  })

  it('geeft nul bij een onleesbare starttijd in plaats van NaN', () => {
    expect(sessieSeconden(sessie(10, { gestart_op: 'geen datum' }))).toBe(0)
  })

  it('markeert pas als vergeten voorbij de grens', () => {
    expect(isVerlopen(sessie(MAX_SESSIE_UREN * 60 - 1))).toBe(false)
    expect(isVerlopen(sessie(MAX_SESSIE_UREN * 60 + 1))).toBe(true)
  })
})

describe('uitklokken', () => {
  it('boekt de gelopen tijd met het meegegeven tarief en ruimt de sessie op', async () => {
    store.set('tijd_sessies', [sessie(75)])

    const resultaat = await stopTijdSessie(sessie(75), 92)

    expect(resultaat.duurMinuten).toBe(75)
    expect(resultaat.verlopen).toBe(false)
    expect(aangemaakteRegistraties).toHaveLength(1)
    expect(aangemaakteRegistraties[0]).toMatchObject({
      project_id: 'proj-1',
      medewerker_id: 'mw-1',
      medewerker_naam: 'Antony Bootsma',
      duur_minuten: 75,
      uurtarief: 92,
      facturabel: true,
      gefactureerd: false,
    })
    expect(store.get('tijd_sessies')).toHaveLength(0)
  })

  it('boekt niets bij een vergeten sessie · een nacht van veertien uur hoort niet in de nacalculatie', async () => {
    const vergeten = sessie(MAX_SESSIE_UREN * 60 + 120)
    store.set('tijd_sessies', [vergeten])

    const resultaat = await stopTijdSessie(vergeten, 92)

    expect(resultaat.verlopen).toBe(true)
    expect(resultaat.duurMinuten).toBe(0)
    expect(aangemaakteRegistraties).toHaveLength(0)
    expect(store.get('tijd_sessies')).toHaveLength(0)
  })

  it('boekt niets onder de minuut', async () => {
    const kort = sessie(0)
    store.set('tijd_sessies', [kort])

    const resultaat = await stopTijdSessie(kort, 92)

    expect(resultaat.registratie).toBeNull()
    expect(aangemaakteRegistraties).toHaveLength(0)
  })
})

describe('inklokken', () => {
  it('klokt een lopende sessie op een ander project uit en boekt die', async () => {
    store.set('tijd_sessies', [sessie(45)])

    const { sessie: nieuw, vorige } = await startTijdSessie('user-1', {
      project_id: 'proj-2',
      project_naam: 'Gevelletters',
      uurtarief: 92,
    })

    expect(vorige?.duurMinuten).toBe(45)
    expect(aangemaakteRegistraties[0]).toMatchObject({ project_id: 'proj-1', duur_minuten: 45 })
    expect(nieuw.project_id).toBe('proj-2')
    expect(store.get('tijd_sessies')).toHaveLength(1)
  })

  it('laat een lopende sessie op hetzelfde project met rust in plaats van hem te herstarten', async () => {
    const lopend = sessie(20)
    store.set('tijd_sessies', [lopend])

    const { sessie: terug, vorige } = await startTijdSessie('user-1', {
      project_id: 'proj-1',
      uurtarief: 92,
    })

    expect(vorige).toBeNull()
    expect(terug.gestart_op).toBe(lopend.gestart_op)
    expect(aangemaakteRegistraties).toHaveLength(0)
  })

  it('raakt de sessie van een collega niet aan', async () => {
    store.set('tijd_sessies', [sessie(30, { id: 'sessie-yvonne', user_id: 'user-2' })])

    await startTijdSessie('user-1', { project_id: 'proj-1', uurtarief: 92 })

    expect(aangemaakteRegistraties).toHaveLength(0)
    expect(await getEigenTijdSessie('user-2')).toMatchObject({ id: 'sessie-yvonne' })
    expect(store.get('tijd_sessies')).toHaveLength(2)
  })
})
