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
  } catch (err) {
    return '—'
  }
}

export function formatDateTime(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
  } catch (err) {
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

export { getStatusBadgeClass as getStatusColor, getStatusLabel, getRowAccentClass } from '@/utils/statusColors'

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    laag: 'badge-groen',
    medium: 'badge-blauw',
    hoog: 'badge-flame',
    kritiek: 'badge-flame',
  }
  return colors[priority] || 'badge-grijs'
}
