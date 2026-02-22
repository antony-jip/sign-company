import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Users,
  Target,
  CalendarDays,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Receipt,
  Copy,
  Loader2,
  AlertTriangle,
  Pencil,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import { berekenBudgetStatus } from '@/utils/budgetUtils'
import { statusLabels, productieFasen } from '@/constants/projectConstants'
import type { Project, TekeningGoedkeuring, Taak, Tijdregistratie } from '@/types'

interface ProjectHeroBannerProps {
  project: Project
  klant: { id: string; bedrijfsnaam: string } | null
  goedkeuringen: TekeningGoedkeuring[]
  taken: Taak[]
  tijdregistraties: Tijdregistratie[]
  onAiAnalysis: () => void
  aiAnalysisLoading: boolean
  onKopieer: () => void
}

export function ProjectHeroBanner({
  project,
  klant,
  goedkeuringen,
  taken,
  tijdregistraties,
  onAiAnalysis,
  aiAnalysisLoading,
  onKopieer,
}: ProjectHeroBannerProps) {
  const navigate = useNavigate()

  const eindDatum = project.eind_datum ? new Date(project.eind_datum) : null
  const isValidDate = eindDatum && !isNaN(eindDatum.getTime())
  const isOverdue = isValidDate && eindDatum < new Date() && project.status !== 'afgerond'
  const daysLeft = isValidDate ? Math.ceil((eindDatum.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
  const takenKlaar = taken.filter(t => t.status === 'klaar').length
  const takenTotaal = taken.length

  const bs = berekenBudgetStatus(project, tijdregistraties)

  // Productiefase index
  const faseIndex = productieFasen.findIndex(f => f.key === project.fase)

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link to="/projecten">
            <span className="mr-2">←</span>
            Projecten
          </Link>
        </Button>
        {klant && (
          <>
            <span className="text-muted-foreground text-xs">/</span>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link to={`/klanten/${klant.id}`}>
                {klant.bedrijfsnaam}
              </Link>
            </Button>
          </>
        )}
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3D3522] via-accent to-[#3D3522] p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-wm-pale rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-6 w-6 text-wm-pale" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white font-display">{project.naam}</h1>
                <p className="text-sm text-wm-pale/70 mt-0.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {project.klant_naam || 'Onbekende klant'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${getStatusColor(project.status)} text-sm px-3 py-1`}>
                {statusLabels[project.status] || project.status}
              </Badge>
              <Badge className={`${getPriorityColor(project.prioriteit)} text-sm px-3 py-1`}>
                {project.prioriteit.charAt(0).toUpperCase() + project.prioriteit.slice(1)}
              </Badge>
              {project.type && (
                <Badge className="bg-white/15 text-white text-sm px-3 py-1 border border-white/20">
                  {project.type}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/projecten/${project.id}/bewerken`)}
                className="h-8 px-3 text-wm-pale hover:text-white hover:bg-white/10 border border-white/10"
              >
                <Pencil className="h-4 w-4 mr-1.5" />
                Bewerken
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAiAnalysis}
                disabled={aiAnalysisLoading}
                className="h-8 px-3 text-wm-pale hover:text-white hover:bg-white/10 border border-white/10"
              >
                {aiAnalysisLoading
                  ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  : <Sparkles className="h-4 w-4 mr-1.5" />
                }
                AI Analyse
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/facturen?klant=${project.klant_id}`)}
                className="h-8 px-3 text-emerald-200 hover:text-white hover:bg-white/10 border border-white/10"
              >
                <Receipt className="h-4 w-4 mr-1.5" />
                Factuur
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onKopieer}
                className="h-8 px-3 text-wm-pale hover:text-white hover:bg-white/10 border border-white/10"
              >
                <Copy className="h-4 w-4 mr-1.5" />
                Kopiëren
              </Button>
            </div>
          </div>

          {/* Productiefase balk */}
          {faseIndex >= 0 && (
            <div className="mt-4 flex items-center gap-1">
              {productieFasen.map((fase, i) => (
                <div key={fase.key} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`h-1.5 w-full rounded-full transition-all ${
                    i <= faseIndex ? fase.kleur : 'bg-white/10'
                  }`} />
                  <span className={`text-[10px] ${i <= faseIndex ? 'text-white font-medium' : 'text-wm-pale/50'}`}>
                    {fase.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Quick stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="h-3.5 w-3.5 text-wm-pale" />
                <span className="text-[10px] text-wm-pale/80 uppercase tracking-wider font-medium">Voortgang</span>
              </div>
              <p className="text-xl font-bold">{project.voortgang}%</p>
              <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-wm-pale rounded-full"
                  style={{ width: `${project.voortgang}%` }}
                />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-wm-light" />
                <span className="text-[10px] text-wm-pale/80 uppercase tracking-wider font-medium">Goedkeuring</span>
              </div>
              {goedkeuringen.length > 0 ? (
                <>
                  <p className="text-xl font-bold">
                    {goedkeuringen.filter(g => g.status === 'goedgekeurd').length}/{goedkeuringen.length}
                  </p>
                  <p className="text-[10px] mt-0.5 text-wm-pale/60">
                    {goedkeuringen.some(g => g.status === 'revisie')
                      ? `${goedkeuringen.filter(g => g.status === 'revisie').length} revisie(s)`
                      : 'goedgekeurd'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold">-</p>
                  <p className="text-[10px] mt-0.5 text-wm-pale/60">nog niet verstuurd</p>
                </>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarDays className="h-3.5 w-3.5 text-wm-pale" />
                <span className="text-[10px] text-wm-pale/80 uppercase tracking-wider font-medium">Deadline</span>
              </div>
              <p className={`text-xl font-bold ${isOverdue ? 'text-amber-400' : ''}`}>
                {!isValidDate ? '-' : isOverdue ? `${Math.abs(daysLeft)}d` : project.status === 'afgerond' ? 'Klaar' : `${daysLeft}d`}
              </p>
              <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-amber-300/80' : 'text-wm-pale/60'}`}>
                {!isValidDate ? 'geen deadline' : isOverdue ? 'verlopen' : project.status === 'afgerond' ? 'afgerond' : 'resterend'}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-green-300" />
                <span className="text-[10px] text-wm-pale/80 uppercase tracking-wider font-medium">Taken</span>
              </div>
              <p className="text-xl font-bold">{takenKlaar}/{takenTotaal}</p>
              <p className="text-[10px] mt-0.5 text-wm-pale/60">afgerond</p>
            </div>
          </div>

          {/* Budget waarschuwing */}
          {bs.budget > 0 && bs.niveau !== 'normaal' && (
            <div className={`mt-4 flex items-center gap-3 rounded-lg px-4 py-2 ${
              bs.niveau === 'overschreden'
                ? 'bg-red-500/20 border border-red-400/30'
                : 'bg-amber-500/20 border border-amber-400/30'
            }`}>
              <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                bs.niveau === 'overschreden' ? 'text-red-300' : 'text-amber-300'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {bs.niveau === 'overschreden'
                    ? `Budget overschreden: ${bs.percentage.toFixed(0)}%`
                    : `Budget waarschuwing: ${bs.percentage.toFixed(0)}% verbruikt`}
                </p>
                <p className="text-xs text-wm-pale/70">
                  {formatCurrency(bs.verbruikt)} van {formatCurrency(bs.budget)} gebruikt
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      bs.niveau === 'overschreden' ? 'bg-red-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(bs.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
