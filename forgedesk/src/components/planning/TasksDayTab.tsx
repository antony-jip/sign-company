import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Check, CalendarCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Taak } from '@/types'

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function formatFullWeekdayDate(d: Date): string {
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
}

function deadlineMatchesDate(deadline: string | undefined, date: Date): boolean {
  if (!deadline) return false
  const d = new Date(deadline)
  return startOfDay(d).getTime() === startOfDay(date).getTime()
}

function formatTime(deadline?: string): string | null {
  if (!deadline || !deadline.includes('T')) return null
  const [, time] = deadline.split('T')
  return time.slice(0, 5)
}

function sortKey(deadline?: string): number {
  if (!deadline) return -2
  if (!deadline.includes('T')) return -1
  const [, time] = deadline.split('T')
  const [hh, mm] = time.split(':')
  return parseInt(hh, 10) * 60 + parseInt(mm, 10)
}

interface TasksDayTabProps {
  taken: Taak[]
  myName: string
  selectedDate: Date
  setSelectedDate: (d: Date | ((prev: Date) => Date)) => void
  toggleTask: (t: Taak) => void
  loading: boolean
}

export function TasksDayTab({ taken, myName, selectedDate, setSelectedDate, toggleTask, loading }: TasksDayTabProps) {
  const tasksForDay = useMemo(() => {
    return taken
      .filter((t) => t.toegewezen_aan === myName)
      .filter((t) => deadlineMatchesDate(t.deadline, selectedDate))
      .sort((a, b) => sortKey(a.deadline) - sortKey(b.deadline))
  }, [taken, myName, selectedDate])

  const openCount = tasksForDay.filter((t) => t.status !== 'klaar').length
  const isToday = startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime()

  return (
    <>
      <header className="px-5 pt-5 pb-4 bg-white border-b border-[#EBEBEB]">
        <h1 className="text-[28px] font-medium tracking-[-0.02em] leading-tight text-[#1A1A1A]">
          Taken<span className="text-[#F15025]">.</span>
        </h1>
        <p className="mt-1 text-[14px] text-[#6B6B66] capitalize">
          {formatFullWeekdayDate(selectedDate)}
        </p>
        {tasksForDay.length > 0 && (
          <p className="mt-0.5 text-[13px] text-[#9B9B95] tabular-nums">{openCount} open</p>
        )}
      </header>

      <div className="px-5 py-3 flex items-center gap-2 bg-white border-b border-[#EBEBEB]">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          aria-label="Vorige dag"
          className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-[#F0EFEC] text-[#6B6B66] hover:bg-[#E6E5E1] hover:text-[#1A535C] active:scale-95 transition-all flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center">
          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="text-[12px] font-semibold uppercase tracking-wider text-[#1A535C] hover:text-[#0F3C44] transition-colors"
            >
              Vandaag
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          aria-label="Volgende dag"
          className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-[#F0EFEC] text-[#6B6B66] hover:bg-[#E6E5E1] hover:text-[#1A535C] active:scale-95 transition-all flex-shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[#9B9B95]" />
          </div>
        ) : tasksForDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-white border border-[#EBEBEB] flex items-center justify-center mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <CalendarCheck className="h-9 w-9 text-[#B0ADA8]" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-[#6B6B66]">
              Geen taken voor {isToday ? 'vandaag' : 'deze dag'}<span className="text-[#F15025]">.</span>
            </p>
            <p className="mt-1.5 text-[13px] text-[#9B9B95] max-w-[240px] leading-relaxed">
              Tik onderaan op <span className="font-medium text-[#6B6B66]">Nieuwe taak</span> om er een toe te voegen.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#EBEBEB] bg-white">
            {tasksForDay.map((t) => {
              const isDone = t.status === 'klaar'
              const tijd = formatTime(t.deadline)
              return (
                <li
                  key={t.id}
                  className={cn(
                    'px-5 py-3.5 flex items-center gap-3 transition-colors',
                    isDone && 'bg-[#F8F7F5]/60',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(t)}
                    aria-label={isDone ? 'Markeer als open' : 'Markeer als klaar'}
                    className={cn(
                      'h-[22px] w-[22px] rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200 flex-shrink-0',
                      isDone
                        ? 'bg-[#F15025] border-[#F15025] text-white'
                        : 'bg-white border-[#D4D2CE] hover:border-[#1A535C] active:scale-95',
                    )}
                  >
                    <Check
                      className={cn(
                        'h-3 w-3 transition-all duration-200',
                        isDone ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
                      )}
                      strokeWidth={3}
                    />
                  </button>
                  <span
                    className={cn(
                      'flex-1 text-[15px] leading-snug min-w-0 truncate transition-all duration-200',
                      isDone
                        ? 'line-through text-[#9B9B95] opacity-60'
                        : 'text-[#1A1A1A] font-medium',
                    )}
                  >
                    {t.titel}
                  </span>
                  {tijd && (
                    <span
                      className={cn(
                        'text-xs tabular-nums flex-shrink-0 transition-opacity duration-200',
                        isDone ? 'text-[#B0ADA8] opacity-60' : 'text-[#9B9B95]',
                      )}
                    >
                      {tijd}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
