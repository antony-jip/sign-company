import React, { useMemo } from 'react'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
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
import type { CalendarEvent } from '@/types'

interface WeekViewProps {
  currentDate: Date
  selectedDate: Date | null
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
}

const HOUR_START = 8
const HOUR_END = 20
const HOUR_HEIGHT = 60 // pixels per hour
const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

function getEventColor(type: CalendarEvent['type']): string {
  switch (type) {
    case 'meeting':
      return 'bg-blue-500/90 border-blue-600 text-white'
    case 'deadline':
      return 'bg-red-500/90 border-red-600 text-white'
    case 'herinnering':
      return 'bg-yellow-500/90 border-yellow-600 text-white'
    case 'persoonlijk':
      return 'bg-green-500/90 border-green-600 text-white'
    default:
      return 'bg-muted-foreground/90 border-border text-white'
  }
}

function getEventPosition(event: CalendarEvent) {
  const start = parseISO(event.start_datum)
  const end = parseISO(event.eind_datum)
  const startHour = getHours(start)
  const startMin = getMinutes(start)
  const durationMin = Math.max(differenceInMinutes(end, start), 30) // minimum 30 min display

  const top = (Math.max(startHour - HOUR_START, 0) * 60 + startMin) * (HOUR_HEIGHT / 60)
  const height = Math.min(
    durationMin * (HOUR_HEIGHT / 60),
    (HOUR_END - HOUR_START) * HOUR_HEIGHT - top
  )

  return { top, height: Math.max(height, 24) }
}

function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((event) => {
    const eventStart = parseISO(event.start_datum)
    return isSameDay(eventStart, day)
  })
}

export function WeekView({ currentDate, selectedDate, events, onSelectDate }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Current time indicator
  const now = new Date()
  const nowHour = getHours(now)
  const nowMin = getMinutes(now)
  const currentTimeTop = nowHour >= HOUR_START && nowHour < HOUR_END
    ? (nowHour - HOUR_START) * HOUR_HEIGHT + (nowMin / 60) * HOUR_HEIGHT
    : -1

  const isCurrentWeek = weekDays.some((d) => isToday(d))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex border-b flex-shrink-0">
        <div className="w-16 flex-shrink-0" />
        {weekDays.map((day) => {
          const isTodayDate = isToday(day)
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                'flex-1 text-center py-3 cursor-pointer border-r transition-colors',
                isTodayDate && 'bg-blue-50 dark:bg-blue-900/20',
                isSelected && !isTodayDate && 'bg-muted/50'
              )}
            >
              <p className="text-xs text-muted-foreground uppercase font-medium">
                {format(day, 'EEE', { locale: nl })}
              </p>
              <p
                className={cn(
                  'text-lg font-semibold mt-0.5',
                  isTodayDate && 'text-blue-600 dark:text-blue-400',
                  !isTodayDate && 'text-foreground'
                )}
              >
                {format(day, 'd')}
              </p>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex relative" style={{ height: (HOUR_END - HOUR_START) * HOUR_HEIGHT }}>
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-3"
                style={{ top: (hour - HOUR_START) * HOUR_HEIGHT - 8 }}
              >
                <span className="text-xs text-muted-foreground">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(events, day)
            const isTodayDate = isToday(day)

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex-1 relative border-r',
                  isTodayDate && 'bg-blue-50/30 dark:bg-blue-900/10'
                )}
              >
                {/* Hour lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border dark:border-border"
                    style={{ top: (hour - HOUR_START) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Events */}
                {dayEvents.map((event) => {
                  const { top, height } = getEventPosition(event)
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'absolute left-0.5 right-1 rounded-lg px-2 py-1 border-l-3 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity z-10',
                        getEventColor(event.type)
                      )}
                      style={{ top, height, borderLeftWidth: 3 }}
                      title={`${event.titel}\n${format(parseISO(event.start_datum), 'HH:mm')} - ${format(parseISO(event.eind_datum), 'HH:mm')}`}
                    >
                      <p className="text-xs font-semibold truncate leading-tight">
                        {event.titel}
                      </p>
                      {height > 30 && (
                        <p className="text-[10px] opacity-90 mt-0.5">
                          {format(parseISO(event.start_datum), 'HH:mm')} - {format(parseISO(event.eind_datum), 'HH:mm')}
                        </p>
                      )}
                    </div>
                  )
                })}

                {/* Current time indicator */}
                {isTodayDate && isCurrentWeek && currentTimeTop >= 0 && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: currentTimeTop }}
                  >
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
