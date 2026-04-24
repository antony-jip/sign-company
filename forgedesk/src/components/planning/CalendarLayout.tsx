import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  format,
  addDays,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval as eachDay,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Wrench,
  Truck,
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  Pencil,
  Trash2,
  X,
  Loader2,
  Filter,
  UserCheck,
  ClipboardCheck,
  Paperclip,
  FileText,
  Upload,
  Eye,
  Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadMontageBijlage } from '@/services/storageService'
import {
  getMontageAfspraken,
  createMontageAfspraak,
  updateMontageAfspraak,
  deleteMontageAfspraak,
  getProjecten,
  getMedewerkers,
  getKlanten,
  getTaken,
  getWerkbonnenByProject,
  createWerkbon,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
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
import type { MontageAfspraak, MontageBijlage, Project, Medewerker, Klant, Taak, Werkbon } from '@/types'
import { logger } from '../../utils/logger'
import { getNederlandseFeestdagen, isFeestdag } from '@/utils/feestdagen'
import { confirm } from '@/components/shared/ConfirmDialog'
import { getAvatarStyle } from '@/utils/medewerkerAvatar'

// ============================================================
// STATUS CONFIG
// ============================================================

const STATUS_CONFIG: Record<
  MontageAfspraak['status'],
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  gepland: { label: 'Gepland', text: '#3A5A9A', bg: '#E8EEF9', border: '#C5D5EA', dot: '#4A7AC7' },
  onderweg: { label: 'Onderweg', text: '#8A6A2A', bg: '#F5F2E8', border: '#E5DCC8', dot: '#C49A30' },
  bezig: { label: 'Bezig', text: '#3A7D52', bg: '#E8F2EC', border: '#C5E0D0', dot: '#4AA366' },
  afgerond: { label: 'Afgerond', text: '#1A535C', bg: '#E2F0F0', border: '#C0DDDD', dot: '#2A8A8A' },
  uitgesteld: { label: 'Uitgesteld', text: '#C03A18', bg: '#FDE8E2', border: '#F0C8BC', dot: '#E04A28' },
}

// ============================================================
// HELPERS
// ============================================================

function getInitials(naam: string): string {
  return naam.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDateYMD(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6) // 06:00 - 19:00

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

function minutesToPx(minutes: number, hourHeight: number): number {
  return (minutes / 60) * hourHeight
}

// Overlap detection: assigns column index + total columns per event
type LayoutInfo = { colIndex: number; totalCols: number }

function computeOverlapLayout(events: MontageAfspraak[]): Map<string, LayoutInfo> {
  const result = new Map<string, LayoutInfo>()
  if (events.length === 0) return result

  // Sort by start time, then by longer duration first
  const sorted = [...events].sort((a, b) => {
    const diff = timeToMinutes(a.start_tijd) - timeToMinutes(b.start_tijd)
    if (diff !== 0) return diff
    return (timeToMinutes(b.eind_tijd) - timeToMinutes(b.start_tijd)) -
           (timeToMinutes(a.eind_tijd) - timeToMinutes(a.start_tijd))
  })

  // Group overlapping events into clusters
  const clusters: MontageAfspraak[][] = []
  let currentCluster: MontageAfspraak[] = []
  let clusterEnd = 0

  for (const event of sorted) {
    const start = timeToMinutes(event.start_tijd)
    const end = timeToMinutes(event.eind_tijd)
    if (currentCluster.length === 0 || start < clusterEnd) {
      currentCluster.push(event)
      clusterEnd = Math.max(clusterEnd, end)
    } else {
      clusters.push(currentCluster)
      currentCluster = [event]
      clusterEnd = end
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster)

  // Assign columns within each cluster
  for (const cluster of clusters) {
    const columns: MontageAfspraak[][] = []
    for (const event of cluster) {
      const eventStart = timeToMinutes(event.start_tijd)
      let placed = false
      for (let c = 0; c < columns.length; c++) {
        const lastInCol = columns[c][columns[c].length - 1]
        if (timeToMinutes(lastInCol.eind_tijd) <= eventStart) {
          columns[c].push(event)
          placed = true
          break
        }
      }
      if (!placed) {
        columns.push([event])
      }
    }
    const totalCols = columns.length
    columns.forEach((col, colIndex) => {
      col.forEach((event) => {
        result.set(event.id, { colIndex, totalCols })
      })
    })
  }

  return result
}

// ============================================================
// DEFAULT FORM STATE
// ============================================================

const defaultForm = {
  klant_id: '',
  project_id: '',
  titel: '',
  beschrijving: '',
  datum: formatDateYMD(new Date()),
  start_tijd: '08:00',
  eind_tijd: '17:00',
  geplande_tijd: '',
  locatie: '',
  monteurs: [] as string[],
  materialen: '',
  status: 'gepland' as MontageAfspraak['status'],
  werkbon_id: '',
  bijlagen: [] as MontageBijlage[],
}


// ============================================================
// MAIN COMPONENT
// ============================================================

export function CalendarLayout() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [afspraken, setAfspraken] = useState<MontageAfspraak[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projectTaken, setProjectTaken] = useState<Taak[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Feestdagen
  const feestdagen = useMemo(() => getNederlandseFeestdagen(currentDate.getFullYear()), [currentDate])

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(defaultForm)
  const [isSaving, setIsSaving] = useState(false)

  const [projectWerkbonnen, setProjectWerkbonnen] = useState<Werkbon[]>([])

  // Active medewerker filter: null = show all, string = single medewerker id
  const [activeMedewerker, setActiveMedewerker] = useState<string | null>(null)

  // ---- Data loading ----
  const loadData = useCallback(async (cancelled?: { current: boolean }) => {
    try {
      setIsLoading(true)
      const [aData, pData, mData, kData, tData] = await Promise.all([
        getMontageAfspraken(),
        getProjecten(),
        getMedewerkers(),
        getKlanten(),
        getTaken(),
      ])
      if (cancelled?.current) return
      const activeMw = mData.filter((m) => m.status === 'actief')
      setMedewerkers(activeMw)
      setAfspraken(aData)
      setProjecten(pData)
      setKlanten(kData)
      setProjectTaken(tData.filter((t) => t.project_id && t.deadline && t.status !== 'klaar'))
    } catch (err) {
      if (cancelled?.current) return
      logger.error('Fout bij laden data:', err)
      toast.error('Kon planningsdata niet laden')
    } finally {
      if (!cancelled?.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const cancelled = { current: false }
    loadData(cancelled)
    return () => { cancelled.current = true }
  }, [loadData])

  // ---- Week dates ----
  const weekDates = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const friday = addDays(weekStart, 4)
    return eachDayOfInterval({ start: weekStart, end: friday })
  }, [currentDate])

  const weekLabel = useMemo(() => {
    const start = weekDates[0]
    const end = weekDates[weekDates.length - 1]
    return `${format(start, 'd MMM', { locale: nl })} - ${format(end, 'd MMM yyyy', { locale: nl })}`
  }, [weekDates])

  // ---- Filter afspraken by active medewerker ----
  const filteredAfspraken = useMemo(() => {
    if (!activeMedewerker) return afspraken
    return afspraken.filter((a) => a.monteurs.includes(activeMedewerker))
  }, [afspraken, activeMedewerker])

  // ---- Get afspraken for a specific day ----
  const getAfsprakenForDay = useCallback(
    (date: Date) => {
      const dateStr = formatDateYMD(date)
      return filteredAfspraken
        .filter((a) => a.datum === dateStr)
        .sort((a, b) => timeToMinutes(a.start_tijd) - timeToMinutes(b.start_tijd))
    },
    [filteredAfspraken]
  )

  // ---- Get project tasks for a specific day (by deadline) ----
  const getTasksForDay = useCallback(
    (date: Date) => {
      const dateStr = formatDateYMD(date)
      return projectTaken.filter((t) => t.deadline === dateStr)
    },
    [projectTaken]
  )

  // Plan a project task into the montage planning
  const handlePlanTask = async (taak: Taak) => {
    const project = projecten.find((p) => p.id === taak.project_id)
    setEditingId(null)
    setFormData({
      ...defaultForm,
      klant_id: project?.klant_id || '',
      project_id: taak.project_id || '',
      titel: taak.titel,
      beschrijving: taak.beschrijving || '',
      datum: taak.deadline || formatDateYMD(new Date()),
      start_tijd: '08:00',
      eind_tijd: '17:00',
    })
    setDialogOpen(true)
  }

  // ---- Mini calendar data ----
  const miniCalMonth = currentDate
  const miniCalDays = useMemo(() => {
    const monthStart = startOfMonth(miniCalMonth)
    const monthEnd = endOfMonth(miniCalMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [miniCalMonth])

  const dayHasAfspraak = useCallback(
    (day: Date) => {
      const dateStr = formatDateYMD(day)
      return filteredAfspraken.some((a) => a.datum === dateStr)
    },
    [filteredAfspraken]
  )

  // ---- Dialog handlers ----
  const openNewDialog = (date?: Date) => {
    const d = date || new Date()
    setEditingId(null)
    setFormData({
      ...defaultForm,
      datum: formatDateYMD(d),
      // Pre-fill active medewerker when one is selected
      monteurs: activeMedewerker ? [activeMedewerker] : [],
    })
    setDialogOpen(true)
  }

  const openEditDialog = (afspraak: MontageAfspraak) => {
    setEditingId(afspraak.id)
    setFormData({
      klant_id: afspraak.klant_id,
      project_id: afspraak.project_id,
      titel: afspraak.titel,
      beschrijving: afspraak.beschrijving,
      datum: afspraak.datum,
      start_tijd: afspraak.start_tijd,
      eind_tijd: afspraak.eind_tijd,
      geplande_tijd: '',
      locatie: afspraak.locatie,
      monteurs: [...afspraak.monteurs],
      materialen: afspraak.materialen.join(', '),
      status: afspraak.status,
      werkbon_id: afspraak.werkbon_id || '',
      bijlagen: afspraak.bijlagen ? [...afspraak.bijlagen] : [],
    })
    if (afspraak.project_id) {
      getWerkbonnenByProject(afspraak.project_id).then(setProjectWerkbonnen).catch(() => setProjectWerkbonnen([]))
    } else {
      setProjectWerkbonnen([])
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.titel.trim() && !formData.project_id) {
      toast.error('Vul een taakomschrijving in of selecteer een project')
      return
    }

    // Feestdag waarschuwing
    const feestdagCheck = isFeestdag(formData.datum, feestdagen)
    if (feestdagCheck) {
      const doorgaan = await confirm({
        message: `Let op: ${formData.datum} valt op ${feestdagCheck.naam}. Toch inplannen?`,
        confirmLabel: 'Doorgaan'
      })
      if (!doorgaan) return
    }

    setIsSaving(true)
    try {
      // Get project/klant names for denormalized fields
      const project = projecten.find((p) => p.id === formData.project_id)
      const klant = klanten.find((k) => k.id === formData.klant_id)

      const payload = {
        user_id: user?.id || '',
        project_id: formData.project_id || '',
        project_naam: project?.naam || '',
        klant_id: formData.klant_id || project?.klant_id || '',
        klant_naam: klant?.bedrijfsnaam || project?.klant_naam || '',
        titel: formData.titel.trim() || project?.naam || '',
        beschrijving: formData.beschrijving.trim(),
        datum: formData.datum,
        start_tijd: formData.start_tijd,
        eind_tijd: formData.eind_tijd,
        locatie: formData.locatie.trim(),
        monteurs: formData.monteurs,
        status: formData.status,
        materialen: formData.materialen
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        notities: '',
        werkbon_id: formData.werkbon_id || undefined,
        werkbon_nummer: formData.werkbon_id ? projectWerkbonnen.find(w => w.id === formData.werkbon_id)?.werkbon_nummer : undefined,
        bijlagen: formData.bijlagen.length > 0 ? formData.bijlagen : undefined,
      }

      if (editingId) {
        await updateMontageAfspraak(editingId, payload)
        toast.success('Planning bijgewerkt')
      } else {
        await createMontageAfspraak(payload)
        toast.success('Taak ingepland')
      }

      setDialogOpen(false)
      await loadData()
    } catch (err) {
      logger.error('Fout bij opslaan:', err)
      toast.error('Kon taak niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingId) return
    try {
      await deleteMontageAfspraak(editingId)
      toast.success('Taak verwijderd')
      setDialogOpen(false)
      await loadData()
    } catch (err) {
      logger.error('Fout bij verwijderen:', err)
      toast.error('Kon taak niet verwijderen')
    }
  }

  const handleStatusUpdate = async (id: string, newStatus: MontageAfspraak['status']) => {
    try {
      await updateMontageAfspraak(id, { status: newStatus })
      setAfspraken((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      )
      toast.success(`Status bijgewerkt naar ${STATUS_CONFIG[newStatus].label}`)
    } catch (err) {
      logger.error('Fout bij status update:', err)
      toast.error('Kon status niet bijwerken')
    }
  }

  // When project changes in form, auto-fill klant
  const handleProjectChange = (projectId: string) => {
    setFormData((prev) => {
      const project = projecten.find((p) => p.id === projectId)
      return {
        ...prev,
        project_id: projectId,
        klant_id: project?.klant_id || prev.klant_id,
        titel: prev.titel || project?.naam || '',
        werkbon_id: '',
      }
    })
    if (projectId) {
      getWerkbonnenByProject(projectId).then(setProjectWerkbonnen).catch(() => setProjectWerkbonnen([]))
    } else {
      setProjectWerkbonnen([])
    }
  }

  // Toggle medewerker in form monteurs
  const toggleFormMonteur = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      monteurs: prev.monteurs.includes(id)
        ? prev.monteurs.filter((m) => m !== id)
        : [...prev.monteurs, id],
    }))
  }

  // Switch medewerker filter (single select toggle)
  const switchMedewerker = (id: string | null) => {
    setActiveMedewerker((prev) => (prev === id ? null : id))
  }

  // ---- Stats ----
  const todayAfspraken = useMemo(
    () => filteredAfspraken.filter((a) => a.datum === formatDateYMD(new Date())),
    [filteredAfspraken]
  )

  const weekAfspraken = useMemo(() => {
    const weekStart = formatDateYMD(weekDates[0])
    const weekEnd = formatDateYMD(weekDates[weekDates.length - 1])
    return filteredAfspraken.filter((a) => a.datum >= weekStart && a.datum <= weekEnd)
  }, [filteredAfspraken, weekDates])

  // ---- Render helpers ----
  const renderMonteurAvatars = (monteurIds: string[], size: 'sm' | 'md' = 'sm') => {
    const dims = size === 'sm' ? 'w-5 h-5 text-2xs' : 'w-7 h-7 text-xs'
    return (
      <div className="flex -space-x-1">
        {monteurIds.slice(0, 3).map((mId) => {
          const mw = medewerkers.find((m) => m.id === mId)
          const idx = medewerkers.findIndex((m) => m.id === mId)
          return (
            <div
              key={mId}
              className={cn(dims, 'rounded-lg flex items-center justify-center font-bold ring-2 ring-white')}
              style={getAvatarStyle(idx >= 0 ? idx : 0)}
              title={mw?.naam || mId}
            >
              {mw ? getInitials(mw.naam) : '?'}
            </div>
          )
        })}
        {monteurIds.length > 3 && (
          <div
            className={cn(dims, 'rounded-lg flex items-center justify-center font-bold ring-2 ring-white')}
            style={{ backgroundColor: '#F0EFEC', color: '#6B6B66' }}
          >
            +{monteurIds.length - 3}
          </div>
        )}
      </div>
    )
  }

  const HOUR_HEIGHT = 56

  // ---- Render: Afspraak card in the week grid ----
  const renderAfspraakCard = (
    afspraak: MontageAfspraak,
    isOverlay = false,
    layout?: LayoutInfo
  ) => {
    const cfg = STATUS_CONFIG[afspraak.status]
    const startMin = timeToMinutes(afspraak.start_tijd)
    const endMin = timeToMinutes(afspraak.eind_tijd)
    const duration = endMin - startMin
    const topOffset = minutesToPx(startMin - HOURS[0] * 60, HOUR_HEIGHT)
    const height = Math.max(minutesToPx(duration, HOUR_HEIGHT), 28)

    if (isOverlay) {
      const colIndex = layout?.colIndex ?? 0
      const totalCols = layout?.totalCols ?? 1
      const widthPercent = 100 / totalCols
      const leftPercent = colIndex * widthPercent
      const isNarrow = totalCols > 1

      // Show medewerker name in narrow cards for clarity
      const monteurName = isNarrow && afspraak.monteurs?.length > 0
        ? medewerkers.find((m) => m.id === afspraak.monteurs?.[0])?.naam?.split(' ')[0]
        : null

      return (
        <div
          key={afspraak.id}
          className="absolute rounded-xl cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:z-20 overflow-hidden"
          style={{
            top: `${topOffset}px`,
            height: `${height}px`,
            left: `calc(${leftPercent}% + 2px)`,
            width: `calc(${widthPercent}% - 4px)`,
            backgroundColor: cfg.bg,
            border: `1px solid ${cfg.border}`,
          }}
          onClick={() => openEditDialog(afspraak)}
        >
          <div className={cn('h-full px-1.5 py-1', isNarrow && 'px-1')}>
            <div className="flex items-start gap-1 min-h-0">
              <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-semibold truncate leading-tight',
                  isNarrow ? 'text-2xs' : 'text-xs'
                )} style={{ color: cfg.text }}>
                  {afspraak.titel}
                </p>
                {monteurName && height > 28 && (
                  <p className="text-2xs text-[#9B9B95] truncate font-medium">
                    {monteurName}
                  </p>
                )}
                {height > 36 && (
                  <p className="text-2xs text-[#9B9B95] truncate font-mono tabular-nums">
                    {afspraak.start_tijd} – {afspraak.eind_tijd}
                  </p>
                )}
                {!isNarrow && height > 52 && afspraak.locatie && (
                  <p className="text-2xs text-[#9B9B95] truncate flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                    {afspraak.locatie}
                  </p>
                )}
                {!isNarrow && height > 68 && afspraak.monteurs.length > 0 && (
                  <div className="mt-0.5">
                    {renderMonteurAvatars(afspraak.monteurs)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Flat card for the sidebar/list view — DOEN style
    return (
      <div
        key={afspraak.id}
        className="rounded-xl p-3 cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
        onClick={() => openEditDialog(afspraak)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: cfg.text }}>
              {afspraak.titel}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#9B9B95]">
              <Clock className="w-3 h-3" />
              <span className="font-mono tabular-nums">{afspraak.start_tijd} – {afspraak.eind_tijd}</span>
            </div>
            {afspraak.locatie && (
              <div className="flex items-center gap-2 mt-0.5 text-xs text-[#9B9B95]">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{afspraak.locatie}</span>
              </div>
            )}
            {afspraak.klant_naam && (
              <p className="text-xs text-[#9B9B95] mt-0.5 truncate">
                {afspraak.klant_naam}
              </p>
            )}
          </div>
          {afspraak.monteurs.length > 0 && (
            <div className="flex-shrink-0">
              {renderMonteurAvatars(afspraak.monteurs, 'md')}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-5 px-4">
      {/* ── DOEN Inline Stats ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-medium" style={{ backgroundColor: '#E8EEF9', color: '#3A5A9A' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#4A7AC7' }} />
          {todayAfspraken.length} vandaag
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-medium" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2A8A8A' }} />
          {weekAfspraken.length} deze week
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-medium" style={{ backgroundColor: '#F0EFEC', color: '#6B6B66' }}>
          {medewerkers.length} monteurs
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-medium" style={{ backgroundColor: '#F5F2E8', color: '#8A6A2A' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#C49A30' }} />
          {afspraken.filter((a) => a.status !== 'afgerond').length} openstaand
        </span>
        <div className="flex-1" />
        <button
          onClick={() => openNewDialog()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#F15025] shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35)] hover:-translate-y-[1px] active:translate-y-0 active:shadow-[0_1px_4px_rgba(241,80,37,0.2)] transition-all"
        >
          <Plus className="w-4 h-4" />
          Taak inplannen
        </button>
      </div>

      {/* ── Main Layout: Calendar + Sidebar ── */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* ──── Week Grid (Main Area) ──── */}
        <div className="flex-1 min-w-0">
          {/* Navigation bar — DOEN toolbar card */}
          <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] mb-3">
            <div className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#1A535C] bg-[#1A535C]/[0.07] hover:bg-[#1A535C]/[0.12] transition-all"
                  >
                    Vandaag
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-[#F0EFEC] transition-all" onClick={() => setCurrentDate((d) => subWeeks(d, 1))}>
                    <ChevronLeft className="w-4 h-4 text-[#6B6B66]" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-[#F0EFEC] transition-all" onClick={() => setCurrentDate((d) => addWeeks(d, 1))}>
                    <ChevronRight className="w-4 h-4 text-[#6B6B66]" />
                  </button>
                  <h2 className="text-[15px] font-semibold text-[#1A1A1A] capitalize truncate">
                    {weekLabel}
                  </h2>
                </div>
                {/* Medewerker switcher tabs */}
                {medewerkers.length > 0 && (
                  <div className="hidden md:flex items-center gap-1 bg-[#F0EFEC] rounded-xl p-0.5">
                    <button
                      onClick={() => setActiveMedewerker(null)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
                        !activeMedewerker
                          ? 'bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                          : 'text-[#9B9B95] hover:text-[#6B6B66]'
                      )}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Iedereen
                    </button>
                    {medewerkers.map((mw, idx) => {
                      const isActive = activeMedewerker === mw.id
                      return (
                        <button
                          key={mw.id}
                          onClick={() => switchMedewerker(mw.id)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
                            isActive
                              ? 'bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                              : 'text-[#9B9B95] hover:text-[#6B6B66]'
                          )}
                        >
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center text-2xs font-bold"
                            style={getAvatarStyle(idx)}
                          >
                            {getInitials(mw.naam)}
                          </div>
                          {mw.naam.split(' ')[0]}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Week grid — DOEN card */}
          <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#1A535C]" />
                  <p className="text-sm text-[#9B9B95]">Planning laden...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 420px)', minHeight: '400px' }}>
                <div className="flex min-w-[700px]">
                  {/* ── Time column ── */}
                  <div className="w-[50px] flex-shrink-0">
                    {/* Sticky header spacer */}
                    <div className="sticky top-0 z-10 bg-white border-b border-[#F0EFEC] h-[60px]" />
                    {/* Hour labels */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="border-b border-[#F0EFEC] text-2xs text-[#B0ADA8] text-right pr-2 pt-1 font-mono tabular-nums"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        {`${String(hour).padStart(2, '0')}:00`}
                      </div>
                    ))}
                  </div>

                  {/* ── Day columns ── */}
                  {weekDates.map((date) => {
                    const today = isToday(date)
                    const dayAfspraken = getAfsprakenForDay(date)
                    const overlapLayout = computeOverlapLayout(dayAfspraken)
                    const taskCount = getTasksForDay(date).length
                    const feestdagInfo = isFeestdag(format(date, 'yyyy-MM-dd'), feestdagen)

                    return (
                      <div key={date.toISOString()} className={cn('flex-1 min-w-0 border-l border-[#F0EFEC]', feestdagInfo && 'bg-[#FDE8E2]/20')}>
                        {/* Sticky day header */}
                        <div
                          className={cn(
                            'sticky top-0 z-10 bg-white border-b border-[#F0EFEC] px-2 py-2 text-center h-[60px] flex flex-col items-center justify-center',
                            today && 'bg-[#1A535C]/[0.04]',
                            feestdagInfo && !today && 'bg-[#FDE8E2]/30'
                          )}
                          title={feestdagInfo ? feestdagInfo.naam : undefined}
                        >
                          <p className={cn('text-2xs uppercase font-medium', feestdagInfo ? 'text-[#C03A18]' : 'text-[#9B9B95]')}>
                            {feestdagInfo ? feestdagInfo.naam : format(date, 'EEE', { locale: nl })}
                          </p>
                          <p
                            className={cn(
                              'text-lg font-bold leading-tight',
                              today ? 'text-[#1A535C]' : feestdagInfo ? 'text-[#C03A18]' : 'text-[#1A1A1A]'
                            )}
                          >
                            {format(date, 'd')}
                          </p>
                          {(dayAfspraken.length > 0 || taskCount > 0) && (
                            <div className="flex items-center gap-0.5 justify-center">
                              {dayAfspraken.length > 0 && (
                                <span className="text-2xs px-1 py-0 rounded bg-[#F0EFEC] text-[#6B6B66] font-medium">
                                  {dayAfspraken.length}
                                </span>
                              )}
                              {taskCount > 0 && (
                                <span className="text-2xs px-1 py-0 rounded bg-[#EDE8F4] text-[#6A5A8A] font-medium">
                                  {taskCount}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Hour grid area — relative container for cards */}
                        <div className="relative">
                          {/* Hour cells (clickable) */}
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              className={cn(
                                'border-b border-[#F0EFEC] group cursor-pointer',
                                today && 'bg-[#1A535C]/[0.02]'
                              )}
                              style={{ height: `${HOUR_HEIGHT}px` }}
                              onClick={() => {
                                setFormData({
                                  ...defaultForm,
                                  datum: formatDateYMD(date),
                                  start_tijd: `${String(hour).padStart(2, '0')}:00`,
                                  eind_tijd: `${String(Math.min(hour + 2, 19)).padStart(2, '0')}:00`,
                                  monteurs: activeMedewerker ? [activeMedewerker] : [],
                                })
                                setEditingId(null)
                                setDialogOpen(true)
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <Plus className="w-4 h-4 text-[#B0ADA8]/40" />
                              </div>
                            </div>
                          ))}

                          {/* Afspraak cards — positioned within this relative container */}
                          {dayAfspraken.map((afspraak) => (
                            <div key={afspraak.id} className="pointer-events-auto" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                              <div style={{ pointerEvents: 'auto' }}>
                                {renderAfspraakCard(afspraak, true, overlapLayout.get(afspraak.id))}
                              </div>
                            </div>
                          ))}

                          {/* Now indicator for today */}
                          {today && (() => {
                            const now = new Date()
                            const nowMin = now.getHours() * 60 + now.getMinutes()
                            const startMin = HOURS[0] * 60
                            const endMin = (HOURS[HOURS.length - 1] + 1) * 60
                            if (nowMin < startMin || nowMin > endMin) return null
                            const topPx = minutesToPx(nowMin - startMin, HOUR_HEIGHT)
                            return (
                              <div
                                className="absolute left-0 right-0 pointer-events-none"
                                style={{ top: `${topPx}px`, zIndex: 15 }}
                              >
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                                  <div className="flex-1 h-[2px] bg-red-500" />
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ──── Sidebar ──── */}
        <div className="w-72 flex-shrink-0 hidden lg:block space-y-3">
          {/* Mini calendar — DOEN card */}
          <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03]">
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2 text-[#1A1A1A]">
                  <CalendarIcon className="w-4 h-4 text-[#9B9B95]" />
                  {format(miniCalMonth, 'MMMM yyyy', { locale: nl })}
                </span>
                <div className="flex items-center gap-0.5">
                  <button className="p-1 rounded-lg hover:bg-[#F0EFEC] transition-all" onClick={() => setCurrentDate((d) => subMonths(d, 1))}>
                    <ChevronLeft className="w-3 h-3 text-[#6B6B66]" />
                  </button>
                  <button className="p-1 rounded-lg hover:bg-[#F0EFEC] transition-all" onClick={() => setCurrentDate((d) => addMonths(d, 1))}>
                    <ChevronRight className="w-3 h-3 text-[#6B6B66]" />
                  </button>
                </div>
              </div>
            </div>
            <div className="px-4 pb-3">
              <div className="grid grid-cols-7 mb-1">
                {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((d) => (
                  <div key={d} className="text-center text-2xs font-semibold text-[#9B9B95] uppercase py-0.5">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {miniCalDays.map((day, i) => {
                  const isCurrentMonth = isSameMonth(day, miniCalMonth)
                  const isTodayDate = isToday(day)
                  const isInWeek = weekDates.some((wd) => isSameDay(wd, day))
                  const hasEvent = dayHasAfspraak(day)
                  const miniFeestdag = isFeestdag(format(day, 'yyyy-MM-dd'), feestdagen)

                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentDate(day)}
                      title={miniFeestdag ? miniFeestdag.naam : undefined}
                      className={cn(
                        'relative w-full aspect-square flex flex-col items-center justify-center text-xs rounded-lg transition-colors',
                        !isCurrentMonth && 'text-[#B0ADA8]/40',
                        isCurrentMonth && 'text-[#1A1A1A]',
                        isTodayDate && 'bg-[#1A535C] text-white font-bold',
                        isInWeek && !isTodayDate && 'bg-[#1A535C]/10 font-semibold',
                        miniFeestdag && !isTodayDate && !isInWeek && 'text-[#C03A18]',
                        !isTodayDate && !isInWeek && 'hover:bg-[#F0EFEC]'
                      )}
                    >
                      {format(day, 'd')}
                      {miniFeestdag && !isTodayDate && (
                        <div className="absolute bottom-0 w-1 h-1 rounded-full bg-[#E04A28]" />
                      )}
                      {hasEvent && !isTodayDate && !miniFeestdag && (
                        <div className="absolute bottom-0 w-1 h-1 rounded-full bg-[#1A535C]" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Medewerkers sidebar — DOEN card */}
          <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03]">
            <div className="px-4 pt-3 pb-2">
              <span className="text-sm font-semibold flex items-center gap-2 text-[#1A1A1A]">
                <Users className="w-4 h-4 text-[#9B9B95]" />
                Team
              </span>
            </div>
            <div className="px-4 pb-3">
              {medewerkers.length === 0 ? (
                <p className="text-xs text-[#9B9B95] text-center py-3">
                  Geen medewerkers gevonden. Voeg medewerkers toe bij Team.
                </p>
              ) : (
                <div className="space-y-1">
                  {medewerkers.map((mw, idx) => {
                    const isSelected = activeMedewerker === mw.id
                    const isActive = !activeMedewerker || activeMedewerker === mw.id
                    const todayCount = afspraken.filter(
                      (a) => a.datum === formatDateYMD(new Date()) && a.monteurs.includes(mw.id)
                    ).length
                    const weekCount = afspraken.filter((a) => {
                      const wStart = formatDateYMD(weekDates[0])
                      const wEnd = formatDateYMD(weekDates[weekDates.length - 1])
                      return a.datum >= wStart && a.datum <= wEnd && a.monteurs.includes(mw.id)
                    }).length

                    return (
                      <button
                        key={mw.id}
                        onClick={() => switchMedewerker(mw.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left',
                          isSelected
                            ? 'bg-[#1A535C]/[0.07] ring-1 ring-[#1A535C]/20 hover:bg-[#1A535C]/[0.10]'
                            : isActive
                              ? 'hover:bg-[#F8F7F4]'
                              : 'opacity-40 hover:opacity-70'
                        )}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-2xs font-bold flex-shrink-0"
                          style={getAvatarStyle(idx)}
                        >
                          {getInitials(mw.naam)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#1A1A1A] truncate">
                            {mw.naam}
                          </p>
                          <p className="text-2xs text-[#9B9B95]">
                            {mw.functie || mw.rol}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {todayCount > 0 ? (
                            <span className="text-2xs px-1.5 py-0.5 rounded-md font-medium" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>
                              {todayCount} vandaag
                            </span>
                          ) : weekCount > 0 ? (
                            <span className="text-2xs text-[#9B9B95]">{weekCount}/wk</span>
                          ) : (
                            <span className="text-2xs text-[#B0ADA8]">vrij</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Today's tasks sidebar — DOEN card */}
          <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03]">
            <div className="px-4 pt-3 pb-2">
              <span className="text-sm font-semibold flex items-center gap-2 text-[#1A1A1A]">
                <Wrench className="w-4 h-4 text-[#9B9B95]" />
                Vandaag
              </span>
            </div>
            <div className="px-4 pb-3">
              {todayAfspraken.length === 0 && getTasksForDay(new Date()).length === 0 ? (
                <p className="text-xs text-[#9B9B95] text-center py-3">
                  Geen taken voor vandaag
                </p>
              ) : (
                <ScrollArea className="max-h-[280px]">
                  <div className="space-y-2">
                    {todayAfspraken.map((a) => renderAfspraakCard(a))}
                    {/* Project tasks due today */}
                    {getTasksForDay(new Date()).map((taak) => {
                      const project = projecten.find((p) => p.id === taak.project_id)
                      return (
                        <div
                          key={`task-${taak.id}`}
                          className="rounded-xl border border-[#EDE8F4] bg-[#EDE8F4]/30 p-3 cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                          onClick={() => handlePlanTask(taak)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[8px] px-1 py-0 rounded bg-[#EDE8F4] text-[#6A5A8A] font-medium">
                                  Projecttaak
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-[#6A5A8A] truncate">
                                {taak.titel}
                              </p>
                              {project && (
                                <p className="text-2xs text-[#9B9B95] truncate mt-0.5">
                                  {project.naam}
                                </p>
                              )}
                            </div>
                            <button
                              className="h-6 px-2 text-2xs text-[#6A5A8A] rounded-lg hover:bg-[#EDE8F4] transition-all font-medium"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePlanTask(taak)
                              }}
                            >
                              Inplannen
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAAK TOEVOEGEN / BEWERKEN DIALOG
         ══════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>
                <Wrench className="h-3.5 w-3.5" />
              </div>
              {editingId ? 'Taak bewerken' : 'Taak toevoegen'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            {/* Klant selectie */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Selecteer een relatie</Label>
              <Select
                value={formData.klant_id || '_none'}
                onValueChange={(v) => setFormData((p) => ({ ...p, klant_id: v === '_none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een klant..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">
                    <span className="text-muted-foreground">Geen klant</span>
                  </SelectItem>
                  {klanten.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.bedrijfsnaam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project selectie */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Selecteer een project</Label>
              <Select
                value={formData.project_id || '_none'}
                onValueChange={(v) => handleProjectChange(v === '_none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">
                    <span className="text-muted-foreground">Geen project</span>
                  </SelectItem>
                  {projecten
                    .filter((p) => !formData.klant_id || p.klant_id === formData.klant_id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <span>{p.naam}</span>
                          {p.klant_naam && (
                            <span className="text-xs text-muted-foreground">({p.klant_naam})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Datum */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Datum</Label>
              <Input
                type="date"
                value={formData.datum}
                onChange={(e) => setFormData((p) => ({ ...p, datum: e.target.value }))}
              />
            </div>

            {/* Start en Eindtijd */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Starttijd</Label>
                <Input
                  type="time"
                  value={formData.start_tijd}
                  onChange={(e) => setFormData((p) => ({ ...p, start_tijd: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Eindtijd</Label>
                <Input
                  type="time"
                  value={formData.eind_tijd}
                  onChange={(e) => setFormData((p) => ({ ...p, eind_tijd: e.target.value }))}
                />
              </div>
            </div>

            {/* Geplande tijd */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Geplande tijd</Label>
              <Input
                value={formData.geplande_tijd}
                onChange={(e) => setFormData((p) => ({ ...p, geplande_tijd: e.target.value }))}
                placeholder="bijv. 4 uur, hele dag..."
              />
            </div>

            {/* Medewerker selectie */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Medewerker</Label>
              {medewerkers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Geen medewerkers beschikbaar. Voeg ze toe bij Team.
                </p>
              ) : (
                <div className="border rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                  {medewerkers.map((mw, idx) => {
                    const isChecked = formData.monteurs.includes(mw.id)
                    return (
                      <label
                        key={mw.id}
                        className={cn(
                          'flex items-center gap-2.5 p-1.5 rounded-lg cursor-pointer transition-colors',
                          isChecked
                            ? 'bg-primary/10'
                            : 'hover:bg-background dark:hover:bg-muted'
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleFormMonteur(mw.id)}
                        />
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-2xs font-bold"
                          style={getAvatarStyle(idx)}
                        >
                          {getInitials(mw.naam)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{mw.naam}</p>
                          <p className="text-2xs text-muted-foreground">{mw.functie || mw.rol}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
              {formData.monteurs.length > 0 && (
                <p className="text-2xs text-muted-foreground">
                  {formData.monteurs.length} medewerker{formData.monteurs.length !== 1 ? 's' : ''} geselecteerd
                </p>
              )}
            </div>

            {/* Taakomschrijving */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Taakomschrijving</Label>
              <Textarea
                value={formData.beschrijving}
                onChange={(e) => setFormData((p) => ({ ...p, beschrijving: e.target.value }))}
                placeholder="Beschrijf de werkzaamheden..."
                rows={3}
              />
            </div>

            {/* Titel (auto-vullen vanuit project, maar aanpasbaar) */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Titel</Label>
              <Input
                value={formData.titel}
                onChange={(e) => setFormData((p) => ({ ...p, titel: e.target.value }))}
                placeholder="Korte titel voor in de planning..."
              />
            </div>

            {/* Locatie */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Locatie</Label>
              <Input
                value={formData.locatie}
                onChange={(e) => setFormData((p) => ({ ...p, locatie: e.target.value }))}
                placeholder="Adres of locatie..."
              />
            </div>

            {/* Materialen */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Materialen (komma-gescheiden)</Label>
              <Input
                value={formData.materialen}
                onChange={(e) => setFormData((p) => ({ ...p, materialen: e.target.value }))}
                placeholder="bijv. Ladder, Boor, Schroeven..."
              />
            </div>

            {/* Werkbon koppelen */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Werkbon koppelen
              </Label>
              <Select
                value={formData.werkbon_id || '__none__'}
                onValueChange={async (v) => {
                  if (v === '__new__') {
                    if (!formData.project_id) {
                      toast.error('Selecteer eerst een project')
                      return
                    }
                    try {
                      const wb = await createWerkbon({
                        user_id: user?.id || '',
                        klant_id: formData.klant_id,
                        project_id: formData.project_id,
                        titel: formData.titel || '',
                        datum: new Date().toISOString().split('T')[0],
                        status: 'concept',
                      } as Parameters<typeof createWerkbon>[0])
                      setProjectWerkbonnen(prev => [...prev, wb])
                      setFormData(p => ({ ...p, werkbon_id: wb.id }))
                      toast.success(`Werkbon ${wb.werkbon_nummer} aangemaakt`)
                    } catch (err) {
                      logger.error('Kon werkbon niet aanmaken:', err)
                      toast.error('Kon werkbon niet aanmaken')
                    }
                  } else {
                    setFormData(p => ({ ...p, werkbon_id: v === '__none__' ? '' : v }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Geen werkbon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Geen werkbon</SelectItem>
                  {projectWerkbonnen.map((wb) => {
                    const st = wb.status === 'concept' ? 'Open' : wb.status === 'definitief' ? 'In uitvoering' : 'Afgetekend'
                    return (
                      <SelectItem key={wb.id} value={wb.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs">{wb.werkbon_nummer}</span>
                          <span className="text-muted-foreground text-xs truncate">{wb.titel}</span>
                          <span className="text-[10px] text-muted-foreground/60">{st}</span>
                        </span>
                      </SelectItem>
                    )
                  })}
                  {formData.project_id && (
                    <SelectItem value="__new__">
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Plus className="h-3 w-3" /> Nieuwe werkbon
                      </span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Bijlagen */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5" />
                  Bijlagen
                </Label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files
                      if (!files) return
                      for (const file of Array.from(files)) {
                        try {
                          const bijlage = await uploadMontageBijlage(file)
                          setFormData(p => ({ ...p, bijlagen: [...p.bijlagen, bijlage] }))
                        } catch (err) {
                          logger.error(`Kon ${file.name} niet uploaden:`, err)
                          toast.error(`Kon ${file.name} niet uploaden`)
                        }
                      }
                      e.target.value = ''
                    }}
                  />
                  <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="h-3 w-3" /> Bestand
                  </span>
                </label>
              </div>
              {formData.bijlagen.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formData.bijlagen.map((bijlage) => (
                    <span
                      key={bijlage.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-[#E6E4E0] bg-[#FAFAF8]"
                    >
                      {bijlage.type === 'pdf' ? (
                        <FileText className="h-3 w-3 text-[#C03A18]" />
                      ) : (
                        <Paperclip className="h-3 w-3 text-[#5A5A55]" />
                      )}
                      <span className="truncate max-w-[120px]">{bijlage.naam}</span>
                      <button
                        type="button"
                        title="Bekijken"
                        onClick={() => window.open(bijlage.url, '_blank')}
                        className="text-[#A0A098] hover:text-[#1A535C] ml-0.5"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="Printen"
                        onClick={() => {
                          const w = window.open(bijlage.url, '_blank')
                          if (w) { w.addEventListener('load', () => w.print()) }
                        }}
                        className="text-[#A0A098] hover:text-[#1A535C]"
                      >
                        <Printer className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, bijlagen: p.bijlagen.filter(b => b.id !== bijlage.id) }))}
                        className="text-[#A0A098] hover:text-[#C03A18] ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Status (alleen bij bewerken) */}
            {editingId && (
              <div className="grid gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: MontageAfspraak['status']) =>
                    setFormData((p) => ({ ...p, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {editingId && (
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 mr-auto"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Verwijderen
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Annuleren
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className=""
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Opslaan...
                </>
              ) : editingId ? (
                'Opslaan'
              ) : (
                'Toevoegen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
