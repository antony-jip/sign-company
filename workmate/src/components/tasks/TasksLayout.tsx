import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Hash,
  X,
  GripVertical,
  Clock,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { getTaken, createTaak, updateTaak, deleteTaak, getProjecten } from '@/services/supabaseService'
import type { Taak, Project } from '@/types'

type TaakStatus = Taak['status']
type TaakPrioriteit = Taak['prioriteit']

const PRIORITEIT_ORDER: Record<string, number> = { kritiek: 4, hoog: 3, medium: 2, laag: 1 }

const PRIORITEIT_COLORS: Record<TaakPrioriteit, { border: string; bg: string; accent: string }> = {
  kritiek: { border: 'border-l-red-500', bg: 'bg-red-50/80 dark:bg-red-950/20', accent: 'text-red-600' },
  hoog: { border: 'border-l-orange-500', bg: 'bg-orange-50/80 dark:bg-orange-950/20', accent: 'text-orange-600' },
  medium: { border: 'border-l-sky-500', bg: 'bg-sky-50/80 dark:bg-sky-950/20', accent: 'text-sky-600' },
  laag: { border: 'border-l-slate-300', bg: 'bg-slate-50/80 dark:bg-slate-800/20', accent: 'text-slate-500' },
}

const PRIORITEIT_FLAG_COLORS: Record<TaakPrioriteit, string> = {
  kritiek: 'text-red-500', hoog: 'text-orange-500', medium: 'text-yellow-500', laag: 'text-muted-foreground/30',
}

const PRIORITEIT_RING_COLORS: Record<TaakPrioriteit, string> = {
  kritiek: 'border-red-400 hover:border-red-500',
  hoog: 'border-orange-400 hover:border-orange-500',
  medium: 'border-slate-300 hover:border-sky-400 dark:border-slate-600',
  laag: 'border-slate-200 hover:border-slate-400 dark:border-slate-700',
}

const DAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const MONTH_NAMES = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 07:00 - 19:00
const HOUR_HEIGHT = 72 // px per hour slot

interface TaakFormData {
  titel: string
  beschrijving: string
  status: TaakStatus
  prioriteit: TaakPrioriteit
  toegewezen_aan: string
  deadline: string
  geschatte_tijd: number
  bestede_tijd: number
  project_id: string
}

const EMPTY_FORM: TaakFormData = {
  titel: '', beschrijving: '', status: 'todo', prioriteit: 'medium',
  toegewezen_aan: '', deadline: '', geschatte_tijd: 0, bestede_tijd: 0, project_id: '',
}

// === HELPERS ===

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toDateTimeStr(d: Date, hour: number): string {
  return `${toDateStr(d)}T${String(hour).padStart(2, '0')}:00:00`
}

function getHourFromDeadline(deadline: string): number | null {
  if (!deadline || !deadline.includes('T')) return null
  const timePart = deadline.split('T')[1]
  if (!timePart) return null
  const hour = parseInt(timePart.split(':')[0], 10)
  if (isNaN(hour) || hour < 7 || hour > 19) return null
  return hour
}

// === MAIN COMPONENT ===

export function TasksLayout() {
  const { user } = useAuth()

  const [taken, setTaken] = useState<Taak[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [weekOffset, setWeekOffset] = useState(0)
  const [showCompleted, setShowCompleted] = useState(false)

  // FAB state
  const [fabOpen, setFabOpen] = useState(false)
  const [fabTitle, setFabTitle] = useState('')
  const [fabPriority, setFabPriority] = useState<TaakPrioriteit>('medium')
  const [fabDeadline, setFabDeadline] = useState('')
  const [fabProjectId, setFabProjectId] = useState('')
  const fabInputRef = useRef<HTMLInputElement>(null)

  // Edit
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTaak, setEditingTaak] = useState<Taak | null>(null)
  const [formData, setFormData] = useState<TaakFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTaak, setDeletingTaak] = useState<Taak | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Drag state
  const [draggingTaakId, setDraggingTaakId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ dayIndex: number; hour: number } | null>(null)

  // Now-line timer
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [takenData, projectenData] = await Promise.all([getTaken(), getProjecten()])
      setTaken(takenData)
      setProjecten(projectenData)
    } catch (error) {
      console.error('Fout bij laden:', error)
      toast.error('Kon taken niet laden')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Update now-line every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date()
      setNowMinutes(n.getHours() * 60 + n.getMinutes())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Scroll to current time on load
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      const nowHour = new Date().getHours()
      const targetHour = Math.max(7, nowHour - 1)
      scrollRef.current.scrollTop = (targetHour - 7) * HOUR_HEIGHT
    }
  }, [isLoading])

  // Focus FAB input
  useEffect(() => {
    if (fabOpen) setTimeout(() => fabInputRef.current?.focus(), 100)
  }, [fabOpen])

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {}
    projecten.forEach((p) => { map[p.id] = p.naam })
    return map
  }, [projecten])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const weekDays = useMemo(() => {
    const monday = getMonday(today)
    monday.setDate(monday.getDate() + weekOffset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [today, weekOffset])

  // Tasks grouped by day key
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Taak[]>()
    weekDays.forEach((d) => map.set(d.toDateString(), []))

    const activeTaken = showCompleted ? taken : taken.filter((t) => t.status !== 'klaar')

    activeTaken.forEach((t) => {
      if (!t.deadline) return
      const deadline = new Date(t.deadline)
      deadline.setHours(0, 0, 0, 0)
      const key = deadline.toDateString()
      if (map.has(key)) {
        map.get(key)!.push(t)
      }
    })

    // Sort each day: scheduled tasks by hour, then unscheduled by priority
    map.forEach((tasks) => {
      tasks.sort((a, b) => {
        const aHour = getHourFromDeadline(a.deadline)
        const bHour = getHourFromDeadline(b.deadline)
        // Scheduled tasks first, sorted by hour
        if (aHour !== null && bHour !== null) return aHour - bHour
        if (aHour !== null) return -1
        if (bHour !== null) return 1
        // Unscheduled by priority
        return (PRIORITEIT_ORDER[b.prioriteit] || 0) - (PRIORITEIT_ORDER[a.prioriteit] || 0)
      })
    })

    return map
  }, [taken, weekDays, showCompleted])

  // Week range label
  const weekLabel = useMemo(() => {
    const first = weekDays[0]
    const last = weekDays[6]
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} – ${last.getDate()} ${MONTH_NAMES[first.getMonth()]}`
    }
    return `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]}`
  }, [weekDays])

  // Now-line position
  const nowLineTop = useMemo(() => {
    const startMin = 7 * 60
    const endMin = 20 * 60
    const totalMin = endMin - startMin
    const offset = nowMinutes - startMin
    if (offset < 0 || offset > totalMin) return null
    return (offset / totalMin) * 100
  }, [nowMinutes])

  const isCurrentWeek = weekOffset === 0

  // === HANDLERS ===

  async function handleQuickAdd(title: string, priority: TaakPrioriteit, deadline: string, projectId: string) {
    if (!title.trim()) return false
    try {
      const newTaak = await createTaak({
        user_id: user?.id || '',
        titel: title.trim(),
        beschrijving: '',
        status: 'todo',
        prioriteit: priority,
        toegewezen_aan: '',
        deadline: deadline || '',
        geschatte_tijd: 0,
        bestede_tijd: 0,
        project_id: projectId || '',
      })
      setTaken((prev) => [newTaak, ...prev])
      toast.success('Taak aangemaakt')
      return true
    } catch (error) {
      console.error('Fout bij aanmaken:', error)
      toast.error('Kon taak niet aanmaken')
      return false
    }
  }

  async function handleFabAdd() {
    const ok = await handleQuickAdd(fabTitle, fabPriority, fabDeadline, fabProjectId)
    if (ok) {
      setFabTitle('')
      setFabPriority('medium')
      setFabDeadline('')
      setFabProjectId('')
      fabInputRef.current?.focus()
    }
  }

  async function handleToggleComplete(taak: Taak) {
    const newStatus: TaakStatus = taak.status === 'klaar' ? 'todo' : 'klaar'
    try {
      const updated = await updateTaak(taak.id, { status: newStatus })
      setTaken((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      if (newStatus === 'klaar') toast.success('Taak afgerond!')
    } catch (error) {
      console.error('Fout bij statuswijziging:', error)
      toast.error('Kon taak niet bijwerken')
    }
  }

  async function handleDeleteDirect(taak: Taak) {
    try {
      await deleteTaak(taak.id)
      setTaken((prev) => prev.filter((t) => t.id !== taak.id))
      toast.success('Taak verwijderd')
    } catch (error) {
      console.error('Fout bij verwijderen:', error)
      toast.error('Kon taak niet verwijderen')
    }
  }

  function openEditDialog(taak: Taak) {
    setEditingTaak(taak)
    setFormData({
      titel: taak.titel, beschrijving: taak.beschrijving, status: taak.status,
      prioriteit: taak.prioriteit, toegewezen_aan: taak.toegewezen_aan,
      deadline: taak.deadline ? taak.deadline.split('T')[0] : '',
      geschatte_tijd: taak.geschatte_tijd, bestede_tijd: taak.bestede_tijd, project_id: taak.project_id,
    })
    setEditDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.titel.trim()) { toast.error('Titel is verplicht'); return }
    setIsSaving(true)
    try {
      const updated = await updateTaak(editingTaak!.id, {
        titel: formData.titel.trim(), beschrijving: formData.beschrijving.trim(),
        status: formData.status, prioriteit: formData.prioriteit,
        toegewezen_aan: formData.toegewezen_aan.trim(), deadline: formData.deadline || '',
        geschatte_tijd: formData.geschatte_tijd, bestede_tijd: formData.bestede_tijd,
        project_id: formData.project_id,
      })
      setTaken((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      toast.success('Taak bijgewerkt')
      setEditDialogOpen(false)
    } catch (error) {
      console.error('Fout bij opslaan:', error)
      toast.error('Kon taak niet opslaan')
    } finally { setIsSaving(false) }
  }

  async function handleDelete() {
    if (!deletingTaak) return
    setIsDeleting(true)
    try {
      await deleteTaak(deletingTaak.id)
      setTaken((prev) => prev.filter((t) => t.id !== deletingTaak.id))
      toast.success('Taak verwijderd')
      setDeleteDialogOpen(false)
      setDeletingTaak(null)
    } catch (error) {
      console.error('Fout bij verwijderen:', error)
      toast.error('Kon taak niet verwijderen')
    } finally { setIsDeleting(false) }
  }

  // Drag & drop: move task to a new day/time
  async function handleDropTask(taakId: string, dayIndex: number, hour: number) {
    const day = weekDays[dayIndex]
    const newDeadline = toDateTimeStr(day, hour)
    try {
      const updated = await updateTaak(taakId, { deadline: newDeadline })
      setTaken((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      toast.success(`Verplaatst naar ${DAY_LABELS[dayIndex]} ${String(hour).padStart(2, '0')}:00`)
    } catch (error) {
      console.error('Fout bij verplaatsen:', error)
      toast.error('Kon taak niet verplaatsen')
    }
  }

  // Quick add for a specific day column (unscheduled)
  async function handleDayQuickAdd(day: Date, title: string) {
    await handleQuickAdd(title, 'medium', toDateStr(day), '')
  }

  // Quick add for a specific day + hour
  async function handleDayHourQuickAdd(day: Date, hour: number, title: string) {
    await handleQuickAdd(title, 'medium', toDateTimeStr(day, hour), '')
  }

  // === RENDER ===

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Taken laden...</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* === TOP BAR === */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-card/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-foreground tracking-tight">{weekLabel}</h1>
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => setWeekOffset((w) => w - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant={isCurrentWeek ? 'default' : 'ghost'}
                size="sm"
                className={cn('h-7 text-xs px-3 rounded-md', isCurrentWeek && 'bg-primary hover:bg-wm-hover shadow-sm')}
                onClick={() => setWeekOffset(0)}
              >
                Vandaag
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => setWeekOffset((w) => w + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg border transition-all duration-200',
                showCompleted
                  ? 'bg-primary/10 border-primary/30 text-accent dark:text-wm-light shadow-sm'
                  : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {showCompleted ? 'Afgerond zichtbaar' : 'Toon afgerond'}
            </button>
          </div>
        </div>

        {/* === DAY HEADERS === */}
        <div className="flex border-b border-border/60 bg-card/80 backdrop-blur-sm flex-shrink-0">
          {/* Time gutter spacer */}
          <div className="w-14 flex-shrink-0" />
          {/* Day columns headers */}
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today)
            const dayTasks = tasksByDay.get(day.toDateString()) || []
            const isPast = day < today && !isToday
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 min-w-0 text-center py-2.5 border-l border-border/40 transition-colors',
                  isToday && 'bg-primary/5'
                )}
              >
                <div className={cn(
                  'text-[11px] uppercase tracking-wider font-semibold',
                  isToday ? 'text-primary' : isPast ? 'text-muted-foreground/30' : 'text-muted-foreground/70'
                )}>
                  {DAY_LABELS[i]}
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <span className={cn(
                    'inline-flex items-center justify-center text-sm font-bold transition-all',
                    isToday
                      ? 'w-8 h-8 rounded-full bg-primary text-white shadow-sm shadow-primary/30'
                      : isPast ? 'text-muted-foreground/30' : 'text-foreground'
                  )}>
                    {day.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className={cn(
                      'text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded-full',
                      isToday
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted/60 text-muted-foreground/50'
                    )}>
                      {dayTasks.length}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* === CALENDAR GRID === */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden relative bg-background">
          <div className="flex" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
            {/* Time gutter */}
            <div className="w-14 flex-shrink-0 relative">
              {HOURS.map((hour) => (
                <div key={hour} style={{ height: HOUR_HEIGHT }} className="relative">
                  <span className="absolute -top-2.5 right-3 text-[11px] text-muted-foreground/40 tabular-nums font-medium">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => {
              const isToday = isSameDay(day, today)
              const dayTasks = tasksByDay.get(day.toDateString()) || []
              const isPast = day < today && !isToday

              return (
                <DayColumn
                  key={dayIndex}
                  day={day}
                  dayIndex={dayIndex}
                  isToday={isToday}
                  isPast={isPast}
                  tasks={dayTasks}
                  projectMap={projectMap}
                  nowLineTop={isCurrentWeek && isToday ? nowLineTop : null}
                  draggingTaakId={draggingTaakId}
                  dropTarget={dropTarget}
                  onDragStart={setDraggingTaakId}
                  onDragEnd={() => { setDraggingTaakId(null); setDropTarget(null) }}
                  onDropTargetChange={setDropTarget}
                  onDrop={handleDropTask}
                  onToggle={handleToggleComplete}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteDirect}
                  onQuickAdd={(title) => handleDayQuickAdd(day, title)}
                  onQuickAddAtTime={(hour, title) => handleDayHourQuickAdd(day, hour, title)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* === FLOATING ACTION BUTTON === */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {fabOpen && (
          <div className="w-80 rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/10 p-4 space-y-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Snel toevoegen</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setFabOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Input
              ref={fabInputRef}
              placeholder="Wat moet je doen?"
              value={fabTitle}
              onChange={(e) => setFabTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && fabTitle.trim()) handleFabAdd()
                if (e.key === 'Escape') setFabOpen(false)
              }}
              className="text-sm rounded-lg"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={fabDeadline}
                onChange={(e) => setFabDeadline(e.target.value)}
                className="w-auto h-7 text-xs rounded-lg"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-lg">
                    <Flag className={`w-3 h-3 ${PRIORITEIT_FLAG_COLORS[fabPriority]}`} />
                    {fabPriority === 'medium' ? 'Prio' : fabPriority.charAt(0).toUpperCase() + fabPriority.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(['kritiek', 'hoog', 'medium', 'laag'] as TaakPrioriteit[]).map((p) => (
                    <DropdownMenuItem key={p} onClick={() => setFabPriority(p)}>
                      <Flag className={`w-3.5 h-3.5 mr-2 ${PRIORITEIT_FLAG_COLORS[p]}`} />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Select value={fabProjectId || 'geen'} onValueChange={(v) => setFabProjectId(v === 'geen' ? '' : v)}>
                <SelectTrigger className="w-auto h-7 text-xs min-w-0 max-w-[120px] rounded-lg">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geen">Geen project</SelectItem>
                  {projecten.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full h-9 text-sm bg-primary hover:bg-wm-hover rounded-lg shadow-sm"
              disabled={!fabTitle.trim()}
              onClick={handleFabAdd}
            >
              Toevoegen
            </Button>
          </div>
        )}

        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={cn(
            'flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-primary/20 transition-all duration-200',
            'bg-primary hover:bg-wm-hover text-white hover:shadow-xl hover:shadow-primary/30 hover:scale-105',
            fabOpen && 'rotate-45 bg-accent'
          )}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Edit dialog */}
      <EditTaskDialog
        open={editDialogOpen} onOpenChange={setEditDialogOpen}
        formData={formData} setFormData={setFormData}
        onSave={handleSave} isSaving={isSaving} projecten={projecten}
      />

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Taak verwijderen</DialogTitle>
            <DialogDescription>Weet je zeker dat je &quot;{deletingTaak?.titel}&quot; wilt verwijderen?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// === DAY COLUMN ===

function DayColumn({
  day, dayIndex, isToday, isPast, tasks, projectMap, nowLineTop,
  draggingTaakId, dropTarget,
  onDragStart, onDragEnd, onDropTargetChange, onDrop,
  onToggle, onEdit, onDelete, onQuickAdd, onQuickAddAtTime,
}: {
  day: Date
  dayIndex: number
  isToday: boolean
  isPast: boolean
  tasks: Taak[]
  projectMap: Record<string, string>
  nowLineTop: number | null
  draggingTaakId: string | null
  dropTarget: { dayIndex: number; hour: number } | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDropTargetChange: (target: { dayIndex: number; hour: number } | null) => void
  onDrop: (taakId: string, dayIndex: number, hour: number) => void
  onToggle: (taak: Taak) => void
  onEdit: (taak: Taak) => void
  onDelete: (taak: Taak) => void
  onQuickAdd: (title: string) => void
  onQuickAddAtTime: (hour: number, title: string) => void
}) {
  const [addTitle, setAddTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addingAtHour, setAddingAtHour] = useState<number | null>(null)
  const [hourAddTitle, setHourAddTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const hourInputRef = useRef<HTMLInputElement>(null)

  // Separate scheduled and unscheduled tasks
  const scheduledTasks = tasks.filter((t) => getHourFromDeadline(t.deadline) !== null)
  const unscheduledTasks = tasks.filter((t) => getHourFromDeadline(t.deadline) === null)

  function handleDragOver(e: React.DragEvent, hour: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDropTargetChange({ dayIndex, hour })
  }

  function handleDrop(e: React.DragEvent, hour: number) {
    e.preventDefault()
    if (draggingTaakId) {
      onDrop(draggingTaakId, dayIndex, hour)
    }
    onDragEnd()
  }

  function handleDragLeave(e: React.DragEvent) {
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      onDropTargetChange(null)
    }
  }

  return (
    <div className={cn(
      'flex-1 min-w-0 border-l border-border/40 relative',
      isToday && 'bg-primary/[0.02]'
    )}>
      {/* Hour grid lines + drop zones */}
      {HOURS.map((hour) => {
        const isDropHere = dropTarget?.dayIndex === dayIndex && dropTarget?.hour === hour
        const isAddingHere = addingAtHour === hour
        return (
          <div
            key={hour}
            style={{ height: HOUR_HEIGHT }}
            className={cn(
              'group/hour border-b border-border/30 transition-colors duration-150 relative',
              isDropHere && 'bg-primary/10'
            )}
            onDragOver={(e) => handleDragOver(e, hour)}
            onDrop={(e) => handleDrop(e, hour)}
            onDragLeave={handleDragLeave}
          >
            {/* Drop indicator */}
            {isDropHere && (
              <div className="h-full flex items-start pt-1 px-1 pointer-events-none">
                <div className="w-full rounded-md border-2 border-dashed border-primary/40 h-10 flex items-center justify-center">
                  <Clock className="w-3 h-3 text-primary/60 mr-1" />
                  <span className="text-[10px] text-primary/60 font-medium">{String(hour).padStart(2, '0')}:00</span>
                </div>
              </div>
            )}

            {/* Inline add at this hour */}
            {isAddingHere && (
              <div className="absolute inset-x-1 top-1 z-30">
                <input
                  ref={hourInputRef}
                  value={hourAddTitle}
                  onChange={(e) => setHourAddTitle(e.target.value)}
                  placeholder={`Taak om ${String(hour).padStart(2, '0')}:00...`}
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-primary/50 bg-card shadow-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/40 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && hourAddTitle.trim()) {
                      onQuickAddAtTime(hour, hourAddTitle.trim())
                      setHourAddTitle('')
                      setAddingAtHour(null)
                    }
                    if (e.key === 'Escape') { setAddingAtHour(null); setHourAddTitle('') }
                  }}
                  onBlur={() => { if (!hourAddTitle.trim()) { setAddingAtHour(null); setHourAddTitle('') } }}
                />
              </div>
            )}

            {/* Plus button per hour slot */}
            {!isDropHere && !isAddingHere && (
              <button
                onClick={() => { setAddingAtHour(hour); setHourAddTitle(''); setTimeout(() => hourInputRef.current?.focus(), 50) }}
                className="absolute top-1 right-1 z-20 opacity-0 group-hover/hour:opacity-100 p-1 rounded-md text-muted-foreground/25 hover:text-primary hover:bg-primary/10 transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )
      })}

      {/* Now-line */}
      {nowLineTop !== null && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ top: `${nowLineTop}%` }}
        >
          <div className="flex items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0 shadow-sm shadow-red-500/30" />
            <div className="flex-1 h-[2px] bg-red-500/80" />
          </div>
        </div>
      )}

      {/* Scheduled tasks - positioned at their time */}
      {scheduledTasks.map((taak) => {
        const hour = getHourFromDeadline(taak.deadline)!
        const topPx = (hour - 7) * HOUR_HEIGHT + 4
        return (
          <div
            key={taak.id}
            className="absolute left-1 right-1 z-10"
            style={{ top: topPx }}
          >
            <TaskCard
              taak={taak}
              projectNaam={projectMap[taak.project_id]}
              isPast={isPast}
              scheduled
              onDragStart={() => onDragStart(taak.id)}
              onDragEnd={onDragEnd}
              onToggle={() => onToggle(taak)}
              onEdit={() => onEdit(taak)}
              onDelete={() => onDelete(taak)}
            />
          </div>
        )
      })}

      {/* Unscheduled tasks - at top of column */}
      <div className="absolute inset-x-0 top-0 p-1 pt-1.5 flex flex-col gap-1 z-10 pointer-events-none">
        {unscheduledTasks.map((taak) => (
          <div key={taak.id} className="pointer-events-auto">
            <TaskCard
              taak={taak}
              projectNaam={projectMap[taak.project_id]}
              isPast={isPast}
              onDragStart={() => onDragStart(taak.id)}
              onDragEnd={onDragEnd}
              onToggle={() => onToggle(taak)}
              onEdit={() => onEdit(taak)}
              onDelete={() => onDelete(taak)}
            />
          </div>
        ))}

        {/* Quick add inline */}
        <div className="pointer-events-auto">
          {isAdding ? (
            <div className="mx-0.5">
              <input
                ref={inputRef}
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="Taak..."
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-primary/40 bg-card focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/40 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && addTitle.trim()) {
                    onQuickAdd(addTitle.trim())
                    setAddTitle('')
                  }
                  if (e.key === 'Escape') { setIsAdding(false); setAddTitle('') }
                }}
                onBlur={() => { if (!addTitle.trim()) { setIsAdding(false); setAddTitle('') } }}
              />
            </div>
          ) : (
            <button
              onClick={() => { setIsAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
              className="mx-0.5 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] text-muted-foreground/30 hover:text-primary hover:bg-primary/5 transition-all duration-200"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// === TASK CARD ===

function TaskCard({
  taak, projectNaam, isPast, scheduled, onDragStart, onDragEnd, onToggle, onEdit, onDelete,
}: {
  taak: Taak
  projectNaam?: string
  isPast: boolean
  scheduled?: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const isDone = taak.status === 'klaar'
  const [justCompleted, setJustCompleted] = useState(false)
  const colors = PRIORITEIT_COLORS[taak.prioriteit]
  const hour = getHourFromDeadline(taak.deadline)

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!isDone) {
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), 600)
    }
    onToggle()
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete()
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taak.id)
    onDragStart()
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative rounded-lg border-l-[3px] px-2.5 py-2 cursor-grab active:cursor-grabbing transition-all duration-200',
        'hover:shadow-lg hover:shadow-black/5 hover:z-10 hover:-translate-y-[1px]',
        isDone
          ? 'opacity-40 border-l-slate-300 bg-slate-50 dark:bg-slate-800/20 hover:opacity-60'
          : `${colors.border} ${colors.bg}`,
        isPast && !isDone && 'opacity-60',
        justCompleted && 'scale-95 opacity-50',
        scheduled && 'shadow-sm'
      )}
      onClick={onEdit}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab">
          <GripVertical className="w-3 h-3" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1">
            <p className={cn(
              'text-[12px] font-medium leading-tight text-foreground flex-1',
              isDone && 'line-through text-muted-foreground'
            )}>
              {taak.titel}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {projectNaam && (
              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                <Hash className="w-2 h-2" />{projectNaam}
              </span>
            )}
            {scheduled && hour !== null && (
              <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5">
                <Clock className="w-2 h-2" />{String(hour).padStart(2, '0')}:00
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Delete button - visible on hover */}
          <button
            onClick={handleDeleteClick}
            className="flex-shrink-0 p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900/30"
            title="Verwijderen"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-red-500 transition-colors" />
          </button>

          {/* Checkbox */}
          <button
            onClick={handleToggle}
            className={cn(
              'flex-shrink-0 p-0.5 rounded-md transition-all duration-200',
              !isDone && 'hover:bg-primary/10'
            )}
            title={isDone ? 'Markeer als ongedaan' : 'Markeer als klaar'}
          >
            {isDone ? (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className={cn(
                'w-5 h-5 rounded-full border-2 transition-all duration-200',
                PRIORITEIT_RING_COLORS[taak.prioriteit],
                'hover:border-primary hover:bg-primary/10'
              )} />
            )}
          </button>
        </div>
      </div>

      {/* Completion animation overlay */}
      {justCompleted && (
        <div className="absolute inset-0 rounded-lg bg-primary/20 flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
          <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
        </div>
      )}
    </div>
  )
}

// === EDIT DIALOG ===

function EditTaskDialog({
  open, onOpenChange, formData, setFormData, onSave, isSaving, projecten,
}: {
  open: boolean; onOpenChange: (open: boolean) => void
  formData: TaakFormData; setFormData: React.Dispatch<React.SetStateAction<TaakFormData>>
  onSave: () => void; isSaving: boolean; projecten: Project[]
}) {
  function updateField<K extends keyof TaakFormData>(field: K, value: TaakFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Taak bewerken</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-titel">Titel</Label>
            <Input id="edit-titel" value={formData.titel} onChange={(e) => updateField('titel', e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-beschrijving">Beschrijving</Label>
            <Textarea id="edit-beschrijving" value={formData.beschrijving} onChange={(e) => updateField('beschrijving', e.target.value)} rows={3} placeholder="Optioneel..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Prioriteit</Label>
              <Select value={formData.prioriteit} onValueChange={(v) => updateField('prioriteit', v as TaakPrioriteit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['kritiek', 'hoog', 'medium', 'laag'] as TaakPrioriteit[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <Flag className={`w-3 h-3 ${PRIORITEIT_FLAG_COLORS[p]}`} />
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-deadline">Deadline</Label>
              <Input id="edit-deadline" type="date" value={formData.deadline} onChange={(e) => updateField('deadline', e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Project (optioneel)</Label>
            <Select value={formData.project_id || 'geen'} onValueChange={(v) => updateField('project_id', v === 'geen' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Geen project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="geen">Geen project</SelectItem>
                {projecten.map((p) => (<SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-toegewezen">Toegewezen aan</Label>
            <Input id="edit-toegewezen" value={formData.toegewezen_aan} onChange={(e) => updateField('toegewezen_aan', e.target.value)} placeholder="Optioneel..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Annuleren</Button>
          <Button onClick={onSave} disabled={isSaving} className="bg-primary hover:bg-wm-hover">
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
