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
  CalendarDays,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Flag,
  Hash,
  Inbox,
  Search,
  X,
  Calendar,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { getTaken, createTaak, updateTaak, deleteTaak, getProjecten } from '@/services/supabaseService'
import type { Taak, Project } from '@/types'

type TaakStatus = Taak['status']
type TaakPrioriteit = Taak['prioriteit']
type ViewSection = 'week' | 'inbox' | 'project'

const PRIORITEIT_ORDER: Record<string, number> = {
  kritiek: 4, hoog: 3, medium: 2, laag: 1,
}

const PRIORITEIT_FLAG_COLORS: Record<TaakPrioriteit, string> = {
  kritiek: 'text-red-500', hoog: 'text-orange-500', medium: 'text-yellow-500', laag: 'text-muted-foreground/30',
}

const DAY_NAMES = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const DAY_NAMES_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

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

function formatDayHeader(date: Date, today: Date): string {
  if (isSameDay(date, today)) return 'Vandaag'
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(date, tomorrow)) return 'Morgen'
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()}`
}

function formatShortDate(date: Date): string {
  return `${date.getDate()} ${['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][date.getMonth()]}`
}

export function TasksLayout() {
  const { user } = useAuth()

  const [taken, setTaken] = useState<Taak[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // View state
  const [activeView, setActiveView] = useState<ViewSection>('week')
  const [activeProjectId, setActiveProjectId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0) // 0 = this week, 1 = next week, etc.

  // FAB quick-add state
  const [fabOpen, setFabOpen] = useState(false)
  const [fabTitle, setFabTitle] = useState('')
  const [fabPriority, setFabPriority] = useState<TaakPrioriteit>('medium')
  const [fabDeadline, setFabDeadline] = useState('')
  const [fabProjectId, setFabProjectId] = useState('')
  const fabInputRef = useRef<HTMLInputElement>(null)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTaak, setEditingTaak] = useState<Taak | null>(null)
  const [formData, setFormData] = useState<TaakFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTaak, setDeletingTaak] = useState<Taak | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Projects sidebar
  const [projectsExpanded, setProjectsExpanded] = useState(true)

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

  // Focus FAB input when opened
  useEffect(() => {
    if (fabOpen) {
      setTimeout(() => fabInputRef.current?.focus(), 100)
    }
  }, [fabOpen])

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {}
    projecten.forEach((p) => { map[p.id] = p.naam })
    return map
  }, [projecten])

  // Week days
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

  // Tasks grouped by day for week view
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Taak[]>()
    weekDays.forEach((d) => { map.set(d.toDateString(), []) })

    const activeTaken = taken.filter((t) => t.status !== 'klaar' || showCompleted)

    activeTaken.forEach((t) => {
      if (!t.deadline) return
      const deadline = new Date(t.deadline)
      deadline.setHours(0, 0, 0, 0)
      const key = deadline.toDateString()
      if (map.has(key)) {
        map.get(key)!.push(t)
      }
    })

    // Sort each day by priority
    map.forEach((tasks) => {
      tasks.sort((a, b) => (PRIORITEIT_ORDER[b.prioriteit] || 0) - (PRIORITEIT_ORDER[a.prioriteit] || 0))
    })

    return map
  }, [taken, weekDays, showCompleted])

  // Overdue tasks (before this week)
  const overdueTasks = useMemo(() => {
    const firstDay = weekDays[0]
    return taken
      .filter((t) => {
        if (t.status === 'klaar' || !t.deadline) return false
        const d = new Date(t.deadline)
        d.setHours(0, 0, 0, 0)
        return d < firstDay
      })
      .sort((a, b) => (PRIORITEIT_ORDER[b.prioriteit] || 0) - (PRIORITEIT_ORDER[a.prioriteit] || 0))
  }, [taken, weekDays])

  // Tasks without deadline
  const noDateTasks = useMemo(() => {
    return taken
      .filter((t) => !t.deadline && (t.status !== 'klaar' || showCompleted))
      .sort((a, b) => (PRIORITEIT_ORDER[b.prioriteit] || 0) - (PRIORITEIT_ORDER[a.prioriteit] || 0))
  }, [taken, showCompleted])

  // Inbox / project filtered tasks
  const filteredTaken = useMemo(() => {
    let result = [...taken]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (t) =>
          t.titel.toLowerCase().includes(q) ||
          t.beschrijving.toLowerCase().includes(q) ||
          (projectMap[t.project_id] || '').toLowerCase().includes(q)
      )
    }

    if (activeView === 'project') {
      result = result.filter((t) => t.project_id === activeProjectId)
    }

    if (!showCompleted) {
      result = result.filter((t) => t.status !== 'klaar')
    }

    result.sort((a, b) => {
      const aOverdue = a.deadline && new Date(a.deadline) < today && a.status !== 'klaar' ? 1 : 0
      const bOverdue = b.deadline && new Date(b.deadline) < today && b.status !== 'klaar' ? 1 : 0
      if (aOverdue !== bOverdue) return bOverdue - aOverdue
      const prioDiff = (PRIORITEIT_ORDER[b.prioriteit] || 0) - (PRIORITEIT_ORDER[a.prioriteit] || 0)
      if (prioDiff !== 0) return prioDiff
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      if (a.deadline) return -1
      if (b.deadline) return 1
      return 0
    })

    return result
  }, [taken, activeView, activeProjectId, showCompleted, searchQuery, projectMap, today])

  const completedCount = useMemo(() => taken.filter((t) => t.status === 'klaar').length, [taken])

  const projectTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    taken.forEach((t) => {
      if (t.status !== 'klaar' && t.project_id) {
        counts[t.project_id] = (counts[t.project_id] || 0) + 1
      }
    })
    return counts
  }, [taken])

  // === HANDLERS ===

  async function handleQuickAdd(title: string, priority: TaakPrioriteit, deadline: string, projectId: string) {
    if (!title.trim()) return
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

  // === RENDER ===

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Taken laden...</p>
      </div>
    )
  }

  const weekLabel = weekOffset === 0
    ? 'Deze week'
    : weekOffset === 1
    ? 'Volgende week'
    : `${formatShortDate(weekDays[0])} - ${formatShortDate(weekDays[6])}`

  return (
    <>
      <div className="flex gap-6 min-h-[calc(100vh-120px)]">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-52 flex-shrink-0">
          <nav className="space-y-1">
            <SidebarItem
              icon={<Calendar className="w-4 h-4" />}
              label="Week"
              active={activeView === 'week' && !searchQuery}
              onClick={() => { setActiveView('week'); setSearchQuery(''); setShowSearch(false); setWeekOffset(0) }}
            />
            <SidebarItem
              icon={<Inbox className="w-4 h-4" />}
              label="Alle taken"
              count={taken.filter((t) => t.status !== 'klaar').length}
              active={activeView === 'inbox' && !searchQuery}
              onClick={() => { setActiveView('inbox'); setSearchQuery(''); setShowSearch(false) }}
            />
          </nav>

          <div className="mt-6">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {projectsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Projecten
            </button>
            {projectsExpanded && (
              <nav className="mt-1 space-y-0.5">
                {projecten
                  .filter((p) => p.status === 'actief' || p.status === 'gepland')
                  .map((project) => (
                    <SidebarItem
                      key={project.id}
                      icon={<Hash className="w-3.5 h-3.5" />}
                      label={project.naam}
                      count={projectTaskCounts[project.id] || 0}
                      active={activeView === 'project' && activeProjectId === project.id && !searchQuery}
                      onClick={() => { setActiveView('project'); setActiveProjectId(project.id); setSearchQuery(''); setShowSearch(false) }}
                      compact
                    />
                  ))}
              </nav>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground font-display">
                {searchQuery ? 'Zoekresultaten' : activeView === 'week' ? weekLabel : activeView === 'inbox' ? 'Alle taken' : projectMap[activeProjectId] || 'Project'}
              </h1>
              {/* Week navigation */}
              {activeView === 'week' && !searchQuery && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((w) => w - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {weekOffset !== 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setWeekOffset(0)}>
                      Vandaag
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((w) => w + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery('') }}
              >
                <Search className="w-4 h-4" />
              </Button>
              {/* Mobile view selector */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {activeView === 'week' ? 'Week' : activeView === 'inbox' ? 'Alle' : projectMap[activeProjectId]}
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setActiveView('week'); setSearchQuery('') }}>
                      <Calendar className="w-4 h-4 mr-2" /> Week
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setActiveView('inbox'); setSearchQuery('') }}>
                      <Inbox className="w-4 h-4 mr-2" /> Alle taken
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {projecten.filter((p) => p.status === 'actief' || p.status === 'gepland').map((p) => (
                      <DropdownMenuItem key={p.id} onClick={() => { setActiveView('project'); setActiveProjectId(p.id); setSearchQuery('') }}>
                        <Hash className="w-4 h-4 mr-2" /> {p.naam}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Search */}
          {showSearch && (
            <div className="mb-4">
              <Input autoFocus placeholder="Zoek taken..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-md" />
            </div>
          )}

          {/* Week view */}
          {activeView === 'week' && !searchQuery ? (
            <div className="space-y-1">
              {/* Overdue */}
              {overdueTasks.length > 0 && weekOffset <= 0 && (
                <DaySection
                  label="Achterstallig"
                  isOverdue
                  tasks={overdueTasks}
                  projectMap={projectMap}
                  showProject
                  onToggle={handleToggleComplete}
                  onEdit={openEditDialog}
                  onDelete={(t) => { setDeletingTaak(t); setDeleteDialogOpen(true) }}
                />
              )}

              {/* Day columns */}
              {weekDays.map((day) => {
                const dayTasks = tasksByDay.get(day.toDateString()) || []
                const isToday = isSameDay(day, today)
                return (
                  <DaySection
                    key={day.toDateString()}
                    label={formatDayHeader(day, today)}
                    sublabel={`${DAY_NAMES_SHORT[day.getDay()]} ${day.getDate()}`}
                    isToday={isToday}
                    tasks={dayTasks}
                    projectMap={projectMap}
                    showProject
                    onToggle={handleToggleComplete}
                    onEdit={openEditDialog}
                    onDelete={(t) => { setDeletingTaak(t); setDeleteDialogOpen(true) }}
                    onQuickAdd={async (title) => {
                      const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                      await handleQuickAdd(title, 'medium', dateStr, '')
                    }}
                  />
                )
              })}

              {/* No date tasks */}
              {noDateTasks.length > 0 && (
                <DaySection
                  label="Geen datum"
                  tasks={noDateTasks}
                  projectMap={projectMap}
                  showProject
                  onToggle={handleToggleComplete}
                  onEdit={openEditDialog}
                  onDelete={(t) => { setDeletingTaak(t); setDeleteDialogOpen(true) }}
                />
              )}
            </div>
          ) : (
            /* Inbox / project / search list view */
            <div className="space-y-px">
              {filteredTaken.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">{searchQuery ? 'Geen taken gevonden' : 'Alles afgevinkt!'}</p>
                </div>
              ) : (
                filteredTaken.map((taak) => (
                  <TaskRow
                    key={taak.id}
                    taak={taak}
                    projectNaam={projectMap[taak.project_id]}
                    showProject={activeView !== 'project'}
                    onToggle={() => handleToggleComplete(taak)}
                    onEdit={() => openEditDialog(taak)}
                    onDelete={() => { setDeletingTaak(taak); setDeleteDialogOpen(true) }}
                  />
                ))
              )}
            </div>
          )}

          {/* Completed toggle */}
          {completedCount > 0 && (
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 mt-4 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showCompleted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {completedCount} afgeronde {completedCount === 1 ? 'taak' : 'taken'}
            </button>
          )}
        </main>
      </div>

      {/* === FLOATING ACTION BUTTON === */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Quick-add popup */}
        {fabOpen && (
          <div className="w-80 rounded-xl border border-border bg-card shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Snel toevoegen</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFabOpen(false)}>
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
              className="text-sm"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={fabDeadline}
                onChange={(e) => setFabDeadline(e.target.value)}
                className="w-auto h-7 text-xs"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
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
                <SelectTrigger className="w-auto h-7 text-xs min-w-0 max-w-[120px]">
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
              className="w-full h-8 text-sm bg-[#58B09C] hover:bg-[#386150]"
              disabled={!fabTitle.trim()}
              onClick={handleFabAdd}
            >
              Toevoegen
            </Button>
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={cn(
            'flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200',
            'bg-[#58B09C] hover:bg-[#386150] text-white hover:shadow-xl hover:scale-105',
            fabOpen && 'rotate-45 bg-[#386150]'
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
            <DialogDescription>Weet je zeker dat je "{deletingTaak?.titel}" wilt verwijderen?</DialogDescription>
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

// === DAY SECTION (Week view) ===

function DaySection({
  label, sublabel, isToday, isOverdue, tasks, projectMap, showProject,
  onToggle, onEdit, onDelete, onQuickAdd,
}: {
  label: string
  sublabel?: string
  isToday?: boolean
  isOverdue?: boolean
  tasks: Taak[]
  projectMap: Record<string, string>
  showProject: boolean
  onToggle: (taak: Taak) => void
  onEdit: (taak: Taak) => void
  onDelete: (taak: Taak) => void
  onQuickAdd?: (title: string) => void
}) {
  const [addingTitle, setAddingTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={cn(
      'rounded-lg mb-2',
      isToday && 'bg-[#58B09C]/5 border border-[#58B09C]/15',
      isOverdue && 'bg-red-50/50 dark:bg-red-900/5 border border-red-200/30 dark:border-red-800/20',
      !isToday && !isOverdue && 'border border-transparent'
    )}>
      {/* Day header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-semibold',
            isToday && 'text-[#386150] dark:text-[#58B09C]',
            isOverdue && 'text-red-600 dark:text-red-400',
            !isToday && !isOverdue && 'text-foreground'
          )}>
            {label}
          </span>
          {sublabel && !isToday && !isOverdue && (
            <span className="text-xs text-muted-foreground/50">{sublabel}</span>
          )}
          {tasks.length > 0 && (
            <span className="text-[11px] text-muted-foreground/40">{tasks.length}</span>
          )}
        </div>
        {onQuickAdd && (
          <button
            onClick={() => { setIsAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
            className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 p-1 rounded text-muted-foreground/40 hover:text-[#58B09C] transition-all"
            title="Taak toevoegen"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tasks */}
      <div className="px-1">
        {tasks.map((taak) => (
          <TaskRow
            key={taak.id}
            taak={taak}
            projectNaam={projectMap[taak.project_id]}
            showProject={showProject}
            hideDeadline={!isOverdue}
            onToggle={() => onToggle(taak)}
            onEdit={() => onEdit(taak)}
            onDelete={() => onDelete(taak)}
          />
        ))}
      </div>

      {/* Inline quick add per day */}
      {isAdding && onQuickAdd && (
        <div className="px-3 pb-2">
          <Input
            ref={inputRef}
            placeholder="Taak toevoegen..."
            value={addingTitle}
            onChange={(e) => setAddingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && addingTitle.trim()) {
                onQuickAdd(addingTitle.trim())
                setAddingTitle('')
                // Keep open for more
              }
              if (e.key === 'Escape') {
                setIsAdding(false)
                setAddingTitle('')
              }
            }}
            onBlur={() => {
              if (!addingTitle.trim()) {
                setIsAdding(false)
                setAddingTitle('')
              }
            }}
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Empty state for today */}
      {tasks.length === 0 && !isOverdue && !isAdding && (
        <div className="px-3 pb-2">
          {onQuickAdd ? (
            <button
              onClick={() => { setIsAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors py-1"
            >
              <Plus className="w-3 h-3" />
              <span>Taak toevoegen</span>
            </button>
          ) : (
            <p className="text-xs text-muted-foreground/30 py-1">Geen taken</p>
          )}
        </div>
      )}
    </div>
  )
}

// === SIDEBAR ITEM ===

function SidebarItem({
  icon, label, count, active, onClick, compact = false, countColor,
}: {
  icon: React.ReactNode; label: string; count?: number; active: boolean
  onClick: () => void; compact?: boolean; countColor?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 w-full rounded-lg transition-colors text-left',
        compact ? 'px-3 py-1.5 text-sm' : 'px-3 py-2 text-sm',
        active
          ? 'bg-[#58B09C]/10 text-[#386150] dark:text-[#7dd3b8] font-medium'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      <span className={cn(active ? 'text-[#58B09C]' : 'text-muted-foreground/60')}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn('text-xs tabular-nums', countColor || 'text-muted-foreground/50')}>{count}</span>
      )}
    </button>
  )
}

// === TASK ROW ===

function TaskRow({
  taak, projectNaam, showProject, hideDeadline, onToggle, onEdit, onDelete,
}: {
  taak: Taak; projectNaam?: string; showProject: boolean; hideDeadline?: boolean
  onToggle: () => void; onEdit: () => void; onDelete: () => void
}) {
  const isDone = taak.status === 'klaar'
  const isOverdue = !isDone && taak.deadline && new Date(taak.deadline) < new Date()

  return (
    <div className={cn(
      'group flex items-start gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted/40',
      isDone && 'opacity-50'
    )}>
      <button onClick={onToggle} className="mt-0.5 flex-shrink-0 transition-colors">
        {isDone ? (
          <CheckCircle2 className="w-5 h-5 text-[#58B09C]" />
        ) : (
          <Circle className={cn(
            'w-5 h-5 hover:text-[#58B09C] transition-colors',
            taak.prioriteit === 'kritiek' ? 'text-red-400' :
            taak.prioriteit === 'hoog' ? 'text-orange-400' :
            'text-muted-foreground/30'
          )} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm text-foreground', isDone && 'line-through text-muted-foreground')}>
          {taak.titel}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {showProject && projectNaam && (
            <span className="text-xs text-muted-foreground/60 flex items-center gap-0.5">
              <Hash className="w-2.5 h-2.5" />{projectNaam}
            </span>
          )}
          {!hideDeadline && taak.deadline && (
            <span className={cn(
              'text-xs flex items-center gap-0.5',
              isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground/60'
            )}>
              <CalendarDays className="w-2.5 h-2.5" />{formatDate(taak.deadline)}
            </span>
          )}
        </div>
      </div>

      {!isDone && taak.prioriteit !== 'laag' && taak.prioriteit !== 'medium' && (
        <Flag className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', PRIORITEIT_FLAG_COLORS[taak.prioriteit])} />
      )}

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />Bewerken
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
