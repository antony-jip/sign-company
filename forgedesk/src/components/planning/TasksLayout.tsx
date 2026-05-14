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
  User2,
  Wrench,
  FilePlus,
  Paperclip,
  FileText,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  ExternalLink,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
// DOEN design — ModuleHeader verwijderd
import { useAuth } from '@/contexts/AuthContext'
import { getTaken, createTaak, updateTaak, deleteTaak, getProjecten, getKlanten, getMontageAfspraken, getOffertes, uploadTaakBijlage, getMedewerkers } from '@/services/supabaseService'
import { getDisplayFilename } from '@/services/projectService'
import type { Taak, Project, Klant, MontageAfspraak, Offerte, Medewerker } from '@/types'
import { logger } from '../../utils/logger'
import { AuditLogPanel } from '@/components/shared/AuditLogPanel'
import { logWijziging } from '@/utils/auditLogger'
import { CompletionPromptModal } from '@/components/shared/CompletionPromptModal'
import { DatePicker } from '@/components/ui/date-picker'
import { updateProject, getProject } from '@/services/supabaseService'
import { MedewerkerFilterCombobox } from '@/components/shared/MedewerkerFilterCombobox'
import { Checkbox } from '@/components/ui/checkbox'
import { TakenBulkActionBar } from '@/components/planning/TakenBulkActionBar'
import { getAvatarStyle as getLaneAvatarStyle } from '@/utils/medewerkerAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useOptimisticState } from '@/hooks/useOptimistic'
import { SelectionRectangle } from '@/components/planning/SelectionRectangle'

const TAKEN_FILTER_OVERRIDE_KEY = 'doen_taken_filter_override'
const TAKEN_FILTER_MIGRATION_V2 = 'doen_taken_filter_migration_v2'
const SWIMLANE_COLLAPSED_KEY = 'doen_taken_swimlane_collapsed'
const SWIMLANE_UNASSIGNED_KEY = '__ongetoewezen__'

function getLaneInitials(naam: string): string {
  return naam.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

type TaakStatus = Taak['status']
type TaakPrioriteit = Taak['prioriteit']

const PRIORITEIT_ORDER: Record<string, number> = { kritiek: 4, hoog: 3, medium: 2, laag: 1 }

const PRIORITEIT_COLORS: Record<TaakPrioriteit, { border: string; bg: string; text: string; dot: string }> = {
  kritiek: { border: '#E04A28', bg: '#FDE8E2', text: '#C03A18', dot: '#E04A28' },
  hoog: { border: '#C49A30', bg: '#F5F2E8', text: '#8A6A2A', dot: '#C49A30' },
  medium: { border: '#4A7AC7', bg: '#E8EEF9', text: '#3A5A9A', dot: '#4A7AC7' },
  laag: { border: '#B0ADA8', bg: '#F0EFEC', text: '#6B6B66', dot: '#B0ADA8' },
}

const PRIORITEIT_FLAG_COLORS: Record<TaakPrioriteit, string> = {
  kritiek: 'text-[#C03A18]', hoog: 'text-[#8A6A2A]', medium: 'text-[#3A5A9A]', laag: 'text-[#B0ADA8]',
}

const PRIORITEIT_RING_COLORS: Record<TaakPrioriteit, string> = {
  kritiek: 'border-[#E04A28] hover:border-[#C03A18]',
  hoog: 'border-[#C49A30] hover:border-[#8A6A2A]',
  medium: 'border-[#4A7AC7] hover:border-[#3A5A9A]',
  laag: 'border-[#B0ADA8] hover:border-[#6B6B66]',
}

// Deterministic project color from name
const PROJECT_COLORS = ['#1A535C', '#F15025', '#2D6B48', '#3A6B8C', '#9A5A48', '#6A5A8A', '#C44830', '#5A5A55']
function getProjectColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length]
}

const DAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const MONTH_NAMES = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const HOURS = Array.from({ length: 24 }, (_, i) => i) // 00:00 - 23:00
const HOUR_HEIGHT_DEFAULT = 44
const HOUR_HEIGHT_MIN = 36
const HOUR_HEIGHT_MAX = 80
const ZOOM_STORAGE_KEY = 'doen_taken_zoom'

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
  bijlagen: string[]
}

const EMPTY_FORM: TaakFormData = {
  titel: '', beschrijving: '', status: 'todo', prioriteit: 'medium',
  toegewezen_aan: '', deadline: '', geschatte_tijd: 0, bestede_tijd: 0, project_id: '',
  klant_id: '', locatie: '', bijlagen: [],
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

// Hour kan fractioneel zijn (10.5 = 10:30) zodat je tasks ook op halve uren
// kunt plannen — anders kunnen twee tasks niet direct onder elkaar staan.
function toDateTimeStr(d: Date, hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  return `${toDateStr(d)}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

function getHourFromDeadline(deadline: string | undefined): number | null {
  if (!deadline || !deadline.includes('T')) return null
  const timePart = deadline.split('T')[1]
  if (!timePart) return null
  const [hStr, mStr] = timePart.split(':')
  const hour = parseInt(hStr, 10)
  const minute = parseInt(mStr || '0', 10)
  if (isNaN(hour) || hour < 0 || hour >= 24) return null
  return hour + (isNaN(minute) ? 0 : minute / 60)
}

// Format een fractioneel uur als "HH:MM"
function formatHourLabel(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// === MAIN COMPONENT ===

export function TasksLayout() {
  const { user } = useAuth()

  const [taken, setTaken] = useState<Taak[]>([])
  const runOptimistic = useOptimisticState(setTaken)
  const [projecten, setProjecten] = useState<Project[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [montageAfspraken, setMontageAfspraken] = useState<MontageAfspraak[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])

  const medewerkerNaam = (() => {
    if (!user) return ''
    const matched = medewerkers.find((m) => m.user_id === user.id)
    if (matched?.naam) return matched.naam
    if (user.user_metadata?.voornaam) {
      return `${user.user_metadata.voornaam} ${user.user_metadata.achternaam || ''}`.trim()
    }
    return user.email || ''
  })()

  const [showMontage, setShowMontage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [taskFilter, setTaskFilter] = useState<'alle' | 'project' | 'los'>('alle')

  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [viewMode, setViewMode] = useState<'week' | 'maand' | 'swimlane'>('week')
  const [collapsedAssignees, setCollapsedAssignees] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(SWIMLANE_COLLAPSED_KEY)
      if (raw) return new Set(JSON.parse(raw))
    } catch (err) { /* ignore */ }
    return new Set()
  })
  const toggleAssigneeCollapsed = useCallback((key: string) => {
    setCollapsedAssignees((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      try { localStorage.setItem(SWIMLANE_COLLAPSED_KEY, JSON.stringify([...next])) } catch (err) { /* ignore */ }
      return next
    })
  }, [])
  const [hourHeight, setHourHeight] = useState(() => {
    try { const v = parseInt(localStorage.getItem(ZOOM_STORAGE_KEY) || '', 10); return v >= HOUR_HEIGHT_MIN && v <= HOUR_HEIGHT_MAX ? v : HOUR_HEIGHT_DEFAULT } catch (err) { return HOUR_HEIGHT_DEFAULT }
  })
  const HOUR_HEIGHT = hourHeight
  const handleZoom = useCallback((delta: number) => {
    setHourHeight(prev => {
      const next = Math.max(HOUR_HEIGHT_MIN, Math.min(HOUR_HEIGHT_MAX, prev + delta))
      localStorage.setItem(ZOOM_STORAGE_KEY, String(next))
      return next
    })
  }, [])
  const [showCompleted, setShowCompleted] = useState(false)
  const [medewerkerFilter, setMedewerkerFilter] = useState<string>('')
  const [filterInitialized, setFilterInitialized] = useState(false)

  const handleMedewerkerFilterChange = useCallback((value: string) => {
    setMedewerkerFilter(value)
    try { localStorage.setItem(TAKEN_FILTER_OVERRIDE_KEY, value) } catch (err) { /* ignore */ }
  }, [])
  const [expandedPastDays, setExpandedPastDays] = useState<Set<string>>(new Set())
  const togglePastDay = useCallback((key: string) => {
    setExpandedPastDays(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }, [])

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

  // Completion prompt
  const [completionPrompt, setCompletionPrompt] = useState<{ open: boolean; projectId: string; projectNaam: string }>({ open: false, projectId: '', projectNaam: '' })

  // Month-view inline add
  const [monthAddingDay, setMonthAddingDay] = useState<string | null>(null)
  const [monthAddTitle, setMonthAddTitle] = useState('')
  const monthAddInputRef = useRef<HTMLInputElement>(null)
  const [monthDropDay, setMonthDropDay] = useState<string | null>(null)

  // Drag state
  const [draggingTaakId, setDraggingTaakId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ dayIndex: number; hour: number } | null>(null)

  // Bulk-selectie: swimlane via per-row checkboxes; week via drag-rectangle.
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

  const toggleTaskSelected = useCallback((id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const toggleTaskGroupSelected = useCallback((ids: string[]) => {
    setSelectedTaskIds((prev) => {
      if (ids.length === 0) return prev
      const next = new Set(prev)
      const allSelected = ids.every((id) => next.has(id))
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedTaskIds(new Set()), [])

  // Pending deletes: taken worden meteen uit de UI gehaald maar pas na 5s
  // daadwerkelijk server-side verwijderd. Undo binnen die 5s annuleert de delete.
  // Bij unmount flushen we alles direct zodat "weg en terug" niets verrast.
  const pendingDeletesRef = useRef<Map<string, { taak: Taak; timer: ReturnType<typeof setTimeout> }>>(new Map())
  const [bulkBusy, setBulkBusy] = useState(false)

  const flushPendingDeletes = useCallback(() => {
    const entries = [...pendingDeletesRef.current.entries()]
    pendingDeletesRef.current.clear()
    entries.forEach(([id, { timer }]) => {
      clearTimeout(timer)
      deleteTaak(id).catch((err) => logger.error('flush delete:', err))
    })
  }, [])

  useEffect(() => {
    return () => {
      flushPendingDeletes()
    }
  }, [flushPendingDeletes])

  const runBulkUpdate = useCallback(
    async (
      mkPatch: (t: Taak) => Partial<Taak>,
      label: string,
      revertFields: (keyof Taak)[]
    ) => {
      const ids = [...selectedTaskIds]
      if (ids.length === 0) return
      const snapshot = taken.filter((t) => selectedTaskIds.has(t.id)).map((t) => ({ ...t }))
      const patches = new Map<string, Partial<Taak>>()
      snapshot.forEach((t) => patches.set(t.id, mkPatch(t)))

      setTaken((prev) => prev.map((t) => {
        const p = patches.get(t.id)
        return p ? { ...t, ...p } : t
      }))
      clearSelection()
      setBulkBusy(true)
      try {
        await Promise.all(ids.map((id) => updateTaak(id, patches.get(id)!)))
      } catch (err) {
        logger.error('bulk update:', err)
        setTaken((prev) => prev.map((t) => snapshot.find((s) => s.id === t.id) || t))
        toast.error('Kon taken niet bijwerken')
        setBulkBusy(false)
        return
      }
      if (user?.id) {
        for (const id of ids) {
          const patch = patches.get(id)
          const oude = snapshot.find((s) => s.id === id)
          if (!patch || !oude) continue
          if (patch.status && patch.status !== oude.status) {
            logWijziging({ userId: user.id, entityType: 'taak', entityId: id, actie: 'status_gewijzigd', medewerkerNaam, veld: 'status', oudeWaarde: oude.status, nieuweWaarde: patch.status })
          }
          if (patch.toegewezen_aan !== undefined && patch.toegewezen_aan !== oude.toegewezen_aan) {
            logWijziging({ userId: user.id, entityType: 'taak', entityId: id, actie: 'gewijzigd', medewerkerNaam, veld: 'toewijzing', oudeWaarde: oude.toegewezen_aan || undefined, nieuweWaarde: patch.toegewezen_aan || undefined })
          }
        }
      }
      setBulkBusy(false)

      toast.success(`${ids.length} ${ids.length === 1 ? 'taak' : 'taken'} ${label}`, {
        duration: 5000,
        action: {
          label: 'Ongedaan maken',
          onClick: async () => {
            setTaken((prev) => prev.map((t) => {
              const s = snapshot.find((x) => x.id === t.id)
              if (!s) return t
              const revert: Partial<Taak> = {}
              revertFields.forEach((f) => { (revert as Record<string, unknown>)[f as string] = s[f] })
              return { ...t, ...revert }
            }))
            try {
              await Promise.all(snapshot.map((s) => {
                const revert: Partial<Taak> = {}
                revertFields.forEach((f) => { (revert as Record<string, unknown>)[f as string] = s[f] })
                return updateTaak(s.id, revert)
              }))
            } catch (err) {
              logger.error('bulk undo:', err)
              toast.error('Kon niet ongedaan maken')
            }
          },
        },
      })
    },
    [selectedTaskIds, taken, clearSelection, user, medewerkerNaam]
  )

  const handleBulkMove = useCallback(
    (newDate: string) => {
      if (!newDate) return
      return runBulkUpdate(
        (t) => {
          const timePart = t.deadline && t.deadline.includes('T') ? t.deadline.split('T')[1] : null
          const deadline = timePart ? `${newDate}T${timePart}` : newDate
          return { deadline }
        },
        'verplaatst',
        ['deadline']
      )
    },
    [runBulkUpdate]
  )

  const handleBulkAssign = useCallback(
    (naam: string) => {
      return runBulkUpdate(() => ({ toegewezen_aan: naam }), 'toegewezen', ['toegewezen_aan'])
    },
    [runBulkUpdate]
  )

  const handleBulkStatus = useCallback(
    (status: TaakStatus) => {
      return runBulkUpdate(() => ({ status }), 'bijgewerkt', ['status'])
    },
    [runBulkUpdate]
  )

  const handleBulkDelete = useCallback(() => {
    const ids = [...selectedTaskIds]
    if (ids.length === 0) return
    const snapshot = taken.filter((t) => selectedTaskIds.has(t.id)).map((t) => ({ ...t }))

    setTaken((prev) => prev.filter((t) => !selectedTaskIds.has(t.id)))
    clearSelection()

    ids.forEach((id) => {
      const taak = snapshot.find((t) => t.id === id)
      if (!taak) return
      const timer = setTimeout(() => {
        pendingDeletesRef.current.delete(id)
        deleteTaak(id).catch((err) => logger.error('delete:', err))
      }, 5000)
      pendingDeletesRef.current.set(id, { taak, timer })
    })

    toast.success(`${ids.length} ${ids.length === 1 ? 'taak verwijderd' : 'taken verwijderd'}`, {
      duration: 5000,
      action: {
        label: 'Ongedaan maken',
        onClick: () => {
          ids.forEach((id) => {
            const entry = pendingDeletesRef.current.get(id)
            if (entry) {
              clearTimeout(entry.timer)
              pendingDeletesRef.current.delete(id)
            }
          })
          setTaken((prev) => {
            const existing = new Set(prev.map((t) => t.id))
            const missing = snapshot.filter((t) => !existing.has(t.id))
            return missing.length > 0 ? [...prev, ...missing] : prev
          })
        },
      },
    })
  }, [selectedTaskIds, taken, clearSelection])

  // === DRAG-RECTANGLE SELECT (week-view) ===
  const rectStartRef = useRef<{ x: number; y: number } | null>(null)
  const rectMovedRef = useRef(false)
  const [rectBox, setRectBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const DRAG_RECT_THRESHOLD_PX = 5

  const handleGridMouseDown = useCallback((e: React.MouseEvent) => {
    if (viewMode !== 'week') return
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-taak-id], [data-add-hour-btn], input, textarea, button')) return
    rectStartRef.current = { x: e.clientX, y: e.clientY }
    rectMovedRef.current = false
    e.preventDefault()
  }, [viewMode])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const start = rectStartRef.current
      if (!start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (!rectMovedRef.current) {
        if (Math.abs(dx) < DRAG_RECT_THRESHOLD_PX && Math.abs(dy) < DRAG_RECT_THRESHOLD_PX) return
        rectMovedRef.current = true
        document.body.style.userSelect = 'none'
      }
      setRectBox({
        left: Math.min(start.x, e.clientX),
        top: Math.min(start.y, e.clientY),
        width: Math.abs(dx),
        height: Math.abs(dy),
      })
    }
    function onUp(e: MouseEvent) {
      const start = rectStartRef.current
      if (!start) return
      rectStartRef.current = null
      document.body.style.userSelect = ''
      if (!rectMovedRef.current) {
        setRectBox(null)
        setSelectedTaskIds(new Set())
        return
      }
      const box = {
        left: Math.min(start.x, e.clientX),
        top: Math.min(start.y, e.clientY),
        right: Math.max(start.x, e.clientX),
        bottom: Math.max(start.y, e.clientY),
      }
      const next = new Set<string>()
      document.querySelectorAll<HTMLElement>('[data-taak-id]').forEach((el) => {
        const r = el.getBoundingClientRect()
        const overlaps = !(r.right < box.left || r.left > box.right || r.bottom < box.top || r.top > box.bottom)
        if (overlaps) {
          const id = el.getAttribute('data-taak-id')
          if (id) next.add(id)
        }
      })
      setRectBox(null)
      setSelectedTaskIds(next)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // Keyboard bulk-delete in week-view: Delete / Backspace removes the
  // currently selected taken via the existing undo flow. Skipped when the
  // user is typing in an input/textarea so Backspace still deletes chars.
  const handleBulkDeleteRef = useRef(handleBulkDelete)
  useEffect(() => { handleBulkDeleteRef.current = handleBulkDelete })
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (viewMode !== 'week') return
      if (selectedTaskIds.size === 0) return
      const ae = document.activeElement as HTMLElement | null
      const tag = ae?.tagName
      const inEditable = tag === 'INPUT' || tag === 'TEXTAREA' || ae?.isContentEditable
      if (e.key === 'Escape' && !inEditable) {
        e.preventDefault()
        setSelectedTaskIds(new Set())
        return
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (inEditable) return
      e.preventDefault()
      handleBulkDeleteRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewMode, selectedTaskIds])


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
        const [takenData, projectenData, klantenData, montageData, offertesData, medewerkersData] = await Promise.all([getTaken(), getProjecten(), getKlanten(), getMontageAfspraken(), getOffertes(), getMedewerkers()])
        if (!cancelled) {
          setTaken(takenData)
          setProjecten(projectenData)
          setKlanten(klantenData)
          setMontageAfspraken(montageData)
          setOffertes(offertesData)
          setMedewerkers(medewerkersData)
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

  // Scroll to current time on load — fallback naar 07:00 buiten werkuren
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      const nowHour = new Date().getHours()
      const withinWerkuren = nowHour >= 6 && nowHour <= 20
      const targetHour = withinWerkuren ? Math.max(0, nowHour - 1) : 7
      scrollRef.current.scrollTop = targetHour * HOUR_HEIGHT
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

  const offerteMap = useMemo(() => {
    const map: Record<string, Offerte> = {}
    offertes.forEach((o) => { map[o.id] = o })
    return map
  }, [offertes])

  const currentMedewerker = useMemo(() => {
    if (!user) return null
    return medewerkers.find((m) => m.user_id === user.id)
      || medewerkers.find((m) => m.email?.toLowerCase() === user.email?.toLowerCase())
      || null
  }, [medewerkers, user])

  useEffect(() => {
    setSelectedTaskIds(new Set())
  }, [viewMode])

  useEffect(() => {
    if (filterInitialized) return
    if (medewerkers.length === 0) return
    try {
      if (localStorage.getItem(TAKEN_FILTER_MIGRATION_V2) !== '1') {
        localStorage.removeItem(TAKEN_FILTER_OVERRIDE_KEY)
        localStorage.setItem(TAKEN_FILTER_MIGRATION_V2, '1')
      }
    } catch (err) { /* ignore */ }
    let stored: string | null = null
    try { stored = localStorage.getItem(TAKEN_FILTER_OVERRIDE_KEY) } catch (err) { /* ignore */ }
    if (stored !== null) {
      setMedewerkerFilter(stored)
    }
    setFilterInitialized(true)
  }, [currentMedewerker, medewerkers, user, filterInitialized])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const weekDays = useMemo(() => {
    const monday = getMonday(today)
    monday.setDate(monday.getDate() + weekOffset * 7)
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [today, weekOffset])

  // Month view calculations
  const monthDate = useMemo(() => {
    const d = new Date(today)
    d.setMonth(d.getMonth() + monthOffset)
    d.setDate(1)
    return d
  }, [today, monthOffset])

  const monthDays = useMemo(() => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    // Start on Monday
    const startOffset = (firstDay.getDay() + 6) % 7
    const start = new Date(firstDay)
    start.setDate(start.getDate() - startOffset)
    const days: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [monthDate])

  const monthLabel = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`

  const filteredTaken = useMemo(() => {
    let list = taken
    if (taskFilter === 'project') list = list.filter((t) => !!t.project_id)
    else if (taskFilter === 'los') list = list.filter((t) => !t.project_id)
    if (medewerkerFilter) list = list.filter((t) => t.toegewezen_aan === medewerkerFilter)
    return list
  }, [taken, taskFilter, medewerkerFilter])

  // Tasks grouped by day key
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Taak[]>()
    weekDays.forEach((d) => map.set(d.toDateString(), []))

    filteredTaken.forEach((t) => {
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
        if (aHour !== null && bHour !== null) return aHour - bHour
        if (aHour !== null) return -1
        if (bHour !== null) return 1
        return (PRIORITEIT_ORDER[b.prioriteit] || 0) - (PRIORITEIT_ORDER[a.prioriteit] || 0)
      })
    })

    return map
  }, [filteredTaken, weekDays])

  // Tasks grouped by day for month view
  const allTasksByDay = useMemo(() => {
    const map = new Map<string, Taak[]>()
    filteredTaken.forEach((t) => {
      if (!t.deadline) return
      const d = new Date(t.deadline)
      d.setHours(0, 0, 0, 0)
      const key = d.toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    })
    return map
  }, [filteredTaken])

  // Tasks without deadline (ongepland)
  const unscheduledTaken = useMemo(() => {
    return filteredTaken.filter((t) => !t.deadline).sort((a, b) => {
      if (a.status === 'klaar' && b.status !== 'klaar') return 1
      if (a.status !== 'klaar' && b.status === 'klaar') return -1
      return (PRIORITEIT_ORDER[b.prioriteit] || 0) - (PRIORITEIT_ORDER[a.prioriteit] || 0)
    })
  }, [filteredTaken])

  // Swimlane-view: taken gegroepeerd per toegewezen persoon binnen de huidige week.
  // v1 bewust zonder drag & drop — die blijft alleen in week/maand-view, omdat een
  // swimlane-drop 2D is (persoon + dag) en nu niet nodig voor het overzicht/bulk-doel.
  const swimlaneLanes = useMemo(() => {
    const lanes: { key: string; label: string; tasksByDay: Map<string, Taak[]>; total: number }[] = []
    const dayKeys = weekDays.map((d) => d.toDateString())

    const makeEmptyDayMap = () => {
      const m = new Map<string, Taak[]>()
      dayKeys.forEach((k) => m.set(k, []))
      return m
    }

    const laneKeys: string[] = []
    if (medewerkerFilter) {
      laneKeys.push(medewerkerFilter)
    } else {
      laneKeys.push(SWIMLANE_UNASSIGNED_KEY)
      medewerkers.filter((m) => m.status === 'actief').forEach((m) => {
        if (!laneKeys.includes(m.naam)) laneKeys.push(m.naam)
      })
      filteredTaken.forEach((t) => {
        const key = t.toegewezen_aan?.trim() || SWIMLANE_UNASSIGNED_KEY
        if (!laneKeys.includes(key)) laneKeys.push(key)
      })
    }

    const laneMap = new Map<string, Map<string, Taak[]>>()
    laneKeys.forEach((k) => laneMap.set(k, makeEmptyDayMap()))

    filteredTaken.forEach((t) => {
      if (!t.deadline) return
      const d = new Date(t.deadline)
      d.setHours(0, 0, 0, 0)
      const dayKey = d.toDateString()
      const laneKey = t.toegewezen_aan?.trim() || SWIMLANE_UNASSIGNED_KEY
      const lane = laneMap.get(laneKey)
      if (lane && lane.has(dayKey)) lane.get(dayKey)!.push(t)
    })

    laneKeys.forEach((key) => {
      const dayMap = laneMap.get(key)!
      dayMap.forEach((arr) => {
        arr.sort((a, b) => {
          const aHour = getHourFromDeadline(a.deadline ?? '')
          const bHour = getHourFromDeadline(b.deadline ?? '')
          if (aHour !== null && bHour !== null) return aHour - bHour
          if (aHour !== null) return -1
          if (bHour !== null) return 1
          return (PRIORITEIT_ORDER[b.prioriteit] || 0) - (PRIORITEIT_ORDER[a.prioriteit] || 0)
        })
      })
      const total = [...dayMap.values()].reduce((n, arr) => n + arr.length, 0)
      const label = key === SWIMLANE_UNASSIGNED_KEY ? 'Ongetoewezen' : key
      lanes.push({ key, label, tasksByDay: dayMap, total })
    })

    return lanes
  }, [filteredTaken, weekDays, medewerkers, medewerkerFilter])

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
    const last = weekDays[weekDays.length - 1]
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} – ${last.getDate()} ${MONTH_NAMES[first.getMonth()]}`
    }
    return `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]}`
  }, [weekDays])

  // Now-line position
  const nowLineTop = useMemo(() => {
    const totalMin = 24 * 60
    if (nowMinutes < 0 || nowMinutes > totalMin) return null
    return (nowMinutes / totalMin) * 100
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
        toegewezen_aan: currentMedewerker?.naam ?? '',
        deadline: deadline || undefined,
        geschatte_tijd: 0,
        bestede_tijd: 0,
        project_id: projectId || '',
      })
      setTaken((prev) => [newTaak, ...prev])
      if (user?.id) {
        logWijziging({ userId: user.id, entityType: 'taak', entityId: newTaak.id, actie: 'aangemaakt', medewerkerNaam })
        if (newTaak.toegewezen_aan) {
          logWijziging({ userId: user.id, entityType: 'taak', entityId: newTaak.id, actie: 'gewijzigd', veld: 'toewijzing', medewerkerNaam, nieuweWaarde: newTaak.toegewezen_aan })
        }
      }
      toast.success(<>Taak aangemaakt<span style={{ color: '#F15025' }}>.</span></>)
      return true
    } catch (error) {
      logger.error('Fout bij aanmaken:', error)
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
    const ok = await runOptimistic({
      snapshot: taken,
      apply: (prev) => prev.map((t) => t.id === taak.id ? { ...t, status: newStatus } : t),
      commit: async () => {
        const updated = await updateTaak(taak.id, { status: newStatus })
        return (prev: Taak[]) => prev.map((t) => t.id === updated.id ? updated : t)
      },
      errorMessage: 'Kon taak niet bijwerken',
    })
    if (!ok) {
      logger.error('Fout bij statuswijziging')
      return
    }
    if (user?.id) {
      logWijziging({ userId: user.id, entityType: 'taak', entityId: taak.id, actie: 'status_gewijzigd', medewerkerNaam, veld: 'status', oudeWaarde: taak.status, nieuweWaarde: newStatus })
    }
    if (newStatus === 'klaar' && taak.project_id) {
      const projectTaken = taken
        .map((t) => t.id === taak.id ? { ...t, status: newStatus } : t)
        .filter((t) => t.project_id === taak.project_id)
      const alleKlaar = projectTaken.length > 0 && projectTaken.every((t) => t.status === 'klaar')
      if (alleKlaar) {
        const project = projecten.find((p) => p.id === taak.project_id)
        if (project && project.status !== 'afgerond') {
          setTimeout(() => setCompletionPrompt({ open: true, projectId: project.id, projectNaam: project.naam }), 500)
        }
      }
    }
    if (newStatus === 'klaar') toast.success('Taak afgerond!')
  }

  async function handleDeleteDirect(taak: Taak) {
    try {
      await deleteTaak(taak.id)
      setTaken((prev) => prev.filter((t) => t.id !== taak.id))
      toast.success(<>Taak verwijderd<span style={{ color: '#F15025' }}>.</span></>)
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
      bijlagen: taak.bijlagen || [],
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
        bijlagen: formData.bijlagen,
      })
      setTaken((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      if (user?.id && editingTaak) {
        if (editingTaak.status !== formData.status) {
          logWijziging({ userId: user.id, entityType: 'taak', entityId: editingTaak.id, actie: 'status_gewijzigd', medewerkerNaam, veld: 'status', oudeWaarde: editingTaak.status, nieuweWaarde: formData.status })
        }
        const nieuweToewijzing = formData.toegewezen_aan.trim()
        if (editingTaak.toegewezen_aan !== nieuweToewijzing) {
          logWijziging({ userId: user.id, entityType: 'taak', entityId: editingTaak.id, actie: 'gewijzigd', medewerkerNaam, veld: 'toewijzing', oudeWaarde: editingTaak.toegewezen_aan || undefined, nieuweWaarde: nieuweToewijzing || undefined })
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
      toast.success(<>Taak verwijderd<span style={{ color: '#F15025' }}>.</span></>)
      setDeleteDialogOpen(false)
      setDeletingTaak(null)
    } catch (error) {
      logger.error('Fout bij verwijderen:', error)
      toast.error('Kon taak niet verwijderen')
    } finally { setIsDeleting(false) }
  }

  // Drag & drop: move task to a new day/time
  async function handleDropTask(taakId: string, dayIndex: number, hour: number) {
    // "Niet vergeten" item → maak nieuwe taak aan
    if (taakId.startsWith('nv:')) {
      const parts = taakId.split(':')
      const nvIdx = parseInt(parts[1], 10)
      const nvTitel = parts.slice(2).join(':')
      if (nvTitel) {
        const day = weekDays[dayIndex]
        await handleQuickAdd(nvTitel, 'medium', toDateTimeStr(day, hour), '')
        // Verwijder uit niet-vergeten
        try {
          const stored: string[] = JSON.parse(localStorage.getItem(NIET_VERGETEN_KEY) || '[]')
          stored.splice(nvIdx, 1)
          localStorage.setItem(NIET_VERGETEN_KEY, JSON.stringify(stored))
          // Force re-render van NietVergetenStrip
          window.dispatchEvent(new Event('storage'))
        } catch (err) {}
        toast.success(`"${nvTitel}" ingepland`)
      }
      return
    }

    const day = weekDays[dayIndex]
    const newDeadline = toDateTimeStr(day, hour)

    // Bulk move: if the dropped taak is part of a multi-selection, shift the
    // whole group by the same delta (snapped to 15 min) so offsets are kept.
    const isBulkMove = selectedTaskIds.has(taakId) && selectedTaskIds.size > 1
    const droppedTaak = taken.find((t) => t.id === taakId)
    if (isBulkMove && droppedTaak?.deadline) {
      const FIFTEEN_MIN_MS = 15 * 60 * 1000
      const deltaMs = new Date(newDeadline).getTime() - new Date(droppedTaak.deadline).getTime()
      const moves = new Map<string, string>()
      selectedTaskIds.forEach((id) => {
        const t = taken.find((x) => x.id === id)
        if (!t || !t.deadline) return
        const targetMs = Math.round((new Date(t.deadline).getTime() + deltaMs) / FIFTEEN_MIN_MS) * FIFTEEN_MIN_MS
        const d = new Date(targetMs)
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`
        moves.set(id, iso)
      })
      const snapshot = taken
      setTaken((prev) => prev.map((t) => moves.has(t.id) ? { ...t, deadline: moves.get(t.id)! } : t))
      try {
        await Promise.all(Array.from(moves.entries()).map(([id, dl]) => updateTaak(id, { deadline: dl })))
        toast.success(`${moves.size} taken verplaatst`)
      } catch (err) {
        logger.error('Bulk move failed:', err)
        setTaken(snapshot)
        toast.error('Kon taken niet verplaatsen')
      }
      return
    }

    const ok = await runOptimistic({
      snapshot: taken,
      apply: (prev) => prev.map((t) => t.id === taakId ? { ...t, deadline: newDeadline } : t),
      commit: async () => {
        const updated = await updateTaak(taakId, { deadline: newDeadline })
        return (prev: Taak[]) => prev.map((t) => t.id === updated.id ? updated : t)
      },
      errorMessage: 'Kon taak niet verplaatsen',
    })
    if (!ok) {
      logger.error('Fout bij verplaatsen')
      return
    }
    toast.success(`Verplaatst naar ${DAY_LABELS[dayIndex]} ${formatHourLabel(hour)}`)
  }

  // Month-view drag-drop: move a taak to a different day, preserve the
  // time portion of the deadline if one was set.
  async function handleMonthDropTask(taakId: string, day: Date) {
    const taak = taken.find((t) => t.id === taakId)
    if (!taak) return
    const sameDay = taak.deadline && taak.deadline.startsWith(toDateStr(day))
    if (sameDay) return
    const timePart = taak.deadline && taak.deadline.includes('T') ? taak.deadline.split('T')[1] : null
    const newDeadline = timePart ? `${toDateStr(day)}T${timePart}` : toDateStr(day)
    const snapshot = taken
    setTaken((prev) => prev.map((t) => t.id === taakId ? { ...t, deadline: newDeadline } : t))
    try {
      await updateTaak(taakId, { deadline: newDeadline })
    } catch (err) {
      logger.error('Month drop failed:', err)
      setTaken(snapshot)
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
      <div className="flex flex-col h-[calc(100vh-56px)] -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 bg-[#F8F7F5]">
        {/* Sticky toolbar skeleton */}
        <div className="sticky top-0 z-20 bg-[#FFFFFF] border-b border-[#F0EFEC] shadow-[0_1px_3px_rgba(0,0,0,0.03)] px-6 py-2 flex-shrink-0 flex items-center gap-3 flex-wrap">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[17px] font-bold text-[#1A1A1A] tracking-[-0.3px]">
              Taken<span className="text-[#F15025]">.</span>
            </h1>
            <Skeleton className="h-3 w-10" />
          </div>
          <span className="w-px h-5 bg-[#EBEBEB]" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-6 w-12 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-12 rounded-md" />
          </div>
          <div className="flex-1 min-w-0" />
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-md" />
          <Skeleton className="h-7 w-40 rounded-md" />
          <Skeleton className="h-7 w-32 rounded-md" />
          <Skeleton className="h-7 w-14 rounded-md" />
        </div>

        {/* Day headers skeleton */}
        <div className="flex border-b-2 border-[#F0EFEC] bg-[#FAFAF9] flex-shrink-0">
          <div className="w-14 flex-shrink-0" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-0 text-center py-3 border-l border-[#EBEBEB]/30">
              <div className="flex items-center justify-center gap-1.5">
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Calendar grid skeleton */}
        <div className="flex-1 overflow-hidden bg-[#FFFFFF]">
          <div className="flex h-full">
            {/* Time gutter */}
            <div className="w-14 flex-shrink-0 border-r border-[#F0EFEC] py-3 space-y-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-2 flex justify-end">
                  <Skeleton className="h-2.5 w-6" />
                </div>
              ))}
            </div>
            {/* Day columns with placeholder task cards */}
            {Array.from({ length: 7 }).map((_, colIdx) => (
              <div key={colIdx} className="flex-1 min-w-0 border-l border-[#EBEBEB]/30 p-2 space-y-2">
                {colIdx % 2 === 0 && <Skeleton className="h-12 w-full rounded-md" />}
                {colIdx === 1 && <Skeleton className="h-16 w-full rounded-md" />}
                {colIdx === 3 && <Skeleton className="h-10 w-full rounded-md" />}
                {colIdx === 4 && <Skeleton className="h-14 w-full rounded-md" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const totalTaken = taken.length
  const klaartaken = taken.filter((t) => t.status === 'klaar').length

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-56px)] -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 bg-[#F8F7F5]">
        {/* === Sticky toolbar — 1 rij === */}
        <div className="sticky top-0 z-20 bg-[#FFFFFF] border-b border-[#F0EFEC] shadow-[0_1px_3px_rgba(0,0,0,0.03)] px-6 py-2 flex-shrink-0 flex items-center gap-3 flex-wrap">
          {/* Titel + counter */}
          <div className="flex items-baseline gap-2">
            <h1 className="text-[17px] font-bold text-[#1A1A1A] tracking-[-0.3px]">
              Taken<span className="text-[#F15025]">.</span>
            </h1>
            <span className="text-[12px] text-[#9B9B95] font-mono tabular-nums">
              {klaartaken}/{totalTaken}
            </span>
          </div>

          {/* Scheidingsstreep */}
          <span className="w-px h-5 bg-[#EBEBEB]" />

          {/* Filter pills */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {([['alle', 'Alle'], ['project', 'Project'], ['los', 'Los']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTaskFilter(key)} className={cn(
                'text-[13px] px-2.5 py-1 rounded-md transition-all whitespace-nowrap font-medium',
                taskFilter === key
                  ? 'text-[#1A1A1A] bg-[#F3F2F0]'
                  : 'text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F8F7F5]'
              )}>{label}</button>
            ))}
            <span className="w-px h-4 bg-[#EBEBEB] mx-1" />
            <button onClick={() => setShowMontage(!showMontage)} className={cn(
              'text-[13px] px-2.5 py-1 rounded-md transition-all whitespace-nowrap font-medium flex items-center gap-1.5',
              showMontage ? 'text-[#1A1A1A] bg-[#F3F2F0]' : 'text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F8F7F5]'
            )}><Wrench className="w-3.5 h-3.5" />Montage</button>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-w-0" />

          {/* Mijn-taken snelknop */}
          {currentMedewerker && medewerkers.length > 0 && (() => {
            const mijnActief = medewerkerFilter === currentMedewerker.naam
            return (
              <button
                type="button"
                aria-pressed={mijnActief}
                onClick={() => handleMedewerkerFilterChange(mijnActief ? '' : currentMedewerker.naam)}
                title="Mijn taken"
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors flex-shrink-0',
                  mijnActief
                    ? 'bg-[#1A535C]/[0.12] text-[#1A535C] ring-2 ring-[#1A535C]/30'
                    : 'border border-[#E0DED8] text-[#6B6B66] hover:border-[#1A535C]/40 hover:text-[#1A535C]'
                )}
              >
                {getLaneInitials(currentMedewerker.naam)}
              </button>
            )
          })()}

          {/* Medewerker filter */}
          {medewerkers.length > 0 && (
            <MedewerkerFilterCombobox
              medewerkers={medewerkers}
              value={medewerkerFilter}
              onChange={handleMedewerkerFilterChange}
            />
          )}

          {/* View toggle */}
          <div className="inline-flex items-center rounded-md bg-[#F3F2F0] p-0.5 flex-shrink-0">
            {([
              ['week', 'Week'],
              ['maand', 'Maand'],
              ['swimlane', 'Team'],
            ] as const).map(([v, label]) => (
              <button key={v} onClick={() => setViewMode(v)} className={cn(
                'text-[12px] px-2.5 py-1 rounded-[4px] transition-all font-medium',
                viewMode === v ? 'bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-[#9B9B95] hover:text-[#6B6B66]'
              )}>{label}</button>
            ))}
          </div>

          {/* Date nav */}
          <div className="flex items-center gap-0.5">
            <button className="p-1 rounded-md hover:bg-[#F3F2F0] transition-all" onClick={() => viewMode === 'maand' ? setMonthOffset((m) => m - 1) : setWeekOffset((w) => w - 1)}>
              <ChevronLeft className="w-4 h-4 text-[#9B9B95]" />
            </button>
            <button
              className="text-[13px] px-2 py-1 rounded-md font-semibold text-[#1A1A1A] min-w-[130px] text-center hover:bg-[#F3F2F0] transition-colors"
              onClick={() => viewMode === 'maand' ? setMonthOffset(0) : setWeekOffset(0)}
            >
              {viewMode === 'maand' ? monthLabel : weekLabel}
            </button>
            <button className="p-1 rounded-md hover:bg-[#F3F2F0] transition-all" onClick={() => viewMode === 'maand' ? setMonthOffset((m) => m + 1) : setWeekOffset((w) => w + 1)}>
              <ChevronRight className="w-4 h-4 text-[#9B9B95]" />
            </button>
          </div>
          {!(viewMode === 'maand' ? monthOffset === 0 : isCurrentWeek) && (
            <button
              className="text-[12px] px-2 py-1 rounded-md font-medium text-[#1A535C] hover:bg-[#1A535C]/[0.05] transition-all"
              onClick={() => viewMode === 'maand' ? setMonthOffset(0) : setWeekOffset(0)}
            >
              Vandaag
            </button>
          )}

          {/* Zoom */}
          <div className="flex items-center gap-0.5 border border-[#E0DED8] rounded-md overflow-hidden h-7">
            <button onClick={() => handleZoom(-4)} className="px-1.5 h-full text-[11px] text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] transition-colors" title="Kleiner">A</button>
            <span className="w-px h-full bg-[#E0DED8]" />
            <button onClick={() => handleZoom(4)} className="px-1.5 h-full text-[13px] text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] transition-colors font-medium" title="Groter">A</button>
          </div>
        </div>

        {viewMode === 'swimlane' && selectedTaskIds.size > 0 && (
          <TakenBulkActionBar
            count={selectedTaskIds.size}
            medewerkers={medewerkers}
            busy={bulkBusy}
            onMove={handleBulkMove}
            onAssign={handleBulkAssign}
            onStatus={handleBulkStatus}
            onDelete={handleBulkDelete}
            onClear={clearSelection}
          />
        )}

        {viewMode === 'week' && (<>
        {/* === NIET VERGETEN — sticky note === */}
        <NietVergetenStrip />

        {/* Ongepland verborgen — taken zonder deadline worden niet getoond */}

        {/* === DAY HEADERS === */}
        <div className="flex border-b-2 border-[#F0EFEC] bg-[#FAFAF9] flex-shrink-0">
          <div className="w-14 flex-shrink-0" />
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today)
            const dayTasks = tasksByDay.get(day.toDateString()) || []
            const isPast = day < today && !isToday
            const dayKey = day.toDateString()
            const isExpanded = expandedPastDays.has(dayKey)
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 min-w-0 text-center py-3 border-l border-[#EBEBEB]/30 transition-colors',
                  isToday && 'bg-[#1A535C]/[0.04]'
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className={cn(
                    'text-[11px] uppercase tracking-widest font-semibold',
                    isToday ? 'text-[#1A535C]' : isPast ? 'text-[#D0D0CC]' : 'text-[#9B9B95]'
                  )}>
                    {DAY_LABELS[i]}{isToday && <span className="text-[#F15025]">.</span>}
                  </span>
                  <span className={cn(
                    'text-[14px] font-bold font-mono tabular-nums',
                    isToday ? 'text-[#1A535C]' : isPast ? 'text-[#D0D0CC]' : 'text-[#1A1A1A]'
                  )}>
                    {day.getDate()}
                  </span>
                  {isPast && dayTasks.length > 0 ? (
                    <button
                      onClick={() => togglePastDay(dayKey)}
                      className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#9B9B95] hover:text-[#1A535C] transition-colors px-1.5 py-0.5 rounded hover:bg-[#1A535C]/[0.06]"
                      title={isExpanded ? 'Verberg verlopen taken' : 'Toon verlopen taken'}
                    >
                      <span className="font-mono">{dayTasks.length}</span>
                      <ChevronRight className={cn('w-2.5 h-2.5 transition-transform', isExpanded && 'rotate-90')} />
                    </button>
                  ) : (
                    dayTasks.length > 0 && !isToday && (
                      <span className="text-[10px] font-mono text-[#9B9B95]">{dayTasks.length}</span>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* === CALENDAR GRID — DOEN === */}
        <div ref={scrollRef} onMouseDown={handleGridMouseDown} className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#FFFFFF]">
          <div className="flex" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
            {/* Time gutter */}
            <div className="w-14 flex-shrink-0 relative border-r border-[#F0EFEC]">
              {HOURS.map((hour) => (
                <div key={hour} style={{ height: HOUR_HEIGHT }} className="relative">
                  <span className="absolute -top-2.5 right-3 text-[11px] text-[#9B9B95] font-mono tabular-nums font-medium">
                    {String(hour).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => {
              const isToday = isSameDay(day, today)
              const dayKey = day.toDateString()
              const allDayTasks = tasksByDay.get(dayKey) || []
              const isPast = day < today && !isToday
              const isPastCollapsed = isPast && !expandedPastDays.has(dayKey)
              const dayTasks = isPastCollapsed ? [] : allDayTasks

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
                  offerteMap={offerteMap}
                  nowLineTop={isCurrentWeek && isToday ? nowLineTop : null}
                  draggingTaakId={draggingTaakId}
                  dropTarget={dropTarget}
                  onDragStart={(id) => {
                    setDraggingTaakId(id)
                    if (!selectedTaskIds.has(id) && selectedTaskIds.size > 0) {
                      setSelectedTaskIds(new Set())
                    }
                  }}
                  onDragEnd={() => { setDraggingTaakId(null); setDropTarget(null) }}
                  onDropTargetChange={setDropTarget}
                  onDrop={handleDropTask}
                  onToggle={handleToggleComplete}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteDirect}
                  onQuickAdd={(title) => handleDayQuickAdd(day, title)}
                  onQuickAddAtTime={(hour, title) => handleDayHourQuickAdd(day, hour, title)}
                  onResize={handleResizeTask}
                  selectedTaskIds={selectedTaskIds}
                  montageAfspraken={montageByDay.get(day.toDateString()) || []}
                  hourHeight={HOUR_HEIGHT}
                />
              )
            })}
          </div>
        </div>
        {rectBox && <SelectionRectangle {...rectBox} />}
        {selectedTaskIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <TakenBulkActionBar
              count={selectedTaskIds.size}
              busy={bulkBusy}
              onDelete={handleBulkDelete}
              onClear={clearSelection}
              compact
            />
          </div>
        )}
        </>)}
        {viewMode === 'maand' && (() => {
        /* === MONTH VIEW — DOEN === */
        // Show working days only (Mon-Fri). Compute the visible week count
        // from the last current-month day in the 42-day grid, then drop
        // weekend cells.
        const monthIdx = monthDate.getMonth()
        let lastCurrentIdx = monthDays.length - 1
        for (let k = monthDays.length - 1; k >= 0; k--) {
          if (monthDays[k].getMonth() === monthIdx) { lastCurrentIdx = k; break }
        }
        const visibleWeeks = Math.ceil((lastCurrentIdx + 1) / 7)
        const visibleDays = monthDays
          .slice(0, visibleWeeks * 7)
          .filter((d) => d.getDay() !== 0 && d.getDay() !== 6)
        return (
        <div className="flex-1 flex flex-col min-h-0 px-6 pb-4 pt-2">
          <div
            className="flex-1 min-h-0 grid grid-cols-5 gap-px bg-[#EBE9E4] overflow-hidden rounded-2xl ring-1 ring-[#EBE9E4] shadow-[0_1px_2px_rgba(0,0,0,0.02),0_8px_24px_-12px_rgba(0,0,0,0.06)]"
            style={{ gridTemplateRows: `auto repeat(${visibleWeeks}, minmax(0, 1fr))` }}
          >
            {/* Day headers — werkweek */}
            {DAY_LABELS.slice(0, 5).map((d) => (
              <div
                key={d}
                className="bg-white text-center py-3 text-[12px] font-medium tracking-[0.02em] text-[#6B6B66] border-b border-[#F0EFEC]"
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </div>
            ))}
            {/* Day cells */}
            {visibleDays.map((day, i) => {
              const isCurrentMonth = day.getMonth() === monthDate.getMonth()
              const isToday = isSameDay(day, today)
              const isPastInMonth = isCurrentMonth && day < today && !isToday
              const dayTasks = allTasksByDay.get(day.toDateString()) || []
              const dayKey = day.toDateString()
              const isAddingHere = monthAddingDay === dayKey
              const isDropHere = monthDropDay === dayKey
              return (
                <div
                  key={i}
                  className={cn(
                    'group/cell relative p-2 transition-colors flex flex-col min-h-0',
                    !isCurrentMonth ? 'bg-[#FAFAF8] text-[#C4C2BD]' : 'bg-white',
                    isToday && '[background:linear-gradient(180deg,rgba(26,83,92,0.06)_0%,rgba(26,83,92,0)_55%)]',
                    isDropHere && '[background:linear-gradient(180deg,rgba(241,80,37,0.10)_0%,rgba(241,80,37,0.03)_100%)] shadow-[inset_0_2px_0_#F15025]'
                  )}
                  onClick={(e) => {
                    if (!isCurrentMonth || isAddingHere) return
                    const target = e.target as HTMLElement
                    if (target.closest('button, input, [data-taak-id]')) return
                    setMonthAddingDay(dayKey)
                    setMonthAddTitle('')
                    setTimeout(() => monthAddInputRef.current?.focus(), 50)
                  }}
                  onDragOver={(e) => {
                    if (!isCurrentMonth) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (monthDropDay !== dayKey) setMonthDropDay(dayKey)
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return
                    if (monthDropDay === dayKey) setMonthDropDay(null)
                  }}
                  onDrop={async (e) => {
                    e.preventDefault()
                    const taakId = e.dataTransfer.getData('text/plain')
                    setMonthDropDay(null)
                    if (taakId && isCurrentMonth) {
                      await handleMonthDropTask(taakId, day)
                    }
                  }}
                >
                  <div className="flex items-baseline justify-end gap-1 mb-1 flex-shrink-0 h-6">
                    {!isCurrentMonth && day.getDate() === 1 && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#C4C2BD]">
                        {MONTH_NAMES[day.getMonth()]}
                      </span>
                    )}
                    <span className={cn(
                      'text-[14px] font-semibold tabular-nums',
                      isToday
                        ? 'w-6 h-6 rounded-full bg-[#1A535C] text-white flex items-center justify-center text-[11px] shadow-[0_2px_8px_-2px_rgba(26,83,92,0.25)]'
                        : isPastInMonth ? 'text-[#9B9B95]'
                        : isCurrentMonth ? 'text-[#1A1A1A]'
                        : 'text-[#C4C2BD]'
                    )}>
                      {day.getDate()}
                    </span>
                  </div>
                  {isAddingHere && (
                    <input
                      ref={monthAddInputRef}
                      value={monthAddTitle}
                      onChange={(e) => setMonthAddTitle(e.target.value)}
                      placeholder="Taak..."
                      className="w-full text-[11px] px-2 py-1 rounded-md border border-[#1A535C]/30 bg-white focus:outline-none focus:border-[#1A535C] focus:ring-1 focus:ring-[#1A535C]/20 text-[#1A1A1A] placeholder:text-[#B0ADA8] mb-1 flex-shrink-0"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && monthAddTitle.trim()) {
                          await handleQuickAdd(monthAddTitle.trim(), 'medium', toDateStr(day), '')
                          setMonthAddingDay(null)
                          setMonthAddTitle('')
                        }
                        if (e.key === 'Escape') { setMonthAddingDay(null); setMonthAddTitle('') }
                      }}
                      onBlur={() => { if (!monthAddTitle.trim()) { setMonthAddingDay(null); setMonthAddTitle('') } }}
                    />
                  )}
                  <div className={cn(
                    'flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-0.5 [mask-image:linear-gradient(to_bottom,black_calc(100%-10px),transparent_100%)]',
                    isPastInMonth && 'opacity-60'
                  )}>
                    {dayTasks.map((t) => {
                      const pc = PRIORITEIT_COLORS[t.prioriteit]
                      const isDone = t.status === 'klaar'
                      return (
                        <div
                          key={t.id}
                          data-taak-id={t.id}
                          role="button"
                          draggable={isCurrentMonth}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', t.id)
                            const el = e.currentTarget as HTMLElement
                            requestAnimationFrame(() => { el.style.opacity = '0.4' })
                          }}
                          onDragEnd={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                          className="group/pill relative w-full text-left flex items-center gap-1.5 text-[11px] font-medium leading-tight px-1.5 py-[3px] rounded-md cursor-grab active:cursor-grabbing hover:bg-[#1A535C]/[0.05] transition-colors"
                          onClick={() => openEditDialog(taken.find((tt) => tt.id === t.id) || t)}
                          title={t.titel}
                        >
                          <button
                            type="button"
                            draggable={false}
                            onClick={(e) => { e.stopPropagation(); handleToggleComplete(t) }}
                            className="group/check flex-shrink-0"
                            title={isDone ? 'Markeer als open' : 'Markeer als klaar'}
                            aria-label={isDone ? 'Markeer als open' : 'Markeer als klaar'}
                          >
                            {isDone ? (
                              <div className="w-3 h-3 rounded-full bg-[#1A535C] flex items-center justify-center transition-all duration-200">
                                <Check className="w-1.5 h-1.5 text-white" strokeWidth={4} />
                              </div>
                            ) : (
                              <div className="w-3 h-3 rounded-full border-[1.5px] border-[#B0ADA8]/55 flex items-center justify-center transition-[transform,border-color] duration-150 group-hover/check:border-[#1A535C] group-hover/check:scale-110 group-active/check:scale-95">
                                <span
                                  className="block rounded-full w-[3px] h-[3px] opacity-55 transition-all duration-150 ease-out group-hover/check:w-[6px] group-hover/check:h-[6px] group-hover/check:opacity-100"
                                  style={{ backgroundColor: pc.dot }}
                                />
                              </div>
                            )}
                          </button>
                          <span className={cn(
                            'truncate',
                            isDone ? 'text-[#9B9B95] line-through' : 'text-[#1A1A1A]'
                          )}>
                            {t.titel}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        )
        })()}
        {viewMode === 'swimlane' && (
        /* === SWIMLANE VIEW — overzicht per toegewezen persoon voor de week
           v1: geen drag & drop (week/maand houden D&D); doel is overzicht + bulk-selectie. */
        <div className="flex-1 overflow-y-auto bg-[#FFFFFF]">
          <div className="min-w-[720px]">
            <div
              className="sticky top-0 z-10 flex border-b-2 border-[#F0EFEC] bg-[#FAFAF9]"
              style={{ gridTemplateColumns: '180px repeat(5, 1fr)' }}
            >
              <div className="w-[180px] flex-shrink-0 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">
                Medewerker
              </div>
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today)
                const dayKey = day.toDateString()
                const dayTaskIds = swimlaneLanes.flatMap((l) => (l.tasksByDay.get(dayKey) || []).map((t) => t.id))
                const hasDayTasks = dayTaskIds.length > 0
                const allDaySelected = hasDayTasks && dayTaskIds.every((id) => selectedTaskIds.has(id))
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 min-w-0 text-center py-2.5 border-l border-[#EBEBEB]/30',
                      isToday && 'bg-[#1A535C]/[0.04]'
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {hasDayTasks && (
                        <Checkbox
                          checked={allDaySelected}
                          onCheckedChange={() => toggleTaskGroupSelected(dayTaskIds)}
                          aria-label={`Selecteer alle taken op ${DAY_LABELS[i]} ${day.getDate()}`}
                          className="h-3.5 w-3.5"
                        />
                      )}
                      <span className={cn(
                        'text-[11px] uppercase tracking-widest font-semibold',
                        isToday ? 'text-[#1A535C]' : 'text-[#9B9B95]'
                      )}>
                        {DAY_LABELS[i]}{isToday && <span className="text-[#F15025]">.</span>}
                      </span>
                      <span className={cn(
                        'text-[13px] font-bold font-mono tabular-nums',
                        isToday ? 'text-[#1A535C]' : 'text-[#1A1A1A]'
                      )}>
                        {day.getDate()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {swimlaneLanes.length === 0 ? (
              <div className="px-6 py-12 text-center text-[13px] text-[#9B9B95]">
                Geen taken voor deze week.
              </div>
            ) : (
              swimlaneLanes.map((lane, idx) => {
                const isCollapsed = collapsedAssignees.has(lane.key)
                const isUnassigned = lane.key === SWIMLANE_UNASSIGNED_KEY
                const laneTaskIds = [...lane.tasksByDay.values()].flat().map((t) => t.id)
                const allLaneSelected = laneTaskIds.length > 0 && laneTaskIds.every((id) => selectedTaskIds.has(id))
                return (
                  <div key={lane.key} className="flex border-b border-[#F0EFEC] hover:bg-[#FAFAF9]/40 transition-colors">
                    <div className="w-[180px] flex-shrink-0 flex items-center gap-2 px-3 py-3 border-r border-[#F0EFEC]">
                      <Checkbox
                        checked={allLaneSelected}
                        disabled={laneTaskIds.length === 0}
                        onCheckedChange={() => toggleTaskGroupSelected(laneTaskIds)}
                        aria-label={`Selecteer alle taken van ${lane.label}`}
                        className="h-3.5 w-3.5 flex-shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => toggleAssigneeCollapsed(lane.key)}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        <ChevronRight className={cn('w-3 h-3 text-[#9B9B95] transition-transform flex-shrink-0', !isCollapsed && 'rotate-90')} />
                        {isUnassigned ? (
                          <span className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-[#FDE8E2] text-[#C03A18] flex-shrink-0">
                            ?
                          </span>
                        ) : (
                          <span
                            className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                            style={getLaneAvatarStyle(idx)}
                          >
                            {getLaneInitials(lane.label)}
                          </span>
                        )}
                        <span className={cn(
                          'text-[13px] font-semibold truncate',
                          isUnassigned ? 'text-[#C03A18]' : 'text-[#1A1A1A]'
                        )}>
                          {lane.label}
                        </span>
                        <span className="ml-auto text-[11px] font-mono text-[#9B9B95] tabular-nums flex-shrink-0">
                          {lane.total}
                        </span>
                      </button>
                    </div>
                    {weekDays.map((day, dayIdx) => {
                      const dayKey = day.toDateString()
                      const cellTasks = lane.tasksByDay.get(dayKey) || []
                      const isToday = isSameDay(day, today)
                      return (
                        <div
                          key={dayIdx}
                          className={cn(
                            'flex-1 min-w-0 border-l border-[#EBEBEB]/30 p-1.5 min-h-[56px]',
                            isToday && 'bg-[#1A535C]/[0.02]'
                          )}
                        >
                          {!isCollapsed && cellTasks.length > 0 && (
                            <div className="space-y-1">
                              {cellTasks.map((t) => {
                                const pc = PRIORITEIT_COLORS[t.prioriteit]
                                const hour = getHourFromDeadline(t.deadline ?? '')
                                const isSelected = selectedTaskIds.has(t.id)
                                return (
                                  <div
                                    key={t.id}
                                    className={cn(
                                      'group relative flex items-start gap-1.5 rounded-md border-l-2 transition-shadow hover:shadow-sm',
                                      isSelected && 'ring-2 ring-[#1A535C]/40'
                                    )}
                                    style={{ borderLeftColor: pc.border, backgroundColor: pc.bg }}
                                  >
                                    <div
                                      className="pt-1 pl-1.5 flex-shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleTaskSelected(t.id)}
                                        aria-label={`Selecteer ${t.titel}`}
                                        className="h-3 w-3"
                                      />
                                    </div>
                                    <button
                                      onClick={() => openEditDialog(taken.find((tt) => tt.id === t.id) || t)}
                                      className={cn(
                                        'flex-1 min-w-0 text-left text-[11px] leading-tight truncate pr-1.5 py-1',
                                        t.status === 'klaar' && 'line-through opacity-50'
                                      )}
                                      style={{ color: pc.text }}
                                      title={t.titel}
                                    >
                                      {hour !== null && (
                                        <span className="font-mono tabular-nums text-[10px] opacity-70 mr-1">
                                          {formatHourLabel(hour)}
                                        </span>
                                      )}
                                      {t.titel}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {!isCollapsed && cellTasks.length === 0 && (
                            <div className="h-full" />
                          )}
                          {isCollapsed && cellTasks.length > 0 && (
                            <div className="text-[10px] font-mono text-[#B0ADA8] text-center pt-1">
                              {cellTasks.length}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>
        )}
      </div>

      {/* === FLOATING ACTION BUTTON — DOEN === */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {fabOpen && (
          <div className="w-80 rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06] p-4 space-y-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1A1A1A]">Snel toevoegen</span>
              <button className="p-1 rounded-lg hover:bg-[#F0EFEC] transition-all" onClick={() => setFabOpen(false)}>
                <X className="w-3.5 h-3.5 text-[#9B9B95]" />
              </button>
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
              <DatePicker
                value={fabDeadline}
                onChange={setFabDeadline}
                asInput
                placeholder="Deadline"
                className="w-auto h-7 px-2.5 py-1 text-xs rounded-lg"
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
                    <SelectItem key={p.id} value={p.id}>
                      {p.naam}
                      {p.klant_naam ? <span className="text-[#9B9B95] ml-2">· {p.klant_naam}</span> : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              className="w-full h-9 text-sm font-semibold text-white rounded-xl bg-[#F15025] shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
              disabled={!fabTitle.trim()}
              onClick={handleFabAdd}
            >
              Toevoegen
            </button>
          </div>
        )}

        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={cn(
            'flex items-center justify-center w-14 h-14 rounded-2xl shadow-[0_4px_16px_rgba(241,80,37,0.35)] transition-all duration-200',
            'bg-[#F15025] text-white hover:shadow-[0_6px_24px_rgba(241,80,37,0.45)] hover:scale-105',
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
        editingTaakId={editingTaak?.id}
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
            const huidigProject = await getProject(completionPrompt.projectId).catch(() => null)
            await updateProject(completionPrompt.projectId, { status: status as Project['status'] })
            if (user?.id && huidigProject?.status) {
              const naam = medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? ''
              logWijziging({ userId: user.id, entityType: 'project', entityId: completionPrompt.projectId, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: huidigProject.status, nieuweWaarde: status })
            }
            toast.success(`Project gemarkeerd als ${status}`)
          } catch (err) {
            logger.error('updateProjectStatus:', err)
            toast.error('Kon projectstatus niet bijwerken')
          }
        }}
      />
    </>
  )
}

// === DAY COLUMN ===

// === NIET VERGETEN — persoonlijke sticky notes ===
const NIET_VERGETEN_KEY = 'doen_niet_vergeten'

function NietVergetenStrip() {
  const [items, setItems] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(NIET_VERGETEN_KEY) || '[]') } catch (err) { return [] }
  })
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('doen_nv_open') !== 'false' } catch (err) { return true }
  })

  // Sync met localStorage als een item via drag wordt verwijderd
  useEffect(() => {
    const handler = () => {
      try { setItems(JSON.parse(localStorage.getItem(NIET_VERGETEN_KEY) || '[]')) } catch (err) {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const save = useCallback((next: string[]) => {
    setItems(next)
    localStorage.setItem(NIET_VERGETEN_KEY, JSON.stringify(next))
  }, [])

  const add = useCallback(() => {
    if (!input.trim()) return
    save([...items, input.trim()])
    setInput('')
  }, [input, items, save])

  const remove = useCallback((idx: number) => {
    save(items.filter((_, i) => i !== idx))
  }, [items, save])

  const toggle = useCallback(() => {
    const next = !open
    setOpen(next)
    localStorage.setItem('doen_nv_open', String(next))
  }, [open])

  return (
    <div className="px-6 py-2 bg-[#FAFAF9] border-b border-[#EBEBEB]/40">
      <button onClick={toggle} className="flex items-center gap-1.5 group w-full">
        <ChevronRight className={cn('w-3 h-3 text-[#9B9B95] transition-transform duration-200', open && 'rotate-90')} />
        <span className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-wider">Niet vergeten</span>
        {items.length > 0 && <span className="text-[10px] text-[#9B9B95] font-mono">{items.length}</span>}
      </button>
      {open && (
        <div className="mt-2 bg-[#FFF9E6]/60 rounded-md px-3 py-2 border border-[#F5E6A3]/30">
          {items.length > 0 && (
            <ul className="space-y-0.5 mb-2">
              {items.map((item, idx) => (
                <li
                  key={idx}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', `nv:${idx}:${item}`)
                    requestAnimationFrame(() => { (e.currentTarget as HTMLElement).style.opacity = '0.4' })
                  }}
                  onDragEnd={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                  className="flex items-center gap-2 group/item py-0.5 cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="w-2.5 h-2.5 text-[#C4A060]/30 flex-shrink-0" />
                  <span className="text-[12px] text-[#6B6B66] flex-1">{item}</span>
                  <button onClick={() => remove(idx)} className="text-[#9B9B95] hover:text-[#C03A18] opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={(e) => { e.preventDefault(); add() }} className="flex items-center gap-1.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Typ iets om te onthouden..."
              className="flex-1 text-[12px] bg-transparent border-none outline-none placeholder:text-[#C4A060]/50 text-[#6B6B66]"
            />
            {input.trim() && (
              <button type="submit" className="text-[10px] font-medium text-[#8A7A4A] hover:text-[#6B5A2A] transition-colors">
                + Voeg toe
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  )
}

function DayColumn({
  day, dayIndex, isToday, isPast, tasks, projectMap, klantMap, offerteMap, nowLineTop,
  draggingTaakId, dropTarget,
  onDragStart, onDragEnd, onDropTargetChange, onDrop,
  onToggle, onEdit, onDelete, onQuickAdd, onQuickAddAtTime, onResize,
  selectedTaskIds,
  montageAfspraken = [],
  hourHeight: HOUR_HEIGHT,
}: {
  day: Date
  dayIndex: number
  isToday: boolean
  isPast: boolean
  tasks: Taak[]
  projectMap: Record<string, string>
  klantMap: Record<string, string>
  offerteMap: Record<string, Offerte>
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
  selectedTaskIds?: Set<string>
  montageAfspraken?: MontageAfspraak[]
  hourHeight: number
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

  // Bepaal of de cursor in de top- of bottom-half van de hour-cel zit zodat
  // we kunnen droppen op :00 of :30. Splits op de helft van de cel-hoogte.
  function getFractionalHour(e: React.DragEvent, hourBase: number): number {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    return offsetY > rect.height / 2 ? hourBase + 0.5 : hourBase
  }

  function handleDragOver(e: React.DragEvent, hourBase: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDropTargetChange({ dayIndex, hour: getFractionalHour(e, hourBase) })
  }

  function handleDrop(e: React.DragEvent, hourBase: number) {
    e.preventDefault()
    const hour = getFractionalHour(e, hourBase)
    const data = e.dataTransfer.getData('text/plain')
    if (data) {
      onDrop(data, dayIndex, hour)
    } else if (draggingTaakId) {
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
      'flex-1 min-w-0 border-l border-[#EBEBEB]/20 relative',
      isToday && 'bg-[#1A535C]/[0.015]'
    )}>
      {/* Hour grid lines + drop zones */}
      {HOURS.map((hour) => {
        const dropHourInThisCell = dropTarget?.dayIndex === dayIndex && dropTarget?.hour !== undefined && dropTarget.hour >= hour && dropTarget.hour < hour + 1
        const dropIsBottomHalf = dropHourInThisCell && (dropTarget!.hour - hour) >= 0.5
        const isDropHere = dropHourInThisCell
        const isAddingHere = addingAtHour === hour
        const hasTaskAtHour = scheduledTasks.some((t) => {
          const h = getHourFromDeadline(t.deadline ?? '')
          return h !== null && h >= hour && h < hour + 1
        })
        return (
          <div
            key={hour}
            style={{ height: HOUR_HEIGHT }}
            className={cn(
              'group/hour border-b border-[#EBEBEB]/30 transition-all duration-200 relative',
              isDropHere && 'bg-[#1A535C]/[0.06]'
            )}
            onDragOver={(e) => handleDragOver(e, hour)}
            onDrop={(e) => handleDrop(e, hour)}
            onDragLeave={handleDragLeave}
          >
            {/* Drop indicator — alleen op de helft waar de cursor zit */}
            {isDropHere && (
              <div
                className="absolute inset-x-1 pointer-events-none animate-[fadeIn_150ms_ease-out]"
                style={{
                  top: dropIsBottomHalf ? HOUR_HEIGHT / 2 + 2 : 2,
                  height: HOUR_HEIGHT / 2 - 4,
                }}
              >
                <div className="w-full h-full rounded-lg border-2 border-dashed border-[#1A535C]/25 bg-[#1A535C]/[0.04] flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#1A535C]/40" />
                  <span className="text-[11px] text-[#1A535C]/50 font-semibold font-mono">
                    {formatHourLabel(dropTarget!.hour)}
                  </span>
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
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#1A535C]/30 bg-white shadow-lg focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/20 text-[#1A1A1A] placeholder:text-[#B0ADA8] transition-all"
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

            {/* Plus button per hour slot — hide when the hour is occupied so it doesn't collide with the task's delete */}
            {!isDropHere && !isAddingHere && !hasTaskAtHour && (
              <button
                data-add-hour-btn="true"
                onClick={() => { setAddingAtHour(hour); setHourAddTitle(''); setTimeout(() => hourInputRef.current?.focus(), 50) }}
                className="absolute top-1 right-1 z-20 opacity-0 group-hover/hour:opacity-100 p-1 rounded-lg text-[#F15025]/40 hover:text-[#F15025] hover:bg-[#F15025]/10 transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )
      })}

      {/* Now-line — dun, translucent zodat tekst leesbaar blijft */}
      {nowLineTop !== null && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ top: `${nowLineTop}%` }}
        >
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F15025] -ml-1 flex-shrink-0" />
            <div className="flex-1 h-px bg-[#F15025]/50" />
          </div>
        </div>
      )}

      {/* Scheduled tasks - positioned at their time */}
      {scheduledTasks.map((taak) => {
        const hour = getHourFromDeadline(taak.deadline ?? "")!
        const topPx = hour * HOUR_HEIGHT
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
            className={cn('absolute z-10 transition-[left,width] duration-200 ease-out', isResizing && 'z-30')}
            style={{
              top: topPx,
              left: `calc(${leftPercent}% + ${colCount > 1 ? 2 : 4}px)`,
              width: `calc(${widthPercent}% - ${colCount > 1 ? 4 : 8}px)`,
              height: heightPx !== null ? `${heightPx}px` : undefined,
            }}
          >
            <TaskCard
              taak={taak}
              projectNaam={taak.project_id ? projectMap[taak.project_id] : undefined}
              klantNaam={taak.klant_id ? klantMap[taak.klant_id] : undefined}
              offerteInfo={taak.offerte_id && offerteMap[taak.offerte_id] ? { nummer: offerteMap[taak.offerte_id].nummer, totaal: offerteMap[taak.offerte_id].totaal, status: offerteMap[taak.offerte_id].status } : undefined}
              isPast={isPast}
              scheduled
              heightPx={heightPx !== null ? heightPx : undefined}
              isResizing={isResizing}
              isSelected={selectedTaskIds?.has(taak.id)}
              isDimmedForBulkDrag={
                draggingTaakId != null
                && selectedTaskIds != null
                && selectedTaskIds.has(draggingTaakId)
                && selectedTaskIds.size > 1
                && selectedTaskIds.has(taak.id)
                && taak.id !== draggingTaakId
              }
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
        if (startHour === null || startHour < 0 || startHour >= 24) return null
        const topPx = startHour * HOUR_HEIGHT + (startMin / 60) * HOUR_HEIGHT
        const endTotal = endHour !== null && endHour > startHour ? endHour * HOUR_HEIGHT + (endMin / 60) * HOUR_HEIGHT : topPx + HOUR_HEIGHT
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
              <div className="text-xs text-[#1A535C]/50 truncate font-medium">
                {afspraak.titel}
              </div>
              {afspraak.locatie && (
                <div className="text-xs text-[#1A535C]/30 truncate">
                  {afspraak.locatie}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Unscheduled tasks - at top of column */}
      <div className="absolute inset-x-0 top-0 p-1 pt-1.5 flex flex-col gap-1 z-10 pointer-events-none">
        {unscheduledTasks.map((taak, i) => (
          <div key={taak.id} className="pointer-events-auto" style={{ animationDelay: `${i * 30}ms` }}>
            <TaskCard
              taak={taak}
              projectNaam={taak.project_id ? projectMap[taak.project_id] : undefined}
              klantNaam={taak.klant_id ? klantMap[taak.klant_id] : undefined}
              offerteInfo={taak.offerte_id && offerteMap[taak.offerte_id] ? { nummer: offerteMap[taak.offerte_id].nummer, totaal: offerteMap[taak.offerte_id].totaal, status: offerteMap[taak.offerte_id].status } : undefined}
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
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#1A535C]/30 bg-white focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/20 text-[#1A1A1A] placeholder:text-[#B0ADA8] transition-all"
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
              className="mx-0.5 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[#B0ADA8]/40 hover:text-[#1A535C] hover:bg-[#1A535C]/[0.05] transition-all duration-200"
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
  taak, projectNaam, klantNaam, offerteInfo, isPast, scheduled, heightPx, isResizing, isSelected, isDimmedForBulkDrag, onDragStart, onDragEnd, onToggle, onEdit, onDelete, onResizeStart,
}: {
  taak: Taak
  projectNaam?: string
  klantNaam?: string
  offerteInfo?: { nummer: string; totaal: number; status: string }
  isPast: boolean
  scheduled?: boolean
  heightPx?: number
  isResizing?: boolean
  isSelected?: boolean
  isDimmedForBulkDrag?: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onResizeStart?: (e: React.MouseEvent) => void
}) {
  const isDone = taak.status === 'klaar'
  const [justCompleted, setJustCompleted] = useState(false)
  const pc = PRIORITEIT_COLORS[taak.prioriteit]
  const hour = getHourFromDeadline(taak.deadline ?? "")

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!isDone) {
      setJustCompleted(true)
      // Korte delay zodat de gebruiker de animatie ziet voordat de taak verdwijnt
      setTimeout(() => {
        setJustCompleted(false)
        onToggle()
      }, 400)
    } else {
      onToggle()
    }
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (window.confirm(`"${taak.titel}" verwijderen?`)) {
      onDelete()
    }
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taak.id)
    // Smooth ghost: make the dragged element semi-transparent
    const el = e.currentTarget as HTMLElement
    requestAnimationFrame(() => { el.style.opacity = '0.4'; el.style.transform = 'scale(0.97)' })
    onDragStart()
  }

  // Duration label for resized tasks
  const durationLabel = scheduled && taak.geschatte_tijd > 0
    ? (taak.geschatte_tijd >= 1
        ? `${taak.geschatte_tijd}u`
        : `${Math.round(taak.geschatte_tijd * 60)}min`)
    : null

  const isCompact = heightPx !== undefined && heightPx < 36

  return (
    <div
      data-taak-id={taak.id}
      draggable={!isResizing}
      onDragStart={handleDragStart}
      onDragEnd={(e) => { const el = e.currentTarget as HTMLElement; el.style.opacity = '1'; el.style.transform = ''; onDragEnd() }}
      className={cn(
        'group relative border-l-2 rounded-[5px] transition-all duration-200 ease-out select-none',
        scheduled ? 'h-full' : '',
        !isResizing && 'cursor-grab active:cursor-grabbing',
        'hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:z-10',
        isPast && !isDone && 'opacity-55',
        justCompleted && 'scale-[0.98] opacity-40 transition-all duration-500',
        isResizing && 'ring-2 ring-[#1A535C]/30 z-30',
        isSelected && 'ring-2 ring-[#1A535C] z-20',
        isDimmedForBulkDrag && 'opacity-40',
        isDone && '[background:linear-gradient(135deg,#E2F0F0_0%,#FFFFFF_70%)]'
      )}
      style={{
        ...(heightPx !== undefined ? { height: heightPx, overflow: 'hidden' } : {}),
        borderLeftColor: isDone ? '#1A535C' : pc.border,
        ...(isDone ? {} : { backgroundColor: pc.bg }),
      }}
      onClick={onEdit}
    >
      {/* Checkbox — Priority Pulse: cirkel met binnen-dot in priority-kleur, groeit bij hover */}
      <button
        onClick={handleToggle}
        className={cn('group/check absolute top-[6px] left-2 z-10', isCompact && 'top-1')}
        title={isDone ? 'Ongedaan maken' : 'Markeer als klaar'}
      >
        {isDone ? (
          <div className="w-3.5 h-3.5 rounded-full bg-[#1A535C] flex items-center justify-center ring-2 ring-[#1A535C]/15 transition-all duration-200">
            <Check className="w-2 h-2 text-white" strokeWidth={4} />
          </div>
        ) : (
          <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[#B0ADA8]/55 flex items-center justify-center transition-[transform,border-color] duration-200 group-hover/check:border-[#1A535C] group-hover/check:scale-110 group-active/check:scale-95">
            <span
              className="block rounded-full w-[3px] h-[3px] opacity-55 transition-all duration-200 ease-out group-hover/check:w-[7px] group-hover/check:h-[7px] group-hover/check:opacity-100"
              style={{ backgroundColor: pc.dot }}
            />
          </div>
        )}
      </button>

      {/* Content — pl-7 voor ruimte naast checkbox (iets breder dan voorheen) */}
      <div className={cn('h-full', isCompact ? 'pl-7 pr-1.5 py-1' : 'pl-7 pr-1.5 py-1.5', isDone && 'opacity-60')}>
        <div className="flex items-center gap-1.5">
          <p className={cn(
            'text-[13px] font-medium leading-tight text-[#1A1A1A] truncate flex-1',
            isDone && 'line-through text-[#9B9B95]',
            isCompact && 'text-[11px]'
          )}>
            {taak.titel}
          </p>
          {/* Delete — hover only, ruimte + grotere hit area */}
          <button
            onClick={handleDeleteClick}
            className="ml-auto p-1.5 -mr-1 rounded-md text-transparent group-hover:text-[#9B9B95] hover:!text-[#C03A18] hover:bg-[#C03A18]/8 transition-all flex-shrink-0"
            title="Verwijderen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {!isCompact && (
          <div className="flex items-center gap-2 mt-1 overflow-hidden">
            {projectNaam && (
              <span className="text-[11px] text-[#9B9B95] truncate max-w-[100px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getProjectColor(projectNaam) }} />
                {projectNaam}
              </span>
            )}
            {scheduled && hour !== null && (
              <span className="text-[11px] text-[#9B9B95] font-mono tabular-nums">{formatHourLabel(hour)}</span>
            )}
            {durationLabel && (
              <span className="text-[11px] text-[#9B9B95] font-mono tabular-nums">{durationLabel}</span>
            )}
          </div>
        )}
      </div>

      {/* Resize handle - bottom edge for scheduled tasks */}
      {scheduled && onResizeStart && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2.5 cursor-s-resize group/resize z-20 flex items-end justify-center"
          onMouseDown={(e) => { onResizeStart(e) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-8 h-1 rounded-full bg-transparent group-hover:bg-[#B0ADA8]/30 group-hover/resize:bg-[#1A535C]/50 transition-colors mb-0.5" />
        </div>
      )}

      {/* Completion animation overlay */}
      {justCompleted && (
        <div className="absolute inset-0 bg-[#1A535C]/10 flex items-center justify-center pointer-events-none">
          <Check className="w-4 h-4 text-[#1A535C]" strokeWidth={3} />
        </div>
      )}
    </div>
  )
}

// === EDIT DIALOG ===

function EditTaskDialog({
  open, onOpenChange, formData, setFormData, onSave, isSaving, projecten, klanten, medewerkers, editingTaakId,
}: {
  open: boolean; onOpenChange: (open: boolean) => void
  formData: TaakFormData; setFormData: React.Dispatch<React.SetStateAction<TaakFormData>>
  onSave: () => void; isSaving: boolean; projecten: Project[]; klanten: Klant[]; medewerkers: Medewerker[]
  editingTaakId?: string
}) {
  function updateField<K extends keyof TaakFormData>(field: K, value: TaakFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const [selectedType, setSelectedType] = useState<'intern' | 'project' | 'klant'>(
    formData.project_id ? 'project' : formData.klant_id ? 'klant' : 'intern'
  )
  const type = selectedType
  const beschrijvingRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const el = beschrijvingRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 400)}px`
  }, [formData.beschrijving, open])

  const displayDeadline = formData.deadline
    ? new Date(formData.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    : 'Geen deadline'

  const pillBase = 'h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#E0DED8] bg-white text-xs font-medium text-[#1A1A1A] hover:border-[#B0ADA8] hover:bg-[#F8F7F5] transition-colors'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="sr-only"><DialogTitle>Taak bewerken</DialogTitle></DialogHeader>

        <div className="flex-1 overflow-y-auto">
        {/* Titel — prominent, echt borderless */}
        <div className="px-7 pt-7 pb-2">
          <Input
            value={formData.titel}
            onChange={(e) => updateField('titel', e.target.value)}
            placeholder="Titel van de taak"
            className="border-0 shadow-none px-0 h-auto py-0 bg-transparent text-[20px] font-bold text-[#1A1A1A] placeholder:text-[#9B9B95] placeholder:font-medium focus-visible:ring-0 tracking-[-0.3px]"
          />
        </div>

        {/* Meta-pill rij — alles op 1 lijn, type-segment inline */}
        <div className="px-7 pb-4 flex items-center gap-1.5 flex-wrap">
          {/* Prioriteit */}
          <Select value={formData.prioriteit} onValueChange={(v) => updateField('prioriteit', v as TaakPrioriteit)}>
            <SelectTrigger className={cn(pillBase, 'w-auto focus:ring-0 [&>svg]:hidden')}>
              <Flag className={`w-3 h-3 ${PRIORITEIT_FLAG_COLORS[formData.prioriteit]}`} />
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

          {/* Deadline — DOEN-styled date picker via Popover */}
          <DatePicker
            value={formData.deadline}
            onChange={(v) => updateField('deadline', v)}
            trigger={
              <button type="button" className={pillBase}>
                <CalendarIcon className="w-3 h-3 text-[#6B6B66]" />
                <span className={cn(!formData.deadline && 'text-[#9B9B95]')}>{displayDeadline}</span>
              </button>
            }
          />

          {/* Toegewezen */}
          {medewerkers.length > 0 ? (
            <Select value={formData.toegewezen_aan || 'none'} onValueChange={(v) => updateField('toegewezen_aan', v === 'none' ? '' : v)}>
              <SelectTrigger className={cn(pillBase, 'w-auto focus:ring-0 [&>svg]:hidden max-w-[160px]')}>
                <User2 className="w-3 h-3 text-[#6B6B66]" />
                <SelectValue placeholder="Niet toegewezen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Niet toegewezen</SelectItem>
                {medewerkers.filter((m) => m.status === 'actief').map((m) => (
                  <SelectItem key={m.id} value={m.naam}>{m.naam}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className={cn(pillBase, 'cursor-text')}>
              <User2 className="w-3 h-3 text-[#6B6B66]" />
              <input
                value={formData.toegewezen_aan}
                onChange={(e) => updateField('toegewezen_aan', e.target.value)}
                placeholder="Niet toegewezen"
                className="bg-transparent border-0 outline-none text-xs font-medium text-[#1A1A1A] placeholder:text-[#9B9B95] w-28"
              />
            </div>
          )}

          {/* Type-segment — inline in pill rij */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-[#F0EFEC] border border-[#E0DED8]">
            <button
              type="button"
              onClick={() => { setSelectedType('intern'); updateField('project_id', ''); updateField('klant_id', '') }}
              className={cn('px-2.5 h-6 text-[11px] font-medium rounded-full transition-colors', type === 'intern' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B66] hover:text-[#1A1A1A]')}
            >
              Intern
            </button>
            <button
              type="button"
              onClick={() => { setSelectedType('project'); updateField('klant_id', '') }}
              className={cn('px-2.5 h-6 text-[11px] font-medium rounded-full transition-colors', type === 'project' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B66] hover:text-[#1A1A1A]')}
            >
              Project
            </button>
            <button
              type="button"
              onClick={() => { setSelectedType('klant'); updateField('project_id', '') }}
              className={cn('px-2.5 h-6 text-[11px] font-medium rounded-full transition-colors', type === 'klant' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B66] hover:text-[#1A1A1A]')}
            >
              Klant
            </button>
          </div>
        </div>

        {/* Contextuele project/klant selector */}
        {type === 'project' && (
          <div className="px-7 pb-3 space-y-1.5">
            <Select value={formData.project_id || 'geen'} onValueChange={(v) => updateField('project_id', v === 'geen' ? '' : v)}>
              <SelectTrigger className="h-9 text-sm border-[#E0DED8] bg-[#F8F7F5]"><SelectValue placeholder="Kies project..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="geen">Geen project</SelectItem>
                {projecten.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.naam}
                    {p.klant_naam ? <span className="text-[#9B9B95] ml-2">· {p.klant_naam}</span> : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.project_id && (
              <button
                type="button"
                onClick={() => { onOpenChange(false); navigate(`/projecten/${formData.project_id}`) }}
                className="inline-flex items-center gap-1 text-xs text-[#1A535C] hover:text-[#0F3A40] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open project
              </button>
            )}
          </div>
        )}
        {type === 'klant' && (
          <div className="px-7 pb-3">
            <KlantSearchField klanten={klanten} value={formData.klant_id} onChange={(v) => updateField('klant_id', v)} />
          </div>
        )}

        {/* Briefing — dominant field, auto-grow tot 400px, daarna scroll */}
        <div className="px-7 pb-5 space-y-2">
          <Label className="text-xs uppercase tracking-[0.05em] text-[#9B9B95] font-semibold block">Briefing</Label>
          <Textarea
            ref={beschrijvingRef}
            value={formData.beschrijving}
            onChange={(e) => updateField('beschrijving', e.target.value)}
            placeholder="Briefing toevoegen…"
            data-gramm="false"
            className="border-0 shadow-none px-3 py-2.5 min-h-[180px] max-h-[400px] resize-none overflow-y-auto bg-[#F8F7F5] hover:bg-[#F0EFEC] focus:bg-white rounded-lg text-sm leading-relaxed text-[#1A1A1A] placeholder:text-[#6B6B66] focus-visible:ring-1 focus-visible:ring-[#1A535C]/20 transition-colors"
          />
        </div>

        {/* Bijlagen — compacte inline rij */}
        <div className="px-7 pb-5">
          <div className="flex items-center flex-wrap gap-3">
            <Label className="text-xs uppercase tracking-[0.05em] text-[#9B9B95] font-semibold m-0">Bijlagen</Label>
            <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-dashed border-[#C4C2BD] bg-transparent text-xs font-medium text-[#6B6B66] hover:border-[#1A535C] hover:text-[#1A535C] hover:bg-[#1A535C]/[0.03] transition-colors cursor-pointer">
              <Plus className="h-3.5 w-3.5" />
              Toevoegen
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || [])
                  if (!editingTaakId || files.length === 0) return
                  for (const file of files) {
                    try {
                      const url = await uploadTaakBijlage(editingTaakId, file)
                      setFormData(prev => ({ ...prev, bijlagen: [...prev.bijlagen, url] }))
                    } catch (err) {
                      logger.error('uploadTaakBijlage:', err)
                      toast.error(`Kon "${file.name}" niet uploaden`)
                    }
                  }
                  e.target.value = ''
                }}
              />
            </label>
            {formData.bijlagen.length === 0 ? (
              <span className="text-xs italic text-[#9B9B95]">geen bijlagen</span>
            ) : (
              formData.bijlagen.map((url, i) => {
                const isImage = url.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)
                const filename = getDisplayFilename(url, i + 1)
                const ext = filename.split('.').pop()?.toLowerCase() || ''
                const DocIcon = (ext === 'xls' || ext === 'xlsx')
                  ? FileSpreadsheet
                  : (ext === 'pdf' || ext === 'doc' || ext === 'docx' || ext === 'txt')
                    ? FileText
                    : Paperclip
                return (
                  <div key={i} className="group relative">
                    {isImage ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" title={filename}>
                        <img src={url} alt="" className="h-14 w-14 rounded-lg object-cover border border-[#E0DED8] hover:border-[#1A535C] transition-colors" />
                      </a>
                    ) : (
                      <a href={url} target="_blank" rel="noopener noreferrer" title={filename} className="h-14 px-3 rounded-lg border border-[#E0DED8] bg-white flex items-center gap-2 hover:border-[#1A535C] transition-colors">
                        <DocIcon className="h-4 w-4 text-[#6B6B66] flex-shrink-0" />
                        <span className="text-xs text-[#1A1A1A] truncate max-w-[160px]">{filename}</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => updateField('bijlagen', formData.bijlagen.filter((_, j) => j !== i) as string[])}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border border-[#E0DED8] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-[#C03A18] hover:text-[#C03A18] text-[#6B6B66] shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {editingTaakId && (
          <div className="px-7 pb-5">
            <AuditLogPanel entityType="taak" entityId={editingTaakId} />
          </div>
        )}
        </div>

        <DialogFooter className="px-7 py-4 border-t border-[#EBEBEB] bg-[#F8F7F5]/60">
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="h-9 px-5 bg-[#F15025] hover:bg-[#D8421F] text-white shadow-sm"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Zoekbare klant selector voor taken */
function KlantSearchField({ klanten, value, onChange }: { klanten: Klant[]; value: string; onChange: (id: string) => void }) {
  const [search, setSearch] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const selected = klanten.find((k) => k.id === value)
  const filtered = search.trim()
    ? klanten.filter((k) => {
        const q = search.toLowerCase()
        return (k.bedrijfsnaam || '').toLowerCase().includes(q) || (k.contactpersoon || '').toLowerCase().includes(q)
      }).slice(0, 8)
    : klanten.slice(0, 8)

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (selected) {
    return (
      <div className="grid gap-2">
        <Label>Klant</Label>
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="flex-1 truncate">{selected.bedrijfsnaam || selected.contactpersoon}</span>
          <button type="button" onClick={() => onChange('')} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-2 relative" ref={ref}>
      <Label>Klant (optioneel)</Label>
      <Input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Zoek op bedrijfsnaam..."
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((k) => (
            <button
              key={k.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
              onClick={() => { onChange(k.id); setSearch(''); setOpen(false) }}
            >
              <span className="font-medium truncate">{k.bedrijfsnaam || k.contactpersoon}</span>
              {k.bedrijfsnaam && k.contactpersoon && (
                <span className="text-muted-foreground text-xs truncate">— {k.contactpersoon}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
