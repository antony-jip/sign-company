import { useState } from 'react'
import { Send, ChevronDown, Clock, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { planLabel, planOpties } from './verzenden'

interface VerzendKnopProps {
  onVerzend: () => void
  onPlan: (iso: string, label: string) => void
  onConceptVerwijderen?: () => void
  bezig?: boolean
  className?: string
}

const menuKnopCls = 'w-full px-3.5 py-2.5 text-left text-[13px] text-foreground hover:bg-background transition-colors duration-150 flex items-center justify-between'

/**
 * Verzenden in Flame met een pijltje voor "Later verzenden". Eén primaire
 * actie in het paneel; de rest zit achter het pijltje.
 */
export function VerzendKnop({ onVerzend, onPlan, onConceptVerwijderen, bezig = false, className }: VerzendKnopProps) {
  const [open, setOpen] = useState(false)
  const [eigen, setEigen] = useState(false)
  const [datum, setDatum] = useState('')
  const [tijd, setTijd] = useState('09:00')

  const sluit = () => { setOpen(false); setEigen(false) }

  const kies = (d: Date) => {
    sluit()
    onPlan(d.toISOString(), planLabel(d))
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      <button
        type="button"
        onClick={onVerzend}
        disabled={bezig}
        className="tap-press h-9 pl-4 pr-3.5 rounded-l-[10px] text-[13px] font-semibold text-white bg-flame shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_12px_rgba(241,80,37,0.35)] hover:-translate-y-px active:translate-y-0 transition-all duration-150 flex items-center gap-2 disabled:opacity-50"
      >
        {bezig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Verzenden
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={bezig}
        title="Later verzenden"
        aria-label="Later verzenden"
        className="h-9 w-8 rounded-r-[10px] bg-flame text-white border-l border-white/25 hover:bg-[#D9421C] transition-colors flex items-center justify-center disabled:opacity-50"
      >
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={sluit} />
          <div className="absolute bottom-full right-0 mb-2 w-[236px] bg-white dark:bg-popover dark:border dark:border-white/10 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] z-50 py-1.5 overflow-hidden">
            <p className="px-3.5 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Later verzenden</p>
            {planOpties().map((opt) => {
              const d = opt.datum()
              return (
                <button key={opt.label} type="button" onClick={() => kies(d)} className={menuKnopCls}>
                  <span>{opt.label}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{planLabel(d)}</span>
                </button>
              )
            })}
            <div className="border-t border-border mt-1 pt-1">
              {!eigen ? (
                <button
                  type="button"
                  onClick={() => {
                    setEigen(true)
                    const morgen = new Date()
                    morgen.setDate(morgen.getDate() + 1)
                    setDatum(morgen.toISOString().split('T')[0])
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-[13px] text-petrol hover:bg-background transition-colors duration-150 flex items-center gap-2"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Eigen datum en tijd
                </button>
              ) : (
                <div className="px-3.5 py-2.5 space-y-2">
                  <DatePicker value={datum} onChange={setDatum} min={new Date().toISOString().split('T')[0]} asInput className="w-full font-mono" />
                  <input
                    type="time"
                    value={tijd}
                    onChange={(e) => setTijd(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[13px] text-foreground bg-background rounded-lg border border-border outline-none focus:border-petrol transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!datum) { toast.error('Kies een datum'); return }
                      const dt = new Date(`${datum}T${tijd}:00`)
                      if (dt <= new Date()) { toast.error('Kies een moment in de toekomst'); return }
                      kies(dt)
                    }}
                    className="w-full py-1.5 rounded-lg bg-petrol text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
                  >
                    Inplannen
                  </button>
                </div>
              )}
            </div>
            {onConceptVerwijderen && (
              <div className="border-t border-border mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => { sluit(); onConceptVerwijderen() }}
                  className="w-full px-3.5 py-2.5 text-left text-[13px] text-muted-foreground hover:text-[#C0451A] hover:bg-background transition-colors duration-150 flex items-center gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Concept verwijderen
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
