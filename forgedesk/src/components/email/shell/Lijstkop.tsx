import { Archive, CheckCheck, Pencil, RefreshCw, Rows3, StretchHorizontal, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { MailMap } from '@/lib/mail/types'
import { FILTERS, SPLIT_TABS, mapLabel, type LijstFilter, type SplitTab } from './mapConfig'
import type { Dichtheid } from './voorkeuren'
import { formatRelativeSync } from '../emailHelpers'

interface Props {
  map: MailMap
  teller: number
  filter: LijstFilter
  onFilter: (f: LijstFilter) => void
  filterTellers: Partial<Record<LijstFilter, number>>
  aangevinkt: number
  allesAangevinkt: boolean
  deelsAangevinkt: boolean
  onAllesVinken: () => void
  onWisSelectie: () => void
  onBulkArchiveer: () => void
  onBulkVerwijder: () => void
  onBulkGelezen: () => void
  onBulkOngelezen: () => void
  dichtheid: Dichtheid
  onDichtheid: (d: Dichtheid) => void
  onVerversen: () => void
  bezig: boolean
  laatsteSync: number | null
  nu: number
  onNieuw: () => void
  breed: boolean
  splitTabs: boolean
  splitTab: SplitTab
  onSplitTab: (t: SplitTab) => void
  splitTellers: Partial<Record<SplitTab, number>>
}

/** Titel, teller, Nieuw bericht, filters of bulk-acties, dichtheid en verversen. Desktop. */
export function Lijstkop(p: Props) {
  return (
    <div className="sticky top-0 z-20 bg-gradient-to-b from-[#F3F7F7] to-card dark:from-white/[0.05] dark:to-card flex-shrink-0 hidden md:block">
      <div className="flex items-center justify-between px-4 h-[52px]">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="font-heading text-[20px] font-bold tracking-[-0.01em] text-foreground leading-none">
            {mapLabel(p.map)}<span className="text-flame">.</span>
          </h1>
          {p.teller > 0 && (
            <span className="font-mono tabular-nums text-[11px] leading-none text-muted-foreground">
              {p.teller}{p.map === 'inbox' ? ' ongelezen' : ''}
            </span>
          )}
        </div>
        {/* De mappenrail draagt de primaire actie; hier alleen het icoon, zodat
            er niet twee Flame-knoppen naast elkaar staan. */}
        <button
          type="button"
          onClick={p.onNieuw}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
          title="Nieuw bericht (c)"
          aria-label="Nieuw bericht"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      {p.splitTabs && p.map === 'inbox' && (
        <div className="flex items-center gap-1 px-4 pb-1.5">
          {SPLIT_TABS.map((t) => {
            const actief = p.splitTab === t.id
            const n = p.splitTellers[t.id] ?? 0
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => p.onSplitTab(t.id)}
                className={cn(
                  'h-7 px-2.5 rounded-lg text-[12px] inline-flex items-center gap-1.5 transition-colors',
                  actief ? 'bg-petrol/[0.10] text-petrol font-semibold dark:bg-[#2A7A86]/[0.22] dark:text-[#7FB5BF]' : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.04]',
                )}
              >
                {t.label}
                {n > 0 && <span className="font-mono tabular-nums text-[10px] opacity-80">{n}</span>}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-4 h-11 min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
          <input
            type="checkbox"
            checked={p.allesAangevinkt}
            ref={(el) => { if (el) el.indeterminate = p.deelsAangevinkt }}
            onChange={p.onAllesVinken}
            aria-label="Alles selecteren"
            className="h-4 w-4 rounded border-foreground/20 cursor-pointer accent-petrol flex-shrink-0"
          />
          {p.aangevinkt > 0 ? (
            <div className="flex items-center gap-0.5">
              <span className="text-[12px] font-medium text-foreground/80 mr-1 tabular-nums">{p.aangevinkt} geselecteerd</span>
              <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5 text-foreground/70 hover:text-foreground rounded-lg" onClick={p.onBulkArchiveer} title="Archiveren">
                <Archive className="h-3.5 w-3.5" /> Archief
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5 text-foreground/70 hover:text-foreground rounded-lg" onClick={p.onBulkVerwijder} title="Verwijderen">
                <Trash2 className="h-3.5 w-3.5" /> Verwijder
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5 text-foreground/70 hover:text-foreground rounded-lg" onClick={p.onBulkGelezen}>
                <CheckCheck className="h-3.5 w-3.5" /> Gelezen
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-[12px] text-foreground/70 hover:text-foreground rounded-lg" onClick={p.onBulkOngelezen}>
                Ongelezen
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground rounded-lg" onClick={p.onWisSelectie} title="Selectie wissen (Esc)">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4 min-w-0 overflow-x-auto scrollbar-none">
              {FILTERS.map((f) => {
                const actief = p.filter === f.id
                const n = p.filterTellers[f.id]
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => p.onFilter(f.id)}
                    className={cn('relative py-1 text-[12px] whitespace-nowrap transition-colors duration-150 inline-flex items-center gap-1', actief ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground/80')}
                  >
                    {f.label}
                    {f.id !== 'alle' && n ? <span className="font-mono tabular-nums text-[10px] opacity-70">{n}</span> : null}
                    {actief && <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-flame" aria-hidden />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center flex-shrink-0">
          {p.laatsteSync && p.breed && (
            <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap mr-1" title={new Date(p.laatsteSync).toLocaleString('nl-NL')}>
              {formatRelativeSync(p.laatsteSync, p.nu)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground/70 rounded-[10px]"
            onClick={() => p.onDichtheid(p.dichtheid === 'comfortabel' ? 'compact' : 'comfortabel')}
            title={p.dichtheid === 'comfortabel' ? 'Compacte weergave' : 'Comfortabele weergave'}
            aria-label={p.dichtheid === 'comfortabel' ? 'Compacte weergave' : 'Comfortabele weergave'}
          >
            {p.dichtheid === 'comfortabel' ? <StretchHorizontal className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground/70 rounded-[10px]" onClick={p.onVerversen} disabled={p.bezig} title="Mail ophalen" aria-label="Mail ophalen">
            <RefreshCw className={cn('h-4 w-4', p.bezig && 'animate-spin')} />
          </Button>
        </div>
      </div>
    </div>
  )
}
