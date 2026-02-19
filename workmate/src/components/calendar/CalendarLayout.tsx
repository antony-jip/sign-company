import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  format,
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getMontageAfspraken,
  createMontageAfspraak,
  updateMontageAfspraak,
  deleteMontageAfspraak,
  getProjecten,
  getMedewerkers,
  getKlanten,
  getTaken,
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
import type { MontageAfspraak, Project, Medewerker, Klant, Taak } from '@/types'

// ============================================================
// STATUS CONFIG
// ============================================================

const STATUS_CONFIG: Record<
  MontageAfspraak['status'],
  { label: string; color: string; bgColor: string; borderColor: string; darkBg: string }
> = {
  gepland: {
    label: 'Gepland',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800',
    darkBg: 'bg-blue-500',
  },
  onderweg: {
    label: 'Onderweg',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800',
    darkBg: 'bg-amber-500',
  },
  bezig: {
    label: 'Bezig',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-950/40',
    borderColor: 'border-green-200 dark:border-green-800',
    darkBg: 'bg-green-500',
  },
  afgerond: {
    label: 'Afgerond',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    darkBg: 'bg-emerald-500',
  },
  uitgesteld: {
    label: 'Uitgesteld',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-red-200 dark:border-red-800',
    darkBg: 'bg-red-500',
  },
}

// ============================================================
// HELPERS
// ============================================================

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
  'bg-indigo-500', 'bg-teal-500',
]

function getInitials(naam: string): string {
  return naam.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
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
}

// ============================================================
// DEMO DATA — Medewerkers Jos & Yvonne
// ============================================================

const DEMO_MEDEWERKERS: Medewerker[] = [
  {
    id: 'mw-jos',
    user_id: 'u-jos',
    naam: 'Jos Vermeulen',
    email: 'jos@signcompany.nl',
    telefoon: '06-12345678',
    functie: 'Monteur / Buitendienst',
    afdeling: 'Montage',
    avatar_url: '',
    uurtarief: 45,
    status: 'actief',
    rol: 'monteur',
    vaardigheden: ['Montage', 'Hoogwerker', 'Elektra'],
    start_datum: '2020-03-15',
    notities: '',
    created_at: '2020-03-15',
    updated_at: '2024-01-01',
  },
  {
    id: 'mw-yvonne',
    user_id: 'u-yvonne',
    naam: 'Yvonne de Groot',
    email: 'yvonne@signcompany.nl',
    telefoon: '06-87654321',
    functie: 'Productie / Binnendienst',
    afdeling: 'Productie',
    avatar_url: '',
    uurtarief: 42,
    status: 'actief',
    rol: 'productie',
    vaardigheden: ['Vinyl snijden', 'Print', 'Lamineren', 'Montage'],
    start_datum: '2021-06-01',
    notities: '',
    created_at: '2021-06-01',
    updated_at: '2024-01-01',
  },
]

function generateDemoAfspraken(): MontageAfspraak[] {
  const today = new Date()
  const ws = startOfWeek(today, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: ws, end: endOfWeek(today, { weekStartsOn: 1 }) })
  const d = (idx: number) => formatDateYMD(days[idx])

  return [
    // Ma — Jos
    { id: 'demo-a1', user_id: 'demo', project_id: '', project_naam: 'Bakkerij Jansen', klant_id: '', klant_naam: 'Bakkerij Jansen',
      titel: 'Gevelletters monteren', beschrijving: 'RVS letters ophangen aan de gevel', datum: d(0),
      start_tijd: '08:00', eind_tijd: '12:00', locatie: 'Dorpstraat 15, Utrecht',
      monteurs: ['mw-jos'], status: 'afgerond', materialen: ['Ladder', 'Boormachine', 'RVS letters set'], notities: '', created_at: '', updated_at: '' },
    // Ma — Yvonne
    { id: 'demo-a2', user_id: 'demo', project_id: '', project_naam: 'Garage Van Dijk', klant_id: '', klant_naam: 'Garage Van Dijk',
      titel: 'Autobelettering printen', beschrijving: 'Full wrap design voor bedrijfsbus', datum: d(0),
      start_tijd: '09:00', eind_tijd: '16:00', locatie: 'Werkplaats',
      monteurs: ['mw-yvonne'], status: 'afgerond', materialen: ['Carwrap folie', 'Laminaat'], notities: '', created_at: '', updated_at: '' },
    // Di — Jos
    { id: 'demo-a3', user_id: 'demo', project_id: '', project_naam: 'Restaurant De Smulhoek', klant_id: '', klant_naam: 'Restaurant De Smulhoek',
      titel: 'Lichtreclame plaatsen', beschrijving: 'LED lichtbak boven ingang monteren', datum: d(1),
      start_tijd: '07:30', eind_tijd: '14:00', locatie: 'Marktplein 8, Amersfoort',
      monteurs: ['mw-jos'], status: 'afgerond', materialen: ['Lichtbak', 'LED driver', 'Beugels'], notities: '', created_at: '', updated_at: '' },
    // Di — Yvonne
    { id: 'demo-a4', user_id: 'demo', project_id: '', project_naam: 'Kapsalon Stijl', klant_id: '', klant_naam: 'Kapsalon Stijl',
      titel: 'Raambelettering snijden', beschrijving: 'Openingstijden en logo op raamfolie', datum: d(1),
      start_tijd: '08:00', eind_tijd: '11:30', locatie: 'Werkplaats',
      monteurs: ['mw-yvonne'], status: 'afgerond', materialen: ['Glasfolie', 'Vinyl'], notities: '', created_at: '', updated_at: '' },
    // Wo — beiden
    { id: 'demo-a5', user_id: 'demo', project_id: '', project_naam: 'Ziekenhuis Oost', klant_id: '', klant_naam: 'Ziekenhuis Oost',
      titel: 'Wayfinding systeem', beschrijving: 'Bewegwijzering afdeling Cardiologie', datum: d(2),
      start_tijd: '08:00', eind_tijd: '17:00', locatie: 'Ziekenhuis Oost, Nieuwegein',
      monteurs: ['mw-jos', 'mw-yvonne'], status: 'bezig', materialen: ['Bewegwijzering borden', 'Muurbeugels', 'Vinyl prints'], notities: '', created_at: '', updated_at: '' },
    // Do — Jos
    { id: 'demo-a6', user_id: 'demo', project_id: '', project_naam: 'Tandartspraktijk Smile', klant_id: '', klant_naam: 'Tandartspraktijk Smile',
      titel: 'Reclamezuil plaatsen', beschrijving: 'Dubbelzijdige lichtgevende zuil bij entree', datum: d(3),
      start_tijd: '09:00', eind_tijd: '15:00', locatie: 'Stationsweg 22, De Bilt',
      monteurs: ['mw-jos'], status: 'gepland', materialen: ['Reclamezuil', 'Fundering set'], notities: '', created_at: '', updated_at: '' },
    // Do — Yvonne
    { id: 'demo-a7', user_id: 'demo', project_id: '', project_naam: 'Sportschool FitLife', klant_id: '', klant_naam: 'Sportschool FitLife',
      titel: 'Spandoek produceren', beschrijving: 'Groot spandoek 6x2m voor opening', datum: d(3),
      start_tijd: '08:00', eind_tijd: '12:00', locatie: 'Werkplaats',
      monteurs: ['mw-yvonne'], status: 'gepland', materialen: ['Spandoekdoek', 'Ogen', 'Touw'], notities: '', created_at: '', updated_at: '' },
    // Vr — Jos ochtend
    { id: 'demo-a8', user_id: 'demo', project_id: '', project_naam: 'Sportschool FitLife', klant_id: '', klant_naam: 'Sportschool FitLife',
      titel: 'Spandoek ophangen', beschrijving: 'Spandoek bevestigen aan gevel', datum: d(4),
      start_tijd: '08:00', eind_tijd: '10:30', locatie: 'Industrieweg 5, Utrecht',
      monteurs: ['mw-jos'], status: 'gepland', materialen: ['Spandoek', 'Spanners'], notities: '', created_at: '', updated_at: '' },
    // Vr — Yvonne
    { id: 'demo-a9', user_id: 'demo', project_id: '', project_naam: 'Gemeente Zeist', klant_id: '', klant_naam: 'Gemeente Zeist',
      titel: 'Informatieborden ontwerpen', beschrijving: 'Ontwerp en print parkeergarage borden', datum: d(4),
      start_tijd: '09:00', eind_tijd: '16:00', locatie: 'Werkplaats',
      monteurs: ['mw-yvonne'], status: 'gepland', materialen: ['Aluminium platen', 'UV print'], notities: '', created_at: '', updated_at: '' },
    // Vr middag — beiden
    { id: 'demo-a10', user_id: 'demo', project_id: '', project_naam: 'Garage Van Dijk', klant_id: '', klant_naam: 'Garage Van Dijk',
      titel: 'Autobelettering plakken', beschrijving: 'Full wrap aanbrengen op bedrijfsbus', datum: d(4),
      start_tijd: '13:00', eind_tijd: '17:00', locatie: 'Werkplaats',
      monteurs: ['mw-jos', 'mw-yvonne'], status: 'gepland', materialen: ['Carwrap (geprint)', 'Heteluchtpistool'], notities: '', created_at: '', updated_at: '' },
  ]
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

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(defaultForm)
  const [isSaving, setIsSaving] = useState(false)

  // Active medewerker filter: null = show all, string = single medewerker id
  const [activeMedewerker, setActiveMedewerker] = useState<string | null>(null)

  // ---- Data loading ----
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [aData, pData, mData, kData, tData] = await Promise.all([
        getMontageAfspraken(),
        getProjecten(),
        getMedewerkers(),
        getKlanten(),
        getTaken(),
      ])
      const activeMw = mData.filter((m) => m.status === 'actief')
      // Fallback to demo data when no medewerkers / afspraken exist
      if (activeMw.length === 0) {
        setMedewerkers(DEMO_MEDEWERKERS)
        setAfspraken(aData.length > 0 ? aData : generateDemoAfspraken())
      } else {
        setMedewerkers(activeMw)
        setAfspraken(aData)
      }
      setProjecten(pData)
      setKlanten(kData)
      setProjectTaken(tData.filter((t) => t.project_id && t.deadline && t.status !== 'done'))
    } catch (err) {
      console.error('Fout bij laden data:', err)
      // Fallback to demo on error
      setMedewerkers(DEMO_MEDEWERKERS)
      setAfspraken(generateDemoAfspraken())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ---- Week dates ----
  const weekDates = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])

  const weekLabel = useMemo(() => {
    const start = weekDates[0]
    const end = weekDates[6]
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
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.titel.trim() && !formData.project_id) {
      toast.error('Vul een taakomschrijving in of selecteer een project')
      return
    }

    setIsSaving(true)
    try {
      // Get project/klant names for denormalized fields
      const project = projecten.find((p) => p.id === formData.project_id)
      const klant = klanten.find((k) => k.id === formData.klant_id)

      const payload = {
        user_id: user?.id || 'demo',
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
      console.error('Fout bij opslaan:', err)
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
      console.error('Fout bij verwijderen:', err)
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
      console.error('Fout bij status update:', err)
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
      }
    })
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
    const weekEnd = formatDateYMD(weekDates[6])
    return filteredAfspraken.filter((a) => a.datum >= weekStart && a.datum <= weekEnd)
  }, [filteredAfspraken, weekDates])

  // ---- Render helpers ----
  const renderMonteurAvatars = (monteurIds: string[], size: 'sm' | 'md' = 'sm') => {
    const dims = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-xs'
    return (
      <div className="flex -space-x-1">
        {monteurIds.slice(0, 3).map((mId) => {
          const mw = medewerkers.find((m) => m.id === mId)
          const idx = medewerkers.findIndex((m) => m.id === mId)
          return (
            <div
              key={mId}
              className={cn(
                dims,
                'rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-gray-900',
                getAvatarColor(idx >= 0 ? idx : 0)
              )}
              title={mw?.naam || mId}
            >
              {mw ? getInitials(mw.naam) : '?'}
            </div>
          )
        })}
        {monteurIds.length > 3 && (
          <div
            className={cn(
              dims,
              'rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 font-bold ring-2 ring-white dark:ring-gray-900'
            )}
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
      const monteurName = isNarrow && afspraak.monteurs.length > 0
        ? medewerkers.find((m) => m.id === afspraak.monteurs[0])?.naam.split(' ')[0]
        : null

      return (
        <div
          key={afspraak.id}
          className={cn(
            'absolute rounded-md border cursor-pointer transition-all hover:shadow-md hover:z-20 overflow-hidden',
            cfg.bgColor,
            cfg.borderColor
          )}
          style={{
            top: `${topOffset}px`,
            height: `${height}px`,
            left: `calc(${leftPercent}% + 2px)`,
            width: `calc(${widthPercent}% - 4px)`,
          }}
          onClick={() => openEditDialog(afspraak)}
        >
          <div className={cn('h-full px-1.5 py-1', isNarrow && 'px-1')}>
            <div className="flex items-start gap-1 min-h-0">
              <div className={cn('w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0', cfg.darkBg)} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-semibold truncate leading-tight',
                  cfg.color,
                  isNarrow ? 'text-[10px]' : 'text-[11px]'
                )}>
                  {afspraak.titel}
                </p>
                {monteurName && height > 28 && (
                  <p className="text-[9px] text-muted-foreground truncate font-medium">
                    {monteurName}
                  </p>
                )}
                {height > 36 && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {afspraak.start_tijd} - {afspraak.eind_tijd}
                  </p>
                )}
                {!isNarrow && height > 52 && afspraak.locatie && (
                  <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
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

    // Flat card for the sidebar/list view
    return (
      <div
        key={afspraak.id}
        className={cn(
          'rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md',
          cfg.bgColor,
          cfg.borderColor
        )}
        onClick={() => openEditDialog(afspraak)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-semibold truncate', cfg.color)}>
              {afspraak.titel}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{afspraak.start_tijd} - {afspraak.eind_tijd}</span>
            </div>
            {afspraak.locatie && (
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{afspraak.locatie}</span>
              </div>
            )}
            {afspraak.klant_naam && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Planning
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeMedewerker
              ? `Planning van ${medewerkers.find((m) => m.id === activeMedewerker)?.naam || 'medewerker'}`
              : 'Plan en beheer montage, installatie en uitvoering'}
          </p>
        </div>
        <Button
          onClick={() => openNewDialog()}
          className="gap-2 bg-gradient-to-r from-accent to-primary border-0"
        >
          <Plus className="w-4 h-4" />
          Taak inplannen
        </Button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-900 border-blue-200/50 dark:border-blue-800/50">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Vandaag</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{todayAfspraken.length}</p>
            <p className="text-[11px] text-muted-foreground">
              {todayAfspraken.filter((a) => a.status === 'afgerond').length} afgerond
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/5 to-white dark:from-primary/10 dark:to-gray-900 border-primary/20">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Deze week</p>
            <p className="text-2xl font-bold text-accent dark:text-primary">{weekAfspraken.length}</p>
            <p className="text-[11px] text-muted-foreground">
              {weekAfspraken.filter((a) => a.status === 'gepland').length} gepland
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Monteurs</p>
            <p className="text-2xl font-bold text-foreground">{medewerkers.length}</p>
            <p className="text-[11px] text-muted-foreground">beschikbaar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Openstaand</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {afspraken.filter((a) => a.status !== 'afgerond').length}
            </p>
            <p className="text-[11px] text-muted-foreground">nog uit te voeren</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Layout: Calendar + Sidebar ── */}
      <div className="flex gap-4">
        {/* ──── Week Grid (Main Area) ──── */}
        <div className="flex-1 min-w-0">
          {/* Navigation bar */}
          <Card className="mb-3">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Vandaag
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate((d) => subWeeks(d, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate((d) => addWeeks(d, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <h2 className="text-lg font-semibold text-foreground capitalize">
                    {weekLabel}
                  </h2>
                </div>
                {/* Medewerker switcher tabs */}
                {medewerkers.length > 0 && (
                  <div className="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                    <button
                      onClick={() => setActiveMedewerker(null)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                        !activeMedewerker
                          ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
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
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                            isActive
                              ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-bold',
                              getAvatarColor(idx)
                            )}
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
            </CardContent>
          </Card>

          {/* Week grid */}
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Planning laden...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 420px)', minHeight: '400px' }}>
                <div className="grid grid-cols-[50px_repeat(7,1fr)] min-w-[700px]">
                  {/* Header row: day labels */}
                  <div className="sticky top-0 z-10 bg-card border-b border-gray-200 dark:border-gray-700" />
                  {weekDates.map((date) => {
                    const today = isToday(date)
                    const dayAfspraken = getAfsprakenForDay(date)
                    return (
                      <div
                        key={date.toISOString()}
                        className={cn(
                          'sticky top-0 z-10 bg-card border-b border-l border-gray-200 dark:border-gray-700 px-2 py-2 text-center',
                          today && 'bg-primary/5 dark:bg-primary/10'
                        )}
                      >
                        <p className="text-[10px] uppercase font-medium text-muted-foreground">
                          {format(date, 'EEE', { locale: nl })}
                        </p>
                        <p
                          className={cn(
                            'text-lg font-bold leading-tight',
                            today ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {format(date, 'd')}
                        </p>
                        {(dayAfspraken.length > 0 || getTasksForDay(date).length > 0) && (
                          <div className="flex items-center gap-0.5 justify-center mt-0.5">
                            {dayAfspraken.length > 0 && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                {dayAfspraken.length}
                              </Badge>
                            )}
                            {getTasksForDay(date).length > 0 && (
                              <Badge className="text-[9px] px-1 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-0">
                                {getTasksForDay(date).length}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Hour rows */}
                  {HOURS.map((hour) => (
                    <React.Fragment key={hour}>
                      {/* Time label */}
                      <div
                        className="border-b border-gray-100 dark:border-gray-800 text-[10px] text-muted-foreground text-right pr-2 pt-1"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        {`${String(hour).padStart(2, '0')}:00`}
                      </div>

                      {/* Day cells */}
                      {weekDates.map((date) => {
                        const today = isToday(date)
                        return (
                          <div
                            key={`${hour}-${date.toISOString()}`}
                            className={cn(
                              'border-b border-l border-gray-100 dark:border-gray-800 relative group',
                              today && 'bg-primary/[0.02] dark:bg-primary/[0.04]'
                            )}
                            style={{ height: `${HOUR_HEIGHT}px` }}
                            onClick={() => {
                              const d = new Date(date)
                              setFormData({
                                ...defaultForm,
                                datum: formatDateYMD(d),
                                start_tijd: `${String(hour).padStart(2, '0')}:00`,
                                eind_tijd: `${String(Math.min(hour + 2, 19)).padStart(2, '0')}:00`,
                                monteurs: activeMedewerker ? [activeMedewerker] : [],
                              })
                              setEditingId(null)
                              setDialogOpen(true)
                            }}
                          >
                            {/* Plus button on hover */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <Plus className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>

                {/* Overlay: positioned afspraak cards */}
                <div
                  className="grid grid-cols-[50px_repeat(7,1fr)] min-w-[700px] pointer-events-none"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    paddingTop: '58px', // header height
                  }}
                >
                  <div /> {/* time label spacer */}
                  {weekDates.map((date) => {
                    const dayAfspraken = getAfsprakenForDay(date)
                    const overlapLayout = computeOverlapLayout(dayAfspraken)
                    return (
                      <div key={date.toISOString()} className="relative border-l border-transparent" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                        {dayAfspraken.map((afspraak) => (
                          <div key={afspraak.id} className="pointer-events-auto">
                            {renderAfspraakCard(afspraak, true, overlapLayout.get(afspraak.id))}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>

                {/* Now indicator */}
                {weekDates.some((d) => isToday(d)) && (() => {
                  const now = new Date()
                  const nowMin = now.getHours() * 60 + now.getMinutes()
                  const startMin = HOURS[0] * 60
                  const endMin = (HOURS[HOURS.length - 1] + 1) * 60
                  if (nowMin < startMin || nowMin > endMin) return null
                  const topPx = minutesToPx(nowMin - startMin, HOUR_HEIGHT)
                  const todayIdx = weekDates.findIndex((d) => isToday(d))
                  if (todayIdx === -1) return null

                  return (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: `${topPx + 58}px`,
                        left: `${50 + (todayIdx * ((100 - 50 / 7) / 7))}%`,
                        right: 0,
                        zIndex: 15,
                      }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                        <div className="flex-1 h-[2px] bg-red-500" />
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </Card>
        </div>

        {/* ──── Sidebar ──── */}
        <div className="w-72 flex-shrink-0 hidden lg:block space-y-3">
          {/* Mini calendar */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  {format(miniCalMonth, 'MMMM yyyy', { locale: nl })}
                </CardTitle>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate((d) => subMonths(d, 1))}>
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate((d) => addMonths(d, 1))}>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-7 mb-1">
                {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-0.5">
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

                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentDate(day)}
                      className={cn(
                        'relative w-full aspect-square flex flex-col items-center justify-center text-[11px] rounded-md transition-colors',
                        !isCurrentMonth && 'text-muted-foreground/40',
                        isCurrentMonth && 'text-foreground',
                        isTodayDate && 'bg-primary text-white font-bold',
                        isInWeek && !isTodayDate && 'bg-primary/10 font-semibold',
                        !isTodayDate && !isInWeek && 'hover:bg-muted/50'
                      )}
                    >
                      {format(day, 'd')}
                      {hasEvent && !isTodayDate && (
                        <div className="absolute bottom-0 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Medewerkers sidebar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Team
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {medewerkers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
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
                      const wEnd = formatDateYMD(weekDates[6])
                      return a.datum >= wStart && a.datum <= wEnd && a.monteurs.includes(mw.id)
                    }).length

                    return (
                      <button
                        key={mw.id}
                        onClick={() => switchMedewerker(mw.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left',
                          isSelected
                            ? 'bg-primary/10 ring-1 ring-primary/30 hover:bg-primary/15'
                            : isActive
                              ? 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                              : 'opacity-40 hover:opacity-70'
                        )}
                      >
                        <div
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0',
                            getAvatarColor(idx)
                          )}
                        >
                          {getInitials(mw.naam)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {mw.naam}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {mw.functie || mw.rol}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {todayCount > 0 ? (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              {todayCount} vandaag
                            </Badge>
                          ) : weekCount > 0 ? (
                            <span className="text-[10px] text-muted-foreground">{weekCount}/wk</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">vrij</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's tasks sidebar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-muted-foreground" />
                Vandaag
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {todayAfspraken.length === 0 && getTasksForDay(new Date()).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
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
                          className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 p-3 cursor-pointer transition-all hover:shadow-md"
                          onClick={() => handlePlanTask(taak)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Badge className="text-[8px] px-1 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-0">
                                  Projecttaak
                                </Badge>
                              </div>
                              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 truncate">
                                {taak.titel}
                              </p>
                              {project && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {project.naam}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePlanTask(taak)
                              }}
                            >
                              Inplannen
                            </Button>
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

      {/* ══════════════════════════════════════════════════════════
          TAAK TOEVOEGEN / BEWERKEN DIALOG
         ══════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <Wrench className="h-3.5 w-3.5 text-white" />
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
                          'flex items-center gap-2.5 p-1.5 rounded-md cursor-pointer transition-colors',
                          isChecked
                            ? 'bg-primary/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleFormMonteur(mw.id)}
                        />
                        <div
                          className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white font-bold',
                            getAvatarColor(idx)
                          )}
                        >
                          {getInitials(mw.naam)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{mw.naam}</p>
                          <p className="text-[10px] text-muted-foreground">{mw.functie || mw.rol}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
              {formData.monteurs.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
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
                          <div className={cn('w-2 h-2 rounded-full', cfg.darkBg)} />
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
              className="bg-gradient-to-r from-accent to-primary border-0"
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
