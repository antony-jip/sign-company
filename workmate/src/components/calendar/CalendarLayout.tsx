import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getEvents, createEvent, updateEvent, deleteEvent } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import type { CalendarEvent } from '@/types'

type ViewMode = 'maand' | 'week' | 'dag'

function getEventTypeColor(type: CalendarEvent['type']): string {
  switch (type) {
    case 'meeting':
      return 'bg-blue-500'
    case 'deadline':
      return 'bg-red-500'
    case 'herinnering':
      return 'bg-yellow-500'
    case 'persoonlijk':
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
}

function getEventTypeBadge(type: CalendarEvent['type']): string {
  switch (type) {
    case 'meeting':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'deadline':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    case 'herinnering':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'persoonlijk':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getEventTypeLabel(type: CalendarEvent['type']): string {
  switch (type) {
    case 'meeting':
      return 'Vergadering'
    case 'deadline':
      return 'Deadline'
    case 'herinnering':
      return 'Herinnering'
    case 'persoonlijk':
      return 'Persoonlijk'
    default:
      return type
  }
}

const defaultFormState = {
  titel: '',
  beschrijving: '',
  start_datum: '',
  eind_datum: '',
  type: 'meeting' as CalendarEvent['type'],
  locatie: '',
  kleur: '#3b82f6',
}

export function CalendarLayout() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('maand')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newEventOpen, setNewEventOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormState)

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getEvents()
      setEvents(data)
    } catch (error) {
      console.error('Failed to fetch events:', error)
      toast.error('Kon evenementen niet laden')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleOpenNewEvent = () => {
    // Pre-fill start/end with selected date or today
    const base = selectedDate || new Date()
    const startDate = new Date(base)
    startDate.setHours(9, 0, 0, 0)
    const endDate = new Date(base)
    endDate.setHours(10, 0, 0, 0)

    setFormData({
      ...defaultFormState,
      start_datum: format(startDate, "yyyy-MM-dd'T'HH:mm"),
      eind_datum: format(endDate, "yyyy-MM-dd'T'HH:mm"),
    })
    setNewEventOpen(true)
  }

  const handleSaveEvent = async () => {
    if (!formData.titel.trim()) {
      toast.error('Vul een titel in')
      return
    }
    if (!formData.start_datum || !formData.eind_datum) {
      toast.error('Vul start- en einddatum in')
      return
    }

    try {
      setIsSaving(true)
      await createEvent({
        user_id: user?.id || 'demo',
        project_id: null,
        titel: formData.titel.trim(),
        beschrijving: formData.beschrijving.trim(),
        start_datum: new Date(formData.start_datum).toISOString(),
        eind_datum: new Date(formData.eind_datum).toISOString(),
        type: formData.type,
        locatie: formData.locatie.trim(),
        deelnemers: [],
        kleur: formData.kleur,
        herhaling: '',
      })
      toast.success('Evenement aangemaakt')
      setNewEventOpen(false)
      await fetchEvents()
    } catch (error) {
      console.error('Failed to create event:', error)
      toast.error('Kon evenement niet aanmaken')
    } finally {
      setIsSaving(false)
    }
  }

  // Navigation handlers
  const handlePrev = () => {
    switch (viewMode) {
      case 'maand':
        setCurrentDate((d) => subMonths(d, 1))
        break
      case 'week':
        setCurrentDate((d) => subWeeks(d, 1))
        break
      case 'dag':
        setCurrentDate((d) => subDays(d, 1))
        break
    }
  }

  const handleNext = () => {
    switch (viewMode) {
      case 'maand':
        setCurrentDate((d) => addMonths(d, 1))
        break
      case 'week':
        setCurrentDate((d) => addWeeks(d, 1))
        break
      case 'dag':
        setCurrentDate((d) => addDays(d, 1))
        break
    }
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    if (viewMode === 'maand') {
      setCurrentDate(date)
    }
  }

  // Format the title based on view mode
  const headerTitle = useMemo(() => {
    switch (viewMode) {
      case 'maand':
        return format(currentDate, 'MMMM yyyy', { locale: nl })
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        const startStr = format(weekStart, 'd MMM', { locale: nl })
        const endStr = format(weekEnd, 'd MMM yyyy', { locale: nl })
        return `${startStr} - ${endStr}`
      }
      case 'dag':
        return format(currentDate, 'EEEE d MMMM yyyy', { locale: nl })
      default:
        return ''
    }
  }, [viewMode, currentDate])

  // Upcoming events for sidebar
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return [...events]
      .filter((e) => parseISO(e.start_datum) >= now)
      .sort(
        (a, b) =>
          parseISO(a.start_datum).getTime() - parseISO(b.start_datum).getTime()
      )
      .slice(0, 5)
  }, [events])

  // Mini calendar data for sidebar
  const miniCalendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  const miniCalendarHasEvent = (day: Date) => {
    return events.some((event) => isSameDay(parseISO(event.start_datum), day))
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Agenda
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Plan en beheer uw afspraken en deadlines
          </p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleOpenNewEvent}>
          <Plus className="w-4 h-4" />
          Nieuw Event
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Main calendar area */}
        <div className="flex-1 min-w-0">
          {/* Navigation bar */}
          <Card className="mb-4">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                {/* Left: navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToday}
                  >
                    Vandaag
                  </Button>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handlePrev}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleNext}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <h2 className="text-lg font-semibold text-foreground capitalize">
                    {headerTitle}
                  </h2>
                </div>

                {/* Right: view switcher */}
                <div className="flex items-center border rounded-lg overflow-hidden">
                  {(['maand', 'week', 'dag'] as ViewMode[]).map((mode) => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'rounded-none px-4 h-8 text-sm font-medium',
                        viewMode !== mode && 'hover:bg-muted'
                      )}
                      onClick={() => setViewMode(mode)}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar view */}
          <Card className="overflow-hidden">
            <div className="h-[calc(100vh-340px)] min-h-[480px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Agenda laden...</p>
                  </div>
                </div>
              ) : (
                <>
                  {viewMode === 'maand' && (
                    <MonthView
                      currentDate={currentDate}
                      selectedDate={selectedDate}
                      events={events}
                      onSelectDate={handleSelectDate}
                    />
                  )}
                  {viewMode === 'week' && (
                    <WeekView
                      currentDate={currentDate}
                      selectedDate={selectedDate}
                      events={events}
                      onSelectDate={handleSelectDate}
                    />
                  )}
                  {viewMode === 'dag' && (
                    <DayView currentDate={currentDate} events={events} />
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 hidden lg:block space-y-4">
          {/* Mini calendar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                {format(currentDate, 'MMMM yyyy', { locale: nl })}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {/* Day labels */}
              <div className="grid grid-cols-7 mb-1">
                {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7">
                {miniCalendarDays.map((day, i) => {
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isTodayDate = isToday(day)
                  const isSelected = selectedDate
                    ? isSameDay(day, selectedDate)
                    : false
                  const hasEvent = miniCalendarHasEvent(day)

                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectDate(day)}
                      className={cn(
                        'relative w-full aspect-square flex flex-col items-center justify-center text-xs rounded-md transition-colors',
                        !isCurrentMonth && 'text-muted-foreground/40',
                        isCurrentMonth && 'text-foreground',
                        isTodayDate && 'bg-blue-600 text-white font-bold',
                        isSelected &&
                          !isTodayDate &&
                          'bg-blue-100 dark:bg-blue-900/30 font-semibold',
                        !isTodayDate &&
                          !isSelected &&
                          'hover:bg-muted/50'
                      )}
                    >
                      {format(day, 'd')}
                      {hasEvent && !isTodayDate && (
                        <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500" />
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Komende evenementen
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Geen komende evenementen
                </p>
              ) : (
                <ScrollArea className="max-h-[340px]">
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => {
                      const start = parseISO(event.start_datum)
                      const end = parseISO(event.eind_datum)
                      const isTodayEvent = isToday(start)

                      return (
                        <div
                          key={event.id}
                          className="flex gap-3 group cursor-pointer"
                        >
                          {/* Color indicator */}
                          <div className="flex flex-col items-center flex-shrink-0 pt-1">
                            <div
                              className={cn(
                                'w-2.5 h-2.5 rounded-full',
                                getEventTypeColor(event.type)
                              )}
                            />
                            <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pb-3">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs font-medium text-muted-foreground">
                                {isTodayEvent
                                  ? 'Vandaag'
                                  : format(start, 'EEE d MMM', { locale: nl })}
                              </p>
                              <Badge
                                className={cn(
                                  'text-[9px] px-1.5 py-0',
                                  getEventTypeBadge(event.type)
                                )}
                              >
                                {getEventTypeLabel(event.type)}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {event.titel}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {format(start, 'HH:mm')}
                                {' - '}
                                {format(end, 'HH:mm')}
                              </span>
                            </div>
                            {event.locatie && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate">
                                  {event.locatie}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Event Dialog */}
      <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nieuw Evenement</DialogTitle>
            <DialogDescription>
              Vul de gegevens in om een nieuw evenement aan te maken.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Titel */}
            <div className="grid gap-2">
              <Label htmlFor="event-titel">Titel *</Label>
              <Input
                id="event-titel"
                placeholder="Naam van het evenement"
                value={formData.titel}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, titel: e.target.value }))
                }
              />
            </div>

            {/* Beschrijving */}
            <div className="grid gap-2">
              <Label htmlFor="event-beschrijving">Beschrijving</Label>
              <Textarea
                id="event-beschrijving"
                placeholder="Optionele beschrijving"
                value={formData.beschrijving}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    beschrijving: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            {/* Start en Eind datum */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="event-start">Startdatum *</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={formData.start_datum}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      start_datum: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-eind">Einddatum *</Label>
                <Input
                  id="event-eind"
                  type="datetime-local"
                  value={formData.eind_datum}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      eind_datum: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Type en Locatie */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: CalendarEvent['type']) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Vergadering</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="herinnering">Herinnering</SelectItem>
                    <SelectItem value="persoonlijk">Persoonlijk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-locatie">Locatie</Label>
                <Input
                  id="event-locatie"
                  placeholder="Bijv. Kantoor, Online"
                  value={formData.locatie}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      locatie: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Kleur */}
            <div className="grid gap-2">
              <Label htmlFor="event-kleur">Kleur</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="event-kleur"
                  type="color"
                  className="w-12 h-10 p-1 cursor-pointer"
                  value={formData.kleur}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, kleur: e.target.value }))
                  }
                />
                <span className="text-sm text-muted-foreground">
                  {formData.kleur}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewEventOpen(false)}
              disabled={isSaving}
            >
              Annuleren
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSaveEvent}
              disabled={isSaving}
            >
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
