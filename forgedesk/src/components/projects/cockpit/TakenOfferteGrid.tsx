import { ClipboardList, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatAmount } from '@/lib/utils'
import { getStatusPillClass, getStatusPillTone, getStatusLabel, type PillTone } from '@/utils/statusColors'
import { TaskChecklistView } from './TaskChecklistView'
import type { Taak, Offerte, Medewerker } from '@/types'

const toneAccent: Record<PillTone, string> = {
  cream:    'var(--cream-text)',
  mist:     'var(--mist-text)',
  blush:    'var(--blush-text)',
  sage:     'var(--sage-text)',
  lavender: 'var(--lavender-text)',
  coral:    'var(--coral-text)',
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
  onNewTaak,
  onNewOfferte,
  onTaakStatusChange,
}: TakenOfferteGridProps) {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ── Taken ── */}
      <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(130,100,60,0.04)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.08em]">Taken</h3>
            <span className="font-mono text-[10px] font-medium bg-[var(--cream-bg)] text-[var(--cream-text)] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {taken.length}
            </span>
          </div>
          <button onClick={onNewTaak} className="text-[12px] text-[#6B6B66] hover:text-[#1A1A1A] transition-colors">
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
          <button
            onClick={onNewTaak}
            className="w-full rounded-lg border border-dashed border-[#D8D5CF] bg-transparent hover:bg-[var(--cream-bg)] hover:border-[var(--cream-border)] transition-all px-4 py-7 flex flex-col items-center gap-2 text-center group"
          >
            <ClipboardList className="h-6 w-6 text-[#B0ADA8] group-hover:text-[var(--cream-text)] transition-colors" />
            <div>
              <p className="text-[13px] font-semibold text-[#1A1A1A]">Eerste taak toevoegen</p>
              <p className="text-[12px] text-[#9B9B95] mt-0.5">Wat moet er gebeuren?</p>
            </div>
          </button>
        )}
      </div>

      {/* ── Offertes ── */}
      <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(130,100,60,0.04)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.08em]">Offertes</h3>
            <span className="font-mono text-[10px] font-medium bg-[var(--cream-bg)] text-[var(--cream-text)] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {offertes.length}
            </span>
          </div>
          <button onClick={onNewOfferte} className="text-[12px] text-[#6B6B66] hover:text-[#1A1A1A] transition-colors">
            + Offerte
          </button>
        </div>

        {offertes.length > 0 ? (
          <div className="space-y-0.5 -mx-2">
            {offertes.map((offerte) => {
              const tone = getStatusPillTone(offerte.status)
              const accent = toneAccent[tone]
              return (
                <div
                  key={offerte.id}
                  onClick={() => navigate(`/offertes/${offerte.id}/bewerken`)}
                  className="group relative cursor-pointer rounded-lg px-3 py-3 hover:bg-[#FAFAF8] transition-colors"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: accent }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-[#1A1A1A] truncate">
                        {offerte.titel || 'Offerte zonder titel'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[11px] text-[#9B9B95]">{offerte.nummer}</span>
                        <span className={getStatusPillClass(offerte.status)} style={{ fontSize: 11, padding: '2px 8px' }}>
                          {getStatusLabel(offerte.status)}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[15px] tabular-nums flex-shrink-0 mt-0.5">
                      <span className="text-[#9B9B95]">€</span>
                      <span className="text-[#1A1A1A] font-semibold ml-0.5">{formatAmount(offerte.totaal)}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <button
            onClick={onNewOfferte}
            className="w-full rounded-lg border border-dashed border-[#D8D5CF] bg-transparent hover:bg-[var(--cream-bg)] hover:border-[var(--cream-border)] transition-all px-4 py-7 flex flex-col items-center gap-2 text-center group"
          >
            <FileText className="h-6 w-6 text-[#B0ADA8] group-hover:text-[var(--cream-text)] transition-colors" />
            <div>
              <p className="text-[13px] font-semibold text-[#1A1A1A]">Offerte maken</p>
              <p className="text-[12px] text-[#9B9B95] mt-0.5">Stuur een prijsopgave</p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
