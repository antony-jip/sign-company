import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Receipt,
  Copy,
  Users,
  MapPin,
  Briefcase,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getStatusColor, getPriorityColor } from '@/lib/utils'
import { getStatusBadgeClass } from '@/utils/statusColors'
import { KlantStatusBadgeInline } from '@/components/shared/KlantStatusWarning'
import { AuditLogPanel } from '@/components/shared/AuditLogPanel'
import type { Project, Klant } from '@/types'

interface CockpitTopBarProps {
  project: Project
  klant: Klant | null
  onStatusChange: (status: Project['status']) => void
  onNewOfferte: () => void
  onNewWerkbon: () => void
  onNewMontage: () => void
  onCopy: () => void
}

const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  afgerond: 'Afgerond',
  'on-hold': 'On-hold',
  'te-factureren': 'Te factureren',
  gefactureerd: 'Gefactureerd',
}

export function CockpitTopBar({
  project,
  klant,
  onStatusChange,
  onNewOfferte,
  onNewWerkbon,
  onNewMontage,
  onCopy,
}: CockpitTopBarProps) {
  const [geschiedenisOpen, setGeschiedenisOpen] = useState(false)
  const geschiedenisRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!geschiedenisOpen) return
    function handleClick(e: MouseEvent) {
      if (geschiedenisRef.current && !geschiedenisRef.current.contains(e.target as Node)) {
        setGeschiedenisOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [geschiedenisOpen])

  return (
    <div className="bg-[#FFFFFE] border-b border-[hsl(35,15%,87%)]">
      {/* Status color bar */}
      <div className={`h-[3px] w-full ${getStatusBadgeClass(project.status)} transition-colors duration-500`} style={{ border: 'none' }} />

      {/* Top row: breadcrumbs */}
      <div className="flex items-center gap-2 px-5 pt-2.5 pb-0">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground h-6 px-2 text-xs">
          <Link to="/projecten">
            <ArrowLeft className="mr-1 h-3 w-3" />
            Projecten
          </Link>
        </Button>
        {klant && (
          <>
            <span className="text-muted-foreground text-xs">/</span>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground h-6 px-2 text-xs">
              <Link to={`/klanten/${klant.id}`}>
                {klant.bedrijfsnaam}<KlantStatusBadgeInline klant={klant} />
              </Link>
            </Button>
          </>
        )}
      </div>

      {/* Main bar */}
      <div className="flex items-center gap-2.5 px-5 py-2.5 flex-wrap">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-mod-offertes-light to-mod-facturen-light flex items-center justify-center flex-shrink-0">
          <Briefcase className="h-4 w-4 text-white" />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-foreground leading-tight">{project.naam}</h1>
        {project.project_nummer && (
          <span className="text-xs text-muted-foreground/60 font-mono">{project.project_nummer}</span>
        )}

        {/* Status dropdown */}
        <select
          value={project.status}
          onChange={(e) => onStatusChange(e.target.value as Project['status'])}
          className={`${getStatusColor(project.status)} text-xs px-2.5 py-0.5 rounded-full border-0 cursor-pointer appearance-none font-medium focus:ring-1 focus:ring-primary/30 focus:outline-none pr-6 bg-no-repeat bg-[right_4px_center] bg-[length:12px]`}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
        >
          <option value="gepland">Gepland</option>
          <option value="actief">Actief</option>
          <option value="in-review">In review</option>
          <option value="te-factureren">Te factureren</option>
          <option value="gefactureerd">Gefactureerd</option>
          <option value="on-hold">On-hold</option>
          <option value="afgerond">Afgerond</option>
        </select>

        {/* Priority */}
        <Badge className={`${getPriorityColor(project.prioriteit)} text-xs px-2.5 py-0.5`}>
          {project.prioriteit.charAt(0).toUpperCase() + project.prioriteit.slice(1)}
        </Badge>

        <span className="text-muted-foreground/40 hidden sm:inline">·</span>

        {/* Customer link */}
        {klant && (
          <Link to={`/klanten/${klant.id}`} className="text-xs text-accent font-medium hover:underline hidden sm:inline">
            {klant.bedrijfsnaam || project.klant_naam}
          </Link>
        )}

        {/* Contact info */}
        {klant && (
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            {klant.contactpersoon && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {klant.contactpersoon}
                {klant.telefoon && <span className="font-mono">· {klant.telefoon}</span>}
              </span>
            )}
            {klant.stad && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {klant.stad}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          {/* Geschiedenis dropdown */}
          <div className="relative" ref={geschiedenisRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGeschiedenisOpen(!geschiedenisOpen)}
              className={`h-7 w-7 p-0 text-muted-foreground hover:text-foreground ${geschiedenisOpen ? 'bg-accent text-foreground' : ''}`}
              title="Geschiedenis"
            >
              <Clock className="h-3.5 w-3.5" />
            </Button>
            {geschiedenisOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-80 bg-[#FFFFFE] border border-[hsl(35,15%,87%)] rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[hsl(35,15%,87%)] bg-[hsl(35,15%,97%)]">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Geschiedenis
                  </span>
                </div>
                <div className="max-h-96 overflow-y-auto p-1">
                  <AuditLogPanel entityType="project" entityId={project.id} />
                </div>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            <span className="hidden lg:inline">Kopiëren</span>
          </Button>
          <div className="w-px h-5 bg-[hsl(35,15%,87%)] mx-0.5 hidden sm:block" />
          <Button size="sm" className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-white font-medium shadow-sm transition-all duration-200 hover:shadow-md" onClick={onNewOfferte}>
            <Receipt className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">Offerte</span>
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs transition-all duration-200 hover:border-primary/30" onClick={onNewWerkbon}>
            <Plus className="h-3 w-3 mr-1" />
            <span className="hidden md:inline">Werkbon</span>
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs transition-all duration-200 hover:border-primary/30" onClick={onNewMontage}>
            <Plus className="h-3 w-3 mr-1" />
            <span className="hidden md:inline">Montage</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
