import { useEffect, useRef, useState } from 'react'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  // Wie liever het hele scherm gebruikt houdt die keuze; de dialog blijft de standaard.
  const [volledigScherm, setVolledigScherm] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('doen_instellingen_volledig_scherm') === '1'
  )
  useEffect(() => {
    localStorage.setItem('doen_instellingen_volledig_scherm', volledigScherm ? '1' : '0')
  }, [volledigScherm])

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
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200',
        volledigScherm ? 'p-0' : 'p-4 sm:p-8'
      )}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Instellingen"
        className={cn(
          'relative w-full h-full bg-background overflow-hidden animate-in zoom-in-95 duration-200',
          volledigScherm
            ? 'max-w-none max-h-none rounded-none'
            : 'max-w-[1080px] max-h-[860px] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.18)]'
        )}
      >
        <button
          onClick={() => setVolledigScherm(v => !v)}
          aria-label={volledigScherm ? 'Terug naar venster' : 'Volledig scherm'}
          title={volledigScherm ? 'Terug naar venster' : 'Volledig scherm'}
          className="absolute top-4 right-16 z-10 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          {volledigScherm ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

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
