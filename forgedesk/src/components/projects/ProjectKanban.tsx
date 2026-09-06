import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { GripVertical, MoreHorizontal, ExternalLink, Trash2, Mail } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { getFase } from '@/utils/projectFases'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Project } from '@/types'

type ProjectStatus = Project['status']

/** Kolomvolgorde = de reis van een project, van te plannen tot afgerond. */
const KOLOM_STATUSSEN: ProjectStatus[] = [
  'te-plannen', 'gepland', 'in-review', 'akkoord-klant', 'ingepland',
  'actief', 'on-hold', 'te-factureren', 'gefactureerd', 'afgerond',
]

/** Zelfde vertaling als de lijst: DB-status naar spectrum-fase voor de kleur. */
const STATUS_TO_FASE: Record<string, string> = {
  gepland: 'goedgekeurd',
  actief: 'productie',
  'te-factureren': 'opgeleverd',
  'akkoord-klant': 'goedgekeurd',
  ingepland: 'montage',
}

function kolomKleur(status: string): string {
  return getFase(STATUS_TO_FASE[status] || status).color
}

function deadlineInfo(eindDatum?: string): { kleur: string; titel: string; tekst: string } | null {
  if (!eindDatum) return null
  const dagen = Math.ceil((new Date(eindDatum).getTime() - Date.now()) / 86_400_000)
  const tekst = new Date(eindDatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  if (dagen < 0) return { kleur: '#C03A18', titel: 'Deadline verstreken', tekst }
  if (dagen <= 7) return { kleur: '#D98E04', titel: 'Deadline binnen een week', tekst }
  return { kleur: '#9AA6A8', titel: 'Deadline', tekst }
}

interface ProjectKanbanProps {
  projecten: Project[]
  klantNaam: (project: Project) => string
  statusLabels: Record<string, string>
  /** Toegestane volgende statussen per huidige status (STATUS_WORKFLOW uit de lijst). */
  workflow: Record<string, string[]>
  onStatusChange: (projectId: string, status: ProjectStatus) => void | Promise<void>
  onOpen: (project: Project) => void
  /** Zelfde verwijder-flow als de lijst: controleert koppelingen en vraagt bevestiging waar nodig. */
  onDelete: (project: Project) => void | Promise<void>
  /** Mail naar de klant in een pop-up, met het gesprek en de templates erbij. */
  onMail: (project: Project) => void
  /** Op de telefoon: één kolom per scherm, tikken opent, geen slepen. */
  mobiel: boolean
  /** Bedrag per project, zelfde bron als de kolom Bedrag in de lijst (som van de offertes ex btw). */
  bedrag: (project: Project) => number
}

export function ProjectKanban({ projecten, klantNaam, statusLabels, workflow, onStatusChange, onOpen, onDelete, onMail, mobiel, bedrag }: ProjectKanbanProps) {
  const [sleepId, setSleepId] = useState<string | null>(null)
  const [doelKolom, setDoelKolom] = useState<string | null>(null)

  const perKolom = useMemo(() => {
    const map = new Map<string, Project[]>()
    for (const status of KOLOM_STATUSSEN) map.set(status, [])
    for (const p of projecten) {
      if (!map.has(p.status)) map.set(p.status, [])
      map.get(p.status)!.push(p)
    }
    return map
  }, [projecten])

  // Lege kolommen alleen op desktop, en dan alleen als ze een volgende stap
  // zijn van iets wat in beeld staat: anders is er niets om naartoe te slepen.
  const kolommen = useMemo(() => {
    const volgende = new Set<string>()
    for (const p of projecten) for (const s of workflow[p.status] || []) volgende.add(s)
    return KOLOM_STATUSSEN.filter((s) => (perKolom.get(s)?.length ?? 0) > 0 || (!mobiel && volgende.has(s)))
  }, [projecten, perKolom, workflow, mobiel])

  const sleepProject = sleepId ? projecten.find((p) => p.id === sleepId) : undefined

  const magNaar = (project: Project | undefined, status: string) =>
    !!project && project.status !== status && (workflow[project.status] || []).includes(status)

  const drop = (status: ProjectStatus) => {
    setDoelKolom(null)
    const project = sleepProject
    setSleepId(null)
    if (!project || project.status === status) return
    if (!magNaar(project, status)) {
      toast.info(`Van ${statusLabels[project.status] || project.status} naar ${statusLabels[status] || status} is geen volgende stap`)
      return
    }
    void onStatusChange(project.id, status)
  }

  if (kolommen.length === 0) return null

  return (
    <div
      className={cn(
        'flex gap-2.5 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:thin]',
        mobiel && 'snap-x snap-mandatory',
      )}
    >
      {kolommen.map((status) => {
        const items = perKolom.get(status) || []
        const som = items.reduce((sum, p) => sum + (bedrag(p) || 0), 0)
        const kleur = kolomKleur(status)
        const isDoel = doelKolom === status
        const magHier = magNaar(sleepProject, status)
        const volgendeStappen = (workflow[status] || []).filter((s) => KOLOM_STATUSSEN.includes(s as ProjectStatus))
        return (
          <section
            key={status}
            className={cn(
              'flex-shrink-0 flex flex-col rounded-lg bg-muted/40 dark:bg-white/[0.03] border border-border/50 transition-colors',
              mobiel ? 'w-[calc(100vw-2rem)] snap-center' : 'w-[256px]',
              isDoel && magHier && 'border-petrol/60 bg-petrol/[0.04]',
              isDoel && !magHier && sleepProject && 'opacity-50',
            )}
            style={{ borderTop: `2px solid ${kleur}` }}
            onDragOver={mobiel ? undefined : (e) => { e.preventDefault(); e.dataTransfer.dropEffect = magHier ? 'move' : 'none'; if (doelKolom !== status) setDoelKolom(status) }}
            onDragLeave={mobiel ? undefined : (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node) && doelKolom === status) setDoelKolom(null) }}
            onDrop={mobiel ? undefined : (e) => { e.preventDefault(); drop(status) }}
            aria-label={statusLabels[status] || status}
          >
            <header className="flex items-center justify-between gap-2 px-2.5 pt-2 pb-1.5">
              <span className="inline-flex items-baseline gap-1.5 min-w-0">
                <span className="font-heading text-[12.5px] font-bold text-foreground truncate">{statusLabels[status] || status}</span>
                <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">{items.length}</span>
              </span>
              <span className="font-mono text-[11.5px] text-muted-foreground tabular-nums whitespace-nowrap">{som > 0 ? formatCurrency(som) : ''}</span>
            </header>

            <div className="flex flex-col gap-1.5 px-1.5 pb-1.5 min-h-[64px]">
              {items.map((project) => {
                const deadline = deadlineInfo(project.eind_datum)
                const isSlepend = sleepId === project.id
                const prijs = bedrag(project)
                return (
                  <article
                    key={project.id}
                    draggable={!mobiel}
                    title={mobiel ? undefined : 'Sleep naar een andere fase'}
                    onDragStart={mobiel ? undefined : (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', project.id); setSleepId(project.id) }}
                    onDragEnd={mobiel ? undefined : () => { setSleepId(null); setDoelKolom(null) }}
                    onClick={() => onOpen(project)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onOpen(project) }}
                    tabIndex={0}
                    className={cn(
                      'group relative rounded-md bg-card border border-border/70 pl-2.5 pr-1.5 py-2 min-h-[44px] select-none',
                      'hover:border-petrol/40 hover:shadow-[0_1px_3px_rgba(13,52,60,0.08)] transition-[border-color,box-shadow,opacity]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrol/40',
                      mobiel ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
                      isSlepend && 'opacity-35',
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      {!mobiel && (
                        <GripVertical className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" strokeWidth={1.75} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-foreground leading-[1.3] line-clamp-2">{project.naam}</div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="text-[11.5px] text-muted-foreground truncate">{klantNaam(project) || '·'}</span>
                          <span className="inline-flex items-center gap-1 flex-shrink-0">
                            {prijs > 0 && (
                              <span className="font-mono text-[11.5px] text-foreground/80 tabular-nums whitespace-nowrap">{formatCurrency(prijs)}</span>
                            )}
                            <button
                              type="button"
                              aria-label={`Mail naar ${klantNaam(project) || 'klant'}`}
                              title="Mail naar klant"
                              onClick={(e) => { e.stopPropagation(); onMail(project) }}
                              onPointerDown={(e) => e.stopPropagation()}
                              className={cn(
                                'h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-petrol hover:bg-petrol/10 transition-colors',
                                mobiel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                              )}
                            >
                              <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </button>
                          </span>
                        </div>
                        {deadline && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-mono text-muted-foreground" title={deadline.titel}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: deadline.kleur }} />
                            {deadline.tekst}
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Acties voor ${project.naam}`}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            className={cn(
                              'flex-shrink-0 h-7 w-7 -mr-0.5 -mt-0.5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                              mobiel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
                            )}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => onOpen(project)}>
                            <ExternalLink className="h-4 w-4 mr-2 opacity-70" />
                            Openen
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onMail(project)}>
                            <Mail className="h-4 w-4 mr-2 opacity-70" />
                            Mail naar klant
                          </DropdownMenuItem>
                          {volgendeStappen.length > 0 && <DropdownMenuSeparator />}
                          {volgendeStappen.map((s) => (
                            <DropdownMenuItem key={s} onClick={() => void onStatusChange(project.id, s as ProjectStatus)}>
                              <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: kolomKleur(s) }} />
                              Naar {statusLabels[s] || s}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-[#C03A18] focus:text-[#C03A18]"
                            onClick={() => void onDelete(project)}
                          >
                            <Trash2 className="h-4 w-4 mr-2 opacity-80" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </article>
                )
              })}
              {items.length === 0 && (
                <div className="rounded-md border border-dashed border-border/70 text-[11.5px] text-muted-foreground/70 text-center py-3.5">
                  Sleep hierheen
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
