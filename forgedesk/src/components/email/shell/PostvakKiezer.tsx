import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAvatarStyle } from '../emailHelpers'
import type { Postvak, PostvakKeuze } from '@/lib/mail/types'

export function postvakKleur(postvak: Postvak): string {
  return getAvatarStyle(postvak.adres || postvak.naam).bg
}

function Bolletje({ kleur, gedeeld }: { kleur: string; gedeeld?: boolean }) {
  return (
    <span
      className="inline-flex h-[9px] w-[9px] flex-shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-black/[0.08]"
      style={{ backgroundColor: kleur }}
      aria-hidden
    >
      {gedeeld && <span className="h-[3px] w-[3px] rounded-full bg-white/80" />}
    </span>
  )
}

interface Props {
  postvakken: Postvak[]
  actief: PostvakKeuze
  onKies: (keuze: PostvakKeuze) => void
  /** Rail ingeklapt: alleen de bolletjes, geen namen. */
  labels?: boolean
  /** "Alle postvakken" als eerste keuze. Uit in de composer: je verstuurt uit één postvak. */
  metAlle?: boolean
  className?: string
}

/**
 * Kiezer boven de mappenrail. Verschijnt alleen bij meer dan één postvak;
 * "Alle postvakken" staat vooraan, daaronder elk postvak met een bolletje in
 * de kleur die de afzender-avatars ook gebruiken.
 */
export function PostvakKiezer({ postvakken, actief, onKies, labels = true, metAlle = true, className }: Props) {
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

  if (postvakken.length <= 1) return null

  const huidig = actief === 'alle' ? null : postvakken.find((p) => p.id === actief) ?? null
  const titel = huidig ? huidig.naam : 'Alle postvakken'

  return (
    <div ref={wortel} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => zetOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={labels ? undefined : titel}
        className={cn(
          'tap-press flex w-full items-center rounded-[10px] text-[12.5px] transition-colors',
          labels ? 'h-8 gap-2 px-2.5' : 'h-9 justify-center',
          'text-[#3A3A36] hover:bg-black/[0.04] dark:text-foreground/75 dark:hover:bg-white/[0.05]',
        )}
      >
        {huidig
          ? <Bolletje kleur={postvakKleur(huidig)} gedeeld={huidig.soort === 'gedeeld'} />
          : <span className="flex flex-shrink-0 -space-x-1" aria-hidden>
              {postvakken.slice(0, 3).map((p) => <Bolletje key={p.id} kleur={postvakKleur(p)} />)}
            </span>}
        {labels && (
          <>
            <span className="min-w-0 flex-1 truncate text-left">{titel}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 flex-shrink-0 opacity-50 transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl bg-card py-1 shadow-[0_4px_24px_rgba(26,83,92,0.16)] dark:border dark:border-white/10"
        >
          {metAlle && (
            <>
              <Rij
                label="Alle postvakken"
                gekozen={actief === 'alle'}
                onKies={() => { onKies('alle'); zetOpen(false) }}
                bolletje={<span className="flex flex-shrink-0 -space-x-1">{postvakken.slice(0, 3).map((p) => <Bolletje key={p.id} kleur={postvakKleur(p)} />)}</span>}
              />
              <div className="my-1 h-px bg-border/70" />
            </>
          )}
          {postvakken.map((p) => (
            <Rij
              key={p.id}
              label={p.naam}
              onder={p.naam !== p.adres ? p.adres : undefined}
              gedeeld={p.soort === 'gedeeld'}
              gekozen={actief === p.id}
              onKies={() => { onKies(p.id); zetOpen(false) }}
              bolletje={<Bolletje kleur={postvakKleur(p)} gedeeld={p.soort === 'gedeeld'} />}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Rij({ label, onder, gedeeld, gekozen, onKies, bolletje }: {
  label: string
  onder?: string
  gedeeld?: boolean
  gekozen: boolean
  onKies: () => void
  bolletje: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={gekozen}
      onClick={onKies}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-background"
    >
      {bolletje}
      <span className="min-w-0 flex-1">
        <span className={cn('flex items-center gap-1.5 truncate', gekozen ? 'font-semibold text-foreground' : 'text-foreground/80')}>
          {label}
          {gedeeld && <Users className="h-3 w-3 flex-shrink-0 text-muted-foreground" aria-label="Gedeeld postvak" />}
        </span>
        {onder && <span className="block truncate text-[11px] text-muted-foreground">{onder}</span>}
      </span>
      {gekozen && <Check className="h-3.5 w-3.5 flex-shrink-0 text-petrol" />}
    </button>
  )
}
