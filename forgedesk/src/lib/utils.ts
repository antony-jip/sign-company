import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'EUR', locale: string = 'nl-NL'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
  } catch {
    return '—'
  }
}

export function formatDateTime(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
  } catch {
    return '—'
  }
}

export function getInitials(name: string): string {
  if (!name || !name.trim()) return '?'
  return name.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function truncate(str: string, length: number): string {
  if (length <= 3) return str.length > length ? '...' : str
  return str.length > length ? str.slice(0, length - 3) + '...' : str
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Positief — botanical teal/emerald
    actief: 'bg-wm-pale/25 text-accent dark:bg-accent/20 dark:text-wm-light border border-primary/15',
    betaald: 'bg-wm-pale/25 text-accent dark:bg-accent/20 dark:text-wm-light border border-primary/15',
    goedgekeurd: 'bg-wm-pale/25 text-accent dark:bg-accent/20 dark:text-wm-light border border-primary/15',
    afgerond: 'bg-wm-pale/25 text-accent dark:bg-accent/20 dark:text-wm-light border border-primary/15',
    klaar: 'bg-wm-pale/25 text-accent dark:bg-accent/20 dark:text-wm-light border border-primary/15',
    definitief: 'bg-wm-pale/25 text-accent dark:bg-accent/20 dark:text-wm-light border border-primary/15',

    // Neutraal — warm stone
    concept: 'bg-stone-100/80 text-stone-600 dark:bg-stone-800/50 dark:text-stone-400 border border-stone-200/60 dark:border-stone-700/40',
    inactief: 'bg-stone-100/80 text-stone-600 dark:bg-stone-800/50 dark:text-stone-400 border border-stone-200/60 dark:border-stone-700/40',
    prospect: 'bg-amber-50/80 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30',
    todo: 'bg-stone-100/80 text-stone-600 dark:bg-stone-800/50 dark:text-stone-400 border border-stone-200/60 dark:border-stone-700/40',
    gearchiveerd: 'bg-stone-100/80 text-stone-600 dark:bg-stone-800/50 dark:text-stone-400 border border-stone-200/60 dark:border-stone-700/40',

    // In progress — warm amber/teal
    verzonden: 'bg-sky-50/80 text-sky-700 dark:bg-sky-900/25 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/30',
    bekeken: 'bg-amber-50/80 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30',
    gepland: 'bg-sky-50/80 text-sky-700 dark:bg-sky-900/25 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/30',
    'in-review': 'bg-amber-50/80 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30',
    bezig: 'bg-primary/10 text-accent dark:bg-primary/15 dark:text-wm-light border border-primary/20',
    'te-factureren': 'bg-violet-50/80 text-violet-700 dark:bg-violet-900/25 dark:text-violet-400 border border-violet-200/50 dark:border-violet-800/30',
    ingediend: 'bg-sky-50/80 text-sky-700 dark:bg-sky-900/25 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/30',

    // Negatief — warm terracotta/red
    afgewezen: 'bg-red-50/80 text-red-700 dark:bg-red-900/25 dark:text-red-400 border border-red-200/50 dark:border-red-800/30',
    'on-hold': 'bg-orange-50/80 text-orange-700 dark:bg-orange-900/25 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/30',
    vervallen: 'bg-red-50/80 text-red-700 dark:bg-red-900/25 dark:text-red-400 border border-red-200/50 dark:border-red-800/30',
    verlopen: 'bg-red-50/80 text-red-700 dark:bg-red-900/25 dark:text-red-400 border border-red-200/50 dark:border-red-800/30',

    // Speciaal — botanical accent
    gecrediteerd: 'bg-wm-pale/20 text-accent dark:bg-accent/15 dark:text-wm-pale border border-primary/15',
    gefactureerd: 'bg-violet-50/80 text-violet-700 dark:bg-violet-900/25 dark:text-violet-400 border border-violet-200/50 dark:border-violet-800/30',
    review: 'bg-amber-50/80 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30',
  }
  return colors[status] || 'bg-stone-100/80 text-stone-600 border border-stone-200/60'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    laag: 'bg-wm-pale/25 text-accent dark:bg-accent/20 dark:text-wm-light border border-primary/15',
    medium: 'bg-amber-50/80 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30',
    hoog: 'bg-orange-50/80 text-orange-700 dark:bg-orange-900/25 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/30',
    kritiek: 'bg-red-50/80 text-red-700 dark:bg-red-900/25 dark:text-red-400 border border-red-200/50 dark:border-red-800/30',
  }
  return colors[priority] || 'bg-stone-100/80 text-stone-600 border border-stone-200/60'
}
