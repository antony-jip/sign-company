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

export function getAvatarColor(name: string): string {
  const colors = [
    'bg-primary', 'bg-emerald-500', 'bg-[#4A442D]', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-accent', 'bg-pink-500',
    'bg-teal-500', 'bg-orange-500',
  ]
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return colors[index]
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) {
    const futureDays = Math.ceil(-diffMs / (1000 * 60 * 60 * 24))
    if (futureDays === 0) return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    if (futureDays === 1) return `Morgen ${date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
    return date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
  }

  if (diffDays === 0) return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Gisteren'
  if (diffDays < 7) return date.toLocaleDateString('nl-NL', { weekday: 'short' })
  return date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
}

export const fontSizeClasses: Record<FontSize, { name: string; subject: string; preview: string; date: string }> = {
  small: { name: 'text-xs', subject: 'text-xs', preview: 'text-[11px]', date: 'text-[10px]' },
  medium: { name: 'text-sm', subject: 'text-[13px]', preview: 'text-xs', date: 'text-[11px]' },
  large: { name: 'text-base', subject: 'text-sm', preview: 'text-[13px]', date: 'text-xs' },
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
