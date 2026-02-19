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
  Flag,
  Hash,
  Inbox,
  Search,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { getTaken, createTaak, updateTaak, deleteTaak, getProjecten } from '@/services/supabaseService'
import type { Taak, Project } from '@/types'

type TaakStatus = Taak['status']
type TaakPrioriteit = Taak['prioriteit']
type ViewSection = 'inbox' | 'vandaag' | 'binnenkort' | 'project'

const PRIORITEIT_ORDER: Record<string, number> = {
  kritiek: 4,
  hoog: 3,
  medium: 2,
  laag: 1,
}

const PRIORITEIT_FLAG_COLORS: Record<TaakPrioriteit, string> = {
  kritiek: 'text-red-500',
  hoog: 'text-orange-500',
  medium: 'text-yellow-500',
  laag: 'text-muted-foreground/30',
}

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
  titel: '',
  beschrijving: '',
  status: 'todo',
  prioriteit: 'medium',
  toegewezen_aan: '',
  deadline: '',
  geschatte_tijd: 0,
  bestede_tijd: 0,
  project_id: '',
}

export function TasksLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [taken, setTaken] = useState<Taak[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // View state
  const [activeView, setActiveView] = useState<ViewSection>('inbox')
  const [activeProjectId, setActiveProjectId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Inline add state
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaakPrioriteit>('medium')
  const [newDeadline, setNewDeadline] = useState('')
  const [newProjectId, setNewProjectId] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTaak, setEditingTaak] = useState<Taak | null>(null)
  const [formData, setFormData] = useState<TaakFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTaak, setDeletingTaak] = useState<Taak | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Projects sidebar collapsed
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

  useEffect(() => {
    loadData()
  }, [loadData])

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {}
    projecten.forEach((p) => { map[p.id] = p.naam })
    return map
  }, [projecten])

  // Filtered tasks per view
  const filteredTaken = useMemo(() => {
    let result = [...taken]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (t) =>
          t.titel.toLowerCase().includes(q) ||
          t.beschrijving.toLowerCase().includes(q) ||
          (projectMap[t.project_id] || '').toLowerCase().includes(q)
      )
      // When searching, show all tasks regardless of view
      if (!showCompleted) {
        result = result.filter((t) => t.status !== 'klaar')
      }
      result.sort((a, b) => (PRIORITEIT_ORDER[b.prioriteit] || 0) - (PRIORITEIT_ORDER[a.prioriteit] || 0))
      return result
    }

    // View-specific filters
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    switch (activeView) {
      case 'inbox':
        // All tasks (no project filter)
        break
      case 'vandaag': {
        result = result.filter((t) => {
          if (!t.deadline) return false
          const d = new Date(t.deadline)
          d.setHours(0, 0, 0, 0)
          return d <= today
        })
        break
      }
      case 'binnenkort': {
        result = result.filter((t) => {
          if (!t.deadline) return false
          const d = new Date(t.deadline)
          d.setHours(0, 0, 0, 0)
          return d <= nextWeek
        })
        break
      }
      case 'project':
        result = result.filter((t) => t.project_id === activeProjectId)
        break
    }

    if (!showCompleted) {
      result = result.filter((t) => t.status !== 'klaar')
    }

    // Sort: overdue first, then by priority, then by deadline
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
  }, [taken, activeView, activeProjectId, showCompleted, searchQuery, projectMap])

  const completedCount = useMemo(
    () => taken.filter((t) => t.status === 'klaar').length,
    [taken]
  )

  const todayCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return taken.filter((t) => {
      if (t.status === 'klaar' || !t.deadline) return false
      const d = new Date(t.deadline)
      d.setHours(0, 0, 0, 0)
      return d <= today
    }).length
  }, [taken])

  const binnenkortCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return taken.filter((t) => {
      if (t.status === 'klaar' || !t.deadline) return false
      const d = new Date(t.deadline)
      d.setHours(0, 0, 0, 0)
      return d <= nextWeek
    }).length
  }, [taken])

  // Task counts per project
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

  async function handleQuickAdd() {
    if (!newTitle.trim()) return

    try {
      const projectId = activeView === 'project' ? activeProjectId : newProjectId
      const newTaak = await createTaak({
        user_id: user?.id || '',
        titel: newTitle.trim(),
        beschrijving: '',
        status: 'todo',
        prioriteit: newPriority,
        toegewezen_aan: '',
        deadline: newDeadline || '',
        geschatte_tijd: 0,
        bestede_tijd: 0,
        project_id: projectId || '',
      })
      setTaken((prev) => [newTaak, ...prev])
      setNewTitle('')
      setNewPriority('medium')
      setNewDeadline('')
      setNewProjectId('')
      toast.success('Taak aangemaakt')
      // Keep input focused for rapid entry
      addInputRef.current?.focus()
    } catch (error) {
      console.error('Fout bij aanmaken:', error)
      toast.error('Kon taak niet aanmaken')
    }
  }

  async function handleToggleComplete(taak: Taak) {
    const newStatus: TaakStatus = taak.status === 'klaar' ? 'todo' : 'klaar'
    try {
      const updated = await updateTaak(taak.id, { status: newStatus })
      setTaken((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      if (newStatus === 'klaar') {
        toast.success('Taak afgerond!')
      }
    } catch (error) {
      console.error('Fout bij statuswijziging:', error)
      toast.error('Kon taak niet bijwerken')
    }
  }

  function openEditDialog(taak: Taak) {
    setEditingTaak(taak)
    setFormData({
      titel: taak.titel,
      beschrijving: taak.beschrijving,
      status: taak.status,
      prioriteit: taak.prioriteit,
      toegewezen_aan: taak.toegewezen_aan,
      deadline: taak.deadline ? taak.deadline.split('T')[0] : '',
      geschatte_tijd: taak.geschatte_tijd,
      bestede_tijd: taak.bestede_tijd,
      project_id: taak.project_id,
    })
    setEditDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.titel.trim()) {
      toast.error('Titel is verplicht')
      return
    }
    setIsSaving(true)
    try {
      const updated = await updateTaak(editingTaak!.id, {
        titel: formData.titel.trim(),
        beschrijving: formData.beschrijving.trim(),
        status: formData.status,
        prioriteit: formData.prioriteit,
        toegewezen_aan: formData.toegewezen_aan.trim(),
        deadline: formData.deadline || '',
        geschatte_tijd: formData.geschatte_tijd,
        bestede_tijd: formData.bestede_tijd,
        project_id: formData.project_id,
      })
      setTaken((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      toast.success('Taak bijgewerkt')
      setEditDialogOpen(false)
    } catch (error) {
      console.error('Fout bij opslaan:', error)
      toast.error('Kon taak niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  function openDeleteDialog(taak: Taak) {
    setDeletingTaak(taak)
    setDeleteDialogOpen(true)
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
    } finally {
      setIsDeleting(false)
    }
  }

  function getViewTitle() {
    if (searchQuery.trim()) return `Zoekresultaten`
    switch (activeView) {
      case 'inbox': return 'Inbox'
      case 'vandaag': return 'Vandaag'
      case 'binnenkort': return 'Binnenkort'
      case 'project': return projectMap[activeProjectId] || 'Project'
    }
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
    <div className="flex gap-6 min-h-[calc(100vh-120px)]">
      {/* Sidebar navigation */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0">
        <nav className="space-y-1">
          <SidebarItem
            icon={<Inbox className="w-4 h-4" />}
            label="Inbox"
            count={taken.filter((t) => t.status !== 'klaar').length}
            active={activeView === 'inbox' && !searchQuery}
            onClick={() => { setActiveView('inbox'); setSearchQuery(''); setShowSearch(false) }}
          />
          <SidebarItem
            icon={<CalendarDays className="w-4 h-4" />}
            label="Vandaag"
            count={todayCount}
            active={activeView === 'vandaag' && !searchQuery}
            onClick={() => { setActiveView('vandaag'); setSearchQuery(''); setShowSearch(false) }}
            countColor={todayCount > 0 ? 'text-red-600 dark:text-red-400' : undefined}
          />
          <SidebarItem
            icon={<CalendarDays className="w-4 h-4" />}
            label="Binnenkort"
            count={binnenkortCount}
            active={activeView === 'binnenkort' && !searchQuery}
            onClick={() => { setActiveView('binnenkort'); setSearchQuery(''); setShowSearch(false) }}
          />
        </nav>

        {/* Projects section */}
        <div className="mt-6">
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            {projectsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
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
                    onClick={() => {
                      setActiveView('project')
                      setActiveProjectId(project.id)
                      setSearchQuery('')
                      setShowSearch(false)
                    }}
                    compact
                  />
                ))}
            </nav>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground font-display">
              {getViewTitle()}
            </h1>
            <span className="text-sm text-muted-foreground">
              {filteredTaken.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setShowSearch(!showSearch)
                if (showSearch) setSearchQuery('')
              }}
            >
              <Search className="w-4 h-4" />
            </Button>
            {/* Mobile view selector */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {getViewTitle()}
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setActiveView('inbox'); setSearchQuery('') }}>
                    <Inbox className="w-4 h-4 mr-2" /> Inbox
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setActiveView('vandaag'); setSearchQuery('') }}>
                    <CalendarDays className="w-4 h-4 mr-2" /> Vandaag
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setActiveView('binnenkort'); setSearchQuery('') }}>
                    <CalendarDays className="w-4 h-4 mr-2" /> Binnenkort
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {projecten
                    .filter((p) => p.status === 'actief' || p.status === 'gepland')
                    .map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => {
                          setActiveView('project')
                          setActiveProjectId(p.id)
                          setSearchQuery('')
                        }}
                      >
                        <Hash className="w-4 h-4 mr-2" /> {p.naam}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mb-4">
            <Input
              autoFocus
              placeholder="Zoek taken..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
        )}

        {/* Inline quick-add */}
        {!isAdding ? (
          <button
            onClick={() => {
              setIsAdding(true)
              setTimeout(() => addInputRef.current?.focus(), 50)
            }}
            className="flex items-center gap-2 w-full px-3 py-2.5 mb-4 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors group border border-transparent hover:border-border/50"
          >
            <Plus className="w-4 h-4 text-[#58B09C] group-hover:text-[#386150]" />
            <span>Taak toevoegen</span>
          </button>
        ) : (
          <div className="mb-4 rounded-lg border border-border bg-card p-3 space-y-3">
            <Input
              ref={addInputRef}
              placeholder="Wat moet je doen?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTitle.trim()) handleQuickAdd()
                if (e.key === 'Escape') {
                  setIsAdding(false)
                  setNewTitle('')
                  setNewDeadline('')
                  setNewPriority('medium')
                  setNewProjectId('')
                }
              }}
              className="border-0 shadow-none px-0 text-base focus-visible:ring-0 placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center gap-2 flex-wrap">
              {/* Deadline picker */}
              <Input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-auto h-7 text-xs"
              />
              {/* Priority picker */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <Flag className={`w-3 h-3 ${PRIORITEIT_FLAG_COLORS[newPriority]}`} />
                    {newPriority === 'medium' ? 'Prioriteit' : newPriority.charAt(0).toUpperCase() + newPriority.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(['kritiek', 'hoog', 'medium', 'laag'] as TaakPrioriteit[]).map((p) => (
                    <DropdownMenuItem key={p} onClick={() => setNewPriority(p)}>
                      <Flag className={`w-3.5 h-3.5 mr-2 ${PRIORITEIT_FLAG_COLORS[p]}`} />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Project picker (only if not already in project view) */}
              {activeView !== 'project' && (
                <Select value={newProjectId} onValueChange={setNewProjectId}>
                  <SelectTrigger className="w-auto h-7 text-xs min-w-0">
                    <SelectValue placeholder="Project (optioneel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geen">Geen project</SelectItem>
                    {projecten.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setIsAdding(false)
                  setNewTitle('')
                  setNewDeadline('')
                  setNewPriority('medium')
                  setNewProjectId('')
                }}
              >
                Annuleren
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs bg-[#58B09C] hover:bg-[#386150]"
                disabled={!newTitle.trim()}
                onClick={handleQuickAdd}
              >
                Toevoegen
              </Button>
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="space-y-px">
          {filteredTaken.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">
                {searchQuery ? 'Geen taken gevonden' : 'Alles afgevinkt!'}
              </p>
              <p className="text-xs mt-1 text-muted-foreground/60">
                {searchQuery ? 'Probeer een andere zoekopdracht' : 'Voeg een nieuwe taak toe om te beginnen'}
              </p>
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
                onDelete={() => openDeleteDialog(taak)}
              />
            ))
          )}
        </div>

        {/* Show completed toggle */}
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

      {/* Edit dialog */}
      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        isSaving={isSaving}
        projecten={projecten}
      />

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Taak verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je "{deletingTaak?.titel}" wilt verwijderen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// === SIDEBAR ITEM ===

function SidebarItem({
  icon,
  label,
  count,
  active,
  onClick,
  compact = false,
  countColor,
}: {
  icon: React.ReactNode
  label: string
  count?: number
  active: boolean
  onClick: () => void
  compact?: boolean
  countColor?: string
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
      <span className={cn(active ? 'text-[#58B09C]' : 'text-muted-foreground/60')}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn('text-xs tabular-nums', countColor || 'text-muted-foreground/50')}>
          {count}
        </span>
      )}
    </button>
  )
}

// === TASK ROW ===

function TaskRow({
  taak,
  projectNaam,
  showProject,
  onToggle,
  onEdit,
  onDelete,
}: {
  taak: Taak
  projectNaam?: string
  showProject: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const isDone = taak.status === 'klaar'
  const isOverdue = !isDone && taak.deadline && new Date(taak.deadline) < new Date()

  return (
    <div className={cn(
      'group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-muted/40',
      isDone && 'opacity-50'
    )}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="mt-0.5 flex-shrink-0 transition-colors"
      >
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

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm text-foreground',
          isDone && 'line-through text-muted-foreground'
        )}>
          {taak.titel}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {taak.beschrijving && (
            <span className="text-xs text-muted-foreground/60 truncate max-w-[200px]">
              {taak.beschrijving}
            </span>
          )}
          {showProject && projectNaam && (
            <span className="text-xs text-muted-foreground/60 flex items-center gap-0.5">
              <Hash className="w-2.5 h-2.5" />
              {projectNaam}
            </span>
          )}
          {taak.deadline && (
            <span className={cn(
              'text-xs flex items-center gap-0.5',
              isOverdue
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-muted-foreground/60'
            )}>
              <CalendarDays className="w-2.5 h-2.5" />
              {formatDate(taak.deadline)}
            </span>
          )}
        </div>
      </div>

      {/* Priority flag */}
      {!isDone && taak.prioriteit !== 'laag' && taak.prioriteit !== 'medium' && (
        <Flag className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', PRIORITEIT_FLAG_COLORS[taak.prioriteit])} />
      )}

      {/* Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Bewerken
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 dark:text-red-400"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// === EDIT TASK DIALOG ===

function EditTaskDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSave,
  isSaving,
  projecten,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: TaakFormData
  setFormData: React.Dispatch<React.SetStateAction<TaakFormData>>
  onSave: () => void
  isSaving: boolean
  projecten: Project[]
}) {
  function updateField<K extends keyof TaakFormData>(field: K, value: TaakFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Taak bewerken</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-titel">Titel</Label>
            <Input
              id="edit-titel"
              value={formData.titel}
              onChange={(e) => updateField('titel', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-beschrijving">Beschrijving</Label>
            <Textarea
              id="edit-beschrijving"
              value={formData.beschrijving}
              onChange={(e) => updateField('beschrijving', e.target.value)}
              rows={3}
              placeholder="Optioneel..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Prioriteit</Label>
              <Select
                value={formData.prioriteit}
                onValueChange={(v) => updateField('prioriteit', v as TaakPrioriteit)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Input
                id="edit-deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => updateField('deadline', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Project (optioneel)</Label>
            <Select
              value={formData.project_id || 'geen'}
              onValueChange={(v) => updateField('project_id', v === 'geen' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Geen project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="geen">Geen project</SelectItem>
                {projecten.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-toegewezen">Toegewezen aan</Label>
            <Input
              id="edit-toegewezen"
              value={formData.toegewezen_aan}
              onChange={(e) => updateField('toegewezen_aan', e.target.value)}
              placeholder="Optioneel..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Annuleren
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
