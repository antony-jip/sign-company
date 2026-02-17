import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
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
    actief: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    inactief: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    prospect: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    gepland: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'in-review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    afgerond: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'on-hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    concept: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    verzonden: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    bekeken: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    goedgekeurd: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    afgewezen: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    bezig: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    klaar: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    definitief: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    gearchiveerd: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    laag: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    hoog: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    kritiek: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  }
  return colors[priority] || 'bg-gray-100 text-gray-800'
}
