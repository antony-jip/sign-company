import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import {
  Plus,
  Search,
  FolderOpen,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  Download,
  FileText,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  MoreHorizontal,
  Receipt,
  Camera,
  Eye,
  CheckSquare,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SpectrumBar } from '@/components/ui/SpectrumBar'
import { getFase } from '@/utils/projectFases'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { ModuleHeader } from '@/components/shared/ModuleHeader'
import { SkeletonTable } from '@/components/ui/skeleton'
import { MODULE_COLORS } from '@/lib/moduleColors'

const statusOpties = [
  { value: 'alle', label: 'Alle' },
  { value: 'actief', label: 'Actief' },
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
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'actief': return 'bg-[#2D6B48]'
    case 'gepland': return 'bg-[#2A5580]'
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
    setSelectedProjects(prev => {
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

  // Reset page when filters change
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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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

  // Stats
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
    return (
      <SkeletonTable rows={6} cols={4} />
    )
  }

  return (
    <div className="h-full flex flex-col animate-fade-in-up mod-strip mod-strip-projecten">
      {/* Hidden photo input for quick upload */}
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

      {/* ── Header bar ── */}
      <ModuleHeader
        module="projecten"
        icon={FolderOpen}
        title="Projecten"
        subtitle={`${gefilterdeProjecten.length} van ${projecten.length} projecten`}
        actions={
          <Button asChild size="sm" className="flex-shrink-0 rounded-lg text-white" style={{ backgroundColor: '#1A535C' }}>
            <Link to="/projecten/nieuw">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nieuw project</span>
              <span className="sm:hidden">Nieuw</span>
            </Link>
          </Button>
        }
      />

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-5 p-5">

      {/* ── Quick stats ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {stats.actief > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white" style={{ color: '#1A535C', border: '1px solid #1A535C' }}>
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">{stats.actief}</span> actief
          </div>
        )}
        {stats.teFactureren > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white" style={{ color: '#2D6B48', border: '1px solid #2D6B48' }}>
            <Receipt className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">{stats.teFactureren}</span> te factureren
          </div>
        )}
        {stats.overdue > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white" style={{ color: '#F15025', border: '1px solid #F15025' }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">{stats.overdue}</span> verlopen
          </div>
        )}
        {stats.afgerond > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white" style={{ color: '#5A5A55', border: '1px solid #5A5A55' }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">{stats.afgerond}</span> afgerond
          </div>
        )}
      </div>

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#7EB5A6]/8 border border-[#7EB5A6]/20 rounded-xl">
          <CheckSquare className="w-4 h-4 text-[#7EB5A6]" />
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} van {gefilterdeProjecten.length} geselecteerd
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={toggleSelectAll}
          >
            {selectedIds.size === gefilterdeProjecten.length ? 'Deselecteer alles' : 'Selecteer alles'}
          </Button>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ChevronDown className="w-3.5 h-3.5" />
                Status wijzigen
              </Button>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek project of klant..."
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap flex-1 overflow-x-auto scrollbar-hide">
          {statusOpties.map((optie) => {
            const count = optie.value === 'alle'
              ? projecten.length
              : projecten.filter((p) => p.status === optie.value).length
            if (optie.value !== 'alle' && count === 0) return null
            return (
              <button
                key={optie.value}
                onClick={() => setStatusFilter(optie.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150',
                  statusFilter === optie.value
                    ? 'bg-[#191919] text-white'
                    : 'text-[#5A5A55] hover:bg-[#F4F2EE]'
                )}
              >
                {optie.label}
                {count > 0 && <span className="ml-1 opacity-60 font-mono text-[11px]">{count}</span>}
              </button>
            )
          })}

        </div>

        <div className="hidden sm:flex items-center gap-1 ml-auto flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
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
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
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
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {/* ── Dagen open filter ── */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider flex-shrink-0" style={{ color: '#A0A098', letterSpacing: '0.6px' }}>
          Dagen open
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {([
            { value: 'alle', label: 'Alle' },
            { value: '<7', label: '< 7d' },
            { value: '7-14', label: '7–14d' },
            { value: '14-30', label: '14–30d' },
            { value: '30-90', label: '30–90d' },
            { value: '>90', label: '> 90d' },
          ] as const).map((optie) => (
            <button
              key={optie.value}
              onClick={() => setDagenOpenFilter(optie.value)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all duration-150',
                dagenOpenFilter === optie.value
                  ? 'text-white'
                  : 'text-[#5A5A55] hover:bg-[#F4F2EE]'
              )}
              style={dagenOpenFilter === optie.value ? { backgroundColor: '#1A535C' } : undefined}
            >
              {optie.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="relative overflow-hidden rounded-xl border shadow-sm" style={{ background: `linear-gradient(135deg, ${MODULE_COLORS.facturen.light}, #d4e8db)`, borderColor: MODULE_COLORS.facturen.border }}>
          {/* Subtiele achtergrond accent */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'var(--wm-noise)' }} />
          <div className="relative flex items-center gap-3 px-4 py-2.5">
            {/* Selectie teller */}
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: MODULE_COLORS.facturen.text, color: 'white' }}>
                <span className="text-xs font-bold">{selectedIds.size}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold" style={{ color: MODULE_COLORS.facturen.text }}>
                  {selectedIds.size} {selectedIds.size === 1 ? 'project' : 'projecten'} geselecteerd
                </span>
                <span className="text-2xs font-medium" style={{ color: MODULE_COLORS.facturen.text, opacity: 0.6 }}>
                  van {gefilterdeProjecten.length} totaal
                </span>
              </div>
            </div>

            {/* Selecteer alles toggle */}
            <button
              onClick={toggleSelectAll}
              className="text-xs font-semibold px-2.5 py-1 rounded-md transition-all hover:bg-card/40"
              style={{ color: MODULE_COLORS.facturen.text }}
            >
              {selectedIds.size === gefilterdeProjecten.length ? 'Deselecteer alles' : 'Selecteer alles'}
            </button>

            <div className="flex-1" />

            {/* Status wijzigen knop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold shadow-sm transition-all hover:shadow-md bg-card/90 backdrop-blur-sm border" style={{ color: MODULE_COLORS.facturen.text, borderColor: MODULE_COLORS.facturen.border }}>
                  <ArrowUpDown className="w-3 h-3" />
                  Status wijzigen
                  <ChevronDown className="w-3 h-3 opacity-50" />
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

            {/* Sluiten */}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-7 w-7 rounded-lg flex items-center justify-center transition-all hover:bg-card/40"
              style={{ color: MODULE_COLORS.facturen.text }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {gefilterdeProjecten.length === 0 ? (
        <Card className="border-dashed border-black/[0.06]">
          <EmptyState
            module="projecten"
            title="Nog geen projecten"
            description={zoekterm || statusFilter !== 'alle'
              ? 'Pas je filters aan of maak een nieuw project aan.'
              : 'Start je eerste project en houd alles bij.'}
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/projecten/nieuw">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Nieuw project
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <>
        {/* Mobile card view */}
        <div className="md:hidden space-y-2 -mx-1">
          {paginatedProjecten.map((project) => {
            const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
            const bedrag = getProjectBedrag(project.id)
            return (
              <div
                key={`mobile-${project.id}`}
                onClick={() => navigateWithTab({ path: `/projecten/${project.id}`, label: project.naam || 'Project', id: `/projecten/${project.id}` })}
                className="p-4 rounded-xl border bg-card cursor-pointer active:bg-muted/50 transition-colors border-l-[3px] border-l-[#1A535C]"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground truncate">{project.naam}</p>
                    {klantNaam && <p className="text-[11px] truncate mt-0.5" style={{ color: '#5A5A55' }}>{klantNaam}</p>}
                  </div>
                  {(() => {
                    const statusBadgeColors: Record<string, [string, string]> = {
                      actief: ['#E2F0F0', '#1A535C'],
                      gepland: ['#E2F0F0', '#1A535C'],
                      'te-factureren': ['#E4F0EA', '#2D6B48'],
                      afgerond: ['#EEEEED', '#5A5A55'],
                    }
                    const [bg, fg] = statusBadgeColors[project.status] || ['#EEEEED', '#5A5A55']
                    return (
                      <span
                        className="text-[10px] font-semibold px-[10px] py-[3px] rounded-full flex-shrink-0"
                        style={{ backgroundColor: bg, color: fg }}
                      >
                        {statusLabels[project.status] || project.status}
                      </span>
                    )
                  })()}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-medium" style={{ color: getSpectrumFase(project.status).color }}>
                    {getSpectrumFase(project.status).label}
                  </span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const dagen = getDagenOpen(project)
                      if (dagen === null) return null
                      const color = dagen > 90 ? '#C03A18' : dagen > 30 ? '#F15025' : dagen > 14 ? '#5A4A78' : '#5A5A55'
                      return <span className="font-mono text-[11px] font-medium" style={{ color }}>{dagen}d</span>
                    })()}
                    {bedrag > 0 && (
                      <span className="font-mono font-medium text-foreground whitespace-nowrap">EUR {formatCurrency(bedrag).replace('€', '').trim()}</span>
                    )}
                  </div>
                </div>
                <SpectrumBar percentage={getSpectrumFase(project.status).percentage} height={3} className="mt-2" />
              </div>
            )
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden -mx-3 sm:mx-0">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '0.5px solid #E6E4E0', backgroundColor: '#F4F2EE' }}>
                <th className="py-3 px-3 w-10">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === gefilterdeProjecten.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Selecteer alle projecten"
                  />
                </th>
                <th className="text-left py-3 px-4 w-[110px]">
                  <span className="text-[10px] font-medium uppercase text-[#A0A098]" style={{ letterSpacing: '0.8px' }}>Status</span>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('naam')}
                    className="flex items-center gap-1 text-[10px] font-medium uppercase text-[#A0A098] hover:text-foreground transition-colors"
                    style={{ letterSpacing: '0.8px' }}
                  >
                    Project
                    {sortField === 'naam' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-4 w-[140px] hidden lg:table-cell">
                  <span className="text-[10px] font-medium uppercase text-[#A0A098]" style={{ letterSpacing: '0.8px' }}>Klant</span>
                </th>
                <th className="text-left py-3 px-4 w-[90px] hidden md:table-cell">
                  <span className="text-[10px] font-medium uppercase text-[#A0A098]" style={{ letterSpacing: '0.8px' }}>Fase</span>
                </th>
                <th className="text-right py-3 px-4 w-[110px] hidden xl:table-cell">
                  <button
                    onClick={() => handleSort('bedrag')}
                    className="flex items-center gap-1 text-[10px] font-medium uppercase text-[#A0A098] hover:text-foreground transition-colors ml-auto"
                    style={{ letterSpacing: '0.8px' }}
                  >
                    Bedrag
                    {sortField === 'bedrag' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-right py-3 px-4 w-[70px] hidden lg:table-cell">
                  <button
                    onClick={() => handleSort('start_datum')}
                    className="flex items-center gap-1 text-[10px] font-medium uppercase text-[#A0A098] hover:text-foreground transition-colors ml-auto"
                    style={{ letterSpacing: '0.8px' }}
                  >
                    Datum
                    {sortField === 'start_datum' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-right py-3 px-4 w-[80px] hidden xl:table-cell">
                  <span className="text-[10px] font-medium uppercase text-[#A0A098]" style={{ letterSpacing: '0.8px' }}>Open</span>
                </th>
                <th className="w-10 py-3 px-2" />
              </tr>
            </thead>
            <tbody className="row-stagger">
              {paginatedProjecten.map((project) => {
                const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
                const contactpersoon = getKlantContactpersoon(project.klant_id)
                const isOverdue = project.eind_datum && new Date(project.eind_datum ?? "") < new Date() && project.status !== 'afgerond'

                return (
                  <tr
                    key={project.id}
                    className={cn(
                      'last:border-0 hover:bg-[#F4F2EE] cursor-pointer transition-colors duration-150 group',
                      selectedIds.has(project.id) && 'bg-[#E2F0F0]/30'
                    )}
                    style={{ borderBottom: '0.5px solid #E6E4E0' }}
                    onClick={() => navigateWithTab({ path: `/projecten/${project.id}`, label: project.naam || 'Project', id: `/projecten/${project.id}` })}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 relative" onClick={(e) => e.stopPropagation()}>
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1A535C]" />
                      <Checkbox
                        checked={selectedIds.has(project.id)}
                        onCheckedChange={() => toggleProjectSelection(project.id)}
                        aria-label={`Selecteer ${project.naam}`}
                      />
                    </td>
                    {/* Status badge */}
                    <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1.5">
                            {(() => {
                              const statusBadgeColors: Record<string, [string, string]> = {
                                actief: ['#E2F0F0', '#1A535C'],
                                gepland: ['#E2F0F0', '#1A535C'],
                                'te-factureren': ['#E4F0EA', '#2D6B48'],
                                afgerond: ['#EEEEED', '#5A5A55'],
                                'on-hold': ['#EEEEED', '#5A5A55'],
                                'in-review': ['#EEEEED', '#5A5A55'],
                                gefactureerd: ['#E4F0EA', '#2D6B48'],
                              }
                              const [bg, fg] = statusBadgeColors[project.status] || ['#EEEEED', '#5A5A55']
                              const isUrgent = project.prioriteit === 'urgent' || project.prioriteit === 'hoog'
                              return (
                                <span
                                  className="text-[10px] font-semibold px-[10px] py-[3px] rounded-full inline-flex items-center gap-1.5"
                                  style={{ backgroundColor: bg, color: fg }}
                                >
                                  {isUrgent && <span className="w-2 h-2 rounded-full bg-[#F15025] flex-shrink-0" />}
                                  {statusLabels[project.status] || project.status}
                                </span>
                              )
                            })()}
                            {isOverdue && (
                              <span
                                className="text-[10px] font-semibold px-[10px] py-[3px] rounded-full"
                                style={{ backgroundColor: '#FDE8E2', color: '#C03A18' }}
                              >
                                Verlopen
                              </span>
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
                              {s.value === project.status && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>

                    {/* Project naam + ref + spectrum bar */}
                    <td className="py-2.5 px-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/projecten/${project.id}`}
                            className="text-[13px] font-medium text-foreground hover:text-[#1A535C] transition-colors truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {project.naam}
                          </Link>
                          {project.project_nummer && (
                            <span className="text-[11px] text-[#A0A098] font-mono flex-shrink-0">{project.project_nummer}</span>
                          )}
                        </div>
                        {project.beschrijving && (
                          <p className="text-xs text-[#5A5A55] truncate max-w-[300px] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {project.beschrijving}
                          </p>
                        )}
                        <SpectrumBar percentage={getSpectrumFase(project.status).percentage} height={3} className="mt-1 w-20" />
                      </div>
                    </td>

                    {/* Klant */}
                    <td className="py-2.5 px-4 hidden lg:table-cell">
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-[13px] text-foreground truncate">{klantNaam}</span>
                        {(project.vestiging_naam || contactpersoon) && (
                          <span className="text-[11px] text-[#A0A098] truncate flex-shrink-0">
                            {project.vestiging_naam || contactpersoon}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Fase */}
                    <td className="py-2.5 px-4 hidden md:table-cell">
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: getSpectrumFase(project.status).color }}
                      >
                        {getSpectrumFase(project.status).label}
                      </span>
                    </td>

                    {/* Bedrag */}
                    <td className="py-2.5 px-4 text-right hidden xl:table-cell">
                      {(() => {
                        const bedrag = getProjectBedrag(project.id)
                        return bedrag > 0 ? (
                          <span className="text-sm font-medium text-foreground tabular-nums font-mono whitespace-nowrap">
                            EUR {formatCurrency(bedrag).replace('€', '').trim()}
                          </span>
                        ) : (
                          <span className="text-xs text-[#A0A098]">—</span>
                        )
                      })()}
                    </td>

                    {/* Datum */}
                    <td className="py-2.5 px-4 text-right hidden lg:table-cell">
                      <span className="text-xs font-mono tabular-nums" style={{ color: '#A0A098' }}>
                        {new Date(project.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }).replace('/', '-')}
                      </span>
                    </td>

                    {/* Dagen open */}
                    <td className="py-2.5 px-4 text-right hidden xl:table-cell">
                      {(() => {
                        const dagen = getDagenOpen(project)
                        if (dagen === null) return <span className="text-xs text-[#A0A098]">—</span>
                        const color = dagen > 90 ? '#C03A18' : dagen > 30 ? '#F15025' : dagen > 14 ? '#5A4A78' : '#5A5A55'
                        return (
                          <span className="text-[11px] font-mono font-medium tabular-nums" style={{ color }}>
                            {dagen}d
                          </span>
                        )
                      })()}
                    </td>

                    {/* Quick actions + Menu */}
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-0.5 justify-end">
                        {/* Quick photo upload button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPhotoUploadProjectId(project.id)
                            setPhotoUploadKlantId(project.klant_id)
                            photoInputRef.current?.click()
                          }}
                          className="p-1 rounded-md hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors opacity-0 group-hover:opacity-100"
                          title="Foto's toevoegen"
                        >
                          <Camera className="w-4 h-4 text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors" />
                        </button>

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
