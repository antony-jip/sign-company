import React from 'react'
import {
  isSameDay,
  isToday,
  format,
  parseISO,
  getHours,
  getMinutes,
  differenceInMinutes,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { MapPin, Users } from 'lucide-react'
import type { CalendarEvent } from '@/types'

interface DayViewProps {
  currentDate: Date
  events: CalendarEvent[]
}

const HOUR_START = 8
const HOUR_END = 20
const HOUR_HEIGHT = 80 // taller for more detail
const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

function getEventStyle(type: CalendarEvent['type']): React.CSSProperties {
  switch (type) {
    case 'deadline':
      // semantisch: deadline blijft rood (urgent)
      return { backgroundColor: 'rgba(241,80,37,0.09)', borderLeftColor: '#F15025', color: '#C03A18' }
    default:
      return { backgroundColor: 'rgba(26,83,92,0.07)', borderLeftColor: '#1A535C', color: '#1A535C' }
  }
}

function getEventTypeName(type: CalendarEvent['type']): string {
  switch (type) {
    case 'meeting': return 'Vergadering'
    case 'deadline': return 'Deadline'
    case 'herinnering': return 'Herinnering'
    case 'persoonlijk': return 'Persoonlijk'
    default: return type
  }
}

function getEventPosition(event: CalendarEvent) {
  const start = parseISO(event.start_datum)
  const end = parseISO(event.eind_datum)
  const startHour = getHours(start)
  const startMin = getMinutes(start)
  const durationMin = Math.max(differenceInMinutes(end, start), 30)

  const top = (Math.max(startHour - HOUR_START, 0) * 60 + startMin) * (HOUR_HEIGHT / 60)
  const height = Math.min(
    durationMin * (HOUR_HEIGHT / 60),
    (HOUR_END - HOUR_START) * HOUR_HEIGHT - top
  )

  return { top, height: Math.max(height, 40) }
}

export function DayView({ currentDate, events }: DayViewProps) {
  const dayEvents = events.filter((event) => {
    const eventStart = parseISO(event.start_datum)
    return isSameDay(eventStart, currentDate)
  })

  const isTodayDate = isToday(currentDate)

  // Current time indicator
  const now = new Date()
  const nowHour = getHours(now)
  const nowMin = getMinutes(now)
  const currentTimeTop = isTodayDate && nowHour >= HOUR_START && nowHour < HOUR_END
    ? (nowHour - HOUR_START) * HOUR_HEIGHT + (nowMin / 60) * HOUR_HEIGHT
    : -1

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b py-4 px-6 flex-shrink-0">
        <h2 className="text-lg font-semibold text-[#1A4A52] dark:text-foreground">
          {format(currentDate, 'EEEE d MMMM yyyy', { locale: nl })}
        </h2>
        {isTodayDate && (
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-0.5">Vandaag</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          {dayEvents.length === 0
            ? 'Geen evenementen gepland'
            : `${dayEvents.length} evenement${dayEvents.length > 1 ? 'en' : ''}`}
        </p>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex relative" style={{ height: (HOUR_END - HOUR_START) * HOUR_HEIGHT }}>
          {/* Time labels */}
          <div className="w-20 flex-shrink-0 relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-4"
                style={{ top: (hour - HOUR_START) * HOUR_HEIGHT - 8 }}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className={cn('flex-1 relative border-l', isTodayDate && 'bg-blue-50/20 dark:bg-blue-900/5')}>
            {/* Hour lines */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-border dark:border-border"
                style={{ top: (hour - HOUR_START) * HOUR_HEIGHT }}
              >
                {/* Half hour line */}
                <div
                  className="absolute w-full border-t border-dashed border-border dark:border-border/50"
                  style={{ top: HOUR_HEIGHT / 2 }}
                />
              </div>
            ))}

            {/* Events */}
            {dayEvents.map((event) => {
              const { top, height } = getEventPosition(event)
              const start = parseISO(event.start_datum)
              const end = parseISO(event.eind_datum)

              return (
                <div
                  key={event.id}
                  className="absolute left-2 right-4 rounded-none px-4 py-2 border-l-4 overflow-hidden cursor-pointer hover:opacity-95 transition-opacity shadow-[0_1px_2px_rgba(0,0,0,0.04)] z-10"
                  style={{ top, height, borderLeftWidth: 4, ...getEventStyle(event.type) }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{event.titel}</p>
                      <p className="text-xs opacity-90 mt-0.5">
                        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                        {' '}&middot;{' '}
                        {getEventTypeName(event.type)}
                      </p>
                    </div>
                  </div>

                  {height > 60 && (
                    <div className="mt-2 space-y-1">
                      {event.locatie && (
                        <div className="flex items-center gap-1.5 text-xs opacity-85">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.locatie}</span>
                        </div>
                      )}
                      {event.deelnemers.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs opacity-85">
                          <Users className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.deelnemers.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {height > 100 && event.beschrijving && (
                    <p className="text-xs opacity-75 mt-2 line-clamp-2">
                      {event.beschrijving}
                    </p>
                  )}
                </div>
              )
            })}

            {/* Current time indicator */}
            {currentTimeTop >= 0 && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: currentTimeTop }}
              >
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
                  <div className="flex-1 h-0.5 bg-red-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
