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
    case 'actief': return 'bg-green-500'
    case 'gepland': return 'bg-blue-500'
    case 'in-review': return 'bg-amber-500'
    case 'afgerond': return 'bg-emerald-500'
    case 'on-hold': return 'bg-red-500'
    case 'te-factureren': return 'bg-indigo-500'
    default: return 'bg-gray-400'
  }
}

function getStatusBorderColor(status: string): string {
  switch (status) {
    case 'actief': return 'border-l-green-500'
    case 'gepland': return 'border-l-blue-500'
    case 'in-review': return 'border-l-amber-500'
    case 'afgerond': return 'border-l-emerald-500'
    case 'on-hold': return 'border-l-red-500'
    case 'te-factureren': return 'border-l-indigo-500'
    default: return 'border-l-gray-400'
  }
}

function getStatusCellBg(status: string): string {
  switch (status) {
    case 'actief': return 'bg-green-50/50 dark:bg-green-950/20'
    case 'gepland': return 'bg-blue-50/50 dark:bg-blue-950/20'
    case 'in-review': return 'bg-amber-50/50 dark:bg-amber-950/20'
    case 'afgerond': return 'bg-emerald-50/50 dark:bg-emerald-950/20'
    case 'on-hold': return 'bg-red-50/50 dark:bg-red-950/20'
    case 'te-factureren': return 'bg-indigo-50/50 dark:bg-indigo-950/20'
    default: return 'bg-gray-50/50 dark:bg-gray-800/20'
  }
}

export function ProjectsList() {
  const { user } = useAuth()
  const [projecten, setProjecten] = useState<Project[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [zoekterm, setZoekterm] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [sortField, setSortField] = useState<'naam' | 'voortgang' | 'start_datum'>('start_datum')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

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

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'naam':
          cmp = a.naam.localeCompare(b.naam, 'nl')
          break
        case 'voortgang':
          cmp = a.voortgang - b.voortgang
          break
        case 'start_datum':
          cmp = new Date(a.start_datum || a.created_at).getTime() - new Date(b.start_datum || b.created_at).getTime()
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [projecten, klanten, zoekterm, statusFilter, sortField, sortDir])

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

  // Stats
  const stats = useMemo(() => {
    const actief = projecten.filter((p) => p.status === 'actief').length
    const teFactureren = projecten.filter((p) => p.status === 'te-factureren').length
    const afgerond = projecten.filter((p) => p.status === 'afgerond').length
    const overdue = projecten.filter(
      (p) => p.eind_datum && new Date(p.eind_datum) < new Date() && p.status !== 'afgerond'
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
    <div className="space-y-5 animate-fade-in-up">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
            <FolderKanban className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Projecten</h1>
            <p className="text-xs text-muted-foreground">
              {gefilterdeProjecten.length} van {projecten.length} projecten
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="bg-gradient-to-r from-accent to-primary border-0">
          <Link to="/projecten/nieuw">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nieuw project
          </Link>
        </Button>
      </div>

      {/* ── Quick stats ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {stats.actief > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 px-2.5 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            {stats.actief} actief
          </div>
        )}
        {stats.teFactureren > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30 px-2.5 py-1 rounded-full">
            <Receipt className="w-3 h-3" />
            {stats.teFactureren} te factureren
          </div>
        )}
        {stats.overdue > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {stats.overdue} verlopen
          </div>
        )}
        {stats.afgerond > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            {stats.afgerond} afgerond
          </div>
        )}
      </div>

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

        <div className="flex items-center gap-1.5 flex-wrap flex-1">
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
                  'px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                  statusFilter === optie.value
                    ? 'bg-foreground text-background'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                )}
              >
                {optie.label}
                {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
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
            <Download className="w-3.5 h-3.5 mr-1" />
            CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
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
            <FileText className="w-3.5 h-3.5 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      {gefilterdeProjecten.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-medium text-foreground">Geen projecten gevonden</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {zoekterm || statusFilter !== 'alle'
                ? 'Pas je filters aan of maak een nieuw project aan.'
                : 'Start je eerste project.'}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/projecten/nieuw">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nieuw project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-2.5 px-4 w-[110px]">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                </th>
                <th className="text-left py-2.5 px-4">
                  <button
                    onClick={() => handleSort('naam')}
                    className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    Project
                    {sortField === 'naam' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-left py-2.5 px-4 hidden lg:table-cell">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Klant</span>
                </th>
                <th className="text-left py-2.5 px-4 hidden md:table-cell">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Team</span>
                </th>
                <th className="text-right py-2.5 px-4 hidden xl:table-cell">
                  <button
                    onClick={() => handleSort('voortgang')}
                    className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors ml-auto"
                  >
                    Voortgang
                    {sortField === 'voortgang' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-right py-2.5 px-4 hidden lg:table-cell">
                  <button
                    onClick={() => handleSort('start_datum')}
                    className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors ml-auto"
                  >
                    Deadline
                    {sortField === 'start_datum' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="w-10 py-2.5 px-2" />
              </tr>
            </thead>
            <tbody>
              {gefilterdeProjecten.map((project) => {
                const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
                const contactpersoon = getKlantContactpersoon(project.klant_id)
                const isOverdue = project.eind_datum && new Date(project.eind_datum) < new Date() && project.status !== 'afgerond'

                return (
                  <tr
                    key={project.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group"
                    onClick={() => window.location.href = `/projecten/${project.id}`}
                  >
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
                          <Link
                            to={`/projecten/${project.id}`}
                            className="text-sm font-medium text-foreground hover:text-accent dark:hover:text-primary transition-colors block truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {project.naam}
                          </Link>
                          {project.beschrijving && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[300px] mt-0.5">
                              {project.beschrijving}
                            </p>
                          )}
                        </div>
                        <Badge className={cn(getPriorityColor(project.prioriteit), 'text-[9px] px-1.5 py-0 flex-shrink-0')}>
                          {project.prioriteit}
                        </Badge>
                        {isOverdue && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[9px] px-1.5 py-0 flex-shrink-0">
                            Verlopen
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Klant */}
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="text-sm text-foreground">{klantNaam}</span>
                      {contactpersoon && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{contactpersoon}</p>
                      )}
                    </td>

                    {/* Team */}
                    <td className="py-3 px-4 hidden md:table-cell">
                      {project.team_leden.length > 0 ? (
                        <div className="flex items-center -space-x-1">
                          {project.team_leden.slice(0, 3).map((lid, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center border-2 border-white dark:border-gray-900 text-[9px] font-semibold text-accent dark:text-primary"
                              title={lid}
                            >
                              {lid.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {project.team_leden.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border-2 border-white dark:border-gray-900 text-[9px] font-medium text-muted-foreground">
                              +{project.team_leden.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
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
                              project.voortgang >= 30 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                            )}
                            style={{ width: `${Math.min(project.voortgang, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground w-8 text-right tabular-nums">
                          {project.voortgang}%
                        </span>
                      </div>
                    </td>

                    {/* Datum */}
                    <td className="py-3 px-4 text-right hidden lg:table-cell">
                      {project.eind_datum && project.status !== 'afgerond' ? (() => {
                        const daysLeft = Math.ceil((new Date(project.eind_datum).getTime() - Date.now()) / 86400000)
                        return (
                          <div>
                            <span className={cn(
                              'text-xs tabular-nums',
                              isOverdue ? 'text-red-600 dark:text-red-400 font-medium' :
                              daysLeft <= 7 ? 'text-amber-600 dark:text-amber-400 font-medium' :
                              'text-muted-foreground'
                            )}>
                              {formatDate(project.eind_datum)}
                            </span>
                            <p className={cn(
                              'text-[10px] mt-0.5',
                              isOverdue ? 'text-red-500' :
                              daysLeft <= 7 ? 'text-amber-500' :
                              'text-muted-foreground/60'
                            )}>
                              {isOverdue
                                ? `${Math.abs(daysLeft)}d verlopen`
                                : `${daysLeft}d resterend`}
                            </p>
                          </div>
                        )
                      })() : (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(project.eind_datum || project.start_datum)}
                        </span>
                      )}
                    </td>

                    {/* Menu */}
                    <td className="py-3 px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
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
                            Export
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
      )}
    </div>
  )
}
