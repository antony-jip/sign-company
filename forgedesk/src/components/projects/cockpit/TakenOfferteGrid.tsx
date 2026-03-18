import { Plus, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, getStatusColor } from '@/lib/utils'
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
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">
            Taken
            <span className="text-muted-foreground font-normal ml-1.5">{takenKlaar}/{taken.length}</span>
          </h3>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onNewTaak}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {taken.length > 0 ? (
          <div className="max-h-[300px] overflow-y-auto">
            <TaskChecklistView
              taken={taken}
              medewerkers={medewerkers}
              onStatusChange={onTaakStatusChange}
            />
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">Nog geen taken</p>
          </div>
        )}

        <button
          onClick={onNewTaak}
          className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors border border-dashed border-border"
        >
          + Taak toevoegen
        </button>
      </div>

      {/* Offerte Column */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">Offerte</h3>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onNewOfferte}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {offertes.length > 0 ? (
          <div className="space-y-2">
            {offertes.map((offerte) => (
              <div
                key={offerte.id}
                className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{offerte.titel}</p>
                    <p className="text-xs font-mono text-muted-foreground">{offerte.nummer}</p>
                  </div>
                  <Badge className={cn(getStatusColor(offerte.status), 'text-[10px] px-1.5 py-0')}>
                    {offerte.status}
                  </Badge>
                </div>
                <p className="text-lg font-semibold font-mono text-foreground mb-2">
                  {formatCurrency(offerte.totaal)}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs flex-1"
                    onClick={() => navigate(`/offertes/${offerte.id}/bewerken`)}
                  >
                    Bewerken
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs flex-1"
                    onClick={() => navigate(`/offertes/${offerte.id}`)}
                  >
                    Bekijken
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/30 transition-colors"
            onClick={onNewOfferte}
          >
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">+ Offerte maken</p>
          </div>
        )}
      </div>
    </div>
  )
}
