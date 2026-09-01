import { describe, it, expect, beforeAll } from 'vitest'

// Het importeren van de route maakt een Supabase-client aan; zonder deze twee
// variabelen gooit createClient meteen. De guard zelf is puur.
process.env.VITE_SUPABASE_URL ||= 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-key'

let magOpnieuwNaFout: (err: unknown) => boolean
let ExactHttpError: new (status: number, endpoint: string, body: string) => Error

beforeAll(async () => {
  const mod = await import('../../api/exact-sync-factuur')
  magOpnieuwNaFout = mod.magOpnieuwNaFout
  ExactHttpError = mod.ExactHttpError
})

// Exact kent geen idempotency-key. Elke fout die niet aantoonbaar betekent dat
// Exact het verzoek heeft geweigerd, kan een boeking hebben achtergelaten;
// opnieuw posten zet de factuur dan een tweede keer in de administratie.
describe('magOpnieuwNaFout', () => {
  it('laat alleen een 401 opnieuw proberen: Exact heeft dan niets geboekt', () => {
    expect(magOpnieuwNaFout(new ExactHttpError(401, 'POST salesentry', 'expired'))).toBe(true)
  })

  it('weigert opnieuw te posten na een serverfout van Exact', () => {
    expect(magOpnieuwNaFout(new ExactHttpError(500, 'POST salesentry', 'boom'))).toBe(false)
    expect(magOpnieuwNaFout(new ExactHttpError(502, 'POST salesentry', ''))).toBe(false)
    expect(magOpnieuwNaFout(new ExactHttpError(429, 'POST salesentry', ''))).toBe(false)
  })

  // De drie fouten die onder de oude blocklist wél opnieuw mochten posten.
  it('weigert opnieuw te posten bij een afgebroken verbinding of onleesbaar antwoord', () => {
    expect(magOpnieuwNaFout(new TypeError('fetch failed'))).toBe(false)
    expect(magOpnieuwNaFout(new SyntaxError('Unexpected end of JSON input'))).toBe(false)
    expect(magOpnieuwNaFout(new Error('Exact API fout (POST salesentry): 500 - boom'))).toBe(false)
  })

  it('weigert opnieuw te posten bij een time-out of abort', () => {
    const timeout = new Error('timed out'); timeout.name = 'TimeoutError'
    const abort = new Error('aborted'); abort.name = 'AbortError'
    expect(magOpnieuwNaFout(timeout)).toBe(false)
    expect(magOpnieuwNaFout(abort)).toBe(false)
  })

  it('weigert opnieuw te posten bij iets dat geen Error is', () => {
    expect(magOpnieuwNaFout(null)).toBe(false)
    expect(magOpnieuwNaFout('kapot')).toBe(false)
  })
})
