import React, { useMemo } from 'react'
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
  Wrench,
} from 'lucide-react'
import { getPriorityColor } from '@/lib/utils'
import { MODULE_COLORS } from '@/lib/moduleColors'
import { format, isToday, isTomorrow, parseISO, isAfter, isBefore, addDays } from 'date-fns'
import { nl } from 'date-fns/locale'
import { useDashboardData } from '@/contexts/DashboardDataContext'

interface TimelineItem {
  id: string
  type: 'task' | 'event' | 'montage'
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
  const { taken, projecten, events, montages: montageData, isLoading: loading } = useDashboardData()
  const montages = montageData

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
        const projectNaam = (task.project_id && projectMap.get(task.project_id)) || ''

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

    // Add montage afspraken for today and tomorrow
    montages
      .filter((m) => m.status !== 'afgerond')
      .forEach((montage) => {
        const montageDate = new Date(montage.datum)
        const item: TimelineItem = {
          id: `montage-${montage.id}`,
          type: 'montage',
          title: montage.titel,
          subtitle: montage.locatie ? `${montage.locatie}` : montage.klant_naam || '',
          time: montage.start_tijd || undefined,
          link: '/montage',
          color: '#e27b40',
          status: montage.status,
        }

        if (isToday(montageDate)) {
          today.push(item)
        } else if (isTomorrow(montageDate)) {
          tomorrow.push(item)
        }
      })

    // Sort today: timed items first (by time), then untimed by type
    today.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time)
      if (a.time && !b.time) return -1
      if (!a.time && b.time) return 1
      return 0
    })

    return { todayItems: today, tomorrowItems: tomorrow, overdueTasks: overdue }
  }, [taken, projecten, events, montages])

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
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl text-white" style={{ backgroundColor: '#1A535C' }}>
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-foreground leading-tight">Vandaag</h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                {totalToday} {totalToday === 1 ? 'item' : 'items'}
                {totalOverdue > 0 && (
                  <span className="ml-1.5 text-[#C03A18] font-semibold">{totalOverdue} achterstallig</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Overdue section */}
        {overdueTasks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-3.5 w-3.5" style={{ color: MODULE_COLORS.werkbonnen.text }} />
              <span className="text-xs font-bold uppercase tracking-label" style={{ color: MODULE_COLORS.werkbonnen.text }}>
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
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(26, 83, 92, 0.1)' }}>
              <CheckCircle2 className="w-6 h-6 text-primary/40" />
            </div>
            <p className="text-sm font-medium text-foreground/70">Geen montages of taken vandaag</p>
            <p className="text-xs mt-1 text-muted-foreground/60">Tijd om offertes op te volgen of de werkplaats in te duiken</p>
          </div>
        )}

        {/* Tomorrow preview */}
        {tomorrowItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-label text-text-tertiary">
                Morgen
              </span>
              <span className="text-2xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
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
      className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group min-h-[48px] ${
        item.isOverdue ? 'bg-mod-werkbonnen-light/50' : ''
      }`}
    >
      {/* Left indicator */}
      {item.type === 'montage' ? (
        <Wrench className="h-4 w-4 flex-shrink-0 text-primary" />
      ) : item.type === 'event' ? (
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
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            {(item.type === 'event' || item.type === 'montage') && item.subtitle ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.subtitle)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <MapPin className="h-2.5 w-2.5" />
                {item.subtitle}
              </a>
            ) : (
              item.subtitle
            )}
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
          <Badge className={`${getPriorityColor(item.priority)} text-2xs capitalize`}>
            {item.priority}
          </Badge>
        )}
        <ArrowRight className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}
