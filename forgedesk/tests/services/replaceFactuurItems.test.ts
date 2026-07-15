import { describe, it, expect, vi, beforeEach } from 'vitest'

const staat = vi.hoisted(() => ({
  calls: [] as string[],
  insertMoetFalen: false,
  bestaandeIds: [] as Array<{ id: string }>,
  laatstIngevoegd: [] as unknown[],
  verwijderdeIds: [] as string[],
}))

vi.mock('../../src/services/supabaseHelpers', () => ({
  supabase: {
    from: (tabel: string) => ({
      select: () => ({
        eq: () => {
          staat.calls.push(`select:${tabel}`)
          return Promise.resolve({ data: staat.bestaandeIds, error: null })
        },
      }),
      insert: (rijen: unknown[]) => {
        staat.calls.push(`insert:${tabel}`)
        staat.laatstIngevoegd = rijen
        return {
          select: () =>
            staat.insertMoetFalen
              ? Promise.resolve({ data: null, error: { message: 'insert geweigerd' } })
              : Promise.resolve({ data: rijen, error: null }),
        }
      },
      delete: () => ({
        in: (_kolom: string, ids: string[]) => {
          staat.calls.push(`delete:${tabel}`)
          staat.verwijderdeIds = ids
          return Promise.resolve({ error: null })
        },
      }),
    }),
  },
  isSupabaseConfigured: () => true,
  withUserId: async (data: object) => data,
  assertId: () => {},
  getLocalData: () => [],
  setLocalData: () => {},
  generateId: () => 'nieuw-id',
  now: () => '2026-07-15T00:00:00.000Z',
  getOrgId: async () => 'org-1',
  sanitizeDates: (d: unknown) => d,
  round2: (n: number) => n,
  getMaxNummer: async () => 0,
}))

const { replaceFactuurItems } = await import('../../src/services/factuurService')

const FACTUUR_ID = '11111111-1111-4111-8111-111111111111'

const regel = (beschrijving: string, eenheidsprijs: number) => ({
  user_id: 'user-1',
  beschrijving,
  aantal: 1,
  eenheidsprijs,
  btw_percentage: 21,
  korting_percentage: 0,
  totaal: eenheidsprijs,
  volgorde: 1,
  grootboek_code: '',
  detail_regels: [],
})

describe('replaceFactuurItems', () => {
  beforeEach(() => {
    staat.calls.length = 0
    staat.insertMoetFalen = false
    staat.bestaandeIds = [{ id: 'oud-1' }, { id: 'oud-2' }]
    staat.laatstIngevoegd = []
    staat.verwijderdeIds = []
  })

  it('voegt de nieuwe regels in vóór het verwijderen van de oude', async () => {
    await replaceFactuurItems(FACTUUR_ID, [regel('Gevellogo zijkant', 4225)])

    expect(staat.calls).toEqual(['select:factuur_items', 'insert:factuur_items', 'delete:factuur_items'])
    expect(staat.verwijderdeIds).toEqual(['oud-1', 'oud-2'])
  })

  it('laat de oude regels staan als de insert faalt', async () => {
    staat.insertMoetFalen = true

    await expect(replaceFactuurItems(FACTUUR_ID, [regel('Gevellogo zijkant', 4225)]))
      .rejects.toMatchObject({ message: 'insert geweigerd' })

    expect(staat.calls).not.toContain('delete:factuur_items')
    expect(staat.verwijderdeIds).toEqual([])
  })

  it('schrijft de aangepaste eenheidsprijs weg, niet de oude', async () => {
    await replaceFactuurItems(FACTUUR_ID, [regel('Gevellogo zijkant', 4225)])

    expect(staat.laatstIngevoegd).toHaveLength(1)
    expect(staat.laatstIngevoegd[0]).toMatchObject({
      factuur_id: FACTUUR_ID,
      beschrijving: 'Gevellogo zijkant',
      eenheidsprijs: 4225,
    })
  })

  it('verwijdert alle regels als er geen enkele regel overblijft', async () => {
    await replaceFactuurItems(FACTUUR_ID, [])

    expect(staat.calls).toEqual(['select:factuur_items', 'delete:factuur_items'])
    expect(staat.verwijderdeIds).toEqual(['oud-1', 'oud-2'])
  })

  it('slaat de delete over als de factuur nog geen regels had', async () => {
    staat.bestaandeIds = []

    await replaceFactuurItems(FACTUUR_ID, [regel('Nieuwe regel', 100)])

    expect(staat.calls).toEqual(['select:factuur_items', 'insert:factuur_items'])
  })
})
