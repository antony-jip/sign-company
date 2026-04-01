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

const offerteStatusColor: Record<string, string> = {
  concept: '#8A7A4A',
  verzonden: '#3A5A9A',
  bekeken: '#3A5A9A',
  goedgekeurd: '#3A7D52',
  afgewezen: '#C0451A',
  verlopen: '#C0451A',
  gefactureerd: '#1A535C',
}

interface TakenOfferteGridProps {
  taken: Taak[]
  offertes: Offerte[]
  medewerkers: Medewerker[]
  projectId: string
  onNewTaak: () => void
  onNewOfferte: () => void
  onTaakStatusChange: (taakId: string, newStatus: Taak['status']) => Promise<void>
  onOpdrachtbevestiging?: (offerte: Offerte) => void
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Taken */}
      <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[13px] font-bold text-[#1A1A1A] tracking-[-0.2px]">Taken</h3>
            <span className="text-[12px] font-mono text-[#9B9B95]">{takenKlaar}/{taken.length}</span>
          </div>
          <button onClick={onNewTaak} className="text-[12px] font-semibold text-[#F15025] hover:underline">
            + Taak
          </button>
        </div>

        {taken.length > 0 ? (
          <div className="max-h-[300px] overflow-y-auto -mx-1 px-1">
            <TaskChecklistView
              taken={taken}
              medewerkers={medewerkers}
              onStatusChange={onTaakStatusChange}
            />
          </div>
        ) : (
          <div
            onClick={onNewTaak}
            className="cursor-pointer rounded-lg px-4 py-8 bg-[#F8F7F5] hover:bg-[#F4F2EE] transition-all text-center"
          >
            <p className="text-[13px] text-[#9B9B95]">Nog geen taken</p>
            <p className="text-[12px] text-[#F15025] font-medium mt-1">+ Eerste taak toevoegen</p>
          </div>
        )}
      </div>

      {/* Offertes */}
      <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-bold text-[#1A1A1A] tracking-[-0.2px]">Offertes</h3>
          <button onClick={onNewOfferte} className="text-[12px] font-semibold text-[#F15025] hover:underline">
            + Offerte
          </button>
        </div>

        {offertes.length > 0 ? (
          <div className="space-y-1">
            {offertes.map((offerte) => {
              const statusColor = offerteStatusColor[offerte.status] || '#6B6B66'
              return (
                <div
                  key={offerte.id}
                  onClick={() => navigate(`/offertes/${offerte.id}/bewerken`)}
                  className="rounded-lg px-4 py-3.5 hover:bg-[#F8F7F5] cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-[#1A1A1A] truncate group-hover:text-[#1A535C] transition-colors">{offerte.titel}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] font-mono text-[#9B9B95]">{offerte.nummer}</span>
                        <span className="text-[11px] font-medium" style={{ color: statusColor }}>
                          {offerteStatusLabel[offerte.status] || offerte.status}<span className="text-[#F15025]">.</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-[17px] font-mono font-bold text-[#1A1A1A] flex-shrink-0 mt-0.5">
                      {formatCurrency(offerte.totaal)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div
            onClick={onNewOfferte}
            className="cursor-pointer rounded-lg px-4 py-8 bg-[#F8F7F5] hover:bg-[#F4F2EE] transition-all text-center"
          >
            <p className="text-[13px] text-[#9B9B95]">Nog geen offertes</p>
            <p className="text-[12px] text-[#F15025] font-medium mt-1">+ Offerte maken</p>
          </div>
        )}
      </div>
    </div>
  )
}
