import { describe, it, expect } from 'vitest'
import { sanitizeStorageFilename } from '../../src/utils/storageHelpers'

describe('sanitizeStorageFilename', () => {
  it('vervangt spaties in macOS screenshot-naam (Sentry-case)', () => {
    expect(
      sanitizeStorageFilename('Schermafbeelding 2026-05-29 om 10.23.24.png'),
    ).toBe('Schermafbeelding_2026-05-29_om_10.23.24.png')
  })

  it('strip diacritics en lowercase de extensie', () => {
    expect(sanitizeStorageFilename('café résumé.PDF')).toBe('cafe_resume.pdf')
  })

  it('vervangt emoji + spatie door underscore en trimt leading underscore', () => {
    expect(sanitizeStorageFilename('🎉 party.jpg')).toBe('party.jpg')
  })

  it('valt terug op fallback bij volledig non-ASCII naam', () => {
    expect(sanitizeStorageFilename('中文文件.pdf')).toBe('bestand.pdf')
  })

  it('valt terug op fallback bij alleen emojis (geen extensie)', () => {
    expect(sanitizeStorageFilename('🎉🎉🎉')).toBe('bestand')
  })

  it('behoudt dubbele extensie als punt in base', () => {
    expect(sanitizeStorageFilename('backup.tar.gz')).toBe('backup.tar.gz')
  })

  it('behandelt leading dot (.gitignore) als deel van de naam', () => {
    expect(sanitizeStorageFilename('.gitignore')).toBe('gitignore')
  })

  it('upload werkt zonder extensie', () => {
    expect(sanitizeStorageFilename('noextension')).toBe('noextension')
  })

  it('valt terug op fallback bij lege string', () => {
    expect(sanitizeStorageFilename('')).toBe('bestand')
  })

  it('valt terug op fallback bij whitespace-only', () => {
    expect(sanitizeStorageFilename('   ')).toBe('bestand')
  })

  it('capt lange basis-naam op maxLength', () => {
    const long = 'a'.repeat(200) + '.png'
    const result = sanitizeStorageFilename(long)
    expect(result).toBe('a'.repeat(100) + '.png')
  })

  it('dedupliceert opeenvolgende underscores', () => {
    expect(sanitizeStorageFilename('foo   bar___baz.txt')).toBe('foo_bar_baz.txt')
  })
})
