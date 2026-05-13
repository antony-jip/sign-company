import { Receipt, ClipboardCheck, Wrench, CreditCard } from 'lucide-react'

interface ActiesCardProps {
  onOfferte: () => void
  onWerkbon: () => void
  onMontage: () => void
  onFactuur: () => void
  onPakbon: () => void
  onBevestiging: () => void
}

type Icon = typeof Receipt

interface ActieTile {
  key: string
  label: string
  sublabel: string
  icon: Icon
  color: string
  onClick: () => void
}

export function ActiesCard({ onOfferte, onWerkbon, onMontage, onFactuur, onPakbon, onBevestiging }: ActiesCardProps) {
  const tiles: ActieTile[] = [
    { key: 'offerte',  label: 'Offerte',  sublabel: 'Stuur een prijsopgave', icon: Receipt,         color: '#F15025', onClick: onOfferte },
    { key: 'werkbon',  label: 'Werkbon',  sublabel: 'Voor de monteur',       icon: ClipboardCheck,  color: '#C44830', onClick: onWerkbon },
    { key: 'montage',  label: 'Montage',  sublabel: 'Plan de uitvoering',    icon: Wrench,          color: '#9A5A48', onClick: onMontage },
    { key: 'factuur',  label: 'Factuur',  sublabel: 'Verstuur de rekening',  icon: CreditCard,      color: '#2D6B48', onClick: onFactuur },
  ]

  return (
    <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(130,100,60,0.04)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.08em]">Acties</h3>
      </div>

      {/* 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => {
          const Icon = tile.icon
          return (
            <button
              key={tile.key}
              onClick={tile.onClick}
              className="acties-tile group relative overflow-hidden rounded-lg bg-[var(--surface-soft)] hover:bg-white p-3 text-left transition-all hover:-translate-y-px hover:shadow-[0_2px_6px_rgba(130,100,60,0.08)]"
            >
              <div className="flex items-center justify-center h-6 w-6 rounded-md" style={{ background: 'rgba(255,255,255,0.6)' }}>
                <Icon className="h-3.5 w-3.5" style={{ color: tile.color }} />
              </div>
              <div className="mt-2.5">
                <p className="text-[14px] font-semibold text-[#1A1A1A] leading-tight">{tile.label}</p>
                <p className="text-[11.5px] text-[#9B9B95] mt-0.5 leading-tight">{tile.sublabel}</p>
              </div>
              <span
                aria-hidden
                className="acties-tile-bar absolute bottom-0 left-0 h-[2px] w-4 group-hover:w-full transition-all duration-[250ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none motion-reduce:duration-0"
                style={{ background: tile.color }}
              />
            </button>
          )
        })}
      </div>

      {/* Footer-pillen */}
      <div className="mt-4 pt-3 border-t border-[#EBEBEB] flex items-center justify-around">
        <button
          onClick={onPakbon}
          className="footer-pill group flex items-center gap-1.5 text-[12px] text-[#6B6B66] hover:text-[#1A1A1A] transition-colors px-2 py-1 rounded-md"
        >
          <span className="h-1.5 w-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'var(--cream-text)' }} />
          Pakbon
        </button>
        <button
          disabled
          title="Bestelbon — binnenkort beschikbaar"
          className="flex items-center gap-1.5 text-[12px] text-[#9B9B95] opacity-50 cursor-not-allowed px-2 py-1 rounded-md"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--lavender-text)', opacity: 0.5 }} />
          Bestelbon
        </button>
        <button
          onClick={onBevestiging}
          className="footer-pill group flex items-center gap-1.5 text-[12px] text-[#6B6B66] hover:text-[#1A1A1A] transition-colors px-2 py-1 rounded-md"
        >
          <span className="h-1.5 w-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: '#5A5A55' }} />
          Bevestiging
        </button>
      </div>
    </div>
  )
}
