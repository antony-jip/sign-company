import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import {
  Plus,
  FileText,
  FilePlus,
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
  DollarSign,
  Eye,
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
import { DagenOpenFilterBar, getDaysOpen, getDaysColor, matchDagenFilter } from '@/components/shared/DagenOpenFilter'
import type { DagenOpenFilter } from '@/components/shared/DagenOpenFilter'
import { exportCSV, exportExcel } from '@/lib/export'
import { round2 } from '@/utils/budgetUtils'
import { logger } from '../../utils/logger'
import { SkeletonTable } from '@/components/ui/skeleton'
import { QuotesFollowUp } from './QuotesFollowUp'

type ViewMode = 'pipeline' | 'lijst' | 'follow-up'
type SortOption = 'newest' | 'oldest' | 'highest' | 'expiring'
type PriorityFilter = 'alle' | 'laag' | 'medium' | 'hoog' | 'urgent'
type StatusFilter = 'alle' | 'concept' | 'verzonden' | 'bekeken' | 'goedgekeurd' | 'afgewezen' | 'verlopen' | 'gefactureerd' | 'wacht_op_reactie'

const DEFAULT_STATUS_COLUMNS = [
  { key: 'concept', label: 'Concept', color: 'from-mod-taken-light/30 to-mod-taken-light/10', accent: 'bg-mod-taken-text', headerBg: 'bg-mod-taken-light/60' },
  { key: 'verzonden', label: 'Verstuurd', color: 'from-mod-klanten-light/30 to-mod-klanten-light/10', accent: 'bg-mod-klanten-text', headerBg: 'bg-mod-klanten-light/60' },
  { key: 'bekeken', label: 'Bekeken', color: 'from-mod-taken-light/30 to-mod-taken-light/10', accent: 'bg-mod-taken-text', headerBg: 'bg-mod-taken-light/60' },
  { key: 'goedgekeurd', label: 'Akkoord', color: 'from-mod-facturen-light/30 to-mod-facturen-light/10', accent: 'bg-mod-facturen-text', headerBg: 'bg-mod-facturen-light/60' },
  { key: 'gefactureerd', label: 'Gefactureerd', color: 'from-mod-email-light/30 to-mod-email-light/10', accent: 'bg-mod-email-text', headerBg: 'bg-mod-email-light/60' },
]

const CLOSED_STATUS_COLUMNS = [
  { key: 'afgewezen', label: 'Afgewezen', color: 'from-mod-werkbonnen-light/30 to-mod-werkbonnen-light/10', accent: 'bg-mod-werkbonnen-text', headerBg: 'bg-mod-werkbonnen-light/60' },
  { key: 'verlopen', label: 'Verlopen', color: 'from-mod-offertes-light/30 to-mod-offertes-light/10', accent: 'bg-mod-offertes-text', headerBg: 'bg-mod-offertes-light/60' },
]

const KLEUR_TO_STYLE: Record<string, { color: string; accent: string; headerBg: string }> = {
  gray: { color: 'from-mod-taken-light/30 to-mod-taken-light/10', accent: 'bg-mod-taken-text', headerBg: 'bg-mod-taken-light/60' },
  blue: { color: 'from-mod-klanten-light/30 to-mod-klanten-light/10', accent: 'bg-mod-klanten-text', headerBg: 'bg-mod-klanten-light/60' },
  purple: { color: 'from-mod-email-light/30 to-mod-email-light/10', accent: 'bg-mod-email-text', headerBg: 'bg-mod-email-light/60' },
  green: { color: 'from-mod-facturen-light/30 to-mod-facturen-light/10', accent: 'bg-mod-facturen-text', headerBg: 'bg-mod-facturen-light/60' },
  red: { color: 'from-mod-werkbonnen-light/30 to-mod-werkbonnen-light/10', accent: 'bg-mod-werkbonnen-text', headerBg: 'bg-mod-werkbonnen-light/60' },
  orange: { color: 'from-mod-offertes-light/30 to-mod-offertes-light/10', accent: 'bg-mod-offertes-text', headerBg: 'bg-mod-offertes-light/60' },
  teal: { color: 'from-mod-facturen-light/30 to-mod-facturen-light/10', accent: 'bg-mod-facturen-text', headerBg: 'bg-mod-facturen-light/60' },
}

const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  concept: { bg: '#EEEEED', text: '#5A5A55' },
  verzonden: { bg: '#FDE8E2', text: '#C03A18' },
  bekeken: { bg: '#EEE8F5', text: '#5A4A78' },
  goedgekeurd: { bg: '#E2F0F0', text: '#1A535C' },
  afgewezen: { bg: '#FDE8E2', text: '#C03A18' },
  verlopen: { bg: '#EEEEED', text: '#5A5A55' },
  gefactureerd: { bg: '#E4F0EA', text: '#2D6B48' },
  wijziging_gevraagd: { bg: '#FDE8E2', text: '#C03A18' },
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
    case 'concept': return 'bg-[#5A5A55]'
    case 'verzonden': return 'bg-[#C03A18]'
    case 'bekeken': return 'bg-[#5A4A78]'
    case 'goedgekeurd': return 'bg-[#1A535C]'
    case 'afgewezen': return 'bg-[#C03A18]'
    case 'verlopen': return 'bg-[#9B9B95]'
    case 'gefactureerd': return 'bg-[#2D6B48]'
    case 'wijziging_gevraagd': return 'bg-[#C03A18]'
    default: return 'bg-[#5A5A55]'
  }
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
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

function getDagenOpenHint(offerte: Offerte): { text: string; className: string } | null {
  if (offerte.status !== 'verzonden' && offerte.status !== 'bekeken') return null
  const sentDate = offerte.verstuurd_op || offerte.created_at
  if (!sentDate) return null
  const dagen = Math.floor((Date.now() - new Date(sentDate).getTime()) / 86400000)
  if (dagen < 5) return null
  if (dagen <= 7) return { text: `${dagen} dagen open`, className: 'text-[11px] text-[#6B6B66]' }
  if (dagen <= 14) return { text: `${dagen} dagen — overweeg opvolging`, className: 'text-[11px] text-[#C03A18]' }
  return { text: `${dagen} dagen open`, className: 'text-[11px] text-[#C03A18] font-medium' }
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

/** Klant initialen avatar kleuren */
const AVATAR_COLORS = ['#1A535C', '#F15025', '#2D6B48', '#3A6B8C', '#9A5A48']
function avatarColor(name: string): string {
  const code = (name || 'O').charCodeAt(0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
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

  useEffect(() => { loadOffertes() }, [loadOffertes])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) setShowPriorityDropdown(false)
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOffertes = useMemo(() => {
    let result = [...offertes]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(o =>
        o.nummer.toLowerCase().includes(q) ||
        o.titel.toLowerCase().includes(q) ||
        (o.klant_naam || '').toLowerCase().includes(q)
      )
    }
    if (priorityFilter !== 'alle') result = result.filter(o => o.prioriteit === priorityFilter)
    if (statusFilter === 'wacht_op_reactie') {
      result = result.filter(o => o.status === 'verzonden' || o.status === 'bekeken')
    } else if (statusFilter !== 'alle') {
      result = result.filter(o => o.status === statusFilter)
    }
    if (dagenOpenFilter !== 'alle') {
      result = result.filter(o => {
        if (!OPEN_STATUSES.includes(o.status)) return false
        return matchDagenFilter(getDaysOpen(o.created_at), dagenOpenFilter)
      })
    }
    switch (sortOption) {
      case 'newest': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break
      case 'oldest': result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break
      case 'highest': result.sort((a, b) => b.totaal - a.totaal); break
      case 'expiring': result.sort((a, b) => new Date(a.geldig_tot).getTime() - new Date(b.geldig_tot).getTime()); break
    }
    return result
  }, [offertes, searchQuery, priorityFilter, statusFilter, dagenOpenFilter, sortOption])

  const offertesByStatus = useMemo(() => {
    const map: Record<string, Offerte[]> = {}
    for (const col of STATUS_COLUMNS) map[col.key] = filteredOffertes.filter(o => o.status === col.key)
    return map
  }, [filteredOffertes, STATUS_COLUMNS])

  const eigenOffertes = useMemo(() => offertes, [offertes])

  const salesSummary = useMemo(() => {
    const pipelineStatuses = ['concept', 'verzonden', 'bekeken']
    const pipelineValue = round2(eigenOffertes.filter(o => pipelineStatuses.includes(o.status)).reduce((sum, o) => sum + o.totaal, 0))
    const verstuurdValue = round2(eigenOffertes.filter(o => o.status === 'verzonden').reduce((sum, o) => sum + o.totaal, 0))
    const akkoordThisMonth = eigenOffertes.filter(o => o.status === 'goedgekeurd' && isThisMonth(o.akkoord_op || o.updated_at))
    const akkoordValue = round2(akkoordThisMonth.reduce((sum, o) => sum + o.totaal, 0))
    return { pipelineValue, verstuurdValue, akkoordValue }
  }, [eigenOffertes])

  const financialSummary = useMemo(() => {
    const statusTotals: Record<string, { count: number; totaal: number }> = {}
    const allStatuses = ['concept', 'verzonden', 'bekeken', 'goedgekeurd', 'verlopen', 'afgewezen', 'gefactureerd']
    for (const s of allStatuses) statusTotals[s] = { count: 0, totaal: 0 }
    for (const o of eigenOffertes) {
      if (!statusTotals[o.status]) statusTotals[o.status] = { count: 0, totaal: 0 }
      statusTotals[o.status].count += 1
      statusTotals[o.status].totaal = round2(statusTotals[o.status].totaal + o.totaal)
    }
    const pipelineTotaal = round2(eigenOffertes.filter(o => o.status !== 'afgewezen' && o.status !== 'gefactureerd').reduce((sum, o) => sum + o.totaal, 0))
    const verwachteOmzet = round2(statusTotals['goedgekeurd']?.totaal || 0)
    return { statusTotals, pipelineTotaal, verwachteOmzet }
  }, [eigenOffertes])

  const kpis = useMemo(() => {
    const openStatuses = ['verzonden', 'bekeken']
    const openOffertes = eigenOffertes.filter(o => openStatuses.includes(o.status))
    const openCount = openOffertes.length
    const openValue = round2(openOffertes.reduce((sum, o) => sum + o.totaal, 0))
    const sentStatuses = ['verzonden', 'bekeken', 'goedgekeurd', 'afgewezen']
    const sentOffertes = eigenOffertes.filter(o => sentStatuses.includes(o.status))
    const approved = eigenOffertes.filter(o => o.status === 'goedgekeurd').length
    const conversionRate = sentOffertes.length > 0 ? round2((approved / sentOffertes.length) * 100) : 0
    const allValues = eigenOffertes.map(o => o.totaal)
    const avgValue = allValues.length > 0 ? round2(allValues.reduce((s, v) => s + v, 0) / allValues.length) : 0
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const overdueFollowUps = eigenOffertes.filter(o => {
      if (!o.follow_up_datum || o.follow_up_status === 'afgerond') return false
      return new Date(o.follow_up_datum) < today
    }).length
    const thisMonthCount = eigenOffertes.filter(o => isThisMonth(o.created_at)).length
    return { openCount, openValue, conversionRate, avgValue, overdueFollowUps, thisMonthCount }
  }, [eigenOffertes])

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

  const handleDragLeave = useCallback(() => { setDragOverColumn(null) }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    const offerteId = e.dataTransfer.getData('offerteId')
    if (!offerteId) return
    const offerte = offertes.find(o => o.id === offerteId)
    if (!offerte || offerte.status === newStatus) return
    try {
      const updates: Partial<Offerte> = { status: newStatus as Offerte['status'] }
      if (newStatus === 'verzonden' && !offerte.verstuurd_op) updates.verstuurd_op = new Date().toISOString()
      if (newStatus === 'goedgekeurd') updates.akkoord_op = new Date().toISOString()
      const updated = await updateOfferte(offerteId, updates)
      setOffertes(prev => prev.map(o => o.id === offerteId ? { ...o, ...updated } : o))
      toast.success(`${offerte.nummer} → ${STATUS_LABELS[newStatus] || newStatus}`)
    } catch (err) {
      logger.error('Drag & drop status update failed:', err)
      toast.error('Kon status niet bijwerken')
    }
  }, [offertes])

  const handleSaveFollowUp = useCallback(async (offerteId: string) => {
    if (!followUpDate) { toast.error('Selecteer een datum'); return }
    try {
      setSavingFollowUp(true)
      const updated = await updateOfferte(offerteId, { follow_up_datum: followUpDate, follow_up_notitie: followUpNote, follow_up_status: 'gepland' })
      setOffertes(prev => prev.map(o => o.id === offerteId ? { ...o, ...updated } : o))
      toast.success('Follow-up ingepland')
      setFollowUpOpen(null); setFollowUpDate(''); setFollowUpNote('')
    } catch (err) {
      logger.error('Fout bij opslaan follow-up:', err)
      toast.error('Kon follow-up niet opslaan')
    } finally { setSavingFollowUp(false) }
  }, [followUpDate, followUpNote])

  const handleCallClient = useCallback(async (offerte: Offerte) => {
    try {
      setCallingClient(offerte.id)
      const now = new Date().toISOString()
      const updated = await updateOfferte(offerte.id, { contact_pogingen: (offerte.contact_pogingen || 0) + 1, laatste_contact: now })
      setOffertes(prev => prev.map(o => o.id === offerte.id ? { ...o, ...updated } : o))
      toast.success(`Contactpoging ${(offerte.contact_pogingen || 0) + 1} geregistreerd`)
    } catch (err) {
      logger.error('Fout bij registreren contactpoging:', err)
      toast.error('Kon contactpoging niet registreren')
    } finally { setCallingClient(null) }
  }, [])

  const handleListSort = useCallback((column: string) => {
    if (listSortColumn === column) setListSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setListSortColumn(column); setListSortDir('asc') }
  }, [listSortColumn])

  const handleStatusChange = useCallback(async (offerteId: string, newStatus: string) => {
    try {
      const updates: Partial<Offerte> = { status: newStatus as Offerte['status'] }
      if (newStatus === 'verzonden') updates.verstuurd_op = new Date().toISOString()
      if (newStatus === 'goedgekeurd') updates.akkoord_op = new Date().toISOString()
      const updated = await updateOfferte(offerteId, updates)
      setOffertes(prev => prev.map(o => o.id === offerteId ? { ...o, ...updated } : o))
      toast.success(`Status gewijzigd naar ${STATUS_LABELS[newStatus] || newStatus}`)
    } catch (err) {
      logger.error('Fout bij statuswijziging:', err)
      toast.error('Kon status niet wijzigen')
    }
  }, [])

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }
  function toggleSelectAll() {
    if (selectedIds.size === filteredOffertes.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredOffertes.map(o => o.id)))
  }
  async function handleBulkStatusChange(newStatus: string) {
    if (selectedIds.size === 0) return
    try {
      const updates: Partial<Offerte> = { status: newStatus as Offerte['status'] }
      if (newStatus === 'verzonden') updates.verstuurd_op = new Date().toISOString()
      if (newStatus === 'goedgekeurd') updates.akkoord_op = new Date().toISOString()
      await Promise.all([...selectedIds].map(id => updateOfferte(id, updates)))
      setOffertes(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, ...updates } : o))
      toast.success(`${selectedIds.size} offerte${selectedIds.size === 1 ? '' : 's'} gewijzigd`)
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
        case 'nummer': return a.nummer.localeCompare(b.nummer) * dir
        case 'klant_naam': return (a.klant_naam || '').localeCompare(b.klant_naam || '') * dir
        case 'titel': return a.titel.localeCompare(b.titel) * dir
        case 'totaal': return (a.totaal - b.totaal) * dir
        case 'status': return a.status.localeCompare(b.status) * dir
        case 'days_open': return (getDaysOpen(a.created_at) - getDaysOpen(b.created_at)) * dir
        case 'geldig_tot': return (new Date(a.geldig_tot).getTime() - new Date(b.geldig_tot).getTime()) * dir
        default: return (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) * dir
      }
    })
    return sorted
  }, [filteredOffertes, listSortColumn, listSortDir])

  // Follow-up badge count
  const followUpBadgeCount = useMemo(() => {
    const now = Date.now()
    const drieD = 3 * 86400000
    const vijfD = 5 * 86400000
    return offertes.filter(o => {
      if (o.status !== 'verzonden' && o.status !== 'bekeken') return false
      if (o.verstuurd_op && (now - new Date(o.verstuurd_op).getTime()) > drieD) return true
      if (o.follow_up_datum && new Date(o.follow_up_datum).getTime() <= now) return true
      if (o.geldig_tot) { const vt = new Date(o.geldig_tot).getTime(); if (vt - now <= vijfD && vt > now) return true }
      return false
    }).length
  }, [offertes])

  if (isLoading) return <SkeletonTable rows={6} cols={5} />

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-[#C03A18]">{error}</p>
          <button onClick={loadOffertes} className="text-sm font-medium text-[#1A535C] hover:underline">Opnieuw proberen</button>
        </div>
      </div>
    )
  }

  /** Sortable column header */
  const SortHeader = ({ column, label, align = 'left' }: { column: string; label: string; align?: 'left' | 'right' }) => (
    <button
      onClick={() => handleListSort(column)}
      className={cn(
        'flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95] hover:text-[#1A1A1A] transition-colors',
        align === 'right' && 'ml-auto',
      )}
    >
      {label}
      {listSortColumn === column ? (
        listSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-30" />
      )}
    </button>
  )

  return (
    <div className="h-full flex flex-col bg-[#F8F7F5] -m-3 sm:-m-4 md:-m-6">
      {/* Animations */}
      <style>{`
        @keyframes doen-pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }
        @keyframes doen-fade-up { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .doen-pulse { animation: doen-pulse 2.5s ease-in-out infinite }
        .doen-row { animation: doen-fade-up .35s cubic-bezier(.22,1,.36,1) both }
      `}</style>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-8 py-8 space-y-6">

          {/* ── Header + Stats ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-4">
                <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-[#1A1A1A]">
                  Offertes<span className="text-[#F15025]">.</span>
                </h1>
                <span className="text-[13px] text-[#9B9B95] font-mono tabular-nums">
                  <span className="font-medium text-[#6B6B66]">{filteredOffertes.length}</span>
                  <span className="text-[#C0BDB8]">/</span>{offertes.length}
                </span>
              </div>
              <Link
                to="/offertes/nieuw"
                className="inline-flex items-center gap-2 bg-[#F15025] text-white pl-4 pr-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35),0_0_0_1px_rgba(241,80,37,0.15)] hover:-translate-y-[1px] active:translate-y-0 active:bg-[#D03A18] transition-all duration-200"
              >
                <Plus className="w-4 h-4 opacity-80" />
                Nieuwe offerte
              </Link>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-2 flex-wrap">
              {kpis.openCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#FDE8E2] text-[#C03A18]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F15025] doen-pulse" />
                  <span className="font-mono">{kpis.openCount}</span> open
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#E8F2EC] text-[#2D6B48]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D6B48]" />
                <span className="font-mono">{kpis.conversionRate}%</span> conversie
              </span>
              {kpis.overdueFollowUps > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#FDE8E4] text-[#C0451A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F15025] doen-pulse" />
                  <span className="font-mono">{kpis.overdueFollowUps}</span> achterstallig
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#E8EEF9] text-[#3A5A9A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3A5A9A]" />
                Pipeline <span className="font-mono">{formatEur(financialSummary.pipelineTotaal)}</span>
              </span>
            </div>
          </div>

          {/* ── Toolbar card ── */}
          {viewMode !== 'follow-up' && (
            <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03]">
              <div className="flex items-center gap-5">
                {/* Search */}
                <div className="relative max-w-[280px] flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9B95]" />
                  <input
                    type="text"
                    placeholder="Zoek op nummer, titel of klant..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-12 py-2 text-sm bg-[#F8F7F5] border border-[#EBEBEB] rounded-lg text-[#1A1A1A] placeholder:text-[#9B9B95] focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/10 transition-all"
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#9B9B95] bg-[#F0EFEC] rounded border border-[#E5E4E0]">/</kbd>
                </div>

                {/* View mode toggle */}
                <div className="flex items-center bg-[#F8F7F5] rounded-lg p-0.5 border border-[#EBEBEB]">
                  <button
                    onClick={() => setViewMode('lijst')}
                    className={cn('p-1.5 rounded-md transition-all', viewMode === 'lijst' ? 'bg-white shadow-sm text-[#1A1A1A]' : 'text-[#9B9B95] hover:text-[#6B6B66]')}
                    title="Lijstweergave"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('pipeline')}
                    className={cn('p-1.5 rounded-md transition-all', viewMode === 'pipeline' ? 'bg-white shadow-sm text-[#1A1A1A]' : 'text-[#9B9B95] hover:text-[#6B6B66]')}
                    title="Kanban"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('follow-up')}
                    className={cn('p-1.5 rounded-md transition-all relative', viewMode === 'follow-up' ? 'bg-white shadow-sm text-[#1A1A1A]' : 'text-[#9B9B95] hover:text-[#6B6B66]')}
                    title="Follow-up"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    {followUpBadgeCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold flex items-center justify-center text-white bg-[#F15025] px-0.5">
                        {followUpBadgeCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Pipeline settings */}
                <button
                  onClick={() => setShowPipelineSettings(!showPipelineSettings)}
                  className={cn(
                    'p-1.5 rounded-lg transition-all',
                    showPipelineSettings ? 'bg-[#E2F0F0] text-[#1A535C]' : 'text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F8F7F5]'
                  )}
                  title="Pipeline instellingen"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Export */}
                <div className="hidden sm:flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => {
                      const headers = ['Nummer', 'Klant', 'Titel', 'Status', 'Bedrag', 'Aangemaakt', 'Geldig tot']
                      const rows = filteredOffertes.map(o => ({
                        Nummer: o.nummer, Klant: o.klant_naam || 'Onbekend', Titel: o.titel,
                        Status: STATUS_LABELS[o.status] || o.status, Bedrag: formatCurrency(o.totaal),
                        Aangemaakt: formatDate(o.created_at), 'Geldig tot': formatDate(o.geldig_tot),
                      }))
                      exportCSV(`offertes-${new Date().toISOString().split('T')[0]}`, headers, rows)
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] px-3 py-2 rounded-lg transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>
                  <button
                    onClick={() => {
                      const headers = ['Nummer', 'Klant', 'Titel', 'Status', 'Bedrag', 'Aangemaakt', 'Geldig tot']
                      const rows = filteredOffertes.map(o => ({
                        Nummer: o.nummer, Klant: o.klant_naam || 'Onbekend', Titel: o.titel,
                        Status: STATUS_LABELS[o.status] || o.status, Bedrag: o.totaal,
                        Aangemaakt: formatDate(o.created_at), 'Geldig tot': formatDate(o.geldig_tot),
                      }))
                      exportExcel(`offertes-${new Date().toISOString().split('T')[0]}`, headers, rows, 'Offertes')
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] px-3 py-2 rounded-lg transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Excel
                  </button>
                </div>
              </div>

              {/* Status filter tabs */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#F0EFEC]">
                <div className="flex items-center gap-1 flex-wrap flex-1">
                  {statusOpties.map(optie => {
                    const count = optie.value === 'alle'
                      ? offertes.length
                      : optie.value === 'wacht_op_reactie'
                      ? offertes.filter(o => o.status === 'verzonden' || o.status === 'bekeken').length
                      : offertes.filter(o => o.status === optie.value).length
                    if (optie.value !== 'alle' && count === 0) return null
                    const isActive = statusFilter === optie.value
                    return (
                      <button
                        key={optie.value}
                        onClick={() => setStatusFilter(optie.value as StatusFilter)}
                        className={cn(
                          'relative text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all',
                          isActive
                            ? 'text-[#1A535C] font-semibold bg-[#1A535C]/[0.07]'
                            : 'text-[#9B9B95] hover:text-[#6B6B66]',
                        )}
                      >
                        {optie.label}
                        {count > 0 && <span className="ml-1 font-mono text-[11px] opacity-50">{count}</span>}
                        {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[#1A535C] rounded-full" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Dagen open filter */}
              <div className="mt-3">
                <DagenOpenFilterBar
                  value={dagenOpenFilter}
                  onChange={setDagenOpenFilter}
                  items={offertes.filter(o => OPEN_STATUSES.includes(o.status)).map(o => ({ dateField: o.created_at }))}
                />
              </div>
            </div>
          )}

          {/* ── Pipeline Settings Panel ── */}
          {showPipelineSettings && (
            <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] space-y-4">
              <h3 className="text-[15px] font-bold text-[#1A1A1A] flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#9B9B95]" />
                Pipeline Stappen
              </h3>
              <div className="space-y-2">
                {editStappen.map((stap, index) => (
                  <div key={stap.key} className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F7F5] border border-[#EBEBEB]">
                    <GripVertical className="w-4 h-4 text-[#C0BDB8] flex-shrink-0" />
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{
                      backgroundColor: stap.kleur === 'gray' ? '#9ca3af' : stap.kleur === 'blue' ? '#3b82f6' : stap.kleur === 'purple' ? '#8b5cf6' : stap.kleur === 'green' ? '#22c55e' : stap.kleur === 'red' ? '#ef4444' : stap.kleur === 'orange' ? '#f97316' : stap.kleur === 'teal' ? '#14b8a6' : '#6b7280'
                    }} />
                    <input
                      value={stap.label}
                      onChange={e => handleUpdatePipelineStap(index, { label: e.target.value })}
                      className="flex-1 h-8 px-3 text-sm bg-white border border-[#EBEBEB] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/10"
                    />
                    <Select value={stap.kleur} onValueChange={v => handleUpdatePipelineStap(index, { kleur: v })}>
                      <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
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
                    <Switch checked={stap.actief} onCheckedChange={checked => handleUpdatePipelineStap(index, { actief: checked })} />
                    <button onClick={() => handleRemovePipelineStap(index)} className="p-1.5 rounded-lg text-[#C0BDB8] hover:text-[#C03A18] hover:bg-[#FDE8E2] transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button onClick={handleAddPipelineStap} className="text-sm font-medium text-[#1A535C] hover:underline flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Stap toevoegen
                </button>
                <button
                  onClick={handleSavePipeline}
                  disabled={isSavingPipeline}
                  className="ml-auto inline-flex items-center gap-2 bg-[#1A535C] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#154750] transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingPipeline ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </div>
          )}

          {/* ── Pipeline (Kanban) View ── */}
          {viewMode === 'pipeline' && (
            <>
              {/* Financial overview cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {([
                  { key: 'concept' as const, label: 'Concept', dot: '#5A5A55', text: '#5A5A55', bg: '#F8F7F5' },
                  { key: 'verzonden' as const, label: 'Verstuurd', dot: '#F15025', text: '#C03A18', bg: '#FDE8E2' },
                  { key: 'bekeken' as const, label: 'Bekeken', dot: '#6A5A8A', text: '#5A4A78', bg: '#EEE8F5' },
                  { key: 'goedgekeurd' as const, label: 'Akkoord', dot: '#1A535C', text: '#1A535C', bg: '#E2F0F0' },
                  { key: 'verlopen' as const, label: 'Verlopen', dot: '#9B9B95', text: '#6B6B66', bg: '#F0EFEC' },
                  { key: 'afgewezen' as const, label: 'Afgewezen', dot: '#C03A18', text: '#C03A18', bg: '#FDE8E2' },
                ]).map(col => {
                  const data = financialSummary.statusTotals[col.key] || { count: 0, totaal: 0 }
                  return (
                    <div key={col.key} className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.dot }} />
                        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: col.text }}>{col.label}<span className="text-[#F15025]">.</span></span>
                      </div>
                      <p className="text-[18px] font-bold font-mono tabular-nums text-[#1A1A1A]">{formatEur(data.totaal)}</p>
                      <p className="text-[11px] text-[#9B9B95] mt-0.5">{data.count} {data.count === 1 ? 'offerte' : 'offertes'}</p>
                    </div>
                  )
                })}
              </div>

              {/* Sales summary */}
              <div className="bg-white rounded-2xl px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#9B9B95]" />
                  <span className="text-[13px] text-[#6B6B66]">Pipeline</span>
                  <span className="text-[13px] font-bold font-mono text-[#1A1A1A]">{formatEur(salesSummary.pipelineValue)}</span>
                </div>
                <div className="w-px h-4 bg-[#EBEBEB] hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#6B6B66]">Verstuurd</span>
                  <span className="text-[13px] font-bold font-mono text-[#1A1A1A]">{formatEur(salesSummary.verstuurdValue)}</span>
                </div>
                <div className="w-px h-4 bg-[#EBEBEB] hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#6B6B66]">Akkoord</span>
                  <span className="text-[13px] font-bold font-mono text-[#2D6B48]">{formatEur(salesSummary.akkoordValue)}</span>
                </div>
              </div>

              {/* Kanban columns */}
              <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[480px]', STATUS_COLUMNS.length <= 5 ? 'lg:grid-cols-5' : `lg:grid-cols-${Math.min(STATUS_COLUMNS.length, 7)}`)}>
                {STATUS_COLUMNS.map(col => {
                  const colOffertes = offertesByStatus[col.key] || []
                  const colTotal = round2(colOffertes.reduce((sum, o) => sum + o.totaal, 0))
                  const isDragOver = dragOverColumn === col.key
                  return (
                    <div
                      key={col.key}
                      className={cn(
                        'rounded-2xl bg-[#F8F7F5] ring-1 flex flex-col overflow-hidden transition-all duration-150',
                        isDragOver ? 'ring-[#1A535C] shadow-lg scale-[1.01]' : 'ring-black/[0.03]',
                      )}
                      onDragOver={e => handleDragOver(e, col.key)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDrop(e, col.key)}
                    >
                      {/* Column header */}
                      <div className="px-4 py-3.5 border-b border-[#EBEBEB]">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn('w-2 h-2 rounded-full', col.accent)} />
                          <h3 className="font-bold text-[13px] text-[#1A1A1A]">{col.label}<span className="text-[#F15025]">.</span></h3>
                          <span className="ml-auto text-[11px] font-mono font-semibold text-[#9B9B95] bg-[#EBEBEB] px-2 py-0.5 rounded-md">{colOffertes.length}</span>
                        </div>
                        <p className="text-[11px] text-[#9B9B95] font-mono tabular-nums pl-4">{formatEur(colTotal)}</p>
                      </div>

                      {/* Cards */}
                      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto min-h-[100px]">
                        {colOffertes.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <p className="text-[12px] text-[#C0BDB8]">Geen offertes</p>
                          </div>
                        )}
                        {colOffertes.map(offerte => {
                          const daysOpen = getDaysOpen(offerte.created_at)
                          const expiryStatus = getExpiryStatus(offerte.geldig_tot)
                          const followUpState = getFollowUpState(offerte)
                          const showActions = col.key === 'verzonden' || col.key === 'bekeken'
                          return (
                            <div key={offerte.id} className="relative group">
                              <div
                                draggable
                                onDragStart={e => handleDragStart(e, offerte.id)}
                                onClick={() => navigateWithTab({ path: `/offertes/${offerte.id}/bewerken`, label: offerte.nummer || offerte.titel || 'Offerte', id: `/offertes/${offerte.id}` })}
                                className="bg-white rounded-xl p-3.5 space-y-2 ring-1 ring-black/[0.03] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer active:cursor-grabbing"
                              >
                                {/* Top row */}
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[11px] font-mono font-medium text-[#1A535C]">{offerte.nummer}</span>
                                  <div className="flex items-center gap-1">
                                    {(offerte.prioriteit === 'urgent' || offerte.prioriteit === 'hoog') && (
                                      <span className="w-2 h-2 rounded-full bg-[#F15025]" title={offerte.prioriteit} />
                                    )}
                                    {followUpState === 'overdue' && <BellRing className="h-3 w-3 text-[#C03A18] doen-pulse" />}
                                    {followUpState === 'today' && <BellRing className="h-3 w-3 text-[#F15025]" />}
                                    {followUpState === 'upcoming' && <Bell className="h-3 w-3 text-[#1A535C]" />}
                                    {offerte.bekeken_door_klant && (
                                      <span className="inline-flex items-center gap-0.5" title={`Bekeken${offerte.aantal_keer_bekeken ? ` (${offerte.aantal_keer_bekeken}x)` : ''}`}>
                                        <Eye className="h-3 w-3 text-[#2D6B48]" />
                                        {offerte.aantal_keer_bekeken && offerte.aantal_keer_bekeken > 1 && (
                                          <span className="text-[9px] text-[#2D6B48] font-medium">{offerte.aantal_keer_bekeken}x</span>
                                        )}
                                      </span>
                                    )}
                                    {offerte.verstuurd_op && (offerte.status === 'verzonden' || offerte.status === 'bekeken') && (() => {
                                      const sentDays = getDaysOpen(offerte.verstuurd_op!)
                                      const dotColor = sentDays <= 3 ? 'bg-[#2D6B48]' : sentDays <= 14 ? 'bg-[#F15025]' : 'bg-[#C03A18]'
                                      return (
                                        <span className="inline-flex items-center gap-0.5">
                                          <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
                                          <span className="text-[10px] font-mono text-[#9B9B95]">{sentDays}d</span>
                                        </span>
                                      )
                                    })()}
                                  </div>
                                </div>
                                {/* Client */}
                                <p className="text-[12px] text-[#6B6B66] truncate">{offerte.klant_naam || 'Onbekende klant'}</p>
                                {/* Amount + date */}
                                <div className="flex items-center justify-between pt-2 border-t border-[#F0EFEC]">
                                  <span className="text-[14px] font-bold font-mono tabular-nums text-[#1A1A1A]">{formatEur(offerte.totaal)}</span>
                                  <div className="flex items-center gap-1.5">
                                    {OPEN_STATUSES.includes(offerte.status) && (
                                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md font-mono tabular-nums', getDaysColor(daysOpen))}>{daysOpen}d</span>
                                    )}
                                    <span className="text-[10px] text-[#C0BDB8]">{relativeDate(offerte.created_at)}</span>
                                  </div>
                                </div>
                                {expiryStatus === 'expired' && (
                                  <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FDE8E2] text-[#C03A18]">Verlopen</span>
                                )}
                                {expiryStatus === 'soon' && (
                                  <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FDE8E2] text-[#C03A18]">Verloopt binnenkort</span>
                                )}
                              </div>
                              {/* Quick actions */}
                              {showActions && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <button
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); if (followUpOpen === offerte.id) setFollowUpOpen(null); else { setFollowUpOpen(offerte.id); setFollowUpDate(offerte.follow_up_datum || ''); setFollowUpNote(offerte.follow_up_notitie || '') } }}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-lg bg-[#E2F0F0] text-[#1A535C] hover:bg-[#D0E8EA] transition-all"
                                  >
                                    <CalendarPlus className="h-3 w-3" /> Follow-up
                                  </button>
                                  <button
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); handleCallClient(offerte) }}
                                    disabled={callingClient === offerte.id}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-lg bg-[#E8F2EC] text-[#2D6B48] hover:bg-[#D4E8DB] transition-all disabled:opacity-50"
                                  >
                                    {callingClient === offerte.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}
                                    Bel klant
                                  </button>
                                </div>
                              )}
                              {/* Follow-up popover */}
                              {followUpOpen === offerte.id && (
                                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl ring-1 ring-black/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 space-y-3" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1A1A1A]">Follow-up plannen</p>
                                    <button onClick={() => setFollowUpOpen(null)} className="text-[#9B9B95] hover:text-[#1A1A1A] transition-colors"><X className="h-3.5 w-3.5" /></button>
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-medium text-[#6B6B66] mb-1 block">Datum</label>
                                    <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="w-full rounded-lg border border-[#EBEBEB] bg-[#F8F7F5] px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/10" />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-medium text-[#6B6B66] mb-1 block">Notitie</label>
                                    <textarea value={followUpNote} onChange={e => setFollowUpNote(e.target.value)} rows={2} placeholder="Bijv. bellen over status..." className="w-full rounded-lg border border-[#EBEBEB] bg-[#F8F7F5] px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#C0BDB8] focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/10 resize-none" />
                                  </div>
                                  <button
                                    onClick={() => handleSaveFollowUp(offerte.id)}
                                    disabled={savingFollowUp}
                                    className="w-full inline-flex items-center justify-center gap-2 bg-[#1A535C] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#154750] transition-all disabled:opacity-50"
                                  >
                                    {savingFollowUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                                    Opslaan
                                  </button>
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
            </>
          )}

          {/* ── Bulk action bar ── */}
          {viewMode === 'lijst' && selectedIds.size > 0 && (
            <div className="bg-[#1A535C]/[0.06] rounded-xl ring-1 ring-[#1A535C]/10 px-5 py-3 flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-[#1A535C] text-white flex items-center justify-center text-xs font-bold">{selectedIds.size}</span>
                <div>
                  <span className="text-sm font-semibold text-[#1A535C]">{selectedIds.size} offerte{selectedIds.size === 1 ? '' : 's'} geselecteerd</span>
                  <span className="text-[10px] text-[#1A535C]/50 ml-2">van {filteredOffertes.length}</span>
                </div>
              </div>
              <button onClick={toggleSelectAll} className="text-xs font-semibold text-[#1A535C] px-2.5 py-1 rounded-md hover:bg-white/40 transition-all">
                {selectedIds.size === filteredOffertes.length ? 'Deselecteer alles' : 'Selecteer alles'}
              </button>
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-white ring-1 ring-[#1A535C]/10 text-[#1A535C] hover:shadow-sm transition-all">
                    <ArrowUpDown className="w-3 h-3" /> Status wijzigen <ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {statusOpties.filter(s => s.value !== 'alle').map(s => (
                    <DropdownMenuItem key={s.value} onClick={() => handleBulkStatusChange(s.value)} className="flex items-center gap-2 text-xs">
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getOfferteStatusDotColor(s.value))} />
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-lg text-[#1A535C] hover:bg-white/40 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── List View ── */}
          {viewMode === 'lijst' && (
            <>
              {sortedListOffertes.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 ring-1 ring-black/[0.03] text-center">
                  <EmptyState
                    module="offertes"
                    title="Geen offertes gevonden"
                    description={searchQuery || statusFilter !== 'alle' ? 'Pas je filters aan of maak een nieuwe offerte.' : 'Maak je eerste offerte en stuur hem naar je klant.'}
                    action={
                      <Link to="/offertes/nieuw" className="text-sm font-medium text-[#F15025] hover:underline inline-flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Nieuwe offerte
                      </Link>
                    }
                  />
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden space-y-2">
                    {sortedListOffertes.map((offerte, i) => {
                      const expiryStatus = getExpiryStatus(offerte.geldig_tot)
                      return (
                        <div
                          key={offerte.id}
                          className="doen-row bg-white rounded-xl p-4 ring-1 ring-black/[0.03] shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-transform"
                          style={{ animationDelay: `${i * 30}ms` }}
                          onClick={() => navigateWithTab({ path: `/offertes/${offerte.id}/bewerken`, label: offerte.nummer || offerte.titel || 'Offerte', id: `/offertes/${offerte.id}` })}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[14px] font-semibold text-[#1A1A1A] truncate">{offerte.titel || offerte.nummer}</span>
                            <span className="text-[14px] font-bold font-mono tabular-nums text-[#1A1A1A]">{formatEur(offerte.totaal)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-[#6B6B66]">{offerte.klant_naam || 'Onbekend'}</span>
                            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium rounded-md px-2 py-0.5"
                              style={{ backgroundColor: STATUS_BADGE_STYLES[offerte.status]?.bg ?? '#EEEEED', color: STATUS_BADGE_STYLES[offerte.status]?.text ?? '#5A5A55' }}
                            >
                              {STATUS_LABELS[offerte.status] || offerte.status}<span className="text-[#F15025]">.</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-mono text-[#C0BDB8]">{offerte.nummer}</span>
                            {expiryStatus === 'expired' && <span className="text-[10px] font-medium text-[#C03A18]">Verlopen</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-[#F0EFEC]">
                            <th className="py-3.5 pl-5 pr-3 w-10 text-left">
                              <Checkbox
                                checked={sortedListOffertes.length > 0 && selectedIds.size === sortedListOffertes.length}
                                onCheckedChange={toggleSelectAll}
                              />
                            </th>
                            <th className="text-left py-3.5 pr-4"><SortHeader column="nummer" label="Offerte" /></th>
                            <th className="text-left py-3.5 pr-4 w-[160px] hidden lg:table-cell"><SortHeader column="klant_naam" label="Klant" /></th>
                            <th className="text-left py-3.5 pr-4 w-[150px]"><span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Status</span></th>
                            <th className="text-right py-3.5 pr-4 w-[110px] hidden xl:table-cell"><SortHeader column="totaal" label="Bedrag" align="right" /></th>
                            <th className="text-right py-3.5 pr-4 w-[80px] hidden md:table-cell"><SortHeader column="created_at" label="Datum" align="right" /></th>
                            <th className="text-right py-3.5 pr-4 w-[70px] hidden lg:table-cell"><SortHeader column="days_open" label="Dagen" align="right" /></th>
                            <th className="text-right py-3.5 pr-4 hidden md:table-cell"><SortHeader column="geldig_tot" label="Geldig tot" align="right" /></th>
                            <th className="w-10 py-3.5 pr-4" />
                          </tr>
                        </thead>
                        <tbody>
                          {sortedListOffertes.map((offerte, i) => {
                            const expiryStatus = getExpiryStatus(offerte.geldig_tot)
                            const klantInitial = (offerte.klant_naam || 'O')[0].toUpperCase()
                            return (
                              <tr
                                key={offerte.id}
                                className={cn(
                                  'doen-row border-b border-[#F0EFEC] last:border-0 cursor-pointer transition-all duration-200 group',
                                  'hover:bg-[#F8F7F4]',
                                  selectedIds.has(offerte.id) && 'bg-[#1A535C]/[0.03]',
                                )}
                                style={{ animationDelay: `${i * 25}ms` }}
                                onClick={() => navigateWithTab({ path: `/offertes/${offerte.id}/bewerken`, label: offerte.nummer || offerte.titel || 'Offerte', id: `/offertes/${offerte.id}` })}
                              >
                                <td className="py-3.5 pl-5 pr-3 align-middle" onClick={e => e.stopPropagation()}>
                                  <Checkbox checked={selectedIds.has(offerte.id)} onCheckedChange={() => toggleSelect(offerte.id)} />
                                </td>
                                {/* Offerte */}
                                <td className="py-3.5 pr-4">
                                  <div className="min-w-0">
                                    <div className="flex items-baseline gap-2.5">
                                      <Link
                                        to={`/offertes/${offerte.id}/bewerken`}
                                        onClick={e => e.stopPropagation()}
                                        className="text-[15px] font-semibold text-[#1A1A1A] group-hover:text-[#1A535C] underline-offset-2 decoration-transparent group-hover:decoration-[#1A535C]/20 underline transition-all truncate"
                                      >
                                        {offerte.titel || offerte.nummer}
                                      </Link>
                                      {offerte.nummer && (
                                        <span className="text-[10px] text-[#B0ADA8] font-mono flex-shrink-0 tabular-nums bg-[#F8F7F5] px-1.5 py-0.5 rounded">{offerte.nummer}</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                {/* Klant */}
                                <td className="py-3.5 pr-4 hidden lg:table-cell">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {(() => {
                                      const naam = offerte.klant_naam || 'Onbekend'
                                      const c = naam.charCodeAt(0) % 5
                                      const avatarColors = [
                                        'bg-[#E8F2EC] text-[#3A7D52]',
                                        'bg-[#E8EEF9] text-[#3A5A9A]',
                                        'bg-[#F5F2E8] text-[#8A7A4A]',
                                        'bg-[#F0EFEC] text-[#6B6B66]',
                                        'bg-[#EDE8F4] text-[#6A5A8A]',
                                      ]
                                      return (
                                        <span className={cn('flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold uppercase select-none', avatarColors[c])}>
                                          {naam.charAt(0)}
                                        </span>
                                      )
                                    })()}
                                    <div className="min-w-0">
                                      <span className="text-[13px] text-[#4A4A46] truncate block leading-tight">{offerte.klant_naam || 'Onbekend'}</span>
                                    </div>
                                  </div>
                                </td>
                                {/* Status */}
                                <td className="py-3.5 pr-4" onClick={e => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="text-left group/status inline-flex items-center gap-1">
                                        <span
                                          className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-lg transition-all group-hover/status:shadow-sm"
                                          style={{ backgroundColor: STATUS_BADGE_STYLES[offerte.status]?.bg ?? '#EEEEED', color: STATUS_BADGE_STYLES[offerte.status]?.text ?? '#5A5A55' }}
                                        >
                                          {(offerte.status === 'verzonden' || offerte.status === 'bekeken') && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-current doen-pulse" />
                                          )}
                                          {STATUS_LABELS[offerte.status] || offerte.status}<span className="text-[#F15025]">.</span>
                                        </span>
                                        <ChevronDown className="w-3 h-3 text-[#C0BDB8] opacity-0 group-hover/status:opacity-100 transition-opacity -ml-0.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-44">
                                      {statusOpties.filter(s => s.value !== 'alle').map(s => (
                                        <DropdownMenuItem
                                          key={s.value}
                                          onClick={e => { e.stopPropagation(); if (s.value !== offerte.status) handleStatusChange(offerte.id, s.value) }}
                                          className={cn('flex items-center gap-2 text-xs', s.value === offerte.status && 'font-semibold')}
                                        >
                                          <span className={cn('w-1.5 h-1.5 rounded-full', getOfferteStatusDotColor(s.value))} />
                                          {s.label}
                                          {s.value === offerte.status && <CheckCircle2 className="w-3 h-3 ml-auto text-[#1A535C]" />}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                                {/* Bedrag */}
                                <td className="py-3.5 pr-4 text-right hidden xl:table-cell">
                                  {(() => {
                                    if (offerte.totaal <= 0) return <span className="text-xs text-[#C0BDB8]">&mdash;</span>
                                    return (
                                      <span className={cn(
                                        'font-mono tabular-nums',
                                        offerte.totaal >= 10000
                                          ? 'text-[15px] font-bold text-[#1A1A1A]'
                                          : 'text-sm text-[#4A4A46]'
                                      )}>
                                        {formatEur(offerte.totaal)}
                                      </span>
                                    )
                                  })()}
                                </td>
                                {/* Datum */}
                                <td className="py-3.5 pr-4 text-right hidden md:table-cell">
                                  <span className="text-[12px] font-mono tabular-nums text-[#B0ADA8]">
                                    {new Date(offerte.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).replace('.', '')}
                                  </span>
                                </td>
                                {/* Dagen */}
                                <td className="py-3.5 pr-4 text-right hidden lg:table-cell">
                                  {(() => {
                                    const days = getDaysOpen(offerte.created_at)
                                    const urgent = days > 90
                                    const warning = days > 30
                                    return (
                                      <span
                                        className={cn(
                                          'inline-flex items-center justify-center text-[11px] font-mono font-semibold tabular-nums rounded-md px-2 py-0.5',
                                          urgent ? 'bg-[#FDE8E4] text-[#C03A18]' :
                                          warning ? 'bg-[#FEF3E8] text-[#D4621A]' :
                                          'text-[#9B9B95]'
                                        )}
                                      >
                                        {days}d
                                      </span>
                                    )
                                  })()}
                                </td>
                                {/* Geldig tot */}
                                <td className="py-3.5 pr-4 text-right hidden md:table-cell">
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <span className="text-[12px] font-mono tabular-nums text-[#B0ADA8]">{formatDate(offerte.geldig_tot)}</span>
                                    {expiryStatus === 'expired' && <span className="w-1.5 h-1.5 rounded-full bg-[#C03A18]" />}
                                    {expiryStatus === 'soon' && <span className="w-1.5 h-1.5 rounded-full bg-[#F15025]" />}
                                  </div>
                                </td>
                                {/* Actions */}
                                <td className="py-3.5 pr-4">
                                  <div className="flex items-center gap-0.5 justify-end">
                                    <Link to={`/offertes/${offerte.id}/preview`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-[#F0EFEC] transition-all opacity-0 group-hover:opacity-100" title="Preview">
                                      <Eye className="w-3.5 h-3.5 text-[#9B9B95]" />
                                    </Link>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-[#F0EFEC] transition-all opacity-0 group-hover:opacity-100">
                                          <MoreHorizontal className="w-3.5 h-3.5 text-[#9B9B95]" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={e => { e.stopPropagation(); navigateWithTab({ path: `/offertes/${offerte.id}/bewerken`, label: offerte.nummer || offerte.titel || 'Offerte', id: `/offertes/${offerte.id}` }) }}>
                                          Bewerken
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/offertes/${offerte.id}/preview`) }}>
                                          <Eye className="w-3.5 h-3.5 mr-2" /> Preview
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={e => {
                                          e.stopPropagation()
                                          const csv = ['Nummer;' + offerte.nummer, 'Klant;' + (offerte.klant_naam || 'Onbekend'), 'Titel;' + offerte.titel, 'Status;' + (STATUS_LABELS[offerte.status] || offerte.status), 'Bedrag;' + formatCurrency(offerte.totaal), 'Aangemaakt;' + formatDate(offerte.created_at)].join('\n')
                                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                                          const url = URL.createObjectURL(blob)
                                          const a = document.createElement('a'); a.href = url; a.download = `${offerte.nummer}.csv`; a.click()
                                          URL.revokeObjectURL(url)
                                        }}>
                                          <Download className="w-3.5 h-3.5 mr-2" /> Export
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
                </>
              )}
            </>
          )}

          {/* ── Follow-up View ── */}
          {viewMode === 'follow-up' && (
            <QuotesFollowUp offertes={offertes} onRefresh={loadOffertes} />
          )}
        </div>
      </div>
    </div>
  )
}
