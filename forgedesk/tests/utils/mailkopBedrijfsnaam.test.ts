import { describe, it, expect } from 'vitest'
import { buildPortalEmailHtml as bouwApiMail } from '../../api/emailTemplate'
import { buildPortalEmailHtml as bouwAppMail } from '@/utils/emailTemplate'

/**
 * De mailkop toont de bedrijfsnaam als tekst, nooit het logobestand. Een logo
 * draagt zijn eigen achtergrond mee en botst met het gekleurde vlak eronder;
 * bij Sign Company was dat een donker logo op een rode balk.
 *
 * Deze kop staat in zes bestanden apart (api/ mag niet uit src/ importeren),
 * dus dit is precies het soort wijziging dat ergens terugkruipt. Vandaar een
 * test op de twee bouwers die wél te importeren zijn.
 */
const gedeeld = {
  heading: 'Er staat iets voor u klaar',
  bedrijfsnaam: 'Groot & Groot Peonies',
  logoUrl: 'https://example.com/logo.png',
}

describe.each([
  ['api/emailTemplate', bouwApiMail],
  ['src/utils/emailTemplate', bouwAppMail],
])('%s', (_naam, bouw) => {
  it('zet de bedrijfsnaam als tekst in de kop', () => {
    expect(bouw(gedeeld)).toContain('Groot &amp; Groot Peonies')
  })

  it('plaatst het logo niet, ook niet als er een logoUrl meekomt', () => {
    const html = bouw(gedeeld)
    expect(html).not.toContain('https://example.com/logo.png')
    expect(html).not.toMatch(/<img[^>]+logo/i)
  })

  it('laat de kop leeg zonder bedrijfsnaam in plaats van "undefined" te tonen', () => {
    const html = bouw({ heading: 'Zonder afzender' })
    expect(html).not.toContain('undefined')
  })
})
