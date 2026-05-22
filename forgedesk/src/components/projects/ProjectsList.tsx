import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import {
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
  FileText,
  ChevronDown,
  MoreHorizontal,
  Camera,
  Eye,
  CheckCircle2,
  X,
  Upload,
  Trash2,
  GripVertical,
  Copy,
  Archive,
  ListPlus,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { MedewerkerSelector } from '@/components/shared/MedewerkerSelector'
import { Button } from '@/components/ui/button'
import { getFase } from '@/utils/projectFases'
import { Checkbox } from '@/components/ui/checkbox'
import {
  cn,
  formatDate,
  formatCurrency,
} from '@/lib/utils'
import { exportCSV, exportExcel } from '@/lib/export'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { DatePicker } from '@/components/ui/date-picker'
import {
  WarningCircle as PhWarningCircle,
  Pulse as PhPulse,
  Receipt as PhReceipt,
  CheckCircle as PhCheckCircle,
} from '@phosphor-icons/react'
import { getProjecten, getKlanten, getOffertes, updateProject, createProjectFoto, deleteProject, getMedewerkers as fetchMedewerkers } from '@/services/supabaseService'
import { ProjectImportDialog } from './ProjectImportDialog'
import { useAuth } from '@/contexts/AuthContext'
import { logWijziging, logCreate } from '@/utils/auditLogger'
import type { Project, Klant, Offerte, Medewerker, Taak } from '@/types'
import { createTaak } from '@/services/projectService'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import { Skeleton } from '@/components/ui/skeleton'
import { useOptimisticState } from '@/hooks/useOptimistic'

const statusOpties = [
  { value: 'alle', label: 'Alle' },
  { value: 'actief', label: 'Actief' },
  { value: 'te-plannen', label: 'Te plannen' },
  { value: 'gepland', label: 'Gepland' },
  { value: 'in-review', label: 'In review' },
  { value: 'te-factureren', label: 'Te factureren' },
  { value: 'gefactureerd', label: 'Gefactureerd' },
  { value: 'on-hold', label: 'On-hold' },
  { value: 'afgerond', label: 'Afgerond' },
]

const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  afgerond: 'Afgerond',
  'on-hold': 'On-hold',
  'te-factureren': 'Te factureren',
  'gefactureerd': 'Gefactureerd',
  'te-plannen': 'Te plannen',
}

/** DOEN status text colors per status category */
function getStatusTextColor(status: string): string {
  switch (status) {
    case 'gepland':
    case 'te-plannen':
      return '#8A7A4A'
    case 'actief':
    case 'in-review':
      return '#3A5A9A'
    case 'te-factureren':
    case 'gefactureerd':
    case 'afgerond':
    case 'opgeleverd':
      return '#3A7D52'
    case 'on-hold':
      return '#9B9B95'
    default:
      return '#6B6B66'
  }
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'actief': return 'bg-[#2D6B48]'
    case 'gepland': return 'bg-[#2A5580]'
    case 'te-plannen': return 'bg-[#F15025]'
    case 'in-review': return 'bg-[#5A5A55]'
    case 'afgerond': return 'bg-[#1A535C]'
    case 'on-hold': return 'bg-[#5A5A55]'
    case 'te-factureren': return 'bg-[#2D6B48]'
    case 'gefactureerd': return 'bg-[#2D6B48]'
    case 'montage': return 'bg-[#2A5580]'
    case 'productie': return 'bg-[#5A4A78]'
    case 'opgeleverd': return 'bg-[#2D6B48]'
    default: return 'bg-[#5A5A55]'
  }
}

/** Workflow-proximity ordering — given a current status, which transitions are most likely next */
const STATUS_WORKFLOW: Record<string, string[]> = {
  'te-plannen':    ['gepland', 'actief', 'on-hold'],
  gepland:         ['actief', 'te-plannen', 'on-hold'],
  actief:          ['in-review', 'te-factureren', 'on-hold', 'te-plannen'],
  'in-review':     ['actief', 'te-factureren', 'te-plannen'],
  'te-factureren': ['gefactureerd', 'actief'],
  gefactureerd:    ['afgerond', 'te-factureren'],
  'on-hold':       ['actief', 'te-plannen'],
  afgerond:        ['actief'],
}

/** Hex codes for status indicators — unified across left-edge stripe and inline dot */
const STATUS_HEX: Record<string, string> = {
  actief: '#2D6B48',
  gepland: '#2A5580',
  'te-plannen': '#F15025',
  'in-review': '#5A5A55',
  afgerond: '#1A535C',
  'on-hold': '#5A5A55',
  'te-factureren': '#2D6B48',
  gefactureerd: '#2D6B48',
}
function statusHex(s: string): string {
  return STATUS_HEX[s] ?? '#5A5A55'
}

/** Map database statuses to spectrum fases for correct colors */
const STATUS_TO_FASE: Record<string, string> = {
  gepland: 'goedgekeurd',
  actief: 'productie',
  'te-factureren': 'opgeleverd',
}

function getSpectrumFase(dbStatus: string) {
  return getFase(STATUS_TO_FASE[dbStatus] || dbStatus)
}

export function ProjectsList() {
  const { navigateWithTab } = useNavigateWithTab()
  const { user } = useAuth()
  const [projecten, setProjecten] = useState<Project[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [zoekterm, setZoekterm] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [sortField, setSortField] = useState<'naam' | 'bedrag' | 'created_at'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  // Pagina-nummer leeft in de URL (?page=N) zodat het bewaard blijft bij
  // navigatie naar een detail-pagina en weer terug via de browser back-knop.
  const [searchParams, setSearchParams] = useSearchParams()
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const setCurrentPage = useCallback((next: number | ((prev: number) => number)) => {
    const value = typeof next === 'function' ? next(currentPage) : next
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (value <= 1) params.delete('page')
      else params.set('page', String(value))
      return params
    }, { replace: true })
  }, [currentPage, setSearchParams])
  const PAGE_SIZE = 50
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const [photoUploadProjectId, setPhotoUploadProjectId] = useState<string | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [photoUploadKlantId, setPhotoUploadKlantId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dagenOpenFilter, setDagenOpenFilter] = useState<string>('alle')
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'klant'>(() => {
    if (typeof window === 'undefined') return 'none'
    const stored = window.localStorage.getItem('doen_projecten_groupby')
    return (stored === 'status' || stored === 'klant') ? stored : 'none'
  })
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('doen_projecten_groupby', groupBy)
    }
  }, [groupBy])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const zoekInputRef = useRef<HTMLInputElement>(null)
  const runOptimistic = useOptimisticState(setProjecten)

  // Pending deletes: project verdwijnt direct uit UI, daadwerkelijke server-delete pas na 5s
  // (binnen die tijd kan de gebruiker via toast undo'en). Bij unmount flushen.
  const pendingDeletesRef = useRef<Map<string, { project: Project; timer: ReturnType<typeof setTimeout> }>>(new Map())

  useEffect(() => {
    const map = pendingDeletesRef.current
    return () => {
      const entries = [...map.entries()]
      map.clear()
      entries.forEach(([id, { timer }]) => {
        clearTimeout(timer)
        deleteProject(id).catch((err) => logger.error('flush delete:', err))
      })
    }
  }, [])

  function handleDeleteProject(project: Project) {
    setProjecten((prev) => prev.filter((p) => p.id !== project.id))
    const timer = setTimeout(() => {
      pendingDeletesRef.current.delete(project.id)
      deleteProject(project.id).catch((err) => {
        logger.error('delete project:', err)
        setProjecten((prev) => (prev.some((p) => p.id === project.id) ? prev : [...prev, project]))
        toast.error(`Kon "${project.naam}" niet verwijderen (gekoppelde offertes/werkbonnen?)`)
      })
    }, 5000)
    pendingDeletesRef.current.set(project.id, { project, timer })

    toast.success(`"${project.naam}" verwijderd`, {
      duration: 5000,
      action: {
        label: 'Ongedaan maken',
        onClick: () => {
          const entry = pendingDeletesRef.current.get(project.id)
          if (entry) {
            clearTimeout(entry.timer)
            pendingDeletesRef.current.delete(project.id)
          }
          setProjecten((prev) => (prev.some((p) => p.id === project.id) ? prev : [...prev, project]))
        },
      },
    })
  }

  const [leadColumns, setLeadColumns] = useState<['project', 'klant'] | ['klant', 'project']>(() => {
    const saved = localStorage.getItem('projects_column_order')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed[0] === 'klant' && parsed[1] === 'project') return ['klant', 'project']
      } catch { /* use default */ }
    }
    return ['project', 'klant']
  })
  const dragColRef = useRef<string | null>(null)

  useEffect(() => {
    localStorage.setItem('projects_column_order', JSON.stringify(leadColumns))
  }, [leadColumns])

  const handleQuickPhotoUpload = async (files: FileList) => {
    if (!photoUploadProjectId || !user) return
    const images = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (images.length === 0) return

    let uploaded = 0
    for (const file of images) {
      try {
        await createProjectFoto(
          { user_id: user.id, project_id: photoUploadProjectId, omschrijving: file.name, type: 'situatie' },
          file,
        )
        uploaded++
      } catch (err) {
        logger.error(`Fout bij uploaden ${file.name}:`, err)
        toast.error(`Upload mislukt: ${file.name}`)
      }
    }
    if (uploaded > 0) {
      toast.success(`${uploaded} foto${uploaded > 1 ? "'s" : ''} toegevoegd`)
    }
    setPhotoUploadProjectId(null)
    setPhotoUploadKlantId(null)
  }

  const toggleProjectSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const [projectenData, klantenData, offertesData, medewerkersData] = await Promise.all([
        getProjecten(),
        getKlanten(),
        getOffertes(),
        fetchMedewerkers(),
      ])
      setProjecten(projectenData)
      setKlanten(klantenData)
      setOffertes(offertesData)
      setMedewerkers(medewerkersData)
    } catch (error) {
      logger.error('Fout bij ophalen data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        navigateWithTab({ path: '/projecten/nieuw', label: 'Nieuw project', id: '/projecten/nieuw' })
      }
      if (e.key === '/') {
        e.preventDefault()
        zoekInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigateWithTab])

  async function setTeamLeden(projectId: string, team_leden: string[]) {
    try {
      const updated = await updateProject(projectId, { team_leden })
      setProjecten((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    } catch {
      toast.error('Kon team niet wijzigen')
    }
  }

  const [quickTaakProjectId, setQuickTaakProjectId] = useState<string | null>(null)
  const [quickTaakTitel, setQuickTaakTitel] = useState('')
  const [quickTaakToegewezen, setQuickTaakToegewezen] = useState('')
  const [quickTaakDeadline, setQuickTaakDeadline] = useState('')
  const [quickTaakSaving, setQuickTaakSaving] = useState(false)
  const quickTaakInputRef = useRef<HTMLInputElement>(null)

  async function handleQuickTaakSubmit() {
    if (!quickTaakProjectId || !quickTaakTitel.trim()) return
    setQuickTaakSaving(true)
    try {
      const taak = await createTaak({
        project_id: quickTaakProjectId,
        titel: quickTaakTitel.trim(),
        beschrijving: '',
        status: 'todo',
        prioriteit: 'medium',
        toegewezen_aan: quickTaakToegewezen,
        deadline: quickTaakDeadline || undefined,
        geschatte_tijd: 0,
        bestede_tijd: 0,
      } as Omit<Taak, 'id' | 'created_at' | 'updated_at'>)
      logCreate({ user, entityType: 'taak', entityId: taak.id })
      const projectNaam = projecten.find((p) => p.id === quickTaakProjectId)?.naam
      toast.success(`Taak toegevoegd aan ${projectNaam}`)
      setQuickTaakTitel('')
      setQuickTaakToegewezen('')
      setQuickTaakDeadline('')
      setQuickTaakProjectId(null)
    } catch {
      toast.error('Kon taak niet aanmaken')
    } finally {
      setQuickTaakSaving(false)
    }
  }

  function getKlantNaam(klantId: string): string {
    const klant = klanten.find((k) => k.id === klantId)
    return klant ? klant.bedrijfsnaam : 'Onbekend'
  }

  function getKlantContactpersoon(klantId: string): string {
    const klant = klanten.find((k) => k.id === klantId)
    return klant?.contactpersoon || ''
  }

  function getProjectOffertes(projectId: string): Offerte[] {
    return offertes.filter((o) => o.project_id === projectId)
  }

  function getProjectBedrag(projectId: string): number {
    const projOffertes = getProjectOffertes(projectId)
    return projOffertes.reduce((sum, o) => sum + (o.totaal || 0), 0)
  }

  function getDagenOpen(project: Project): number | null {
    if (project.status === 'afgerond' || project.status === 'gefactureerd') return null
    const created = new Date(project.created_at)
    return Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24))
  }

  function needsAttention(project: Project): boolean {
    if (project.status === 'in-review') return true
    const dagen = getDagenOpen(project)
    return dagen !== null && dagen > 30
  }

  const gefilterdeProjecten = useMemo(() => {
    let result = [...projecten]

    if (zoekterm.trim()) {
      const term = zoekterm.toLowerCase()
      result = result.filter(
        (p) =>
          p.naam.toLowerCase().includes(term) ||
          (p.klant_naam || getKlantNaam(p.klant_id)).toLowerCase().includes(term)
      )
    }

    if (statusFilter === 'met-aandacht') {
      result = result.filter(needsAttention)
    } else if (statusFilter !== 'alle') {
      result = result.filter((p) => p.status === statusFilter)
    }

    if (dagenOpenFilter !== 'alle') {
      result = result.filter((p) => {
        const dagen = getDagenOpen(p)
        if (dagen === null) return false
        switch (dagenOpenFilter) {
          case '<7': return dagen < 7
          case '7-14': return dagen >= 7 && dagen <= 14
          case '14-30': return dagen >= 14 && dagen <= 30
          case '30-90': return dagen >= 30 && dagen <= 90
          case '>90': return dagen > 90
          default: return true
        }
      })
    }

    const STATUS_GROUP_ORDER: string[] = ['actief', 'in-review', 'te-plannen', 'gepland', 'te-factureren', 'gefactureerd', 'on-hold', 'afgerond']
    const groupKey = (p: Project): string => {
      if (groupBy === 'status') return p.status
      if (groupBy === 'klant') return (p.klant_naam || getKlantNaam(p.klant_id) || '·').toLowerCase()
      return ''
    }
    const groupRank = (p: Project): number => {
      if (groupBy !== 'status') return 0
      const idx = STATUS_GROUP_ORDER.indexOf(p.status)
      return idx === -1 ? 999 : idx
    }

    result.sort((a, b) => {
      if (groupBy !== 'none') {
        if (groupBy === 'status') {
          const r = groupRank(a) - groupRank(b)
          if (r !== 0) return r
        } else {
          const k = groupKey(a).localeCompare(groupKey(b), 'nl')
          if (k !== 0) return k
        }
      }
      let cmp = 0
      switch (sortField) {
        case 'naam':
          cmp = a.naam.localeCompare(b.naam, 'nl')
          break
        case 'bedrag':
          cmp = getProjectBedrag(a.id) - getProjectBedrag(b.id)
          break
        case 'created_at': {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
          cmp = aTime - bTime
          break
        }
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [projecten, klanten, offertes, zoekterm, statusFilter, dagenOpenFilter, sortField, sortDir, groupBy])

  // Reset paginanummer als de gebruiker filtert. Skip de allereerste render
  // zodat een via de URL hersteld pagina-nummer (?page=N) niet meteen
  // teruggezet wordt naar 1.
  const filterResetSkippedRef = useRef(false)
  useEffect(() => {
    if (!filterResetSkippedRef.current) {
      filterResetSkippedRef.current = true
      return
    }
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoekterm, statusFilter, dagenOpenFilter, sortField, sortDir, groupBy])

  function projectGroupKey(p: Project): string {
    if (groupBy === 'status') return p.status
    if (groupBy === 'klant') return p.klant_naam || getKlantNaam(p.klant_id) || '·'
    return ''
  }
  function projectGroupLabel(key: string): string {
    if (groupBy === 'status') return statusLabels[key] || key
    return key
  }

  const totalPages = Math.ceil(gefilterdeProjecten.length / PAGE_SIZE)
  const paginatedProjecten = useMemo(
    () => gefilterdeProjecten.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [gefilterdeProjecten, currentPage]
  )

  function handleSort(field: typeof sortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'naam' ? 'asc' : 'desc')
    }
  }

  async function handleStatusChange(projectId: string, newStatus: Project['status']) {
    const oudeStatus = projecten.find(p => p.id === projectId)?.status
    const ok = await runOptimistic({
      snapshot: projecten,
      apply: (prev) => prev.map((p) => p.id === projectId ? { ...p, status: newStatus } : p),
      commit: async () => {
        const updated = await updateProject(projectId, { status: newStatus })
        return (prev: Project[]) => prev.map((p) => p.id === updated.id ? updated : p)
      },
      errorMessage: 'Kon status niet wijzigen',
    })
    if (!ok) {
      logger.error('Fout bij statuswijziging')
      return
    }
    if (user?.id && oudeStatus) {
      const naam = medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? ''
      logWijziging({ userId: user.id, entityType: 'project', entityId: projectId, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: oudeStatus, nieuweWaarde: newStatus })
    }
    toast.success(`Status gewijzigd naar ${statusLabels[newStatus]}`)
  }

  async function handleDatumChange(projectId: string, nieuweDatum: string) {
    const oudeDatum = projecten.find(p => p.id === projectId)?.created_at
    if (!oudeDatum || oudeDatum.startsWith(nieuweDatum)) return
    const ok = await runOptimistic({
      snapshot: projecten,
      apply: (prev) => prev.map((p) => p.id === projectId ? { ...p, created_at: nieuweDatum } : p),
      commit: async () => {
        const updated = await updateProject(projectId, { created_at: nieuweDatum })
        return (prev: Project[]) => prev.map((p) => p.id === updated.id ? updated : p)
      },
      errorMessage: 'Kon datum niet wijzigen',
    })
    if (!ok) {
      logger.error('Fout bij datumwijziging')
      return
    }
    if (user?.id) {
      const naam = medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? ''
      logWijziging({ userId: user.id, entityType: 'project', entityId: projectId, actie: 'datum_gewijzigd', medewerkerNaam: naam, veld: 'created_at', oudeWaarde: oudeDatum, nieuweWaarde: nieuweDatum })
    }
    toast.success('Datum gewijzigd')
  }

  function toggleSelectAll() {
    if (selectedIds.size === gefilterdeProjecten.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(gefilterdeProjecten.map((p) => p.id)))
    }
  }

  async function handleBulkStatusChange(newStatus: Project['status']) {
    if (selectedIds.size === 0) return
    const ids = [...selectedIds]
    const idSet = new Set(ids)
    const naam = user?.id
      ? (medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? '')
      : ''
    const oudeStatusById = new Map(
      ids.map(id => [id, projecten.find(p => p.id === id)?.status])
    )
    const ok = await runOptimistic({
      snapshot: projecten,
      apply: (prev) => prev.map((p) => idSet.has(p.id) ? { ...p, status: newStatus } : p),
      commit: async () => {
        const updates = await Promise.all(ids.map((id) => updateProject(id, { status: newStatus })))
        const byId = new Map(updates.map((u) => [u.id, u]))
        return (prev: Project[]) => prev.map((p) => byId.get(p.id) ?? p)
      },
      errorMessage: 'Kon status niet wijzigen',
    })
    if (!ok) {
      logger.error('Fout bij bulk statuswijziging')
      return
    }
    if (user?.id) {
      for (const id of ids) {
        const oudeStatus = oudeStatusById.get(id)
        if (oudeStatus) {
          logWijziging({ userId: user.id, entityType: 'project', entityId: id, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: oudeStatus, nieuweWaarde: newStatus })
        }
      }
    }
    toast.success(`${ids.length} project${ids.length === 1 ? '' : 'en'} gewijzigd naar ${statusLabels[newStatus]}`)
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    const ids = [...selectedIds]
    const results = await Promise.allSettled(ids.map((id) => deleteProject(id)))
    const succeeded = ids.filter((_, i) => results[i].status === 'fulfilled')
    const failed = ids.filter((_, i) => results[i].status === 'rejected')
    if (succeeded.length > 0) {
      const deletedSet = new Set(succeeded)
      setProjecten((prev) => prev.filter((p) => !deletedSet.has(p.id)))
      toast.success(`${succeeded.length} project${succeeded.length === 1 ? '' : 'en'} verwijderd`)
    }
    if (failed.length > 0) {
      const namen = failed.map(id => projecten.find(p => p.id === id)?.naam || id).slice(0, 3).join(', ')
      toast.error(`${failed.length} project${failed.length === 1 ? '' : 'en'} niet verwijderd (nog gekoppelde offertes/werkbonnen)${failed.length > 3 ? '...' : `: ${namen}`}`)
    }
    setSelectedIds(new Set())
    setBulkDeleteDialogOpen(false)
  }

  const stats = useMemo(() => {
    const actief = projecten.filter((p) => p.status === 'actief').length
    const teFactureren = projecten.filter((p) => p.status === 'te-factureren').length
    const afgerond = projecten.filter((p) => p.status === 'afgerond').length
    const metAandacht = projecten.filter(needsAttention).length
    return { actief, teFactureren, afgerond, metAandacht }
  }, [projecten])

  if (isLoading) {
    return (
      <div className="h-full flex flex-col -m-3 sm:-m-4 md:-m-6">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-4 py-4 md:px-8 md:py-8 space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-4">
                  <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-foreground">
                    Projecten<span className="text-[#F15025]">.</span>
                  </h1>
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="hidden md:block h-10 w-28 rounded-xl" />
                  <Skeleton className="h-10 w-36 rounded-xl" />
                </div>
              </div>
              {/* Stats badges row — fixed height to prevent shift */}
              <div className="flex items-center gap-2 flex-wrap min-h-[28px]">
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-24 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            </div>
            {/* Toolbar card */}
            <div className="bg-card rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] space-y-4">
              <div className="flex items-center gap-5">
                <Skeleton className="h-9 w-[280px] rounded-lg" />
                <div className="hidden sm:flex items-center gap-1 ml-auto">
                  <Skeleton className="h-8 w-16 rounded-lg" />
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-16 rounded-lg" />
                ))}
              </div>
            </div>
            {/* Table — match desktop row layout */}
            <div className="hidden md:block bg-card rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
            {/* Mobile card stack */}
            <div className="md:hidden space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Skeleton className="h-4 w-3/5" />
                      <Skeleton className="h-3 w-2/5" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /** Status bg tint for inline chip */
  const statusBg: Record<string, string> = {
    gepland: '#F5F2E8',
    'te-plannen': '#F5F2E8',
    actief: '#E8EEF9',
    'in-review': '#E8EEF9',
    'te-factureren': '#E8F2EC',
    gefactureerd: '#E8F2EC',
    afgerond: '#E8F2EC',
    opgeleverd: '#E8F2EC',
    'on-hold': '#F0EFEC',
  }

  return (
    <div className="h-full flex flex-col -m-3 sm:-m-4 md:-m-6">
      {/* Inline keyframes for pulse + stagger + hover glow */}
      <style>{`
        @keyframes doen-pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }
        @keyframes doen-fade-up { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes doen-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        .doen-pulse { animation: doen-pulse 2.5s ease-in-out infinite }
        .doen-row { animation: doen-fade-up .35s cubic-bezier(.22,1,.36,1) both }
      `}</style>

      {/* Hidden photo input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleQuickPhotoUpload(e.target.files)
          }
          e.target.value = ''
        }}
      />

      {/* Page content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 py-4 md:px-8 md:py-8 space-y-6">

          {/* Header + Stats */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-4">
                <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-foreground">
                  Projecten<span className="text-[#F15025]">.</span>
                </h1>
                <span className="text-[13px] text-muted-foreground font-mono tabular-nums">
                  {gefilterdeProjecten.length === projecten.length ? (
                    <span className="font-medium text-foreground/70">{projecten.length}</span>
                  ) : (
                    <>
                      <span className="font-medium text-foreground/70">{gefilterdeProjecten.length}</span>
                      <span className="text-muted-foreground/70">/</span>{projecten.length}
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="hidden md:inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground/70 hover:text-foreground hover:bg-black/[0.04] px-2.5 py-1.5 rounded-md transition-all duration-200"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importeer
                </button>
                <Link
                  to="/projecten/nieuw"
                  className="inline-flex items-center gap-2 bg-[#F15025] text-white px-3 md:pl-4 md:pr-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35),0_0_0_1px_rgba(241,80,37,0.15)] hover:-translate-y-[1px] active:translate-y-0 active:bg-[#D03A18] transition-all duration-200"
                >
                  <Plus className="w-4 h-4 opacity-80" />
                  <span className="hidden md:inline">Nieuw project</span>
                </Link>
              </div>
            </div>

            {/* KPI tiles — triage entry-points, clickable filter targets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {([
                { key: 'met-aandacht',  label: 'Met aandacht',  sub: 'in-review of >30d open',  count: stats.metAandacht,   Icon: PhWarningCircle },
                { key: 'actief',        label: 'Actief',        sub: 'in uitvoering',           count: stats.actief,        Icon: PhPulse         },
                { key: 'te-factureren', label: 'Te factureren', sub: 'wachten op factuur',      count: stats.teFactureren,  Icon: PhReceipt       },
                { key: 'afgerond',      label: 'Afgerond',      sub: 'klaar.',                  count: stats.afgerond,      Icon: PhCheckCircle   },
              ] as const).map(tile => {
                const isActive = statusFilter === tile.key
                const TileIcon = tile.Icon
                return (
                  <button
                    key={tile.key}
                    type="button"
                    onClick={() => setStatusFilter(isActive ? 'alle' : tile.key)}
                    className="group relative rounded-xl px-5 py-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F15025]/30 focus-visible:ring-offset-2"
                    style={{
                      backgroundImage: 'radial-gradient(ellipse 65% 50% at 0% 0%, rgba(26,83,92,0.06), transparent 70%), radial-gradient(ellipse 85% 65% at 100% 100%, rgba(241,80,37,0.06), transparent 65%)',
                      border: isActive ? '1px solid rgba(26,83,92,0.22)' : '1px solid rgba(26,83,92,0.08)',
                      boxShadow: isActive
                        ? '0 1px 2px rgba(20,62,71,0.04), 0 8px 24px rgba(20,62,71,0.06)'
                        : '0 1px 2px rgba(20,62,71,0.04), 0 8px 24px rgba(20,62,71,0.025)',
                    }}
                    aria-pressed={isActive}
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <span className="inline-flex items-center gap-2">
                        <span className={cn('doen-duo-icon flex-shrink-0', tile.key === 'actief' && 'doen-pulse')}>
                          <TileIcon size={18} weight="duotone" />
                        </span>
                        <span className="font-heading text-[14px] font-bold text-foreground">
                          {tile.label}<span className="text-[#F15025]">.</span>
                        </span>
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-heading font-bold text-[28px] leading-none text-foreground tabular-nums">
                        {tile.count}
                      </span>
                      <span
                        className="text-[13px] text-muted-foreground truncate"
                        style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
                      >
                        · {tile.sub}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Toolbar card — search, filters, export in one slate surface */}
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundImage: 'radial-gradient(ellipse 65% 50% at 0% 0%, rgba(26,83,92,0.06), transparent 70%), radial-gradient(ellipse 85% 65% at 100% 100%, rgba(241,80,37,0.06), transparent 65%)',
              border: '1px solid rgba(26,83,92,0.08)',
              boxShadow: '0 1px 2px rgba(20,62,71,0.04), 0 8px 24px rgba(20,62,71,0.025)',
            }}
          >
            <div className="flex items-center gap-5">
              {/* Search with keyboard hint */}
              <div className="relative max-w-[280px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={zoekInputRef}
                  type="text"
                  placeholder="Zoek project of klant..."
                  value={zoekterm}
                  onChange={(e) => setZoekterm(e.target.value)}
                  className="w-full pl-9 pr-12 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/10 transition-all"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border">/</kbd>
              </div>

              {/* Export buttons */}
              <div className="hidden sm:flex items-center gap-1 ml-auto">
                <button
                  onClick={() => {
                    const headers = ['Project', 'Klant', 'Status', 'Prioriteit', 'Bedrag', 'Startdatum']
                    const rows = gefilterdeProjecten.map((p) => ({
                      Project: p.naam,
                      Klant: p.klant_naam || getKlantNaam(p.klant_id),
                      Status: statusLabels[p.status] || p.status,
                      Prioriteit: p.prioriteit,
                      Bedrag: formatCurrency(getProjectBedrag(p.id)),
                      Startdatum: formatDate(p.start_datum ?? ""),
                    }))
                    exportCSV(`projecten-${new Date().toISOString().split('T')[0]}`, headers, rows)
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background px-3 py-2 rounded-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={() => {
                    const headers = ['Project', 'Klant', 'Status', 'Prioriteit', 'Bedrag', 'Startdatum']
                    const rows = gefilterdeProjecten.map((p) => ({
                      Project: p.naam,
                      Klant: p.klant_naam || getKlantNaam(p.klant_id),
                      Status: statusLabels[p.status] || p.status,
                      Prioriteit: p.prioriteit,
                      Bedrag: getProjectBedrag(p.id),
                      Startdatum: formatDate(p.start_datum ?? ""),
                    }))
                    exportExcel(`projecten-${new Date().toISOString().split('T')[0]}`, headers, rows, 'Projecten')
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background px-3 py-2 rounded-lg transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Excel
                </button>
              </div>
            </div>

            {/* Filters — primary status tabs, secondary age sub-filter */}
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              {/* Status tabs (primary) */}
              <div className="flex items-center gap-1 flex-nowrap md:flex-wrap overflow-x-auto">
                {statusOpties.map((optie) => {
                  const count = optie.value === 'alle'
                    ? projecten.length
                    : projecten.filter((p) => p.status === optie.value).length
                  if (optie.value !== 'alle' && count === 0) return null
                  const isActive = statusFilter === optie.value
                  return (
                    <button
                      key={optie.value}
                      onClick={() => setStatusFilter(optie.value)}
                      className={cn(
                        'relative px-3 py-1.5 rounded-lg text-[13px] transition-all duration-150',
                        isActive
                          ? 'font-semibold text-[#1A535C] bg-[#1A535C]/[0.07]'
                          : 'text-muted-foreground hover:text-foreground/70 hover:bg-background'
                      )}
                    >
                      {optie.label}
                      {count > 0 && <span className="ml-1 font-mono text-[11px] opacity-40">{count}</span>}
                      {isActive && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#1A535C] rounded-full" />}
                    </button>
                  )
                })}
              </div>

              {/* Sub-filters — open sinds + groep */}
              <div className="hidden lg:flex items-center gap-5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[12px] text-muted-foreground mr-1"
                    style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
                  >
                    open sinds ·
                  </span>
                  {([
                    { value: 'alle', label: 'alles' },
                    { value: '<7', label: '<7d' },
                    { value: '7-14', label: '7-14d' },
                    { value: '14-30', label: '14-30d' },
                    { value: '30-90', label: '30-90d' },
                    { value: '>90', label: '>90d' },
                  ] as const).map((optie) => {
                    const isActive = dagenOpenFilter === optie.value
                    return (
                      <button
                        key={optie.value}
                        onClick={() => setDagenOpenFilter(optie.value)}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors',
                          isActive
                            ? 'text-[#1A535C] font-bold'
                            : 'text-muted-foreground/80 hover:text-foreground/70'
                        )}
                      >
                        {optie.label}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span
                    className="text-[12px] text-muted-foreground mr-1"
                    style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
                  >
                    groep ·
                  </span>
                  {([
                    { value: 'none', label: 'geen' },
                    { value: 'status', label: 'status' },
                    { value: 'klant', label: 'klant' },
                  ] as const).map((optie) => {
                    const isActive = groupBy === optie.value
                    return (
                      <button
                        key={optie.value}
                        onClick={() => setGroupBy(optie.value)}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors',
                          isActive
                            ? 'text-[#1A535C] font-bold'
                            : 'text-muted-foreground/80 hover:text-foreground/70'
                        )}
                      >
                        {optie.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-4 px-5 py-3 bg-[#1A535C]/[0.06] rounded-xl ring-1 ring-[#1A535C]/10">
              <span className="text-sm text-foreground font-medium">
                <span className="font-mono font-bold text-[#1A535C]">{selectedIds.size}</span> geselecteerd
              </span>
              <button
                onClick={toggleSelectAll}
                className="text-xs font-medium text-[#1A535C] hover:underline transition-colors"
              >
                {selectedIds.size === gefilterdeProjecten.length ? 'Deselecteer alles' : 'Selecteer alles'}
              </button>
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A535C] bg-card px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all">
                    Status wijzigen
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {statusOpties.filter(s => s.value !== 'alle').map((s) => (
                    <DropdownMenuItem
                      key={s.value}
                      onClick={() => handleBulkStatusChange(s.value as Project['status'])}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getStatusDotColor(s.value))} />
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => setBulkDeleteDialogOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C03A18] bg-card px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all"
              >
                <Trash2 className="w-3 h-3" />
                Verwijderen
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-card/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Table */}
          {gefilterdeProjecten.length === 0 ? (
            <div
              className="py-20 text-center rounded-2xl"
              style={{
                backgroundImage: 'radial-gradient(ellipse 65% 50% at 0% 0%, rgba(26,83,92,0.06), transparent 70%), radial-gradient(ellipse 85% 65% at 100% 100%, rgba(241,80,37,0.06), transparent 65%)',
                border: '1px solid rgba(26,83,92,0.08)',
                boxShadow: '0 1px 2px rgba(20,62,71,0.04), 0 8px 24px rgba(20,62,71,0.025)',
              }}
            >
              <EmptyState
                module="projecten"
                title="Nog geen projecten"
                description={zoekterm || statusFilter !== 'alle'
                  ? 'Pas je filters aan of maak een nieuw project aan.'
                  : 'Start je eerste project en houd alles bij.'}
                action={
                  <Link
                    to="/projecten/nieuw"
                    className="inline-flex items-center gap-2 bg-[#F15025] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:bg-[#E04520] hover:-translate-y-[1px] active:translate-y-0 transition-all mt-4"
                  >
                    <Plus className="w-4 h-4 opacity-80" />
                    Nieuw project
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              {/* Mobile view */}
              <div className="md:hidden space-y-2">
                {paginatedProjecten.map((project, i) => {
                  const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
                  const bedrag = getProjectBedrag(project.id)
                  return (
                    <div
                      key={`mobile-${project.id}`}
                      onClick={() => navigateWithTab({ path: `/projecten/${project.id}`, label: project.naam || 'Project', id: `/projecten/${project.id}` })}
                      className="doen-row rounded-xl p-4 cursor-pointer active:scale-[0.99] transition-all"
                      style={{
                        animationDelay: `${i * 30}ms`,
                        backgroundImage: 'radial-gradient(ellipse 65% 50% at 0% 0%, rgba(26,83,92,0.06), transparent 70%), radial-gradient(ellipse 85% 65% at 100% 100%, rgba(241,80,37,0.06), transparent 65%)',
                        border: `1px solid rgba(26,83,92,0.08)`,
                        boxShadow: `0 1px 2px rgba(20,62,71,0.04), 0 8px 24px rgba(20,62,71,0.025), inset 3px 0 0 0 ${statusHex(project.status)}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-foreground truncate">{project.naam}</p>
                          {klantNaam && <p className="text-xs text-muted-foreground mt-0.5 truncate">{klantNaam}</p>}
                        </div>
                        <span
                          className="text-xs font-semibold flex-shrink-0 px-2.5 py-1 rounded-full"
                          style={{ color: getStatusTextColor(project.status), backgroundColor: statusBg[project.status] || 'hsl(var(--muted))' }}
                        >
                          {statusLabels[project.status] || project.status}<span className="text-[#F15025]">.</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono">{project.project_nummer || ''}</span>
                        <div className="flex items-center gap-3">
                          {(() => {
                            const dagen = getDagenOpen(project)
                            if (dagen === null) return null
                            const color = dagen > 90 ? '#C03A18' : dagen > 30 ? '#F15025' : '#9B9B95'
                            return <span className="font-mono text-[11px] font-medium" style={{ color }}>{dagen}d</span>
                          })()}
                          {bedrag > 0 && (
                            <span className="font-mono font-medium text-foreground">{formatCurrency(bedrag)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table — slate surface, clip-path for rounded corners without breaking sticky */}
              <div
                className="hidden md:block rounded-2xl"
                style={{
                  backgroundImage: 'radial-gradient(ellipse 65% 50% at 0% 0%, rgba(26,83,92,0.06), transparent 70%), radial-gradient(ellipse 85% 65% at 100% 100%, rgba(241,80,37,0.06), transparent 65%)',
                  border: '1px solid rgba(26,83,92,0.08)',
                  boxShadow: '0 1px 2px rgba(20,62,71,0.04), 0 8px 24px rgba(20,62,71,0.025)',
                  clipPath: 'inset(0 round 16px)',
                }}
              >
                <table className="w-full">
                  <thead className="sticky top-0 z-10" style={{ backgroundColor: 'hsl(var(--card))', backdropFilter: 'blur(4px)' }}>
                    <tr className="border-b-2 border-border">
                      <th className="py-3.5 pl-5 pr-3 w-10 text-left">
                        <Checkbox
                          checked={selectedIds.size > 0 && selectedIds.size === gefilterdeProjecten.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Selecteer alle projecten"
                        />
                      </th>
                      {leadColumns.flatMap((col, idx) => {
                        const cell = col === 'project' ? (
                          <th
                            key="project"
                            className="text-left py-3.5 pr-2 cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={() => { dragColRef.current = 'project' }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (dragColRef.current && dragColRef.current !== 'project') {
                                setLeadColumns((prev) => [prev[1], prev[0]])
                              }
                              dragColRef.current = null
                            }}
                          >
                            <button
                              onClick={() => handleSort('naam')}
                              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground/70 transition-colors"
                            >
                              Project
                              {sortField === 'naam' ? (
                                sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </button>
                          </th>
                        ) : (
                          <th
                            key="klant"
                            className="text-left py-3.5 pr-4 w-[160px] hidden lg:table-cell cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={() => { dragColRef.current = 'klant' }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (dragColRef.current && dragColRef.current !== 'klant') {
                                setLeadColumns((prev) => [prev[1], prev[0]])
                              }
                              dragColRef.current = null
                            }}
                          >
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Klant</span>
                          </th>
                        )
                        if (idx === 0) {
                          return [cell, (
                            <th key="actions" className="w-[52px] py-3.5 px-0" />
                          )]
                        }
                        return [cell]
                      })}
                      <th className="text-left py-3.5 pr-4 w-[150px]">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Status</span>
                      </th>
                      <th className="text-right py-3.5 pr-4 w-[110px] hidden xl:table-cell">
                        <button
                          onClick={() => handleSort('bedrag')}
                          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground/70 transition-colors ml-auto"
                        >
                          Bedrag
                          {sortField === 'bedrag' ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="text-right py-3.5 pr-4 w-[80px] hidden lg:table-cell">
                        <button
                          onClick={() => handleSort('created_at')}
                          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground/70 transition-colors ml-auto"
                        >
                          Datum
                          {sortField === 'created_at' ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="text-left py-3.5 pr-4 w-[120px] hidden xl:table-cell">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Team</span>
                      </th>
                      <th className="py-3.5 pr-5 w-[44px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProjecten.map((project, i) => {
                      const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
                      const contactpersoon = getKlantContactpersoon(project.klant_id)
                      const isGrouped = groupBy !== 'none'
                      const currentGroupKey = isGrouped ? projectGroupKey(project) : ''
                      const showGroupHeader = isGrouped && (i === 0 || projectGroupKey(paginatedProjecten[i - 1]) !== currentGroupKey)
                      const groupCount = showGroupHeader
                        ? gefilterdeProjecten.filter((p) => projectGroupKey(p) === currentGroupKey).length
                        : 0

                      return (
                        <React.Fragment key={project.id}>
                          {showGroupHeader && (
                            <tr>
                              <td colSpan={9} className="py-2.5 pl-5 pr-5 bg-[#F0F3F4]/60 border-b border-[#E5EAEC]">
                                <span className="inline-flex items-baseline gap-2">
                                  <span className="font-heading text-[12px] font-bold text-[#3A6770] uppercase tracking-wider">
                                    {projectGroupLabel(currentGroupKey)}
                                  </span>
                                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{groupCount}</span>
                                </span>
                              </td>
                            </tr>
                          )}
                        <tr
                          className={cn(
                            'doen-row border-b border-border last:border-0 cursor-pointer transition-all duration-200 group',
                            needsAttention(project) && !selectedIds.has(project.id) && 'bg-[rgba(241,80,37,0.025)]',
                            'hover:bg-background',
                            selectedIds.has(project.id) && 'bg-[#1A535C]/[0.03]'
                          )}
                          style={{ animationDelay: `${i * 25}ms` }}
                          onClick={() => navigateWithTab({ path: `/projecten/${project.id}`, label: project.naam || 'Project', id: `/projecten/${project.id}` })}
                        >
                          {/* Checkbox + left-edge status stripe */}
                          <td
                            className="py-3.5 pl-5 pr-3 align-middle"
                            style={{ boxShadow: `inset 3px 0 0 0 ${statusHex(project.status)}` }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedIds.has(project.id)}
                              onCheckedChange={() => toggleProjectSelection(project.id)}
                              aria-label={`Selecteer ${project.naam}`}
                            />
                          </td>

                          {leadColumns.flatMap((col, idx) => {
                            const cell = col === 'project' ? (
                              <td key="project" className="py-3.5 pr-2">
                                <div className="min-w-0">
                                  <div className="flex items-baseline gap-2.5">
                                    <Link
                                      to={`/projecten/${project.id}`}
                                      className="text-[15px] font-semibold text-foreground group-hover:text-[#1A535C] underline-offset-2 decoration-transparent group-hover:decoration-[#1A535C]/20 underline transition-all truncate"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {project.naam}
                                    </Link>
                                    {project.project_nummer && (
                                      <span className="text-[11px] text-muted-foreground/70 font-mono flex-shrink-0 tabular-nums">{project.project_nummer}</span>
                                    )}
                                  </div>
                                  {project.beschrijving && (
                                    <p className="text-[11px] text-muted-foreground/70 truncate max-w-[320px] mt-0.5">
                                      {project.beschrijving}
                                    </p>
                                  )}
                                </div>
                              </td>
                            ) : (
                              <td key="klant" className="py-3.5 pr-4 hidden lg:table-cell">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {(() => {
                                    const c = klantNaam.charCodeAt(0) % 5
                                    const avatarColors = [
                                      'bg-[#E8F2EC] text-[#3A7D52]',
                                      'bg-[#E8EEF9] text-[#3A5A9A]',
                                      'bg-[#F5F2E8] text-[#8A7A4A]',
                                      'bg-muted text-foreground/70',
                                      'bg-[#EDE8F4] text-[#6A5A8A]',
                                    ]
                                    return (
                                      <span className={cn('flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold uppercase select-none', avatarColors[c])}>
                                        {klantNaam.charAt(0)}
                                      </span>
                                    )
                                  })()}
                                  <div className="min-w-0">
                                    <span className="text-[13px] text-foreground/80 truncate block leading-tight">{klantNaam}</span>
                                    {(project.vestiging_naam || contactpersoon) && (
                                      <span className="text-[11px] text-muted-foreground/70 truncate block">
                                        {project.vestiging_naam || contactpersoon}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            )
                            if (idx === 0) return [cell, (
                              <td key="actions" className="py-3.5 px-0 align-middle" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setPhotoUploadProjectId(project.id)
                                      setPhotoUploadKlantId(project.klant_id)
                                      photoInputRef.current?.click()
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
                                    title="Foto's toevoegen"
                                  >
                                    <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setQuickTaakProjectId(project.id)
                                      setTimeout(() => quickTaakInputRef.current?.focus(), 100)
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
                                    title="Taak toevoegen"
                                  >
                                    <ListPlus className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 rounded-lg hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
                                      >
                                        <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-48">
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          navigateWithTab({ path: `/projecten/${project.id}`, label: project.naam || 'Project', id: `/projecten/${project.id}` })
                                        }}
                                      >
                                        <Eye className="w-3.5 h-3.5 mr-2" />
                                        Bekijken
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          navigateWithTab({ path: `/projecten/nieuw?kopie=${project.id}`, label: `${project.naam} kopie`, id: `/projecten/nieuw?kopie=${project.id}` })
                                        }}
                                      >
                                        <Copy className="w-3.5 h-3.5 mr-2" />
                                        Dupliceren
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setPhotoUploadProjectId(project.id)
                                          setPhotoUploadKlantId(project.klant_id)
                                          photoInputRef.current?.click()
                                        }}
                                      >
                                        <Camera className="w-3.5 h-3.5 mr-2" />
                                        Foto's toevoegen
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setQuickTaakProjectId(project.id)
                                          setTimeout(() => quickTaakInputRef.current?.focus(), 100)
                                        }}
                                      >
                                        <ListPlus className="w-3.5 h-3.5 mr-2" />
                                        Taak toevoegen
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleStatusChange(project.id, 'afgerond')
                                        }}
                                      >
                                        <Archive className="w-3.5 h-3.5 mr-2" />
                                        Archiveren
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            )]
                            return [cell]
                          })}

                          {/* Status — colored dot + label, no pill bg */}
                          <td className="py-3.5 pr-4" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-left group/status inline-flex items-center gap-2 hover:bg-muted/60 rounded-md px-1.5 py-1 -mx-1.5 -my-1 transition-colors">
                                  <span
                                    className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', project.status === 'actief' && 'doen-pulse')}
                                    style={{ backgroundColor: statusHex(project.status) }}
                                  />
                                  <span
                                    className="text-[13px] font-medium"
                                    style={{ color: getStatusTextColor(project.status) }}
                                  >
                                    {statusLabels[project.status] || project.status}<span className="text-[#F15025]">.</span>
                                  </span>
                                  <ChevronDown className="w-3 h-3 text-muted-foreground/70 opacity-0 group-hover/status:opacity-100 transition-opacity" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-44">
                                {(() => {
                                  const all = statusOpties.filter(s => s.value !== 'alle')
                                  const current = project.status
                                  const next = STATUS_WORKFLOW[current] || []
                                  const ordered = [
                                    ...all.filter(s => s.value === current),
                                    ...all.filter(s => next.includes(s.value)),
                                    ...all.filter(s => s.value !== current && !next.includes(s.value)),
                                  ]
                                  return ordered.map((s, idx) => {
                                    const isCurrent = s.value === current
                                    const isSuggested = next.includes(s.value)
                                    const firstSuggestedIdx = ordered.findIndex(o => next.includes(o.value))
                                    const firstOtherIdx = ordered.findIndex((o, i) => i > 0 && !next.includes(o.value) && o.value !== current)
                                    return (
                                      <React.Fragment key={s.value}>
                                        {isSuggested && idx === firstSuggestedIdx && (
                                          <div className="px-2 pt-1.5 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                            Volgende stap
                                          </div>
                                        )}
                                        {!isSuggested && !isCurrent && firstOtherIdx === idx && (
                                          <div className="px-2 pt-1.5 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-t border-border mt-1">
                                            Andere
                                          </div>
                                        )}
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (!isCurrent) {
                                              handleStatusChange(project.id, s.value as Project['status'])
                                            }
                                          }}
                                          className={cn(
                                            'flex items-center gap-2 text-xs',
                                            isCurrent && 'font-semibold',
                                            isSuggested && 'text-foreground'
                                          )}
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusHex(s.value) }} />
                                          {s.label}
                                          {isCurrent && <CheckCircle2 className="w-3 h-3 ml-auto text-[#1A535C]" />}
                                        </DropdownMenuItem>
                                      </React.Fragment>
                                    )
                                  })
                                })()}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>

                          {/* Bedrag */}
                          <td className="py-3.5 pr-4 text-right hidden xl:table-cell">
                            {(() => {
                              const bedrag = getProjectBedrag(project.id)
                              if (bedrag <= 0) return <span className="text-xs text-muted-foreground/70">&mdash;</span>
                              const formatted = formatCurrency(bedrag)
                              return (
                                <span className={cn(
                                  'font-mono tabular-nums',
                                  bedrag >= 10000
                                    ? 'text-[15px] font-bold text-foreground'
                                    : 'text-sm text-foreground/80'
                                )}>
                                  {formatted}
                                </span>
                              )
                            })()}
                          </td>

                          {/* Datum */}
                          <td className="py-3.5 pr-4 text-right hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                            <DatePicker
                              value={project.created_at}
                              onChange={(d) => handleDatumChange(project.id, d)}
                              align="end"
                              trigger={
                                <button className="text-[12px] font-mono tabular-nums text-muted-foreground/80 hover:text-foreground/70 transition-colors">
                                  {new Date(project.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).replace('.', '')}
                                </button>
                              }
                            />
                          </td>

                          {/* Team */}
                          <td className="py-3.5 pr-4 hidden xl:table-cell" onClick={(e) => e.stopPropagation()}>
                            <MedewerkerSelector
                              mode="multi"
                              medewerkers={medewerkers}
                              value={project.team_leden || []}
                              onChange={(next) => setTeamLeden(project.id, next)}
                              trigger="avatar-stack"
                              placeholder="Team toewijzen"
                              popoverAlign="start"
                            />
                          </td>

                          {/* Delete — hover-only */}
                          <td className="py-3.5 pr-5 align-middle" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteProject(project)}
                              className="h-7 w-7 rounded-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground/70 hover:bg-[#FDE8E4] hover:text-[#C03A18]"
                              title="Project verwijderen"
                              aria-label={`Verwijder ${project.naam || 'project'}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>

                        </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Paginatie */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={gefilterdeProjecten.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />

        </div>
      </div>

      <ProjectImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={fetchData}
      />

      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Projecten verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je {selectedIds.size} project{selectedIds.size === 1 ? '' : 'en'} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!quickTaakProjectId} onOpenChange={(open) => { if (!open) { setQuickTaakProjectId(null); setQuickTaakTitel(''); setQuickTaakToegewezen(''); setQuickTaakDeadline('') } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListPlus className="w-4 h-4 text-[#1A535C]" />
              Snelle taak
            </DialogTitle>
            <DialogDescription>
              {projecten.find((p) => p.id === quickTaakProjectId)?.naam}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleQuickTaakSubmit() }}
            className="space-y-3"
          >
            <input
              ref={quickTaakInputRef}
              type="text"
              placeholder="Wat moet er gebeuren?"
              value={quickTaakTitel}
              onChange={(e) => setQuickTaakTitel(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/10 transition-all"
              autoFocus
            />
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Deadline</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={quickTaakDeadline}
                  onChange={(e) => setQuickTaakDeadline(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/10 transition-all"
                />
                <div className="flex gap-1">
                  {[
                    { label: 'Vandaag', days: 0 },
                    { label: 'Morgen', days: 1 },
                    { label: '+7d', days: 7 },
                  ].map(({ label, days }) => {
                    const d = new Date(); d.setDate(d.getDate() + days)
                    const val = d.toISOString().split('T')[0]
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setQuickTaakDeadline(val)}
                        className={cn(
                          'px-2 py-1.5 rounded-md text-[11px] font-medium transition-all',
                          quickTaakDeadline === val
                            ? 'bg-[#1A535C]/[0.08] text-[#1A535C] font-semibold'
                            : 'bg-background text-foreground/70 hover:bg-muted'
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Toewijzen aan</label>
              <div className="flex flex-wrap gap-1.5">
                {medewerkers.filter((m) => m.status === 'actief').map((mw) => {
                  const selected = quickTaakToegewezen === mw.naam
                  const c = mw.naam.charCodeAt(0) % 5
                  const colors = [
                    'bg-[#E8F2EC] text-[#3A7D52]',
                    'bg-[#E8EEF9] text-[#3A5A9A]',
                    'bg-[#F5F2E8] text-[#8A7A4A]',
                    'bg-muted text-foreground/70',
                    'bg-[#EDE8F4] text-[#6A5A8A]',
                  ]
                  return (
                    <button
                      key={mw.id}
                      type="button"
                      onClick={() => setQuickTaakToegewezen(selected ? '' : mw.naam)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all border',
                        selected
                          ? 'border-[#1A535C] bg-[#1A535C]/[0.08] text-[#1A535C]'
                          : 'border-transparent bg-background text-foreground/70 hover:bg-muted'
                      )}
                    >
                      <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold uppercase flex-shrink-0', colors[c])}>
                        {mw.naam.charAt(0)}
                      </span>
                      {mw.naam.split(' ')[0]}
                    </button>
                  )
                })}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setQuickTaakProjectId(null); setQuickTaakTitel(''); setQuickTaakToegewezen(''); setQuickTaakDeadline('') }}>
                Annuleren
              </Button>
              <Button type="submit" disabled={!quickTaakTitel.trim() || quickTaakSaving}>
                {quickTaakSaving ? 'Opslaan...' : 'Toevoegen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
