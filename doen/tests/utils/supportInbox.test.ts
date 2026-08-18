import { describe, it, expect, beforeAll } from 'vitest'
import {
  voegGesprekkenSamen,
  heeftMeerGesprekken,
  herlaadLimiet,
  SUPPORT_PAGINA_GROOTTE,
} from '../../src/utils/supportInbox'

// De api/-bestanden staan buiten tsconfig en maken hun Supabase-client op
// module-niveau. createClient('') gooit, dus de env moet staan vóór de import.
type InboxApi = typeof import('../../api/support-inbox')
let api: InboxApi

beforeAll(async () => {
  process.env.VITE_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  api = await import('../../api/support-inbox')
})

describe('voegGesprekkenSamen', () => {
  const g = (id: string, extra: Record<string, unknown> = {}) => ({ id, ...extra })

  it('zet een nieuwe pagina achter de bestaande rijen', () => {
    const samen = voegGesprekkenSamen([g('a'), g('b')], [g('c'), g('d')])
    expect(samen.map(x => x.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('ontdubbelt een gesprek dat door nieuwe activiteit in twee paginas valt', () => {
    // 'b' schoof naar voren en komt daardoor ook in pagina 2 terug.
    const samen = voegGesprekkenSamen([g('a'), g('b')], [g('b'), g('c')])
    expect(samen.map(x => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('houdt de eerst geziene versie, zodat de lijst niet onder de gebruiker verspringt', () => {
    const samen = voegGesprekkenSamen([g('a', { org_naam: 'Eerst' })], [g('a', { org_naam: 'Later' })])
    expect(samen).toHaveLength(1)
    expect(samen[0].org_naam).toBe('Eerst')
  })

  it('geeft dezelfde array terug als er niets nieuws bij komt', () => {
    const bestaand = [g('a')]
    expect(voegGesprekkenSamen(bestaand, [g('a')])).toBe(bestaand)
  })

  it('kan met een lege bestaande lijst overweg', () => {
    expect(voegGesprekkenSamen([], [g('a')]).map(x => x.id)).toEqual(['a'])
  })
})

describe('heeftMeerGesprekken', () => {
  it('is waar zolang er minder geladen is dan het servertotaal', () => {
    expect(heeftMeerGesprekken(25, 100)).toBe(true)
  })

  it('is onwaar als alles binnen is', () => {
    expect(heeftMeerGesprekken(100, 100)).toBe(false)
  })

  it('is onwaar bij een lege lijst, ook als het totaal nog onbekend is', () => {
    expect(heeftMeerGesprekken(0, 0)).toBe(false)
    expect(heeftMeerGesprekken(0, 10)).toBe(false)
  })

  it('is onwaar als er meer geladen is dan geteld', () => {
    // Kan gebeuren als er tussen twee requests een gesprek verdwijnt.
    expect(heeftMeerGesprekken(30, 25)).toBe(false)
  })
})

describe('herlaadLimiet', () => {
  it('vraagt na een realtime-INSERT alles terug wat al geladen was', () => {
    expect(herlaadLimiet(75)).toBe(75)
  })

  it('zakt nooit onder een volle pagina', () => {
    expect(herlaadLimiet(0)).toBe(SUPPORT_PAGINA_GROOTTE)
    expect(herlaadLimiet(3)).toBe(SUPPORT_PAGINA_GROOTTE)
  })
})

describe('leesPaginatie', () => {
  it('valt zonder querystring terug op de standaardpagina', () => {
    expect(api.leesPaginatie({})).toEqual({ limiet: 25, offset: 0 })
  })

  it('leest limit en offset als string, zoals ze uit de query komen', () => {
    expect(api.leesPaginatie({ limit: '10', offset: '40' })).toEqual({ limiet: 10, offset: 40 })
  })

  it('begrenst de limiet, zodat een request de tabel niet alsnog leegtrekt', () => {
    expect(api.leesPaginatie({ limit: '99999' }).limiet).toBe(200)
  })

  it('negeert onbruikbare waarden in plaats van te falen', () => {
    // Een kapotte querystring mag de inbox niet onbruikbaar maken.
    expect(api.leesPaginatie({ limit: 'abc', offset: 'xyz' })).toEqual({ limiet: 25, offset: 0 })
    expect(api.leesPaginatie({ limit: '-5', offset: '-10' })).toEqual({ limiet: 25, offset: 0 })
    expect(api.leesPaginatie({ limit: '0' }).limiet).toBe(25)
  })
})

describe('ondergrensVoorPreviews', () => {
  it('neemt de oudste activiteit van de pagina, met marge', () => {
    const grens = api.ondergrensVoorPreviews([
      { laatste_bericht_op: '2026-08-12T12:00:00.000Z' },
      { laatste_bericht_op: '2026-08-12T10:00:00.000Z' },
      { laatste_bericht_op: '2026-08-12T11:00:00.000Z' },
    ], 60_000)
    expect(grens).toBe('2026-08-12T09:59:00.000Z')
  })

  it('geeft null als een gesprek geen activiteitstempel heeft', () => {
    // Zonder betrouwbare ondergrens mag de query niet filteren: een te hoge
    // grens zou previews laten verdwijnen.
    expect(api.ondergrensVoorPreviews([
      { laatste_bericht_op: '2026-08-12T12:00:00.000Z' },
      { laatste_bericht_op: null },
    ])).toBeNull()
  })

  it('geeft null bij een onleesbare datum', () => {
    expect(api.ondergrensVoorPreviews([{ laatste_bericht_op: 'geen datum' }])).toBeNull()
  })

  it('geeft null voor een lege pagina', () => {
    expect(api.ondergrensVoorPreviews([])).toBeNull()
  })
})

describe('laatsteBerichtPerGesprek', () => {
  const b = (gesprek_id: string, bericht: string, aangemaakt_op: string, afzender = 'klant') =>
    ({ gesprek_id, bericht, afzender, aangemaakt_op })

  it('kiest per gesprek het nieuwste bericht', () => {
    const uit = api.laatsteBerichtPerGesprek([
      b('g1', 'oud', '2026-08-12T10:00:00.000Z'),
      b('g1', 'nieuw', '2026-08-12T12:00:00.000Z'),
      b('g2', 'ander', '2026-08-12T11:00:00.000Z'),
    ])
    expect(uit.g1.bericht).toBe('nieuw')
    expect(uit.g2.bericht).toBe('ander')
  })

  it('is onafhankelijk van de sorteerrichting van de query', () => {
    const oplopend = api.laatsteBerichtPerGesprek([
      b('g1', 'oud', '2026-08-12T10:00:00.000Z'),
      b('g1', 'nieuw', '2026-08-12T12:00:00.000Z'),
    ])
    const aflopend = api.laatsteBerichtPerGesprek([
      b('g1', 'nieuw', '2026-08-12T12:00:00.000Z'),
      b('g1', 'oud', '2026-08-12T10:00:00.000Z'),
    ])
    expect(oplopend.g1.bericht).toBe('nieuw')
    expect(aflopend.g1.bericht).toBe('nieuw')
  })

  it('geeft een leeg resultaat zonder berichten', () => {
    expect(api.laatsteBerichtPerGesprek([])).toEqual({})
  })
})

describe('telAttentie', () => {
  const laatste = {
    g1: { bericht: 'help', afzender: 'klant', aangemaakt_op: '2026-08-12T12:00:00.000Z' },
    g2: { bericht: 'gedaan', afzender: 'admin', aangemaakt_op: '2026-08-12T12:00:00.000Z' },
  }

  it('telt alleen gesprekken waar de klant het laatst sprak', () => {
    expect(api.telAttentie(['g1', 'g2'], laatste)).toBe(1)
  })

  it('telt een gesprek zonder berichten niet mee', () => {
    expect(api.telAttentie(['g1', 'g3'], laatste)).toBe(1)
  })

  it('is nul zonder gesprekken', () => {
    expect(api.telAttentie([], laatste)).toBe(0)
  })
})

describe('kolomOntbreekt · terugval vóór migratie 201', () => {
  it('herkent een ontbrekende kolom, rechtstreeks en via de schema-cache', () => {
    expect(api.kolomOntbreekt({ code: '42703' })).toBe(true)
    expect(api.kolomOntbreekt({ code: 'PGRST204' })).toBe(true)
  })

  it('leest andere fouten niet als niet-gemigreerd', () => {
    // Een RLS- of permissiefout die de kolomnaam echoot mag hier niet in
    // trappen: dan zou de toewijzing stil verdwijnen terwijl de kolom bestaat.
    expect(api.kolomOntbreekt({ code: '42501' })).toBe(false)
    expect(api.kolomOntbreekt({ code: '23505' })).toBe(false)
    expect(api.kolomOntbreekt({})).toBe(false)
  })

  it('gaat om met het ontbreken van een fout', () => {
    expect(api.kolomOntbreekt(null)).toBe(false)
  })
})
