import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { ConfettiBurst } from './ConfettiBurst'

interface Props {
  titel: string
  tekst?: string
  /** Milliseconden voordat het overlay zichzelf sluit. */
  duur?: number
  onKlaar: () => void
}

/**
 * Kort felicitatie-overlay voor mijlpalen die je maar een keer haalt
 * (eerste klant, eerste verstuurde offerte). Bewust niet blokkerend:
 * klikken sluit hem meteen.
 */
export function SuccesMoment({ titel, tekst, duur = 2600, onKlaar }: Props) {
  useEffect(() => {
    const t = setTimeout(onKlaar, duur)
    return () => clearTimeout(t)
  }, [duur, onKlaar])

  return (
    <div
      onClick={onKlaar}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div className="relative bg-card rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.12)] p-8 mx-4 max-w-sm w-full text-center animate-in slide-in-from-bottom-4 duration-500">
        <ConfettiBurst />
        <div className="relative">
          <span className="mx-auto mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--status-green-bg))]">
            <Check className="h-8 w-8 text-[#3A7D52]" strokeWidth={2.5} />
          </span>
          <h3
            className="font-heading text-foreground"
            style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}
          >
            {titel}<span className="text-flame">.</span>
          </h3>
          {tekst && (
            <p className="mt-2 text-sm text-muted-foreground leading-[1.6]">{tekst}</p>
          )}
        </div>
      </div>
    </div>
  )
}
