import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { getFase } from '@/utils/projectFases'
import { Checkbox } from '@/components/ui/checkbox'
import {
  cn,
  formatDate,
  formatCurrency,
} from '@/lib/utils'
import { exportCSV, exportExcel } from '@/lib/export'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { getProjecten, getKlanten, getOffertes, updateProject, createProjectFoto } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Project, Klant, Offerte } from '@/types'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import { SkeletonTable } from '@/components/ui/skeleton'

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
  const [sortField, setSortField] = useState<'naam' | 'bedrag' | 'start_datum'>('start_datum')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 50
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const [photoUploadProjectId, setPhotoUploadProjectId] = useState<string | null>(null)
  const [photoUploadKlantId, setPhotoUploadKlantId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dagenOpenFilter, setDagenOpenFilter] = useState<string>('alle')

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

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        setIsLoading(true)
        const [projectenData, klantenData, offertesData] = await Promise.all([
          getProjecten(),
          getKlanten(),
          getOffertes(),
        ])
        if (!cancelled) {
          setProjecten(projectenData)
          setKlanten(klantenData)
          setOffertes(offertesData)
        }
      } catch (error) {
        logger.error('Fout bij ophalen data:', error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

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

    if (statusFilter !== 'alle') {
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

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'naam':
          cmp = a.naam.localeCompare(b.naam, 'nl')
          break
        case 'bedrag':
          cmp = getProjectBedrag(a.id) - getProjectBedrag(b.id)
          break
        case 'start_datum':
          cmp = new Date(a.start_datum || a.created_at).getTime() - new Date(b.start_datum || b.created_at).getTime()
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [projecten, klanten, offertes, zoekterm, statusFilter, dagenOpenFilter, sortField, sortDir])

  useEffect(() => { setCurrentPage(1) }, [zoekterm, statusFilter, dagenOpenFilter, sortField, sortDir])

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
    try {
      const updated = await updateProject(projectId, { status: newStatus })
      setProjecten((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      toast.success(`Status gewijzigd naar ${statusLabels[newStatus]}`)
    } catch (error) {
      logger.error('Fout bij statuswijziging:', error)
      toast.error('Kon status niet wijzigen')
    }
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
    try {
      const updates = await Promise.all(
        [...selectedIds].map((id) => updateProject(id, { status: newStatus }))
      )
      setProjecten((prev) =>
        prev.map((p) => {
          const updated = updates.find((u) => u.id === p.id)
          return updated || p
        })
      )
      toast.success(`${selectedIds.size} project${selectedIds.size === 1 ? '' : 'en'} gewijzigd naar ${statusLabels[newStatus]}`)
      setSelectedIds(new Set())
    } catch (error) {
      logger.error('Fout bij bulk statuswijziging:', error)
      toast.error('Kon status niet wijzigen')
    }
  }

  const stats = useMemo(() => {
    const actief = projecten.filter((p) => p.status === 'actief').length
    const teFactureren = projecten.filter((p) => p.status === 'te-factureren').length
    const afgerond = projecten.filter((p) => p.status === 'afgerond').length
    const overdue = projecten.filter(
      (p) => p.eind_datum && new Date(p.eind_datum ?? "") < new Date() && p.status !== 'afgerond'
    ).length
    return { actief, teFactureren, afgerond, overdue }
  }, [projecten])

  if (isLoading) {
    return <SkeletonTable rows={6} cols={4} />
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
    <div className="h-full flex flex-col bg-[#F8F7F5]">
      {/* Inline keyframes for pulse + stagger + hover glow */}
      <style>{`
        @keyframes doen-pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }
        @keyframes doen-fade-up { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes doen-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        .doen-pulse { animation: doen-pulse 2.5s ease-in-out infinite }
        .doen-row { animation: doen-fade-up .35s cubic-bezier(.22,1,.36,1) both }
        .doen-gradient-btn { background-size: 200% auto; transition: all .3s ease }
        .doen-gradient-btn:hover { background-position: right center }
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
        <div className="px-8 py-8 space-y-6 max-w-[1400px]">

          {/* Header + Stats */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-[#1A1A1A]">
                  Projecten<span className="text-[#F15025]">.</span>
                </h1>
                <p className="text-[13px] text-[#9B9B95] mt-1">
                  <span className="font-mono font-medium text-[#6B6B66]">{gefilterdeProjecten.length}</span>
                  <span className="mx-1 text-[#C0BDB8]">/</span>
                  <span className="font-mono">{projecten.length}</span>
                  <span className="ml-1.5 text-[12px]">projecten</span>
                </p>
              </div>
              <Link
                to="/projecten/nieuw"
                className="doen-gradient-btn inline-flex items-center gap-2 text-white pl-4 pr-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.2),0_1px_3px_rgba(26,83,92,0.15)] hover:shadow-[0_4px_20px_rgba(241,80,37,0.3),0_2px_8px_rgba(26,83,92,0.2)] hover:-translate-y-[1px] active:translate-y-0 active:shadow-[0_1px_4px_rgba(241,80,37,0.2)]"
                style={{ backgroundImage: 'linear-gradient(135deg, #1A535C 0%, #1A535C 40%, #F15025 100%)' }}
              >
                <Plus className="w-4 h-4" />
                Nieuw project
              </Link>
            </div>

            {/* Quick stats as glass pills */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {stats.actief > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-[#E8F2EC] text-[#2D6B48] ring-1 ring-[#2D6B48]/10">
                  <span className="w-2 h-2 rounded-full bg-[#2D6B48] doen-pulse" />
                  <span className="font-mono">{stats.actief}</span> actief
                </span>
              )}
              {stats.teFactureren > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-[#E8EEF9] text-[#3A5A9A] ring-1 ring-[#3A5A9A]/10">
                  <span className="w-2 h-2 rounded-full bg-[#3A5A9A]" />
                  <span className="font-mono">{stats.teFactureren}</span> te factureren
                </span>
              )}
              {stats.overdue > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-[#FDE8E4] text-[#C0451A] ring-1 ring-[#C0451A]/10">
                  <span className="w-2 h-2 rounded-full bg-[#F15025] doen-pulse" />
                  <span className="font-mono">{stats.overdue}</span> verlopen
                </span>
              )}
              {stats.afgerond > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-[#F5F2E8] text-[#8A7A4A] ring-1 ring-[#8A7A4A]/10">
                  <span className="w-2 h-2 rounded-full bg-[#8A7A4A]" />
                  <span className="font-mono">{stats.afgerond}</span> afgerond
                </span>
              )}
            </div>
          </div>

          {/* Toolbar card — search, filters, export in one white surface */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03]">
            <div className="flex items-center gap-5">
              {/* Search with keyboard hint */}
              <div className="relative max-w-[280px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9B95]" />
                <input
                  type="text"
                  placeholder="Zoek project of klant..."
                  value={zoekterm}
                  onChange={(e) => setZoekterm(e.target.value)}
                  className="w-full pl-9 pr-12 py-2 text-sm bg-[#F8F7F5] border border-[#EBEBEB] rounded-lg text-[#1A1A1A] placeholder:text-[#9B9B95] focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/10 transition-all"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#9B9B95] bg-[#F0EFEC] rounded border border-[#E5E4E0]">/</kbd>
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
                  className="flex items-center gap-1.5 text-xs font-medium text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] px-3 py-2 rounded-lg transition-all"
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
                  className="flex items-center gap-1.5 text-xs font-medium text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] px-3 py-2 rounded-lg transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Excel
                </button>
              </div>
            </div>

            {/* Filters row */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#F0EFEC]">
              {/* Status tabs with active indicator */}
              <div className="flex items-center gap-1 flex-wrap flex-1">
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
                          : 'text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F8F7F5]'
                      )}
                    >
                      {optie.label}
                      {count > 0 && <span className="ml-1 font-mono text-[11px] opacity-50">{count}</span>}
                    </button>
                  )
                })}
              </div>

              {/* Dagen open filter */}
              <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-[#F0EFEC]">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9B9B95]">
                  Open
                </span>
                {([
                  { value: 'alle', label: 'Alle' },
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
                        'px-2 py-1 rounded-md text-[11px] font-mono transition-all duration-150',
                        isActive
                          ? 'font-bold text-[#1A1A1A] bg-[#1A1A1A]/[0.06]'
                          : 'text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F8F7F5]'
                      )}
                    >
                      {optie.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-4 px-5 py-3 bg-[#1A535C]/[0.06] rounded-xl ring-1 ring-[#1A535C]/10">
              <span className="text-sm text-[#1A1A1A] font-medium">
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
                  <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A535C] bg-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all">
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
                onClick={() => setSelectedIds(new Set())}
                className="text-[#9B9B95] hover:text-[#1A1A1A] transition-colors p-1 rounded-md hover:bg-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Table */}
          {gefilterdeProjecten.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <EmptyState
                module="projecten"
                title="Nog geen projecten"
                description={zoekterm || statusFilter !== 'alle'
                  ? 'Pas je filters aan of maak een nieuw project aan.'
                  : 'Start je eerste project en houd alles bij.'}
                action={
                  <Link
                    to="/projecten/nieuw"
                    className="doen-gradient-btn inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.2),0_1px_3px_rgba(26,83,92,0.15)] hover:shadow-[0_4px_16px_rgba(241,80,37,0.25)] hover:-translate-y-[1px] active:translate-y-0 transition-all mt-4"
                    style={{ backgroundImage: 'linear-gradient(135deg, #1A535C 0%, #1A535C 40%, #F15025 100%)' }}
                  >
                    <Plus className="w-4 h-4" />
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
                      className="doen-row bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer active:scale-[0.99] transition-all"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-[#1A1A1A] truncate">{project.naam}</p>
                          {klantNaam && <p className="text-xs text-[#9B9B95] mt-0.5 truncate">{klantNaam}</p>}
                        </div>
                        <span
                          className="text-xs font-semibold flex-shrink-0 px-2.5 py-1 rounded-full"
                          style={{ color: getStatusTextColor(project.status), backgroundColor: statusBg[project.status] || '#F0EFEC' }}
                        >
                          {statusLabels[project.status] || project.status}<span className="text-[#F15025]">.</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#9B9B95]">
                        <span className="font-mono">{project.project_nummer || ''}</span>
                        <div className="flex items-center gap-3">
                          {(() => {
                            const dagen = getDagenOpen(project)
                            if (dagen === null) return null
                            const color = dagen > 90 ? '#C03A18' : dagen > 30 ? '#F15025' : '#9B9B95'
                            return <span className="font-mono text-[11px] font-medium" style={{ color }}>{dagen}d</span>
                          })()}
                          {bedrag > 0 && (
                            <span className="font-mono font-medium text-[#1A1A1A]">{formatCurrency(bedrag)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table in white card */}
              <div className="hidden md:block bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#F0EFEC]">
                      <th className="py-3.5 pl-5 pr-3 w-10 text-left">
                        <Checkbox
                          checked={selectedIds.size > 0 && selectedIds.size === gefilterdeProjecten.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Selecteer alle projecten"
                        />
                      </th>
                      <th className="text-left py-3.5 pr-4">
                        <button
                          onClick={() => handleSort('naam')}
                          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95] hover:text-[#6B6B66] transition-colors"
                        >
                          Project
                          {sortField === 'naam' ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="text-left py-3.5 pr-4 w-[160px] hidden lg:table-cell">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Klant</span>
                      </th>
                      <th className="text-left py-3.5 pr-4 w-[150px]">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Status</span>
                      </th>
                      <th className="text-right py-3.5 pr-4 w-[110px] hidden xl:table-cell">
                        <button
                          onClick={() => handleSort('bedrag')}
                          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95] hover:text-[#6B6B66] transition-colors ml-auto"
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
                          onClick={() => handleSort('start_datum')}
                          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95] hover:text-[#6B6B66] transition-colors ml-auto"
                        >
                          Datum
                          {sortField === 'start_datum' ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="text-right py-3.5 pr-4 w-[70px] hidden xl:table-cell">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Open</span>
                      </th>
                      <th className="w-10 py-3.5 pr-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProjecten.map((project, i) => {
                      const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
                      const contactpersoon = getKlantContactpersoon(project.klant_id)
                      const isOverdue = project.eind_datum && new Date(project.eind_datum ?? "") < new Date() && project.status !== 'afgerond'

                      return (
                        <tr
                          key={project.id}
                          className={cn(
                            'doen-row relative border-b border-[#F0EFEC] last:border-0 cursor-pointer transition-all duration-150 group',
                            'hover:bg-[#FAFAF8]',
                            selectedIds.has(project.id) && 'bg-[#1A535C]/[0.03]'
                          )}
                          style={{ animationDelay: `${i * 25}ms` }}
                          onClick={() => navigateWithTab({ path: `/projecten/${project.id}`, label: project.naam || 'Project', id: `/projecten/${project.id}` })}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 pl-5 pr-3 align-middle" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(project.id)}
                              onCheckedChange={() => toggleProjectSelection(project.id)}
                              aria-label={`Selecteer ${project.naam}`}
                            />
                          </td>

                          {/* Project naam + nummer */}
                          <td className="py-3.5 pr-4">
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-2.5">
                                <Link
                                  to={`/projecten/${project.id}`}
                                  className="text-[15px] font-semibold text-[#1A1A1A] group-hover:text-[#1A535C] transition-colors truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {project.naam}
                                </Link>
                                {project.project_nummer && (
                                  <span className="text-[10px] text-[#B0ADA8] font-mono flex-shrink-0 tabular-nums bg-[#F5F4F1] px-1.5 py-0.5 rounded">{project.project_nummer}</span>
                                )}
                              </div>
                              {project.beschrijving && (
                                <p className="text-[12px] text-[#9B9B95] truncate max-w-[320px] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  {project.beschrijving}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Klant */}
                          <td className="py-3.5 pr-4 hidden lg:table-cell">
                            <div className="min-w-0">
                              <span className="text-[13px] text-[#4A4A46] truncate block">{klantNaam}</span>
                              {(project.vestiging_naam || contactpersoon) && (
                                <span className="text-[11px] text-[#C0BDB8] truncate block mt-0.5">
                                  {project.vestiging_naam || contactpersoon}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status chip with bg tint + Flame punt */}
                          <td className="py-3.5 pr-4" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-left group/status">
                                  <span
                                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-lg transition-all group-hover/status:shadow-sm"
                                    style={{
                                      color: getStatusTextColor(project.status),
                                      backgroundColor: statusBg[project.status] || '#F0EFEC',
                                    }}
                                  >
                                    {(project.status === 'actief') && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-current doen-pulse" />
                                    )}
                                    {statusLabels[project.status] || project.status}<span className="text-[#F15025]">.</span>
                                  </span>
                                  {isOverdue && (
                                    <span className="ml-1.5 text-[11px] font-semibold text-[#C03A18]">Verlopen</span>
                                  )}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-40">
                                {statusOpties.filter(s => s.value !== 'alle').map((s) => (
                                  <DropdownMenuItem
                                    key={s.value}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (s.value !== project.status) {
                                        handleStatusChange(project.id, s.value as Project['status'])
                                      }
                                    }}
                                    className={cn(
                                      'flex items-center gap-2 text-xs',
                                      s.value === project.status && 'font-semibold'
                                    )}
                                  >
                                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getStatusDotColor(s.value))} />
                                    {s.label}
                                    {s.value === project.status && <CheckCircle2 className="w-3 h-3 ml-auto text-[#1A535C]" />}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>

                          {/* Bedrag */}
                          <td className="py-3.5 pr-4 text-right hidden xl:table-cell">
                            {(() => {
                              const bedrag = getProjectBedrag(project.id)
                              if (bedrag <= 0) return <span className="text-xs text-[#C0BDB8]">&mdash;</span>
                              const formatted = formatCurrency(bedrag)
                              return (
                                <span className={cn(
                                  'font-mono tabular-nums',
                                  bedrag >= 10000
                                    ? 'text-[15px] font-bold text-[#1A1A1A]'
                                    : 'text-sm text-[#4A4A46]'
                                )}>
                                  {formatted}
                                </span>
                              )
                            })()}
                          </td>

                          {/* Datum */}
                          <td className="py-3.5 pr-4 text-right hidden lg:table-cell">
                            <span className="text-[12px] font-mono tabular-nums text-[#B0ADA8]">
                              {new Date(project.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).replace('.', '')}
                            </span>
                          </td>

                          {/* Dagen open */}
                          <td className="py-3.5 pr-4 text-right hidden xl:table-cell">
                            {(() => {
                              const dagen = getDagenOpen(project)
                              if (dagen === null) return <span className="text-xs text-[#C0BDB8]">&mdash;</span>
                              const urgent = dagen > 90
                              const warning = dagen > 30
                              return (
                                <span
                                  className={cn(
                                    'inline-flex items-center justify-center text-[11px] font-mono font-semibold tabular-nums rounded-md px-2 py-0.5',
                                    urgent ? 'bg-[#FDE8E4] text-[#C03A18]' :
                                    warning ? 'bg-[#FEF3E8] text-[#D4621A]' :
                                    'text-[#9B9B95]'
                                  )}
                                >
                                  {dagen}d
                                </span>
                              )
                            })()}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-0.5 justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPhotoUploadProjectId(project.id)
                                  setPhotoUploadKlantId(project.klant_id)
                                  photoInputRef.current?.click()
                                }}
                                className="p-1.5 rounded-lg hover:bg-[#F0EFEC] transition-all opacity-0 group-hover:opacity-100"
                                title="Foto's toevoegen"
                              >
                                <Camera className="w-3.5 h-3.5 text-[#9B9B95]" />
                              </button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded-lg hover:bg-[#F0EFEC] transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5 text-[#9B9B95]" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.location.href = `/projecten/${project.id}`
                                    }}
                                  >
                                    Bekijken
                                  </DropdownMenuItem>
                                  {getProjectOffertes(project.id).length > 0 && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const projOffertes = getProjectOffertes(project.id)
                                        window.location.href = `/offertes/${projOffertes[0].id}/preview`
                                      }}
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-2" />
                                      Offerte bekijken
                                    </DropdownMenuItem>
                                  )}
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
                                      const csv = [
                                        'Project;' + project.naam,
                                        'Klant;' + klantNaam,
                                        'Status;' + (statusLabels[project.status] || project.status),
                                        'Bedrag;' + formatCurrency(getProjectBedrag(project.id)),
                                        'Start;' + formatDate(project.start_datum ?? ""),
                                      ].join('\n')
                                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                                      const url = URL.createObjectURL(blob)
                                      const a = document.createElement('a')
                                      a.href = url
                                      a.download = `${project.naam.replace(/\s+/g, '-').toLowerCase()}.csv`
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
    </div>
  )
}
