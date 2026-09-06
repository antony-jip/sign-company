import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// De upsert-ladder staat met de hand gekopieerd in elf bestanden: api/* mag
// niets uit src/ importeren (CLAUDE.md §2). Toen `isOnbekendeSleutel` alleen
// 42703 en 42P10 kende en de rest van de codebase al PGRST204 gebruikte, stond
// de hele mailsync stil op een database zonder migratie 245 — en niets merkte
// het. Deze test is die poort.
//
// PostgREST geeft drie verschillende codes voor "die kolom of sleutel bestaat
// niet": 42703 bij een select, PGRST204 als de kolom in de lading van een
// insert of upsert staat, en 42P10 als er bij de opgegeven onConflict-kolommen
// geen unieke index te vinden is. Alle drie horen in elke kopie.

const WORTEL = fileURLToPath(new URL('../..', import.meta.url))

const BESTANDEN = [
  'api/fetch-emails.ts',
  'api/backfill-emails.ts',
  'api/read-email.ts',
  'api/email-imap-action.ts',
  'api/send-email.ts',
  'api/mail-oauth-callback.ts',
  'api/mail-oauth-token.ts',
  'api/prefetch-email-bodies.ts',
  'api/email-settings.ts',
  'api/test-email-connection.ts',
  'src/trigger/mail-idle.ts',
]

/** Het lichaam van isOnbekendeSleutel, met de naam van de parameter genormaliseerd. */
function ladderLichaam(pad: string): string {
  const inhoud = readFileSync(`${WORTEL}/${pad}`, 'utf8')
  const van = inhoud.indexOf('function isOnbekendeSleutel(')
  if (van === -1) throw new Error(`${pad} mist isOnbekendeSleutel`)
  const open = inhoud.indexOf('{', inhoud.indexOf(')', van))
  let diepte = 0
  let tot = open
  for (let i = open; i < inhoud.length; i++) {
    if (inhoud[i] === '{') diepte++
    if (inhoud[i] === '}') { diepte--; if (diepte === 0) { tot = i; break } }
  }
  return inhoud
    .slice(open + 1, tot)
    // de ene kopie noemt de parameter `fout`, de andere `error`
    .replace(/\berror\b/g, 'fout')
    // en de ene mag null zijn, de andere niet
    .replace(/\s*if \(!fout\) return false\s*/, '')
    .replace(/ \|\| ''/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('de upsert-ladder loopt in alle kopieën gelijk', () => {
  const bron = ladderLichaam('api/fetch-emails.ts')

  it.each(BESTANDEN)('%s herkent alle drie de foutcodes', (pad) => {
    const lichaam = ladderLichaam(pad)
    expect(lichaam).toContain("'42703'")
    expect(lichaam).toContain("'42P10'")
    expect(lichaam).toContain("'PGRST204'")
  })

  it.each(BESTANDEN)('%s heeft exact dezelfde ladder', (pad) => {
    expect(ladderLichaam(pad)).toBe(bron)
  })
})
