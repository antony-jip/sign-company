import { X } from 'lucide-react'
import { TOETSEN } from './toetsen'

/** De kaart achter `?`, gevoed door dezelfde lijst als de handler. */
export function SneltoetsenKaart({ open, readerOpen, onSluiten }: { open: boolean; readerOpen: boolean; onSluiten: () => void }) {
  if (!open) return null
  const rijen = TOETSEN.filter((t) => !t.reader || readerOpen)
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={onSluiten} />
      <div role="dialog" aria-label="Sneltoetsen" data-toetsen="uit" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card dark:border dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8 w-[380px] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-[18px] font-bold text-foreground tracking-[-0.01em]">Sneltoetsen<span className="text-flame">.</span></h3>
          <button type="button" onClick={onSluiten} className="p-1.5 hover:bg-muted rounded-lg transition-colors" aria-label="Sluiten">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-2.5">
          {rijen.map((t) => (
            <div key={`${t.toets}-${t.label}`} className="flex items-center justify-between gap-3">
              <span className="text-[13.5px] text-foreground/75">{t.label}</span>
              <kbd className="px-2 py-1 bg-muted rounded-lg text-[12px] font-mono text-foreground/70 whitespace-nowrap">{t.toets}</kbd>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
