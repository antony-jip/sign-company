import { useState } from 'react'
import { Monitor, Smartphone, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  html: string
  afzender: string
  onderwerp: string
  preheader: string
  className?: string
  compact?: boolean
}

const KNOP = 'flex h-7 w-7 items-center justify-center rounded-md transition-colors'

export function NieuwsbriefPreview({ html, afzender, onderwerp, preheader, className, compact }: Props) {
  const [apparaat, setApparaat] = useState<'desktop' | 'mobiel'>('desktop')
  const [donker, setDonker] = useState(false)
  const mobiel = apparaat === 'mobiel'

  // Apple Mail en Gmail passen hun eigen dark-mode toe; deze benadering laat
  // zien of kleuren en contrast dat overleven. Geen garantie per client.
  const previewHtml = donker
    ? html.replace('</head>', '<style>html{filter:invert(1) hue-rotate(180deg);background:#111;} img{filter:invert(1) hue-rotate(180deg);}</style></head>')
    : html

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex items-center gap-1 px-3 py-2">
        {!compact && (
          <div className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-[13px] font-bold text-foreground">{afzender}</span>
              <span className="ml-auto flex-shrink-0 text-[11px] text-muted-foreground">nu</span>
            </div>
            <div className="truncate text-[13px] font-semibold text-foreground">{onderwerp.trim() || <span className="font-normal text-muted-foreground/60">(geen onderwerp)</span>}</div>
            <div className="truncate text-[12px] text-muted-foreground">{preheader.trim() || <span className="text-muted-foreground/50">Preheader verschijnt hier, naast het onderwerp</span>}</div>
          </div>
        )}
        <div className="ml-auto inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
          <button type="button" title="Desktop" onClick={() => setApparaat('desktop')} className={cn(KNOP, !mobiel ? 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground' : 'text-muted-foreground hover:text-foreground')}><Monitor className="h-4 w-4" /></button>
          <button type="button" title="Telefoon" onClick={() => setApparaat('mobiel')} className={cn(KNOP, mobiel ? 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground' : 'text-muted-foreground hover:text-foreground')}><Smartphone className="h-4 w-4" /></button>
          <span className="mx-0.5 h-4 w-px bg-border" />
          <button type="button" title={donker ? 'Lichte weergave' : 'Donkere weergave (benadering)'} onClick={() => setDonker(d => !d)} className={cn(KNOP, donker ? 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {donker ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className={cn('min-h-0 flex-1 overflow-hidden', mobiel && 'flex items-start justify-center bg-muted/40 py-4')}>
        <div className={cn('h-full', mobiel ? 'w-[390px] max-w-full overflow-hidden rounded-[28px] border-[6px] border-[#1A1A1A] bg-white shadow-xl' : 'w-full')}>
          <iframe
            key={apparaat}
            title="Nieuwsbrief-preview"
            srcDoc={previewHtml}
            className="h-full w-full border-0"
            sandbox=""
          />
        </div>
      </div>
    </div>
  )
}
