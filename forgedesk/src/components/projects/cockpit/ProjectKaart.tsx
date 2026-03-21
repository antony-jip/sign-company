import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Plus,
  Wrench,
  MoreHorizontal,
  Copy,
  Trash2,
  Download,
  Mail,
  ArrowRight,
  Receipt,
  ClipboardCheck,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { getStatusBadgeClass } from '@/utils/statusColors'
import { toast } from 'sonner'
import { PipelineBar, getPipelineStep, getPipelineStepColor } from './PipelineBar'
import type { Project, Klant, Offerte, Taak, MontageAfspraak, Werkbon, Factuur } from '@/types'

const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  afgerond: 'Afgerond',
  'on-hold': 'On-hold',
  'te-factureren': 'Te factureren',
  gefactureerd: 'Gefactureerd',
}

const statusIcons: Record<string, { color: string; bg: string }> = {
  gepland:         { color: 'text-mod-klanten-text',     bg: 'bg-mod-klanten-light border-mod-klanten-border' },
  actief:          { color: 'text-mod-projecten-text',      bg: 'bg-mod-projecten-light border-mod-projecten-border' },
  'in-review':     { color: 'text-mod-taken-text',    bg: 'bg-mod-taken-light border-mod-taken-border' },
  afgerond:        { color: 'text-mod-projecten-text',      bg: 'bg-mod-projecten-light border-mod-projecten-border' },
  'on-hold':       { color: 'text-flame-text',    bg: 'bg-flame-light border-flame-border' },
  'te-factureren': { color: 'text-mod-email-text',  bg: 'bg-mod-email-light border-mod-email-border' },
  gefactureerd:    { color: 'text-mod-projecten-text',      bg: 'bg-mod-projecten-light border-mod-projecten-border' },
}

interface ProjectKaartProps {
  project: Project
  klant: Klant | null
  offertes: Offerte[]
  taken: Taak[]
  montageAfspraken: MontageAfspraak[]
  werkbonnen: Werkbon[]
  facturen: Factuur[]
  onCreateOfferte: () => void
  onCreateWerkbon: () => void
  onCreateMontage: () => void
  onCopyProject: () => void
  onDeleteProject?: () => void
  onCreateFactuur: () => void
  onArchive: () => void
}

export function ProjectKaart({
  project,
  klant,
  offertes,
  taken,
  montageAfspraken,
  werkbonnen,
  facturen,
  onCreateOfferte,
  onCreateWerkbon,
  onCreateMontage,
  onCopyProject,
  onDeleteProject,
  onCreateFactuur,
  onArchive,
}: ProjectKaartProps) {
  const navigate = useNavigate()

  const totaalBedrag = offertes.reduce((sum, o) => sum + (o.totaal || 0), 0)

  const eindDatum = project.eind_datum ? new Date(project.eind_datum) : null
  const isValidDate = eindDatum && !isNaN(eindDatum.getTime())
  const daysLeft = isValidDate
    ? Math.ceil((eindDatum.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const handleCopyPhone = () => {
    if (klant?.telefoon) {
      navigator.clipboard.writeText(klant.telefoon)
      toast.success('Gekopieerd!')
    }
  }

  const handleMail = () => {
    if (klant?.email) {
      window.location.href = `mailto:${klant.email}`
    }
  }

  const si = statusIcons[project.status] || statusIcons.gepland
  const pipelineStep = getPipelineStep(project, offertes, montageAfspraken, facturen)
  const stepColor = getPipelineStepColor(pipelineStep)

  return (
    <div
      className="border border-sand shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] overflow-hidden"
      style={{
        background: '#FFFFFE',
      }}
    >
      {/* Colored accent line at top */}
      <div
        className="h-[3px] w-full transition-colors duration-700"
        style={{ background: `linear-gradient(90deg, ${stepColor}, ${stepColor}60)` }}
      />

      {/* Row 1: Breadcrumb + Quick Actions */}
      <div className="flex items-center justify-between px-5 pt-3.5 pb-2">
        <div className="flex items-center gap-1.5 text-[12px]">
          <Link
            to="/projecten"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Projecten
          </Link>
          {klant && (
            <>
              <span className="text-muted-foreground/30">/</span>
              <Link
                to={`/klanten/${klant.id}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {klant.bedrijfsnaam || klant.contactpersoon}
              </Link>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {(() => {
            const hasOfferte = offertes.length > 0
            const hasGoedgekeurdOfVerzonden = offertes.some(o => ['goedgekeurd', 'verzonden', 'bekeken'].includes(o.status))
            if (!hasOfferte) {
              // No offerte yet — Offerte is primary (flame)
              return (
                <>
                  <button
                    onClick={onCreateOfferte}
                    className="inline-flex items-center gap-1.5 h-9 px-5 text-[12px] font-semibold rounded-lg text-white hover:opacity-90 transition-all shadow-sm"
                    style={{ backgroundColor: '#F15025' }}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Offerte
                  </button>
                  <button
                    onClick={onCreateWerkbon}
                    className="inline-flex items-center gap-1.5 h-8 px-4 text-[12px] font-medium rounded-lg text-foreground hover:bg-white/80 transition-all"
                    style={{ border: '0.5px solid #E6E4E0' }}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground/70" />
                    Werkbon
                  </button>
                  <button
                    onClick={onCreateMontage}
                    className="inline-flex items-center gap-1.5 h-8 px-4 text-[12px] font-medium rounded-lg text-foreground hover:bg-white/80 transition-all"
                    style={{ border: '0.5px solid #E6E4E0' }}
                  >
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                    Montage
                  </button>
                </>
              )
            }
            // Has offerte — Offerte becomes ghost, Werkbon becomes primary
            return (
              <>
                <button
                  onClick={onCreateOfferte}
                  className="inline-flex items-center gap-1.5 h-8 px-4 text-[12px] font-medium rounded-lg text-foreground hover:bg-white/80 transition-all"
                  style={{ border: '0.5px solid #E6E4E0' }}
                >
                  <Receipt className="h-3.5 w-3.5 text-muted-foreground/70" />
                  Offerte
                </button>
                <button
                  onClick={onCreateWerkbon}
                  className="inline-flex items-center gap-1.5 h-9 px-5 text-[12px] font-semibold rounded-lg text-white hover:opacity-90 transition-all shadow-sm"
                  style={{ backgroundColor: '#C44830' }}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Werkbon
                </button>
                <button
                  onClick={onCreateMontage}
                  className="inline-flex items-center gap-1.5 h-8 px-4 text-[12px] font-medium rounded-lg text-foreground hover:bg-white/80 transition-all"
                  style={{ border: '0.5px solid #E6E4E0' }}
                >
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                  Montage
                </button>
              </>
            )
          })()}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-lg border border-black/[0.06] bg-white/70 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white transition-all">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCopyProject}>
                <Copy className="mr-2 h-3.5 w-3.5" />
                Kopieren
              </DropdownMenuItem>
              {onDeleteProject && (
                <DropdownMenuItem onClick={onDeleteProject} className="text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Verwijderen
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Download className="mr-2 h-3.5 w-3.5" />
                Exporteren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 2: Project Identity */}
      <div className="px-5 pb-3">
        <div className="flex items-start gap-3.5">
          {/* Status icon — replaces emoji */}
          <div className={`h-11 w-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${si.bg}`}>
            <FileText className={`h-5 w-5 ${si.color}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground truncate">
                {project.naam}
              </h1>
              <Badge className="rounded-full text-[10px] font-semibold px-[10px] py-[3px]" style={{
                backgroundColor: '#E2F0F0',
                color: '#1A535C',
              }}>
                {(statusLabels[project.status] || project.status).toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground mt-0.5">
              {project.project_nummer && (
                <span className="font-mono text-muted-foreground/60">{project.project_nummer}</span>
              )}
              {totaalBedrag > 0 && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(totaalBedrag)}</span>
                </>
              )}
              {isValidDate && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span>Deadline <span className="font-mono">{formatDate(project.eind_datum!)}</span></span>
                </>
              )}
              {daysLeft !== null && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className={cn(
                    'font-medium',
                    daysLeft < 0 ? 'text-destructive' : daysLeft < 7 ? 'text-mod-planning-text' : 'text-muted-foreground'
                  )}>
                    <span className="font-mono">{daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d`}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Klant Strip */}
      {klant && (
        <div className="px-5 pb-3 flex items-center gap-3 flex-wrap">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#8BAFD4] to-[#6B8FB4] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-[10px] font-bold">{getInitials(klant.contactpersoon || klant.bedrijfsnaam)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] min-w-0 flex-wrap">
            <span className="font-medium text-foreground">{klant.contactpersoon || klant.bedrijfsnaam}</span>
            {klant.bedrijfsnaam && klant.contactpersoon && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-muted-foreground">{klant.bedrijfsnaam}</span>
              </>
            )}
            {klant.stad && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-muted-foreground">{klant.stad}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            {klant.telefoon && (
              <button
                onClick={handleCopyPhone}
                className="rounded-md px-2.5 py-1 text-[11px] font-mono text-muted-foreground/70 hover:text-foreground bg-white/60 hover:bg-white/90 transition-colors"
                title="Klik om te kopieren"
              >
                {klant.telefoon}
              </button>
            )}
            <button
              onClick={handleMail}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              <Mail className="h-3.5 w-3.5" />
              Mail
            </button>
            <button
              onClick={() => navigate(`/klanten/${klant.id}`)}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Profiel
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* WatNuBanner removed — voortgang info is already shown in PipelineBar */}

      {/* Row 5: Pipeline Bar */}
      <div className="px-5 pb-4">
        <PipelineBar
          project={project}
          offertes={offertes}
          montageAfspraken={montageAfspraken}
          facturen={facturen}
        />
      </div>
    </div>
  )
}
