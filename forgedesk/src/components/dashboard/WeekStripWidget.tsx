import React, { useState, useEffect, useMemo } from 'react'
import { getMontageAfspraken, getTaken } from '@/services/supabaseService'
import type { MontageAfspraak, Taak } from '@/types'
import { cn } from '@/lib/utils'
import { isToday, addDays, format, startOfDay } from 'date-fns'
import { nl } from 'date-fns/locale'
import { logger } from '../../utils/logger'

const DAG_NAMEN = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

export function WeekStripWidget() {
  const [montages, setMontages] = useState<MontageAfspraak[]>([])
  const [taken, setTaken] = useState<Taak[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getMontageAfspraken(), getTaken()])
      .then(([m, t]) => {
        if (!cancelled) {
          setMontages(m)
          setTaken(t)
        }
      })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const days = useMemo(() => {
    const today = startOfDay(new Date())
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i)
      const dateStr = format(date, 'yyyy-MM-dd')

      const dayMontages = montages.filter(
        m => m.datum === dateStr && m.status !== 'afgerond'
      ).length
      const dayTaken = taken.filter(
        t => t.status !== 'klaar' && t.deadline && t.deadline.startsWith(dateStr)
      ).length

      return {
        date,
        dateStr,
        dayName: DAG_NAMEN[date.getDay()],
        dayNumber: date.getDate(),
        isToday: isToday(date),
        montages: dayMontages,
        taken: dayTaken,
        total: dayMontages + dayTaken,
      }
    })
  }, [montages, taken])

  if (loading) return null

  return (
    <div className="flex items-center gap-1.5">
      {days.map(day => (
        <div
          key={day.dateStr}
          className={cn(
            'flex flex-col items-center gap-1 py-2 px-2.5 rounded-lg flex-1 transition-colors',
            day.isToday
              ? 'bg-primary/10 ring-1 ring-primary/20'
              : 'bg-muted/30 hover:bg-muted/50'
          )}
        >
          <span className={cn(
            'text-2xs font-bold uppercase',
            day.isToday ? 'text-primary' : 'text-muted-foreground'
          )}>
            {day.dayName}
          </span>
          <span className={cn(
            'text-sm font-semibold font-mono',
            day.isToday ? 'text-primary' : 'text-foreground'
          )}>
            {day.dayNumber}
          </span>
          {/* Dots */}
          <div className="flex items-center gap-0.5 h-2.5">
            {day.montages > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title={`${day.montages} montage${day.montages > 1 ? 's' : ''}`} />
            )}
            {day.taken > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" title={`${day.taken} ${day.taken > 1 ? 'taken' : 'taak'}`} />
            )}
            {day.total === 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
