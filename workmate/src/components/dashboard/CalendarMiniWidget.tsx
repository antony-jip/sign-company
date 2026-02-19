import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, Loader2 } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  getDay,
  parseISO,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { getEvents } from '@/services/supabaseService'
import type { CalendarEvent } from '@/types'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

export function CalendarMiniWidget() {
  const today = new Date()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const { daysInMonth, startOffset, eventDates, upcomingEvents } =
    useMemo(() => {
      const monthStart = startOfMonth(today)
      const monthEnd = endOfMonth(today)
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

      // getDay returns 0 for Sunday; convert to Monday-first (0=Mon, 6=Sun)
      const rawDay = getDay(monthStart)
      const offset = rawDay === 0 ? 6 : rawDay - 1

      // Collect dates that have events
      const dates = new Set<string>()
      events.forEach((event) => {
        const eventDate = parseISO(event.start_datum)
        // Only include events in the current month
        if (
          eventDate.getMonth() === today.getMonth() &&
          eventDate.getFullYear() === today.getFullYear()
        ) {
          dates.add(format(eventDate, 'yyyy-MM-dd'))
        }
      })

      // Upcoming events (from today onwards, sorted, take 3)
      const upcoming = [...events]
        .filter((e) => parseISO(e.start_datum) >= today)
        .sort(
          (a, b) =>
            parseISO(a.start_datum).getTime() -
            parseISO(b.start_datum).getTime()
        )
        .slice(0, 3)

      return {
        daysInMonth: days,
        startOffset: offset,
        eventDates: dates,
        upcomingEvents: upcoming,
      }
    }, [events])

  const monthTitle = format(today, 'MMMM yyyy', { locale: nl })
  // Capitalize first letter
  const formattedMonth =
    monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 shadow-md">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <span>Kalender</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (<>
        {/* Month header */}
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">
          {formattedMonth}
        </p>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {WEEKDAY_LABELS.map((day) => (
            <div
              key={day}
              className="text-[11px] font-medium text-gray-400 dark:text-gray-500 py-1"
            >
              {day}
            </div>
          ))}

          {/* Empty cells for offset */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}

          {/* Day cells */}
          {daysInMonth.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const hasEvent = eventDates.has(dayStr)
            const isTodayDate = isToday(day)

            return (
              <div
                key={dayStr}
                className={cn(
                  'relative flex flex-col items-center justify-center h-8 rounded-md text-sm transition-colors',
                  isTodayDate
                    ? 'bg-gradient-to-br from-[#386150] to-[#58B09C] text-white font-bold shadow-sm'
                    : 'text-foreground/80 hover:bg-muted/60'
                )}
              >
                {format(day, 'd')}
                {hasEvent && (
                  <span
                    className={cn(
                      'absolute bottom-0.5 h-1 w-1 rounded-full',
                      isTodayDate
                        ? 'bg-white'
                        : 'bg-[#58B09C] dark:bg-[#58B09C]'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Upcoming events */}
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Aankomende afspraken
          </p>
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
              Geen aankomende afspraken
            </p>
          ) : (
            upcomingEvents.map((event) => {
              const eventDate = parseISO(event.start_datum)
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div
                    className="w-1 h-full min-h-[32px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.kleur }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {event.titel}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(eventDate, 'd MMM, HH:mm', { locale: nl })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        </>)}
      </CardContent>
    </Card>
  )
}
