import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '@/lib/utils'
import { TaskChecklistView } from './TaskChecklistView'
import type { Taak, Offerte, Medewerker } from '@/types'

const offerteStatusLabel: Record<string, string> = {
  concept: 'Concept',
  verzonden: 'Verzonden',
  bekeken: 'Bekeken',
  goedgekeurd: 'Goedgekeurd',
  afgewezen: 'Afgewezen',
  verlopen: 'Verlopen',
  gefactureerd: 'Gefactureerd',
}

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Taken Column */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">
            Taken <span className="font-mono text-[#9B9B95]">{takenKlaar}/{taken.length}</span>
          </h3>
          <button onClick={onNewTaak} className="text-[12px] text-[#F15025] hover:underline">
            + Taak
          </button>
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
          <div className="py-6 text-center">
            <p className="text-sm text-[#9B9B95]">Nog geen taken</p>
            <button onClick={onNewTaak} className="text-sm text-[#1A535C] hover:underline mt-1">
              Taak toevoegen
            </button>
          </div>
        )}
      </div>

      {/* Offerte Column */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Offerte</h3>
          <button onClick={onNewOfferte} className="text-[12px] text-[#F15025] hover:underline">
            + Offerte
          </button>
        </div>

        {offertes.length > 0 ? (
          <div className="space-y-3">
            {offertes.map((offerte) => (
              <div
                key={offerte.id}
                className="bg-[#FFFFFF] rounded-xl p-5 border border-[#EBEBEB]/60 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{offerte.titel}</p>
                  <span className="text-xs text-[#6B6B66] flex-shrink-0">
                    {offerteStatusLabel[offerte.status] || offerte.status}<span className="text-[#F15025]">.</span>
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[#9B9B95]">{offerte.nummer}</span>
                  <span className="text-lg font-mono font-bold text-[#1A1A1A]">{formatCurrency(offerte.totaal)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/offertes/${offerte.id}/bewerken`)}
                    className="text-sm font-medium text-[#1A535C] hover:underline"
                  >
                    Bewerken
                  </button>
                  <button
                    onClick={() => navigate(`/offertes/${offerte.id}`)}
                    className="text-sm font-medium text-[#1A535C] hover:underline"
                  >
                    Bekijken
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-[#9B9B95]">Nog geen offerte</p>
            <button
              onClick={onNewOfferte}
              className="text-sm text-[#F15025] font-medium hover:underline mt-1"
            >
              Offerte maken
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
