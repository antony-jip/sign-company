import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronDown, FolderOpen, Search } from 'lucide-react'
import { cn, zonderKlantPrefix } from '@/lib/utils'
import type { Project } from '@/types'

interface Props {
  projecten: Project[]
  value: string
  onChange: (projectId: string) => void
  /** Compacte pill-variant voor de snel-toevoegen kaart. */
  compact?: boolean
  leegLabel?: string
  /** Tekst op de knop zolang er geen project gekozen is. Standaard gelijk aan leegLabel. */
  placeholder?: string
  className?: string
}

const RIJ_HOOGTE = 30
const LIJST_HOOGTE = 280

function normaliseer(waarde: string): string {
  return waarde.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function ProjectCombobox({
  projecten,
  value,
  onChange,
  compact = false,
  leegLabel = 'Geen project',
  placeholder,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [actiefIndex, setActiefIndex] = useState(0)
  const lijstRef = useRef<HTMLDivElement>(null)

  // Het project dat je zoekt is bijna altijd een recent project · de lijst
  // stond in de volgorde waarin hij toevallig binnenkwam. Nieuwste bovenaan,
  // en omdat sort stabiel is houdt die volgorde ook stand binnen een zoekrang.
  const opRecency = useMemo(
    () => [...projecten].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    [projecten]
  )

  // Het normaliseren gebeurde per toetsaanslag over de hele lijst opnieuw:
  // bij 294 projecten is dat 294× toLowerCase + NFD + regex per letter die je
  // typt. Eén keer vooraf, daarna is filteren niet meer dan `includes`.
  const index = useMemo(() => opRecency.map((project) => ({
    project,
    naam: normaliseer(project.naam),
    klant: normaliseer(project.klant_naam ?? ''),
    hooi: normaliseer([project.naam, project.klant_naam ?? '', project.project_nummer ?? ''].join(' ')),
  })), [opRecency])

  const filtered = useMemo(() => {
    const termen = normaliseer(query).split(/\s+/).filter(Boolean)
    if (termen.length === 0) return opRecency
    const eerste = termen[0]
    // Een treffer waar de projectnaam mee begint is bijna altijd degene die je
    // bedoelt; een treffer diep in de klantnaam bijna nooit. Sort is stabiel,
    // dus binnen een rang blijft de oorspronkelijke volgorde staan.
    const treffers: { project: Project; rang: number }[] = []
    for (const rij of index) {
      if (!termen.every((t) => rij.hooi.includes(t))) continue
      const rang = rij.naam.startsWith(eerste) ? 0
        : rij.klant.startsWith(eerste) ? 1
        : rij.naam.includes(eerste) ? 2
        : 3
      treffers.push({ project: rij.project, rang })
    }
    treffers.sort((a, b) => a.rang - b.rang)
    return treffers.map((t) => t.project)
  }, [opRecency, index, query])

  // Zolang je niets typt staat "Geen project" bovenaan. Zodra je zoekt niet
  // meer: anders staat die regel actief en wist Enter juist je project in
  // plaats van de bovenste treffer te kiezen.
  const heeftQuery = query.trim().length > 0
  const opties = useMemo(
    () => (heeftQuery ? filtered : [null, ...filtered]) as (Project | null)[],
    [filtered, heeftQuery]
  )

  const selected = projecten.find((p) => p.id === value) ?? null

  const rijen = useVirtualizer({
    count: opties.length,
    getScrollElement: () => lijstRef.current,
    estimateSize: () => RIJ_HOOGTE,
    overscan: 10,
    // Zonder startafmeting kent de virtualizer zijn scrollhoogte pas nadat de
    // popover gemonteerd is, en zie je één frame lang een lege lijst.
    initialRect: { width: 400, height: LIJST_HOOGTE },
  })
  // De virtualizer is elke render een nieuw object · via een ref houden we het
  // effect hieronder aan actiefIndex hangen in plaats van aan elke render.
  const rijenRef = useRef(rijen)
  rijenRef.current = rijen

  useEffect(() => {
    setActiefIndex((i) => Math.min(i, Math.max(0, opties.length - 1)))
  }, [opties.length])

  useEffect(() => {
    if (!open) return
    rijenRef.current.scrollToIndex(actiefIndex, { align: 'auto' })
  }, [actiefIndex, open])

  const kies = (project: Project | null) => {
    onChange(project?.id ?? '')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const aantal = opties.length
    if (aantal === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiefIndex((i) => (i + 1) % aantal)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiefIndex((i) => (i - 1 + aantal) % aantal)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiefIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiefIndex(aantal - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      kies(opties[actiefIndex] ?? null)
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        setQuery('')
        if (o) setActiefIndex(value ? Math.max(0, opRecency.findIndex((p) => p.id === value) + 1) : 0)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex items-center justify-between gap-2 rounded-md border border-border bg-background dark:border-white/25 dark:bg-white/[0.06] text-foreground transition-colors hover:border-petrol/40 focus:outline-none focus:border-petrol/40',
            compact
              ? 'h-7 w-auto max-w-[160px] rounded-lg px-2.5 text-xs'
              : 'h-9 w-full px-3 text-[13px]',
            className
          )}
        >
          <span className={cn('truncate text-left', !selected && 'text-muted-foreground')}>
            {selected ? zonderKlantPrefix(selected.naam, selected.klant_naam) : (placeholder ?? leegLabel)}
            {selected?.klant_naam && !compact ? (
              <span className="text-muted-foreground ml-2">· {selected.klant_naam}</span>
            ) : null}
          </span>
          <ChevronDown className={cn('flex-shrink-0 text-muted-foreground', compact ? 'h-3 w-3' : 'h-4 w-4')} />
        </button>
      </PopoverTrigger>

      {/* Het paneel stond vast op 360px terwijl de knop in het taakformulier
          489px is · daardoor kapte een derde van de regels af, precies op de
          klantnaam waar je op zoekt. Nu volgt hij de knop. */}
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[max(var(--radix-popover-trigger-width),22rem)] max-w-[calc(100vw-2rem)] p-1.5"
      >
        {/* Een omrand invoerveld in een omrand paneel is een doos in een doos.
            Het zoekveld is hier de kop van het paneel, niet een veld erin. */}
        <div className="flex items-center gap-2 border-b border-border/60 px-2 pb-2">
          <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiefIndex(0) }}
            onKeyDown={onKeyDown}
            placeholder="Zoek op project of klant"
            className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          {heeftQuery && (
            <span className="flex-shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/70">
              {filtered.length}
            </span>
          )}
        </div>
        <div ref={lijstRef} style={{ maxHeight: LIJST_HOOGTE }}
          className="mt-1 overflow-y-auto" role="listbox">
          {/* Alle 294 regels stonden in de DOM zodra je het paneel opende. Nu
              alleen wat je ziet, dus openen en typen kost niet meer dan een
              handvol rijen. */}
          <div style={{ height: rijen.getTotalSize(), position: 'relative' }}>
            {rijen.getVirtualItems().map((rij) => {
              const project = opties[rij.index]
              const isLeeg = project === null
              const isSelected = isLeeg ? !value : project.id === value
              return (
                <button
                  key={isLeeg ? 'geen' : project.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-index={rij.index}
                  onMouseEnter={() => setActiefIndex(rij.index)}
                  onClick={() => kies(project)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: rij.size,
                    transform: `translateY(${rij.start}px)`,
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 text-[13px] text-left transition-colors',
                    rij.index === actiefIndex && 'bg-petrol/[0.06] dark:bg-white/[0.07]',
                    isSelected && 'font-semibold text-petrol dark:text-[#7FC3CC]'
                  )}
                >
                  {isLeeg ? <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" /> : null}
                  {/* Naam en klant staan naast elkaar zoals op de knop, niet
                      tegen de twee randen geduwd. De klantnaam is waar je op
                      zoekt, dus de projectnaam kapt als eerste af. */}
                  <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                    <span className="truncate">
                      {isLeeg ? leegLabel : zonderKlantPrefix(project.naam, project.klant_naam)}
                    </span>
                    {!isLeeg && project.klant_naam ? (
                      <span className={cn(
                        'max-w-[50%] flex-shrink-0 truncate text-[12px]',
                        isSelected ? 'text-petrol/70 dark:text-[#7FC3CC]/70' : 'text-muted-foreground'
                      )}>
                        · {project.klant_naam}
                      </span>
                    ) : null}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
          {opties.length === 0 && (
            <div className="px-2 py-6 text-center text-[12px] text-muted-foreground">Geen resultaat</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
