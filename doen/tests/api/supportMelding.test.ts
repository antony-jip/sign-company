import { describe, it, expect, beforeAll } from 'vitest'

// Zie tests/utils/supportInbox.test.ts: env vóór de import, anders gooit
// createClient op module-niveau.
type BerichtApi = typeof import('../../api/support-bericht')
let api: BerichtApi

const ADMIN_ORG_ID = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229'
const KLANT_ORG_ID = '11111111-2222-3333-4444-555555555555'
const VENSTER_MS = 15 * 60 * 1000

beforeAll(async () => {
  process.env.VITE_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  // Bewust GEEN RESEND_API_KEY: er mag uit een test nooit echt post uitgaan.
  delete process.env.RESEND_API_KEY
  api = await import('../../api/support-bericht')
})

describe('meldingIdempotencySleutel · nooit dubbel sturen', () => {
  const t0 = Date.UTC(2026, 7, 12, 12, 0, 0)

  it('geeft dezelfde sleutel voor een herhaalde uitvoering van dezelfde melding', () => {
    // Dit is het retry-geval: dezelfde request nog eens, even later.
    expect(api.meldingIdempotencySleutel('g1', t0, VENSTER_MS))
      .toBe(api.meldingIdempotencySleutel('g1', t0 + 5_000, VENSTER_MS))
  })

  it('bundelt losse berichten van hetzelfde gesprek binnen het venster', () => {
    // Klant typt vijf regels achter elkaar; dat hoort één mail te zijn.
    const sleutels = [0, 10_000, 60_000, 300_000, 800_000].map(dt =>
      api.meldingIdempotencySleutel('g1', t0 + dt, VENSTER_MS)
    )
    expect(new Set(sleutels).size).toBe(1)
  })

  it('scheidt gesprekken van elkaar', () => {
    expect(api.meldingIdempotencySleutel('g1', t0, VENSTER_MS))
      .not.toBe(api.meldingIdempotencySleutel('g2', t0, VENSTER_MS))
  })

  it('laat na het venster een nieuwe melding toe', () => {
    // Een klant die een half uur later terugkomt mag niet in stilte wachten.
    expect(api.meldingIdempotencySleutel('g1', t0, VENSTER_MS))
      .not.toBe(api.meldingIdempotencySleutel('g1', t0 + VENSTER_MS + 1, VENSTER_MS))
  })

  it('valt op de vensterrand naar een nieuwe sleutel', () => {
    const basis = Math.floor(t0 / VENSTER_MS) * VENSTER_MS
    const binnen = api.meldingIdempotencySleutel('g1', basis + VENSTER_MS - 1, VENSTER_MS)
    const erna = api.meldingIdempotencySleutel('g1', basis + VENSTER_MS, VENSTER_MS)
    expect(binnen).not.toBe(erna)
  })

  it('bevat het gesprek-id, zodat de sleutel in de log te herleiden is', () => {
    expect(api.meldingIdempotencySleutel('g1', t0, VENSTER_MS)).toContain('g1')
    expect(api.meldingIdempotencySleutel('g1', t0, VENSTER_MS)).toMatch(/^support-melding:/)
  })
})

describe('moetBuitenAppMelden', () => {
  it('meldt wanneer de beheerder de app niet openstaan heeft', () => {
    // Precies het geval uit de audit: niemand kijkt, de klant wacht.
    expect(api.moetBuitenAppMelden({
      adminOnline: false, organisatieId: KLANT_ORG_ID, adminOrgId: ADMIN_ORG_ID,
    })).toBe(true)
  })

  it('meldt niet wanneer de beheerder online is', () => {
    // Het belletje in de app is dan al gezien; mail zou ruis zijn.
    expect(api.moetBuitenAppMelden({
      adminOnline: true, organisatieId: KLANT_ORG_ID, adminOrgId: ADMIN_ORG_ID,
    })).toBe(false)
  })

  it('meldt niet over een bericht van de supportorganisatie zelf', () => {
    // Lus-beveiliging: support mag zichzelf niet aanschrijven.
    expect(api.moetBuitenAppMelden({
      adminOnline: false, organisatieId: ADMIN_ORG_ID, adminOrgId: ADMIN_ORG_ID,
    })).toBe(false)
  })

  it('gebruikt de ingebouwde supportorganisatie als er geen wordt meegegeven', () => {
    expect(api.moetBuitenAppMelden({ adminOnline: false, organisatieId: ADMIN_ORG_ID })).toBe(false)
    expect(api.moetBuitenAppMelden({ adminOnline: false, organisatieId: KLANT_ORG_ID })).toBe(true)
  })

  it('laat online zwaarder wegen dan de organisatie', () => {
    expect(api.moetBuitenAppMelden({ adminOnline: true, organisatieId: ADMIN_ORG_ID })).toBe(false)
  })
})
