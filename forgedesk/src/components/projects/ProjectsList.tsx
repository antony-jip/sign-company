import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import {
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

  return (
    <div className="h-full flex flex-col bg-[#F8F7F5]">
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
        <div className="px-8 py-6 space-y-8 max-w-[1400px]">

          {/* Header */}
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-[-0.3px] text-[#1A1A1A]">
                Projecten
              </h1>
              <p className="text-sm text-[#9B9B95] mt-1">
                <span className="font-mono">{gefilterdeProjecten.length}</span> van <span className="font-mono">{projecten.length}</span> projecten
              </p>
            </div>
            <Link
              to="/projecten/nieuw"
              className="text-sm font-medium text-[#F15025] hover:text-[#D4421E] transition-colors"
            >
              Nieuw project
            </Link>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6 text-sm text-[#6B6B66]">
            {stats.actief > 0 && (
              <span><span className="font-mono font-medium text-[#1A1A1A]">{stats.actief}</span> actief</span>
            )}
            {stats.teFactureren > 0 && (
              <span><span className="font-mono font-medium text-[#1A1A1A]">{stats.teFactureren}</span> te factureren</span>
            )}
            {stats.overdue > 0 && (
              <span><span className="font-mono font-medium text-[#C03A18]">{stats.overdue}</span> verlopen</span>
            )}
            {stats.afgerond > 0 && (
              <span><span className="font-mono font-medium text-[#1A1A1A]">{stats.afgerond}</span> afgerond</span>
            )}
          </div>

          {/* Search + Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              {/* Search */}
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9B95]" />
                <input
                  type="text"
                  placeholder="Zoek project of klant..."
                  value={zoekterm}
                  onChange={(e) => setZoekterm(e.target.value)}
                  className="w-full pl-6 pr-2 py-2 text-sm bg-transparent border-b border-[#EBEBEB] text-[#1A1A1A] placeholder:text-[#9B9B95] focus:outline-none focus:border-[#1A535C] transition-colors"
                />
              </div>

              {/* Export links */}
              <div className="hidden sm:flex items-center gap-4 ml-auto text-[#9B9B95]">
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
                  className="flex items-center gap-1 text-xs hover:text-[#1A1A1A] transition-colors"
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
                  className="flex items-center gap-1 text-xs hover:text-[#1A1A1A] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Excel
                </button>
              </div>
            </div>

            {/* Status filter tabs as text links */}
            <div className="flex items-center gap-5 flex-wrap">
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
                      'text-sm transition-colors',
                      isActive
                        ? 'font-semibold text-[#1A1A1A]'
                        : 'text-[#9B9B95] hover:text-[#6B6B66]'
                    )}
                  >
                    {optie.label}
                    {count > 0 && <span className="ml-1 font-mono text-xs opacity-60">{count}</span>}
                  </button>
                )
              })}
            </div>

            {/* Dagen open filter */}
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#9B9B95]">
                Dagen open
              </span>
              <div className="flex items-center gap-3">
                {([
                  { value: 'alle', label: 'Alle' },
                  { value: '<7', label: '< 7d' },
                  { value: '7-14', label: '7-14d' },
                  { value: '14-30', label: '14-30d' },
                  { value: '30-90', label: '30-90d' },
                  { value: '>90', label: '> 90d' },
                ] as const).map((optie) => {
                  const isActive = dagenOpenFilter === optie.value
                  return (
                    <button
                      key={optie.value}
                      onClick={() => setDagenOpenFilter(optie.value)}
                      className={cn(
                        'text-xs font-mono transition-colors',
                        isActive
                          ? 'font-semibold text-[#1A1A1A]'
                          : 'text-[#9B9B95] hover:text-[#6B6B66]'
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
            <div className="flex items-center gap-4 py-3 border-b border-[#EBEBEB]">
              <span className="text-sm text-[#1A1A1A]">
                <span className="font-mono font-medium">{selectedIds.size}</span> van {gefilterdeProjecten.length} geselecteerd
              </span>
              <button
                onClick={toggleSelectAll}
                className="text-xs font-medium text-[#1A535C] hover:text-[#143F46] transition-colors"
              >
                {selectedIds.size === gefilterdeProjecten.length ? 'Deselecteer alles' : 'Selecteer alles'}
              </button>
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs font-medium text-[#1A535C] hover:text-[#143F46] transition-colors">
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
                className="text-[#9B9B95] hover:text-[#1A1A1A] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Table */}
          {gefilterdeProjecten.length === 0 ? (
            <div className="py-16 text-center">
              <EmptyState
                module="projecten"
                title="Nog geen projecten"
                description={zoekterm || statusFilter !== 'alle'
                  ? 'Pas je filters aan of maak een nieuw project aan.'
                  : 'Start je eerste project en houd alles bij.'}
                action={
                  <Link
                    to="/projecten/nieuw"
                    className="text-sm font-medium text-[#F15025] hover:text-[#D4421E] transition-colors"
                  >
                    Nieuw project aanmaken
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              {/* Mobile view */}
              <div className="md:hidden space-y-0">
                {paginatedProjecten.map((project) => {
                  const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
                  const bedrag = getProjectBedrag(project.id)
                  return (
                    <div
                      key={`mobile-${project.id}`}
                      onClick={() => navigateWithTab({ path: `/projecten/${project.id}`, label: project.naam || 'Project', id: `/projecten/${project.id}` })}
                      className="py-4 border-b border-[#EBEBEB] cursor-pointer active:bg-[#F8F7F5] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate">{project.naam}</p>
                          {klantNaam && <p className="text-xs text-[#9B9B95] mt-0.5 truncate">{klantNaam}</p>}
                        </div>
                        <span className="text-xs flex-shrink-0" style={{ color: getStatusTextColor(project.status) }}>
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
                            return <span className="font-mono text-[11px]" style={{ color }}>{dagen}d</span>
                          })()}
                          {bedrag > 0 && (
                            <span className="font-mono text-[#1A1A1A]">{formatCurrency(bedrag)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#EBEBEB]">
                      <th className="py-3 pr-4 w-10 text-left">
                        <Checkbox
                          checked={selectedIds.size > 0 && selectedIds.size === gefilterdeProjecten.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Selecteer alle projecten"
                        />
                      </th>
                      <th className="text-left py-3 pr-4">
                        <button
                          onClick={() => handleSort('naam')}
                          className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-[#9B9B95] hover:text-[#6B6B66] transition-colors"
                        >
                          Project
                          {sortField === 'naam' ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="text-left py-3 pr-4 w-[160px] hidden lg:table-cell">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-[#9B9B95]">Klant</span>
                      </th>
                      <th className="text-left py-3 pr-4 w-[130px]">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-[#9B9B95]">Status</span>
                      </th>
                      <th className="text-right py-3 pr-4 w-[110px] hidden xl:table-cell">
                        <button
                          onClick={() => handleSort('bedrag')}
                          className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-[#9B9B95] hover:text-[#6B6B66] transition-colors ml-auto"
                        >
                          Bedrag
                          {sortField === 'bedrag' ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="text-right py-3 pr-4 w-[80px] hidden lg:table-cell">
                        <button
                          onClick={() => handleSort('start_datum')}
                          className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-[#9B9B95] hover:text-[#6B6B66] transition-colors ml-auto"
                        >
                          Datum
                          {sortField === 'start_datum' ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="text-right py-3 pr-4 w-[70px] hidden xl:table-cell">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-[#9B9B95]">Open</span>
                      </th>
                      <th className="w-10 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProjecten.map((project) => {
                      const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
                      const contactpersoon = getKlantContactpersoon(project.klant_id)
                      const isOverdue = project.eind_datum && new Date(project.eind_datum ?? "") < new Date() && project.status !== 'afgerond'

                      return (
                        <tr
                          key={project.id}
                          className={cn(
                            'border-b border-[#EBEBEB] hover:bg-[#F8F7F5] cursor-pointer transition-colors duration-100 group',
                            selectedIds.has(project.id) && 'bg-[#F8F7F5]'
                          )}
                          onClick={() => navigateWithTab({ path: `/projecten/${project.id}`, label: project.naam || 'Project', id: `/projecten/${project.id}` })}
                        >
                          {/* Checkbox */}
                          <td className="py-4 pr-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(project.id)}
                              onCheckedChange={() => toggleProjectSelection(project.id)}
                              aria-label={`Selecteer ${project.naam}`}
                            />
                          </td>

                          {/* Project naam + nummer */}
                          <td className="py-4 pr-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/projecten/${project.id}`}
                                  className="text-sm font-medium text-[#1A1A1A] hover:text-[#1A535C] transition-colors truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {project.naam}
                                </Link>
                                {project.project_nummer && (
                                  <span className="text-[11px] text-[#9B9B95] font-mono flex-shrink-0">{project.project_nummer}</span>
                                )}
                              </div>
                              {project.beschrijving && (
                                <p className="text-xs text-[#9B9B95] truncate max-w-[300px] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {project.beschrijving}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Klant */}
                          <td className="py-4 pr-4 hidden lg:table-cell">
                            <div className="min-w-0">
                              <span className="text-sm text-[#6B6B66] truncate block">{klantNaam}</span>
                              {(project.vestiging_naam || contactpersoon) && (
                                <span className="text-[11px] text-[#9B9B95] truncate block">
                                  {project.vestiging_naam || contactpersoon}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status as text + Flame punt */}
                          <td className="py-4 pr-4" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-left">
                                  <span
                                    className="text-sm font-medium"
                                    style={{ color: getStatusTextColor(project.status) }}
                                  >
                                    {statusLabels[project.status] || project.status}<span className="text-[#F15025]">.</span>
                                  </span>
                                  {isOverdue && (
                                    <span className="ml-2 text-xs text-[#C03A18]">Verlopen</span>
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
                          <td className="py-4 pr-4 text-right hidden xl:table-cell">
                            {(() => {
                              const bedrag = getProjectBedrag(project.id)
                              return bedrag > 0 ? (
                                <span className="text-sm font-mono tabular-nums text-[#1A1A1A]">
                                  {formatCurrency(bedrag)}
                                </span>
                              ) : (
                                <span className="text-xs text-[#9B9B95]">&mdash;</span>
                              )
                            })()}
                          </td>

                          {/* Datum */}
                          <td className="py-4 pr-4 text-right hidden lg:table-cell">
                            <span className="text-xs font-mono tabular-nums text-[#9B9B95]">
                              {new Date(project.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }).replace('/', '-')}
                            </span>
                          </td>

                          {/* Dagen open */}
                          <td className="py-4 pr-4 text-right hidden xl:table-cell">
                            {(() => {
                              const dagen = getDagenOpen(project)
                              if (dagen === null) return <span className="text-xs text-[#9B9B95]">&mdash;</span>
                              const color = dagen > 90 ? '#C03A18' : dagen > 30 ? '#F15025' : '#9B9B95'
                              return (
                                <span className="text-[11px] font-mono tabular-nums" style={{ color }}>
                                  {dagen}d
                                </span>
                              )
                            })()}
                          </td>

                          {/* Actions */}
                          <td className="py-4">
                            <div className="flex items-center gap-0.5 justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPhotoUploadProjectId(project.id)
                                  setPhotoUploadKlantId(project.klant_id)
                                  photoInputRef.current?.click()
                                }}
                                className="p-1 rounded-md hover:bg-[#EBEBEB] transition-colors opacity-0 group-hover:opacity-100"
                                title="Foto's toevoegen"
                              >
                                <Camera className="w-4 h-4 text-[#9B9B95]" />
                              </button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded-md hover:bg-[#EBEBEB] transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <MoreHorizontal className="w-4 h-4 text-[#9B9B95]" />
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
