import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Check, Plus, CalendarCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { getTaken, getMedewerkers, updateTaak } from '@/services/supabaseService'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { Taak, Medewerker } from '@/types'
import { TaakNieuwSheet } from './TaakNieuwSheet'

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

function formatDayLabel(d: Date): string {
  const today = startOfDay(new Date())
  const target = startOfDay(d)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  const longDate = d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
  if (diff === 0) return `Vandaag · ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`
  if (diff === -1) return `Gisteren · ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`
  if (diff === 1) return `Morgen · ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`
  return longDate.charAt(0).toUpperCase() + longDate.slice(1)
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

export function TasksLayoutMobile() {
  const { user } = useAuth()
  const [taken, setTaken] = useState<Taak[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTaken(), getMedewerkers()])
      .then(([t, m]) => { setTaken(t); setMedewerkers(m) })
      .catch((err) => {
        logger.error('TasksLayoutMobile load failed', err)
        toast.error('Kon taken niet laden')
      })
      .finally(() => setLoading(false))
  }, [])

  const currentMedewerker = useMemo(() => {
    if (!user) return null
    return medewerkers.find((m) => m.user_id === user.id)
      || medewerkers.find((m) => m.email?.toLowerCase() === user.email?.toLowerCase())
      || null
  }, [medewerkers, user])

  const myName = currentMedewerker?.naam || ''

  const tasksForDay = useMemo(() => {
    return taken
      .filter((t) => t.toegewezen_aan === myName)
      .filter((t) => deadlineMatchesDate(t.deadline, selectedDate))
      .sort((a, b) => sortKey(a.deadline) - sortKey(b.deadline))
  }, [taken, myName, selectedDate])

  const openCount = tasksForDay.filter((t) => t.status !== 'klaar').length
  const isToday = startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime()

  async function toggleTask(t: Taak) {
    const newStatus: Taak['status'] = t.status === 'klaar' ? 'todo' : 'klaar'
    setTaken((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: newStatus } : x)))
    try {
      await updateTaak(t.id, { status: newStatus })
    } catch (err) {
      logger.error('updateTaak failed', err)
      toast.error('Kon status niet bijwerken')
      setTaken((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)))
    }
  }

  function handleCreated(created: Taak) {
    setTaken((prev) => [created, ...prev])
  }

  return (
    <div className="h-full flex flex-col bg-[#F8F7F5] -m-3 sm:-m-4 md:-m-6">
      <header className="px-5 pt-6 pb-4 bg-white border-b border-[#EBEBEB]">
        <h1 className="text-[28px] font-bold tracking-[-0.3px] leading-tight text-[#1A1A1A]">
          Taken<span className="text-[#F15025]">.</span>
        </h1>
        <p className="mt-1.5 text-[13px] text-[#9B9B95]">
          {formatDayLabel(selectedDate)}
          {tasksForDay.length > 0 && (
            <>
              {' · '}
              <span className="text-[#6B6B66] font-medium tabular-nums">{openCount}</span>
              {' open'}
            </>
          )}
        </p>
      </header>

      <div className="px-3 py-2 flex items-center gap-1 bg-white border-b border-[#EBEBEB]">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          aria-label="Vorige dag"
          className="h-10 w-10 inline-flex items-center justify-center text-[#9B9B95] hover:text-[#1A535C] active:bg-[#F0EFEC]/60 rounded-full transition-colors flex-shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
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
          className="h-10 w-10 inline-flex items-center justify-center text-[#9B9B95] hover:text-[#1A535C] active:bg-[#F0EFEC]/60 rounded-full transition-colors flex-shrink-0"
        >
          <ChevronRight className="h-5 w-5" />
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
                      'h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0',
                      isDone
                        ? 'bg-[#F15025] border-[#F15025] text-white'
                        : 'bg-white border-[#D4D2CE] hover:border-[#1A535C] active:scale-95',
                    )}
                  >
                    <Check
                      className={cn(
                        'h-3.5 w-3.5 transition-all duration-200',
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
                        isDone ? 'text-[#B0ADA8] opacity-50' : 'text-[#9B9B95]',
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

      {createPortal(
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="md:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 h-12 flex items-center justify-center gap-2 text-[14px] font-semibold text-white bg-[#F15025]/85 hover:bg-[#F15025] backdrop-blur-md shadow-[0_-2px_8px_rgba(0,0,0,0.08)] transition-colors duration-150"
        >
          <Plus className="h-4 w-4" />
          Nieuwe taak
        </button>,
        document.body,
      )}

      <TaakNieuwSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultDate={selectedDate}
        toegewezenAan={myName}
        onCreated={handleCreated}
      />
    </div>
  )
}
