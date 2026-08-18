import { describe, it, expect } from 'vitest'

/**
 * Het secret-filter van api/org-export.ts, hier nagebouwd.
 *
 * Waarom een kopie en geen import: `api/*` is standalone en mag niets uit `src/`
 * halen, en het omgekeerde geldt ook. Het endpoint valt daardoor buiten de
 * tsconfig en dus buiten elke geautomatiseerde poort. Deze test is de enige
 * plek waar dit filter gecontroleerd wordt, dus de twee regexes hieronder
 * moeten letterlijk gelijk blijven aan die in api/org-export.ts.
 *
 * De aanleiding is een echte bevinding uit de review: `facturen.betaal_link`
 * bevat `/betalen/<betaal_token>`, dus het filter haalde de token uit
 * `betaal_token` weg en stuurde hem via `betaal_link` alsnog mee. Een uitvoer
 * is bedoeld om door te sturen; een levende sleutel hoort daar niet in.
 */
const GEVOELIGE_KOLOM = /encrypted|token|password|api_key|secret|sleutel|credential|geheim|betaal_link|payment_url/i
const CAPABILITY_URL = /\/(betalen|goedkeuring|offerte-bekijken|formulier|portaal)\/[A-Za-z0-9_-]{8,}/

function stripGevoelig(waarde: unknown, tabel: string, gevonden: Set<string>, diepte = 0): unknown {
  if (diepte > 8) {
    gevonden.add(`${tabel}.<te diep genest, weggelaten>`)
    return null
  }
  if (waarde == null) return waarde
  if (Array.isArray(waarde)) return waarde.map(v => stripGevoelig(v, tabel, gevonden, diepte + 1))
  if (typeof waarde === 'object') {
    const uit: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(waarde as Record<string, unknown>)) {
      if (GEVOELIGE_KOLOM.test(k)) {
        gevonden.add(`${tabel}.${k}`)
        continue
      }
      uit[k] = stripGevoelig(v, tabel, gevonden, diepte + 1)
    }
    return uit
  }
  if (typeof waarde === 'string' && CAPABILITY_URL.test(waarde)) {
    gevonden.add(`${tabel}.<link naar een publieke pagina met token>`)
    return null
  }
  return waarde
}

const strip = (rij: unknown) => {
  const gevonden = new Set<string>()
  return { uit: stripGevoelig(rij, 't', gevonden) as Record<string, unknown>, gevonden }
}

describe('org-export secret-filter · op kolomnaam', () => {
  it('haalt de vier standaardgevallen weg', () => {
    const { uit } = strip({
      naam: 'Jansen',
      imap_password_encrypted: 'x',
      exact_access_token: 'y',
      mollie_api_key: 'z',
      wachtwoord_hash_password: 'w',
    })
    expect(uit).toEqual({ naam: 'Jansen' })
  })

  it('haalt de secrets weg die de eerste vier woorden misten', () => {
    // Deze twee zitten echt in app_settings en matchten niet op
    // encrypted|token|password|api_key.
    const { uit } = strip({ exact_online_client_secret: 'a', snelstart_koppelsleutel: 'b', bedrijfsnaam: 'doen.' })
    expect(uit).toEqual({ bedrijfsnaam: 'doen.' })
  })

  it('laat gewone gegevens staan', () => {
    const rij = { naam: 'Jansen', iban: 'NL00BANK0123456789', logo_url: 'https://x.nl/logo.png', bedrag: 121.5 }
    expect(strip(rij).uit).toEqual(rij)
  })

  it('meldt per naam wat er weg is', () => {
    expect([...strip({ betaal_token: 'x' }).gevonden]).toEqual(['t.betaal_token'])
  })
})

describe('org-export secret-filter · op waarde', () => {
  it('haalt betaal_link weg, de bevinding uit de review', () => {
    const { uit } = strip({
      factuurnummer: 'F-2026-001',
      betaal_token: 'abc123def456',
      betaal_link: 'https://app.doen.team/betalen/abc123def456',
    })
    expect(uit).toEqual({ factuurnummer: 'F-2026-001' })
  })

  /**
   * Het naamfilter dekt `betaal_link` nu expliciet, maar een naamfilter mist per
   * definitie de VOLGENDE kolom die een URL blijkt te zijn. Daarom moet de
   * waardecheck ook een onbekende kolomnaam afvangen.
   */
  it('haalt een token-link ook uit een kolom met een onschuldige naam', () => {
    const { uit, gevonden } = strip({
      omschrijving: 'Zie https://app.doen.team/portaal/Xk9mQ2pLw7 voor de stukken',
      notitie: 'gewone tekst',
    })
    // Bij een naamtreffer verdwijnt de kolom; bij een waardetreffer blijft de
    // kolom staan met null erin. Dat is bewust: de ontvanger ziet dan dat het
    // veld bestaat en leeggemaakt is, in plaats van dat het nooit bestond.
    expect(uit).toEqual({ omschrijving: null, notitie: 'gewone tekst' })
    expect([...gevonden]).toEqual(['t.<link naar een publieke pagina met token>'])
  })

  it('dekt alle vijf de publieke routes', () => {
    for (const route of ['betalen', 'goedkeuring', 'offerte-bekijken', 'formulier', 'portaal']) {
      const { uit } = strip({ link: `https://app.doen.team/${route}/Tk3nAbcdEfgh` })
      expect(uit, route).toEqual({ link: null })
    }
  })

  it('laat een gewone link naar de app staan', () => {
    const rij = {
      a: 'https://app.doen.team/facturen',
      b: 'https://doen.team/prijzen',
      c: 'https://app.doen.team/betalen',
    }
    expect(strip(rij).uit).toEqual(rij)
  })

  it('werkt ook als de link in een JSONB-veld genest zit', () => {
    const { uit } = strip({
      meta: { verstuurd: true, links: [{ url: 'https://app.doen.team/betalen/abc123def456' }] },
    })
    expect(uit).toEqual({ meta: { verstuurd: true, links: [{ url: null }] } })
  })
})

describe('org-export secret-filter · faalt dicht', () => {
  /**
   * Te diep genest gaf eerst de RUWE subtree terug, dus daar faalde het filter
   * open: precies de plek waar een secret ongefilterd langskomt.
   */
  it('geeft niets terug voorbij de maximale diepte, niet alles', () => {
    let diep: Record<string, unknown> = { betaal_token: 'geheim' }
    for (let i = 0; i < 12; i++) diep = { n: diep }

    const json = JSON.stringify(strip(diep).uit)
    expect(json).not.toContain('geheim')
    expect(json).not.toContain('betaal_token')
  })
})
