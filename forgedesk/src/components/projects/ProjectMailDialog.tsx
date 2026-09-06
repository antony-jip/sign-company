import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { ProjectMailComposer } from './ProjectMailComposer'
import { useAuth } from '@/contexts/AuthContext'
import { useMedewerkers } from '@/contexts/MedewerkersContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { getKlant } from '@/services/supabaseService'
import { logger } from '@/utils/logger'
import { cn } from '@/lib/utils'
import type { Klant, Project } from '@/types'

interface ProjectMailDialogProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Mailen vanuit de projectenlijst of het kanban zonder het project te openen.
 * Op desktop een vast paneel rechts dat naast het bord blijft staan (het bord
 * blijft bruikbaar, geen backdrop); op de telefoon een lade van onderen.
 * Binnenin dezelfde composer als op de projectkaart: gesprek, templates,
 * bijlagen, opvolgen.
 */
export function ProjectMailDialog({ project, open, onOpenChange }: ProjectMailDialogProps) {
  const { user } = useAuth()
  const { medewerkers } = useMedewerkers()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [klant, setKlant] = useState<Klant | null>(null)

  useEffect(() => {
    if (!open || !project?.klant_id) { setKlant(null); return }
    let afgebroken = false
    getKlant(project.klant_id)
      .then((k) => { if (!afgebroken) setKlant(k) })
      .catch((err) => { logger.error('Klant voor mail laden mislukt:', err); if (!afgebroken) setKlant(null) })
    return () => { afgebroken = true }
  }, [open, project?.klant_id])

  useEffect(() => {
    if (!open || !isDesktop) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, isDesktop, onOpenChange])

  if (!project) return null
  const contactpersoon = project.contactpersoon_id
    ? klant?.contactpersonen?.find((c) => c.id === project.contactpersoon_id) || null
    : null

  const klantGeladen = !project.klant_id || klant !== null
  const composer = !klantGeladen ? (
    <p className="text-[13px] text-muted-foreground p-4">Klant laden…</p>
  ) : (
    <ProjectMailComposer
      project={project}
      klant={klant}
      contactpersoon={contactpersoon}
      userId={user?.id}
      medewerkerNaam={medewerkers.find((m) => m.user_id === user?.id)?.naam}
      open={open}
      onOpenChange={(o) => { if (!o) onOpenChange(false) }}
    />
  )

  if (!isDesktop) {
    return (
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        className="p-0 gap-0 overflow-hidden"
        title={<span className="sr-only">Mail over {project.naam}</span>}
      >
        {composer}
      </ResponsiveDialog>
    )
  }

  return (
    <aside
      aria-label={`Mail over ${project.naam}`}
      className={cn(
        'fixed top-0 right-0 z-40 h-full w-[560px] max-w-[calc(100vw-2rem)] bg-background border-l border-border',
        'shadow-[-12px_0_32px_rgba(13,52,60,0.10)] flex flex-col transition-transform duration-200',
        open ? 'translate-x-0' : 'translate-x-full pointer-events-none',
      )}
    >
      <div className="flex items-center justify-between gap-3 pl-4 pr-2 h-12 border-b border-border/70 flex-shrink-0">
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-foreground truncate">{project.naam}</span>
          {klant?.bedrijfsnaam && <span className="text-[12px] text-muted-foreground truncate">· {klant.bedrijfsnaam}</span>}
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Mailpaneel sluiten"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* De composer is een kaart met eigen rand, schaduw en sluitknop; in het
          paneel is dat dubbelop, dus die worden hier weggestreken. */}
      <div className="flex-1 overflow-y-auto [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none [&_button[aria-label='Mail-composer_sluiten']]:hidden">
        {open && composer}
      </div>
    </aside>
  )
}
