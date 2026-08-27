import { describe, it, expect } from 'vitest'
import { parseAdressen, klantVoldoet, omschrijfSelectie } from '@/services/nieuwsbriefService'

// Het hele punt van een losse lijst is dat je klantenbestand er buiten blijft.
// Laat klantVoldoet ooit één klant door bij type 'lijst', dan krijgt die klant
// een mail die voor een externe lijst bedoeld was.
describe('klantVoldoet bij een losse lijst', () => {
  const klant = { id: 'k1', status: 'actief', labels: ['Retail'] }

  it('laat geen enkele klant door', () => {
    expect(klantVoldoet(klant, { type: 'lijst', lijstId: 'l1' })).toBe(false)
  })

  it('laat ook geen klant door als er toevallig statussen of labels meestaan', () => {
    expect(klantVoldoet(klant, { type: 'lijst', lijstId: 'l1', statussen: ['actief'], labels: ['Retail'] })).toBe(false)
  })

  it('raakt de bestaande keuzes niet', () => {
    expect(klantVoldoet(klant, { type: 'alle' })).toBe(true)
    expect(klantVoldoet(klant, { type: 'handmatig', klantIds: ['k1'] })).toBe(true)
    expect(klantVoldoet(klant, { type: 'filter', statussen: ['inactief'] })).toBe(false)
  })
})

describe('parseAdressen', () => {
  it('leest een kale kolom adressen', () => {
    const uit = parseAdressen('een@signmaker.nl\ntwee@signmaker.nl')
    expect(uit.map(a => a.email)).toEqual(['een@signmaker.nl', 'twee@signmaker.nl'])
  })

  it('herkent een kopregel en de kolommen naam en bedrijf', () => {
    const uit = parseAdressen('email;naam;bedrijf\njan@signmaker.nl;Jan de Vries;Signmaker BV')
    expect(uit).toEqual([{ email: 'jan@signmaker.nl', naam: 'Jan de Vries', bedrijfsnaam: 'Signmaker BV' }])
  })

  it('slikt komma, puntkomma en tab als scheidingsteken', () => {
    expect(parseAdressen('a@b.nl,Jan')[0].email).toBe('a@b.nl')
    expect(parseAdressen('a@b.nl;Jan')[0].email).toBe('a@b.nl')
    expect(parseAdressen('a@b.nl\tJan')[0].email).toBe('a@b.nl')
  })

  it('pakt zonder kopregel het veld met een @, waar het ook staat', () => {
    const uit = parseAdressen('Signmaker BV;Jan de Vries;jan@signmaker.nl')
    expect(uit[0].email).toBe('jan@signmaker.nl')
  })

  // Een Excel-export zet velden vaak tussen aanhalingstekens; die horen niet in
  // het adres terecht te komen, anders faalt de e-mailcontrole erop.
  it('haalt aanhalingstekens uit een Excel-export weg', () => {
    const uit = parseAdressen('"email";"naam"\n"jan@signmaker.nl";"Jan"')
    expect(uit[0]).toEqual({ email: 'jan@signmaker.nl', naam: 'Jan', bedrijfsnaam: '' })
  })

  it('slaat regels zonder adres over', () => {
    expect(parseAdressen('email;naam\n;Zonder adres\njan@signmaker.nl;Jan')).toHaveLength(1)
  })

  it('geeft een lege lijst bij lege invoer', () => {
    expect(parseAdressen('')).toEqual([])
    expect(parseAdressen('   \n  \n')).toEqual([])
  })

  // Een bestand waarvan de eerste regel al een adres is heeft geen kopregel;
  // die regel mag niet als kolomnamen worden weggegooid.
  it('ziet een eerste regel met een adres niet aan voor een kopregel', () => {
    expect(parseAdressen('mail@signmaker.nl\ntwee@signmaker.nl')).toHaveLength(2)
  })
})

describe('omschrijfSelectie', () => {
  it('noemt een losse lijst bij naam', () => {
    expect(omschrijfSelectie({ type: 'lijst', lijstId: 'l1' })).toBe('losse adreslijst')
  })
})
