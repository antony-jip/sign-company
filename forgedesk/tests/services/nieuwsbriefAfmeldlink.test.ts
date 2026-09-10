import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// De afmeldlink is een wettelijke plicht: wie op "Uitschrijven" klikt, moet op
// een werkende pagina landen. De sleutel waarmee de link ondertekend wordt staat
// met de hand gekopieerd in vijf api-bestanden, want api/* mag niets uit src/
// importeren. Loopt één kopie uit de pas, dan weigert de afmeldpagina elke link
// uit die route en kan niemand zich meer afmelden.

const WORTEL = fileURLToPath(new URL('../..', import.meta.url))
const lees = (pad: string) => readFileSync(`${WORTEL}/${pad}`, 'utf8')

const SLEUTEL = /const (?:AFMELD_)?GEHEIM = (.+)\n/
const MAKERS = ['api/nieuwsbrief-verzend.ts', 'api/cron-nieuwsbrief.ts', 'api/nieuwsbrief-herzend.ts', 'api/nieuwsbrief-test.ts']

function sleutel(pad: string): string {
  const m = lees(pad).match(SLEUTEL)
  if (!m) throw new Error(`${pad} mist de afmeldsleutel`)
  return m[1].trim()
}

describe('afmeldlinks in de nieuwsbrief', () => {
  const bron = sleutel('api/nieuwsbrief-afmelden.ts')

  it.each(MAKERS)('%s ondertekent met dezelfde sleutel als de afmeldpagina', (pad) => {
    expect(sleutel(pad)).toBe(bron)
  })

  // Vóór deze fix zette de testmail '#' onder "Uitschrijven": klikken deed niets.
  it('de testmail zet een echte afmeldlink, geen #', () => {
    const inhoud = lees('api/nieuwsbrief-test.ts')
    expect(inhoud).not.toMatch(/RESEND_UNSUBSCRIBE_URL\\\}\\\}\\\}\/g, '#'\)/)
    expect(inhoud).toMatch(/RESEND_UNSUBSCRIBE_URL\\\}\\\}\\\}\/g, afmeldTestUrl\(naar\)\)/)
  })

  // De testlink draagt geen nieuwsbrief-id, dus hij moet alleen het adres
  // ondertekenen: zo rekent de afmeldpagina het token uit als n ontbreekt.
  it('de testlink ondertekent alleen het adres en zet test=1', () => {
    const inhoud = lees('api/nieuwsbrief-test.ts')
    expect(inhoud).toMatch(/createHmac\('sha256', AFMELD_GEHEIM\)\.update\(adres\)/)
    expect(inhoud).toMatch(/nieuwsbrief-afmelden\?e=\$\{encodeURIComponent\(adres\)\}&t=\$\{token\}&test=1/)
  })

  // Anders haalt de afzender zichzelf van de lijst door op zijn testmail te klikken.
  it('in testmodus meldt de afmeldpagina niemand af', () => {
    const inhoud = lees('api/nieuwsbrief-afmelden.ts')
    const post = inhoud.slice(inhoud.indexOf("if (req.method === 'POST')"))
    const testTak = post.indexOf('if (test)')
    const afmelden = post.indexOf('await meldAf(')
    expect(testTak).toBeGreaterThan(-1)
    expect(afmelden).toBeGreaterThan(testTak)
    expect(post.slice(testTak, afmelden)).toMatch(/return res\.status\(200\)/)
  })
})
