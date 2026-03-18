import { Plus, CalendarDays, MapPin, Wrench, Truck, Clock, CheckCircle2, PauseCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'
import type { MontageAfspraak } from '@/types'

const montageStatusConfig: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  gepland:    { label: 'Gepland',    cls: 'badge-mist',      icon: CalendarDays },
  onderweg:   { label: 'Onderweg',   cls: 'badge-cream',     icon: Truck },
  bezig:      { label: 'Bezig',      cls: 'badge-lavender',  icon: Wrench },
  afgerond:   { label: 'Afgerond',   cls: 'badge-sage',      icon: CheckCircle2 },
  uitgesteld: { label: 'Uitgesteld', cls: 'badge-blush',     icon: PauseCircle },
}

// Deterministic color from name
function monteurColor(name: string): string {
  const colors = [
    'from-[#7EB5A6] to-[#5E9586]',
    'from-[#9B8EC4] to-[#7B6EA4]',
    'from-[#C4A882] to-[#A48862]',
    'from-[#8BAFD4] to-[#6B8FB4]',
    'from-[#E8866A] to-[#C8664A]',
    'from-[#D4836A] to-[#B4634A]',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

interface MontageSectionProps {
  montageAfspraken: MontageAfspraak[]
  onInplannen: () => void
}

export function MontageSection({ montageAfspraken, onInplannen }: MontageSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
          Montage
          {montageAfspraken.length > 0 && (
            <span className="text-[10px] text-muted-foreground/50 font-mono font-normal">{montageAfspraken.length}</span>
          )}
        </h3>
        <button
          onClick={onInplannen}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Inplannen
        </button>
      </div>

      {montageAfspraken.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-[hsl(35,15%,87%)] rounded-lg">
          <div className="h-10 w-10 rounded-xl bg-peach/30 flex items-center justify-center mx-auto mb-2">
            <Wrench className="h-5 w-5 text-peach-deep" />
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">Nog niet gepland</p>
          <button
            onClick={onInplannen}
            className="text-[11px] text-foreground font-medium hover:text-foreground/80 transition-colors"
          >
            + Inplannen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {montageAfspraken.map((m) => {
            const st = montageStatusConfig[m.status] || montageStatusConfig.gepland
            const StatusIcon = st.icon

            return (
              <div key={m.id} className="rounded-lg border border-[hsl(35,15%,90%)] p-3 space-y-2 hover:border-[hsl(35,15%,82%)] transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-foreground truncate">{m.titel}</p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${st.cls}`}>
                    <StatusIcon className="h-3 w-3" />
                    {st.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CalendarDays className="h-3 w-3 flex-shrink-0 text-muted-foreground/50" />
                  <span className="font-mono">
                    {new Date(m.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    {' '}
                    {m.start_tijd}–{m.eind_tijd}
                  </span>
                </div>

                {m.locatie && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-muted-foreground/50" />
                    <span className="truncate">{m.locatie}</span>
                  </div>
                )}

                {m.monteurs && m.monteurs.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className="flex -space-x-1.5">
                      {m.monteurs.map((monteur) => (
                        <div
                          key={monteur}
                          className={`h-6 w-6 rounded-full bg-gradient-to-br ${monteurColor(monteur)} flex items-center justify-center ring-2 ring-white`}
                          title={monteur}
                        >
                          <span className="text-white text-[8px] font-bold">{getInitials(monteur)}</span>
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground/70 truncate">
                      {m.monteurs.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
