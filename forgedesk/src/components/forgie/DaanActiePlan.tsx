import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, FileText, CheckSquare, Users, Check, Loader2, Circle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ForgieActieKaart } from './ForgieActieKaart'
import type { ForgieActie } from '@/services/forgieChatService'

const STEP_CONFIG: Record<string, { label: string; icon: React.ElementType; order: number; route?: (id: string) => string }> = {
  klant: { label: 'Klant', icon: Users, order: 0 },
  project: { label: 'Project', icon: FolderOpen, order: 1, route: (id) => `/projecten/${id}` },
  offerte: { label: 'Offerte', icon: FileText, order: 2, route: (id) => `/offertes/${id}` },
  taak: { label: 'Taak', icon: CheckSquare, order: 3 },
}

interface DaanActiePlanProps {
  acties: ForgieActie[]
}

export function DaanActiePlan({ acties }: DaanActiePlanProps) {
  const navigate = useNavigate()
  const ordered = [...acties].sort(
    (a, b) => (STEP_CONFIG[a.type]?.order ?? 9) - (STEP_CONFIG[b.type]?.order ?? 9),
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [createdIds, setCreatedIds] = useState<Record<string, string>>({})
  const [pendingKlantId, setPendingKlantId] = useState<string>()
  const [pendingProjectId, setPendingProjectId] = useState<string>()
  const [busyType, setBusyType] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)

  const handleCreated = useCallback((type: string, id: string) => {
    setCreatedIds((prev) => ({ ...prev, [type]: id }))
    if (type === 'klant') setPendingKlantId(id)
    if (type === 'project') setPendingProjectId(id)
    setBusyType(null)
    setCurrentIndex((i) => i + 1)
  }, [])

  const handleStatusChange = useCallback((status: string, type: string) => {
    setBusyType(status === 'creating' ? type : null)
  }, [])

  const handleCancel = useCallback(() => {
    setBusyType(null)
    setCancelled(true)
  }, [])

  const done = currentIndex >= ordered.length
  const activeActie = !done && !cancelled ? ordered[currentIndex] : undefined

  // Offerte leest klant_id uit data (niet uit de pendingKlantId-prop) — daarom injecteren.
  const cardActie =
    activeActie && activeActie.type === 'offerte'
      ? { ...activeActie, data: { ...activeActie.data, klant_id: pendingKlantId } }
      : activeActie

  const title = cancelled
    ? 'Geannuleerd'
    : done
      ? 'Aangemaakt'
      : 'Daan wil dit voor je aanmaken'

  // Diepste aangemaakte record voor de samenvattingslink: offerte > project.
  const linkType = createdIds.offerte ? 'offerte' : createdIds.project ? 'project' : undefined
  const linkRoute = linkType && STEP_CONFIG[linkType].route?.(createdIds[linkType])

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm p-3 mt-1 w-full">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">
        {title}
      </p>

      <div className="space-y-1.5">
        {ordered.map((actie, i) => {
          const cfg = STEP_CONFIG[actie.type] || STEP_CONFIG.taak
          const Icon = cfg.icon
          const isDone = Boolean(createdIds[actie.type])
          const isBusy = busyType === actie.type && i === currentIndex
          const isActive = i === currentIndex && !cancelled && !isDone

          return (
            <div key={`${actie.type}-${i}`} className="flex items-center gap-2 text-xs">
              <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                {isDone ? (
                  <Check className="w-4 h-4" style={{ color: 'var(--status-green-text)' }} />
                ) : isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-flame" />
                ) : isActive ? (
                  <Icon className="w-3.5 h-3.5 text-petrol" />
                ) : (
                  <Circle className="w-2 h-2 text-muted-foreground/50" />
                )}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1',
                  isDone
                    ? 'text-foreground'
                    : isActive || isBusy
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground/60',
                )}
                style={isDone ? { color: 'var(--status-green-text)' } : undefined}
              >
                {cfg.label}
                {isDone && cfg.route && (
                  <button
                    onClick={() => navigate(cfg.route!(createdIds[actie.type]))}
                    className="text-muted-foreground hover:text-petrol underline-offset-2 hover:underline"
                  >
                    bekijken
                  </button>
                )}
              </span>
            </div>
          )
        })}
      </div>

      {cardActie && (
        <div className="mt-2.5">
          <ForgieActieKaart
            actie={cardActie}
            onCreated={handleCreated}
            onCancel={handleCancel}
            onStatusChange={(status) => handleStatusChange(status, cardActie.type)}
            pendingKlantId={pendingKlantId}
            pendingProjectId={pendingProjectId}
          />
        </div>
      )}

      {done && linkRoute && (
        <button
          onClick={() => navigate(linkRoute)}
          className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-petrol hover:gap-2 transition-all"
        >
          Bekijk {linkType === 'offerte' ? 'de offerte' : 'het project'}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
