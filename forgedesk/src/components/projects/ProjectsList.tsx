import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import {
  Plus,
  Search,
  FolderKanban,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  ArrowUpDown,
  Download,
  FileText,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  MoreHorizontal,
  Receipt,
  Users,
  CalendarDays,
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
import { Badge } from '@/components/ui/badge'
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
  getStatusColor,
  getPriorityColor,
} from '@/lib/utils'
import { exportCSV, exportExcel } from '@/lib/export'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { getProjecten, getKlanten, getOffertes, updateProject, createProjectFoto } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Project, Klant, Offerte } from '@/types'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import { ModuleHeader } from '@/components/shared/ModuleHeader'
import { DagenOpenFilterBar, getDaysOpen, getDaysColor, matchDagenFilter } from '@/components/shared/DagenOpenFilter'
import type { DagenOpenFilter } from '@/components/shared/DagenOpenFilter'

const statusOpties = [
  { value: 'alle', label: 'Alle' },
  { value: 'actief', label: 'Actief' },
  { value: 'gepland', label: 'Gepland' },
  { value: 'in-review', label: 'In review' },
  { value: 'te-factureren', label: 'Te factureren' },
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
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'actief': return 'bg-[var(--color-sage-text)]'
    case 'gepland': return 'bg-[var(--color-mist-text)]'
    case 'in-review': return 'bg-[var(--color-cream-text)]'
    case 'afgerond': return 'bg-[var(--color-sage-text)]'
    case 'on-hold': return 'bg-[var(--color-blush-text)]'
    case 'te-factureren': return 'bg-[var(--color-lavender-text)]'
    default: return 'bg-[var(--color-cream-text)]'
  }
}

function getStatusBorderColor(status: string): string {
  switch (status) {
    case 'actief': return 'border-l-[var(--color-sage-border)]'
    case 'gepland': return 'border-l-[var(--color-mist-border)]'
    case 'in-review': return 'border-l-[var(--color-cream-border)]'
    case 'afgerond': return 'border-l-[var(--color-sage-border)]'
    case 'on-hold': return 'border-l-[var(--color-blush-border)]'
    case 'te-factureren': return 'border-l-[var(--color-lavender-border)]'
    default: return 'border-l-[var(--color-cream-border)]'
  }
}

function getStatusCellBg(status: string): string {
  switch (status) {
    case 'actief': return 'bg-[var(--color-sage)]/50'
    case 'gepland': return 'bg-[var(--color-mist)]/50'
    case 'in-review': return 'bg-[var(--color-cream)]/50'
    case 'afgerond': return 'bg-[var(--color-sage)]/50'
    case 'on-hold': return 'bg-[var(--color-blush)]/50'
    case 'te-factureren': return 'bg-[var(--color-lavender)]/50'
    default: return 'bg-muted/30 dark:bg-muted/20'
  }
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
  const [dagenOpenFilter, setDagenOpenFilter] = useState<DagenOpenFilter>('alle')
  const [sortField, setSortField] = useState<'naam' | 'bedrag' | 'start_datum'>('start_datum')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 50
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const [photoUploadProjectId, setPhotoUploadProjectId] = useState<string | null>(null)
  const [photoUploadKlantId, setPhotoUploadKlantId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
      const openStatuses = ['actief', 'gepland', 'in-review', 'on-hold', 'te-factureren']
      result = result.filter((p) => {
        if (!openStatuses.includes(p.status)) return false
        return matchDagenFilter(getDaysOpen(p.start_datum || p.created_at), dagenOpenFilter)
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
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
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
        icon={FolderKanban}
        title="Projecten"
        subtitle={`${gefilterdeProjecten.length} van ${projecten.length} projecten`}
        actions={
          <Button asChild size="sm" className="flex-shrink-0 shadow-sm">
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
      <div className="space-y-5 p-4 sm:p-6">

      {/* ── Quick stats ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {stats.actief > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" style={{ color: 'var(--color-sage-text)', background: 'var(--color-sage)', border: '1px solid var(--color-sage-border)' }}>
            <TrendingUp className="w-3 h-3" />
            {stats.actief} actief
          </div>
        )}
        {stats.teFactureren > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" style={{ color: 'var(--color-lavender-text)', background: 'var(--color-lavender)', border: '1px solid var(--color-lavender-border)' }}>
            <Receipt className="w-3 h-3" />
            {stats.teFactureren} te factureren
          </div>
        )}
        {stats.overdue > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" style={{ color: 'var(--color-coral-text)', background: 'var(--color-coral)', border: '1px solid var(--color-coral-border)' }}>
            <AlertTriangle className="w-3 h-3" />
            {stats.overdue} verlopen
          </div>
        )}
        {stats.afgerond > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" style={{ color: 'var(--color-sage-text)', background: 'var(--color-sage)', border: '1px solid var(--color-sage-border)' }}>
            <CheckCircle2 className="w-3 h-3" />
            {stats.afgerond} afgerond
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
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150',
                  statusFilter === optie.value
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                )}
              >
                {optie.label}
                {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
              </button>
            )
          })}
        </div>

        <div className="hidden sm:flex items-center gap-1 ml-auto">
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
      <DagenOpenFilterBar
        value={dagenOpenFilter}
        onChange={setDagenOpenFilter}
        items={projecten
          .filter((p) => ['actief', 'gepland', 'in-review', 'on-hold', 'te-factureren'].includes(p.status))
          .map((p) => ({ dateField: p.start_datum || p.created_at }))
        }
      />

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="relative overflow-hidden rounded-xl border shadow-sm" style={{ background: 'linear-gradient(135deg, var(--color-sage), #d4e8db)', borderColor: 'var(--color-sage-border)' }}>
          {/* Subtiele achtergrond accent */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'var(--wm-noise)' }} />
          <div className="relative flex items-center gap-3 px-4 py-2.5">
            {/* Selectie teller */}
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: 'var(--color-sage-text)', color: 'white' }}>
                <span className="text-xs font-bold">{selectedIds.size}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-sage-text)' }}>
                  {selectedIds.size} {selectedIds.size === 1 ? 'project' : 'projecten'} geselecteerd
                </span>
                <span className="text-2xs font-medium" style={{ color: 'var(--color-sage-text)', opacity: 0.6 }}>
                  van {gefilterdeProjecten.length} totaal
                </span>
              </div>
            </div>

            {/* Selecteer alles toggle */}
            <button
              onClick={toggleSelectAll}
              className="text-xs font-semibold px-2.5 py-1 rounded-md transition-all hover:bg-card/40"
              style={{ color: 'var(--color-sage-text)' }}
            >
              {selectedIds.size === gefilterdeProjecten.length ? 'Deselecteer alles' : 'Selecteer alles'}
            </button>

            <div className="flex-1" />

            {/* Status wijzigen knop */}
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
              style={{ color: 'var(--color-sage-text)' }}
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
                className={cn(
                  'p-4 rounded-xl border bg-card cursor-pointer active:bg-muted/50 transition-colors border-l-3',
                  getStatusBorderColor(project.status)
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{project.naam}</p>
                    {klantNaam && <p className="text-xs text-muted-foreground truncate mt-0.5">{klantNaam}</p>}
                  </div>
                  <Badge className={cn('text-2xs capitalize flex-shrink-0', getStatusColor(project.status))}>
                    {statusLabels[project.status] || project.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-2xs font-medium px-1.5 py-0.5 rounded uppercase',
                      getPriorityColor(project.prioriteit)
                    )}>
                      {project.prioriteit}
                    </span>
                    <span className="font-mono">{formatDate(project.created_at)}</span>
                  </div>
                  {bedrag > 0 && (
                    <span className="font-mono font-semibold text-foreground">{formatCurrency(bedrag)}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-black/[0.06] bg-card/80 backdrop-blur-sm overflow-hidden -mx-3 sm:mx-0 shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="py-3 px-3 w-10">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === gefilterdeProjecten.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Selecteer alle projecten"
                  />
                </th>
                <th className="text-left py-3 px-4 w-[110px]">
                  <span className="text-xs font-bold text-text-tertiary uppercase tracking-label">Status</span>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('naam')}
                    className="flex items-center gap-1 text-xs font-bold text-text-tertiary uppercase tracking-label hover:text-foreground transition-colors"
                  >
                    Project
                    {sortField === 'naam' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-4 hidden lg:table-cell">
                  <span className="text-xs font-bold text-text-tertiary uppercase tracking-label">Klant</span>
                </th>
                <th className="text-left py-3 px-4 hidden md:table-cell">
                  <span className="text-xs font-bold text-text-tertiary uppercase tracking-label">Team</span>
                </th>
                <th className="text-right py-3 px-4 hidden xl:table-cell">
                  <button
                    onClick={() => handleSort('bedrag')}
                    className="flex items-center gap-1 text-xs font-bold text-text-tertiary uppercase tracking-label hover:text-foreground transition-colors ml-auto"
                  >
                    Bedrag
                    {sortField === 'bedrag' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-right py-3 px-4 hidden xl:table-cell">
                  <span className="text-xs font-bold text-text-tertiary uppercase tracking-label">Open</span>
                </th>
                <th className="text-right py-3 px-4 hidden lg:table-cell">
                  <button
                    onClick={() => handleSort('start_datum')}
                    className="flex items-center gap-1 text-xs font-bold text-text-tertiary uppercase tracking-label hover:text-foreground transition-colors ml-auto"
                  >
                    Datum
                    {sortField === 'start_datum' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
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
                      'border-b border-border/30 last:border-0 hover:bg-bg-subtle/50 dark:hover:bg-muted/20 cursor-pointer transition-all duration-150 group border-l-2',
                      getStatusBorderColor(project.status),


                      selectedIds.has(project.id) && 'bg-[#7EB5A6]/5'

                    )}
                    onClick={() => navigateWithTab({ path: `/projecten/${project.id}`, label: project.naam || 'Project', id: `/projecten/${project.id}` })}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(project.id)}
                        onCheckedChange={() => toggleProjectSelection(project.id)}
                        aria-label={`Selecteer ${project.naam}`}
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
                              getStatusBorderColor(project.status),
                              getStatusCellBg(project.status),
                              'hover:brightness-95 dark:hover:brightness-110'
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getStatusDotColor(project.status))} />
                            <span className="text-xs font-medium text-foreground">
                              {statusLabels[project.status] || project.status}
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

                    {/* Project naam + prioriteit */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div>
                            <Link
                              to={`/projecten/${project.id}`}
                              className="text-sm font-medium text-foreground hover:text-accent dark:hover:text-primary transition-colors block truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {project.naam}
                            </Link>
                            {project.project_nummer && (
                              <span className="text-xs text-muted-foreground font-mono">{project.project_nummer}</span>
                            )}
                          </div>
                          {project.beschrijving && (
                            <p className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5">
                              {project.beschrijving}
                            </p>
                          )}
                        </div>
                        <span className={cn(
                          'text-2xs font-medium px-1.5 py-0.5 rounded flex-shrink-0 uppercase tracking-wide',
                          project.prioriteit === 'hoog' || project.prioriteit === 'urgent'
                            ? 'text-red-600/70 bg-red-50 dark:text-red-400/70 dark:bg-red-950/20'
                            : project.prioriteit === 'laag'
                            ? 'text-muted-foreground/50 bg-muted/40'
                            : 'text-muted-foreground/60 bg-muted/50'
                        )}>
                          {project.prioriteit}
                        </span>
                        {isOverdue && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-2xs px-1.5 py-0 flex-shrink-0">
                            Verlopen
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Klant */}
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="text-sm text-foreground">{klantNaam}</span>
                      {project.vestiging_naam && (
                        <p className="text-xs text-muted-foreground mt-0.5">{project.vestiging_naam}</p>
                      )}
                      {!project.vestiging_naam && contactpersoon && (
                        <p className="text-xs text-muted-foreground mt-0.5">{contactpersoon}</p>
                      )}
                    </td>

                    {/* Team */}
                    <td className="py-3 px-4 hidden md:table-cell">
                      {project.team_leden.length > 0 ? (
                        <div className="flex items-center -space-x-1">
                          {project.team_leden.slice(0, 3).map((lid, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center border-2 border-white dark:border-card text-2xs font-semibold text-accent dark:text-primary"
                              title={lid}
                            >
                              {lid.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {project.team_leden.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border-2 border-white dark:border-card text-2xs font-medium text-muted-foreground">
                              +{project.team_leden.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Bedrag */}
                    <td className="py-3 px-4 hidden xl:table-cell">
                      {(() => {
                        const bedrag = getProjectBedrag(project.id)
                        return bedrag > 0 ? (
                          <span className="text-sm font-semibold text-foreground tabular-nums font-mono">
                            {formatCurrency(bedrag)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )
                      })()}
                    </td>

                    {/* Dagen open */}
                    <td className="py-3 px-4 text-right hidden xl:table-cell">
                      {project.status !== 'afgerond' && (() => {
                        const days = getDaysOpen(project.start_datum || project.created_at)
                        return (
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md tabular-nums', getDaysColor(days))}>
                            {days}d
                          </span>
                        )
                      })()}
                    </td>

                    {/* Datum */}
                    <td className="py-3 px-4 text-right hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {formatDate(project.created_at)}
                      </span>
                    </td>

                    {/* Quick actions + Menu */}
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-0.5 justify-end">
                        {/* Quick offerte preview button */}
                        {(() => {
                          const projOffertes = getProjectOffertes(project.id)
                          if (projOffertes.length === 0) return null
                          const latestOfferte = projOffertes[0]
                          return (
                            <Link
                              to={`/offertes/${latestOfferte.id}/preview`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors opacity-0 group-hover:opacity-100"
                              title={`Offerte bekijken: ${latestOfferte.nummer || latestOfferte.titel}`}
                            >
                              <Eye className="w-4 h-4 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors" />
                            </Link>
                          )
                        })()}
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
