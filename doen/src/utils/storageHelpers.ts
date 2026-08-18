/**
 * Sanitize een user-supplied filename tot een Supabase Storage-veilige key-segment.
 *
 * Supabase Storage accepteert geen spaties of niet-ASCII karakters in keys
 * (StorageApiError: "Invalid key"). Deze helper strip diacritics, vervangt
 * spaties en niet-toegestane chars door underscores, dedupliceert underscores
 * en cap't de lengte. Extensie wordt gepreserveerd in lowercase.
 *
 * Gebruik voor STORAGE-KEYS, niet voor display-namen — bewaar de originele
 * `file.name` apart in de DB (bestandsnaam, titel) voor de UI.
 */
export function sanitizeStorageFilename(naam: string, maxLength = 100): string {
  if (!naam || typeof naam !== 'string') return 'bestand'

  const lastDot = naam.lastIndexOf('.')
  const heeftExtensie = lastDot > 0 && lastDot < naam.length - 1
  const rawBase = heeftExtensie ? naam.slice(0, lastDot) : naam
  const rawExt = heeftExtensie ? naam.slice(lastDot + 1) : ''

  const sanitize = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[­​-‏﻿]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[._-]+|[._-]+$/g, '')

  const ext = sanitize(rawExt).toLowerCase().slice(0, 10)
  let base = sanitize(rawBase)
  if (!base) base = 'bestand'
  if (base.length > maxLength) base = base.slice(0, maxLength)

  return ext ? `${base}.${ext}` : base
}
