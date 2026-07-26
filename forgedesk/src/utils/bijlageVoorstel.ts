import type { Project } from '@/types'

/**
 * Voorstellen bij "Aan project toevoegen" vanuit een mailbijlage.
 *
 * Bewust deterministisch: klant + projecten + extensie zijn genoeg om dit
 * af te leiden, dus geen AI-call. Alles hier is een voorstel dat de
 * gebruiker nog bevestigt; bij twijfel geven we liever niets terug dan een
 * gok, want een bestand bij de verkeerde klant is erger dan een extra klik.
 */

/** Mappen zoals de documentenmodule ze aanbiedt bij handmatige upload. */
export const DOCUMENT_MAPPEN = [
  'Ontwerpen',
  'Technisch',
  'Offertes',
  'Contracten',
  'Branding',
  'Planning',
  "Foto's",
] as const

/** Map waar mailbijlagen tot nu toe altijd in landden; blijft de terugval. */
export const MAP_BIJLAGEN = 'Bijlagen'

const ONTWERP_EXTENSIES = new Set(['ai', 'eps', 'pdf', 'svg', 'cdr'])
const FOTO_EXTENSIES = new Set(['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'])

const ONTWERP_TYPES = new Set([
  'application/pdf',
  'application/postscript',
  'application/illustrator',
  'image/svg+xml',
  'image/vnd.adobe.photoshop',
])

export function bestandsExtensie(bestandsnaam: string): string {
  const punt = bestandsnaam.lastIndexOf('.')
  if (punt <= 0 || punt === bestandsnaam.length - 1) return ''
  return bestandsnaam.slice(punt + 1).toLowerCase()
}

/**
 * Welke map past bij dit bestand? Bij een signbedrijf is .ai/.eps/.pdf/.svg/.cdr
 * een aanlevering of ontwerp, terwijl .jpg/.png meestal een situatiefoto is.
 * Alles wat we niet herkennen houdt de bestaande map.
 */
export function stelMapVoor(bestandsnaam: string, contentType?: string): string {
  const ext = bestandsExtensie(bestandsnaam)
  if (ext) {
    if (ONTWERP_EXTENSIES.has(ext)) return 'Ontwerpen'
    if (FOTO_EXTENSIES.has(ext)) return "Foto's"
    return MAP_BIJLAGEN
  }
  const type = (contentType || '').toLowerCase().split(';')[0].trim()
  if (!type) return MAP_BIJLAGEN
  if (ONTWERP_TYPES.has(type)) return 'Ontwerpen'
  if (type.startsWith('image/')) return "Foto's"
  return MAP_BIJLAGEN
}

// Een afgerond of gefactureerd project stellen we niet uit onszelf voor:
// daar hoort zelden nog een aanlevering bij. Zichtbaar blijft het wel.
const AFGESLOTEN_STATUSSEN: ReadonlySet<Project['status']> = new Set(['afgerond', 'gefactureerd'])

export function isLopendProject(project: Project): boolean {
  return !AFGESLOTEN_STATUSSEN.has(project.status)
}

/**
 * Eén lopend project van deze klant is een voorstel. Meerdere is een keuze,
 * en die maakt de gebruiker zelf; we zetten ze dan alleen bovenaan.
 */
export function kiesVoorgesteldProject(projecten: Project[]): Project | null {
  const lopend = projecten.filter(isLopendProject)
  return lopend.length === 1 ? lopend[0] : null
}
