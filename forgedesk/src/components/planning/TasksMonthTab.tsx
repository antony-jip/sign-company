import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays as fnsAddDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  format,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Taak } from '@/types'

function deadlineDateKey(deadline: string | undefined): string | null {
  if (!deadline) return null
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return null
  return format(d, 'yyyy-MM-dd')
}

interface TasksMonthTabProps {
  taken: Taak[]
  myName: string
  selectedDate: Date
  setSelectedDate: (d: Date) => void
  setActiveTab: (tab: 'dag' | 'maand') => void
}

export function TasksMonthTab({ taken, myName, selectedDate, setSelectedDate, setActiveTab }: TasksMonthTabProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate))
  const today = new Date()

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 })
    return Array.from({ length: 42 }, (_, i) => fnsAddDays(start, i))
  }, [visibleMonth])

  const perDayCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of taken) {
      if (t.toegewezen_aan !== myName) continue
      const key = deadlineDateKey(t.deadline)
      if (!key) continue
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [taken, myName])

  const monthOpenCount = useMemo(() => {
    return taken.filter((t) => {
      if (t.toegewezen_aan !== myName) return false
      if (t.status === 'klaar') return false
      if (!t.deadline) return false
      const d = new Date(t.deadline)
      return isSameMonth(d, visibleMonth)
    }).length
  }, [taken, myName, visibleMonth])

  const monthLabel = format(visibleMonth, 'LLLL yyyy', { locale: nl })

  return (
    <>
      <header className="px-5 pt-5 pb-4 bg-white border-b border-border">
        <h1 className="text-[28px] font-medium tracking-[-0.02em] leading-tight text-foreground">
          Taken<span className="text-[#F15025]">.</span>
        </h1>
        <p className="mt-1 text-[14px] text-foreground/70 capitalize">{monthLabel}</p>
        {monthOpenCount > 0 && (
          <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">{monthOpenCount} open deze maand</p>
        )}
      </header>

      <div className="px-5 py-3 flex items-center gap-2 bg-white border-b border-border">
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
          aria-label="Vorige maand"
          className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-muted text-foreground/70 hover:bg-muted hover:text-[#1A535C] active:scale-95 transition-all flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
          aria-label="Volgende maand"
          className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-muted text-foreground/70 hover:bg-muted hover:text-[#1A535C] active:scale-95 transition-all flex-shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-7 px-3 pt-3 pb-1">
          {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((d) => (
            <div
              key={d}
              className="text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 px-3 pb-4">
          {gridDays.map((day) => {
            const inMonth = isSameMonth(day, visibleMonth)
            const isTodayCell = isSameDay(day, today)
            const count = inMonth ? perDayCounts.get(format(day, 'yyyy-MM-dd')) ?? 0 : 0
            const dotCount = count >= 5 ? 3 : count >= 3 ? 2 : count >= 1 ? 1 : 0

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  setSelectedDate(day)
                  setActiveTab('dag')
                }}
                aria-label={format(day, 'EEEE d MMMM yyyy', { locale: nl })}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center rounded-full transition-colors',
                  isTodayCell
                    ? 'bg-[#F15025] text-white'
                    : inMonth
                      ? 'text-foreground hover:bg-muted/60 active:bg-muted'
                      : 'text-muted-foreground/80 hover:bg-muted/40',
                )}
              >
                <span className="text-[14px] tabular-nums leading-none">{day.getDate()}</span>
                {dotCount > 0 && (
                  <div className="flex gap-0.5 mt-1 h-1">
                    {Array.from({ length: dotCount }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          'h-1 w-1 rounded-full',
                          isTodayCell ? 'bg-white' : 'bg-[#F15025]',
                        )}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
