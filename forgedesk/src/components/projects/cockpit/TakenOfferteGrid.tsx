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

const offerteStatusColor: Record<string, { bg: string; text: string }> = {
  concept: { bg: '#F5F2E8', text: '#8A7A4A' },
  verzonden: { bg: '#E8EEF9', text: '#3A5A9A' },
  bekeken: { bg: '#E8EEF9', text: '#3A5A9A' },
  goedgekeurd: { bg: '#E8F2EC', text: '#3A7D52' },
  afgewezen: { bg: '#FDE8E2', text: '#C03A18' },
  verlopen: { bg: '#FDE8E2', text: '#C03A18' },
  gefactureerd: { bg: '#E2F0F0', text: '#1A535C' },
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Taken Column */}
      <div className="bg-white rounded-xl border border-[#EBEBEB]/60 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-semibold text-[#9B9B95] uppercase tracking-widest">
            Taken <span className="font-mono">{takenKlaar}/{taken.length}</span>
          </h3>
          <button onClick={onNewTaak} className="text-[11px] font-semibold text-[#F15025] hover:underline flex items-center gap-0.5">
            <Plus className="h-3 w-3" /> Taak
          </button>
        </div>

        {taken.length > 0 ? (
          <div className="max-h-[280px] overflow-y-auto -mx-1 px-1">
            <TaskChecklistView
              taken={taken}
              medewerkers={medewerkers}
              onStatusChange={onTaakStatusChange}
            />
          </div>
        ) : (
          <button
            onClick={onNewTaak}
            className="w-full py-4 text-center rounded-lg border border-dashed border-[#EBEBEB] hover:border-[#1A535C]/30 transition-colors group"
          >
            <Plus className="h-4 w-4 mx-auto mb-1 text-[#9B9B95] group-hover:text-[#1A535C] transition-colors" />
            <p className="text-[12px] text-[#9B9B95] group-hover:text-[#1A535C] transition-colors">Eerste taak toevoegen</p>
          </button>
        )}
      </div>

      {/* Offerte Column */}
      <div className="bg-white rounded-xl border border-[#EBEBEB]/60 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-semibold text-[#9B9B95] uppercase tracking-widest">Offertes</h3>
          <button onClick={onNewOfferte} className="text-[11px] font-semibold text-[#F15025] hover:underline flex items-center gap-0.5">
            <Plus className="h-3 w-3" /> Offerte
          </button>
        </div>

        {offertes.length > 0 ? (
          <div className="space-y-2">
            {offertes.map((offerte) => {
              const sc = offerteStatusColor[offerte.status] || { bg: '#F0EFEC', text: '#6B6B66' }
              return (
                <div
                  key={offerte.id}
                  onClick={() => navigate(`/offertes/${offerte.id}/bewerken`)}
                  className="rounded-lg p-3 border border-[#EBEBEB]/40 hover:border-[#1A535C]/20 hover:shadow-sm cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[#1A1A1A] truncate group-hover:text-[#1A535C] transition-colors">{offerte.titel}</p>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sc.bg, color: sc.text }}
                    >
                      {offerteStatusLabel[offerte.status] || offerte.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-mono text-[#9B9B95]">{offerte.nummer}</span>
                    <span className="text-[15px] font-mono font-bold text-[#1A1A1A]">{formatCurrency(offerte.totaal)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <button
            onClick={onNewOfferte}
            className="w-full py-4 text-center rounded-lg border border-dashed border-[#EBEBEB] hover:border-[#F15025]/30 transition-colors group"
          >
            <Plus className="h-4 w-4 mx-auto mb-1 text-[#9B9B95] group-hover:text-[#F15025] transition-colors" />
            <p className="text-[12px] text-[#9B9B95] group-hover:text-[#F15025] transition-colors">Offerte maken</p>
          </button>
        )}
      </div>
    </div>
  )
}
