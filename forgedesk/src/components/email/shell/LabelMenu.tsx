import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLabels, labelsBeschikbaar, VASTE_LABEL_KLEUREN, type MailLabel } from '@/services/mailLabelService'

/** De vier labels die de mailmodule altijd al kende; die blijven zonder tabel. */
export const VASTE_LABELS = ['offerte', 'klant', 'project', 'leverancier']

export interface LabelKeuze {
  naam: string
  kleur: string
  eigen: boolean
}

let cache: MailLabel[] | null = null
const luisteraars = new Set<() => void>()

function meldLabels(): void {
  for (const cb of luisteraars) cb()
}

/** Eigen labels erbij, met de vaste labels vooraan. Één keer laden per sessie. */
export function useLabels(): { keuzes: LabelKeuze[]; eigen: MailLabel[]; ververs: () => void } {
  const [, zetTik] = useState(0)
  useEffect(() => {
    const cb = () => zetTik((n) => n + 1)
    luisteraars.add(cb)
    if (cache === null && labelsBeschikbaar()) {
      cache = []
      void getLabels().then((lijst) => { cache = lijst; meldLabels() })
    }
    return () => { luisteraars.delete(cb) }
  }, [])

  const ververs = useCallback(() => {
    void getLabels().then((lijst) => { cache = lijst; meldLabels() })
  }, [])

  const eigen = cache || []
  const keuzes: LabelKeuze[] = [
    ...VASTE_LABELS.map((naam) => ({ naam, kleur: VASTE_LABEL_KLEUREN[naam], eigen: false })),
    ...eigen.map((l) => ({ naam: l.naam, kleur: l.kleur, eigen: true })),
  ]
  return { keuzes, eigen, ververs }
}

export function LabelStip({ kleur, formaat = 8 }: { kleur: string; formaat?: number }) {
  return <span className="inline-block flex-shrink-0 rounded-full" style={{ width: formaat, height: formaat, backgroundColor: kleur }} aria-hidden />
}

interface Props {
  /** Labels die nu op de mail(s) staan. */
  huidig: string[]
  onWissel: (label: string, aan: boolean) => void
  compact?: boolean
  className?: string
}

/** Labels aan- en uitzetten, in de lijst en in het leesvenster. */
export function LabelMenu({ huidig, onWissel, compact, className }: Props) {
  const { keuzes } = useLabels()
  const [open, zetOpen] = useState(false)
  const wortel = useRef<HTMLDivElement>(null)

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
        title="Labels (l)"
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-[9px] text-[12px] font-medium text-muted-foreground transition-colors hover:bg-petrol/[0.06] hover:text-petrol',
          compact ? 'w-7 justify-center' : 'px-2',
        )}
      >
        <Tag className="h-3.5 w-3.5" />
        {!compact && <span>Label</span>}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 max-h-[320px] w-[200px] overflow-y-auto rounded-xl bg-card py-1 shadow-[0_4px_24px_rgba(26,83,92,0.16)] dark:border dark:border-white/10">
          {keuzes.map((k) => {
            const aan = huidig.includes(k.naam)
            return (
              <button
                key={k.naam}
                type="button"
                role="menuitemcheckbox"
                aria-checked={aan}
                onClick={() => onWissel(k.naam, !aan)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-background"
              >
                <LabelStip kleur={k.kleur} />
                <span className={cn('min-w-0 flex-1 truncate', aan ? 'font-semibold text-foreground' : 'text-foreground/80')}>{k.naam}</span>
                {aan && <Check className="h-3.5 w-3.5 flex-shrink-0 text-petrol" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
