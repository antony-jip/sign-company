import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Calendar,
  ListTodo,
  Loader2,
  ArrowRight,
  MapPin,
} from 'lucide-react'
import { getTaken, getProjecten, getEvents } from '@/services/supabaseService'
import type { Taak, Project, CalendarEvent } from '@/types'
import { getPriorityColor } from '@/lib/utils'
import { format, isToday, isTomorrow, parseISO, isAfter, isBefore, addDays } from 'date-fns'
import { nl } from 'date-fns/locale'
import { logger } from '../../utils/logger'

interface TimelineItem {
  id: string
  type: 'task' | 'event'
  title: string
  subtitle: string
  time?: string
  priority?: string
  status?: string
  isOverdue?: boolean
  link?: string
  color?: string
}

export function TodayPlanningWidget() {
  const navigate = useNavigate()
  const [taken, setTaken] = useState<Taak[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTaken(), getProjecten(), getEvents()])
      .then(([t, p, e]) => {
        setTaken(t)
        setProjecten(p)
        setEvents(e)
      })
      .catch(logger.error)
      .finally(() => setLoading(false))
  }, [])

  const { todayItems, tomorrowItems, overdueTasks } = useMemo(() => {
    const projectMap = new Map(projecten.map((p) => [p.id, p.naam]))
    const now = new Date()
    const today: TimelineItem[] = []
    const tomorrow: TimelineItem[] = []
    const overdue: TimelineItem[] = []

    // Add calendar events for today
    events.forEach((event) => {
      const eventDate = parseISO(event.start_datum)
      if (isToday(eventDate)) {
        today.push({
          id: `event-${event.id}`,
          type: 'event',
          title: event.titel,
          subtitle: event.locatie || event.beschrijving || '',
          time: format(eventDate, 'HH:mm'),
          link: '/kalender',
          color: event.kleur || 'hsl(var(--primary))',
        })
      } else if (isTomorrow(eventDate)) {
        tomorrow.push({
          id: `event-${event.id}`,
          type: 'event',
          title: event.titel,
          subtitle: event.locatie || event.beschrijving || '',
          time: format(eventDate, 'HH:mm'),
          link: '/kalender',
          color: event.kleur || 'hsl(var(--primary))',
        })
      }
    })

    // Add tasks due today, tomorrow, or overdue
    taken
      .filter((t) => t.status !== 'klaar')
      .forEach((task) => {
        if (!task.deadline) return
        const deadline = new Date(task.deadline)
        const projectNaam = projectMap.get(task.project_id) || ''

        const item: TimelineItem = {
          id: `task-${task.id}`,
          type: 'task',
          title: task.titel,
          subtitle: projectNaam,
          priority: task.prioriteit,
          status: task.status,
          link: `/projecten/${task.project_id}`,
        }

        if (isToday(deadline)) {
          today.push(item)
        } else if (isTomorrow(deadline)) {
          tomorrow.push(item)
        } else if (isBefore(deadline, now)) {
          overdue.push({ ...item, isOverdue: true })
        }
      })

    // Sort today: events by time first, then tasks by priority
    today.sort((a, b) => {
      if (a.type === 'event' && b.type === 'task') return -1
      if (a.type === 'task' && b.type === 'event') return 1
      if (a.time && b.time) return a.time.localeCompare(b.time)
      return 0
    })

    return { todayItems: today, tomorrowItems: tomorrow, overdueTasks: overdue }
  }, [taken, projecten, events])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5 flex items-center justify-center h-48">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const totalToday = todayItems.length
  const totalOverdue = overdueTasks.length

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-wm-light shadow-md">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            Vandaag
          </h3>
          <div className="flex items-center gap-2">
            {totalOverdue > 0 && (
              <span className="text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                {totalOverdue} achterstallig
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {totalToday} {totalToday === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* Overdue section */}
        {overdueTasks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Achterstallig
              </span>
            </div>
            <div className="space-y-1">
              {overdueTasks.slice(0, 3).map((item) => (
                <TimelineRow key={item.id} item={item} onClick={() => item.link && navigate(item.link)} />
              ))}
            </div>
          </div>
        )}

        {/* Today's timeline */}
        {todayItems.length > 0 ? (
          <div className="space-y-1">
            {todayItems.map((item) => (
              <TimelineRow key={item.id} item={item} onClick={() => item.link && navigate(item.link)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm font-medium">Geen items voor vandaag</p>
            <p className="text-xs mt-0.5 text-muted-foreground/60">Lekker, vrij schema!</p>
          </div>
        )}

        {/* Tomorrow preview */}
        {tomorrowItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Morgen
              </span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {tomorrowItems.length}
              </span>
            </div>
            <div className="space-y-1">
              {tomorrowItems.slice(0, 3).map((item) => (
                <TimelineRow key={item.id} item={item} compact onClick={() => item.link && navigate(item.link)} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TimelineRow({
  item,
  compact = false,
  onClick,
}: {
  item: TimelineItem
  compact?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group ${
        item.isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''
      }`}
    >
      {/* Left indicator */}
      {item.type === 'event' ? (
        <div
          className="w-1.5 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: item.color }}
        />
      ) : (
        <Circle className={`h-4 w-4 flex-shrink-0 ${
          item.isOverdue
            ? 'text-red-400'
            : item.priority === 'kritiek' || item.priority === 'hoog'
            ? 'text-orange-400'
            : 'text-muted-foreground/30'
        }`} />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-foreground truncate group-hover:text-accent dark:group-hover:text-primary transition-colors ${
          compact ? 'text-xs' : 'text-sm'
        }`}>
          {item.title}
        </p>
        {item.subtitle && (
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
            {item.type === 'event' && item.subtitle && <MapPin className="h-2.5 w-2.5" />}
            {item.subtitle}
          </p>
        )}
      </div>

      {/* Right side info */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {item.time && (
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {item.time}
          </span>
        )}
        {item.priority && !compact && (
          <Badge className={`${getPriorityColor(item.priority)} text-[10px] capitalize`}>
            {item.priority}
          </Badge>
        )}
        <ArrowRight className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}
