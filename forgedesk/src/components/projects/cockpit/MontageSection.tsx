import { Plus, CalendarDays, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'
import type { MontageAfspraak } from '@/types'

const montageStatusColors: Record<string, string> = {
  gepland: 'bg-blue-100 text-blue-700',
  onderweg: 'bg-amber-100 text-amber-700',
  bezig: 'bg-green-100 text-green-700',
  afgerond: 'bg-emerald-100 text-emerald-700',
  uitgesteld: 'bg-red-100 text-red-700',
}

interface MontageSectionProps {
  montageAfspraken: MontageAfspraak[]
  onInplannen: () => void
}

export function MontageSection({ montageAfspraken, onInplannen }: MontageSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-medium text-foreground">Montage</h3>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onInplannen}>
          <Plus className="h-3 w-3 mr-1" />
          Inplannen
        </Button>
      </div>

      {montageAfspraken.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-border rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Nog niet gepland</p>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={onInplannen}>
            <Plus className="h-3 w-3 mr-1" />
            Inplannen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {montageAfspraken.map((m) => (
            <div key={m.id} className="rounded-lg border border-border p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground truncate">{m.titel}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${montageStatusColors[m.status] || 'bg-muted text-foreground'}`}>
                  {m.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3 flex-shrink-0" />
                <span className="font-mono">
                  {new Date(m.datum).toLocaleDateString('nl-NL')} {m.start_tijd}–{m.eind_tijd}
                </span>
              </div>
              {m.locatie && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{m.locatie}</span>
                </div>
              )}
              {m.monteurs && m.monteurs.length > 0 && (
                <div className="flex items-center gap-1">
                  {m.monteurs.map((monteur) => (
                    <div
                      key={monteur}
                      className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center"
                      title={monteur}
                    >
                      <span className="text-white text-[8px] font-bold">{getInitials(monteur)}</span>
                    </div>
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{m.monteurs.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
