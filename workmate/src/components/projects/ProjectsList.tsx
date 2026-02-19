import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  FolderKanban,
  TrendingUp,
  Clock,
  DollarSign,
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
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  cn,
  formatCurrency,
  formatDate,
  getStatusColor,
  getPriorityColor,
} from '@/lib/utils'
import { exportCSV, exportExcel } from '@/lib/export'
import { getProjecten, getKlanten } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Project, Klant } from '@/types'

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
    case 'gepland': return 'border-l-[#58B09C]'
    case 'in-review': return 'border-l-amber-500'
    case 'afgerond': return 'border-l-emerald-500'
    case 'on-hold': return 'border-l-red-500'
    default: return 'border-l-gray-400'
  }
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'actief': return 'bg-green-500'
    case 'gepland': return 'bg-[#58B09C]'
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
  const [weergave, setWeergave] = useState<'grid' | 'list'>('grid')
  const [sortField, setSortField] = useState<'naam' | 'voortgang' | 'budget' | 'eind_datum'>('eind_datum')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [projectenData, klantenData] = await Promise.all([
          getProjecten(),
          getKlanten(),
        ])
        setProjecten(projectenData)
        setKlanten(klantenData)
      } catch (error) {
        console.error('Fout bij ophalen data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  function getKlantNaam(klantId: string): string {
    const klant = klanten.find((k) => k.id === klantId)
    return klant ? klant.bedrijfsnaam : 'Onbekend'
  }

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
        case 'budget':
          cmp = a.budget - b.budget
          break
        case 'eind_datum':
          cmp = new Date(a.eind_datum).getTime() - new Date(b.eind_datum).getTime()
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [projecten, klanten, zoekterm, statusFilter, prioriteitFilter, sortField, sortDir])

  function handleSort(field: typeof sortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Briefing stats
  const briefing = useMemo(() => {
    const actief = projecten.filter((p) => p.status === 'actief').length
    const afgerond = projecten.filter((p) => p.status === 'afgerond').length
    const overdue = projecten.filter(
      (p) => new Date(p.eind_datum) < new Date() && p.status !== 'afgerond'
    ).length
    const totaalBudget = projecten.reduce((sum, p) => sum + p.budget, 0)
    const totaalBesteed = projecten.reduce((sum, p) => sum + p.besteed, 0)
    const gemiddeldeVoortgang = projecten.length > 0
      ? Math.round(projecten.reduce((sum, p) => sum + p.voortgang, 0) / projecten.length)
      : 0

    return { actief, afgerond, overdue, totaalBudget, totaalBesteed, gemiddeldeVoortgang }
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
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#386150] to-[#58B09C] flex items-center justify-center shadow-lg shadow-[#58B09C]/20">
            <FolderKanban className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projecten</h1>
            <p className="text-sm text-muted-foreground">
              {gefilterdeProjecten.length} van {projecten.length} projecten
            </p>
          </div>
        </div>
        <Button asChild className="bg-gradient-to-r from-[#386150] to-[#58B09C] hover:from-[#2d4f40] hover:to-[#4a9a88] shadow-lg shadow-[#58B09C]/25 border-0">
          <Link to="/projecten/nieuw">
            <Plus className="mr-2 h-4 w-4" />
            Nieuw Project
          </Link>
        </Button>
      </div>

      {/* ── Project Briefing ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3D3522] via-[#386150] to-[#3D3522] p-6 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#58B09C] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#CAF7E2] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-[#CAF7E2]" />
            <h2 className="text-lg font-semibold text-white">Project Briefing</h2>
            <span className="text-xs text-[#CAF7E2]/70 ml-auto">
              {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Totaal */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <FolderKanban className="h-4 w-4 text-[#CAF7E2]" />
                <span className="text-xs text-[#CAF7E2]/80 uppercase tracking-wider font-medium">Totaal</span>
              </div>
              <p className="text-2xl font-bold">{projecten.length}</p>
              <p className="text-xs text-[#CAF7E2]/60 mt-0.5">projecten</p>
            </div>

            {/* Actief */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-xs text-[#CAF7E2]/80 uppercase tracking-wider font-medium">Actief</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{briefing.actief}</p>
              <p className="text-xs text-[#CAF7E2]/60 mt-0.5">lopend</p>
            </div>

            {/* Afgerond */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-[#CAF7E2]/80 uppercase tracking-wider font-medium">Klaar</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{briefing.afgerond}</p>
              <p className="text-xs text-[#CAF7E2]/60 mt-0.5">afgerond</p>
            </div>

            {/* Verlopen */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-[#CAF7E2]/80 uppercase tracking-wider font-medium">Verlopen</span>
              </div>
              <p className={`text-2xl font-bold ${briefing.overdue > 0 ? 'text-amber-400' : 'text-white'}`}>
                {briefing.overdue}
              </p>
              <p className="text-xs text-[#CAF7E2]/60 mt-0.5">over deadline</p>
            </div>

            {/* Budget */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-[#7dd3b8]" />
                <span className="text-xs text-[#CAF7E2]/80 uppercase tracking-wider font-medium">Budget</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(briefing.totaalBudget)}</p>
              <p className="text-xs text-[#CAF7E2]/60 mt-0.5">
                {formatCurrency(briefing.totaalBesteed)} besteed
              </p>
            </div>

            {/* Voortgang */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-[#CAF7E2]" />
                <span className="text-xs text-[#CAF7E2]/80 uppercase tracking-wider font-medium">Voortgang</span>
              </div>
              <p className="text-2xl font-bold">{briefing.gemiddeldeVoortgang}%</p>
              <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#58B09C] to-[#CAF7E2] rounded-full transition-all duration-700"
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
                const headers = ['Project', 'Klant', 'Status', 'Prioriteit', 'Budget', 'Besteed', 'Voortgang', 'Deadline']
                const rows = gefilterdeProjecten.map((p) => ({
                  Project: p.naam,
                  Klant: p.klant_naam || getKlantNaam(p.klant_id),
                  Status: statusLabels[p.status] || p.status,
                  Prioriteit: p.prioriteit,
                  Budget: p.budget,
                  Besteed: p.besteed,
                  Voortgang: p.voortgang + '%',
                  Deadline: formatDate(p.eind_datum),
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
                const headers = ['Project', 'Klant', 'Status', 'Prioriteit', 'Budget', 'Besteed', 'Voortgang', 'Deadline']
                const rows = gefilterdeProjecten.map((p) => ({
                  Project: p.naam,
                  Klant: p.klant_naam || getKlantNaam(p.klant_id),
                  Status: statusLabels[p.status] || p.status,
                  Prioriteit: p.prioriteit,
                  Budget: p.budget,
                  Besteed: p.besteed,
                  Voortgang: p.voortgang,
                  Deadline: formatDate(p.eind_datum),
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
              className="rounded-l-none h-9 w-9"
              onClick={() => setWeergave('list')}
              title="Tabelweergave"
            >
              <List className="w-4 h-4" />
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
                  ? 'bg-[#58B09C]/10 text-[#386150] dark:bg-[#58B09C]/20 dark:text-[#7dd3b8]'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {optie.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Sort toolbar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowUpDown className="w-3 h-3" />
          <span>Sorteer:</span>
          {([
            { field: 'naam' as const, label: 'Naam' },
            { field: 'voortgang' as const, label: 'Voortgang' },
            { field: 'budget' as const, label: 'Budget' },
            { field: 'eind_datum' as const, label: 'Deadline' },
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
            <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Geen projecten gevonden</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Pas je zoekcriteria aan of maak een nieuw project aan.
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
                  <th className="text-left py-3 px-4">
                    <button
                      onClick={() => handleSort('naam')}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                    >
                      Project
                      {sortField === 'naam' ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PM</span>
                  </th>
                  <th className="text-left py-3 px-4">
                    <button
                      onClick={() => handleSort('eind_datum')}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                    >
                      Deadline
                      {sortField === 'eind_datum' ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                  </th>
                  <th className="text-right py-3 px-4">
                    <button
                      onClick={() => handleSort('budget')}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors ml-auto"
                    >
                      Waarde
                      {sortField === 'budget' ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
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
                  <th className="text-center py-3 px-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Downloads</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {gefilterdeProjecten.map((project) => {
                  const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
                  const isOverdue = new Date(project.eind_datum) < new Date() && project.status !== 'afgerond'
                  const daysLeft = Math.ceil((new Date(project.eind_datum).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

                  return (
                    <tr
                      key={project.id}
                      className={cn(
                        'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors border-l-4',
                        getStatusBorderColor(project.status)
                      )}
                      onClick={() => window.location.href = `/projecten/${project.id}`}
                    >
                      {/* Project naam + klant */}
                      <td className="py-3 px-4">
                        <div>
                          <Link
                            to={`/projecten/${project.id}`}
                            className="text-sm font-semibold text-foreground hover:text-[#386150] dark:hover:text-[#58B09C] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {project.naam}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {klantNaam}
                          </p>
                        </div>
                      </td>

                      {/* PM / Team */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          {project.team_leden.length > 0 ? (
                            <>
                              <div className="w-7 h-7 rounded-full bg-[#58B09C]/10 dark:bg-[#58B09C]/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-semibold text-[#386150] dark:text-[#58B09C]">
                                  {project.team_leden[0].charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm text-foreground truncate max-w-[120px]">
                                {project.team_leden[0]}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>

                      {/* Deadline */}
                      <td className="py-3 px-4">
                        <div>
                          <span className={cn(
                            'text-sm font-medium',
                            isOverdue ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                          )}>
                            {formatDate(project.eind_datum)}
                          </span>
                          <p className={cn(
                            'text-[10px] mt-0.5',
                            isOverdue ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground'
                          )}>
                            {isOverdue
                              ? `${Math.abs(daysLeft)}d verlopen`
                              : project.status === 'afgerond'
                              ? 'Afgerond'
                              : `${daysLeft}d resterend`}
                          </p>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', getStatusDotColor(project.status))} />
                          <Badge className={cn('text-xs', getStatusColor(project.status))}>
                            {statusLabels[project.status] || project.status}
                          </Badge>
                        </div>
                      </td>

                      {/* Waarde / Budget */}
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(project.budget)}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatCurrency(project.besteed)} besteed
                        </p>
                      </td>

                      {/* Voortgang */}
                      <td className="py-3 px-4 hidden xl:table-cell">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-20 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                project.voortgang >= 100 ? 'bg-emerald-500' :
                                project.voortgang >= 60 ? 'bg-[#58B09C]' :
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

                      {/* Downloads */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Generate project summary CSV
                              const csv = [
                                'Project;' + project.naam,
                                'Klant;' + klantNaam,
                                'Status;' + (statusLabels[project.status] || project.status),
                                'Budget;' + formatCurrency(project.budget),
                                'Besteed;' + formatCurrency(project.besteed),
                                'Voortgang;' + project.voortgang + '%',
                                'Start;' + formatDate(project.start_datum),
                                'Deadline;' + formatDate(project.eind_datum),
                              ].join('\n')
                              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `${project.naam.replace(/\s+/g, '-').toLowerCase()}.csv`
                              a.click()
                              URL.revokeObjectURL(url)
                            }}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Download CSV"
                          >
                            <FileText className="w-4 h-4 text-muted-foreground hover:text-blue-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* ==================== GRID VIEW ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {gefilterdeProjecten.map((project, index) => {
            const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
            const isOverdue = new Date(project.eind_datum) < new Date() && project.status !== 'afgerond'
            const budgetPercentage = project.budget > 0 ? Math.round((project.besteed / project.budget) * 100) : 0
            const budgetOverschrijding = project.besteed > project.budget
            const daysLeft = Math.ceil((new Date(project.eind_datum).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

            return (
              <Link
                key={project.id}
                to={`/projecten/${project.id}`}
                className="group block"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[#58B09C]/5 hover:-translate-y-0.5 border-gray-200/80 dark:border-gray-700/80 relative">
                  {/* Top accent line */}
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                    project.status === 'actief' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                    project.status === 'afgerond' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                    project.status === 'in-review' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                    project.status === 'on-hold' ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                    'bg-gradient-to-r from-[#58B09C] to-[#CAF7E2]'
                  }`} />

                  <CardContent className="p-5">
                    {/* Header: naam + badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground group-hover:text-[#386150] dark:group-hover:text-[#58B09C] transition-colors truncate">
                          {project.naam}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {klantNaam}
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 flex-shrink-0 mt-1" />
                    </div>

                    {/* Status + Prioriteit badges */}
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className={`${getStatusColor(project.status)} text-xs flex items-center gap-1`}>
                        {statusIcons[project.status]}
                        {statusLabels[project.status] || project.status}
                      </Badge>
                      <Badge className={`${getPriorityColor(project.prioriteit)} text-xs`}>
                        {project.prioriteit.charAt(0).toUpperCase() + project.prioriteit.slice(1)}
                      </Badge>
                      {isOverdue && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs">
                          Verlopen
                        </Badge>
                      )}
                    </div>

                    {/* Voortgang */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground font-medium">Voortgang</span>
                        <span className="text-xs font-semibold text-foreground">{project.voortgang}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            project.voortgang >= 100
                              ? 'bg-gradient-to-r from-emerald-400 to-green-500'
                              : project.voortgang >= 60
                              ? 'bg-gradient-to-r from-[#386150] to-[#58B09C]'
                              : project.voortgang >= 30
                              ? 'bg-gradient-to-r from-[#58B09C] to-[#7dd3b8]'
                              : 'bg-gradient-to-r from-gray-300 to-gray-400'
                          }`}
                          style={{ width: `${project.voortgang}%` }}
                        />
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {/* Budget */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Budget</p>
                        <p className="font-semibold text-foreground text-sm">{formatCurrency(project.budget)}</p>
                        <p className={`text-[10px] mt-0.5 ${budgetOverschrijding ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                          {budgetPercentage}% besteed
                        </p>
                      </div>

                      {/* Deadline */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Deadline</p>
                        <p className={`font-semibold text-sm ${isOverdue ? 'text-red-500' : 'text-foreground'}`}>
                          {formatDate(project.eind_datum)}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {isOverdue
                            ? `${Math.abs(daysLeft)} dagen verlopen`
                            : project.status === 'afgerond'
                            ? 'Afgerond'
                            : `${daysLeft} dagen resterend`}
                        </p>
                      </div>
                    </div>

                    {/* Footer: team + period */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        <span>{formatDate(project.start_datum)} — {formatDate(project.eind_datum)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{project.team_leden.length}</span>
                      </div>
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
