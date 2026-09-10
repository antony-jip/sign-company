import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// De afzender bepaalt uit wiens naam 2600 mensen mail krijgen en waar hun
// antwoord landt. Welke adressen mogen staat met de hand gekopieerd in vier
// api-bestanden (api/* mag niets uit src/ importeren) en in de keuzelijst van de
// editor. Loopt één kopie uit de pas, dan kiest de editor een adres dat de
// server stil vervangt, of verstuurt één route toch nog met de oude vaste afzender.

const WORTEL = fileURLToPath(new URL('../..', import.meta.url))
const lees = (pad: string) => readFileSync(`${WORTEL}/${pad}`, 'utf8')
const BEGIN = '// ── NIEUWSBRIEF-AFZENDER BEGIN ──'
const EINDE = '// ── NIEUWSBRIEF-AFZENDER EINDE ──'

const API = ['api/nieuwsbrief-verzend.ts', 'api/cron-nieuwsbrief.ts', 'api/nieuwsbrief-herzend.ts', 'api/nieuwsbrief-test.ts']
const UIT_DATABASE = ['api/nieuwsbrief-verzend.ts', 'api/cron-nieuwsbrief.ts', 'api/nieuwsbrief-herzend.ts']

function blok(pad: string): string {
  const inhoud = lees(pad)
  const van = inhoud.indexOf(BEGIN)
  const tot = inhoud.indexOf(EINDE)
  if (van === -1 || tot === -1) throw new Error(`${pad} mist het afzender-blok`)
  return inhoud.slice(van + BEGIN.length, tot).trim()
}

function adressen(tekst: string): string[] {
  const m = tekst.match(/AFZENDER_ADRESSEN(?::[^=]+)? = \[([^\]]*)\]/)
  if (!m) throw new Error('adreslijst niet gevonden')
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1])
}

describe('afzender van de nieuwsbrief', () => {
  const bron = blok('api/nieuwsbrief-verzend.ts')

  it.each(API)('%s heeft exact hetzelfde afzender-blok', (pad) => {
    expect(blok(pad)).toBe(bron)
  })

  it('de keuzelijst in de editor is dezelfde lijst als die de server toestaat', () => {
    expect(adressen(lees('src/services/nieuwsbriefService.ts'))).toEqual(adressen(bron))
  })

  it('elk adres valt onder het geverifieerde domein', () => {
    for (const adres of adressen(bron)) expect(adres).toMatch(/@signcompany\.nl$/)
  })

  it.each(API)('%s verstuurt niet meer met een vaste afzender', (pad) => {
    const inhoud = lees(pad)
    expect(inhoud).not.toMatch(/const FROM =|const REPLY_TO =|from: FROM|replyTo: REPLY_TO/)
  })

  it.each(UIT_DATABASE)('%s haalt de afzender echt op en gebruikt hem', (pad) => {
    const inhoud = lees(pad)
    expect(inhoud).toMatch(/const afzender = await afzenderVan\(/)
    expect(inhoud).toMatch(/from: afzender\.from/)
    expect(inhoud).toMatch(/replyTo: afzender\.replyTo/)
  })

  // Vóór migratie 250 bestaat de kolom niet. De bestaande selects mogen hem dus
  // niet noemen: een onbekende kolom laat de hele query falen (42703).
  it.each(UIT_DATABASE)('%s noemt afzender-kolommen alleen in de tolerante lookup', (pad) => {
    const inhoud = lees(pad)
    const buitenLookup = inhoud.replace(/async function afzenderVan[\s\S]*?\n}\n/, '')
    expect(buitenLookup).not.toMatch(/afzender_naam|afzender_email/)
  })
})
