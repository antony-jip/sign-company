import React from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  parseISO,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/types'

interface MonthViewProps {
  currentDate: Date
  selectedDate: Date | null
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
}

const dayHeaders = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

function getEventColor(type: CalendarEvent['type']): string {
  switch (type) {
    case 'meeting':
      return 'bg-blue-500 text-white'
    case 'deadline':
      return 'bg-red-500 text-white'
    case 'herinnering':
      return 'bg-yellow-500 text-white'
    case 'persoonlijk':
      return 'bg-green-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((event) => {
    const eventStart = parseISO(event.start_datum)
    const eventEnd = parseISO(event.eind_datum)
    return isSameDay(eventStart, day) || isSameDay(eventEnd, day) || (day >= eventStart && day <= eventEnd)
  })
}

export function MonthView({ currentDate, selectedDate, events, onSelectDate }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {dayHeaders.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isSelectedDay = selectedDate ? isSameDay(day, selectedDate) : false
          const isTodayDate = isToday(day)
          const dayEvents = getEventsForDay(events, day)
          const maxVisible = 3
          const overflow = dayEvents.length - maxVisible

          return (
            <div
              key={index}
              onClick={() => onSelectDate(day)}
              className={cn(
                'border-b border-r p-1.5 cursor-pointer transition-colors min-h-0 overflow-hidden',
                !isCurrentMonth && 'bg-muted/30',
                isSelectedDay && 'bg-blue-50 dark:bg-blue-900/20',
                'hover:bg-muted/50'
              )}
            >
              <div className="flex items-center justify-center mb-1">
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm',
                    isTodayDate && 'bg-blue-600 text-white font-bold',
                    !isTodayDate && isCurrentMonth && 'text-foreground',
                    !isTodayDate && !isCurrentMonth && 'text-muted-foreground/50',
                    isSelectedDay && !isTodayDate && 'bg-blue-100 dark:bg-blue-800 font-semibold'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              <div className="space-y-0.5">
                {dayEvents.slice(0, maxVisible).map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium truncate leading-tight',
                      getEventColor(event.type)
                    )}
                    title={`${event.titel} - ${format(parseISO(event.start_datum), 'HH:mm')}`}
                  >
                    {event.titel}
                  </div>
                ))}
                {overflow > 0 && (
                  <p className="text-[10px] text-muted-foreground font-medium px-1.5">
                    +{overflow} meer
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
