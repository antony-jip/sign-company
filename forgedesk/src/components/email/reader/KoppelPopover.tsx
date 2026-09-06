import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link2, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Factuur } from '@/types'
import type { KoppelingSoort } from '@/lib/mail/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { zoekKlanten, zoekProjecten, zoekOffertes, getFacturen } from '@/services/supabaseService'
import { logger } from '@/utils/logger'
import { SOORT_LABEL } from './koppelingen'

export interface KoppelDoel {
  soort: KoppelingSoort
  id: string
  label: string
  sub?: string
}

const MAX_PER_SOORT = 5
const WACHT_MS = 220

// Facturen hebben geen zoekfunctie in de service; één keer ophalen en lokaal
// filteren op nummer en klantnaam volstaat voor een koppelveld.
let facturenCache: { op: number; belofte: Promise<Factuur[]> } | null = null
function facturenGedeeld(): Promise<Factuur[]> {
  if (!facturenCache || Date.now() - facturenCache.op > 60_000) {
    facturenCache = { op: Date.now(), belofte: getFacturen(400).catch(() => { facturenCache = null; return [] as Factuur[] }) }
  }
  return facturenCache.belofte
}

function bevat(tekst: string | undefined | null, term: string): boolean {
  return !!tekst && tekst.toLowerCase().includes(term)
}

export async function zoekKoppelDoelen(term: string): Promise<KoppelDoel[]> {
  const schoon = term.trim()
  const lc = schoon.toLowerCase()
  const [klanten, projecten, offertes, facturen] = await Promise.all([
    schoon ? zoekKlanten(schoon, MAX_PER_SOORT).catch(() => []) : Promise.resolve([]),
    zoekProjecten(schoon, MAX_PER_SOORT).catch(() => []),
    schoon ? zoekOffertes(schoon, MAX_PER_SOORT).catch(() => []) : Promise.resolve([]),
    schoon ? facturenGedeeld() : Promise.resolve([] as Factuur[]),
  ])
  const uit: KoppelDoel[] = []
  for (const k of klanten) uit.push({ soort: 'klant', id: k.id, label: k.bedrijfsnaam || k.contactpersoon || 'Klant', sub: k.bedrijfsnaam && k.contactpersoon ? k.contactpersoon : k.stad })
  for (const p of projecten) uit.push({ soort: 'project', id: p.id, label: p.naam || 'Project', sub: [p.project_nummer, p.klant_naam].filter(Boolean).join(' · ') })
  for (const o of offertes) uit.push({ soort: 'offerte', id: o.id, label: o.nummer || o.titel || 'Offerte', sub: [o.titel !== o.nummer ? o.titel : '', o.klant_naam].filter(Boolean).join(' · ') })
  for (const f of facturen.filter((f) => bevat(f.nummer, lc) || bevat(f.klant_naam, lc) || bevat(f.titel, lc)).slice(0, MAX_PER_SOORT)) {
    uit.push({ soort: 'factuur', id: f.id, label: f.nummer || 'Factuur', sub: [f.titel, f.klant_naam].filter(Boolean).join(' · ') })
  }
  return uit
}

interface KoppelPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onKoppel: (soort: KoppelingSoort, doelId: string) => Promise<void> | void
  /** Al gekoppeld; die staan niet nog eens in de lijst. */
  gekoppeld?: { soort: KoppelingSoort; doelId: string }[]
  children?: ReactNode
  compact?: boolean
}

export function KoppelPopover({ open, onOpenChange, onKoppel, gekoppeld = [], children, compact }: KoppelPopoverProps) {
  const [term, zetTerm] = useState('')
  const [resultaten, zetResultaten] = useState<KoppelDoel[]>([])
  const [zoeken, zetZoeken] = useState(false)
  const [actief, zetActief] = useState(0)
  const [bezig, zetBezig] = useState<string | null>(null)
  const invoerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) { zetTerm(''); zetResultaten([]); zetActief(0); return }
    setTimeout(() => invoerRef.current?.focus(), 30)
  }, [open])

  useEffect(() => {
    if (!open) return
    let actueel = true
    zetZoeken(true)
    const timer = setTimeout(() => {
      zoekKoppelDoelen(term)
        .then((lijst) => { if (actueel) { zetResultaten(lijst); zetActief(0) } })
        .catch((e) => logger.warn('Koppeldoelen zoeken mislukt:', e))
        .finally(() => { if (actueel) zetZoeken(false) })
    }, term ? WACHT_MS : 0)
    return () => { actueel = false; clearTimeout(timer) }
  }, [term, open])

  const zichtbaar = useMemo(() => {
    const al = new Set(gekoppeld.map((g) => `${g.soort}:${g.doelId}`))
    return resultaten.filter((r) => !al.has(`${r.soort}:${r.id}`))
  }, [resultaten, gekoppeld])

  const kies = useCallback(async (doel: KoppelDoel) => {
    const sleutel = `${doel.soort}:${doel.id}`
    zetBezig(sleutel)
    try {
      await onKoppel(doel.soort, doel.id)
      onOpenChange(false)
    } finally {
      zetBezig(null)
    }
  }, [onKoppel, onOpenChange])

  const onToets = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); zetActief((i) => Math.min(i + 1, zichtbaar.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); zetActief((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); const doel = zichtbaar[actief]; if (doel && !bezig) void kies(doel) }
    else if (e.key === 'Escape') { onOpenChange(false) }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children ?? (
          <button
            type="button"
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 text-[12px] text-muted-foreground transition-colors hover:border-petrol/50 hover:text-petrol',
              compact && 'h-8',
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
            Koppelen
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className={cn('w-[360px] p-0', compact && 'w-[calc(100vw-24px)]')}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          <input
            ref={invoerRef}
            value={term}
            onChange={(e) => zetTerm(e.target.value)}
            onKeyDown={onToets}
            placeholder="Klant, project, offerte of factuur"
            aria-label="Zoek een klant, project, offerte of factuur"
            className="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          {zoeken && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <ul role="listbox" className="max-h-[320px] overflow-y-auto py-1">
          {zichtbaar.length === 0 && !zoeken && (
            <li className="px-3 py-3 text-[12px] text-muted-foreground">
              {term ? 'Niets gevonden.' : 'Typ om te zoeken. Zonder zoekterm staan de lopende projecten hier.'}
            </li>
          )}
          {zichtbaar.map((doel, i) => {
            const sleutel = `${doel.soort}:${doel.id}`
            return (
              <li
                key={sleutel}
                role="option"
                aria-selected={i === actief}
                onMouseEnter={() => zetActief(i)}
                onClick={() => { if (!bezig) void kies(doel) }}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 px-3 py-1.5',
                  i === actief ? 'bg-petrol/[0.06]' : 'hover:bg-petrol/[0.04]',
                )}
              >
                <span className="w-[56px] flex-shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{SOORT_LABEL[doel.soort]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-foreground">{doel.label}</span>
                  {doel.sub && <span className="block truncate text-[11px] text-muted-foreground">{doel.sub}</span>}
                </span>
                {bezig === sleutel && <Loader2 className="h-3.5 w-3.5 animate-spin text-petrol" />}
              </li>
            )
          })}
        </ul>
        <div className="border-t border-border px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
          Enter koppelt aan de hele thread
        </div>
      </PopoverContent>
    </Popover>
  )
}
