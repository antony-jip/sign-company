import { useEffect, useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
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
  const { navigateWithTab } = useNavigateWithTab()
  const [klant, setKlant] = useState<Klant | null>(null)
  // Gemonteerd blijven tijdens het uitschuiven, en pas ná de mount zichtbaar
  // worden zodat de inschuif-animatie echt loopt.
  const [gemount, setGemount] = useState(false)
  const [zichtbaar, setZichtbaar] = useState(false)
  useEffect(() => {
    if (open && project) {
      setGemount(true)
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setZichtbaar(true)))
      return () => cancelAnimationFrame(id)
    }
    setZichtbaar(false)
    const t = setTimeout(() => setGemount(false), 320)
    return () => clearTimeout(t)
  }, [open, project])

  useEffect(() => {
    if (!open || !project?.klant_id) { setKlant(null); return }
    let afgebroken = false
    // Meteen leegmaken bij een ander project. Bleef de vorige klant staan, dan
    // was `klantGeladen` hieronder al waar en bouwde de composer zich op met
    // het e-mailadres van de vorige klant. Dat vult hij daarna niet meer aan,
    // want hij overschrijft nooit wat er al staat.
    setKlant(null)
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

  if (!project || (!gemount && isDesktop)) return null
  const contactpersoon = project.contactpersoon_id
    ? klant?.contactpersonen?.find((c) => c.id === project.contactpersoon_id) || null
    : null

  // Niet alleen "er is een klant geladen", maar "de geladen klant hoort bij dit
  // project". Zonder die tweede eis kan een antwoord bij de verkeerde klant
  // terechtkomen, en dat merk je pas nadat de mail weg is.
  const klantGeladen = !project.klant_id || (klant !== null && klant.id === project.klant_id)
  const composer = !klantGeladen ? (
    <p className="text-[13px] text-muted-foreground p-4">Klant laden…</p>
  ) : (
    <ProjectMailComposer
      key={project.id}
      project={project}
      klant={klant}
      contactpersoon={contactpersoon}
      userId={user?.id}
      medewerkerNaam={medewerkers.find((m) => m.user_id === user?.id)?.naam}
      open={open}
      onOpenChange={(o) => { if (!o) onOpenChange(false) }}
      variant={isDesktop ? 'paneel' : 'kaart'}
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
        'fixed top-0 right-0 z-[10000] h-full w-[560px] max-w-[calc(100vw-2rem)] bg-background border-l border-border',
        'shadow-[-12px_0_32px_rgba(13,52,60,0.10)] flex flex-col will-change-transform',
        'transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none',
        zichtbaar && open ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none',
      )}
    >
      <div className="flex items-center justify-between gap-3 pl-4 pr-2 h-12 border-b border-border/70 flex-shrink-0">
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-foreground truncate">{project.naam}</span>
          {klant?.bedrijfsnaam && <span className="text-[12px] text-muted-foreground truncate">· {klant.bedrijfsnaam}</span>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => { onOpenChange(false); navigateWithTab({ path: `/projecten/${project.id}`, label: project.naam || 'Project', id: `/projecten/${project.id}` }) }}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] font-semibold text-petrol hover:bg-petrol/10 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
            Ga naar project
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Mailpaneel sluiten"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* De composer is een kaart met eigen rand, schaduw en sluitknop; in het
          paneel is dat dubbelop, dus die worden hier weggestreken. */}
      <div className={cn("flex-1 min-h-0 [&_button[aria-label='Mail-composer_sluiten']]:hidden transition-opacity duration-300 delay-100", zichtbaar ? 'opacity-100' : 'opacity-0')}>
        {composer}
      </div>
    </aside>
  )
}
