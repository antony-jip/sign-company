import { Plus, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn, formatCurrency, getStatusColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { TaskChecklistView } from './TaskChecklistView'
import type { Taak, Offerte, Medewerker } from '@/types'

interface TakenOfferteGridProps {
  taken: Taak[]
  offertes: Offerte[]
  medewerkers: Medewerker[]
  projectId: string
  onNewTaak: () => void
  onNewOfferte: () => void
  onTaakStatusChange: (taakId: string, newStatus: Taak['status']) => Promise<void>
}

export function TakenOfferteGrid({
  taken,
  offertes,
  medewerkers,
  projectId,
  onNewTaak,
  onNewOfferte,
  onTaakStatusChange,
}: TakenOfferteGridProps) {
  const navigate = useNavigate()
  const takenKlaar = taken.filter(t => t.status === 'klaar').length

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Taken Column */}
      <div className="border border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
            Taken
            <span className="text-[10px] text-muted-foreground/50 font-mono font-normal">{takenKlaar}/{taken.length}</span>
          </h3>
          <button onClick={onNewTaak} className="text-muted-foreground/50 hover:text-foreground transition-colors">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {taken.length > 0 ? (
          <div className="max-h-[300px] overflow-y-auto -mx-1">
            <TaskChecklistView
              taken={taken}
              medewerkers={medewerkers}
              onStatusChange={onTaakStatusChange}
            />
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-[hsl(35,15%,87%)] rounded-lg">
            <p className="text-[11px] text-muted-foreground/50">Nog geen taken</p>
          </div>
        )}

        <button
          onClick={onNewTaak}
          className="w-full mt-2 py-2 text-[11px] text-muted-foreground/50 hover:text-foreground hover:bg-[hsl(35,15%,97%)] rounded-lg transition-colors border border-dashed border-[hsl(35,15%,90%)]"
        >
          + Taak toevoegen
        </button>
      </div>

      {/* Offerte Column */}
      <div className="border border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-foreground">Offerte</h3>
          <button onClick={onNewOfferte} className="text-muted-foreground/50 hover:text-foreground transition-colors">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {offertes.length > 0 ? (
          <div className="space-y-2">
            {offertes.map((offerte) => (
              <div
                key={offerte.id}
                className="border border-[hsl(35,15%,90%)] rounded-lg p-3 hover:border-[hsl(35,15%,80%)] transition-colors"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{offerte.titel}</p>
                    <p className="text-[11px] font-mono text-muted-foreground/60">{offerte.nummer}</p>
                  </div>
                  <Badge className={cn(getStatusColor(offerte.status), 'text-[10px] px-1.5 py-0')}>
                    {offerte.status}
                  </Badge>
                </div>
                <p className="text-lg font-semibold font-mono text-foreground mb-2.5">
                  {formatCurrency(offerte.totaal)}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/offertes/${offerte.id}/bewerken`)}
                    className="flex-1 h-8 text-[11px] font-medium text-white rounded-lg hover:opacity-90 transition-colors"
                    style={{ backgroundColor: '#1A535C' }}
                  >
                    Bewerken
                  </button>
                  <button
                    onClick={() => navigate(`/offertes/${offerte.id}`)}
                    className="flex-1 h-8 text-[11px] font-medium border border-[hsl(35,15%,85%)] rounded-lg hover:bg-[hsl(35,15%,97%)] text-foreground transition-colors"
                  >
                    Bekijken
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-8 rounded-lg cursor-pointer transition-colors hover:bg-[#FFF5F0]"
            style={{
              border: '1.5px dashed #F5C4B4',
              backgroundColor: '#FFFAF8',
            }}
            onClick={onNewOfferte}
          >
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#FDE8E2' }}>
              <FileText className="h-5 w-5" style={{ color: '#F15025' }} />
            </div>
            <p className="text-[13px] font-medium text-foreground/70 mb-0.5">Nog geen offerte</p>
            <p className="text-[11px] text-muted-foreground/50 mb-3">De eerste is altijd het spannendst.</p>
            <button
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white rounded-lg hover:opacity-90 transition-all shadow-sm mx-auto"
              style={{ backgroundColor: '#F15025', padding: '9px 20px' }}
            >
              <FileText className="h-3.5 w-3.5" />
              Offerte maken
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
