import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  FolderKanban,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  ArrowUpRight,
  CalendarDays,
  Users,
  BarChart3,
  ArrowUpDown,
  LayoutGrid,
  List,
  Download,
  FileText,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  MoreHorizontal,
  GanttChart,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  cn,
  formatDate,
  formatCurrency,
  getStatusColor,
  getPriorityColor,
} from '@/lib/utils'
import { exportCSV, exportExcel } from '@/lib/export'
import { getProjecten, getKlanten, updateProject } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Project, Klant } from '@/types'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'

const statusOpties = [
  { value: 'alle', label: 'Alle statussen' },
  { value: 'gepland', label: 'Gepland' },
  { value: 'actief', label: 'Actief' },
  { value: 'in-review', label: 'In review' },
  { value: 'afgerond', label: 'Afgerond' },
  { value: 'on-hold', label: 'On-hold' },
]

const prioriteitOpties = [
  { value: 'alle', label: 'Alle prioriteiten' },
  { value: 'laag', label: 'Laag' },
  { value: 'medium', label: 'Medium' },
  { value: 'hoog', label: 'Hoog' },
  { value: 'kritiek', label: 'Kritiek' },
]

const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  afgerond: 'Afgerond',
  'on-hold': 'On-hold',
}

const statusIcons: Record<string, React.ReactNode> = {
  gepland: <Clock className="h-3 w-3" />,
  actief: <TrendingUp className="h-3 w-3" />,
  'in-review': <BarChart3 className="h-3 w-3" />,
  afgerond: <CheckCircle2 className="h-3 w-3" />,
  'on-hold': <AlertTriangle className="h-3 w-3" />,
}

function getStatusBorderColor(status: string): string {
  switch (status) {
    case 'actief': return 'border-l-green-500'
    case 'gepland': return 'border-l-primary'
    case 'in-review': return 'border-l-amber-500'
    case 'afgerond': return 'border-l-emerald-500'
    case 'on-hold': return 'border-l-red-500'
    default: return 'border-l-gray-400'
  }
}

function getStatusCellBg(status: string): string {
  switch (status) {
    case 'actief': return 'bg-green-50 dark:bg-green-950/30'
    case 'gepland': return 'bg-blue-50 dark:bg-blue-950/30'
    case 'in-review': return 'bg-amber-50 dark:bg-amber-950/30'
    case 'afgerond': return 'bg-emerald-50 dark:bg-emerald-950/30'
    case 'on-hold': return 'bg-red-50 dark:bg-red-950/30'
    default: return 'bg-gray-50 dark:bg-gray-800/30'
  }
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'actief': return 'bg-green-500'
    case 'gepland': return 'bg-primary'
    case 'in-review': return 'bg-amber-500'
    case 'afgerond': return 'bg-emerald-500'
    case 'on-hold': return 'bg-red-500'
    default: return 'bg-gray-400'
  }
}

export function ProjectsList() {
  const { user } = useAuth()
  const [projecten, setProjecten] = useState<Project[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [zoekterm, setZoekterm] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [prioriteitFilter, setPrioriteitFilter] = useState('alle')
  const [klantFilter, setKlantFilter] = useState('alle')
  const [weergave, setWeergave] = useState<'grid' | 'list' | 'tijdlijn'>('grid')
  const [sortField, setSortField] = useState<'naam' | 'voortgang' | 'eind_datum'>('eind_datum')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        setIsLoading(true)
        const [projectenData, klantenData] = await Promise.all([
          getProjecten(),
          getKlanten(),
        ])
        if (!cancelled) {
          setProjecten(projectenData)
          setKlanten(klantenData)
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

  // Unieke klanten voor filter pills
  const uniekeKlanten = useMemo(() => {
    const klantMap = new Map<string, string>()
    projecten.forEach((p) => {
      const naam = p.klant_naam || getKlantNaam(p.klant_id)
      if (naam && naam !== 'Onbekend') {
        klantMap.set(p.klant_id, naam)
      }
    })
    return Array.from(klantMap.entries()).map(([id, naam]) => ({ id, naam })).sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
  }, [projecten, klanten])

  const gefilterdeProjecten = useMemo(() => {
    let result = [...projecten]

    if (zoekterm.trim()) {
      const term = zoekterm.toLowerCase()
      result = result.filter(
        (p) =>
          p.naam.toLowerCase().includes(term) ||
          getKlantNaam(p.klant_id).toLowerCase().includes(term)
      )
    }

    if (statusFilter !== 'alle') {
      result = result.filter((p) => p.status === statusFilter)
    }

    if (prioriteitFilter !== 'alle') {
      result = result.filter((p) => p.prioriteit === prioriteitFilter)
    }

    if (klantFilter !== 'alle') {
      result = result.filter((p) => p.klant_id === klantFilter)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'naam':
          cmp = a.naam.localeCompare(b.naam, 'nl')
          break
        case 'voortgang':
          cmp = a.voortgang - b.voortgang
          break
        case 'eind_datum':
          cmp = new Date(a.eind_datum).getTime() - new Date(b.eind_datum).getTime()
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [projecten, klanten, zoekterm, statusFilter, prioriteitFilter, klantFilter, sortField, sortDir])

  function handleSort(field: typeof sortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
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

  // Briefing stats
  const briefing = useMemo(() => {
    const actief = projecten.filter((p) => p.status === 'actief').length
    const inReview = projecten.filter((p) => p.status === 'in-review').length
    const afgerond = projecten.filter((p) => p.status === 'afgerond').length
    const overdue = projecten.filter(
      (p) => new Date(p.eind_datum) < new Date() && p.status !== 'afgerond'
    ).length
    const gemiddeldeVoortgang = projecten.length > 0
      ? Math.round(projecten.reduce((sum, p) => sum + p.voortgang, 0) / projecten.length)
      : 0

    return { actief, inReview, afgerond, overdue, gemiddeldeVoortgang }
  }, [projecten])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <FolderKanban className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Projecten</h1>
            <p className="text-sm text-muted-foreground">
              {gefilterdeProjecten.length} van {projecten.length} projecten
            </p>
          </div>
        </div>
        <Button asChild className="bg-gradient-to-r from-accent to-primary hover:from-accent hover:to-wm-hover shadow-lg shadow-primary/25 border-0">
          <Link to="/projecten/nieuw">
            <Plus className="mr-2 h-4 w-4" />
            Nieuw Project
          </Link>
        </Button>
      </div>

      {/* ── Project Briefing ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3D3522] via-accent to-[#3D3522] p-6 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-wm-pale rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-wm-pale" />
            <h2 className="text-lg font-semibold text-white font-display">Project Briefing</h2>
            <span className="text-xs text-wm-pale/70 ml-auto">
              {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Totaal */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <FolderKanban className="h-4 w-4 text-wm-pale" />
                <span className="text-xs text-wm-pale/80 uppercase tracking-wider font-medium">Totaal</span>
              </div>
              <p className="text-2xl font-bold">{projecten.length}</p>
              <p className="text-xs text-wm-pale/60 mt-0.5">projecten</p>
            </div>

            {/* Actief */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-xs text-wm-pale/80 uppercase tracking-wider font-medium">Actief</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{briefing.actief}</p>
              <p className="text-xs text-wm-pale/60 mt-0.5">lopend</p>
            </div>

            {/* In review */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-wm-pale/80 uppercase tracking-wider font-medium">In review</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">{briefing.inReview}</p>
              <p className="text-xs text-wm-pale/60 mt-0.5">ter beoordeling</p>
            </div>

            {/* Afgerond */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-wm-pale/80 uppercase tracking-wider font-medium">Klaar</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{briefing.afgerond}</p>
              <p className="text-xs text-wm-pale/60 mt-0.5">afgerond</p>
            </div>

            {/* Voortgang */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-wm-pale" />
                <span className="text-xs text-wm-pale/80 uppercase tracking-wider font-medium">Voortgang</span>
              </div>
              <p className="text-2xl font-bold">{briefing.gemiddeldeVoortgang}%</p>
              <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-wm-pale rounded-full transition-all duration-700"
                  style={{ width: `${briefing.gemiddeldeVoortgang}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search + View toggle + Export ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op project of klant..."
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            className="pl-9 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-200/80"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Export buttons */}
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-r-none border-r-0"
              onClick={() => {
                const headers = ['Project', 'Klant', 'Status', 'Prioriteit', 'Voortgang', 'Startdatum']
                const rows = gefilterdeProjecten.map((p) => ({
                  Project: p.naam,
                  Klant: p.klant_naam || getKlantNaam(p.klant_id),
                  Status: statusLabels[p.status] || p.status,
                  Prioriteit: p.prioriteit,
                  Voortgang: p.voortgang + '%',
                  Startdatum: formatDate(p.start_datum),
                }))
                exportCSV(`projecten-${new Date().toISOString().split('T')[0]}`, headers, rows)
              }}
            >
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-l-none"
              onClick={() => {
                const headers = ['Project', 'Klant', 'Status', 'Prioriteit', 'Voortgang', 'Startdatum']
                const rows = gefilterdeProjecten.map((p) => ({
                  Project: p.naam,
                  Klant: p.klant_naam || getKlantNaam(p.klant_id),
                  Status: statusLabels[p.status] || p.status,
                  Prioriteit: p.prioriteit,
                  Voortgang: p.voortgang,
                  Startdatum: formatDate(p.start_datum),
                }))
                exportExcel(`projecten-${new Date().toISOString().split('T')[0]}`, headers, rows, 'Projecten')
              }}
            >
              <FileText className="w-4 h-4" />
              Excel
            </Button>
          </div>

          {/* View toggle */}
          <div className="flex items-center border rounded-md bg-background">
            <Button
              variant={weergave === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="rounded-r-none h-9 w-9"
              onClick={() => setWeergave('grid')}
              title="Rasterweergave"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={weergave === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="rounded-none h-9 w-9"
              onClick={() => setWeergave('list')}
              title="Tabelweergave"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={weergave === 'tijdlijn' ? 'default' : 'ghost'}
              size="icon"
              className="rounded-l-none h-9 w-9"
              onClick={() => setWeergave('tijdlijn')}
              title="Tijdlijn / Gantt"
            >
              <GanttChart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Filter pills + Sort ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Status pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {statusOpties.map((optie) => {
            const count = optie.value === 'alle'
              ? projecten.length
              : projecten.filter((p) => p.status === optie.value).length
            return (
              <button
                key={optie.value}
                onClick={() => setStatusFilter(optie.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  statusFilter === optie.value
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {optie.label}
                {count > 0 && <span className="ml-1.5 text-[10px] opacity-70">{count}</span>}
              </button>
            )
          })}
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Priority pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {prioriteitOpties.map((optie) => (
            <button
              key={optie.value}
              onClick={() => setPrioriteitFilter(optie.value)}
              className={cn(
                'px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                prioriteitFilter === optie.value
                  ? 'bg-primary/10 text-accent dark:bg-primary/20 dark:text-wm-light'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {optie.label}
            </button>
          ))}
        </div>

        {uniekeKlanten.length > 0 && (
          <>
            <div className="h-4 w-px bg-border hidden sm:block" />

            {/* Klant filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setKlantFilter('alle')}
                className={cn(
                  'px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  klantFilter === 'alle'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Alle klanten
              </button>
              {uniekeKlanten.map((klant) => (
                <button
                  key={klant.id}
                  onClick={() => setKlantFilter(klant.id)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    klantFilter === klant.id
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {klant.naam}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Sort toolbar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowUpDown className="w-3 h-3" />
          <span>Sorteer:</span>
          {([
            { field: 'naam' as const, label: 'Naam' },
            { field: 'voortgang' as const, label: 'Voortgang' },
            { field: 'eind_datum' as const, label: 'Datum' },
          ]).map(({ field, label }) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={cn(
                'px-1.5 py-0.5 rounded transition-colors',
                sortField === field
                  ? 'text-blue-700 dark:text-blue-300 font-medium'
                  : 'hover:text-foreground'
              )}
            >
              {label}
              {sortField === field && (
                <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {gefilterdeProjecten.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-primary/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
                <path d="M7 9h2" />
                <path d="M15 9h2" />
                <path d="M10 12h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground">Nog geen sign-projecten</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Start je eerste project — lichtreclame, gevelbelettering of raamsigning.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/projecten/nieuw">
                <Plus className="mr-2 h-4 w-4" />
                Nieuw Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : weergave === 'list' ? (
        /* ==================== TABLE VIEW ==================== */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 w-[120px]">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                  </th>
                  <th className="text-left py-3 px-4">
                    <button
                      onClick={() => handleSort('naam')}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                    >
                      Omschrijving
                      {sortField === 'naam' ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Relatie</span>
                  </th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PM</span>
                  </th>
                  <th className="text-right py-3 px-4 hidden xl:table-cell">
                    <button
                      onClick={() => handleSort('voortgang')}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors ml-auto"
                    >
                      Voortgang
                      {sortField === 'voortgang' ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 hidden lg:table-cell">
                    <button
                      onClick={() => handleSort('eind_datum')}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors ml-auto"
                    >
                      Startdatum
                      {sortField === 'eind_datum' ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="w-10 py-3 px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {gefilterdeProjecten.map((project) => {
                  const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
                  const contactpersoon = getKlantContactpersoon(project.klant_id)

                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/projecten/${project.id}`}
                    >
                      {/* Status - links met kleur-achtergrond */}
                      <td className="py-0 px-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                'w-full h-full py-3 px-4 flex items-center gap-2 group/status transition-colors border-l-4',
                                getStatusBorderColor(project.status),
                                getStatusCellBg(project.status)
                              )}
                            >
                              <span className="text-sm font-medium text-foreground">
                                {statusLabels[project.status] || project.status}
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 group-hover/status:text-muted-foreground transition-colors" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44">
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
                                  'flex items-center gap-2 text-sm',
                                  s.value === project.status && 'font-semibold'
                                )}
                              >
                                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', getStatusDotColor(s.value))} />
                                {s.label}
                                {s.value === project.status && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>

                      {/* Omschrijving - naam + datum */}
                      <td className="py-3 px-4">
                        <div>
                          <Link
                            to={`/projecten/${project.id}`}
                            className="text-sm font-semibold text-foreground hover:text-accent dark:hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {project.naam}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(project.start_datum)}
                          </p>
                        </div>
                      </td>

                      {/* Relatie - bedrijfsnaam + contactpersoon */}
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <div>
                          <span className="text-sm font-medium text-foreground">{klantNaam}</span>
                          {contactpersoon && (
                            <p className="text-xs text-muted-foreground mt-0.5">{contactpersoon}</p>
                          )}
                        </div>
                      </td>

                      {/* PM - eerste teamlid */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        {project.team_leden.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-semibold text-accent dark:text-primary">
                                {project.team_leden[0].charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm text-foreground truncate max-w-[120px]">
                              {project.team_leden[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Voortgang */}
                      <td className="py-3 px-4 hidden xl:table-cell">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                project.voortgang >= 100 ? 'bg-emerald-500' :
                                project.voortgang >= 60 ? 'bg-primary' :
                                project.voortgang >= 30 ? 'bg-blue-500' : 'bg-gray-400'
                              )}
                              style={{ width: `${Math.min(project.voortgang, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                            {project.voortgang}%
                          </span>
                        </div>
                      </td>

                      {/* Startdatum */}
                      <td className="py-3 px-4 text-right hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(project.start_datum)}
                        </span>
                      </td>

                      {/* Acties menu */}
                      <td className="py-3 px-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                window.location.href = `/projecten/${project.id}`
                              }}
                            >
                              Bekijken
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                const csv = [
                                  'Project;' + project.naam,
                                  'Klant;' + klantNaam,
                                  'Status;' + (statusLabels[project.status] || project.status),
                                  'Voortgang;' + project.voortgang + '%',
                                  'Start;' + formatDate(project.start_datum),
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
                              Download CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : weergave === 'tijdlijn' ? (
        /* ==================== TIMELINE / GANTT VIEW ==================== */
        <ProjectTijdlijn projecten={gefilterdeProjecten} />
      ) : (
        /* ==================== GRID VIEW ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {gefilterdeProjecten.map((project, index) => {
            const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
            const isOverdue = new Date(project.eind_datum) < new Date() && project.status !== 'afgerond'
            const budgetPct = project.budget > 0 ? Math.round((project.besteed / project.budget) * 100) : 0
            const budgetWaarschuwing = project.budget > 0 && budgetPct >= (project.budget_waarschuwing_pct ?? 80)

            return (
              <Link
                key={project.id}
                to={`/projecten/${project.id}`}
                className="group block"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 border-gray-200/80 dark:border-gray-700/80 relative">
                  {/* Top accent line */}
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                    project.status === 'actief' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                    project.status === 'afgerond' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                    project.status === 'in-review' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                    project.status === 'on-hold' ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                    'bg-gradient-to-r from-primary to-wm-pale'
                  }`} />

                  <CardContent className="p-5">
                    {/* Header: naam + arrow */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-foreground group-hover:text-accent dark:group-hover:text-primary transition-colors truncate">
                        {project.naam}
                      </h3>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 flex-shrink-0 mt-0.5" />
                    </div>

                    {/* Klant */}
                    <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {klantNaam}
                    </p>

                    {/* Beschrijving snippet */}
                    {project.beschrijving && (
                      <p className="text-xs text-muted-foreground/80 leading-relaxed mb-3 line-clamp-2">
                        {project.beschrijving}
                      </p>
                    )}

                    {/* Status + Prioriteit badges */}
                    <div className="flex items-center gap-2 mb-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button onClick={(e) => e.preventDefault()} className="flex items-center gap-1 group/sbadge">
                            <Badge className={`${getStatusColor(project.status)} text-xs flex items-center gap-1 cursor-pointer`}>
                              {statusIcons[project.status]}
                              {statusLabels[project.status] || project.status}
                              <ChevronDown className="w-2.5 h-2.5 opacity-50 group-hover/sbadge:opacity-100 transition-opacity" />
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                          {statusOpties.filter(s => s.value !== 'alle').map((s) => (
                            <DropdownMenuItem
                              key={s.value}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (s.value !== project.status) {
                                  handleStatusChange(project.id, s.value as Project['status'])
                                }
                              }}
                              className={cn(
                                'flex items-center gap-2 text-sm',
                                s.value === project.status && 'font-semibold'
                              )}
                            >
                              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', getStatusDotColor(s.value))} />
                              {s.label}
                              {s.value === project.status && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Badge className={`${getPriorityColor(project.prioriteit)} text-xs`}>
                        {project.prioriteit.charAt(0).toUpperCase() + project.prioriteit.slice(1)}
                      </Badge>
                      {budgetWaarschuwing && (
                        <Badge className={`text-xs ${budgetPct >= 100
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        }`}>
                          Budget {budgetPct}%
                        </Badge>
                      )}
                      {isOverdue && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs">
                          Verlopen
                        </Badge>
                      )}
                    </div>

                    {/* Voortgang */}
                    <div className="mb-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground font-medium">Voortgang</span>
                        <span className="text-xs font-semibold text-foreground">{project.voortgang}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            project.voortgang >= 100
                              ? 'bg-gradient-to-r from-emerald-400 to-green-500'
                              : project.voortgang >= 60
                              ? 'bg-gradient-to-r from-accent to-primary'
                              : project.voortgang >= 30
                              ? 'bg-gradient-to-r from-primary to-wm-light'
                              : 'bg-gradient-to-r from-gray-300 to-gray-400'
                          }`}
                          style={{ width: `${project.voortgang}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer: team + period */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        <span>{formatDate(project.start_datum)}</span>
                      </div>
                      {project.team_leden.length > 0 && (
                        <div className="flex items-center -space-x-1.5">
                          {project.team_leden.slice(0, 3).map((lid, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center border-2 border-background text-[9px] font-semibold text-accent dark:text-primary"
                              title={lid}
                            >
                              {lid.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {project.team_leden.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border-2 border-background text-[9px] font-medium text-muted-foreground">
                              +{project.team_leden.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ────────────── Gantt / Tijdlijn Component ────────────── */

function ProjectTijdlijn({ projecten }: { projecten: Project[] }) {
  const vandaag = new Date()

  // Bereken tijdsbereik: min start_datum tot max eind_datum (of vandaag + 3 maanden)
  const projectenMetDatums = projecten.filter(p => p.start_datum)
  if (projectenMetDatums.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <GanttChart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Geen projecten met datums voor de tijdlijn</p>
        </CardContent>
      </Card>
    )
  }

  const alleDatums = projectenMetDatums.flatMap(p => {
    const datums = [new Date(p.start_datum)]
    if (p.eind_datum) datums.push(new Date(p.eind_datum))
    return datums
  })
  alleDatums.push(vandaag)

  const minDatum = new Date(Math.min(...alleDatums.map(d => d.getTime())))
  const maxDatum = new Date(Math.max(...alleDatums.map(d => d.getTime())))

  // Voeg marge toe: 2 weken links, 4 weken rechts
  const tijdlijnStart = new Date(minDatum)
  tijdlijnStart.setDate(tijdlijnStart.getDate() - 14)
  const tijdlijnEind = new Date(maxDatum)
  tijdlijnEind.setDate(tijdlijnEind.getDate() + 28)

  const totaalDagen = Math.max(1, Math.ceil((tijdlijnEind.getTime() - tijdlijnStart.getTime()) / (1000 * 60 * 60 * 24)))

  function datumNaarProcent(datum: Date): number {
    const dagen = (datum.getTime() - tijdlijnStart.getTime()) / (1000 * 60 * 60 * 24)
    return (dagen / totaalDagen) * 100
  }

  // Genereer maandlabels
  const maanden: { label: string; pct: number }[] = []
  const cursor = new Date(tijdlijnStart.getFullYear(), tijdlijnStart.getMonth(), 1)
  while (cursor <= tijdlijnEind) {
    const pct = datumNaarProcent(new Date(cursor))
    if (pct >= 0 && pct <= 100) {
      maanden.push({
        label: cursor.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' }),
        pct,
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const vandaagPct = datumNaarProcent(vandaag)

  const statusKleuren: Record<string, string> = {
    gepland: 'bg-blue-400 dark:bg-blue-500',
    actief: 'bg-emerald-500 dark:bg-emerald-400',
    'in-review': 'bg-amber-400 dark:bg-amber-500',
    afgerond: 'bg-green-600 dark:bg-green-500',
    'on-hold': 'bg-orange-400 dark:bg-orange-500',
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Maand headers */}
            <div className="relative h-8 border-b border-gray-200 dark:border-gray-700 mb-2">
              {maanden.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider"
                  style={{ left: `${Math.max(m.pct, 0)}%` }}
                >
                  {m.label}
                </div>
              ))}
              {/* Vandaag markering */}
              {vandaagPct >= 0 && vandaagPct <= 100 && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400 dark:bg-red-500 z-10"
                  style={{ left: `${vandaagPct}%` }}
                >
                  <div className="absolute -top-0.5 -left-1.5 w-3 h-3 bg-red-400 dark:bg-red-500 rounded-full" />
                </div>
              )}
            </div>

            {/* Projectrijen */}
            <div className="space-y-1">
              {projectenMetDatums.map((project) => {
                const start = new Date(project.start_datum)
                const eind = project.eind_datum ? new Date(project.eind_datum) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
                const startPct = datumNaarProcent(start)
                const eindPct = datumNaarProcent(eind)
                const breedte = Math.max(eindPct - startPct, 1)

                return (
                  <div key={project.id} className="relative flex items-center h-10 group">
                    {/* Projectnaam (links) */}
                    <div className="w-[180px] flex-shrink-0 pr-3">
                      <Link
                        to={`/projecten/${project.id}`}
                        className="text-xs font-medium text-foreground truncate block hover:text-accent dark:hover:text-primary transition-colors"
                        title={project.naam}
                      >
                        {project.naam}
                      </Link>
                    </div>

                    {/* Bar area */}
                    <div className="flex-1 relative h-full">
                      {/* Vandaag lijn (verlengd) */}
                      {vandaagPct >= 0 && vandaagPct <= 100 && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-red-200 dark:bg-red-900/40 z-0"
                          style={{ left: `${vandaagPct}%` }}
                        />
                      )}

                      {/* Project bar */}
                      <Link
                        to={`/projecten/${project.id}`}
                        className="absolute top-1.5 h-7 rounded-md flex items-center px-2 text-white text-[10px] font-medium overflow-hidden group-hover:ring-2 ring-offset-1 ring-primary/30 transition-all cursor-pointer"
                        style={{
                          left: `${Math.max(startPct, 0)}%`,
                          width: `${breedte}%`,
                          minWidth: '40px',
                        }}
                        title={`${project.naam} (${project.voortgang}%)`}
                      >
                        {/* Achtergrond kleur */}
                        <div className={cn('absolute inset-0 opacity-90', statusKleuren[project.status] || 'bg-gray-400')} />
                        {/* Voortgang overlay */}
                        <div
                          className="absolute inset-y-0 left-0 bg-white/20 rounded-l-md"
                          style={{ width: `${project.voortgang}%` }}
                        />
                        <span className="relative z-10 truncate">{project.voortgang}%</span>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              {Object.entries(statusKleuren).map(([status, kleur]) => (
                <div key={status} className="flex items-center gap-1.5 text-xs">
                  <div className={cn('w-3 h-3 rounded', kleur)} />
                  <span className="text-muted-foreground capitalize">{status}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs ml-auto">
                <div className="w-3 h-0.5 bg-red-400 dark:bg-red-500" />
                <span className="text-muted-foreground">Vandaag</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
