import { useState } from 'react'
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
import { WatNuBanner } from './WatNuBanner'
import { PipelineBar } from './PipelineBar'
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

const PROJECT_EMOJIS: Record<string, string> = {
  gepland: '📋',
  actief: '🔨',
  'in-review': '👀',
  afgerond: '✅',
  'on-hold': '⏸️',
  'te-factureren': '💰',
  gefactureerd: '📄',
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

  // Calculate totals
  const totaalBedrag = offertes.reduce((sum, o) => sum + (o.totaal || 0), 0)

  // Calculate deadline & days
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

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Row 1: Breadcrumb + Actions */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <div className="flex items-center gap-1.5 text-sm">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs">
            <Link to="/projecten">
              <ArrowLeft className="mr-1 h-3 w-3" />
              Projecten
            </Link>
          </Button>
          {klant && (
            <>
              <span className="text-muted-foreground/50">/</span>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs">
                <Link to={`/klanten/${klant.id}`}>{klant.bedrijfsnaam || klant.contactpersoon}</Link>
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" className="h-7 px-3 text-xs" onClick={onCreateOfferte}>
            <FileText className="mr-1.5 h-3 w-3" />
            Offerte
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={onCreateWerkbon}>
            <Plus className="mr-1 h-3 w-3" />
            Werkbon
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={onCreateMontage}>
            <Plus className="mr-1 h-3 w-3" />
            Montage
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCopyProject}>
                <Copy className="mr-2 h-3.5 w-3.5" />
                Kopiëren
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
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[hsl(35,25%,92%)] to-[hsl(35,20%,85%)] flex items-center justify-center text-2xl flex-shrink-0">
            {PROJECT_EMOJIS[project.status] || '📋'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground truncate">
                {project.naam}
              </h1>
              <Badge className={cn(getStatusBadgeClass(project.status), 'rounded-full text-xs px-2.5 py-0.5')}>
                {statusLabels[project.status] || project.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              {project.project_nummer && (
                <span className="font-mono">{project.project_nummer}</span>
              )}
              {totaalBedrag > 0 && (
                <>
                  <span>·</span>
                  <span className="font-mono font-semibold">{formatCurrency(totaalBedrag)}</span>
                </>
              )}
              {isValidDate && (
                <>
                  <span>·</span>
                  <span>Deadline {formatDate(project.eind_datum!)}</span>
                </>
              )}
              {daysLeft !== null && (
                <>
                  <span>·</span>
                  <span className={cn(daysLeft < 0 ? 'text-destructive font-medium' : daysLeft < 7 ? 'text-amber-600' : '')}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d`}
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
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">{getInitials(klant.contactpersoon || klant.bedrijfsnaam)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm min-w-0 flex-wrap">
            <span className="font-medium text-foreground">{klant.contactpersoon || klant.bedrijfsnaam}</span>
            {klant.bedrijfsnaam && klant.contactpersoon && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground">{klant.bedrijfsnaam}</span>
              </>
            )}
            {klant.stad && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground">{klant.stad}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            {klant.telefoon && (
              <button
                onClick={handleCopyPhone}
                className="bg-muted rounded-md px-2.5 py-1 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                title="Klik om te kopiëren"
              >
                {klant.telefoon}
              </button>
            )}
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleMail} title="E-mail versturen">
              <Mail className="h-3.5 w-3.5 mr-1" />
              Mail
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => navigate(`/klanten/${klant.id}`)}
              title="Klantprofiel openen"
            >
              Profiel
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Row 4: Wat Nu Banner */}
      <div className="px-5 pb-3">
        <WatNuBanner
          project={project}
          offertes={offertes}
          montageAfspraken={montageAfspraken}
          facturen={facturen}
          onCreateOfferte={onCreateOfferte}
          onCreateWerkbon={onCreateWerkbon}
          onCreateMontage={onCreateMontage}
          onViewPortaal={() => {/* handled by portaal panel */}}
          onViewPlanning={() => navigate('/planning')}
          onCreateFactuur={onCreateFactuur}
          onArchive={onArchive}
        />
      </div>

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
