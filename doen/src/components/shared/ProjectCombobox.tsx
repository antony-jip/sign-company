import { useEffect, useMemo, useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Check, ChevronDown, FolderOpen, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
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

  const filtered = useMemo(() => {
    const termen = normaliseer(query).split(/\s+/).filter(Boolean)
    if (termen.length === 0) return projecten
    return projecten.filter((p) => {
      const tekst = normaliseer([p.naam, p.klant_naam ?? '', p.project_nummer ?? ''].join(' '))
      return termen.every((t) => tekst.includes(t))
    })
  }, [projecten, query])

  // De leeg-optie staat als eerste regel in de lijst, vandaar de null vooraan.
  const opties = useMemo(() => [null, ...filtered] as (Project | null)[], [filtered])

  const selected = projecten.find((p) => p.id === value) ?? null

  useEffect(() => {
    setActiefIndex((i) => Math.min(i, Math.max(0, opties.length - 1)))
  }, [opties.length])

  useEffect(() => {
    if (!open) return
    lijstRef.current
      ?.querySelector<HTMLElement>(`[data-index="${actiefIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [actiefIndex, open])

  const kies = (project: Project | null) => {
    onChange(project?.id ?? '')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const aantal = Math.max(1, opties.length)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiefIndex((i) => (i + 1) % aantal)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiefIndex((i) => (i - 1 + aantal) % aantal)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (opties.length > 0) kies(opties[actiefIndex] ?? null)
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setQuery('')
          setActiefIndex(value ? Math.max(0, projecten.findIndex((p) => p.id === value) + 1) : 0)
        } else {
          setQuery('')
        }
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
            {selected ? selected.naam : (placeholder ?? leegLabel)}
            {selected?.klant_naam && !compact ? (
              <span className="text-muted-foreground ml-2">· {selected.klant_naam}</span>
            ) : null}
          </span>
          <ChevronDown className={cn('flex-shrink-0 text-muted-foreground', compact ? 'h-3 w-3' : 'h-4 w-4')} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[min(360px,calc(100vw-2rem))] p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiefIndex(0) }}
            onKeyDown={onKeyDown}
            placeholder="Zoek op project of klant"
            className="h-8 pl-7 text-[13px]"
          />
        </div>
        <div ref={lijstRef} className="max-h-[260px] overflow-y-auto -mx-1 px-1" role="listbox">
          {opties.map((project, index) => {
            const isLeeg = project === null
            const isSelected = isLeeg ? !value : project.id === value
            return (
              <button
                key={isLeeg ? 'geen' : project.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-index={index}
                onMouseEnter={() => setActiefIndex(index)}
                onClick={() => kies(project)}
                className={cn(
                  'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-left transition-colors',
                  index === actiefIndex && 'bg-background',
                  isSelected && 'bg-petrol/[0.06] text-petrol font-semibold'
                )}
              >
                {isLeeg ? (
                  <FolderOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                ) : null}
                <span className="flex-1 truncate">
                  {isLeeg ? leegLabel : project.naam}
                  {!isLeeg && project.klant_naam ? (
                    <span className={cn('ml-2', isSelected ? 'text-petrol/70' : 'text-muted-foreground')}>
                      · {project.klant_naam}
                    </span>
                  ) : null}
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-petrol" />}
              </button>
            )
          })}
          {filtered.length === 0 && query && (
            <div className="px-2 py-6 text-center text-[12px] text-muted-foreground">Geen resultaat</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
