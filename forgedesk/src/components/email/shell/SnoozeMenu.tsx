import { useState } from 'react'
import { Moon, X } from 'lucide-react'
import { SNOOZE_OPTIONS, calculateSnoozeDate } from '../emailHelpers'

interface Props {
  open: boolean
  onSluiten: () => void
  onKies: (tot: Date | null) => void
  gesnoozed: boolean
}

/** Het snooze-menu achter `z`: vaste keuzes plus een eigen moment. */
export function SnoozeMenu({ open, onSluiten, onKies, gesnoozed }: Props) {
  const [eigen, zetEigen] = useState('')
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/10" onClick={onSluiten} />
      <div role="dialog" aria-label="Snooze" data-toetsen="uit" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card dark:border dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.10)] p-6 w-[300px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-[15px] font-bold text-foreground inline-flex items-center gap-2"><Moon className="h-4 w-4 text-petrol" /> Snooze tot</h3>
          <button type="button" onClick={onSluiten} className="p-1 hover:bg-muted rounded-lg" aria-label="Sluiten"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-0.5">
          {SNOOZE_OPTIONS.map((o) => (
            <button key={o.label} type="button" onClick={() => { onKies(calculateSnoozeDate(o.hours)); onSluiten() }} className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-foreground/80 hover:bg-background hover:text-foreground transition-colors">
              {o.label}
            </button>
          ))}
          {gesnoozed && (
            <button type="button" onClick={() => { onKies(null); onSluiten() }} className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-flame hover:bg-background transition-colors">
              Snooze opheffen
            </button>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2">
          <input type="datetime-local" value={eigen} onChange={(e) => zetEigen(e.target.value)} className="flex-1 h-8 px-2 text-[12px] bg-background rounded-lg outline-none text-foreground" />
          <button type="button" disabled={!eigen} onClick={() => { onKies(new Date(eigen)); onSluiten() }} className="text-[12px] font-medium text-petrol hover:underline disabled:opacity-40">Kies</button>
        </div>
      </div>
    </>
  )
}
