import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
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
} from 'lucide-react'
import { getOffertes, updateOfferte } from '@/services/supabaseService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { Offerte } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { logger } from '../../utils/logger'

type ViewMode = 'pipeline' | 'lijst'
type SortOption = 'newest' | 'oldest' | 'highest' | 'expiring'
type PriorityFilter = 'alle' | 'laag' | 'medium' | 'hoog' | 'urgent'

const DEFAULT_STATUS_COLUMNS = [
  { key: 'concept', label: 'Concept', color: 'from-slate-500/10 to-slate-500/5', accent: 'bg-slate-400 dark:bg-slate-500', headerBg: 'bg-slate-50/80 dark:bg-slate-800/50' },
  { key: 'verzonden', label: 'Verzonden', color: 'from-blue-500/10 to-blue-500/5', accent: 'bg-blue-400 dark:bg-blue-500', headerBg: 'bg-blue-50/80 dark:bg-blue-900/30' },
  { key: 'bekeken', label: 'Bekeken', color: 'from-primary/10 to-primary/5', accent: 'bg-primary dark:bg-primary', headerBg: 'bg-wm-pale/30 dark:bg-accent/20' },
  { key: 'goedgekeurd', label: 'Goedgekeurd', color: 'from-emerald-500/10 to-emerald-500/5', accent: 'bg-emerald-400 dark:bg-emerald-500', headerBg: 'bg-emerald-50/80 dark:bg-emerald-900/30' },
  { key: 'afgewezen', label: 'Afgewezen', color: 'from-red-500/10 to-red-500/5', accent: 'bg-red-400 dark:bg-red-500', headerBg: 'bg-red-50/80 dark:bg-red-900/30' },
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
  laag: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  hoog: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

function getDaysOpen(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
}

function getDaysColor(days: number): string {
  if (days < 7) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
  if (days < 14) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
  if (days < 30) return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30'
  return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
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

export function QuotesPipeline() {
  const { pipelineStappen, toonConversieRate, toonDagenOpen, toonFollowUpIndicatoren, valuta } = useAppSettings()
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('alle')
  const [sortOption, setSortOption] = useState<SortOption>('newest')

  // Build pipeline columns from settings
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
    return DEFAULT_STATUS_COLUMNS
  }, [pipelineStappen])
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

  useEffect(() => {
    let cancelled = false
    async function loadOffertes() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getOffertes()
        if (!cancelled) setOffertes(data)
      } catch (err) {
        logger.error('Fout bij ophalen offertes:', err)
        if (!cancelled) setError('Kan offertes niet laden. Probeer opnieuw.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadOffertes()
    return () => { cancelled = true }
  }, [])

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
  }, [offertes, searchQuery, priorityFilter, sortOption])

  const offertesByStatus = useMemo(() => {
    const map: Record<string, Offerte[]> = {}
    for (const col of STATUS_COLUMNS) {
      map[col.key] = filteredOffertes.filter((o) => o.status === col.key)
    }
    return map
  }, [filteredOffertes])

  const kpis = useMemo(() => {
    const openStatuses = ['verzonden', 'bekeken']
    const openOffertes = offertes.filter((o) => openStatuses.includes(o.status))
    const openCount = openOffertes.length
    const openValue = openOffertes.reduce((sum, o) => sum + o.totaal, 0)

    const sentStatuses = ['verzonden', 'bekeken', 'goedgekeurd', 'afgewezen']
    const sentOffertes = offertes.filter((o) => sentStatuses.includes(o.status))
    const approved = offertes.filter((o) => o.status === 'goedgekeurd').length
    const conversionRate = sentOffertes.length > 0 ? (approved / sentOffertes.length) * 100 : 0

    const allValues = offertes.map((o) => o.totaal)
    const avgValue = allValues.length > 0 ? allValues.reduce((s, v) => s + v, 0) / allValues.length : 0

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

  const totalCount = offertes.length
  const totalValue = offertes.reduce((sum, o) => sum + o.totaal, 0)
  const sentStatuses = ['verzonden', 'bekeken', 'goedgekeurd', 'afgewezen']
  const sentCount = offertes.filter((o) => sentStatuses.includes(o.status)).length
  const approvedCount = offertes.filter((o) => o.status === 'goedgekeurd').length
  const conversionRate = sentCount > 0 ? ((approvedCount / sentCount) * 100).toFixed(1) : '0.0'

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
        case 'follow_up_datum':
          return ((a.follow_up_datum ? new Date(a.follow_up_datum).getTime() : Infinity) - (b.follow_up_datum ? new Date(b.follow_up_datum).getTime() : Infinity)) * dir
        case 'prioriteit': {
          const order: Record<string, number> = { urgent: 0, hoog: 1, medium: 2, laag: 3 }
          return ((order[a.prioriteit || 'laag'] ?? 4) - (order[b.prioriteit || 'laag'] ?? 4)) * dir
        }
        default:
          return (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) * dir
      }
    })
    return sorted
  }, [filteredOffertes, listSortColumn, listSortDir])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Offertes laden...</p>
        </div>
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
      {/* ── Header Section ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-display">
            Offertes Pipeline
          </h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{totalCount} offertes</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span>Totaalwaarde {formatCurrency(totalValue)}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {conversionRate}% conversie
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

      {/* ── Filter / View Bar ────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op nummer, titel of klant..."
            className="pl-10 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200 dark:border-gray-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-1">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'pipeline'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Pipeline
          </button>
          <button
            onClick={() => setViewMode('lijst')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'lijst'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Lijst
          </button>
        </div>

        <div className="relative" ref={priorityRef}>
          <button
            onClick={() => {
              setShowPriorityDropdown(!showPriorityDropdown)
              setShowSortDropdown(false)
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <Target className="h-3.5 w-3.5" />
            {priorityFilter === 'alle' ? 'Prioriteit' : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showPriorityDropdown && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[140px]">
              {(['alle', 'urgent', 'hoog', 'medium', 'laag'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPriorityFilter(p)
                    setShowPriorityDropdown(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    priorityFilter === p ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
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
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sorteren
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showSortDropdown && (
            <div className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[180px]">
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
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    sortOption === opt.value ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Sales KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/40 bg-gradient-to-br from-blue-50/80 to-white/80 dark:from-blue-950/40 dark:to-gray-900/80 backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Open</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.openCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatCurrency(kpis.openValue)}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 to-white/80 dark:from-emerald-950/40 dark:to-gray-900/80 backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Conversie</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.conversionRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">van verzonden</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-primary/30 dark:border-primary/20 bg-gradient-to-br from-wm-pale/30 to-white/80 dark:from-accent/30 dark:to-gray-900/80 backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-wm-pale/30 dark:bg-accent/30">
              <DollarSign className="h-4 w-4 text-accent dark:text-primary" />
            </div>
            <span className="text-xs font-medium text-accent dark:text-primary uppercase tracking-wide">Gem. waarde</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(kpis.avgValue)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">per offerte</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-red-200/50 dark:border-red-800/40 bg-gradient-to-br from-red-50/80 to-white/80 dark:from-red-950/40 dark:to-gray-900/80 backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/50">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Achterstallig</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.overdueFollowUps}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">follow-ups</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-white/80 dark:from-amber-950/40 dark:to-gray-900/80 backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Deze maand</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.thisMonthCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">nieuwe offertes</p>
        </div>
      </div>

      {/* ── Pipeline View ────────────────────────────────────────── */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[480px]">
          {STATUS_COLUMNS.map((col) => {
            const colOffertes = offertesByStatus[col.key]
            const colTotal = colOffertes.reduce((sum, o) => sum + o.totaal, 0)

            return (
              <div
                key={col.key}
                className={`rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-b ${col.color} backdrop-blur-sm flex flex-col overflow-hidden`}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 ${col.headerBg} backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {col.label}
                    </h3>
                    <Badge variant="secondary" className="ml-auto text-xs px-2 py-0 h-5 rounded-lg">
                      {colOffertes.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium pl-4">
                    {formatCurrency(colTotal)}
                  </p>
                </div>

                {/* Column Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {colOffertes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/8 to-accent/8 flex items-center justify-center mb-2">
                        <FileText className="h-5 w-5 text-primary/30" />
                      </div>
                      <p className="text-xs text-muted-foreground/60">
                        Geen offertes in deze fase
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
                        <Link
                          to={`/offertes/${offerte.id}`}
                          className="block"
                        >
                          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-3 space-y-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                            {/* Top row: nummer + indicators */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
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
                                  <Bell className="h-3.5 w-3.5 text-blue-400" />
                                )}
                                {offerte.bekeken_door_klant && (
                                  <Eye className="h-3.5 w-3.5 text-emerald-500" title={`Bekeken door klant${offerte.aantal_keer_bekeken ? ` (${offerte.aantal_keer_bekeken}x)` : ''}`} />
                                )}
                              </div>
                            </div>

                            {/* Client name */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {offerte.klant_naam || 'Onbekende klant'}
                            </p>

                            {/* Title */}
                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-2">
                              {offerte.titel}
                            </p>

                            {/* Amount + days open */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {formatCurrency(offerte.totaal)}
                              </span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${getDaysColor(daysOpen)}`}>
                                {daysOpen} dagen
                              </span>
                            </div>

                            {/* Date + expiry */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                {formatDate(offerte.created_at)}
                              </span>
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
                          </div>
                        </Link>

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
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
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
                            className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-3 space-y-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Follow-up plannen
                              </p>
                              <button
                                onClick={() => setFollowUpOpen(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                                Datum
                              </label>
                              <input
                                type="date"
                                value={followUpDate}
                                onChange={(e) => setFollowUpDate(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                                Notitie
                              </label>
                              <textarea
                                value={followUpNote}
                                onChange={(e) => setFollowUpNote(e.target.value)}
                                rows={2}
                                placeholder="Bijv. bellen over status offerte..."
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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

      {/* ── List View ────────────────────────────────────────────── */}
      {viewMode === 'lijst' && (
        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
                  {[
                    { key: 'nummer', label: 'Nummer' },
                    { key: 'klant_naam', label: 'Klant' },
                    { key: 'titel', label: 'Titel' },
                    { key: 'totaal', label: 'Bedrag' },
                    { key: 'status', label: 'Status' },
                    { key: 'days_open', label: 'Dagen Open' },
                    { key: 'geldig_tot', label: 'Geldig tot' },
                    { key: 'follow_up_datum', label: 'Follow-up' },
                    { key: 'prioriteit', label: 'Prioriteit' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleListSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className={`h-3 w-3 ${listSortColumn === col.key ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {sortedListOffertes.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary/40" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Nog geen offertes</p>
                        <p className="text-xs text-muted-foreground">Maak een offerte voor je eerste sign-opdracht</p>
                      </div>
                    </td>
                  </tr>
                )}
                {sortedListOffertes.map((offerte) => {
                  const daysOpen = getDaysOpen(offerte.created_at)
                  const expiryStatus = getExpiryStatus(offerte.geldig_tot)
                  const followUpState = getFollowUpState(offerte)

                  const statusBadgeColors: Record<string, string> = {
                    concept: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                    verzonden: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                    bekeken: 'bg-wm-pale/30 text-accent dark:bg-accent/30 dark:text-wm-light',
                    goedgekeurd: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                    afgewezen: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                  }

                  const followUpColors: Record<string, string> = {
                    overdue: 'text-red-600 dark:text-red-400',
                    today: 'text-orange-600 dark:text-orange-400',
                    upcoming: 'text-blue-600 dark:text-blue-400',
                    none: 'text-gray-400 dark:text-gray-500',
                  }

                  return (
                    <tr
                      key={offerte.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/offertes/${offerte.id}`}
                          className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {offerte.nummer}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/offertes/${offerte.id}`} className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                          {offerte.klant_naam || 'Onbekende klant'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <Link to={`/offertes/${offerte.id}`} className="text-sm text-gray-700 dark:text-gray-300 truncate block hover:text-gray-900 dark:hover:text-white transition-colors">
                          {offerte.titel}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(offerte.totaal)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${statusBadgeColors[offerte.status] || ''}`}>
                            {offerte.status.charAt(0).toUpperCase() + offerte.status.slice(1)}
                          </span>
                          {offerte.bekeken_door_klant && (
                            <Eye className="h-3.5 w-3.5 text-emerald-500" title={`Bekeken door klant${offerte.aantal_keer_bekeken ? ` (${offerte.aantal_keer_bekeken}x)` : ''}`} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${getDaysColor(daysOpen)}`}>
                          {daysOpen}d
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
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
                        {offerte.follow_up_datum ? (
                          <div className="flex items-center gap-1.5">
                            {followUpState === 'overdue' && <BellRing className="h-3.5 w-3.5 text-red-500" />}
                            {followUpState === 'today' && <BellRing className="h-3.5 w-3.5 text-orange-500" />}
                            {followUpState === 'upcoming' && <Bell className="h-3.5 w-3.5 text-blue-400" />}
                            <span className={`text-sm font-medium ${followUpColors[followUpState]}`}>
                              {formatDate(offerte.follow_up_datum)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-300 dark:text-gray-600">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {offerte.prioriteit ? (
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${PRIORITY_COLORS[offerte.prioriteit] || ''}`}>
                            {offerte.prioriteit.charAt(0).toUpperCase() + offerte.prioriteit.slice(1)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300 dark:text-gray-600">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Summary Bar ──────────────────────────────────────────── */}
      <Card className="rounded-2xl border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            Pipeline Overzicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {STATUS_COLUMNS.map((col) => {
              const colOffertes = offertesByStatus[col.key]
              const colTotal = colOffertes.reduce((sum, o) => sum + o.totaal, 0)

              return (
                <div
                  key={col.key}
                  className="text-center p-4 rounded-xl bg-gray-50/80 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {col.label}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {colOffertes.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatCurrency(colTotal)}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Totaal alle offertes
            </span>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="rounded-lg px-3 py-1 text-sm">
                {totalCount} offertes
              </Badge>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
