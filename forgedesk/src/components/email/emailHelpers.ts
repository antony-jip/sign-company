import type { FontSize } from './emailTypes'

export function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)/)
  return match ? match[1].trim() : from
}

export function extractSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

// Aggressievere variant voor email previews — ruimt ook CSS, style/script
// blokken, html entities en URLs op zodat de preview leesbare proza is.
export function cleanEmailPreview(raw: string): string {
  if (!raw) return ''
  let s = raw
  // Style/script blokken volledig weg
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
  // HTML comments
  s = s.replace(/<!--[\s\S]*?-->/g, ' ')
  // HTML tags
  s = s.replace(/<[^>]*>/g, ' ')
  // CSS regel-blokken die soms nog losgeschreven in de body staan
  s = s.replace(/\{[^{}]*\}/g, ' ')
  // CSS-achtige selectors / declaraties die overblijven (bv. ".foo:hover")
  s = s.replace(/[.#][a-z][\w-]*\s*:\s*[^;]+;?/gi, ' ')
  // URLs vervangen door korte placeholder
  s = s.replace(/https?:\/\/\S+/gi, '[link]')
  // HTML entities
  s = s.replace(/&nbsp;/gi, ' ')
  s = s.replace(/&amp;/gi, '&')
  s = s.replace(/&lt;/gi, '<')
  s = s.replace(/&gt;/gi, '>')
  s = s.replace(/&quot;/gi, '"')
  s = s.replace(/&#39;|&apos;/gi, "'")
  // Numerieke entities (bv &#8217;)
  s = s.replace(/&#\d+;/g, ' ')
  s = s.replace(/&[a-z]+;/gi, ' ')
  // Witregels en tabs naar spaties, dan multiple spaces collapsen
  s = s.replace(/[\r\n\t]+/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

const avatarColorCache = new Map<string, string>()
const AVATAR_COLORS = [
  'bg-primary', 'bg-emerald-500', 'bg-[#4A442D]', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-accent', 'bg-pink-500',
  'bg-teal-500', 'bg-orange-500',
]

export function getAvatarColor(name: string): string {
  const cached = avatarColorCache.get(name)
  if (cached) return cached
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length]
  avatarColorCache.set(name, color)
  return color
}

const AVATAR_RING_COLORS = [
  'ring-primary/30', 'ring-emerald-300/40', 'ring-amber-300/40', 'ring-amber-400/30',
  'ring-rose-300/40', 'ring-cyan-300/40', 'ring-accent/30', 'ring-pink-300/40',
  'ring-teal-300/40', 'ring-orange-300/40',
]

export function getAvatarRingColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return AVATAR_RING_COLORS[hash % AVATAR_RING_COLORS.length]
}

// DOEN Design System avatar palette
const DOEN_AVATAR_PALETTE = [
  { bg: '#E8F2EC', text: '#3A7D52' },
  { bg: '#E8EEF9', text: '#3A5A9A' },
  { bg: '#F5F2E8', text: '#8A7A4A' },
  { bg: '#F0EFEC', text: '#6B6B66' },
  { bg: '#EDE8F4', text: '#6A5A8A' },
]

const avatarStyleCache = new Map<string, { bg: string; text: string }>()

export function getAvatarStyle(name: string): { bg: string; text: string } {
  const cached = avatarStyleCache.get(name)
  if (cached) return cached
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  const style = DOEN_AVATAR_PALETTE[hash % DOEN_AVATAR_PALETTE.length]
  avatarStyleCache.set(name, style)
  return style
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const now = new Date()

  const startOfDay = (d: Date) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }
  const today = startOfDay(now)
  const target = startOfDay(date)
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

  // Toekomst (gepland)
  if (diffDays < 0) {
    if (diffDays === -1) return 'Morgen'
    if (diffDays > -7) return date.toLocaleDateString('nl-NL', { weekday: 'short' })
    if (date.getFullYear() === now.getFullYear()) return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  // Vandaag → tijd HH:MM
  if (diffDays === 0) return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  // Gisteren
  if (diffDays === 1) return 'Gist.'
  // Deze week → korte weekdag (Ma, Di, Wo, ...)
  if (diffDays < 7) {
    return date.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '')
  }
  // Dit jaar → "12 jan"
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }
  // Ouder → "12 jan '24"
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: '2-digit' })
}

export const fontSizeClasses: Record<FontSize, { name: string; subject: string; preview: string; date: string }> = {
  small: { name: 'text-sm', subject: 'text-sm', preview: 'text-xs', date: 'text-xs' },
  medium: { name: 'text-base', subject: 'text-base', preview: 'text-sm', date: 'text-xs' },
  large: { name: 'text-lg', subject: 'text-base', preview: 'text-base', date: 'text-sm' },
}

export const labelColors: Record<string, string> = {
  offerte: 'bg-blue-400',
  klant: 'bg-emerald-400',
  project: 'bg-primary',
  leverancier: 'bg-amber-400',
}

export const IMAP_FOLDER_MAP: Record<string, string> = {
  inbox: 'INBOX',
  verzonden: 'verzonden',
  concepten: 'concepten',
  prullenbak: 'prullenbak',
  gepland: 'gepland',
  gesnoozed: 'INBOX',
}

export const SNOOZE_OPTIONS = [
  { label: 'Over 1 uur', hours: 1 },
  { label: 'Over 3 uur', hours: 3 },
  { label: 'Morgenochtend', hours: -1 },
  { label: 'Volgende week', hours: -2 },
] as const

export const KEYBOARD_SHORTCUTS = [
  { key: 'j', action: 'Volgende email' },
  { key: 'k', action: 'Vorige email' },
  { key: 'o / Enter', action: 'Email openen' },
  { key: 'r', action: 'Beantwoorden' },
  { key: 'f', action: 'Doorsturen' },
  { key: 'e', action: 'Archiveren' },
  { key: '#', action: 'Verwijderen' },
  { key: 's', action: 'Ster aan/uit' },
  { key: 'p', action: 'Vastpinnen' },
  { key: 'z', action: 'Snooze menu' },
  { key: 'c', action: 'Nieuwe email' },
  { key: 'Esc', action: 'Terug naar lijst' },
  { key: '?', action: 'Sneltoetsen tonen' },
] as const

/** Parse search query with operators like from:, to:, has:, label:, before:, after: */
export function parseSearchQuery(query: string): {
  text: string
  operators: Record<string, string>
} {
  const operators: Record<string, string> = {}
  const operatorRegex = /\b(from|to|has|label|before|after|subject):(\S+)/gi
  let match: RegExpExecArray | null
  let text = query

  while ((match = operatorRegex.exec(query)) !== null) {
    operators[match[1].toLowerCase()] = match[2]
    text = text.replace(match[0], '')
  }

  return { text: text.trim(), operators }
}

export const SEARCH_OPERATORS = [
  { key: 'from:', description: 'Afzender', example: 'from:jan@bedrijf.nl' },
  { key: 'to:', description: 'Ontvanger', example: 'to:klant@email.nl' },
  { key: 'has:', description: 'Heeft', example: 'has:bijlage' },
  { key: 'label:', description: 'Label', example: 'label:offerte' },
  { key: 'before:', description: 'Voor datum', example: 'before:2026-01-01' },
  { key: 'after:', description: 'Na datum', example: 'after:2026-01-01' },
  { key: 'subject:', description: 'Onderwerp', example: 'subject:factuur' },
]

/** Calculate snooze date based on hours option */
export function calculateSnoozeDate(hours: number): Date {
  const now = new Date()
  if (hours === -1) {
    // Tomorrow morning 9:00
    const date = new Date(now)
    date.setDate(date.getDate() + 1)
    date.setHours(9, 0, 0, 0)
    return date
  }
  if (hours === -2) {
    // Next Monday 9:00
    const date = new Date(now)
    const dayOfWeek = date.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    date.setDate(date.getDate() + daysUntilMonday)
    date.setHours(9, 0, 0, 0)
    return date
  }
  return new Date(now.getTime() + hours * 60 * 60 * 1000)
}
