import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
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
  Search,
  Plus,
  Columns3,
  List,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  CalendarDays,
  User,
  FolderOpen,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react'
import { cn, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { getTaken, createTaak, updateTaak, deleteTaak, getProjecten } from '@/services/supabaseService'
import type { Taak, Project, SortDirection } from '@/types'

// ============ CONSTANTS ============

type ViewMode = 'kanban' | 'table'
type StatusFilter = 'alle' | 'todo' | 'bezig' | 'review' | 'klaar'
type PrioriteitFilter = 'alle' | 'laag' | 'medium' | 'hoog' | 'kritiek'

type TaakStatus = Taak['status']
type TaakPrioriteit = Taak['prioriteit']
type SortField = 'titel' | 'status' | 'prioriteit' | 'toegewezen_aan' | 'deadline' | 'project_id' | 'bestede_tijd'

const STATUS_COLUMNS: { key: TaakStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'Todo', color: 'bg-gray-500' },
  { key: 'bezig', label: 'Bezig', color: 'bg-blue-500' },
  { key: 'review', label: 'Review', color: 'bg-[#58B09C]' },
  { key: 'klaar', label: 'Klaar', color: 'bg-green-500' },
]

const STATUS_LABELS: Record<TaakStatus, string> = {
  todo: 'Todo',
  bezig: 'Bezig',
  review: 'Review',
  klaar: 'Klaar',
}

const PRIORITEIT_LABELS: Record<TaakPrioriteit, string> = {
  laag: 'Laag',
  medium: 'Medium',
  hoog: 'Hoog',
  kritiek: 'Kritiek',
}

const PRIORITEIT_ORDER: Record<string, number> = {
  kritiek: 4,
  hoog: 3,
  medium: 2,
  laag: 1,
}

const STATUS_ORDER: Record<string, number> = {
  todo: 1,
  bezig: 2,
  review: 3,
  klaar: 4,
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

// ============ MAIN COMPONENT ============

export function TasksLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Data state
  const [taken, setTaken] = useState<Taak[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // View & filter state
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [prioriteitFilter, setPrioriteitFilter] = useState<PrioriteitFilter>('alle')
  const [persoonFilter, setPersoonFilter] = useState<string>('alle')

  // Table sort state
  const [sortField, setSortField] = useState<SortField>('deadline')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTaak, setEditingTaak] = useState<Taak | null>(null)
  const [formData, setFormData] = useState<TaakFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTaak, setDeletingTaak] = useState<Taak | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Kanban drag state
  const [draggedTaak, setDraggedTaak] = useState<Taak | null>(null)

  // ============ DATA FETCHING ============

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [takenData, projectenData] = await Promise.all([
        getTaken(),
        getProjecten(),
      ])
      setTaken(takenData)
      setProjecten(projectenData)
    } catch (error) {
      console.error('Fout bij laden van data:', error)
      toast.error('Kon taken niet laden')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ============ DERIVED DATA ============

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {}
    projecten.forEach((p) => {
      map[p.id] = p.naam
    })
    return map
  }, [projecten])

  const uniquePersonen = useMemo(() => {
    const set = new Set<string>()
    taken.forEach((t) => {
      if (t.toegewezen_aan?.trim()) {
        set.add(t.toegewezen_aan.trim())
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nl'))
  }, [taken])

  const filteredTaken = useMemo(() => {
    let result = [...taken]

    if (statusFilter !== 'alle') {
      result = result.filter((t) => t.status === statusFilter)
    }

    if (prioriteitFilter !== 'alle') {
      result = result.filter((t) => t.prioriteit === prioriteitFilter)
    }

    if (persoonFilter !== 'alle') {
      result = result.filter((t) => t.toegewezen_aan === persoonFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (t) =>
          t.titel.toLowerCase().includes(q) ||
          t.beschrijving.toLowerCase().includes(q) ||
          t.toegewezen_aan.toLowerCase().includes(q) ||
          (projectMap[t.project_id] || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [taken, statusFilter, prioriteitFilter, persoonFilter, searchQuery, projectMap])

  const sortedTaken = useMemo(() => {
    return [...filteredTaken].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'titel':
          comparison = a.titel.localeCompare(b.titel, 'nl')
          break
        case 'status':
          comparison = (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0)
          break
        case 'prioriteit':
          comparison = (PRIORITEIT_ORDER[a.prioriteit] || 0) - (PRIORITEIT_ORDER[b.prioriteit] || 0)
          break
        case 'toegewezen_aan':
          comparison = a.toegewezen_aan.localeCompare(b.toegewezen_aan, 'nl')
          break
        case 'deadline':
          comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          break
        case 'project_id':
          comparison = (projectMap[a.project_id] || '').localeCompare(projectMap[b.project_id] || '', 'nl')
          break
        case 'bestede_tijd':
          comparison = a.bestede_tijd - b.bestede_tijd
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredTaken, sortField, sortDirection, projectMap])

  const takenByStatus = useMemo(() => {
    const map: Record<TaakStatus, Taak[]> = {
      todo: [],
      bezig: [],
      review: [],
      klaar: [],
    }
    filteredTaken.forEach((t) => {
      map[t.status]?.push(t)
    })
    // Sort each column by priority (highest first)
    Object.keys(map).forEach((key) => {
      map[key as TaakStatus].sort(
        (a, b) => (PRIORITEIT_ORDER[b.prioriteit] || 0) - (PRIORITEIT_ORDER[a.prioriteit] || 0)
      )
    })
    return map
  }, [filteredTaken])

  // ============ HANDLERS ============

  function openNewDialog() {
    setEditingTaak(null)
    setFormData(EMPTY_FORM)
    setDialogOpen(true)
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
    setDialogOpen(true)
  }

  function openDeleteDialog(taak: Taak) {
    setDeletingTaak(taak)
    setDeleteDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.titel.trim()) {
      toast.error('Titel is verplicht')
      return
    }

    if (!formData.project_id) {
      toast.error('Project is verplicht')
      return
    }

    setIsSaving(true)
    try {
      if (editingTaak) {
        const updated = await updateTaak(editingTaak.id, {
          titel: formData.titel.trim(),
          beschrijving: formData.beschrijving.trim(),
          status: formData.status,
          prioriteit: formData.prioriteit,
          toegewezen_aan: formData.toegewezen_aan.trim(),
          deadline: formData.deadline || new Date().toISOString().split('T')[0],
          geschatte_tijd: formData.geschatte_tijd,
          bestede_tijd: formData.bestede_tijd,
          project_id: formData.project_id,
        })
        setTaken((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        toast.success(`Taak "${updated.titel}" bijgewerkt`)
      } else {
        const newTaak = await createTaak({
          user_id: user?.id || '',
          titel: formData.titel.trim(),
          beschrijving: formData.beschrijving.trim(),
          status: formData.status,
          prioriteit: formData.prioriteit,
          toegewezen_aan: formData.toegewezen_aan.trim(),
          deadline: formData.deadline || new Date().toISOString().split('T')[0],
          geschatte_tijd: formData.geschatte_tijd,
          bestede_tijd: formData.bestede_tijd,
          project_id: formData.project_id,
        })
        setTaken((prev) => [newTaak, ...prev])
        toast.success(`Taak "${newTaak.titel}" aangemaakt`)
      }
      setDialogOpen(false)
    } catch (error) {
      console.error('Fout bij opslaan:', error)
      toast.error('Kon taak niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingTaak) return

    setIsDeleting(true)
    try {
      await deleteTaak(deletingTaak.id)
      setTaken((prev) => prev.filter((t) => t.id !== deletingTaak.id))
      toast.success(`Taak "${deletingTaak.titel}" verwijderd`)
      setDeleteDialogOpen(false)
      setDeletingTaak(null)
    } catch (error) {
      console.error('Fout bij verwijderen:', error)
      toast.error('Kon taak niet verwijderen')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleStatusChange(taak: Taak, newStatus: TaakStatus) {
    try {
      const updated = await updateTaak(taak.id, { status: newStatus })
      setTaken((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      toast.success(`Status gewijzigd naar "${STATUS_LABELS[newStatus]}"`)
    } catch (error) {
      console.error('Fout bij statuswijziging:', error)
      toast.error('Kon status niet wijzigen')
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Kanban drag handlers
  function handleDragStart(e: React.DragEvent, taak: Taak) {
    setDraggedTaak(taak)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taak.id)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  async function handleDrop(e: React.DragEvent, targetStatus: TaakStatus) {
    e.preventDefault()
    if (!draggedTaak || draggedTaak.status === targetStatus) {
      setDraggedTaak(null)
      return
    }
    await handleStatusChange(draggedTaak, targetStatus)
    setDraggedTaak(null)
  }

  function handleDragEnd() {
    setDraggedTaak(null)
  }

  function clearFilters() {
    setSearchQuery('')
    setStatusFilter('alle')
    setPrioriteitFilter('alle')
    setPersoonFilter('alle')
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'alle' ||
    prioriteitFilter !== 'alle' ||
    persoonFilter !== 'alle'

  // ============ RENDER ============

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Taken laden...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">
            Taken
          </h1>
          <Badge variant="secondary" className="text-sm font-medium">
            {filteredTaken.length}
          </Badge>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Taak
        </Button>
      </div>

      {/* Search + View toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Zoek op titel, beschrijving, persoon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center border rounded-md bg-background">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="icon"
            className="rounded-r-none"
            onClick={() => setViewMode('kanban')}
            title="Kanban weergave"
          >
            <Columns3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="icon"
            className="rounded-l-none"
            onClick={() => setViewMode('table')}
            title="Tabel weergave"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Status pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['alle', 'todo', 'bezig', 'review', 'klaar'] as StatusFilter[]).map((f) => {
            const labels: Record<StatusFilter, string> = {
              alle: 'Alle',
              todo: 'Todo',
              bezig: 'Bezig',
              review: 'Review',
              klaar: 'Klaar',
            }
            const dotColors: Record<StatusFilter, string> = {
              alle: '',
              todo: 'bg-gray-500',
              bezig: 'bg-blue-500',
              review: 'bg-[#58B09C]',
              klaar: 'bg-green-500',
            }
            const count = f === 'alle' ? taken.length : taken.filter((t) => t.status === f).length
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5',
                  statusFilter === f
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {dotColors[f] && <span className={cn('w-2 h-2 rounded-full', dotColors[f])} />}
                {labels[f]}
                {count > 0 && <span className="text-[10px] opacity-70">{count}</span>}
              </button>
            )
          })}
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Priority pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['alle', 'kritiek', 'hoog', 'medium', 'laag'] as PrioriteitFilter[]).map((f) => {
            const labels: Record<PrioriteitFilter, string> = {
              alle: 'Alle',
              kritiek: 'Kritiek',
              hoog: 'Hoog',
              medium: 'Medium',
              laag: 'Laag',
            }
            const dotColors: Record<PrioriteitFilter, string> = {
              alle: '',
              kritiek: 'bg-red-500',
              hoog: 'bg-orange-500',
              medium: 'bg-yellow-500',
              laag: 'bg-green-500',
            }
            return (
              <button
                key={f}
                onClick={() => setPrioriteitFilter(f)}
                className={cn(
                  'px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5',
                  prioriteitFilter === f
                    ? 'bg-[#CAF7E2]/30 text-[#386150] dark:bg-[#386150]/30 dark:text-[#7dd3b8]'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {dotColors[f] && <span className={cn('w-2 h-2 rounded-full', dotColors[f])} />}
                {labels[f]}
              </button>
            )
          })}
        </div>

        {uniquePersonen.length > 0 && (
          <>
            <div className="h-4 w-px bg-border hidden sm:block" />
            {/* Person filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setPersoonFilter('alle')}
                className={cn(
                  'px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  persoonFilter === 'alle'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Iedereen
              </button>
              {uniquePersonen.slice(0, 5).map((persoon) => (
                <button
                  key={persoon}
                  onClick={() => setPersoonFilter(persoon)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    persoonFilter === persoon
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {persoon}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      {filteredTaken.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="w-12 h-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-gray-500 dark:text-gray-400 text-center text-lg font-medium">
              {hasActiveFilters
                ? 'Geen taken gevonden met de huidige filters.'
                : 'Nog geen taken aangemaakt.'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters
                ? 'Pas de filters aan om meer resultaten te zien.'
                : 'Maak een nieuwe taak aan om te beginnen.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="link" className="mt-2" onClick={clearFilters}>
                Filters wissen
              </Button>
            ) : (
              <Button className="mt-4" onClick={openNewDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Eerste taak aanmaken
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <KanbanView
          takenByStatus={takenByStatus}
          projectMap={projectMap}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
          onStatusChange={handleStatusChange}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          draggedTaak={draggedTaak}
          navigate={navigate}
        />
      ) : (
        <TableView
          taken={sortedTaken}
          projectMap={projectMap}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
          onStatusChange={handleStatusChange}
          navigate={navigate}
        />
      )}

      {/* Add/Edit Task Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingTaak={editingTaak}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        isSaving={isSaving}
        projecten={projecten}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Taak verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je de taak "{deletingTaak?.titel}" wilt verwijderen?
              Deze actie kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ KANBAN VIEW ============

interface KanbanViewProps {
  takenByStatus: Record<TaakStatus, Taak[]>
  projectMap: Record<string, string>
  onEdit: (taak: Taak) => void
  onDelete: (taak: Taak) => void
  onStatusChange: (taak: Taak, status: TaakStatus) => void
  onDragStart: (e: React.DragEvent, taak: Taak) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, status: TaakStatus) => void
  onDragEnd: () => void
  draggedTaak: Taak | null
  navigate: ReturnType<typeof useNavigate>
}

function KanbanView({
  takenByStatus,
  projectMap,
  onEdit,
  onDelete,
  onStatusChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedTaak,
  navigate,
}: KanbanViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {STATUS_COLUMNS.map((column) => {
        const columnTaken = takenByStatus[column.key]
        const isDragTarget = draggedTaak && draggedTaak.status !== column.key

        return (
          <div
            key={column.key}
            className={cn(
              'flex flex-col rounded-lg border bg-muted/30 transition-colors min-h-[200px]',
              isDragTarget && 'border-primary/50 bg-primary/5'
            )}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, column.key)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full', column.color)} />
                <span className="font-semibold text-sm">{column.label}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {columnTaken.length}
              </Badge>
            </div>

            {/* Column content */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-340px)]">
              {columnTaken.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  Geen taken
                </div>
              ) : (
                columnTaken.map((taak) => (
                  <KanbanCard
                    key={taak.id}
                    taak={taak}
                    projectNaam={projectMap[taak.project_id] || ''}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    isDragging={draggedTaak?.id === taak.id}
                    navigate={navigate}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============ KANBAN CARD ============

interface KanbanCardProps {
  key?: React.Key
  taak: Taak
  projectNaam: string
  onEdit: (taak: Taak) => void
  onDelete: (taak: Taak) => void
  onStatusChange: (taak: Taak, status: TaakStatus) => void
  onDragStart: (e: React.DragEvent, taak: Taak) => void
  onDragEnd: () => void
  isDragging: boolean
  navigate: ReturnType<typeof useNavigate>
}

function KanbanCard({
  taak,
  projectNaam,
  onEdit,
  onDelete,
  onStatusChange,
  onDragStart,
  onDragEnd,
  isDragging,
  navigate,
}: KanbanCardProps) {
  const isOverdue = new Date(taak.deadline) < new Date() && taak.status !== 'klaar'

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, taak)}
      onDragEnd={onDragEnd}
      className={cn(
        'p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all',
        isDragging && 'opacity-50 rotate-2 shadow-lg'
      )}
    >
      {/* Header: priority badge + actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge className={cn('text-[10px] px-1.5 py-0', getPriorityColor(taak.prioriteit))}>
          {PRIORITEIT_LABELS[taak.prioriteit]}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(taak)}>
              <Pencil className="w-4 h-4 mr-2" />
              Bewerken
            </DropdownMenuItem>
            {STATUS_COLUMNS.filter((s) => s.key !== taak.status).map((s) => (
              <DropdownMenuItem key={s.key} onClick={() => onStatusChange(taak, s.key)}>
                <div className={cn('w-3 h-3 rounded-full mr-2', s.color)} />
                Verplaats naar {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              onClick={() => onDelete(taak)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-1">
        {taak.titel}
      </p>

      {/* Description preview */}
      {taak.beschrijving && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {taak.beschrijving}
        </p>
      )}

      {/* Project name */}
      {projectNaam && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/projecten/${taak.project_id}`)
          }}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mb-2"
        >
          <FolderOpen className="w-3 h-3" />
          {projectNaam}
        </button>
      )}

      {/* Footer: assignee, deadline, time */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
        {taak.toegewezen_aan && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{taak.toegewezen_aan}</span>
          </div>
        )}
        {taak.deadline && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
            )}
          >
            <CalendarDays className="w-3 h-3" />
            <span>{formatDate(taak.deadline)}</span>
          </div>
        )}
        {(taak.bestede_tijd > 0 || taak.geschatte_tijd > 0) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{taak.bestede_tijd}u / {taak.geschatte_tijd}u</span>
          </div>
        )}
      </div>
    </Card>
  )
}

// ============ TABLE VIEW ============

interface TableViewProps {
  taken: Taak[]
  projectMap: Record<string, string>
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
  onEdit: (taak: Taak) => void
  onDelete: (taak: Taak) => void
  onStatusChange: (taak: Taak, status: TaakStatus) => void
  navigate: ReturnType<typeof useNavigate>
}

function TableView({
  taken,
  projectMap,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onStatusChange,
  navigate,
}: TableViewProps) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    )
  }

  const columns: { field: SortField; label: string; hiddenOn?: string }[] = [
    { field: 'titel', label: 'Titel' },
    { field: 'project_id', label: 'Project', hiddenOn: 'hidden lg:table-cell' },
    { field: 'status', label: 'Status' },
    { field: 'prioriteit', label: 'Prioriteit' },
    { field: 'toegewezen_aan', label: 'Toegewezen', hiddenOn: 'hidden md:table-cell' },
    { field: 'deadline', label: 'Deadline' },
    { field: 'bestede_tijd', label: 'Tijd', hiddenOn: 'hidden xl:table-cell' },
  ]

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {columns.map(({ field, label, hiddenOn }) => (
                <th key={field} className={cn('text-left py-3 px-4', hiddenOn)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    onClick={() => onSort(field)}
                  >
                    {label}
                    <SortIcon field={field} />
                  </Button>
                </th>
              ))}
              <th className="w-10 py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {taken.map((taak) => {
              const isOverdue = new Date(taak.deadline) < new Date() && taak.status !== 'klaar'

              return (
                <tr
                  key={taak.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                >
                  {/* Titel */}
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-sm text-foreground">{taak.titel}</p>
                      {taak.beschrijving && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {taak.beschrijving}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Project */}
                  <td className="py-3 px-4 hidden lg:table-cell">
                    {projectMap[taak.project_id] ? (
                      <button
                        onClick={() => navigate(`/projecten/${taak.project_id}`)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {projectMap[taak.project_id]}
                      </button>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="cursor-pointer">
                          <Badge className={cn('text-xs', getStatusColor(taak.status))}>
                            {STATUS_LABELS[taak.status]}
                          </Badge>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {STATUS_COLUMNS.map((s) => (
                          <DropdownMenuItem
                            key={s.key}
                            onClick={() => {
                              if (s.key !== taak.status) {
                                onStatusChange(taak, s.key)
                              }
                            }}
                            className={cn(s.key === taak.status && 'font-semibold')}
                          >
                            <div className={cn('w-3 h-3 rounded-full mr-2', s.color)} />
                            {s.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>

                  {/* Prioriteit */}
                  <td className="py-3 px-4">
                    <Badge className={cn('text-xs', getPriorityColor(taak.prioriteit))}>
                      {PRIORITEIT_LABELS[taak.prioriteit]}
                    </Badge>
                  </td>

                  {/* Toegewezen aan */}
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-sm text-foreground">
                      {taak.toegewezen_aan || '-'}
                    </span>
                  </td>

                  {/* Deadline */}
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'text-sm',
                        isOverdue
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : 'text-foreground'
                      )}
                    >
                      {formatDate(taak.deadline)}
                      {isOverdue && (
                        <span className="ml-1 text-xs text-red-500">(verlopen)</span>
                      )}
                    </span>
                  </td>

                  {/* Tijd */}
                  <td className="py-3 px-4 hidden xl:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {taak.bestede_tijd}u / {taak.geschatte_tijd}u
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onEdit(taak)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Bewerken
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                          onClick={() => onDelete(taak)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ============ TASK DIALOG ============

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTaak: Taak | null
  formData: TaakFormData
  setFormData: React.Dispatch<React.SetStateAction<TaakFormData>>
  onSave: () => void
  isSaving: boolean
  projecten: Project[]
}

function TaskDialog({
  open,
  onOpenChange,
  editingTaak,
  formData,
  setFormData,
  onSave,
  isSaving,
  projecten,
}: TaskDialogProps) {
  function updateField<K extends keyof TaakFormData>(field: K, value: TaakFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTaak ? 'Taak bewerken' : 'Nieuwe taak'}
          </DialogTitle>
          <DialogDescription>
            {editingTaak
              ? 'Pas de gegevens van de taak aan.'
              : 'Vul de gegevens in om een nieuwe taak aan te maken.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Titel */}
          <div className="grid gap-2">
            <Label htmlFor="titel">Titel *</Label>
            <Input
              id="titel"
              placeholder="Bijv. Logo ontwerp goedkeuren"
              value={formData.titel}
              onChange={(e) => updateField('titel', e.target.value)}
            />
          </div>

          {/* Beschrijving */}
          <div className="grid gap-2">
            <Label htmlFor="beschrijving">Beschrijving</Label>
            <Textarea
              id="beschrijving"
              placeholder="Beschrijf de taak in meer detail..."
              value={formData.beschrijving}
              onChange={(e) => updateField('beschrijving', e.target.value)}
              rows={3}
            />
          </div>

          {/* Project */}
          <div className="grid gap-2">
            <Label>Project *</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => updateField('project_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer een project" />
              </SelectTrigger>
              <SelectContent>
                {projecten.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.naam}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status & Prioriteit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => updateField('status', value as TaakStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_COLUMNS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2.5 h-2.5 rounded-full', s.color)} />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Prioriteit</Label>
              <Select
                value={formData.prioriteit}
                onValueChange={(value) => updateField('prioriteit', value as TaakPrioriteit)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kritiek">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      Kritiek
                    </div>
                  </SelectItem>
                  <SelectItem value="hoog">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      Hoog
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="laag">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      Laag
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toegewezen aan & Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="toegewezen_aan">Toegewezen aan</Label>
              <Input
                id="toegewezen_aan"
                placeholder="Naam van de persoon"
                value={formData.toegewezen_aan}
                onChange={(e) => updateField('toegewezen_aan', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => updateField('deadline', e.target.value)}
              />
            </div>
          </div>

          {/* Geschatte tijd & Bestede tijd */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="geschatte_tijd">Geschatte tijd (uren)</Label>
              <Input
                id="geschatte_tijd"
                type="number"
                min="0"
                step="0.5"
                value={formData.geschatte_tijd}
                onChange={(e) => updateField('geschatte_tijd', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bestede_tijd">Bestede tijd (uren)</Label>
              <Input
                id="bestede_tijd"
                type="number"
                min="0"
                step="0.5"
                value={formData.bestede_tijd}
                onChange={(e) => updateField('bestede_tijd', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Annuleren
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editingTaak ? 'Opslaan' : 'Aanmaken'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
