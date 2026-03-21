import { useMemo } from 'react'
import { cn } from '@/lib/utils'

export type DagenOpenFilter = 'alle' | '<7' | '7-14' | '14-30' | '>30'

const DAGEN_OPTIES: { value: DagenOpenFilter; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: '<7', label: '< 7 dagen' },
  { value: '7-14', label: '7–14 dagen' },
  { value: '14-30', label: '14–30 dagen' },
  { value: '>30', label: '> 30 dagen' },
]

export function getDaysOpen(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export function matchDagenFilter(days: number, filter: DagenOpenFilter): boolean {
  switch (filter) {
    case '<7': return days < 7
    case '7-14': return days >= 7 && days <= 14
    case '14-30': return days > 14 && days <= 30
    case '>30': return days > 30
    default: return true
  }
}

export function getDaysColor(days: number): string {
  if (days <= 3) return 'text-emerald-700 bg-emerald-50/80'
  if (days <= 7) return 'text-amber-700 bg-amber-50/80'
  if (days <= 14) return 'text-orange-700 bg-orange-50/80'
  if (days <= 30) return 'text-red-600 bg-red-50/80'
  return 'text-red-800 bg-red-100/80'
}

interface DagenOpenFilterBarProps {
  value: DagenOpenFilter
  onChange: (value: DagenOpenFilter) => void
  /** Items to count — pass only items with "open" statuses */
  items: { dateField: string }[]
}

export function DagenOpenFilterBar({ value, onChange, items }: DagenOpenFilterBarProps) {
  const counts = useMemo(() => {
    const result: Record<DagenOpenFilter, number> = { alle: 0, '<7': 0, '7-14': 0, '14-30': 0, '>30': 0 }
    items.forEach(({ dateField }) => {
      const days = getDaysOpen(dateField)
      result.alle++
      if (days < 7) result['<7']++
      else if (days <= 14) result['7-14']++
      else if (days <= 30) result['14-30']++
      else result['>30']++
    })
    return result
  }, [items])

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
      <span className="text-xs text-muted-foreground/70 mr-0.5 flex-shrink-0 font-medium">Dagen open:</span>
      {DAGEN_OPTIES.map((optie) => {
        const count = counts[optie.value]
        if (optie.value !== 'alle' && count === 0) return null
        return (
          <button
            key={optie.value}
            onClick={() => onChange(optie.value)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 flex-shrink-0 tabular-nums',
              value === optie.value
                ? 'bg-[#191919] text-white shadow-sm'
                : 'text-[#5A5A55] hover:bg-muted/80'
            )}
          >
            {optie.label}
            {count > 0 && <span className="ml-1 opacity-50">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
