import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { SettingsLayout } from './SettingsLayout'

interface Props {
  onClose: () => void
}

/**
 * Instellingen als overlay over het scherm waar je vandaan kwam, zodat je je
 * plek niet kwijtraakt. Bij direct binnenkomen op /instellingen (refresh, of
 * een link uit een mail) is er geen achtergrond en valt de app terug op de
 * gewone pagina; deze component wordt dan niet gemount.
 */
export function SettingsModal({ onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const opToets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', opToets)
    const vorigeOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', opToets)
      document.body.style.overflow = vorigeOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in duration-200"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Instellingen"
        className="relative w-full max-w-[1080px] h-full max-h-[860px] rounded-2xl bg-background shadow-[0_24px_64px_rgba(0,0,0,0.18)] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute top-4 right-4 z-10 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <SettingsLayout variant="modal" />
      </div>
    </div>
  )
}
