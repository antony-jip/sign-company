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
    // Green — goedgekeurd/betaald/afgerond
    actief: 'bg-[#E8F5EC] text-[#4A9960] dark:bg-[#162018] dark:text-[#6ACA80]',
    betaald: 'bg-[#E8F5EC] text-[#4A9960] dark:bg-[#162018] dark:text-[#6ACA80]',
    goedgekeurd: 'bg-[#E8F5EC] text-[#4A9960] dark:bg-[#162018] dark:text-[#6ACA80]',
    afgerond: 'bg-[#E8F5EC] text-[#4A9960] dark:bg-[#162018] dark:text-[#6ACA80]',
    klaar: 'bg-[#E8F5EC] text-[#4A9960] dark:bg-[#162018] dark:text-[#6ACA80]',
    definitief: 'bg-[#E8F5EC] text-[#4A9960] dark:bg-[#162018] dark:text-[#6ACA80]',
    gecrediteerd: 'bg-[#E8F5EC] text-[#4A9960] dark:bg-[#162018] dark:text-[#6ACA80]',

    // Gray — concept/inactief
    concept: 'bg-[#F0F0EE] text-[#8A8A8A] dark:bg-[#222220] dark:text-[#8A8A86]',
    inactief: 'bg-[#F0F0EE] text-[#8A8A8A] dark:bg-[#222220] dark:text-[#8A8A86]',
    todo: 'bg-[#F0F0EE] text-[#8A8A8A] dark:bg-[#222220] dark:text-[#8A8A86]',
    gearchiveerd: 'bg-[#F0F0EE] text-[#8A8A8A] dark:bg-[#222220] dark:text-[#8A8A86]',

    // Blue — open/actief
    open: 'bg-[#E8EFF8] text-[#4A7AB5] dark:bg-[#161E28] dark:text-[#6A9AD5]',
    bezig: 'bg-[#E8EFF8] text-[#4A7AB5] dark:bg-[#161E28] dark:text-[#6A9AD5]',
    gepland: 'bg-[#E8EFF8] text-[#4A7AB5] dark:bg-[#161E28] dark:text-[#6A9AD5]',
    ingediend: 'bg-[#E8EFF8] text-[#4A7AB5] dark:bg-[#161E28] dark:text-[#6A9AD5]',

    // Amber — verstuurd/bekeken
    verzonden: 'bg-[#F8F0E0] text-[#B8883A] dark:bg-[#2A2418] dark:text-[#D4A85A]',
    verstuurd: 'bg-[#F8F0E0] text-[#B8883A] dark:bg-[#2A2418] dark:text-[#D4A85A]',
    bekeken: 'bg-[#F8F0E0] text-[#B8883A] dark:bg-[#2A2418] dark:text-[#D4A85A]',
    'in-review': 'bg-[#F8F0E0] text-[#B8883A] dark:bg-[#2A2418] dark:text-[#D4A85A]',
    review: 'bg-[#F8F0E0] text-[#B8883A] dark:bg-[#2A2418] dark:text-[#D4A85A]',
    prospect: 'bg-[#F8F0E0] text-[#B8883A] dark:bg-[#2A2418] dark:text-[#D4A85A]',
    'te-factureren': 'bg-[#F8F0E0] text-[#B8883A] dark:bg-[#2A2418] dark:text-[#D4A85A]',
    gefactureerd: 'bg-[#F8F0E0] text-[#B8883A] dark:bg-[#2A2418] dark:text-[#D4A85A]',

    // Red — verlopen/afgewezen
    afgewezen: 'bg-[#FAE8E6] text-[#C45B4F] dark:bg-[#2A1A18] dark:text-[#DA7B70]',
    geweigerd: 'bg-[#FAE8E6] text-[#C45B4F] dark:bg-[#2A1A18] dark:text-[#DA7B70]',
    'on-hold': 'bg-[#FAE8E6] text-[#C45B4F] dark:bg-[#2A1A18] dark:text-[#DA7B70]',
    vervallen: 'bg-[#FAE8E6] text-[#C45B4F] dark:bg-[#2A1A18] dark:text-[#DA7B70]',
    verlopen: 'bg-[#FAE8E6] text-[#C45B4F] dark:bg-[#2A1A18] dark:text-[#DA7B70]',
  }
  return colors[status] || 'bg-[#F0F0EE] text-[#8A8A8A] dark:bg-[#222220] dark:text-[#8A8A86]'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    laag: 'bg-[#E8F5EC] text-[#4A9960] dark:bg-[#162018] dark:text-[#6ACA80]',
    medium: 'bg-[#F8F0E0] text-[#B8883A] dark:bg-[#2A2418] dark:text-[#D4A85A]',
    hoog: 'bg-[#F8F0E0] text-[#B8883A] dark:bg-[#2A2418] dark:text-[#D4A85A]',
    kritiek: 'bg-[#FAE8E6] text-[#C45B4F] dark:bg-[#2A1A18] dark:text-[#DA7B70]',
  }
  return colors[priority] || 'bg-[#F0F0EE] text-[#8A8A8A] dark:bg-[#222220] dark:text-[#8A8A86]'
}
