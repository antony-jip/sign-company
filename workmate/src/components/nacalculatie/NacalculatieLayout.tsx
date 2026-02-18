import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  BarChart3,
  Download,
  FileText,
  Eye,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  Calculator,
  Clock,
  Loader2,
} from 'lucide-react'
import { getProjecten, getOffertes, getOfferteItems, getTijdregistraties, getFacturen } from '@/services/supabaseService'
import type { Project, Offerte, OfferteItem, Tijdregistratie, Factuur } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'
import { exportCSV, exportExcel } from '@/lib/export'
import { toast } from 'sonner'

// Demo data
const demoProjecten: Project[] = [
  { id: 'np1', user_id: 'demo', klant_id: 'k1', klant_naam: 'Bakkerij De Boer', naam: 'Gevelreclame nieuw pand', beschrijving: '', status: 'afgerond', prioriteit: 'hoog', start_datum: '2025-10-01', eind_datum: '2025-11-15', budget: 4850, besteed: 4200, voortgang: 100, team_leden: [], created_at: '2025-10-01', updated_at: '2025-11-15' },
  { id: 'np2', user_id: 'demo', klant_id: 'k2', klant_naam: 'Van Dalen Bouw BV', naam: 'Bouwborden project Medemblik', beschrijving: '', status: 'afgerond', prioriteit: 'medium', start_datum: '2025-11-01', eind_datum: '2025-12-01', budget: 2200, besteed: 2650, voortgang: 100, team_leden: [], created_at: '2025-11-01', updated_at: '2025-12-01' },
  { id: 'np3', user_id: 'demo', klant_id: 'k3', klant_naam: 'Supermarkt Plus Enkhuizen', naam: 'Lichtreclame vernieuwing', beschrijving: '', status: 'afgerond', prioriteit: 'hoog', start_datum: '2025-12-01', eind_datum: '2026-01-20', budget: 8900, besteed: 7800, voortgang: 100, team_leden: [], created_at: '2025-12-01', updated_at: '2026-01-20' },
  { id: 'np4', user_id: 'demo', klant_id: 'k4', klant_naam: 'Van Dalen Bouw BV', naam: 'Bedrijfswagen belettering', beschrijving: '', status: 'afgerond', prioriteit: 'laag', start_datum: '2025-09-01', eind_datum: '2025-09-15', budget: 1650, besteed: 1400, voortgang: 100, team_leden: [], created_at: '2025-09-01', updated_at: '2025-09-15' },
  { id: 'np5', user_id: 'demo', klant_id: 'k5', klant_naam: 'Hotel West-Friesland', naam: 'Bewegwijzering hotel', beschrijving: '', status: 'afgerond', prioriteit: 'hoog', start_datum: '2026-01-01', eind_datum: '2026-02-01', budget: 12500, besteed: 14200, voortgang: 100, team_leden: [], created_at: '2026-01-01', updated_at: '2026-02-01' },
  { id: 'np6', user_id: 'demo', klant_id: 'k1', klant_naam: 'Bakkerij De Boer', naam: 'Raamstickers seizoensactie', beschrijving: '', status: 'afgerond', prioriteit: 'laag', start_datum: '2026-01-15', eind_datum: '2026-02-01', budget: 380, besteed: 310, voortgang: 100, team_leden: [], created_at: '2026-01-15', updated_at: '2026-02-01' },
]

const demoOffertes: Offerte[] = [
  { id: 'no1', user_id: 'demo', klant_id: 'k1', klant_naam: 'Bakkerij De Boer', project_id: 'np1', nummer: 'SC-2025-045', titel: 'Gevelreclame', status: 'goedgekeurd', subtotaal: 4850, btw_bedrag: 1018.5, totaal: 5868.5, geldig_tot: '2025-11-01', notities: '', voorwaarden: '', created_at: '2025-10-01', updated_at: '2025-10-01' },
  { id: 'no2', user_id: 'demo', klant_id: 'k2', klant_naam: 'Van Dalen Bouw BV', project_id: 'np2', nummer: 'SC-2025-051', titel: 'Bouwborden', status: 'goedgekeurd', subtotaal: 2200, btw_bedrag: 462, totaal: 2662, geldig_tot: '2025-12-01', notities: '', voorwaarden: '', created_at: '2025-11-01', updated_at: '2025-11-01' },
  { id: 'no3', user_id: 'demo', klant_id: 'k3', klant_naam: 'Supermarkt Plus', project_id: 'np3', nummer: 'SC-2025-078', titel: 'Lichtreclame', status: 'goedgekeurd', subtotaal: 8900, btw_bedrag: 1869, totaal: 10769, geldig_tot: '2026-01-01', notities: '', voorwaarden: '', created_at: '2025-12-01', updated_at: '2025-12-01' },
  { id: 'no4', user_id: 'demo', klant_id: 'k4', klant_naam: 'Van Dalen Bouw BV', project_id: 'np4', nummer: 'SC-2025-039', titel: 'Wagenbelettering', status: 'goedgekeurd', subtotaal: 1650, btw_bedrag: 346.5, totaal: 1996.5, geldig_tot: '2025-10-01', notities: '', voorwaarden: '', created_at: '2025-09-01', updated_at: '2025-09-01' },
  { id: 'no5', user_id: 'demo', klant_id: 'k5', klant_naam: 'Hotel West-Friesland', project_id: 'np5', nummer: 'SC-2026-003', titel: 'Bewegwijzering', status: 'goedgekeurd', subtotaal: 12500, btw_bedrag: 2625, totaal: 15125, geldig_tot: '2026-02-01', notities: '', voorwaarden: '', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'no6', user_id: 'demo', klant_id: 'k1', klant_naam: 'Bakkerij De Boer', project_id: 'np6', nummer: 'SC-2026-010', titel: 'Raamstickers', status: 'goedgekeurd', subtotaal: 380, btw_bedrag: 79.8, totaal: 459.8, geldig_tot: '2026-02-15', notities: '', voorwaarden: '', created_at: '2026-01-15', updated_at: '2026-01-15' },
]

const demoTijdregistraties: Tijdregistratie[] = [
  { id: 'nt1', user_id: 'demo', project_id: 'np1', project_naam: 'Gevelreclame nieuw pand', omschrijving: 'Montage gevelletters', datum: '2025-11-10', start_tijd: '08:00', eind_tijd: '16:00', duur_minuten: 480, uurtarief: 65, facturabel: true, gefactureerd: true, created_at: '', updated_at: '' },
  { id: 'nt2', user_id: 'demo', project_id: 'np1', project_naam: 'Gevelreclame nieuw pand', omschrijving: 'Ontwerp en productie', datum: '2025-10-20', start_tijd: '09:00', eind_tijd: '17:00', duur_minuten: 480, uurtarief: 55, facturabel: true, gefactureerd: true, created_at: '', updated_at: '' },
  { id: 'nt3', user_id: 'demo', project_id: 'np2', project_naam: 'Bouwborden project Medemblik', omschrijving: 'Productie en montage borden', datum: '2025-11-20', start_tijd: '07:00', eind_tijd: '16:00', duur_minuten: 540, uurtarief: 65, facturabel: true, gefactureerd: true, created_at: '', updated_at: '' },
  { id: 'nt4', user_id: 'demo', project_id: 'np3', project_naam: 'Lichtreclame vernieuwing', omschrijving: 'Demontage oud + montage nieuw', datum: '2026-01-15', start_tijd: '07:00', eind_tijd: '18:00', duur_minuten: 660, uurtarief: 65, facturabel: true, gefactureerd: true, created_at: '', updated_at: '' },
  { id: 'nt5', user_id: 'demo', project_id: 'np3', project_naam: 'Lichtreclame vernieuwing', omschrijving: 'Elektrische aansluiting en keuring', datum: '2026-01-17', start_tijd: '09:00', eind_tijd: '14:00', duur_minuten: 300, uurtarief: 75, facturabel: true, gefactureerd: true, created_at: '', updated_at: '' },
  { id: 'nt6', user_id: 'demo', project_id: 'np5', project_naam: 'Bewegwijzering hotel', omschrijving: 'Productie bewegwijzering', datum: '2026-01-20', start_tijd: '08:00', eind_tijd: '17:00', duur_minuten: 540, uurtarief: 55, facturabel: true, gefactureerd: false, created_at: '', updated_at: '' },
  { id: 'nt7', user_id: 'demo', project_id: 'np5', project_naam: 'Bewegwijzering hotel', omschrijving: 'Montage dag 1', datum: '2026-01-27', start_tijd: '07:00', eind_tijd: '17:00', duur_minuten: 600, uurtarief: 65, facturabel: true, gefactureerd: false, created_at: '', updated_at: '' },
  { id: 'nt8', user_id: 'demo', project_id: 'np5', project_naam: 'Bewegwijzering hotel', omschrijving: 'Montage dag 2 + oplevering', datum: '2026-01-28', start_tijd: '07:00', eind_tijd: '16:00', duur_minuten: 540, uurtarief: 65, facturabel: true, gefactureerd: false, created_at: '', updated_at: '' },
]

interface ProjectAnalysis {
  project: Project
  offerte: Offerte | null
  offerteBedrag: number
  werkelijkeKosten: number
  tijdKosten: number
  materiaalKosten: number
  verschil: number
  margePercentage: number
  tijdRegistraties: Tijdregistratie[]
}

export function NacalculatieLayout() {
  const [projecten, setProjecten] = useState<Project[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [tijdregistraties, setTijdregistraties] = useState<Tijdregistratie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<ProjectAnalysis | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [sortField, setSortField] = useState<'naam' | 'marge' | 'verschil'>('marge')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    Promise.all([
      getProjecten().catch(() => []),
      getOffertes().catch(() => []),
      getTijdregistraties().catch(() => []),
    ]).then(([proj, off, tijd]) => {
      setProjecten(proj.length > 0 ? proj : demoProjecten)
      setOffertes(off.length > 0 ? off : demoOffertes)
      setTijdregistraties(tijd.length > 0 ? tijd : demoTijdregistraties)
    }).finally(() => setIsLoading(false))
  }, [])

  const afgerondeProjecten = useMemo(() => {
    return projecten.filter((p) => p.status === 'afgerond')
  }, [projecten])

  const analyses = useMemo((): ProjectAnalysis[] => {
    return afgerondeProjecten.map((project) => {
      const offerte = offertes.find((o) => o.project_id === project.id) || null
      const offerteBedrag = offerte?.subtotaal || project.budget
      const projectTijd = tijdregistraties.filter((t) => t.project_id === project.id)
      const tijdKosten = projectTijd.reduce((sum, t) => sum + (t.duur_minuten / 60) * t.uurtarief, 0)
      const materiaalKosten = project.besteed - tijdKosten > 0 ? project.besteed - tijdKosten : project.besteed * 0.6
      const werkelijkeKosten = project.besteed || tijdKosten + materiaalKosten
      const verschil = offerteBedrag - werkelijkeKosten
      const margePercentage = offerteBedrag > 0 ? (verschil / offerteBedrag) * 100 : 0

      return {
        project,
        offerte,
        offerteBedrag,
        werkelijkeKosten,
        tijdKosten,
        materiaalKosten,
        verschil,
        margePercentage,
        tijdRegistraties: projectTijd,
      }
    })
  }, [afgerondeProjecten, offertes, tijdregistraties])

  const sortedAnalyses = useMemo(() => {
    return [...analyses].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'naam': cmp = a.project.naam.localeCompare(b.project.naam); break
        case 'marge': cmp = a.margePercentage - b.margePercentage; break
        case 'verschil': cmp = a.verschil - b.verschil; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [analyses, sortField, sortDir])

  const totals = useMemo(() => {
    const bovenBudget = analyses.filter((a) => a.verschil > 0).length
    const onderBudget = analyses.filter((a) => a.verschil < 0).length
    const gemMarge = analyses.length > 0
      ? analyses.reduce((s, a) => s + a.margePercentage, 0) / analyses.length
      : 0
    const totVerschil = analyses.reduce((s, a) => s + a.verschil, 0)
    return { bovenBudget, onderBudget, gemMarge, totVerschil }
  }, [analyses])

  const handleSort = (field: 'naam' | 'marge' | 'verschil') => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const handleExport = () => {
    const headers = ['Project', 'Klant', 'Offerte bedrag', 'Werkelijke kosten', 'Verschil', 'Marge %']
    const rows = analyses.map((a) => [
      a.project.naam, a.project.klant_naam || '', a.offerteBedrag.toFixed(2),
      a.werkelijkeKosten.toFixed(2), a.verschil.toFixed(2), a.margePercentage.toFixed(1),
    ])
    exportExcel('nacalculatie', headers, rows, 'Nacalculatie')
    toast.success('Export gedownload')
  }

  const openDetail = (analysis: ProjectAnalysis) => {
    setSelectedProject(analysis)
    setDetailOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Calculator className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Nacalculatie</h1>
            <p className="text-sm text-muted-foreground">Vergelijk offertes met werkelijke kosten</p>
          </div>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exporteren
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gem. marge</p>
                <p className={cn('text-2xl font-bold mt-1', totals.gemMarge >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {totals.gemMarge.toFixed(1)}%
                </p>
              </div>
              <div className={cn('p-3 rounded-xl', totals.gemMarge >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                <BarChart3 className={cn('w-5 h-5', totals.gemMarge >= 0 ? 'text-emerald-600' : 'text-red-600')} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Onder budget</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{totals.bovenBudget}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Boven budget</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{totals.onderBudget}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Totaal verschil</p>
                <p className={cn('text-2xl font-bold mt-1', totals.totVerschil >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {formatCurrency(totals.totVerschil)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            Projectoverzicht
          </CardTitle>
          <CardDescription>
            Afgeronde projecten met vergelijking offertebedrag vs. werkelijke kosten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Sort toolbar */}
          <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
            <ArrowUpDown className="w-3 h-3" />
            <span>Sorteer:</span>
            {([
              { field: 'naam' as const, label: 'Naam' },
              { field: 'marge' as const, label: 'Marge' },
              { field: 'verschil' as const, label: 'Verschil' },
            ]).map(({ field, label }) => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={cn(
                  'px-2 py-0.5 rounded transition-colors',
                  sortField === field ? 'text-blue-700 dark:text-blue-300 font-medium' : 'hover:text-foreground'
                )}
              >
                {label}
                {sortField === field && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
            ))}
          </div>

          {/* Table */}
          {sortedAnalyses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Geen afgeronde projecten</p>
              <p className="text-sm mt-1">Nacalculatie is beschikbaar zodra projecten zijn afgerond.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 pr-4">Project</th>
                    <th className="pb-3 pr-4">Klant</th>
                    <th className="pb-3 pr-4 text-right">Offerte</th>
                    <th className="pb-3 pr-4 text-right">Werkelijk</th>
                    <th className="pb-3 pr-4 text-right">Verschil</th>
                    <th className="pb-3 pr-4 text-right">Marge</th>
                    <th className="pb-3 pr-4">Indicator</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedAnalyses.map((a) => {
                    const isPositive = a.verschil >= 0
                    const isClose = Math.abs(a.margePercentage) < 5
                    const borderColor = isPositive
                      ? 'border-l-emerald-500'
                      : isClose ? 'border-l-amber-500' : 'border-l-red-500'

                    return (
                      <tr
                        key={a.project.id}
                        className={cn('hover:bg-muted/50 cursor-pointer transition-colors border-l-4', borderColor)}
                        onClick={() => openDetail(a)}
                      >
                        <td className="py-3 pr-4 font-medium">{a.project.naam}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{a.project.klant_naam}</td>
                        <td className="py-3 pr-4 text-right">{formatCurrency(a.offerteBedrag)}</td>
                        <td className="py-3 pr-4 text-right">{formatCurrency(a.werkelijkeKosten)}</td>
                        <td className={cn('py-3 pr-4 text-right font-semibold', isPositive ? 'text-emerald-600' : 'text-red-600')}>
                          {isPositive ? '+' : ''}{formatCurrency(a.verschil)}
                        </td>
                        <td className={cn('py-3 pr-4 text-right font-semibold', isPositive ? 'text-emerald-600' : 'text-red-600')}>
                          {a.margePercentage.toFixed(1)}%
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  isPositive ? 'bg-emerald-500' : 'bg-red-500'
                                )}
                                style={{ width: `${Math.min(Math.abs(a.margePercentage), 100)}%` }}
                              />
                            </div>
                            {isPositive ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : isClose ? (
                              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            ) : (
                              <MinusCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            Detail
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-orange-600" />
                  Nacalculatie: {selectedProject.project.naam}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Project info */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
                  <div>
                    <p className="font-medium">{selectedProject.project.naam}</p>
                    <p className="text-sm text-muted-foreground">{selectedProject.project.klant_naam}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-sm',
                      selectedProject.verschil >= 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                    )}
                  >
                    {selectedProject.verschil >= 0 ? 'Winstgevend' : 'Verliesgevend'}
                  </Badge>
                </div>

                {/* Comparison cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Offerte</p>
                      <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(selectedProject.offerteBedrag)}</p>
                      {selectedProject.offerte && (
                        <p className="text-xs text-muted-foreground mt-1">{selectedProject.offerte.nummer}</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Werkelijk</p>
                      <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(selectedProject.werkelijkeKosten)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tijd: {formatCurrency(selectedProject.tijdKosten)} + Mat: {formatCurrency(selectedProject.materiaalKosten)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Marge</p>
                      <p className={cn('text-xl font-bold mt-1', selectedProject.verschil >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {selectedProject.margePercentage.toFixed(1)}%
                      </p>
                      <p className={cn('text-xs mt-1', selectedProject.verschil >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {selectedProject.verschil >= 0 ? '+' : ''}{formatCurrency(selectedProject.verschil)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Cost breakdown */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                    Kostenverdeling
                  </h3>
                  <div className="space-y-3">
                    {/* Materiaal bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Materiaalkosten</span>
                        <span className="font-medium">{formatCurrency(selectedProject.materiaalKosten)}</span>
                      </div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${selectedProject.werkelijkeKosten > 0 ? (selectedProject.materiaalKosten / selectedProject.werkelijkeKosten) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    {/* Tijd bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Arbeidskosten</span>
                        <span className="font-medium">{formatCurrency(selectedProject.tijdKosten)}</span>
                      </div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${selectedProject.werkelijkeKosten > 0 ? (selectedProject.tijdKosten / selectedProject.werkelijkeKosten) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time entries */}
                {selectedProject.tijdRegistraties.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-violet-600" />
                        Tijdregistraties ({selectedProject.tijdRegistraties.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedProject.tijdRegistraties.map((t) => (
                          <div key={t.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{t.omschrijving}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(t.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} | {t.start_tijd} - {t.eind_tijd}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{(t.duur_minuten / 60).toFixed(1)} uur</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency((t.duur_minuten / 60) * t.uurtarief)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
