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
    actief: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    inactief: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400',
    prospect: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    gepland: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    'in-review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    afgerond: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    'on-hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    'te-factureren': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    concept: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400',
    verzonden: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    bekeken: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    goedgekeurd: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    afgewezen: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    todo: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400',
    bezig: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    klaar: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    definitief: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    gearchiveerd: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400',
  }
  return colors[status] || 'bg-stone-100 text-stone-700'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    laag: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    hoog: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    kritiek: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  }
  return colors[priority] || 'bg-stone-100 text-stone-700'
}
