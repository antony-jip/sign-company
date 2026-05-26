import {
  Receipt, ClipboardList, Wrench, CreditCard, Package, FileSignature,
  type LucideIcon,
} from 'lucide-react'

interface ActiesCardProps {
  onOfferte: () => void
  onWerkbon: () => void
  onMontage: () => void
  onFactuur: () => void
  onPakbon: () => void
  onBevestiging: () => void
}

interface ActieTile {
  key: string
  label: string
  sublabel: string
  icon: LucideIcon
  color: string
  onClick: () => void
}

export function ActiesCard({ onOfferte, onWerkbon, onMontage, onFactuur, onPakbon, onBevestiging }: ActiesCardProps) {
  const tiles: ActieTile[] = [
    { key: 'offerte',  label: 'Offerte',  sublabel: 'Stuur een prijsopgave', icon: Receipt,       color: '#F15025', onClick: onOfferte },
    { key: 'werkbon',  label: 'Werkbon',  sublabel: 'Voor de monteur',       icon: ClipboardList, color: '#C44830', onClick: onWerkbon },
    { key: 'montage',  label: 'Montage',  sublabel: 'Plan de uitvoering',    icon: Wrench,        color: '#9A5A48', onClick: onMontage },
    { key: 'factuur',  label: 'Factuur',  sublabel: 'Verstuur de rekening',  icon: CreditCard,    color: '#2D6B48', onClick: onFactuur },
  ]

  return (
    <div className="doen-slate-surface rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-heading text-[15px] font-bold text-foreground">
          Acties
        </h3>
        <span
          className="text-[12px] text-muted-foreground"
          style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
        >
          wat is de volgende stap?
        </span>
      </div>

      {/* 2x2 grid van actie-tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((tile) => {
          const Icon = tile.icon
          return (
            <button
              key={tile.key}
              onClick={tile.onClick}
              className="group relative overflow-hidden rounded-xl bg-white p-3.5 text-left transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_4px_14px_rgba(20,62,71,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                border: `1px solid ${tile.color}1F`,
                ['--tw-ring-color' as string]: `${tile.color}55`,
              }}
            >
              {/* Decorative gradient halo in tile-color */}
              <span
                aria-hidden
                className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle, ${tile.color}22 0%, transparent 70%)`,
                }}
              />

              <div className="relative flex items-start gap-3">
                {/* Icon-vlak met module-color tint */}
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: `${tile.color}14`,
                    border: `1px solid ${tile.color}1A`,
                  }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} style={{ color: tile.color }} />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[14px] font-bold text-foreground leading-tight tracking-[-0.01em] truncate">
                    {tile.label}
                  </p>
                  <p className="text-[11.5px] text-foreground/70 mt-0.5 leading-tight truncate">
                    {tile.sublabel}
                  </p>
                </div>
              </div>

              {/* Hover accent-stripe links */}
              <span
                aria-hidden
                className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: tile.color }}
              />
            </button>
          )
        })}
      </div>

      {/* Footer — secundaire acties */}
      <div className="mt-4 pt-3 border-t border-[rgba(26,83,92,0.08)] flex items-center justify-center gap-4">
        <button
          onClick={onPakbon}
          className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground/70 hover:text-[#1A535C] transition-colors px-2 py-1 rounded-md"
        >
          <Package className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: '#1A535C' }} />
          Pakbon
        </button>

        <span aria-hidden className="text-[10px] text-muted-foreground/70 font-mono">·</span>

        <button
          onClick={onBevestiging}
          className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground/70 hover:text-[#1A535C] transition-colors px-2 py-1 rounded-md"
        >
          <FileSignature className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: '#1A535C' }} />
          Bevestiging
        </button>
      </div>
    </div>
  )
}
