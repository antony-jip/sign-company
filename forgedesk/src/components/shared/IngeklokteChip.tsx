import { useNavigate } from 'react-router-dom'
import { Timer, AlertTriangle } from 'lucide-react'
import { useTijdSessies } from '@/hooks/useTijdSessies'

function formatKlok(seconden: number): string {
  const u = Math.floor(seconden / 3600)
  const m = Math.floor((seconden % 3600) / 60)
  return `${u}:${String(m).padStart(2, '0')}`
}

/**
 * Zichtbaar zolang je ergens ingeklokt staat. Zonder dit merk je pas dat de
 * teller loopt als je toevallig terugkeert naar dat project.
 */
export function IngeklokteChip() {
  const navigate = useNavigate()
  const { eigenSessie, secondenVan, isVerlopen } = useTijdSessies({})

  if (!eigenSessie) return null

  const vergeten = isVerlopen(eigenSessie)
  const project = eigenSessie.project_naam || 'project'

  return (
    <button
      type="button"
      onClick={() => navigate(`/projecten/${eigenSessie.project_id}`)}
      title={vergeten
        ? `Je staat sinds ${new Date(eigenSessie.gestart_op).toLocaleString('nl-NL')} ingeklokt op ${project}`
        : `Ingeklokt op ${project} · klik om uit te klokken`}
      className="hidden md:inline-flex items-center gap-1.5 h-[30px] pl-2 pr-2.5 rounded-lg border border-[rgba(241,80,37,0.35)] bg-[hsl(var(--status-flame-bg))] text-[12px] font-medium text-[#C03A18] transition-colors hover:border-flame"
    >
      {vergeten ? (
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
      ) : (
        <Timer className="h-3.5 w-3.5" strokeWidth={2} />
      )}
      <span className="max-w-[120px] truncate">{project}</span>
      <span className="font-mono tabular-nums">
        {vergeten ? 'vergeten?' : formatKlok(secondenVan(eigenSessie))}
      </span>
    </button>
  )
}
