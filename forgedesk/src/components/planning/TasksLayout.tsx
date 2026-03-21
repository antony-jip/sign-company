import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
  CheckSquare,
  Circle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Hash,
  X,
  GripVertical,
  Clock,
  Check,
  MapPin,
  User2,
  Wrench,
  Users,
  CalendarDays,
  Paperclip,
  FileIcon,
  Upload,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWeekWeather, getWeatherForDate } from './WeatherDayStrip'
import { ModuleHeader } from '@/components/shared/ModuleHeader'
import { useAuth } from '@/contexts/AuthContext'
import { getTaken, createTaak, updateTaak, deleteTaak, getProjecten, getKlanten, getMontageAfspraken, getMedewerkers } from '@/services/supabaseService'
import type { Taak, TaakBijlage, Project, Klant, MontageAfspraak, Medewerker } from '@/types'
import { uploadFile, downloadFile, deleteFile } from '@/services/storageService'
import { logger } from '../../utils/logger'
import { AuditLogPanel } from '@/components/shared/AuditLogPanel'
import { logWijziging } from '@/utils/auditLogger'
import { CompletionPromptModal } from '@/components/shared/CompletionPromptModal'
import { updateProject } from '@/services/supabaseService'

type TaakStatus = Taak['status']
type TaakPrioriteit = Taak['prioriteit']

const PRIORITEIT_ORDER: Record<string, number> = { kritiek: 4, hoog: 3, medium: 2, laag: 1 }

const PRIORITEIT_COLORS: Record<TaakPrioriteit, { border: string; bg: string; accent: string }> = {
  kritiek: { border: 'border-l-mod-werkbonnen-border', bg: 'bg-mod-werkbonnen-light/60', accent: 'text-mod-werkbonnen-text' },
  hoog: { border: 'border-l-mod-offertes-border', bg: 'bg-mod-offertes-light/60', accent: 'text-mod-offertes-text' },
  medium: { border: 'border-l-mod-klanten-border', bg: 'bg-mod-klanten-light/60', accent: 'text-mod-klanten-text' },
  laag: { border: 'border-l-mod-taken-border', bg: 'bg-mod-taken-light/60', accent: 'text-mod-taken-text' },
}

const PRIORITEIT_FLAG_COLORS: Record<TaakPrioriteit, string> = {
  kritiek: 'text-mod-werkbonnen-text', hoog: 'text-mod-offertes-text', medium: 'text-mod-taken-text', laag: 'text-muted-foreground/30',
}

const PRIORITEIT_RING_COLORS: Record<TaakPrioriteit, string> = {
  kritiek: 'border-mod-werkbonnen-border hover:border-mod-werkbonnen-text',
  hoog: 'border-mod-offertes-border hover:border-mod-offertes-text',
  medium: 'border-mod-klanten-border hover:border-mod-klanten-text',
  laag: 'border-mod-taken-border hover:border-mod-taken-text',
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
  klant_id: string
  locatie: string
}

const EMPTY_FORM: TaakFormData = {
  titel: '', beschrijving: '', status: 'todo', prioriteit: 'medium',
  toegewezen_aan: '', deadline: '', geschatte_tijd: 0, bestede_tijd: 0, project_id: '',
  klant_id: '', locatie: '',
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

function getHourFromDeadline(deadline: string | undefined): number | null {
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
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [montageAfspraken, setMontageAfspraken] = useState<MontageAfspraak[]>([])
  const [showMontage, setShowMontage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [taskFilter, setTaskFilter] = useState<'alle' | 'project' | 'los'>('alle')
  const [medewerkerFilter, setMedewerkerFilter] = useState<string>('alle')

  const [viewMode, setViewMode] = useState<'week' | 'maand'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [showCompleted, setShowCompleted] = useState(true)

  // FAB state
  const [fabOpen, setFabOpen] = useState(false)
  const [fabTitle, setFabTitle] = useState('')
  const [fabPriority, setFabPriority] = useState<TaakPrioriteit>('medium')
  const [fabDeadline, setFabDeadline] = useState('')
  const [fabProjectId, setFabProjectId] = useState('')
  const [fabAssignee, setFabAssignee] = useState('')
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

  // Completion prompt
  const [completionPrompt, setCompletionPrompt] = useState<{ open: boolean; projectId: string; projectNaam: string }>({ open: false, projectId: '', projectNaam: '' })

  // Drag state
  const [draggingTaakId, setDraggingTaakId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ dayIndex: number; hour: number } | null>(null)


  // Now-line timer
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      setIsLoading(true)
      try {
        const [takenData, projectenData, klantenData, montageData, medewerkerData] = await Promise.all([getTaken(), getProjecten(), getKlanten(), getMontageAfspraken(), getMedewerkers()])
        if (!cancelled) {
          setTaken(takenData)
          setProjecten(projectenData)
          setKlanten(klantenData)
          setMontageAfspraken(montageData)
          setMedewerkers(medewerkerData)
        }
      } catch (error) {
        logger.error('Fout bij laden:', error)
        if (!cancelled) toast.error('Kon taken niet laden')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

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

  const klantMap = useMemo(() => {
    const map: Record<string, string> = {}
    klanten.forEach((k) => { map[k.id] = k.bedrijfsnaam })
    return map
  }, [klanten])

  const medewerkerMap = useMemo(() => {
    const map: Record<string, Medewerker> = {}
    medewerkers.forEach((m) => { map[m.naam] = m })
    return map
  }, [medewerkers])

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

  const weekWeather = useWeekWeather(weekDays)

  // Tasks grouped by day key
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Taak[]>()
    weekDays.forEach((d) => map.set(d.toDateString(), []))

    let activeTaken = showCompleted ? taken : taken.filter((t) => t.status !== 'klaar')

    // Apply task type filter
    if (taskFilter === 'project') {
      activeTaken = activeTaken.filter((t) => !!t.project_id)
    } else if (taskFilter === 'los') {
      activeTaken = activeTaken.filter((t) => !t.project_id)
    }

    // Apply medewerker filter
    if (medewerkerFilter !== 'alle') {
      if (medewerkerFilter === 'niet-toegewezen') {
        activeTaken = activeTaken.filter((t) => !t.toegewezen_aan)
      } else {
        activeTaken = activeTaken.filter((t) => t.toegewezen_aan === medewerkerFilter)
      }
    }

    activeTaken.forEach((t) => {
      if (!t.deadline) return
      const deadline = new Date(t.deadline ?? "")
      deadline.setHours(0, 0, 0, 0)
      const key = deadline.toDateString()
      if (map.has(key)) {
        map.get(key)!.push(t)
      }
    })

    // Sort each day: scheduled tasks by hour, then unscheduled by priority
    map.forEach((tasks) => {
      tasks.sort((a, b) => {
        const aHour = getHourFromDeadline(a.deadline ?? "")
        const bHour = getHourFromDeadline(b.deadline ?? "")
        // Scheduled tasks first, sorted by hour
        if (aHour !== null && bHour !== null) return aHour - bHour
        if (aHour !== null) return -1
        if (bHour !== null) return 1
        // Unscheduled by priority
        return (PRIORITEIT_ORDER[b.prioriteit] || 0) - (PRIORITEIT_ORDER[a.prioriteit] || 0)
      })
    })

    return map
  }, [taken, weekDays, showCompleted, taskFilter, medewerkerFilter])

  // Montage afspraken grouped by day key
  const montageByDay = useMemo(() => {
    const map = new Map<string, MontageAfspraak[]>()
    if (!showMontage) return map
    weekDays.forEach((d) => map.set(d.toDateString(), []))
    montageAfspraken.forEach((a) => {
      if (!a.datum) return
      const datum = new Date(a.datum)
      datum.setHours(0, 0, 0, 0)
      const key = datum.toDateString()
      if (map.has(key)) {
        map.get(key)!.push(a)
      }
    })
    // Sort by start_tijd
    map.forEach((items) => {
      items.sort((a, b) => (a.start_tijd || '').localeCompare(b.start_tijd || ''))
    })
    return map
  }, [montageAfspraken, weekDays, showMontage])

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

  // === MONTH VIEW DATA ===

  const monthDate = useMemo(() => {
    const d = new Date(today)
    d.setMonth(d.getMonth() + monthOffset)
    d.setDate(1)
    return d
  }, [today, monthOffset])

  const monthLabel = useMemo(() => {
    const fullMonths = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
    return `${fullMonths[monthDate.getMonth()]} ${monthDate.getFullYear()}`
  }, [monthDate])

  // Grid of weeks for the month (6 weeks max, each 7 days)
  const monthGrid = useMemo(() => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDay = getMonday(firstDay) // start from monday
    const weeks: Date[][] = []
    const current = new Date(startDay)
    for (let w = 0; w < 6; w++) {
      const week: Date[] = []
      for (let d = 0; d < 7; d++) {
        week.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      // Stop if the whole week is in the next month
      if (w >= 4 && week[0].getMonth() !== month) break
      weeks.push(week)
    }
    return weeks
  }, [monthDate])

  // Tasks grouped by date string for month view
  const tasksByDateStr = useMemo(() => {
    const map = new Map<string, Taak[]>()
    let activeTaken = showCompleted ? taken : taken.filter((t) => t.status !== 'klaar')
    if (taskFilter === 'project') activeTaken = activeTaken.filter((t) => !!t.project_id)
    else if (taskFilter === 'los') activeTaken = activeTaken.filter((t) => !t.project_id)
    if (medewerkerFilter !== 'alle') {
      if (medewerkerFilter === 'niet-toegewezen') activeTaken = activeTaken.filter((t) => !t.toegewezen_aan)
      else activeTaken = activeTaken.filter((t) => t.toegewezen_aan === medewerkerFilter)
    }
    activeTaken.forEach((t) => {
      if (!t.deadline) return
      const key = t.deadline.split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    })
    return map
  }, [taken, showCompleted, taskFilter, medewerkerFilter])

  const isCurrentMonth = monthOffset === 0

  // === HANDLERS ===

  async function handleQuickAdd(title: string, priority: TaakPrioriteit, deadline: string, projectId: string, assignee?: string) {
    if (!title.trim()) return false
    try {
      const newTaak = await createTaak({
        user_id: user?.id || '',
        titel: title.trim(),
        beschrijving: '',
        status: 'todo',
        prioriteit: priority,
        toegewezen_aan: assignee || '',
        deadline: deadline || undefined,
        geschatte_tijd: 0,
        bestede_tijd: 0,
        project_id: projectId || '',
      })
      setTaken((prev) => [newTaak, ...prev])
      toast.success('Taak aangemaakt')
      return true
    } catch (error) {
      logger.error('Fout bij aanmaken:', error)
      toast.error('Kon taak niet aanmaken')
      return false
    }
  }

  async function handleFabAdd() {
    const ok = await handleQuickAdd(fabTitle, fabPriority, fabDeadline, fabProjectId, fabAssignee)
    if (ok) {
      setFabTitle('')
      setFabPriority('medium')
      setFabDeadline('')
      setFabProjectId('')
      setFabAssignee('')
      fabInputRef.current?.focus()
    }
  }

  async function handleToggleComplete(taak: Taak) {
    const newStatus: TaakStatus = taak.status === 'klaar' ? 'todo' : 'klaar'
    try {
      const updated = await updateTaak(taak.id, { status: newStatus })
      setTaken((prev) => {
        const next = prev.map((t) => (t.id === updated.id ? updated : t))
        // Check: als alle taken van dit project nu 'klaar' zijn → prompt
        if (newStatus === 'klaar' && taak.project_id) {
          const projectTaken = next.filter((t) => t.project_id === taak.project_id)
          const alleKlaar = projectTaken.length > 0 && projectTaken.every((t) => t.status === 'klaar')
          if (alleKlaar) {
            const project = projecten.find((p) => p.id === taak.project_id)
            if (project && project.status !== 'afgerond' && project.status !== 'opgeleverd') {
              setTimeout(() => setCompletionPrompt({ open: true, projectId: project.id, projectNaam: project.naam }), 500)
            }
          }
        }
        return next
      })
      if (newStatus === 'klaar') toast.success('Taak afgerond!')
    } catch (error) {
      logger.error('Fout bij statuswijziging:', error)
      toast.error('Kon taak niet bijwerken')
    }
  }

  async function handleDeleteDirect(taak: Taak) {
    try {
      await deleteTaak(taak.id)
      setTaken((prev) => prev.filter((t) => t.id !== taak.id))
      toast.success('Taak verwijderd')
    } catch (error) {
      logger.error('Fout bij verwijderen:', error)
      toast.error('Kon taak niet verwijderen')
    }
  }

  function openEditDialog(taak: Taak) {
    setEditingTaak(taak)
    setFormData({
      titel: taak.titel, beschrijving: taak.beschrijving, status: taak.status,
      prioriteit: taak.prioriteit, toegewezen_aan: taak.toegewezen_aan,
      deadline: taak.deadline ? taak.deadline.split('T')[0] : '',
      geschatte_tijd: taak.geschatte_tijd, bestede_tijd: taak.bestede_tijd,
      project_id: taak.project_id || '',
      klant_id: taak.klant_id || '',
      locatie: taak.locatie || '',
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
        toegewezen_aan: formData.toegewezen_aan.trim(), deadline: (() => {
          if (!formData.deadline) return undefined
          // Bewaar bestaande tijd als de datum hetzelfde is
          const existing = editingTaak?.deadline
          if (existing && existing.includes('T') && existing.startsWith(formData.deadline)) {
            return existing
          }
          return formData.deadline
        })(),
        geschatte_tijd: formData.geschatte_tijd, bestede_tijd: formData.bestede_tijd,
        project_id: formData.project_id || undefined,
        klant_id: formData.klant_id || undefined,
        locatie: formData.locatie.trim() || undefined,
      })
      setTaken((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      // Audit log
      if (user?.id && editingTaak) {
        const naam = user.voornaam ? `${user.voornaam} ${user.achternaam || ''}`.trim() : user.email || ''
        if (editingTaak.status !== formData.status) {
          logWijziging({ userId: user.id, entityType: 'taak', entityId: editingTaak.id, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: editingTaak.status, nieuweWaarde: formData.status })
        } else {
          logWijziging({ userId: user.id, entityType: 'taak', entityId: editingTaak.id, actie: 'gewijzigd', medewerkerNaam: naam })
        }
      }
      toast.success('Taak bijgewerkt')
      setEditDialogOpen(false)
    } catch (error) {
      logger.error('Fout bij opslaan:', error)
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
      logger.error('Fout bij verwijderen:', error)
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
      logger.error('Fout bij verplaatsen:', error)
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

  // Resize task duration
  async function handleResizeTask(taakId: string, newDurationHours: number) {
    try {
      const updated = await updateTaak(taakId, { geschatte_tijd: newDurationHours })
      setTaken((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch (error) {
      logger.error('Fout bij resizen:', error)
      toast.error('Kon duur niet aanpassen')
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
    <>
      <div className="flex flex-col h-[calc(100vh-120px)] mod-strip mod-strip-taken">
        <ModuleHeader module="taken" icon={Clock} title="Taken" subtitle="Productie & oplevering" />

        {/* === NAV + FILTERS === */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-3 sm:px-5 py-2.5 border-b border-border/60 bg-card/50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold text-foreground tracking-tight whitespace-nowrap capitalize">
              {viewMode === 'week' ? weekLabel : monthLabel}
            </span>
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => viewMode === 'week' ? setWeekOffset((w) => w - 1) : setMonthOffset((m) => m - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant={(viewMode === 'week' ? isCurrentWeek : isCurrentMonth) ? 'default' : 'ghost'}
                size="sm"
                className={cn('h-7 text-xs px-3 rounded-lg', (viewMode === 'week' ? isCurrentWeek : isCurrentMonth) && 'bg-primary hover:bg-wm-hover shadow-sm')}
                onClick={() => viewMode === 'week' ? setWeekOffset(0) : setMonthOffset(0)}
              >
                Vandaag
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => viewMode === 'week' ? setWeekOffset((w) => w + 1) : setMonthOffset((m) => m + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {/* View toggle */}
            <div className="inline-flex items-center rounded-lg border border-black/[0.06] bg-muted p-0.5 flex-shrink-0">
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  'text-xs px-2 py-1 rounded-md transition-all duration-200 whitespace-nowrap',
                  viewMode === 'week' ? 'bg-[#191919] text-white shadow-sm font-medium' : 'text-[#5A5A55] hover:text-foreground'
                )}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('maand')}
                className={cn(
                  'text-xs px-2 py-1 rounded-md transition-all duration-200 whitespace-nowrap flex items-center gap-1',
                  viewMode === 'maand' ? 'bg-[#191919] text-white shadow-sm font-medium' : 'text-[#5A5A55] hover:text-foreground'
                )}
              >
                <CalendarDays className="w-3 h-3" />
                Maand
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <div className="inline-flex items-center rounded-xl border border-black/[0.06] bg-muted p-0.5 flex-shrink-0">
              {([['alle', 'Alle'], ['project', 'Projecttaken'], ['los', 'Losse taken']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTaskFilter(key)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-lg transition-all duration-200 whitespace-nowrap',
                    taskFilter === key
                      ? 'bg-[#191919] text-white shadow-sm font-medium'
                      : 'text-[#5A5A55] hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-all duration-200 whitespace-nowrap flex-shrink-0',
                showCompleted
                  ? 'bg-[#191919] border-transparent text-white shadow-sm'
                  : 'border-border/60 text-[#5A5A55] hover:text-foreground hover:border-border'
              )}
            >
              {showCompleted ? 'Verberg afgerond' : 'Toon afgerond'}
            </button>
            <button
              onClick={() => setShowMontage(!showMontage)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-all duration-200 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5',
                showMontage
                  ? 'bg-[#191919] border-transparent text-white shadow-sm'
                  : 'border-border/60 text-[#5A5A55] hover:text-foreground hover:border-border'
              )}
            >
              <Wrench className="w-3 h-3" />
              {showMontage ? 'Montage zichtbaar' : 'Toon montage'}
            </button>
            {/* Medewerker filter */}
            {medewerkers.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-full border transition-all duration-200 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5',
                      medewerkerFilter !== 'alle'
                        ? 'bg-[#191919] border-transparent text-white shadow-sm'
                        : 'border-border/60 text-[#5A5A55] hover:text-foreground hover:border-border'
                    )}
                  >
                    <Users className="w-3 h-3" />
                    {medewerkerFilter === 'alle' ? 'Medewerker' : medewerkerFilter === 'niet-toegewezen' ? 'Niet toegewezen' : medewerkerFilter}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuItem onClick={() => setMedewerkerFilter('alle')} className={cn(medewerkerFilter === 'alle' && 'font-semibold')}>
                    Alle medewerkers
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {medewerkers.filter(m => m.status === 'actief').map((m) => (
                    <DropdownMenuItem key={m.id} onClick={() => setMedewerkerFilter(m.naam)} className={cn(medewerkerFilter === m.naam && 'font-semibold')}>
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground mr-2 flex-shrink-0">
                        {m.naam?.[0]?.toUpperCase() || '?'}
                      </div>
                      {m.naam}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setMedewerkerFilter('niet-toegewezen')} className={cn(medewerkerFilter === 'niet-toegewezen' && 'font-semibold')}>
                    Niet toegewezen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {viewMode === 'week' && (<>
        {/* === DAY HEADERS (met weer geïntegreerd) === */}
        <div className="flex border-b border-border/60 bg-card/80 backdrop-blur-sm flex-shrink-0">
          {/* Time gutter spacer */}
          <div className="w-14 flex-shrink-0" />
          {/* Day columns headers */}
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today)
            const dayTasks = tasksByDay.get(day.toDateString()) || []
            const isPast = day < today && !isToday
            const dayWeather = getWeatherForDate(weekWeather, day)
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 min-w-0 text-center py-2.5 border-l border-border/40 transition-colors',
                  isToday && 'bg-primary/5'
                )}
              >
                <div className={cn(
                  'text-xs uppercase tracking-label font-bold',
                  isToday ? 'text-primary' : isPast ? 'text-muted-foreground/30' : 'text-muted-foreground/70'
                )}>
                  {DAY_LABELS[i]}
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <span className={cn(
                    'inline-flex items-center justify-center text-sm font-bold font-mono transition-all',
                    isToday
                      ? 'w-8 h-8 rounded-full bg-primary text-white shadow-sm shadow-primary/30'
                      : isPast ? 'text-muted-foreground/30' : 'text-foreground'
                  )}>
                    {day.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className={cn(
                      'text-[10px] font-semibold font-mono tabular-nums px-[10px] py-[3px] rounded-full',
                      isToday
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted/60 text-muted-foreground/50'
                    )}>
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                {/* Weer inline */}
                {dayWeather && (
                  <div className={cn(
                    'flex items-center justify-center gap-1 mt-1',
                    isPast ? 'opacity-30' : 'opacity-70'
                  )}>
                    <span className="text-xs leading-none">{dayWeather.emoji}</span>
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{dayWeather.maxTemp}°</span>
                  </div>
                )}
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
                  <span className="absolute -top-2.5 right-3 text-xs text-muted-foreground/40 font-mono tabular-nums font-medium">
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
                  klantMap={klantMap}
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
                  onResize={handleResizeTask}
                  montageAfspraken={montageByDay.get(day.toDateString()) || []}
                />
              )
            })}
          </div>
        </div>
        </>)}

        {/* === MONTH VIEW === */}
        {viewMode === 'maand' && (
          <div className="flex-1 overflow-y-auto bg-background">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="py-2 text-center text-xs uppercase tracking-label font-bold text-muted-foreground/70">
                  {label}
                </div>
              ))}
            </div>
            {/* Week rows */}
            <div className="grid grid-cols-7 flex-1">
              {monthGrid.flat().map((day, i) => {
                const isToday = isSameDay(day, today)
                const isCurrentMonth = day.getMonth() === monthDate.getMonth()
                const dateStr = toDateStr(day)
                const dayTasks = tasksByDateStr.get(dateStr) || []
                const dayWeather = getWeatherForDate(weekWeather, day)

                return (
                  <div
                    key={i}
                    className={cn(
                      'border-b border-r border-border/30 min-h-[90px] p-1.5 transition-colors',
                      !isCurrentMonth && 'bg-muted/20',
                      isToday && 'bg-primary/[0.04]',
                    )}
                  >
                    {/* Day number + weather */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        'text-xs font-bold font-mono tabular-nums',
                        isToday
                          ? 'w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[11px]'
                          : !isCurrentMonth ? 'text-muted-foreground/25' : 'text-foreground',
                      )}>
                        {day.getDate()}
                      </span>
                      {dayWeather && isCurrentMonth && (
                        <span className="text-[10px] text-muted-foreground/50">{dayWeather.emoji}{dayWeather.maxTemp}°</span>
                      )}
                    </div>
                    {/* Task indicators */}
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 4).map((taak) => {
                        const colors = PRIORITEIT_COLORS[taak.prioriteit]
                        const isDone = taak.status === 'klaar'
                        return (
                          <button
                            key={taak.id}
                            onClick={() => openEditDialog(taak)}
                            className={cn(
                              'w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight truncate border-l-2 transition-all hover:shadow-sm',
                              isDone ? 'line-through bg-muted/30 border-muted-foreground/20 text-muted-foreground/60' : `${colors.bg} ${colors.border}`,
                            )}
                            title={`${taak.titel}${taak.toegewezen_aan ? ` — ${taak.toegewezen_aan}` : ''}`}
                          >
                            <span className={cn('font-medium', isDone ? 'text-muted-foreground' : 'text-foreground')}>
                              {taak.titel}
                            </span>
                            {taak.toegewezen_aan && (
                              <span className="text-muted-foreground/50 ml-1">• {taak.toegewezen_aan.split(' ')[0]}</span>
                            )}
                          </button>
                        )
                      })}
                      {dayTasks.length > 4 && (
                        <span className="text-[9px] text-muted-foreground/40 font-semibold px-1">+{dayTasks.length - 4} meer</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* === FLOATING ACTION BUTTON === */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {fabOpen && (
          <div className="w-80 rounded-xl border border-black/[0.06] bg-card shadow-2xl shadow-black/10 p-4 space-y-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
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
              {medewerkers.length > 0 && (
                <Select value={fabAssignee || 'niemand'} onValueChange={(v) => setFabAssignee(v === 'niemand' ? '' : v)}>
                  <SelectTrigger className="w-auto h-7 text-xs min-w-0 max-w-[120px] rounded-lg">
                    <SelectValue placeholder="Toewijzen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="niemand">Niet toegewezen</SelectItem>
                    {medewerkers.filter(m => m.status === 'actief').map((m) => (
                      <SelectItem key={m.id} value={m.naam}>{m.naam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
            'flex items-center justify-center w-14 h-14 rounded-full shadow-sm transition-all duration-200',
            'bg-[#5A5A55] text-white hover:opacity-90 hover:shadow-md hover:scale-105',
            fabOpen && 'rotate-45'
          )}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Edit dialog */}
      <EditTaskDialog
        open={editDialogOpen} onOpenChange={setEditDialogOpen}
        formData={formData} setFormData={setFormData}
        onSave={handleSave} isSaving={isSaving} projecten={projecten} klanten={klanten}
        medewerkers={medewerkers}
        editingTaak={editingTaak}
        onUpdateTaak={(updated) => setTaken((prev) => prev.map((t) => t.id === updated.id ? updated : t))}
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

      {/* Completion prompt modal */}
      <CompletionPromptModal
        open={completionPrompt.open}
        projectNaam={completionPrompt.projectNaam}
        onClose={() => setCompletionPrompt((prev) => ({ ...prev, open: false }))}
        onUpdateStatus={async (status) => {
          try {
            await updateProject(completionPrompt.projectId, { status })
            toast.success(`Project gemarkeerd als ${status}`)
          } catch {
            toast.error('Kon projectstatus niet bijwerken')
          }
        }}
      />
    </>
  )
}

// === DAY COLUMN ===

function DayColumn({
  day, dayIndex, isToday, isPast, tasks, projectMap, klantMap, nowLineTop,
  draggingTaakId, dropTarget,
  onDragStart, onDragEnd, onDropTargetChange, onDrop,
  onToggle, onEdit, onDelete, onQuickAdd, onQuickAddAtTime, onResize,
  montageAfspraken = [],
}: {
  day: Date
  dayIndex: number
  isToday: boolean
  isPast: boolean
  tasks: Taak[]
  projectMap: Record<string, string>
  klantMap: Record<string, string>
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
  onResize: (taakId: string, newDurationHours: number) => void
  montageAfspraken?: MontageAfspraak[]
}) {
  const [addTitle, setAddTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addingAtHour, setAddingAtHour] = useState<number | null>(null)
  const [hourAddTitle, setHourAddTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const hourInputRef = useRef<HTMLInputElement>(null)

  // Resize state
  const [resizingTaakId, setResizingTaakId] = useState<string | null>(null)
  const [resizeStartY, setResizeStartY] = useState(0)
  const [resizeStartHeight, setResizeStartHeight] = useState(0)
  const [resizeDeltaPx, setResizeDeltaPx] = useState(0)

  const handleResizeStart = useCallback((e: React.MouseEvent, taakId: string, currentHeightPx: number) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingTaakId(taakId)
    setResizeStartY(e.clientY)
    setResizeStartHeight(currentHeightPx)
    setResizeDeltaPx(0)
  }, [])

  useEffect(() => {
    if (!resizingTaakId) return

    function handleMouseMove(e: MouseEvent) {
      const delta = e.clientY - resizeStartY
      setResizeDeltaPx(delta)
    }

    function handleMouseUp(e: MouseEvent) {
      const delta = e.clientY - resizeStartY
      const newHeightPx = Math.max(HOUR_HEIGHT * 0.5, resizeStartHeight + delta)
      // Snap to nearest 15 minutes (quarter hour)
      const rawHours = newHeightPx / HOUR_HEIGHT
      const snapped = Math.max(0.25, Math.round(rawHours * 4) / 4)
      onResize(resizingTaakId!, snapped)
      setResizingTaakId(null)
      setResizeDeltaPx(0)
    }

    // Prevent text selection during resize
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 's-resize'

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingTaakId, resizeStartY, resizeStartHeight, onResize])

  // Separate scheduled and unscheduled tasks
  const scheduledTasks = tasks.filter((t) => getHourFromDeadline(t.deadline ?? "") !== null)
  const unscheduledTasks = tasks.filter((t) => getHourFromDeadline(t.deadline ?? "") === null)

  // Compute overlap columns so tasks at the same time sit side-by-side
  const taskColumns = useMemo(() => {
    const cols: Record<string, { col: number; totalCols: number }> = {}
    if (scheduledTasks.length === 0) return cols

    // Build intervals: [startHour, endHour, taakId]
    const intervals = scheduledTasks.map((t) => {
      const h = getHourFromDeadline(t.deadline)!
      const dur = t.geschatte_tijd || 1
      return { id: t.id, start: h, end: h + dur }
    }).sort((a, b) => a.start - b.start || a.end - b.end)

    // Greedy column assignment
    const assigned: { id: string; start: number; end: number; col: number }[] = []
    for (const iv of intervals) {
      // Find the first column where no existing task overlaps
      let col = 0
      while (assigned.some((a) => a.col === col && a.start < iv.end && a.end > iv.start)) {
        col++
      }
      assigned.push({ ...iv, col })
    }

    // Group overlapping clusters to find totalCols per cluster
    // Two tasks are in the same cluster if they transitively overlap
    const clusters: typeof assigned[] = []
    for (const item of assigned) {
      let merged = false
      for (const cluster of clusters) {
        if (cluster.some((c) => c.start < item.end && c.end > item.start)) {
          cluster.push(item)
          merged = true
          break
        }
      }
      if (!merged) clusters.push([item])
    }

    for (const cluster of clusters) {
      const totalCols = Math.max(...cluster.map((c) => c.col)) + 1
      for (const item of cluster) {
        cols[item.id] = { col: item.col, totalCols }
      }
    }

    return cols
  }, [scheduledTasks])

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
                <div className="w-full rounded-lg border-2 border-dashed border-primary/40 h-10 flex items-center justify-center">
                  <Clock className="w-3 h-3 text-primary/60 mr-1" />
                  <span className="text-[10px] text-primary/60 font-semibold font-mono">{String(hour).padStart(2, '0')}:00</span>
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
                className="absolute top-1 right-1 z-20 opacity-0 group-hover/hour:opacity-100 p-1 rounded-lg text-muted-foreground/25 hover:text-primary hover:bg-primary/10 transition-all duration-200"
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
        const hour = getHourFromDeadline(taak.deadline ?? "")!
        const topPx = (hour - 7) * HOUR_HEIGHT + 4
        const duration = taak.geschatte_tijd || 0
        const isResizing = resizingTaakId === taak.id
        // Height: use geschatte_tijd if > 0, otherwise auto (null)
        const baseHeightPx = duration > 0 ? duration * HOUR_HEIGHT : null
        const heightPx = baseHeightPx !== null
          ? (isResizing ? Math.max(HOUR_HEIGHT * 0.5, baseHeightPx + resizeDeltaPx) : baseHeightPx)
          : null
        // Column positioning for overlapping tasks
        const colInfo = taskColumns[taak.id]
        const colCount = colInfo?.totalCols || 1
        const colIndex = colInfo?.col || 0
        const widthPercent = 100 / colCount
        const leftPercent = colIndex * widthPercent
        return (
          <div
            key={taak.id}
            className={cn('absolute z-10', isResizing && 'z-30')}
            style={{
              top: topPx,
              left: `calc(${leftPercent}% + 4px)`,
              width: `calc(${widthPercent}% - 8px)`,
              height: heightPx !== null ? `${heightPx - 6}px` : undefined,
            }}
          >
            <TaskCard
              taak={taak}
              projectNaam={taak.project_id ? projectMap[taak.project_id] : undefined}
              klantNaam={taak.klant_id ? klantMap[taak.klant_id] : undefined}
              isPast={isPast}
              scheduled
              heightPx={heightPx !== null ? heightPx - 6 : undefined}
              isResizing={isResizing}
              onDragStart={() => onDragStart(taak.id)}
              onDragEnd={onDragEnd}
              onToggle={() => onToggle(taak)}
              onEdit={() => onEdit(taak)}
              onDelete={() => onDelete(taak)}
              onResizeStart={(e) => handleResizeStart(e, taak.id, baseHeightPx || HOUR_HEIGHT)}
            />
          </div>
        )
      })}

      {/* Montage afspraken - subtle gradient overlay BEHIND tasks */}
      {montageAfspraken.map((afspraak) => {
        const startHour = afspraak.start_tijd ? parseInt(afspraak.start_tijd.split(':')[0], 10) : null
        const startMin = afspraak.start_tijd ? parseInt(afspraak.start_tijd.split(':')[1], 10) || 0 : 0
        const endHour = afspraak.eind_tijd ? parseInt(afspraak.eind_tijd.split(':')[0], 10) : null
        const endMin = afspraak.eind_tijd ? parseInt(afspraak.eind_tijd.split(':')[1], 10) || 0 : 0
        if (startHour === null || startHour < 7 || startHour > 19) return null
        const topPx = (startHour - 7) * HOUR_HEIGHT + (startMin / 60) * HOUR_HEIGHT
        const endTotal = endHour !== null && endHour > startHour ? (endHour - 7) * HOUR_HEIGHT + (endMin / 60) * HOUR_HEIGHT : topPx + HOUR_HEIGHT
        const heightPx = Math.max(endTotal - topPx, 20)

        const STATUS_LABELS: Record<string, string> = {
          gepland: 'Gepland', onderweg: 'Onderweg', bezig: 'Bezig', afgerond: 'Afgerond', uitgesteld: 'Uitgesteld',
        }

        const tooltipText = [
          afspraak.titel,
          afspraak.locatie ? `📍 ${afspraak.locatie}` : '',
          `⏰ ${afspraak.start_tijd?.slice(0, 5)} – ${afspraak.eind_tijd?.slice(0, 5)}`,
          STATUS_LABELS[afspraak.status] || afspraak.status,
        ].filter(Boolean).join('\n')

        return (
          <div
            key={`montage-${afspraak.id}`}
            className="absolute z-0 pointer-events-auto"
            style={{
              top: topPx,
              left: 0,
              right: 0,
              height: heightPx,
              background: 'linear-gradient(135deg, rgba(126, 181, 166, 0.12), rgba(126, 181, 166, 0.06))',
              borderLeft: '3px solid rgba(126, 181, 166, 0.4)',
              borderRadius: '4px',
            }}
            title={tooltipText}
          >
            <div className="px-2 py-1 overflow-hidden">
              <div className="text-xs text-muted-foreground/60 truncate font-medium">
                {afspraak.titel}
              </div>
              {afspraak.locatie && (
                <div className="text-xs text-muted-foreground/40 truncate">
                  {afspraak.locatie}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Unscheduled tasks - at top of column */}
      <div className="absolute inset-x-0 top-0 p-1 pt-1.5 flex flex-col gap-1 z-10 pointer-events-none">
        {unscheduledTasks.map((taak) => (
          <div key={taak.id} className="pointer-events-auto">
            <TaskCard
              taak={taak}
              projectNaam={taak.project_id ? projectMap[taak.project_id] : undefined}
              klantNaam={taak.klant_id ? klantMap[taak.klant_id] : undefined}
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
              className="mx-0.5 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground/30 hover:text-primary hover:bg-primary/5 transition-all duration-200"
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
  taak, projectNaam, klantNaam, isPast, scheduled, heightPx, isResizing, onDragStart, onDragEnd, onToggle, onEdit, onDelete, onResizeStart,
}: {
  taak: Taak
  projectNaam?: string
  klantNaam?: string
  isPast: boolean
  scheduled?: boolean
  heightPx?: number
  isResizing?: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onResizeStart?: (e: React.MouseEvent) => void
}) {
  const isDone = taak.status === 'klaar'
  const [justCompleted, setJustCompleted] = useState(false)
  const colors = PRIORITEIT_COLORS[taak.prioriteit]
  const hour = getHourFromDeadline(taak.deadline ?? "")

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

  // Duration label for resized tasks
  const durationLabel = scheduled && taak.geschatte_tijd > 0
    ? (taak.geschatte_tijd >= 1
        ? `${taak.geschatte_tijd}u`
        : `${Math.round(taak.geschatte_tijd * 60)}min`)
    : null

  return (
    <div
      draggable={!isResizing}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative rounded-lg border-l-[3px] border-l-[#5A5A55] px-2.5 py-2 transition-all duration-200',
        !isResizing && 'cursor-grab active:cursor-grabbing',
        'hover:shadow-lg hover:shadow-black/5 hover:z-10 hover:-translate-y-[1px]',
        isDone
          ? 'bg-muted/30 dark:bg-muted/15 border-l-muted-foreground/30'
          : colors.bg,
        isPast && !isDone && 'opacity-60',
        justCompleted && 'scale-95 opacity-50',
        scheduled && 'shadow-sm',
        isResizing && 'ring-2 ring-primary/30 shadow-xl'
      )}
      style={heightPx !== undefined ? { height: heightPx, overflow: 'hidden' } : undefined}
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
            {(taak.prioriteit === 'kritiek' || taak.prioriteit === 'hoog') && !isDone && (
              <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1', taak.prioriteit === 'kritiek' ? 'bg-[#C44830]' : 'bg-[#E8854A]')} title={taak.prioriteit === 'kritiek' ? 'Urgent' : 'Hoog'} />
            )}
            <p className={cn(
              'text-xs font-medium leading-tight text-foreground flex-1',
              isDone && 'line-through text-muted-foreground'
            )}>
              {taak.titel}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {projectNaam && (
              <span className="text-2xs text-muted-foreground/50 flex items-center gap-0.5">
                <Hash className="w-2 h-2" />{projectNaam}
              </span>
            )}
            {!projectNaam && klantNaam && (
              <span className="text-2xs text-muted-foreground/50 flex items-center gap-0.5">
                <User2 className="w-2 h-2" />{klantNaam}
              </span>
            )}
            {taak.toegewezen_aan && (
              <span className="text-2xs text-muted-foreground/50 flex items-center gap-0.5">
                <User2 className="w-2 h-2" />{taak.toegewezen_aan}
              </span>
            )}
            {taak.locatie && (
              <span className="text-2xs text-muted-foreground/40 flex items-center gap-0.5">
                <MapPin className="w-2 h-2" />{taak.locatie}
              </span>
            )}
            {scheduled && hour !== null && (
              <span className="text-2xs text-muted-foreground/40 font-mono flex items-center gap-0.5">
                <Clock className="w-2 h-2" />{String(hour).padStart(2, '0')}:00
              </span>
            )}
            {durationLabel && (
              <span className="text-2xs text-muted-foreground/40 font-medium font-mono">
                {durationLabel}
              </span>
            )}
            {taak.bijlagen && taak.bijlagen.length > 0 && (
              <span className="text-2xs text-muted-foreground/40 flex items-center gap-0.5">
                <Paperclip className="w-2 h-2" />{taak.bijlagen.length}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Delete button - visible on hover */}
          <button
            onClick={handleDeleteClick}
            className="flex-shrink-0 p-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900/30"
            title="Verwijderen"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-red-500 transition-colors" />
          </button>

          {/* Checkbox */}
          <button
            onClick={handleToggle}
            className={cn(
              'flex-shrink-0 p-0.5 rounded-lg transition-all duration-200',
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

      {/* Resize handle - bottom edge for scheduled tasks */}
      {scheduled && onResizeStart && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2.5 cursor-s-resize group/resize z-20 flex items-end justify-center"
          onMouseDown={(e) => { onResizeStart(e) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-8 h-1 rounded-full bg-muted-foreground/0 group-hover:bg-muted-foreground/30 group-hover/resize:bg-primary/50 transition-colors mb-0.5" />
        </div>
      )}

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
  open, onOpenChange, formData, setFormData, onSave, isSaving, projecten, klanten, medewerkers, editingTaak, onUpdateTaak,
}: {
  open: boolean; onOpenChange: (open: boolean) => void
  formData: TaakFormData; setFormData: React.Dispatch<React.SetStateAction<TaakFormData>>
  onSave: () => void; isSaving: boolean; projecten: Project[]; klanten: Klant[]
  medewerkers: Medewerker[]
  editingTaak: Taak | null
  onUpdateTaak: (taak: Taak) => void
}) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function updateField<K extends keyof TaakFormData>(field: K, value: TaakFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const bijlagen: TaakBijlage[] = editingTaak?.bijlagen || []

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0 || !editingTaak) return

    setIsUploading(true)
    try {
      const newBijlagen: TaakBijlage[] = [...bijlagen]
      for (let fi = 0; fi < files.length; fi++) {
        const file = files[fi] as File
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is te groot (max 10MB)`)
          continue
        }
        const path = `taken/${editingTaak.id}/${Date.now()}_${file.name}`
        const uploadedPath = await uploadFile(file, path)
        const url = await downloadFile(uploadedPath)
        newBijlagen.push({
          naam: file.name,
          url,
          type: file.type,
          grootte: file.size,
          uploaded_at: new Date().toISOString(),
        })
      }
      const updated = await updateTaak(editingTaak.id, { bijlagen: newBijlagen } as any)
      onUpdateTaak(updated)
      toast.success(`${files.length === 1 ? 'Bestand' : `${files.length} bestanden`} geüpload`)
    } catch (error) {
      toast.error('Kon bestand niet uploaden')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveBijlage(index: number) {
    if (!editingTaak) return
    const newBijlagen = bijlagen.filter((_, i) => i !== index)
    try {
      const updated = await updateTaak(editingTaak.id, { bijlagen: newBijlagen } as any)
      onUpdateTaak(updated)
      toast.success('Bijlage verwijderd')
    } catch {
      toast.error('Kon bijlage niet verwijderen')
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
            <Label>Type taak</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { updateField('project_id', ''); updateField('klant_id', '') }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  !formData.project_id && !formData.klant_id
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted text-muted-foreground border-transparent'
                }`}
              >
                Intern
              </button>
              <button
                type="button"
                onClick={() => updateField('klant_id', '')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  formData.project_id
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted text-muted-foreground border-transparent'
                }`}
              >
                Projecttaak
              </button>
              <button
                type="button"
                onClick={() => { updateField('project_id', ''); updateField('klant_id', formData.klant_id || '') }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  !formData.project_id && formData.klant_id
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted text-muted-foreground border-transparent'
                }`}
              >
                Losse taak
              </button>
            </div>
          </div>
          {formData.project_id !== undefined && (
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
          )}
          {!formData.project_id && (
            <div className="grid gap-2">
              <Label>Klant (optioneel)</Label>
              <Select value={formData.klant_id || 'geen'} onValueChange={(v) => updateField('klant_id', v === 'geen' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Geen klant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geen">Intern (geen klant)</SelectItem>
                  {klanten.map((k) => (<SelectItem key={k.id} value={k.id}>{k.bedrijfsnaam || k.contactpersoon}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="edit-locatie">Locatie</Label>
            <Input id="edit-locatie" value={formData.locatie} onChange={(e) => updateField('locatie', e.target.value)} placeholder="Bijv. Hoofdstraat 1, Amsterdam" />
          </div>
          <div className="grid gap-2">
            <Label>Toegewezen aan</Label>
            {medewerkers.length > 0 ? (
              <Select value={formData.toegewezen_aan || 'niemand'} onValueChange={(v) => updateField('toegewezen_aan', v === 'niemand' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Niet toegewezen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="niemand">Niet toegewezen</SelectItem>
                  {medewerkers.filter(m => m.status === 'actief').map((m) => (
                    <SelectItem key={m.id} value={m.naam}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground flex-shrink-0">
                          {m.naam?.[0]?.toUpperCase() || '?'}
                        </div>
                        {m.naam}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={formData.toegewezen_aan} onChange={(e) => updateField('toegewezen_aan', e.target.value)} placeholder="Optioneel..." />
            )}
          </div>

          {/* Bijlagen / file upload */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              Bijlagen
            </Label>
            {/* Existing files */}
            {bijlagen.length > 0 && (
              <div className="space-y-1.5">
                {bijlagen.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/40 group">
                    <FileIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{b.naam}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(b.grootte)}</p>
                    </div>
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      title="Openen"
                    >
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                    <button
                      onClick={() => handleRemoveBijlage(i)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !editingTaak}
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {isUploading ? 'Uploaden...' : 'Bestand toevoegen'}
            </Button>
          </div>
        </div>
        {editingTaak?.id && (
          <AuditLogPanel entityType="taak" entityId={editingTaak.id} />
        )}
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
