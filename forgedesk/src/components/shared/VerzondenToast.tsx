interface VerzondenToastProps {
  /** Statuswoord · krijgt de flame-punt achter zich. */
  titel?: string
  /** Eén regel context: naar wie, of waar de mail nu staat. */
  onder?: string
}

/**
 * Bevestiging na het verzenden. Geen standaard-vinkje maar het doen.-gebaar:
 * statuswoord met flame-punt, een vinkje dat zichzelf tekent en een ring die
 * één keer uitzet. Zie index.css voor de keyframes.
 */
export function VerzondenToast({ titel = 'Verzonden', onder }: VerzondenToastProps) {
  return (
    <div className="flex items-center gap-3 w-full min-w-[240px] rounded-2xl border border-black/[0.06] dark:border-white/10 bg-white dark:bg-card px-3.5 py-3 shadow-[0_12px_32px_-12px_rgba(26,83,92,0.4)]">
      <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-petrol/25 verzonden-ring" />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-petrol verzonden-bel">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" className="verzonden-vink" />
          </svg>
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-foreground leading-tight tracking-[-0.01em]">
          {titel}<span className="text-flame">.</span>
        </p>
        {onder && (
          <p className="text-[12px] text-muted-foreground leading-tight truncate mt-[3px]">{onder}</p>
        )}
      </div>
    </div>
  )
}
