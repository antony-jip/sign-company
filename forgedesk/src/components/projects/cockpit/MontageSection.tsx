import { Plus, CalendarDays, MapPin, Wrench, Truck, Clock, CheckCircle2, PauseCircle, Paperclip, ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'
import type { MontageAfspraak } from '@/types'

const montageStatusConfig: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  gepland:    { label: 'Gepland',    cls: 'badge-blauw',     icon: CalendarDays },
  onderweg:   { label: 'Onderweg',   cls: 'badge-grijs',     icon: Truck },
  bezig:      { label: 'Bezig',      cls: 'badge-paars',     icon: Wrench },
  afgerond:   { label: 'Afgerond',   cls: 'badge-petrol',    icon: CheckCircle2 },
  uitgesteld: { label: 'Uitgesteld', cls: 'badge-flame',     icon: PauseCircle },
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
        <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Montage</h3>
        <button
          onClick={onInplannen}
          className="text-[12px] text-[#1A535C] hover:underline transition-colors"
        >
          + Inplannen
        </button>
      </div>

      {montageAfspraken.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-[#9B9B95]">Nog niet gepland</p>
          <button
            onClick={onInplannen}
            className="text-sm text-[#1A535C] hover:underline mt-1"
          >
            Montage inplannen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {montageAfspraken.map((m) => {
            const st = montageStatusConfig[m.status] || montageStatusConfig.gepland
            const StatusIcon = st.icon

            return (
              <div key={m.id} className="py-3 border-b border-[#EBEBEB] last:border-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{m.titel}</p>
                  <span className="text-xs text-[#6B6B66] flex-shrink-0">
                    {st.label}<span className="text-[#F15025]">.</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B66]">
                  <CalendarDays className="h-3 w-3 flex-shrink-0 text-[#9B9B95]" />
                  <span className="font-mono text-[#1A1A1A]">
                    {new Date(m.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    {' '}
                    {m.start_tijd}–{m.eind_tijd}
                  </span>
                </div>

                {m.locatie && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B66]">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-[#9B9B95]" />
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

                {m.werkbon_id && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <ClipboardCheck className="h-3 w-3 flex-shrink-0 text-[#C44830]" />
                    <Link
                      to={`/werkbonnen/${m.werkbon_id}`}
                      className="font-mono font-medium text-[#1A535C] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {m.werkbon_nummer || 'Werkbon'}
                    </Link>
                  </div>
                )}

                {m.bijlagen && m.bijlagen.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Paperclip className="h-3 w-3 flex-shrink-0 text-muted-foreground/50" />
                    <span>{m.bijlagen.length} bijlage{m.bijlagen.length !== 1 ? 'n' : ''}</span>
                    <div className="flex gap-1">
                      {m.bijlagen.slice(0, 3).map((b) => (
                        <a
                          key={b.id}
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#1A535C] hover:underline truncate max-w-[80px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {b.naam}
                        </a>
                      ))}
                    </div>
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
