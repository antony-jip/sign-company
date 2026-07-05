import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks, Receipt, Plus, Trash2, Wrench, CalendarDays, MapPin } from 'lucide-react'
import { formatAmount, getInitials } from '@/lib/utils'
import { getStatusPillClass, getStatusPillTone, getStatusLabel, type PillTone } from '@/utils/statusColors'
import { TaskChecklistView } from './TaskChecklistView'
import type { Taak, Offerte, Medewerker, MontageAfspraak } from '@/types'

function parseBedrag(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0
}

const montageStatusLabel: Record<MontageAfspraak['status'], string> = {
  gepland:    'Gepland',
  onderweg:   'Onderweg',
  bezig:      'Bezig',
  afgerond:   'Afgerond',
  uitgesteld: 'Uitgesteld',
}

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
  montageAfspraken?: MontageAfspraak[]
  medewerkers: Medewerker[]
  projectId: string
  onMontageEdit?: (m: MontageAfspraak) => void
  onMontageDelete?: (m: MontageAfspraak) => Promise<void> | void
  onNewTaak: () => void
  onNewOfferte: () => void
  onTaakStatusChange: (taakId: string, newStatus: Taak['status']) => Promise<void>
  onTaakDelete?: (taak: Taak) => Promise<void> | void
  onOpdrachtbevestiging?: (offerte: Offerte) => void
  onOfferteDelete?: (offerte: Offerte) => Promise<void> | void
  onQuickOfferte?: (bedrag: number) => Promise<void>
  onUpdateOffertePrice?: (offerte: Offerte, bedragInclBtw: number) => Promise<void>
}

export function TakenOfferteGrid({
  taken,
  offertes,
  montageAfspraken = [],
  medewerkers,
  onMontageEdit,
  onMontageDelete,
  onNewTaak,
  onNewOfferte,
  onTaakStatusChange,
  onTaakDelete,
  onOfferteDelete,
  onQuickOfferte,
  onUpdateOffertePrice,
}: TakenOfferteGridProps) {
  const navigate = useNavigate()
  const [quickBedrag, setQuickBedrag] = useState('')
  const [quickSubmitting, setQuickSubmitting] = useState(false)
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)

  // Montage-monteurs worden als medewerker-id opgeslagen; toon de naam i.p.v. de id.
  const monteurNaam = (idOrNaam: string) => medewerkers.find((mw) => mw.id === idOrNaam)?.naam || idOrNaam

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

  function startEditPrice(offerte: Offerte) {
    setPriceInput(offerte.totaal ? offerte.totaal.toFixed(2).replace('.', ',') : '')
    setEditingPriceId(offerte.id)
  }

  async function submitEditPrice(offerte: Offerte) {
    if (!onUpdateOffertePrice) { setEditingPriceId(null); return }
    const bedrag = parseBedrag(priceInput)
    if (bedrag <= 0 || bedrag === offerte.totaal) { setEditingPriceId(null); return }
    setSavingPrice(true)
    try {
      await onUpdateOffertePrice(offerte, bedrag)
      setEditingPriceId(null)
    } finally {
      setSavingPrice(false)
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
              Taken<span className="text-flame">.</span>
            </h3>
            {taken.length > 0 && (
              <span className="font-mono text-[10px] font-semibold bg-[rgba(26,83,92,0.08)] text-petrol rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums">
                {taken.length}
              </span>
            )}
          </div>
          <button
            onClick={onNewTaak}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-petrol hover:text-[#0F3D44] hover:underline transition-colors"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
            Taak
          </button>
        </div>

        {montageAfspraken.length > 0 && (
          <div className="mb-3 space-y-2">
            {montageAfspraken.map((m) => (
              <div
                key={m.id}
                onClick={onMontageEdit ? () => onMontageEdit(m) : undefined}
                className={`group relative rounded-xl border border-[rgba(26,83,92,0.16)] bg-[rgba(26,83,92,0.045)] px-3 py-2.5${onMontageEdit ? ' cursor-pointer hover:bg-[rgba(26,83,92,0.08)] transition-colors' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="h-3 w-3 text-petrol" strokeWidth={2} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-petrol">Montage</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-foreground/70 flex-shrink-0">
                      {montageStatusLabel[m.status] || 'Gepland'}<span className="text-flame">.</span>
                    </span>
                    {onMontageDelete && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void onMontageDelete(m) }}
                        title="Montage verwijderen"
                        aria-label="Montage verwijderen"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/70 hover:bg-[hsl(var(--status-flame-bg))] hover:text-[#C03A18] transition-all flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[13px] font-semibold text-foreground truncate mt-1">{m.titel}</p>

                <div className="flex items-center gap-1.5 text-[11px] text-foreground/70 mt-1">
                  <CalendarDays className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  <span className="font-mono text-foreground">
                    {new Date(m.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    {' '}
                    {m.start_tijd}–{m.eind_tijd}
                  </span>
                </div>

                {m.locatie && (
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground/70 mt-1">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate">{m.locatie}</span>
                  </div>
                )}

                {m.monteurs && m.monteurs.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex -space-x-1.5">
                      {m.monteurs.map((monteur) => {
                        const naam = monteurNaam(monteur)
                        return (
                          <div
                            key={monteur}
                            className={`h-5 w-5 rounded-full bg-gradient-to-br ${monteurColor(naam)} flex items-center justify-center ring-2 ring-white`}
                            title={naam}
                          >
                            <span className="text-white text-[7px] font-bold">{getInitials(naam)}</span>
                          </div>
                        )
                      })}
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate">{m.monteurs.map(monteurNaam).join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {taken.length > 0 ? (
          <div className="max-h-[300px] overflow-y-auto -mx-1 px-1">
            <TaskChecklistView
              taken={taken}
              medewerkers={medewerkers}
              onStatusChange={onTaakStatusChange}
              onTaakDelete={onTaakDelete}
            />
          </div>
        ) : (
          <button
            onClick={onNewTaak}
            className="w-full rounded-xl border border-dashed border-[rgba(26,83,92,0.18)] bg-transparent hover:bg-muted/40 hover:border-[rgba(26,83,92,0.3)] transition-all px-4 py-8 flex flex-col items-center gap-2.5 text-center group"
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
              Offertes<span className="text-flame">.</span>
            </h3>
            {offertes.length > 0 && (
              <span className="font-mono text-[10px] font-semibold bg-[rgba(241,80,37,0.1)] text-flame rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums">
                {offertes.length}
              </span>
            )}
          </div>
          <button
            onClick={onNewOfferte}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-flame hover:text-[#D03A18] hover:underline transition-colors"
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
                      <p className="text-[14px] font-semibold text-foreground truncate group-hover:text-petrol transition-colors">
                        {offerte.titel || 'Offerte zonder titel'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-muted-foreground bg-[rgba(26,83,92,0.05)] px-1.5 py-0.5 rounded">{offerte.nummer}</span>
                        <span className={getStatusPillClass(offerte.status)} style={{ fontSize: 11, padding: '2px 8px' }}>
                          {getStatusLabel(offerte.status)}
                        </span>
                      </div>
                    </div>
                    {onUpdateOffertePrice && offerte.status === 'concept' ? (
                      editingPriceId === offerte.id ? (
                        <div className="relative flex-shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground font-mono pointer-events-none">€</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            autoFocus
                            value={priceInput}
                            disabled={savingPrice}
                            onChange={(e) => setPriceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); void submitEditPrice(offerte) }
                              else if (e.key === 'Escape') { setEditingPriceId(null) }
                            }}
                            onBlur={() => void submitEditPrice(offerte)}
                            className="w-[96px] h-7 pl-5 pr-1.5 text-[14px] font-mono font-bold text-right text-foreground border border-flame rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-flame/30 disabled:opacity-50"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startEditPrice(offerte) }}
                          title="Prijs aanpassen"
                          className="font-mono text-[15px] tabular-nums flex-shrink-0 mt-0.5 rounded-md px-1 -mr-1 hover:bg-[rgba(241,80,37,0.08)] transition-colors"
                        >
                          <span className="text-muted-foreground">€</span>
                          <span className="text-foreground font-bold ml-0.5 border-b border-dashed border-flame/30">{formatAmount(offerte.totaal)}</span>
                        </button>
                      )
                    ) : (
                      <span className="font-mono text-[15px] tabular-nums flex-shrink-0 mt-0.5">
                        <span className="text-muted-foreground">€</span>
                        <span className="text-foreground font-bold ml-0.5">{formatAmount(offerte.totaal)}</span>
                      </span>
                    )}
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
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 flex flex-col gap-2">
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
                  className="w-full h-9 pl-6 pr-2.5 text-sm font-mono text-right text-foreground border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-flame/25 focus:border-flame/60 disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={!canQuickSubmit}
                className="h-9 px-3.5 text-[12px] font-semibold text-white rounded-lg transition-colors whitespace-nowrap disabled:opacity-40"
                style={{ backgroundColor: '#F15025' }}
              >
                {quickSubmitting ? 'Aanmaken.' : 'Prijs aanmaken'}
              </button>
            </form>
            <button
              type="button"
              onClick={onNewOfferte}
              className="self-end text-[11px] text-muted-foreground hover:text-flame hover:underline transition-colors"
            >
              of open de volledige editor
            </button>
          </div>
        ) : (
          <button
            onClick={onNewOfferte}
            className="w-full rounded-xl border border-dashed border-[rgba(241,80,37,0.22)] bg-transparent hover:bg-muted/40 hover:border-[rgba(241,80,37,0.4)] transition-all px-4 py-8 flex flex-col items-center gap-2.5 text-center group"
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
