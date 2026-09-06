import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { EmailLijstItem, MailMap } from '@/lib/mail/types'
import { prefetchBodies } from '@/lib/mail/bodyRepository'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { EmailListItem } from '../EmailListItem'
import { bouwRijen } from './mapConfig'
import { useKoppelingChips } from './koppelingChips'
import type { Dichtheid, SwipeLinks } from './voorkeuren'

export interface MailLijstProps {
  items: EmailLijstItem[]
  map: MailMap
  geselecteerdId: string | null
  aangevinkt: Set<string>
  focusIndex: number
  dichtheid: Dichtheid
  swipeLinks: SwipeLinks
  laden: boolean
  klaar: boolean
  onLaadMeer: () => void
  onSelect: (item: EmailLijstItem, e?: React.MouseEvent) => void
  onToggleCheck: (id: string, e?: React.MouseEvent) => void
  onToggleGroep: (ids: string[]) => void
  onPin: (item: EmailLijstItem) => void
  onArchiveer: (item: EmailLijstItem) => void
  onVerwijder: (item: EmailLijstItem) => void
  onToggleGelezen: (item: EmailLijstItem) => void
  legeStaat: ReactNode
  bovenin?: ReactNode
  /** Verandert deze sleutel, dan springt de lijst naar boven (map, filter, tab). */
  scrollSleutel: string
  pullToRefresh: { actief: boolean; onRefresh: () => Promise<void> }
  salesMode?: 'wacht' | 'beantwoord'
  onMarkeerBeantwoord?: (id: string) => void
  onWisWacht?: (id: string) => void
}

const KOP_HOOGTE = 36

/**
 * De gevirtualiseerde lijst met datumgroepen en de pinned-kop. De zichtbare
 * rijen krijgen hun bodies voorgeladen en hun koppelingschip gebatcht.
 */
export function MailLijst(p: MailLijstProps) {
  const scrollEl = useRef<HTMLDivElement>(null)
  const rijen = useMemo(() => bouwRijen(p.items), [p.items])
  const rijHoogte = p.dichtheid === 'compact' ? 54 : 80

  const virtualizer = useVirtualizer({
    count: rijen.length,
    getScrollElement: () => scrollEl.current,
    estimateSize: (i) => (rijen[i]?.type === 'mail' ? rijHoogte : KOP_HOOGTE),
    overscan: 8,
    getItemKey: (i) => {
      const r = rijen[i]
      if (!r) return i
      if (r.type === 'kop-vast') return 'kop-vast'
      if (r.type === 'kop-groep') return `groep-${r.groep}`
      return r.item.id
    },
  })

  const virtueel = virtualizer.getVirtualItems()
  const zichtbaar = useMemo(() => {
    const uit: EmailLijstItem[] = []
    for (const v of virtueel) {
      const r = rijen[v.index]
      if (r?.type === 'mail') uit.push(r.item)
    }
    return uit
  }, [virtueel, rijen])
  const zichtbareSleutel = zichtbaar.map((i) => i.id).join(',')
  useEffect(() => {
    if (zichtbaar.length === 0) return
    prefetchBodies(zichtbaar.map((i) => i.id), 'zichtbaar')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zichtbareSleutel])
  const chips = useKoppelingChips(zichtbaar)

  useEffect(() => {
    scrollEl.current?.scrollTo({ top: 0 })
  }, [p.scrollSleutel])

  useEffect(() => {
    if (p.focusIndex < 0) return
    const item = p.items[p.focusIndex]
    if (!item) return
    const idx = rijen.findIndex((r) => r.type === 'mail' && r.item.id === item.id)
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'auto' })
  }, [p.focusIndex, p.items, rijen, virtualizer])

  const onScroll = useCallback(() => {
    const el = scrollEl.current
    if (!el || p.laden || p.klaar) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) p.onLaadMeer()
  }, [p])

  const { afstand, bezig, gereed } = usePullToRefresh({
    doel: scrollEl,
    actief: p.pullToRefresh.actief,
    onRefresh: p.pullToRefresh.onRefresh,
  })

  const [actieveGroep, zetActieveGroep] = useState<string | null>(null)
  useEffect(() => {
    const el = scrollEl.current
    if (!el) return
    const bepaal = () => {
      const top = el.scrollTop
      let groep: string | null = null
      let kopEind = 0
      const metingen = virtualizer.measurementsCache
      for (let i = 0; i < rijen.length; i++) {
        const m = metingen[i]
        if (!m || m.start > top + 1) break
        const r = rijen[i]
        if (r.type === 'kop-groep') { groep = r.groep; kopEind = m.end }
        else if (r.type === 'kop-vast') { groep = null; kopEind = 0 }
      }
      zetActieveGroep(groep && top >= kopEind ? groep : null)
    }
    bepaal()
    el.addEventListener('scroll', bepaal, { passive: true })
    return () => el.removeEventListener('scroll', bepaal)
  }, [rijen, virtualizer])

  const groepIds = useMemo(() => {
    const m = new Map<string, string[]>()
    let huidig: string | null = null
    for (const r of rijen) {
      if (r.type === 'kop-groep') huidig = r.groep
      else if (r.type === 'kop-vast') huidig = null
      else if (huidig) m.set(huidig, [...(m.get(huidig) || []), r.item.id])
    }
    return m
  }, [rijen])

  const eersteLaad = p.laden && p.items.length === 0

  return (
    <div
      ref={scrollEl}
      className="flex-1 overflow-y-auto overflow-x-hidden overscroll-x-none relative bg-[#F7FAFA] dark:bg-transparent"
      onScroll={onScroll}
      role="list"
      aria-busy={p.laden}
    >
      {(afstand > 0 || bezig) && (
        <div className="md:hidden absolute inset-x-0 top-0 z-20 flex items-center justify-center pointer-events-none" style={{ height: afstand }}>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[11px] font-medium text-muted-foreground">
            <RefreshCw className={cn('h-3.5 w-3.5', bezig && 'animate-spin')} style={bezig ? undefined : { transform: `rotate(${afstand * 4}deg)` }} />
            {bezig ? 'Ophalen' : gereed ? 'Loslaten om te verversen' : 'Trek om te verversen'}
          </span>
        </div>
      )}
      {p.bovenin}
      {actieveGroep && (
        <div className="sticky top-0 z-10 px-4 pl-10 pt-3 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-petrol/65 dark:text-foreground/60 bg-card/85 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.06] -mb-[36px]">
          {actieveGroep}<span className="text-flame tracking-normal">.</span>
        </div>
      )}

      {eersteLaad ? (
        <div>
          <div className="px-4 pt-5 pb-2"><Skeleton className="h-3 w-16" /></div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 pl-4 pr-3 py-3 animate-in fade-in fill-mode-both duration-300" style={{ animationDelay: `${i * 35}ms`, height: rijHoogte }}>
              <Skeleton className="w-9 h-9 rounded-[11px] flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-[7px]">
                <div className="flex items-center gap-2"><Skeleton className="h-2.5" style={{ width: i % 3 === 0 ? 108 : 84 }} /><Skeleton className="h-2.5 w-8 ml-auto" /></div>
                <Skeleton className="h-3" style={{ width: i % 2 === 0 ? '78%' : '62%' }} />
                {p.dichtheid === 'comfortabel' && <Skeleton className="h-2.5" style={{ width: '52%' }} />}
              </div>
            </div>
          ))}
        </div>
      ) : p.items.length === 0 ? (
        p.legeStaat
      ) : (
        <div>
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
            {virtueel.map((v) => {
              const r = rijen[v.index]
              if (!r) return null
              return (
                <div key={v.key} data-index={v.index} ref={virtualizer.measureElement} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${v.start}px)` }}>
                  {r.type === 'kop-vast' ? (
                    <div className="px-4 pl-10 pt-5 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-petrol/50 dark:text-foreground/55">
                      Vastgepind<span className="text-flame tracking-normal">.</span>
                    </div>
                  ) : r.type === 'kop-groep' ? (() => {
                    const ids = groepIds.get(r.groep) || []
                    const alles = ids.length > 0 && ids.every((id) => p.aangevinkt.has(id))
                    const deels = !alles && ids.some((id) => p.aangevinkt.has(id))
                    return (
                      <div className="px-4 pt-5 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-petrol/65 dark:text-foreground/60 flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={alles}
                          ref={(el) => { if (el) el.indeterminate = deels }}
                          onChange={() => p.onToggleGroep(ids)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Selecteer ${r.groep}`}
                          className="h-3.5 w-3.5 rounded border-foreground/20 cursor-pointer accent-petrol"
                        />
                        <span className="font-semibold whitespace-nowrap">{r.groep}<span className="text-flame tracking-normal">.</span></span>
                        <span className="flex-1 h-px bg-gradient-to-r from-petrol/[0.14] to-transparent dark:from-white/10" aria-hidden />
                        <span className="tabular-nums tracking-normal text-petrol/40 dark:text-foreground/40">{ids.length}</span>
                      </div>
                    )
                  })() : (
                    <EmailListItem
                      item={r.item}
                      actief={p.geselecteerdId === r.item.id}
                      aangevinkt={p.aangevinkt.has(r.item.id)}
                      focus={p.focusIndex === r.index}
                      dichtheid={p.dichtheid}
                      chip={chips.get(r.item.id) ?? null}
                      swipeLinks={p.swipeLinks}
                      onSelect={p.onSelect}
                      onToggleCheck={p.onToggleCheck}
                      onPin={p.onPin}
                      onArchiveer={p.onArchiveer}
                      onVerwijder={p.onVerwijder}
                      onToggleGelezen={p.onToggleGelezen}
                      onPrefetch={(item) => prefetchBodies([item.id], 'zichtbaar')}
                      salesMode={p.salesMode}
                      onMarkeerBeantwoord={p.onMarkeerBeantwoord}
                      onWisWacht={p.onWisWacht}
                    />
                  )}
                </div>
              )
            })}
          </div>
          {p.laden && (
            <div className="flex items-center justify-center py-5">
              <Loader2 className="h-4 w-4 animate-spin text-petrol/40 mr-2" />
              <span className="text-[12px] text-muted-foreground/80">Meer laden</span>
            </div>
          )}
          {!p.laden && !p.klaar && (
            <button type="button" onClick={p.onLaadMeer} className="w-full py-4 text-[12px] text-muted-foreground hover:text-petrol hover:bg-petrol/[0.03] transition-colors">
              Meer laden
            </button>
          )}
        </div>
      )}
    </div>
  )
}
