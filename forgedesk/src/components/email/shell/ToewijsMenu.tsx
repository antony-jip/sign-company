import { useEffect, useRef, useState } from 'react'
import { Check, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToewijzing, type ToewijsDoel } from './toewijzing'

export function ToewijsAvatar({ doel, formaat = 18, titel }: { doel: ToewijsDoel; formaat?: number; titel?: string }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-black/[0.06]"
      style={{ width: formaat, height: formaat, backgroundColor: doel.kleur.bg, color: doel.kleur.text }}
      title={titel ?? `Opgepakt door ${doel.naam}`}
    >
      <span className="font-bold leading-none" style={{ fontSize: Math.round(formaat * 0.44) }}>{doel.initiaal}</span>
    </span>
  )
}

interface Props {
  /** Huidige waarde van toegewezen_aan; null als niemand het opgepakt heeft. */
  waarde: string | null | undefined
  onKies: (sleutel: string | null) => void
  /** Compacte knop zonder tekst, voor de kop van een lijstrij. */
  compact?: boolean
  className?: string
}

/** "Toewijzen aan": de collega's uit MedewerkersContext, plus vrijgeven. */
export function ToewijsMenu({ waarde, onKies, compact, className }: Props) {
  const { doelen, zoek } = useToewijzing()
  const [open, zetOpen] = useState(false)
  const wortel = useRef<HTMLDivElement>(null)
  const huidig = zoek(waarde)

  useEffect(() => {
    if (!open) return
    const buiten = (e: MouseEvent) => { if (!wortel.current?.contains(e.target as Node)) zetOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') zetOpen(false) }
    document.addEventListener('mousedown', buiten)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', buiten); document.removeEventListener('keydown', esc) }
  }, [open])

  return (
    <div ref={wortel} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => zetOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={huidig ? `Opgepakt door ${huidig.naam}` : 'Toewijzen aan een collega'}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-[9px] text-[12px] font-medium transition-colors',
          compact ? 'w-7 justify-center' : 'px-2',
          huidig
            ? 'text-petrol hover:bg-petrol/[0.08]'
            : 'text-muted-foreground hover:text-petrol hover:bg-petrol/[0.06]',
        )}
      >
        {huidig ? <ToewijsAvatar doel={huidig} formaat={18} /> : <UserPlus className="h-3.5 w-3.5" />}
        {!compact && <span className="truncate">{huidig ? huidig.naam : 'Toewijzen'}</span>}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 max-h-[320px] w-[220px] overflow-y-auto rounded-xl bg-card py-1 shadow-[0_4px_24px_rgba(26,83,92,0.16)] dark:border dark:border-white/10">
          <button
            type="button"
            role="menuitem"
            onClick={() => { onKies(null); zetOpen(false) }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-foreground/80 transition-colors hover:bg-background"
          >
            <span className="inline-flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border border-dashed border-foreground/25" aria-hidden />
            <span className="flex-1">Niemand</span>
            {!waarde && <Check className="h-3.5 w-3.5 flex-shrink-0 text-petrol" />}
          </button>
          {doelen.length > 0 && <div className="my-1 h-px bg-border/70" />}
          {doelen.map((d) => (
            <button
              key={d.sleutel}
              type="button"
              role="menuitem"
              onClick={() => { onKies(d.sleutel); zetOpen(false) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-background"
            >
              <ToewijsAvatar doel={d} formaat={18} titel={d.naam} />
              <span className={cn('min-w-0 flex-1 truncate', huidig?.sleutel === d.sleutel ? 'font-semibold text-foreground' : 'text-foreground/80')}>{d.naam}</span>
              {huidig?.sleutel === d.sleutel && <Check className="h-3.5 w-3.5 flex-shrink-0 text-petrol" />}
            </button>
          ))}
          {doelen.length === 0 && <p className="px-3 py-2 text-[12px] text-muted-foreground">Geen collega's gevonden.</p>}
        </div>
      )}
    </div>
  )
}
