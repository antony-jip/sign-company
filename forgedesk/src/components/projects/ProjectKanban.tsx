import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { getFase } from '@/utils/projectFases'
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

function deadlineKleur(eindDatum?: string): { kleur: string; titel: string } | null {
  if (!eindDatum) return null
  const dagen = Math.ceil((new Date(eindDatum).getTime() - Date.now()) / 86_400_000)
  if (dagen < 0) return { kleur: '#C03A18', titel: 'Deadline verstreken' }
  if (dagen <= 7) return { kleur: '#D98E04', titel: 'Deadline binnen een week' }
  return { kleur: '#C0BDB8', titel: 'Deadline' }
}

interface ProjectKanbanProps {
  projecten: Project[]
  klantNaam: (project: Project) => string
  statusLabels: Record<string, string>
  /** Toegestane volgende statussen per huidige status (STATUS_WORKFLOW uit de lijst). */
  workflow: Record<string, string[]>
  onStatusChange: (projectId: string, status: ProjectStatus) => void | Promise<void>
  onOpen: (project: Project) => void
  /** Op de telefoon: één kolom per scherm, tikken opent, geen slepen. */
  mobiel: boolean
}

export function ProjectKanban({ projecten, klantNaam, statusLabels, workflow, onStatusChange, onOpen, mobiel }: ProjectKanbanProps) {
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

  const drop = (status: ProjectStatus) => {
    setDoelKolom(null)
    const project = sleepProject
    setSleepId(null)
    if (!project || project.status === status) return
    if (!(workflow[project.status] || []).includes(status)) {
      toast.info(`Van ${statusLabels[project.status] || project.status} naar ${statusLabels[status] || status} is geen volgende stap`)
      return
    }
    void onStatusChange(project.id, status)
  }

  if (kolommen.length === 0) return null

  return (
    <div
      className={cn(
        'flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0',
        mobiel && 'snap-x snap-mandatory',
      )}
    >
      {kolommen.map((status) => {
        const items = perKolom.get(status) || []
        const som = items.reduce((sum, p) => sum + (Number(p.budget) || 0), 0)
        const kleur = kolomKleur(status)
        const isDoel = doelKolom === status
        const magHier = !!sleepProject && sleepProject.status !== status && (workflow[sleepProject.status] || []).includes(status)
        return (
          <section
            key={status}
            className={cn(
              'flex-shrink-0 rounded-2xl doen-panel doen-wash p-3 flex flex-col gap-2 transition-colors',
              mobiel ? 'w-[calc(100vw-2rem)] snap-center' : 'w-[268px]',
              isDoel && magHier && 'ring-2 ring-petrol/40',
              isDoel && !magHier && sleepProject && 'opacity-60',
            )}
            onDragOver={mobiel ? undefined : (e) => { e.preventDefault(); if (doelKolom !== status) setDoelKolom(status) }}
            onDragLeave={mobiel ? undefined : () => { if (doelKolom === status) setDoelKolom(null) }}
            onDrop={mobiel ? undefined : (e) => { e.preventDefault(); drop(status) }}
            aria-label={statusLabels[status] || status}
          >
            <header className="flex items-baseline justify-between gap-2 px-1">
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: kleur }} />
                <span className="font-heading text-[13px] font-bold text-[#1A4A52] dark:text-foreground truncate">
                  {statusLabels[status] || status}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{items.length}</span>
              </span>
              <span className="font-mono text-[12px] font-semibold text-foreground/80 tabular-nums whitespace-nowrap">
                {formatCurrency(som)}
              </span>
            </header>

            <div className="flex flex-col gap-2 min-h-[72px]">
              {items.map((project) => {
                const deadline = deadlineKleur(project.eind_datum)
                const isSlepend = sleepId === project.id
                return (
                  <article
                    key={project.id}
                    draggable={!mobiel}
                    onDragStart={mobiel ? undefined : (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', project.id); setSleepId(project.id) }}
                    onDragEnd={mobiel ? undefined : () => { setSleepId(null); setDoelKolom(null) }}
                    onClick={() => onOpen(project)}
                    className={cn(
                      'rounded-xl bg-card border border-border/60 px-3 py-2.5 min-h-[44px] cursor-pointer select-none',
                      'hover:border-petrol/30 hover:shadow-sm transition-all',
                      !mobiel && 'cursor-grab active:cursor-grabbing',
                      isSlepend && 'opacity-40',
                    )}
                    style={{ borderLeft: `3px solid ${kleur}` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">{project.naam}</span>
                      {deadline && (
                        <span className="flex items-center gap-1 flex-shrink-0 text-[10px] font-mono text-muted-foreground" title={deadline.titel}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: deadline.kleur }} />
                          {new Date(project.eind_datum!).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-2 mt-1">
                      <span className="text-[12px] text-muted-foreground truncate">{klantNaam(project) || '·'}</span>
                      {Number(project.budget) > 0 && (
                        <span className="font-mono text-[12px] text-foreground/80 tabular-nums whitespace-nowrap">{formatCurrency(Number(project.budget))}</span>
                      )}
                    </div>
                  </article>
                )
              })}
              {items.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/70 text-[12px] text-muted-foreground/70 text-center py-4">
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
