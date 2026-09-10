import { CheckCircle2, Banknote, X } from 'lucide-react'
import type { Notificatie } from '@/types'
import { veer, vlak } from '../tijd'

// De toast uit NotificatieCenter (regels 244-289), zelfde klassen. Die is daar
// intern en niet exporteerbaar, vandaar deze kopie. Positie in telefoon-px.
export const Toast: React.FC<{ t: number; op: number; notificatie: Notificatie; top?: number }> = ({ t, op, notificatie, top = 60 }) => {
  const p = veer(t, op, { demping: 16, duurMs: 700 })
  const zicht = vlak(t, op, op + 200)
  const isBetaling = notificatie.type === 'betaling_ontvangen'
  const Icon = isBetaling ? Banknote : CheckCircle2
  return (
    <div className="absolute inset-x-3 z-[60]" style={{ top, opacity: zicht, transform: `translateY(${(1 - p) * -40}px)` }}>
      <div
        className="flex items-start gap-3 rounded-xl bg-card p-4 shadow-[0_12px_32px_rgba(120,90,50,0.12),0_2px_6px_rgba(0,0,0,0.04)]"
        style={{ border: '0.5px solid hsl(var(--border))' }}
      >
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: isBetaling ? '#E4F0EA' : '#E8F2EC' }}>
          <Icon className="h-4 w-4" style={{ color: isBetaling ? '#2D6B48' : '#1A535C' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-snug text-foreground">{notificatie.titel}</p>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">{notificatie.bericht}</p>
        </div>
        <X className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      </div>
    </div>
  )
}
