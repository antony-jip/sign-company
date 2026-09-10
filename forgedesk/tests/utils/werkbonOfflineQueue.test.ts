import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * De buffer voor monteur-feedback (uren, opmerkingen, handtekening) die op
 * locatie zonder dekking wacht. Tot 10 sep 2026 las de flush de werkbon via
 * getWerkbon, dat bij élke fout null geeft. Een wankele verbinding bij het
 * online-event las dat als "werkbon bestaat niet" en wiste de buffer.
 */

const nepStatus = vi.fn()
const nepUpdate = vi.fn()
const opslag = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (k: string) => opslag.get(k) ?? null,
  setItem: (k: string, v: string) => { opslag.set(k, String(v)) },
  removeItem: (k: string) => { opslag.delete(k) },
})
vi.mock('@/services/werkbonService', () => ({
  leesWerkbonStatus: (...args: unknown[]) => nepStatus(...args),
  updateWerkbon: (...args: unknown[]) => nepUpdate(...args),
  // Het oude gedrag: null bij elke fout. Wie hier weer op leunt, faalt de
  // netwerktest in plaats van hem per ongeluk te halen.
  getWerkbon: async () => null,
}))
vi.mock('@/utils/localStorageUtils', () => ({
  safeSetItem: (k: string, v: string) => { opslag.set(k, v); return true },
}))
vi.mock('@/utils/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const { bufferWerkbonFeedback, flushWerkbonFeedbackQueue } = await import('@/utils/werkbonOfflineQueue')

const gebufferd = () => Object.keys(JSON.parse(opslag.get('doen_werkbon_feedback_queue') || '{}'))
const payload = { uren_gewerkt: 3, klant_naam_getekend: 'Jansen' }

beforeEach(() => {
  opslag.clear()
  nepStatus.mockReset()
  nepUpdate.mockReset()
  bufferWerkbonFeedback('wb-1', payload, 1)
})

describe('flushWerkbonFeedbackQueue', () => {
  it('houdt de buffer vast bij een netwerkfout', async () => {
    nepStatus.mockRejectedValue(new TypeError('Load failed'))
    await flushWerkbonFeedbackQueue()
    expect(nepUpdate).not.toHaveBeenCalled()
    expect(gebufferd()).toEqual(['wb-1'])
  })

  it('speelt de buffer af op een open werkbon en wist hem daarna', async () => {
    nepStatus.mockResolvedValue('concept')
    nepUpdate.mockResolvedValue({})
    await flushWerkbonFeedbackQueue()
    expect(nepUpdate).toHaveBeenCalledWith('wb-1', payload)
    expect(gebufferd()).toEqual([])
  })

  it.each(['afgerond', 'gefactureerd'])('zet een %s werkbon niet terug', async (status) => {
    nepStatus.mockResolvedValue(status)
    await flushWerkbonFeedbackQueue()
    expect(nepUpdate).not.toHaveBeenCalled()
    expect(gebufferd()).toEqual([])
  })

  it('wist alleen als de werkbon echt weg is', async () => {
    nepStatus.mockResolvedValue(null)
    await flushWerkbonFeedbackQueue()
    expect(nepUpdate).not.toHaveBeenCalled()
    expect(gebufferd()).toEqual([])
  })
})
