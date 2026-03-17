import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Plus,
  FileText,
  Loader2,
  Search,
  LayoutGrid,
  List,
  Bell,
  BellRing,
  Phone,
  CalendarPlus,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Calendar,
  Target,
  DollarSign,
  BarChart3,
  Users,
  Eye,
  EyeOff,
  MoreHorizontal,
  CheckCircle2,
  Download,
  Settings,
  GripVertical,
  Trash2,
  Save,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getOffertes, updateOfferte, updateAppSettings } from '@/services/supabaseService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Offerte, PipelineStap } from '@/types'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ModuleHeader } from '@/components/shared/ModuleHeader'
import { DagenOpenFilterBar, getDaysOpen, getDaysColor, matchDagenFilter } from '@/components/shared/DagenOpenFilter'
import type { DagenOpenFilter } from '@/components/shared/DagenOpenFilter'
import { exportCSV, exportExcel } from '@/lib/export'
import { round2 } from '@/utils/budgetUtils'
import { logger } from '../../utils/logger'
import { SkeletonTable } from '@/components/ui/skeleton'

type ViewMode = 'pipeline' | 'lijst'
type SortOption = 'newest' | 'oldest' | 'highest' | 'expiring'
type PriorityFilter = 'alle' | 'laag' | 'medium' | 'hoog' | 'urgent'
type StatusFilter = 'alle' | 'concept' | 'verzonden' | 'bekeken' | 'goedgekeurd' | 'afgewezen' | 'verlopen' | 'gefactureerd' | 'wacht_op_reactie'

const DEFAULT_STATUS_COLUMNS = [
  { key: 'concept', label: 'Concept', color: 'from-[var(--color-cream)]/30 to-[var(--color-cream)]/10', accent: 'bg-[var(--color-cream-text)]', headerBg: 'bg-[var(--color-cream)]/60' },
  { key: 'verzonden', label: 'Verstuurd', color: 'from-[var(--color-mist)]/30 to-[var(--color-mist)]/10', accent: 'bg-[var(--color-mist-text)]', headerBg: 'bg-[var(--color-mist)]/60' },
  { key: 'bekeken', label: 'Bekeken', color: 'from-[var(--color-cream)]/30 to-[var(--color-cream)]/10', accent: 'bg-[var(--color-cream-text)]', headerBg: 'bg-[var(--color-cream)]/60' },
  { key: 'goedgekeurd', label: 'Akkoord', color: 'from-[var(--color-sage)]/30 to-[var(--color-sage)]/10', accent: 'bg-[var(--color-sage-text)]', headerBg: 'bg-[var(--color-sage)]/60' },
  { key: 'gefactureerd', label: 'Gefactureerd', color: 'from-[var(--color-lavender)]/30 to-[var(--color-lavender)]/10', accent: 'bg-[var(--color-lavender-text)]', headerBg: 'bg-[var(--color-lavender)]/60' },
]

const CLOSED_STATUS_COLUMNS = [
  { key: 'afgewezen', label: 'Afgewezen', color: 'from-[var(--color-coral)]/30 to-[var(--color-coral)]/10', accent: 'bg-[var(--color-coral-text)]', headerBg: 'bg-[var(--color-coral)]/60' },
  { key: 'verlopen', label: 'Verlopen', color: 'from-[var(--color-blush)]/30 to-[var(--color-blush)]/10', accent: 'bg-[var(--color-blush-text)]', headerBg: 'bg-[var(--color-blush)]/60' },
]

const KLEUR_TO_STYLE: Record<string, { color: string; accent: string; headerBg: string }> = {
  gray: { color: 'from-[var(--color-cream)]/30 to-[var(--color-cream)]/10', accent: 'bg-[var(--color-cream-text)]', headerBg: 'bg-[var(--color-cream)]/60' },
  blue: { color: 'from-[var(--color-mist)]/30 to-[var(--color-mist)]/10', accent: 'bg-[var(--color-mist-text)]', headerBg: 'bg-[var(--color-mist)]/60' },
  purple: { color: 'from-[var(--color-lavender)]/30 to-[var(--color-lavender)]/10', accent: 'bg-[var(--color-lavender-text)]', headerBg: 'bg-[var(--color-lavender)]/60' },
  green: { color: 'from-[var(--color-sage)]/30 to-[var(--color-sage)]/10', accent: 'bg-[var(--color-sage-text)]', headerBg: 'bg-[var(--color-sage)]/60' },
  red: { color: 'from-[var(--color-coral)]/30 to-[var(--color-coral)]/10', accent: 'bg-[var(--color-coral-text)]', headerBg: 'bg-[var(--color-coral)]/60' },
  orange: { color: 'from-[var(--color-blush)]/30 to-[var(--color-blush)]/10', accent: 'bg-[var(--color-blush-text)]', headerBg: 'bg-[var(--color-blush)]/60' },
  teal: { color: 'from-[var(--color-sage)]/30 to-[var(--color-sage)]/10', accent: 'bg-[var(--color-sage-text)]', headerBg: 'bg-[var(--color-sage)]/60' },
}

const PRIORITY_COLORS: Record<string, string> = {
  laag: 'badge-sage',
  medium: 'badge-cream',
  hoog: 'badge-blush',
  urgent: 'badge-coral',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  concept: 'badge-cream',
  verzonden: 'badge-mist',
  bekeken: 'badge-cream',
  goedgekeurd: 'badge-sage',
  afgewezen: 'badge-coral',
  verlopen: 'badge-blush',
  gefactureerd: 'badge-lavender',
  wijziging_gevraagd: 'badge-blush',
}

const STATUS_LABELS: Record<string, string> = {
  concept: 'Concept',
  verzonden: 'Verstuurd',
  bekeken: 'Bekeken',
  goedgekeurd: 'Akkoord',
  afgewezen: 'Afgewezen',
  verlopen: 'Verlopen',
  gefactureerd: 'Gefactureerd',
  wijziging_gevraagd: 'Wijziging gevraagd',
}

const statusOpties = [
  { value: 'alle', label: 'Alle' },
  { value: 'wacht_op_reactie', label: 'Wacht op reactie' },
  { value: 'concept', label: 'Concept' },
  { value: 'verzonden', label: 'Verstuurd' },
  { value: 'bekeken', label: 'Bekeken' },
  { value: 'goedgekeurd', label: 'Akkoord' },
  { value: 'gefactureerd', label: 'Gefactureerd' },
  { value: 'afgewezen', label: 'Afgewezen' },
  { value: 'verlopen', label: 'Verlopen' },
  { value: 'wijziging_gevraagd', label: 'Wijziging gevraagd' },
]

function getOfferteStatusDotColor(status: string): string {
  switch (status) {
    case 'concept': return 'bg-[var(--color-cream-text)]'
    case 'verzonden': return 'bg-[var(--color-mist-text)]'
    case 'bekeken': return 'bg-[var(--color-cream-text)]'
    case 'goedgekeurd': return 'bg-[var(--color-sage-text)]'
    case 'afgewezen': return 'bg-[var(--color-coral-text)]'
    case 'verlopen': return 'bg-[var(--color-blush-text)]'
    case 'gefactureerd': return 'bg-[var(--color-lavender-text)]'
    case 'wijziging_gevraagd': return 'bg-[var(--color-blush-text)]'
    default: return 'bg-[var(--color-cream-text)]'
  }
}

function getOfferteStatusBorderColor(status: string): string {
  switch (status) {
    case 'concept': return 'border-l-[var(--color-cream-border)]'
    case 'verzonden': return 'border-l-[var(--color-mist-border)]'
    case 'bekeken': return 'border-l-[var(--color-cream-border)]'
    case 'goedgekeurd': return 'border-l-[var(--color-sage-border)]'
    case 'afgewezen': return 'border-l-[var(--color-coral-border)]'
    case 'verlopen': return 'border-l-[var(--color-blush-border)]'
    case 'gefactureerd': return 'border-l-[var(--color-lavender-border)]'
    case 'wijziging_gevraagd': return 'border-l-[var(--color-blush-border)]'
    default: return 'border-l-[var(--color-cream-border)]'
  }
}

function getOfferteStatusCellBg(status: string): string {
  switch (status) {
    case 'concept': return 'bg-[var(--color-cream)]/50'
    case 'verzonden': return 'bg-[var(--color-mist)]/50'
    case 'bekeken': return 'bg-[var(--color-cream)]/50'
    case 'goedgekeurd': return 'bg-[var(--color-sage)]/50'
    case 'afgewezen': return 'bg-[var(--color-coral)]/50'
    case 'verlopen': return 'bg-[var(--color-blush)]/50'
    case 'gefactureerd': return 'bg-[var(--color-lavender)]/50'
    case 'wijziging_gevraagd': return 'bg-[var(--color-blush)]/50'
    default: return 'bg-muted/30 dark:bg-muted/20'
  }
}


const OPEN_STATUSES = ['concept', 'verzonden', 'bekeken', 'wijziging_gevraagd']

function getExpiryStatus(geldigTot: string): 'expired' | 'soon' | 'ok' {
  const expiry = new Date(geldigTot)
  const now = new Date()
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry < 7) return 'soon'
  return 'ok'
}

function getFollowUpState(offerte: Offerte): 'overdue' | 'today' | 'upcoming' | 'none' {
  if (!offerte.follow_up_datum) return 'none'
  if (offerte.follow_up_status === 'afgerond') return 'none'
  const followUp = new Date(offerte.follow_up_datum)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const fuDate = new Date(followUp.getFullYear(), followUp.getMonth(), followUp.getDate())
  if (fuDate.getTime() < today.getTime()) return 'overdue'
  if (fuDate.getTime() === today.getTime()) return 'today'
  return 'upcoming'
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'vandaag'
  if (diffDays === 1) return 'gisteren'
  if (diffDays < 7) return `${diffDays}d geleden`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w geleden`
  return formatDate(dateStr)
}

export function QuotesPipeline() {
  const navigate = useNavigate()
  const { navigateWithTab } = useNavigateWithTab()
  const { user } = useAuth()
  const { pipelineStappen, toonConversieRate, toonDagenOpen, toonFollowUpIndicatoren, valuta, refreshSettings } = useAppSettings()
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('lijst')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('alle')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [dagenOpenFilter, setDagenOpenFilter] = useState<DagenOpenFilter>('alle')
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [showClosed, setShowClosed] = useState(false)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Pipeline settings panel
  const [showPipelineSettings, setShowPipelineSettings] = useState(false)
  const [editStappen, setEditStappen] = useState<PipelineStap[]>([])
  const [isSavingPipeline, setIsSavingPipeline] = useState(false)

  useEffect(() => {
    if (pipelineStappen) setEditStappen([...pipelineStappen])
  }, [pipelineStappen])

  const handleAddPipelineStap = () => {
    setEditStappen([...editStappen, {
      key: `custom_${Date.now()}`,
      label: 'Nieuwe stap',
      kleur: 'blue',
      volgorde: editStappen.length,
      actief: true,
    }])
  }

  const handleRemovePipelineStap = (index: number) => {
    const stap = editStappen[index]
    if (['concept', 'goedgekeurd', 'afgewezen'].includes(stap.key)) {
      toast.error('Deze standaard stap kan niet worden verwijderd')
      return
    }
    setEditStappen(editStappen.filter((_, i) => i !== index))
  }

  const handleUpdatePipelineStap = (index: number, updates: Partial<PipelineStap>) => {
    setEditStappen(editStappen.map((stap, i) => (i === index ? { ...stap, ...updates } : stap)))
  }

  const handleSavePipeline = async () => {
    if (!user?.id) return
    try {
      setIsSavingPipeline(true)
      await updateAppSettings(user.id, { pipeline_stappen: editStappen })
      await refreshSettings()
      toast.success('Pipeline opgeslagen')
      setShowPipelineSettings(false)
    } catch (err) {
      logger.error('Fout bij opslaan pipeline:', err)
      toast.error('Kon pipeline niet opslaan')
    } finally {
      setIsSavingPipeline(false)
    }
  }

  const STATUS_COLUMNS = useMemo(() => {
    if (pipelineStappen && pipelineStappen.length > 0) {
      return pipelineStappen
        .filter(stap => stap.actief)
        .sort((a, b) => a.volgorde - b.volgorde)
        .map(stap => {
          const styles = KLEUR_TO_STYLE[stap.kleur] || KLEUR_TO_STYLE.gray
          return { key: stap.key, label: stap.label, ...styles }
        })
    }
    const cols = [...DEFAULT_STATUS_COLUMNS]
    if (showClosed) cols.push(...CLOSED_STATUS_COLUMNS)
    return cols
  }, [pipelineStappen, showClosed])

  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [followUpOpen, setFollowUpOpen] = useState<string | null>(null)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')
  const [savingFollowUp, setSavingFollowUp] = useState(false)
  const [callingClient, setCallingClient] = useState<string | null>(null)
  const [listSortColumn, setListSortColumn] = useState<string>('created_at')
  const [listSortDir, setListSortDir] = useState<'asc' | 'desc'>('desc')

  const priorityRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  const loadOffertes = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getOffertes()
      setOffertes(data)
    } catch (err) {
      logger.error('Fout bij ophalen offertes:', err)
      setError('Kan offertes niet laden. Probeer opnieuw.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOffertes()
  }, [loadOffertes])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setShowPriorityDropdown(false)
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOffertes = useMemo(() => {
    let result = [...offertes]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (o) =>
          o.nummer.toLowerCase().includes(q) ||
          o.titel.toLowerCase().includes(q) ||
          (o.klant_naam || '').toLowerCase().includes(q)
      )
    }

    if (priorityFilter !== 'alle') {
      result = result.filter((o) => o.prioriteit === priorityFilter)
    }

    if (statusFilter === 'wacht_op_reactie') {
      result = result.filter((o) => o.status === 'verzonden' || o.status === 'bekeken')
    } else if (statusFilter !== 'alle') {
      result = result.filter((o) => o.status === statusFilter)
    }

    if (dagenOpenFilter !== 'alle') {
      result = result.filter((o) => {
        if (!OPEN_STATUSES.includes(o.status)) return false
        return matchDagenFilter(getDaysOpen(o.created_at), dagenOpenFilter)
      })
    }

    switch (sortOption) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'highest':
        result.sort((a, b) => b.totaal - a.totaal)
        break
      case 'expiring':
        result.sort((a, b) => new Date(a.geldig_tot).getTime() - new Date(b.geldig_tot).getTime())
        break
    }

    return result
  }, [offertes, searchQuery, priorityFilter, statusFilter, dagenOpenFilter, sortOption])

  const offertesByStatus = useMemo(() => {
    const map: Record<string, Offerte[]> = {}
    for (const col of STATUS_COLUMNS) {
      map[col.key] = filteredOffertes.filter((o) => o.status === col.key)
    }
    return map
  }, [filteredOffertes, STATUS_COLUMNS])

  // Sales summary
  const salesSummary = useMemo(() => {
    const pipelineStatuses = ['concept', 'verzonden', 'bekeken']
    const pipelineOffertes = offertes.filter((o) => pipelineStatuses.includes(o.status))
    const pipelineValue = round2(pipelineOffertes.reduce((sum, o) => sum + o.totaal, 0))

    const verstuurdOffertes = offertes.filter((o) => o.status === 'verzonden')
    const verstuurdValue = round2(verstuurdOffertes.reduce((sum, o) => sum + o.totaal, 0))

    const akkoordThisMonth = offertes.filter(
      (o) => o.status === 'goedgekeurd' && isThisMonth(o.akkoord_op || o.updated_at)
    )
    const akkoordValue = round2(akkoordThisMonth.reduce((sum, o) => sum + o.totaal, 0))

    return { pipelineValue, verstuurdValue, akkoordValue }
  }, [offertes])

  // Financial overview per status
  const financialSummary = useMemo(() => {
    const statusTotals: Record<string, { count: number; totaal: number }> = {}
    const allStatuses = ['concept', 'verzonden', 'bekeken', 'goedgekeurd', 'verlopen', 'afgewezen', 'gefactureerd']
    for (const s of allStatuses) {
      statusTotals[s] = { count: 0, totaal: 0 }
    }
    for (const o of offertes) {
      if (!statusTotals[o.status]) {
        statusTotals[o.status] = { count: 0, totaal: 0 }
      }
      statusTotals[o.status].count += 1
      statusTotals[o.status].totaal = round2(statusTotals[o.status].totaal + o.totaal)
    }

    // Totale pipeline = alles behalve afgewezen en gefactureerd
    const pipelineTotaal = round2(
      offertes
        .filter((o) => o.status !== 'afgewezen' && o.status !== 'gefactureerd')
        .reduce((sum, o) => sum + o.totaal, 0)
    )

    // Verwachte omzet = goedgekeurde offertes
    const verwachteOmzet = round2(statusTotals['goedgekeurd']?.totaal || 0)

    return { statusTotals, pipelineTotaal, verwachteOmzet }
  }, [offertes])

  const kpis = useMemo(() => {
    const openStatuses = ['verzonden', 'bekeken']
    const openOffertes = offertes.filter((o) => openStatuses.includes(o.status))
    const openCount = openOffertes.length
    const openValue = round2(openOffertes.reduce((sum, o) => sum + o.totaal, 0))

    const sentStatuses = ['verzonden', 'bekeken', 'goedgekeurd', 'afgewezen']
    const sentOffertes = offertes.filter((o) => sentStatuses.includes(o.status))
    const approved = offertes.filter((o) => o.status === 'goedgekeurd').length
    const conversionRate = sentOffertes.length > 0 ? round2((approved / sentOffertes.length) * 100) : 0

    const allValues = offertes.map((o) => o.totaal)
    const avgValue = allValues.length > 0 ? round2(allValues.reduce((s, v) => s + v, 0) / allValues.length) : 0

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const overdueFollowUps = offertes.filter((o) => {
      if (!o.follow_up_datum || o.follow_up_status === 'afgerond') return false
      const fuDate = new Date(o.follow_up_datum)
      return fuDate < today
    }).length

    const thisMonthCount = offertes.filter((o) => isThisMonth(o.created_at)).length

    return { openCount, openValue, conversionRate, avgValue, overdueFollowUps, thisMonthCount }
  }, [offertes])

  // Drag & drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, offerteId: string) => {
    e.dataTransfer.setData('offerteId', offerteId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, colKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(colKey)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    const offerteId = e.dataTransfer.getData('offerteId')
    if (!offerteId) return

    const offerte = offertes.find((o) => o.id === offerteId)
    if (!offerte || offerte.status === newStatus) return

    try {
      const updates: Partial<Offerte> = { status: newStatus as Offerte['status'] }
      if (newStatus === 'verzonden' && !offerte.verstuurd_op) {
        updates.verstuurd_op = new Date().toISOString()
      }
      if (newStatus === 'goedgekeurd') {
        updates.akkoord_op = new Date().toISOString()
      }

      const updated = await updateOfferte(offerteId, updates)
      setOffertes((prev) => prev.map((o) => (o.id === offerteId ? { ...o, ...updated } : o)))
      toast.success(`${offerte.nummer} → ${STATUS_LABELS[newStatus] || newStatus}`)
    } catch (err) {
      logger.error('Drag & drop status update failed:', err)
      toast.error('Kon status niet bijwerken')
    }
  }, [offertes])

  const handleSaveFollowUp = useCallback(
    async (offerteId: string) => {
      if (!followUpDate) {
        toast.error('Selecteer een datum voor de follow-up')
        return
      }
      try {
        setSavingFollowUp(true)
        const updated = await updateOfferte(offerteId, {
          follow_up_datum: followUpDate,
          follow_up_notitie: followUpNote,
          follow_up_status: 'gepland',
        })
        setOffertes((prev) => prev.map((o) => (o.id === offerteId ? { ...o, ...updated } : o)))
        toast.success('Follow-up ingepland')
        setFollowUpOpen(null)
        setFollowUpDate('')
        setFollowUpNote('')
      } catch (err) {
        logger.error('Fout bij opslaan follow-up:', err)
        toast.error('Kon follow-up niet opslaan')
      } finally {
        setSavingFollowUp(false)
      }
    },
    [followUpDate, followUpNote]
  )

  const handleCallClient = useCallback(async (offerte: Offerte) => {
    try {
      setCallingClient(offerte.id)
      const now = new Date().toISOString()
      const updated = await updateOfferte(offerte.id, {
        contact_pogingen: (offerte.contact_pogingen || 0) + 1,
        laatste_contact: now,
      })
      setOffertes((prev) => prev.map((o) => (o.id === offerte.id ? { ...o, ...updated } : o)))
      toast.success(`Contactpoging ${(offerte.contact_pogingen || 0) + 1} geregistreerd`)
    } catch (err) {
      logger.error('Fout bij registreren contactpoging:', err)
      toast.error('Kon contactpoging niet registreren')
    } finally {
      setCallingClient(null)
    }
  }, [])

  const handleListSort = useCallback(
    (column: string) => {
      if (listSortColumn === column) {
        setListSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setListSortColumn(column)
        setListSortDir('asc')
      }
    },
    [listSortColumn]
  )

  const handleStatusChange = useCallback(async (offerteId: string, newStatus: string) => {
    try {
      const updates: Partial<Offerte> = { status: newStatus as Offerte['status'] }
      if (newStatus === 'verzonden') updates.verstuurd_op = new Date().toISOString()
      if (newStatus === 'goedgekeurd') updates.akkoord_op = new Date().toISOString()
      const updated = await updateOfferte(offerteId, updates)
      setOffertes((prev) => prev.map((o) => (o.id === offerteId ? { ...o, ...updated } : o)))
      toast.success(`Status gewijzigd naar ${STATUS_LABELS[newStatus] || newStatus}`)
    } catch (err) {
      logger.error('Fout bij statuswijziging:', err)
      toast.error('Kon status niet wijzigen')
    }
  }, [])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredOffertes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredOffertes.map((o) => o.id)))
    }
  }

  async function handleBulkStatusChange(newStatus: string) {
    if (selectedIds.size === 0) return
    try {
      const updates: Partial<Offerte> = { status: newStatus as Offerte['status'] }
      if (newStatus === 'verzonden') updates.verstuurd_op = new Date().toISOString()
      if (newStatus === 'goedgekeurd') updates.akkoord_op = new Date().toISOString()
      await Promise.all(
        [...selectedIds].map((id) => updateOfferte(id, updates))
      )
      setOffertes((prev) =>
        prev.map((o) => selectedIds.has(o.id) ? { ...o, ...updates } : o)
      )
      toast.success(`${selectedIds.size} offerte${selectedIds.size === 1 ? '' : 's'} gewijzigd naar ${STATUS_LABELS[newStatus] || newStatus}`)
      setSelectedIds(new Set())
    } catch (err) {
      logger.error('Fout bij bulk statuswijziging:', err)
      toast.error('Kon status niet wijzigen')
    }
  }

  const sortedListOffertes = useMemo(() => {
    const sorted = [...filteredOffertes]
    const dir = listSortDir === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      switch (listSortColumn) {
        case 'nummer':
          return a.nummer.localeCompare(b.nummer) * dir
        case 'klant_naam':
          return (a.klant_naam || '').localeCompare(b.klant_naam || '') * dir
        case 'titel':
          return a.titel.localeCompare(b.titel) * dir
        case 'totaal':
          return (a.totaal - b.totaal) * dir
        case 'status':
          return a.status.localeCompare(b.status) * dir
        case 'days_open':
          return (getDaysOpen(a.created_at) - getDaysOpen(b.created_at)) * dir
        case 'geldig_tot':
          return (new Date(a.geldig_tot).getTime() - new Date(b.geldig_tot).getTime()) * dir
        default:
          return (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) * dir
      }
    })
    return sorted
  }, [filteredOffertes, listSortColumn, listSortDir])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted animate-shimmer" />
            <div className="space-y-2">
              <div className="h-6 w-32 rounded-lg animate-shimmer" />
              <div className="h-3 w-48 rounded-lg animate-shimmer" />
            </div>
          </div>
          <div className="h-9 w-36 rounded-lg animate-shimmer" />
        </div>
        <SkeletonTable rows={6} cols={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button variant="outline" onClick={loadOffertes}>
            Opnieuw proberen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col animate-fade-in-up mod-strip mod-strip-offertes">
      {/* ── Header bar ── */}
      <ModuleHeader
        module="offertes"
        icon={FileText}
        title="Offertes"
        subtitle={`${filteredOffertes.length} van ${offertes.length} offertes`}
        actions={
          <Button asChild size="sm" className="flex-shrink-0 shadow-sm">
            <Link to="/offertes/nieuw">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nieuwe offerte</span>
              <span className="sm:hidden">Nieuw</span>
            </Link>
          </Button>
        }
      />

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-5 p-4 sm:p-6">

      {/* ── Quick stats ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {kpis.openCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" style={{ color: 'var(--color-lavender-text)', background: 'var(--color-lavender)', border: '1px solid var(--color-lavender-border)' }}>
            <FileText className="w-3 h-3" />
            {kpis.openCount} open
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" style={{ color: 'var(--color-sage-text)', background: 'var(--color-sage)', border: '1px solid var(--color-sage-border)' }}>
          <TrendingUp className="w-3 h-3" />
          <span className="tabular-nums">{kpis.conversionRate}%</span> conversie
        </div>
        {kpis.overdueFollowUps > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" style={{ color: 'var(--color-coral-text)', background: 'var(--color-coral)', border: '1px solid var(--color-coral-border)' }}>
            <AlertTriangle className="w-3 h-3" />
            {kpis.overdueFollowUps} achterstallig
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" style={{ color: 'var(--color-sage-text)', background: 'var(--color-sage)', border: '1px solid var(--color-sage-border)' }}>
          <DollarSign className="w-3 h-3" />
          Pipeline {formatCurrency(financialSummary.pipelineTotaal)}
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op nummer, titel of klant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* View toggle */}
            <div className="flex items-center bg-muted/60 rounded-lg p-0.5 mr-1">
              <button
                onClick={() => setViewMode('lijst')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'lijst' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Lijstweergave"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'pipeline' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Kanban"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => setShowPipelineSettings(!showPipelineSettings)}
              className={cn(
                'p-1.5 rounded transition-colors mr-1',
                showPipelineSettings ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Pipeline instellingen"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex h-8 px-2 text-xs text-muted-foreground"
              onClick={() => {
                const headers = ['Nummer', 'Klant', 'Titel', 'Status', 'Bedrag', 'Aangemaakt', 'Geldig tot']
                const rows = filteredOffertes.map((o) => ({
                  Nummer: o.nummer,
                  Klant: o.klant_naam || 'Onbekend',
                  Titel: o.titel,
                  Status: STATUS_LABELS[o.status] || o.status,
                  Bedrag: formatCurrency(o.totaal),
                  Aangemaakt: formatDate(o.created_at),
                  'Geldig tot': formatDate(o.geldig_tot),
                }))
                exportCSV(`offertes-${new Date().toISOString().split('T')[0]}`, headers, rows)
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex h-8 px-2 text-xs text-muted-foreground"
              onClick={() => {
                const headers = ['Nummer', 'Klant', 'Titel', 'Status', 'Bedrag', 'Aangemaakt', 'Geldig tot']
                const rows = filteredOffertes.map((o) => ({
                  Nummer: o.nummer,
                  Klant: o.klant_naam || 'Onbekend',
                  Titel: o.titel,
                  Status: STATUS_LABELS[o.status] || o.status,
                  Bedrag: o.totaal,
                  Aangemaakt: formatDate(o.created_at),
                  'Geldig tot': formatDate(o.geldig_tot),
                }))
                exportExcel(`offertes-${new Date().toISOString().split('T')[0]}`, headers, rows, 'Offertes')
              }}
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Excel
            </Button>
          </div>
        </div>

        {/* Status filter pills - scrollable on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          {statusOpties.map((optie) => {
            const count = optie.value === 'alle'
              ? offertes.length
              : optie.value === 'wacht_op_reactie'
              ? offertes.filter((o) => o.status === 'verzonden' || o.status === 'bekeken').length
              : offertes.filter((o) => o.status === optie.value).length
            if (optie.value !== 'alle' && count === 0) return null
            return (
              <button
                key={optie.value}
                onClick={() => setStatusFilter(optie.value as StatusFilter)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0',
                  statusFilter === optie.value
                    ? 'bg-foreground text-background'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                )}
              >
                {optie.label}
                {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Dagen open filter pills */}
        <DagenOpenFilterBar
          value={dagenOpenFilter}
          onChange={setDagenOpenFilter}
          items={offertes.filter((o) => OPEN_STATUSES.includes(o.status)).map((o) => ({ dateField: o.created_at }))}
        />
      </div>

      {/* Pipeline Settings Panel */}
      {showPipelineSettings && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Pipeline Stappen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editStappen.map((stap, index) => (
              <div
                key={stap.key}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      stap.kleur === 'gray' ? '#9ca3af' :
                      stap.kleur === 'blue' ? '#3b82f6' :
                      stap.kleur === 'purple' ? '#8b5cf6' :
                      stap.kleur === 'green' ? '#22c55e' :
                      stap.kleur === 'red' ? '#ef4444' :
                      stap.kleur === 'orange' ? '#f97316' :
                      stap.kleur === 'teal' ? '#14b8a6' :
                      '#6b7280'
                  }}
                />
                <Input
                  value={stap.label}
                  onChange={(e) => handleUpdatePipelineStap(index, { label: e.target.value })}
                  className="flex-1 h-8"
                />
                <Select
                  value={stap.kleur}
                  onValueChange={(v) => handleUpdatePipelineStap(index, { kleur: v })}
                >
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gray">Grijs</SelectItem>
                    <SelectItem value="blue">Blauw</SelectItem>
                    <SelectItem value="purple">Paars</SelectItem>
                    <SelectItem value="green">Groen</SelectItem>
                    <SelectItem value="red">Rood</SelectItem>
                    <SelectItem value="orange">Oranje</SelectItem>
                    <SelectItem value="teal">Teal</SelectItem>
                  </SelectContent>
                </Select>
                <Switch
                  checked={stap.actief}
                  onCheckedChange={(checked) => handleUpdatePipelineStap(index, { actief: checked })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePipelineStap(index)}
                  className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleAddPipelineStap} className="gap-2">
                <Plus className="w-4 h-4" />
                Stap Toevoegen
              </Button>
              <Button size="sm" onClick={handleSavePipeline} disabled={isSavingPipeline} className="gap-2 ml-auto">
                <Save className="w-4 h-4" />
                {isSavingPipeline ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline (Kanban) View */}
      {viewMode === 'pipeline' && (
        <>
        {/* Financial Overview per Status */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {([
            { key: 'concept' as const, label: 'Concept', borderColor: 'border-border/60 dark:border-stone-700/60', bgColor: 'from-muted/60 to-card dark:from-stone-900/30 dark:to-card', dotColor: 'bg-muted-foreground/40', textColor: 'text-muted-foreground dark:text-stone-400' },
            { key: 'verzonden' as const, label: 'Verstuurd', borderColor: 'border-sky-200/60 dark:border-sky-800/60', bgColor: 'from-sky-50/80 to-card dark:from-sky-950/30 dark:to-card', dotColor: 'bg-sky-400', textColor: 'text-sky-600 dark:text-sky-400' },
            { key: 'bekeken' as const, label: 'Bekeken', borderColor: 'border-amber-200/60 dark:border-amber-800/60', bgColor: 'from-amber-50/80 to-card dark:from-amber-950/30 dark:to-card', dotColor: 'bg-amber-400', textColor: 'text-amber-600 dark:text-amber-400' },
            { key: 'goedgekeurd' as const, label: 'Akkoord', borderColor: 'border-primary/20 dark:border-primary/15', bgColor: 'from-wm-pale/20 to-card dark:from-primary/10 dark:to-card', dotColor: 'bg-primary', textColor: 'text-accent dark:text-wm-light' },
            { key: 'verlopen' as const, label: 'Verlopen', borderColor: 'border-orange-200/60 dark:border-orange-800/60', bgColor: 'from-orange-50/80 to-card dark:from-orange-950/30 dark:to-card', dotColor: 'bg-orange-400', textColor: 'text-orange-600 dark:text-orange-400' },
            { key: 'afgewezen' as const, label: 'Afgewezen', borderColor: 'border-red-200/60 dark:border-red-800/60', bgColor: 'from-red-50/80 to-card dark:from-red-950/30 dark:to-card', dotColor: 'bg-red-400', textColor: 'text-red-600 dark:text-red-400' },
          ]).map((col) => {
            const data = financialSummary.statusTotals[col.key] || { count: 0, totaal: 0 }
            return (
              <div
                key={col.key}
                className={`relative overflow-hidden rounded-xl border ${col.borderColor} bg-gradient-to-br ${col.bgColor} backdrop-blur-sm p-5 text-left`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className={`text-xs font-bold ${col.textColor} uppercase tracking-label`}>{col.label}</span>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">{formatCurrency(data.totaal)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.count} {data.count === 1 ? 'offerte' : 'offertes'}
                </p>
              </div>
            )
          })}
        </div>

        {/* Sales Summary Bar */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 px-4 sm:px-5 py-3 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Pipeline:</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-foreground whitespace-nowrap">{formatCurrency(salesSummary.pipelineValue)}</span>
          </div>
          <div className="hidden sm:block w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Verstuurd:</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-foreground whitespace-nowrap">{formatCurrency(salesSummary.verstuurdValue)}</span>
          </div>
          <div className="hidden sm:block w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Akkoord:</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatCurrency(salesSummary.akkoordValue)}</span>
          </div>
        </div>

        {/* Kanban Board */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[480px] ${STATUS_COLUMNS.length <= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-' + Math.min(STATUS_COLUMNS.length, 7)}`}>
          {STATUS_COLUMNS.map((col) => {
            const colOffertes = offertesByStatus[col.key] || []
            const colTotal = round2(colOffertes.reduce((sum, o) => sum + o.totaal, 0))
            const isDragOver = dragOverColumn === col.key

            return (
              <div
                key={col.key}
                className={`rounded-xl border bg-gradient-to-b ${col.color} backdrop-blur-sm flex flex-col overflow-hidden transition-all duration-150 ${
                  isDragOver
                    ? 'border-primary shadow-lg scale-[1.01]'
                    : 'border-border/60'
                }`}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 ${col.headerBg} backdrop-blur-sm border-b border-border/50 dark:border-border/50`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                    <h3 className="font-bold text-sm text-foreground">
                      {col.label}
                    </h3>
                    <Badge variant="secondary" className="ml-auto text-xs px-2 py-0 h-5 rounded-lg">
                      {colOffertes.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium font-mono pl-4">
                    {formatCurrency(colTotal)}
                  </p>
                </div>

                {/* Column Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[100px]">
                  {colOffertes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-2">
                        <FileText className="h-5 w-5 text-primary/30" />
                      </div>
                      <p className="text-xs text-muted-foreground/60">
                        Geen offertes
                      </p>
                    </div>
                  )}

                  {colOffertes.map((offerte) => {
                    const daysOpen = getDaysOpen(offerte.created_at)
                    const expiryStatus = getExpiryStatus(offerte.geldig_tot)
                    const followUpState = getFollowUpState(offerte)
                    const showActions = col.key === 'verzonden' || col.key === 'bekeken'

                    return (
                      <div key={offerte.id} className="relative group">
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, offerte.id)}
                          onClick={() => navigateWithTab({ path: `/offertes/${offerte.id}/bewerken`, label: offerte.nummer || offerte.titel || 'Offerte', id: `/offertes/${offerte.id}` })}
                          className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/60 p-3 space-y-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:cursor-grabbing"
                        >
                          {/* Top row: nummer + indicators */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-mono font-medium text-accent dark:text-wm-light">
                              {offerte.nummer}
                            </span>
                            <div className="flex items-center gap-1">
                              {offerte.prioriteit && offerte.prioriteit !== 'laag' && (
                                <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-md ${PRIORITY_COLORS[offerte.prioriteit] || ''}`}>
                                  {offerte.prioriteit.charAt(0).toUpperCase() + offerte.prioriteit.slice(1)}
                                </span>
                              )}
                              {followUpState === 'overdue' && (
                                <BellRing className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                              )}
                              {followUpState === 'today' && (
                                <BellRing className="h-3.5 w-3.5 text-orange-500" />
                              )}
                              {followUpState === 'upcoming' && (
                                <Bell className="h-3.5 w-3.5 text-primary" />
                              )}
                              {offerte.bekeken_door_klant && (
                                <span className="inline-flex items-center gap-0.5" title={`Bekeken door klant${offerte.aantal_keer_bekeken ? ` (${offerte.aantal_keer_bekeken}x)` : ''}`}>
                                  <Eye className="h-3.5 w-3.5 text-emerald-500" />
                                  {offerte.aantal_keer_bekeken && offerte.aantal_keer_bekeken > 1 && (
                                    <span className="text-2xs text-emerald-600 font-medium">{offerte.aantal_keer_bekeken}x</span>
                                  )}
                                </span>
                              )}
                              {offerte.geaccepteerd_door && (
                                <span className="text-2xs text-emerald-600 font-medium truncate max-w-[80px]" title={`Geaccepteerd door ${offerte.geaccepteerd_door}`}>
                                  ✓ {offerte.geaccepteerd_door}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Client name */}
                          <p className="text-xs text-muted-foreground truncate">
                            {offerte.klant_naam || 'Onbekende klant'}
                          </p>

                          {/* Amount + relative date + days open */}
                          <div className="flex items-center justify-between pt-2 border-t border-border dark:border-border/50">
                            <span className="text-sm font-bold font-mono text-foreground">
                              {formatCurrency(offerte.totaal)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {OPEN_STATUSES.includes(offerte.status) && (
                                <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-md ${getDaysColor(daysOpen)}`}>
                                  {daysOpen}d
                                </span>
                              )}
                              <span className="text-2xs text-muted-foreground">
                                {relativeDate(offerte.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Expiry warning */}
                          {expiryStatus === 'expired' && (
                            <span className="text-2xs font-semibold px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                              Verlopen
                            </span>
                          )}
                          {expiryStatus === 'soon' && (
                            <span className="text-2xs font-semibold px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                              Verloopt binnenkort
                            </span>
                          )}
                        </div>

                        {/* Quick Actions for verzonden/bekeken */}
                        {showActions && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (followUpOpen === offerte.id) {
                                  setFollowUpOpen(null)
                                } else {
                                  setFollowUpOpen(offerte.id)
                                  setFollowUpDate(offerte.follow_up_datum || '')
                                  setFollowUpNote(offerte.follow_up_notitie || '')
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg bg-primary/8 dark:bg-primary/15 text-accent dark:text-wm-light hover:bg-primary/15 dark:hover:bg-primary/25 transition-colors"
                            >
                              <CalendarPlus className="h-3 w-3" />
                              Follow-up
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleCallClient(offerte)
                              }}
                              disabled={callingClient === offerte.id}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                            >
                              {callingClient === offerte.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Phone className="h-3 w-3" />
                              )}
                              Bel Klant
                            </button>
                          </div>
                        )}

                        {/* Follow-up popover */}
                        {followUpOpen === offerte.id && (
                          <div
                            className="absolute left-0 right-0 top-full mt-1 z-50 bg-card rounded-xl border border-border shadow-xl p-3 space-y-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-foreground/80">
                                Follow-up plannen
                              </p>
                              <button
                                onClick={() => setFollowUpOpen(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                Datum
                              </label>
                              <input
                                type="date"
                                value={followUpDate}
                                onChange={(e) => setFollowUpDate(e.target.value)}
                                className="w-full rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                Notitie
                              </label>
                              <textarea
                                value={followUpNote}
                                onChange={(e) => setFollowUpNote(e.target.value)}
                                rows={2}
                                placeholder="Bijv. bellen over status offerte..."
                                className="w-full rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                              />
                            </div>
                            <Button
                              onClick={() => handleSaveFollowUp(offerte.id)}
                              disabled={savingFollowUp}
                              className="w-full h-8 text-xs rounded-lg"
                              size="sm"
                            >
                              {savingFollowUp ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                              ) : (
                                <Calendar className="h-3 w-3 mr-1.5" />
                              )}
                              Opslaan
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Pipeline Overview Summary */}
        <Card className="rounded-xl border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)] bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold tracking-[-0.02em] text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              Pipeline Overzicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {DEFAULT_STATUS_COLUMNS.map((col) => {
                const colOffertes = offertes.filter((o) => o.status === col.key)
                const colTotal = round2(colOffertes.reduce((sum, o) => sum + o.totaal, 0))
                return (
                  <div
                    key={col.key}
                    className="text-center p-5 rounded-xl bg-background/80 dark:bg-muted/30 border border-border dark:border-border/50 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                      <p className="text-sm font-medium text-muted-foreground">{col.label}</p>
                    </div>
                    <p className="text-xl font-bold font-mono text-foreground">{colOffertes.length}</p>
                    <p className="text-sm font-mono text-muted-foreground mt-0.5">{formatCurrency(colTotal)}</p>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">Totaal alle offertes</span>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="rounded-lg px-3 py-1 text-sm">
                  {offertes.length} offertes
                </Badge>
                <span className="text-lg font-bold font-mono text-foreground">
                  {formatCurrency(round2(offertes.reduce((s, o) => s + o.totaal, 0)))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {/* ── Bulk action bar (list view) ── */}
      {viewMode === 'lijst' && selectedIds.size > 0 && (
        <div className="relative overflow-hidden rounded-xl border shadow-sm" style={{ background: 'linear-gradient(135deg, var(--color-sage), #d4e8db)', borderColor: 'var(--color-sage-border)' }}>
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'var(--wm-noise)' }} />
          <div className="relative flex items-center gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: 'var(--color-sage-text)', color: 'white' }}>
                <span className="text-xs font-bold">{selectedIds.size}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-sage-text)' }}>
                  {selectedIds.size} offerte{selectedIds.size === 1 ? '' : 's'} geselecteerd
                </span>
                <span className="text-2xs font-medium" style={{ color: 'var(--color-sage-text)', opacity: 0.6 }}>
                  van {filteredOffertes.length} totaal
                </span>
              </div>
            </div>
            <button
              onClick={toggleSelectAll}
              className="text-xs font-semibold px-2.5 py-1 rounded-md transition-all hover:bg-card/40"
              style={{ color: 'var(--color-sage-text)' }}
            >
              {selectedIds.size === filteredOffertes.length ? 'Deselecteer alles' : 'Selecteer alles'}
            </button>
            <div className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold shadow-sm transition-all hover:shadow-md bg-card/90 backdrop-blur-sm border" style={{ color: 'var(--color-sage-text)', borderColor: 'var(--color-sage-border)' }}>
                  <ArrowUpDown className="w-3 h-3" />
                  Status wijzigen
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {statusOpties.filter(s => s.value !== 'alle').map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={() => handleBulkStatusChange(s.value)}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getOfferteStatusDotColor(s.value))} />
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-7 w-7 rounded-lg flex items-center justify-center transition-all hover:bg-card/40"
              style={{ color: 'var(--color-sage-text)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── List View (matches ProjectsList design) ── */}
      {viewMode === 'lijst' && (
        <>
          {sortedListOffertes.length === 0 ? (
            <Card className="border-dashed">
              <EmptyState
                module="offertes"
                title="Geen offertes gevonden"
                description={searchQuery || statusFilter !== 'alle'
                  ? 'Pas je filters aan of maak een nieuwe offerte aan.'
                  : 'Maak je eerste offerte en stuur hem direct naar je klant.'}
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/offertes/nieuw">
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Nieuwe offerte
                    </Link>
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden -mx-3 sm:mx-0">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="w-10 px-3 py-3">
                      <Checkbox
                        checked={sortedListOffertes.length > 0 && selectedIds.size === sortedListOffertes.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecteer alles"
                      />
                    </th>
                    <th className="text-left py-3 px-4 w-[110px]">
                      <span className="text-xs font-bold text-text-tertiary uppercase tracking-label">Status</span>
                    </th>
                    <th className="text-left py-3 px-4">
                      <button
                        onClick={() => handleListSort('nummer')}
                        className="flex items-center gap-1 text-xs font-bold text-text-tertiary uppercase tracking-label hover:text-foreground transition-colors"
                      >
                        Offerte
                        {listSortColumn === 'nummer' ? (
                          listSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 hidden lg:table-cell">
                      <button
                        onClick={() => handleListSort('klant_naam')}
                        className="flex items-center gap-1 text-xs font-bold text-text-tertiary uppercase tracking-label hover:text-foreground transition-colors"
                      >
                        Klant
                        {listSortColumn === 'klant_naam' ? (
                          listSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 hidden xl:table-cell">
                      <button
                        onClick={() => handleListSort('totaal')}
                        className="flex items-center gap-1 text-xs font-bold text-text-tertiary uppercase tracking-label hover:text-foreground transition-colors ml-auto"
                      >
                        Bedrag
                        {listSortColumn === 'totaal' ? (
                          listSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 hidden md:table-cell">
                      <button
                        onClick={() => handleListSort('created_at')}
                        className="flex items-center gap-1 text-xs font-bold text-text-tertiary uppercase tracking-label hover:text-foreground transition-colors ml-auto"
                      >
                        Datum
                        {listSortColumn === 'created_at' ? (
                          listSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 hidden lg:table-cell">
                      <button
                        onClick={() => handleListSort('days_open')}
                        className="flex items-center gap-1 text-xs font-bold text-text-tertiary uppercase tracking-label hover:text-foreground transition-colors ml-auto"
                      >
                        Dagen open
                        {listSortColumn === 'days_open' ? (
                          listSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 hidden md:table-cell">
                      <button
                        onClick={() => handleListSort('geldig_tot')}
                        className="flex items-center gap-1 text-xs font-bold text-text-tertiary uppercase tracking-label hover:text-foreground transition-colors ml-auto"
                      >
                        Geldig tot
                        {listSortColumn === 'geldig_tot' ? (
                          listSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="w-10 py-3 px-2" />
                  </tr>
                </thead>
                <tbody className="row-stagger">
                  {sortedListOffertes.map((offerte) => {
                    const expiryStatus = getExpiryStatus(offerte.geldig_tot)

                    return (
                      <tr
                        key={offerte.id}
                        className={cn(
                          'border-b border-border/50 last:border-0 hover:bg-bg-hover cursor-pointer transition-colors duration-150 group border-l-2',
                          getOfferteStatusBorderColor(offerte.status),
                          selectedIds.has(offerte.id) && 'bg-primary/5'
                        )}
                        onClick={() => navigateWithTab({ path: `/offertes/${offerte.id}/bewerken`, label: offerte.nummer || offerte.titel || 'Offerte', id: `/offertes/${offerte.id}` })}
                      >
                        {/* Checkbox */}
                        <td className="w-10 px-3 py-3">
                          <Checkbox
                            checked={selectedIds.has(offerte.id)}
                            onCheckedChange={() => toggleSelect(offerte.id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Selecteer ${offerte.nummer}`}
                          />
                        </td>
                        {/* Status */}
                        <td className="py-0 px-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  'w-full h-full py-3 px-4 flex items-center gap-1.5 transition-colors border-l-[3px]',
                                  getOfferteStatusBorderColor(offerte.status),
                                  getOfferteStatusCellBg(offerte.status),
                                  'hover:brightness-95 dark:hover:brightness-110'
                                )}
                              >
                                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getOfferteStatusDotColor(offerte.status))} />
                                <span className="text-xs font-medium text-foreground">
                                  {STATUS_LABELS[offerte.status] || offerte.status}
                                </span>
                                <ChevronDown className="w-3 h-3 text-muted-foreground/40 ml-auto" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40">
                              {statusOpties.filter(s => s.value !== 'alle').map((s) => (
                                <DropdownMenuItem
                                  key={s.value}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (s.value !== offerte.status) {
                                      handleStatusChange(offerte.id, s.value)
                                    }
                                  }}
                                  className={cn(
                                    'flex items-center gap-2 text-xs',
                                    s.value === offerte.status && 'font-semibold'
                                  )}
                                >
                                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getOfferteStatusDotColor(s.value))} />
                                  {s.label}
                                  {s.value === offerte.status && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>

                        {/* Offerte naam + prioriteit */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0">
                              <Link
                                to={`/offertes/${offerte.id}/bewerken`}
                                state={{ from: '/offertes' }}
                                className="text-sm font-medium text-foreground hover:text-primary transition-colors block truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {offerte.nummer} — {offerte.titel}
                              </Link>
                            </div>
                            {offerte.prioriteit && offerte.prioriteit !== 'laag' && (
                              <Badge className={cn(PRIORITY_COLORS[offerte.prioriteit] || '', 'text-2xs px-1.5 py-0 flex-shrink-0')}>
                                {offerte.prioriteit}
                              </Badge>
                            )}
                            {expiryStatus === 'expired' && (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-2xs px-1.5 py-0 flex-shrink-0">
                                Verlopen
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Klant */}
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <span className="text-sm text-foreground">{offerte.klant_naam || 'Onbekende klant'}</span>
                        </td>

                        {/* Bedrag */}
                        <td className="py-3 px-4 text-right hidden xl:table-cell">
                          <span className="text-xs font-medium font-mono text-foreground tabular-nums">
                            {formatCurrency(offerte.totaal)}
                          </span>
                        </td>

                        {/* Datum */}
                        <td className="py-3 px-4 text-right hidden md:table-cell">
                          <span className="text-xs text-muted-foreground font-mono tabular-nums">
                            {formatDate(offerte.created_at)}
                          </span>
                        </td>

                        {/* Dagen open */}
                        <td className="py-3 px-4 text-right hidden lg:table-cell">
                          {(() => {
                            const days = getDaysOpen(offerte.created_at)
                            return (
                              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full tabular-nums', getDaysColor(days))}>
                                {days}d
                              </span>
                            )
                          })()}
                        </td>

                        {/* Geldig tot */}
                        <td className="py-3 px-4 text-right hidden md:table-cell">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-xs text-muted-foreground font-mono tabular-nums">
                              {formatDate(offerte.geldig_tot)}
                            </span>
                            {expiryStatus === 'expired' && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                            {expiryStatus === 'soon' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                          </div>
                        </td>

                        {/* Quick actions */}
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-0.5 justify-end">
                            <Link
                              to={`/offertes/${offerte.id}/preview`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors" />
                            </Link>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigateWithTab({ path: `/offertes/${offerte.id}/bewerken`, label: offerte.nummer || offerte.titel || 'Offerte', id: `/offertes/${offerte.id}` })
                                  }}
                                >
                                  Bewerken
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/offertes/${offerte.id}/preview`)
                                  }}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-2" />
                                  Preview bekijken
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const csv = [
                                      'Nummer;' + offerte.nummer,
                                      'Klant;' + (offerte.klant_naam || 'Onbekend'),
                                      'Titel;' + offerte.titel,
                                      'Status;' + (STATUS_LABELS[offerte.status] || offerte.status),
                                      'Bedrag;' + formatCurrency(offerte.totaal),
                                      'Aangemaakt;' + formatDate(offerte.created_at),
                                    ].join('\n')
                                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = `${offerte.nummer}.csv`
                                    a.click()
                                    URL.revokeObjectURL(url)
                                  }}
                                >
                                  <Download className="w-3.5 h-3.5 mr-2" />
                                  Export
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      )}
      </div>
      </div>
    </div>
  )
}
