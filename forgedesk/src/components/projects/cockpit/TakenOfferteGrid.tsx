import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks, Receipt, Plus, Trash2 } from 'lucide-react'
import { formatAmount } from '@/lib/utils'
import { getStatusPillClass, getStatusPillTone, getStatusLabel, type PillTone } from '@/utils/statusColors'
import { TaskChecklistView } from './TaskChecklistView'
import type { Taak, Offerte, Medewerker } from '@/types'

function parseBedrag(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0
}

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
  onOfferteDelete?: (offerte: Offerte) => Promise<void> | void
  onQuickOfferte?: (bedrag: number) => Promise<void>
}

export function TakenOfferteGrid({
  taken,
  offertes,
  medewerkers,
  onNewTaak,
  onNewOfferte,
  onTaakStatusChange,
  onOfferteDelete,
  onQuickOfferte,
}: TakenOfferteGridProps) {
  const navigate = useNavigate()
  const [quickBedrag, setQuickBedrag] = useState('')
  const [quickSubmitting, setQuickSubmitting] = useState(false)

  const quickValue = parseBedrag(quickBedrag)
  const canQuickSubmit = quickValue > 0 && !quickSubmitting

  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!onQuickOfferte || !canQuickSubmit) return
    setQuickSubmitting(true)
    try {
      await onQuickOfferte(quickValue)
      setQuickBedrag('')
    } finally {
      setQuickSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ── Taken ── */}
      <div className="doen-slate-surface rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" strokeWidth={1.75} style={{ color: '#1A535C' }} />
            <h3 className="font-heading text-[15px] font-bold text-foreground">
              Taken<span className="text-[#F15025]">.</span>
            </h3>
            {taken.length > 0 && (
              <span className="font-mono text-[10px] font-semibold bg-[rgba(26,83,92,0.08)] text-[#1A535C] rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums">
                {taken.length}
              </span>
            )}
          </div>
          <button
            onClick={onNewTaak}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1A535C] hover:text-[#0F3D44] hover:underline transition-colors"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
            Taak
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
            className="w-full rounded-xl border border-dashed border-[rgba(26,83,92,0.18)] bg-transparent hover:bg-white/40 hover:border-[rgba(26,83,92,0.3)] transition-all px-4 py-8 flex flex-col items-center gap-2.5 text-center group"
          >
            <ListChecks className="h-7 w-7 transition-transform group-hover:scale-110" strokeWidth={1.5} style={{ color: 'rgba(26,83,92,0.45)' }} />
            <div>
              <p className="text-[13px] font-semibold text-foreground">Eerste taak toevoegen</p>
              <p
                className="text-[12px] text-muted-foreground mt-0.5"
                style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
              >
                wat moet er gebeuren?
              </p>
            </div>
          </button>
        )}
      </div>

      {/* ── Offertes ── */}
      <div className="doen-slate-surface rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4" strokeWidth={1.75} style={{ color: '#F15025' }} />
            <h3 className="font-heading text-[15px] font-bold text-foreground">
              Offertes<span className="text-[#F15025]">.</span>
            </h3>
            {offertes.length > 0 && (
              <span className="font-mono text-[10px] font-semibold bg-[rgba(241,80,37,0.1)] text-[#F15025] rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums">
                {offertes.length}
              </span>
            )}
          </div>
          <button
            onClick={onNewOfferte}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#F15025] hover:text-[#D03A18] hover:underline transition-colors"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
            Offerte
          </button>
        </div>

        {offertes.length > 0 ? (
          <div className="space-y-1 -mx-2">
            {offertes.map((offerte) => {
              const tone = getStatusPillTone(offerte.status)
              const accent = toneAccent[tone]
              return (
                <div
                  key={offerte.id}
                  onClick={() => navigate(`/offertes/${offerte.id}/bewerken`)}
                  className="group relative cursor-pointer rounded-lg px-3 py-2.5 hover:bg-card/70 transition-colors"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: accent }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-foreground truncate group-hover:text-[#1A535C] transition-colors">
                        {offerte.titel || 'Offerte zonder titel'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10.5px] text-muted-foreground bg-[rgba(26,83,92,0.05)] px-1.5 py-0.5 rounded">{offerte.nummer}</span>
                        <span className={getStatusPillClass(offerte.status)} style={{ fontSize: 11, padding: '2px 8px' }}>
                          {getStatusLabel(offerte.status)}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[15px] tabular-nums flex-shrink-0 mt-0.5">
                      <span className="text-muted-foreground">€</span>
                      <span className="text-foreground font-bold ml-0.5">{formatAmount(offerte.totaal)}</span>
                    </span>
                    {onOfferteDelete && !offerte.geconverteerd_naar_factuur_id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void onOfferteDelete(offerte)
                        }}
                        title={`Offerte ${offerte.nummer} verwijderen`}
                        aria-label={`Offerte ${offerte.nummer} verwijderen`}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:bg-[hsl(var(--status-flame-bg))] hover:text-[#C03A18] transition-all flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : onQuickOfferte ? (
          <div className="rounded-xl border border-dashed border-[rgba(241,80,37,0.22)] bg-transparent px-3 py-3 flex flex-col gap-1.5">
            <form onSubmit={handleQuickSubmit} className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground font-mono pointer-events-none">€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={quickBedrag}
                  onChange={(e) => setQuickBedrag(e.target.value)}
                  placeholder="0,00"
                  disabled={quickSubmitting}
                  className="w-full h-8 pl-6 pr-2 text-sm font-mono text-right text-foreground border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-[#F15025]/30 focus:border-[#F15025] disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={!canQuickSubmit}
                className="h-8 px-3 text-[12px] font-semibold text-white rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                style={{ backgroundColor: '#F15025' }}
              >
                {quickSubmitting ? 'Aanmaken.' : 'Prijs aanmaken'}
              </button>
            </form>
            <button
              type="button"
              onClick={onNewOfferte}
              className="self-end text-[11px] text-muted-foreground hover:text-[#F15025] hover:underline transition-colors"
            >
              of open de volledige editor
            </button>
          </div>
        ) : (
          <button
            onClick={onNewOfferte}
            className="w-full rounded-xl border border-dashed border-[rgba(241,80,37,0.22)] bg-transparent hover:bg-white/40 hover:border-[rgba(241,80,37,0.4)] transition-all px-4 py-8 flex flex-col items-center gap-2.5 text-center group"
          >
            <Receipt className="h-7 w-7 transition-transform group-hover:scale-110" strokeWidth={1.5} style={{ color: 'rgba(241,80,37,0.5)' }} />
            <div>
              <p className="text-[13px] font-semibold text-foreground">Offerte maken</p>
              <p
                className="text-[12px] text-muted-foreground mt-0.5"
                style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
              >
                stuur een prijsopgave
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
