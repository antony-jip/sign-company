import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// De toegang tot een gedeeld postvak is een beveiligingsgrens: een collega mag
// bij een postvak dat op naam van iemand anders staat, maar alleen als dat
// postvak gedeeld is én bij dezelfde organisatie hoort. Die regel staat met de
// hand gekopieerd in zeven api-bestanden, want api/* mag niets uit src/
// importeren. Deze test bewaakt dat ze niet uit elkaar lopen: één kopie die de
// org-controle verliest, geeft een collega toegang tot een privé-mailbox.

const WORTEL = fileURLToPath(new URL('../..', import.meta.url))
const BEGIN = '// ── GEDEELD-POSTVAK-TOEGANG BEGIN ──'
const EINDE = '// ── GEDEELD-POSTVAK-TOEGANG EINDE ──'

const BESTANDEN = [
  'api/fetch-emails.ts',
  'api/read-email.ts',
  'api/send-email.ts',
  'api/prefetch-email-bodies.ts',
  'api/email-imap-action.ts',
  'api/backfill-emails.ts',
  'api/cron-verzend-geplande-berichten.ts',
]

function blok(pad: string): string {
  const inhoud = readFileSync(`${WORTEL}/${pad}`, 'utf8')
  const van = inhoud.indexOf(BEGIN)
  const tot = inhoud.indexOf(EINDE)
  if (van === -1 || tot === -1) throw new Error(`${pad} mist het gedeeld-postvak-blok`)
  return inhoud.slice(van + BEGIN.length, tot).trim()
}

describe('toegang tot een gedeeld postvak loopt overal gelijk', () => {
  const bron = blok('api/fetch-emails.ts')

  it('is niet leeg', () => {
    expect(bron.length).toBeGreaterThan(400)
  })

  it.each(BESTANDEN)('%s heeft exact hetzelfde blok', (pad) => {
    expect(blok(pad)).toBe(bron)
  })

  // Deze is belangrijker dan hij lijkt. De vorige versie vergeleek alleen de
  // tekst van het blok, en toen ontbrak in send-email de aanroep terwijl de
  // definitie er wel stond: zeven definities, zes controles. Precies in het
  // bestand waar mail namens iemand anders de deur uit gaat.
  it.each(BESTANDEN)('%s roept de poort ook echt aan', (pad) => {
    const inhoud = readFileSync(`${WORTEL}/${pad}`, 'utf8')
    const naBlok = inhoud.slice(inhoud.indexOf(EINDE))
    expect(naBlok).toMatch(/await magBijPostvak\(/)
  })

  it.each(BESTANDEN)('%s weigert zodra de poort nee zegt', (pad) => {
    const inhoud = readFileSync(`${WORTEL}/${pad}`, 'utf8')
    // De aanroep moet een weigering zijn, geen logregel: !(await ...) gevolgd
    // door een throw of een return van null.
    expect(inhoud).toMatch(/!\(await magBijPostvak\(/)
  })

  it.each(BESTANDEN)('%s eist gedeeld én dezelfde organisatie', (pad) => {
    const b = blok(pad)
    // Eigen rij mag altijd.
    expect(b).toContain('rij.user_id === userId')
    // Van een ander alleen als hij gedeeld is.
    expect(b).toContain("rij.soort !== 'gedeeld'")
    // En alleen binnen je eigen organisatie.
    expect(b).toContain('organisatie_id')
    expect(b).toContain('eigenOrg === rij.organisatie_id')
  })
})
