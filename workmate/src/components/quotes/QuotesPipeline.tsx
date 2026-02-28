import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  X,
  Calendar,
  Target,
  DollarSign,
  BarChart3,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react'
import { getOffertes, updateOfferte } from '@/services/supabaseService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { Offerte } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'
import { logger } from '../../utils/logger'
import { SkeletonTable } from '@/components/ui/skeleton'

type ViewMode = 'pipeline' | 'lijst'
type SortOption = 'newest' | 'oldest' | 'highest' | 'expiring'
type PriorityFilter = 'alle' | 'laag' | 'medium' | 'hoog' | 'urgent'
type StatusFilter = 'alle' | 'concept' | 'verzonden' | 'bekeken' | 'goedgekeurd' | 'afgewezen' | 'verlopen' | 'gefactureerd'

const DEFAULT_STATUS_COLUMNS = [
  { key: 'concept', label: 'Concept', color: 'from-slate-500/10 to-slate-500/5', accent: 'bg-slate-400 dark:bg-slate-500', headerBg: 'bg-slate-50/80 dark:bg-slate-800/50' },
  { key: 'verzonden', label: 'Verstuurd', color: 'from-blue-500/10 to-blue-500/5', accent: 'bg-blue-400 dark:bg-blue-500', headerBg: 'bg-blue-50/80 dark:bg-blue-900/30' },
  { key: 'bekeken', label: 'Bekeken', color: 'from-primary/10 to-primary/5', accent: 'bg-primary dark:bg-primary', headerBg: 'bg-wm-pale/30 dark:bg-accent/20' },
  { key: 'goedgekeurd', label: 'Akkoord', color: 'from-emerald-500/10 to-emerald-500/5', accent: 'bg-emerald-400 dark:bg-emerald-500', headerBg: 'bg-emerald-50/80 dark:bg-emerald-900/30' },
  { key: 'gefactureerd', label: 'Gefactureerd', color: 'from-teal-500/10 to-teal-500/5', accent: 'bg-teal-400 dark:bg-teal-500', headerBg: 'bg-teal-50/80 dark:bg-teal-900/30' },
]

const CLOSED_STATUS_COLUMNS = [
  { key: 'afgewezen', label: 'Afgewezen', color: 'from-red-500/10 to-red-500/5', accent: 'bg-red-400 dark:bg-red-500', headerBg: 'bg-red-50/80 dark:bg-red-900/30' },
  { key: 'verlopen', label: 'Verlopen', color: 'from-orange-500/10 to-orange-500/5', accent: 'bg-orange-400 dark:bg-orange-500', headerBg: 'bg-orange-50/80 dark:bg-orange-900/30' },
]

const KLEUR_TO_STYLE: Record<string, { color: string; accent: string; headerBg: string }> = {
  gray: { color: 'from-slate-500/10 to-slate-500/5', accent: 'bg-slate-400 dark:bg-slate-500', headerBg: 'bg-slate-50/80 dark:bg-slate-800/50' },
  blue: { color: 'from-blue-500/10 to-blue-500/5', accent: 'bg-blue-400 dark:bg-blue-500', headerBg: 'bg-blue-50/80 dark:bg-blue-900/30' },
  purple: { color: 'from-primary/10 to-primary/5', accent: 'bg-primary dark:bg-primary', headerBg: 'bg-wm-pale/30 dark:bg-accent/20' },
  green: { color: 'from-emerald-500/10 to-emerald-500/5', accent: 'bg-emerald-400 dark:bg-emerald-500', headerBg: 'bg-emerald-50/80 dark:bg-emerald-900/30' },
  red: { color: 'from-red-500/10 to-red-500/5', accent: 'bg-red-400 dark:bg-red-500', headerBg: 'bg-red-50/80 dark:bg-red-900/30' },
  orange: { color: 'from-orange-500/10 to-orange-500/5', accent: 'bg-orange-400 dark:bg-orange-500', headerBg: 'bg-orange-50/80 dark:bg-orange-900/30' },
  teal: { color: 'from-teal-500/10 to-teal-500/5', accent: 'bg-teal-400 dark:bg-teal-500', headerBg: 'bg-teal-50/80 dark:bg-teal-900/30' },
}

const PRIORITY_COLORS: Record<string, string> = {
  laag: 'bg-wm-pale/25 text-accent dark:bg-accent/20 dark:text-wm-light',
  medium: 'bg-amber-50/80 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400',
  hoog: 'bg-orange-50/80 text-orange-700 dark:bg-orange-900/25 dark:text-orange-400',
  urgent: 'bg-red-50/80 text-red-700 dark:bg-red-900/25 dark:text-red-400',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  concept: 'bg-stone-100/80 text-stone-600 dark:bg-stone-800/50 dark:text-stone-400',
  verzonden: 'bg-sky-50/80 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  bekeken: 'bg-amber-50/80 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400',
  goedgekeurd: 'bg-wm-pale/25 text-accent dark:bg-accent/20 dark:text-wm-light',
  afgewezen: 'bg-red-50/80 text-red-700 dark:bg-red-900/25 dark:text-red-400',
  verlopen: 'bg-orange-50/80 text-orange-700 dark:bg-orange-900/25 dark:text-orange-400',
  gefactureerd: 'bg-violet-50/80 text-violet-700 dark:bg-violet-900/25 dark:text-violet-400',
}

const STATUS_LABELS: Record<string, string> = {
  concept: 'Concept',
  verzonden: 'Verstuurd',
  bekeken: 'Bekeken',
  goedgekeurd: 'Akkoord',
  afgewezen: 'Afgewezen',
  verlopen: 'Verlopen',
  gefactureerd: 'Gefactureerd',
}

function getDaysOpen(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
}

function getDaysColor(days: number): string {
  if (days < 7) return 'text-accent dark:text-wm-light bg-wm-pale/20 dark:bg-primary/15'
  if (days < 14) return 'text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-900/20'
  if (days < 30) return 'text-orange-600 dark:text-orange-400 bg-orange-50/80 dark:bg-orange-900/20'
  return 'text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-900/20'
}

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
  const { pipelineStappen, toonConversieRate, toonDagenOpen, toonFollowUpIndicatoren, valuta } = useAppSettings()
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('alle')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [showClosed, setShowClosed] = useState(false)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

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

    if (statusFilter !== 'alle') {
      result = result.filter((o) => o.status === statusFilter)
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
  }, [offertes, searchQuery, priorityFilter, statusFilter, sortOption])

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
    <div className="space-y-6">
      {/* Financial Overview per Status */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {([
          { key: 'concept' as const, label: 'Concept', borderColor: 'border-stone-200/60 dark:border-stone-700/60', bgColor: 'from-stone-50/80 to-card dark:from-stone-900/30 dark:to-card', dotColor: 'bg-stone-400', textColor: 'text-stone-600 dark:text-stone-400' },
          { key: 'verzonden' as const, label: 'Verstuurd', borderColor: 'border-sky-200/60 dark:border-sky-800/60', bgColor: 'from-sky-50/80 to-card dark:from-sky-950/30 dark:to-card', dotColor: 'bg-sky-400', textColor: 'text-sky-600 dark:text-sky-400' },
          { key: 'bekeken' as const, label: 'Bekeken', borderColor: 'border-amber-200/60 dark:border-amber-800/60', bgColor: 'from-amber-50/80 to-card dark:from-amber-950/30 dark:to-card', dotColor: 'bg-amber-400', textColor: 'text-amber-600 dark:text-amber-400' },
          { key: 'goedgekeurd' as const, label: 'Akkoord', borderColor: 'border-primary/20 dark:border-primary/15', bgColor: 'from-wm-pale/20 to-card dark:from-primary/10 dark:to-card', dotColor: 'bg-primary', textColor: 'text-accent dark:text-wm-light' },
          { key: 'verlopen' as const, label: 'Verlopen', borderColor: 'border-orange-200/60 dark:border-orange-800/60', bgColor: 'from-orange-50/80 to-card dark:from-orange-950/30 dark:to-card', dotColor: 'bg-orange-400', textColor: 'text-orange-600 dark:text-orange-400' },
          { key: 'afgewezen' as const, label: 'Afgewezen', borderColor: 'border-red-200/60 dark:border-red-800/60', bgColor: 'from-red-50/80 to-card dark:from-red-950/30 dark:to-card', dotColor: 'bg-red-400', textColor: 'text-red-600 dark:text-red-400' },
        ]).map((col) => {
          const data = financialSummary.statusTotals[col.key] || { count: 0, totaal: 0 }
          const isActive = statusFilter === col.key
          return (
            <button
              key={col.key}
              onClick={() => setStatusFilter(statusFilter === col.key ? 'alle' : col.key)}
              className={`relative overflow-hidden rounded-2xl border ${col.borderColor} bg-gradient-to-br ${col.bgColor} backdrop-blur-sm p-4 text-left transition-all hover:shadow-md ${
                isActive ? 'ring-2 ring-primary shadow-md' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <span className={`text-xs font-medium ${col.textColor} uppercase tracking-wide`}>{col.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{formatCurrency(data.totaal)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.count} {data.count === 1 ? 'offerte' : 'offertes'}
              </p>
            </button>
          )
        })}
      </div>

      {/* Pipeline Totalen */}
      <div className="flex items-center gap-6 px-5 py-2 text-sm text-muted-foreground">
        <span>Totale pipeline: <strong className="text-foreground">{formatCurrency(financialSummary.pipelineTotaal)}</strong></span>
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <span>Verwachte omzet: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(financialSummary.verwachteOmzet)}</strong></span>
      </div>

      {/* Sales Summary Bar */}
      <div className="flex items-center gap-6 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Pipeline:</span>
          <span className="text-sm font-bold text-foreground">{formatCurrency(salesSummary.pipelineValue)}</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Verstuurd:</span>
          <span className="text-sm font-bold text-foreground">{formatCurrency(salesSummary.verstuurdValue)}</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Akkoord deze maand:</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(salesSummary.akkoordValue)}</span>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-display">
            Offertes
          </h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
            <span>{offertes.length} offertes</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>Totaalwaarde {formatCurrency(round2(offertes.reduce((s, o) => s + o.totaal, 0)))}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {kpis.conversionRate}% conversie
            </span>
          </div>
        </div>
        <Link to="/offertes/nieuw">
          <Button className="rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Offerte
          </Button>
        </Link>
      </div>

      {/* Filter / View Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op nummer, titel of klant..."
            className="pl-10 rounded-xl bg-card/70 backdrop-blur-sm border-border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center bg-card/70 backdrop-blur-sm border border-border rounded-xl p-1">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'pipeline'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </button>
          <button
            onClick={() => setViewMode('lijst')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'lijst'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Lijst
          </button>
        </div>

        {viewMode === 'pipeline' && (
          <button
            onClick={() => setShowClosed(!showClosed)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
              showClosed
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-card/70 border-border text-foreground/80 hover:bg-muted/50'
            }`}
          >
            {showClosed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Toon afgesloten
          </button>
        )}

        <div className="relative" ref={priorityRef}>
          <button
            onClick={() => {
              setShowPriorityDropdown(!showPriorityDropdown)
              setShowSortDropdown(false)
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card/70 backdrop-blur-sm border border-border rounded-xl text-foreground/80 hover:bg-muted/50 transition-colors"
          >
            <Target className="h-3.5 w-3.5" />
            {priorityFilter === 'alle' ? 'Prioriteit' : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showPriorityDropdown && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
              {(['alle', 'urgent', 'hoog', 'medium', 'laag'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPriorityFilter(p)
                    setShowPriorityDropdown(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                    priorityFilter === p ? 'text-accent dark:text-wm-light font-medium' : 'text-foreground/80'
                  }`}
                >
                  {p === 'alle' ? 'Alle prioriteiten' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={sortRef}>
          <button
            onClick={() => {
              setShowSortDropdown(!showSortDropdown)
              setShowPriorityDropdown(false)
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card/70 backdrop-blur-sm border border-border rounded-xl text-foreground/80 hover:bg-muted/50 transition-colors"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sorteren
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showSortDropdown && (
            <div className="absolute top-full right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[180px]">
              {([
                { value: 'newest' as const, label: 'Nieuwste eerst' },
                { value: 'oldest' as const, label: 'Oudste eerst' },
                { value: 'highest' as const, label: 'Hoogste waarde' },
                { value: 'expiring' as const, label: 'Verloopt binnenkort' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSortOption(opt.value)
                    setShowSortDropdown(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                    sortOption === opt.value ? 'text-accent dark:text-wm-light font-medium' : 'text-foreground/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="wm-stat-card relative overflow-hidden rounded-2xl border border-primary/15 dark:border-primary/10 bg-gradient-to-br from-wm-pale/15 to-card dark:from-accent/10 dark:to-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20">
              <FileText className="h-4 w-4 text-accent dark:text-wm-light" />
            </div>
            <span className="text-xs font-medium text-accent dark:text-wm-light uppercase tracking-wide">Open</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.openCount}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{formatCurrency(kpis.openValue)}</p>
        </div>

        <div className="wm-stat-card relative overflow-hidden rounded-2xl border border-primary/15 dark:border-primary/10 bg-gradient-to-br from-wm-pale/10 to-card dark:from-primary/8 dark:to-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="wm-stat-icon p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-accent dark:text-wm-light uppercase tracking-wide">Conversie</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.conversionRate}%</p>
          <p className="text-sm text-muted-foreground mt-0.5">van verzonden</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-primary/30 dark:border-primary/20 bg-gradient-to-br from-wm-pale/30 to-white/80 dark:from-accent/30 dark:to-card backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-wm-pale/30 dark:bg-accent/30">
              <DollarSign className="h-4 w-4 text-accent dark:text-primary" />
            </div>
            <span className="text-xs font-medium text-accent dark:text-primary uppercase tracking-wide">Gem. waarde</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(kpis.avgValue)}</p>
          <p className="text-sm text-muted-foreground mt-0.5">per offerte</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-red-200/50 dark:border-red-800/40 bg-gradient-to-br from-red-50/80 to-white/80 dark:from-red-950/40 dark:to-card backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/50">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Achterstallig</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.overdueFollowUps}</p>
          <p className="text-sm text-muted-foreground mt-0.5">follow-ups</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-white/80 dark:from-amber-950/40 dark:to-card backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Deze maand</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{kpis.thisMonthCount}</p>
          <p className="text-sm text-muted-foreground mt-0.5">nieuwe offertes</p>
        </div>
      </div>

      {/* Pipeline (Kanban) View */}
      {viewMode === 'pipeline' && (
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[480px] ${STATUS_COLUMNS.length <= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-' + Math.min(STATUS_COLUMNS.length, 7)}`}>
          {STATUS_COLUMNS.map((col) => {
            const colOffertes = offertesByStatus[col.key] || []
            const colTotal = round2(colOffertes.reduce((sum, o) => sum + o.totaal, 0))
            const isDragOver = dragOverColumn === col.key

            return (
              <div
                key={col.key}
                className={`rounded-2xl border bg-gradient-to-b ${col.color} backdrop-blur-sm flex flex-col overflow-hidden transition-all duration-150 ${
                  isDragOver
                    ? 'border-primary shadow-lg scale-[1.01]'
                    : 'border-border/60'
                }`}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 ${col.headerBg} backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                    <h3 className="font-semibold text-sm text-foreground">
                      {col.label}
                    </h3>
                    <Badge variant="secondary" className="ml-auto text-xs px-2 py-0 h-5 rounded-lg">
                      {colOffertes.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium pl-4">
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
                          onClick={() => navigate(`/offertes/${offerte.id}/bewerken`, { state: { from: '/offertes' } })}
                          className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/60 p-3 space-y-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:cursor-grabbing"
                        >
                          {/* Top row: nummer + indicators */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-mono font-semibold text-accent dark:text-wm-light">
                              {offerte.nummer}
                            </span>
                            <div className="flex items-center gap-1">
                              {offerte.prioriteit && offerte.prioriteit !== 'laag' && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PRIORITY_COLORS[offerte.prioriteit] || ''}`}>
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
                                <span title={`Bekeken door klant${offerte.aantal_keer_bekeken ? ` (${offerte.aantal_keer_bekeken}x)` : ''}`}><Eye className="h-3.5 w-3.5 text-emerald-500" /></span>
                              )}
                            </div>
                          </div>

                          {/* Client name */}
                          <p className="text-xs text-muted-foreground truncate">
                            {offerte.klant_naam || 'Onbekende klant'}
                          </p>

                          {/* Amount + relative date */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
                            <span className="text-sm font-bold text-foreground">
                              {formatCurrency(offerte.totaal)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {relativeDate(offerte.created_at)}
                            </span>
                          </div>

                          {/* Expiry warning */}
                          {expiryStatus === 'expired' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                              Verlopen
                            </span>
                          )}
                          {expiryStatus === 'soon' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
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
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-lg bg-primary/8 dark:bg-primary/15 text-accent dark:text-wm-light hover:bg-primary/15 dark:hover:bg-primary/25 transition-colors"
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
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
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
                              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
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
                              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
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
      )}

      {/* List View */}
      {viewMode === 'lijst' && (
        <>
          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['alle', 'concept', 'verzonden', 'bekeken', 'goedgekeurd', 'afgewezen', 'gefactureerd'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-card/70 border border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {s === 'alle' ? 'Alle' : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {[
                      { key: 'nummer', label: 'Nummer' },
                      { key: 'klant_naam', label: 'Klant' },
                      { key: 'titel', label: 'Titel' },
                      { key: 'totaal', label: 'Bedrag' },
                      { key: 'status', label: 'Status' },
                      { key: 'days_open', label: 'Aangemaakt' },
                      { key: 'geldig_tot', label: 'Geldig tot' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleListSort(col.key)}
                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          <ArrowUpDown className={`h-3 w-3 ${listSortColumn === col.key ? 'text-primary' : 'text-muted-foreground/40'}`} />
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sortedListOffertes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-primary/40" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Geen offertes gevonden</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {sortedListOffertes.map((offerte) => {
                    const expiryStatus = getExpiryStatus(offerte.geldig_tot)

                    return (
                      <tr
                        key={offerte.id}
                        className="group hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/offertes/${offerte.id}/bewerken`, { state: { from: '/offertes' } })}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono font-semibold text-accent dark:text-wm-light">
                            {offerte.nummer}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground/80">
                            {offerte.klant_naam || 'Onbekende klant'}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-sm text-foreground/80 truncate block">
                            {offerte.titel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(offerte.totaal)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${STATUS_BADGE_COLORS[offerte.status] || ''}`}>
                            {STATUS_LABELS[offerte.status] || offerte.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(offerte.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-muted-foreground">
                              {formatDate(offerte.geldig_tot)}
                            </span>
                            {expiryStatus === 'expired' && (
                              <span className="w-2 h-2 rounded-full bg-red-500" title="Verlopen" />
                            )}
                            {expiryStatus === 'soon' && (
                              <span className="w-2 h-2 rounded-full bg-orange-500" title="Verloopt binnenkort" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/offertes/${offerte.id}/bewerken`, { state: { from: '/offertes' } })
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Bewerk
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pipeline Overview Summary */}
      <Card className="rounded-2xl border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
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
                  className="text-center p-4 rounded-xl bg-gray-50/80 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                    <p className="text-sm font-medium text-muted-foreground">
                      {col.label}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {colOffertes.length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatCurrency(colTotal)}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Totaal alle offertes
            </span>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="rounded-lg px-3 py-1 text-sm">
                {offertes.length} offertes
              </Badge>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(round2(offertes.reduce((s, o) => s + o.totaal, 0)))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
