import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Pin, Paperclip, Archive, Trash2, MailOpen, Mail, Building2, FolderKanban, FileText } from 'lucide-react'
import type { EmailLijstItem } from '@/lib/mail/types'
import { extractSenderName, cleanEmailPreview, formatShortDate, getAvatarStyle, labelColors } from './emailHelpers'
import type { Dichtheid, SwipeLinks } from './shell/voorkeuren'
import type { KoppelingChipInfo } from './shell/koppelingChips'
import { ToewijsAvatar } from './shell/ToewijsMenu'
import type { ToewijsDoel } from './shell/toewijzing'
import { cn } from '@/lib/utils'
import { hapticLight, hapticMedium } from '@/utils/haptic'

const SWIPE_DREMPEL = 80
const SWIPE_KLEM = 160

export const SLEEP_TYPE = 'application/x-doen-mail'

export interface EmailListItemProps {
  item: EmailLijstItem
  actief: boolean
  aangevinkt: boolean
  focus: boolean
  dichtheid: Dichtheid
  chip?: KoppelingChipInfo | null
  swipeLinks: SwipeLinks
  onSelect: (item: EmailLijstItem, e?: React.MouseEvent) => void
  onToggleCheck: (id: string, e?: React.MouseEvent) => void
  onPin: (item: EmailLijstItem) => void
  onArchiveer: (item: EmailLijstItem) => void
  onVerwijder: (item: EmailLijstItem) => void
  onToggleGelezen: (item: EmailLijstItem) => void
  onPrefetch?: (item: EmailLijstItem) => void
  /** Gedeeld postvak: wie dit gesprek heeft opgepakt. */
  toegewezen?: ToewijsDoel | null
  salesMode?: 'wacht' | 'beantwoord'
  onMarkeerBeantwoord?: (id: string) => void
  onWisWacht?: (id: string) => void
}

const CHIP_ICOON = { klant: Building2, project: FolderKanban, offerte: FileText } as const

/**
 * Eén rij in de lijst. Comfortabel: afzender boven, onderwerp met preview
 * eronder, koppelingschip en tellers ertussen. Compact: twee regels zonder
 * preview. Sleepbaar naar de projectregels in de klantkaart; op mobiel
 * swipe links naar de gekozen actie, rechts de andere.
 */
export const EmailListItem = memo(function EmailListItem({
  item, actief, aangevinkt, focus, dichtheid, chip, swipeLinks,
  onSelect, onToggleCheck, onPin, onArchiveer, onVerwijder, onToggleGelezen, onPrefetch,
  toegewezen, salesMode, onMarkeerBeantwoord, onWisWacht,
}: EmailListItemProps) {
  const ongelezen = !item.gelezen
  const compact = dichtheid === 'compact'
  const afzender = useMemo(() => extractSenderName(item.van) || item.van, [item.van])
  const avatar = getAvatarStyle(afzender)
  const preview = useMemo(() => cleanEmailPreview(item.body_text || '').slice(0, 160), [item.body_text])
  const threadAantal = item.threadAantal ?? 0
  const bijlagen = item.bijlagen > 0 || !!item.has_attachments

  const onderdrukKlik = useRef(false)
  const klik = useCallback((e: React.MouseEvent) => {
    if (onderdrukKlik.current) { onderdrukKlik.current = false; return }
    hapticLight()
    onSelect(item, e)
  }, [item, onSelect])

  const [swipeX, zetSwipeX] = useState(0)
  const [sleept, zetSleept] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const horizontaal = useRef<boolean | null>(null)
  const tikGegeven = useRef(false)

  const linksActie = swipeLinks === 'archiveren' ? onArchiveer : onVerwijder
  const rechtsActie = swipeLinks === 'archiveren' ? onVerwijder : onArchiveer

  const touchStart = useCallback((e: React.TouchEvent) => {
    onPrefetch?.(item)
    if (aangevinkt) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    horizontaal.current = null
    tikGegeven.current = false
    zetSleept(true)
  }, [aangevinkt, item, onPrefetch])
  const touchMove = useCallback((e: React.TouchEvent) => {
    if (aangevinkt) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (horizontaal.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) horizontaal.current = Math.abs(dx) > Math.abs(dy)
    if (!horizontaal.current) return
    const geklemd = Math.max(-SWIPE_KLEM, Math.min(SWIPE_KLEM, dx))
    zetSwipeX(geklemd)
    if (Math.abs(geklemd) > SWIPE_DREMPEL && !tikGegeven.current) { hapticLight(); tikGegeven.current = true }
    if (Math.abs(geklemd) < SWIPE_DREMPEL) tikGegeven.current = false
  }, [aangevinkt])
  const touchEnd = useCallback(() => {
    zetSleept(false)
    if (Math.abs(swipeX) > 8) onderdrukKlik.current = true
    if (swipeX < -SWIPE_DREMPEL) { hapticMedium(); linksActie(item) }
    else if (swipeX > SWIPE_DREMPEL) { hapticMedium(); rechtsActie(item) }
    zetSwipeX(0)
  }, [swipeX, item, linksActie, rechtsActie])

  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const muisIn = useCallback(() => {
    if (!onPrefetch) return
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current)
    prefetchTimer.current = setTimeout(() => onPrefetch(item), 150)
  }, [item, onPrefetch])
  const muisUit = useCallback(() => {
    if (prefetchTimer.current) { clearTimeout(prefetchTimer.current); prefetchTimer.current = null }
  }, [])

  const sleepStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData(SLEEP_TYPE, JSON.stringify({ emailId: item.id, threadId: item.thread_id ?? null, onderwerp: item.onderwerp }))
    e.dataTransfer.setData('text/plain', item.onderwerp || '')
    e.dataTransfer.effectAllowed = 'link'
  }, [item])

  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn() }
  const ChipIcoon = chip ? CHIP_ICOON[chip.soort as keyof typeof CHIP_ICOON] : undefined

  const acties = (
    <div className="hidden md:group-hover:flex absolute right-2.5 top-1.5 items-center gap-px p-0.5 rounded-xl bg-card border border-black/[0.06] dark:border-white/10 shadow-[0_2px_10px_rgba(26,83,92,0.12)]">
      <button type="button" onClick={stop(() => onPin(item))} title={item.pinned ? 'Losmaken (p)' : 'Vastpinnen (p)'} className={cn('h-7 w-7 flex items-center justify-center rounded-[9px] transition-colors', item.pinned ? 'text-flame hover:bg-flame/10' : 'text-muted-foreground hover:text-petrol hover:bg-petrol/[0.08]')}>
        <Pin className={cn('h-3.5 w-3.5', item.pinned && 'fill-flame -rotate-45')} />
      </button>
      <button type="button" onClick={stop(() => onArchiveer(item))} title="Archiveren (e)" className="h-7 w-7 flex items-center justify-center rounded-[9px] text-muted-foreground hover:text-petrol hover:bg-petrol/[0.08] transition-colors">
        <Archive className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={stop(() => onToggleGelezen(item))} title={ongelezen ? 'Markeer als gelezen' : 'Markeer als ongelezen (u)'} className="h-7 w-7 flex items-center justify-center rounded-[9px] text-muted-foreground hover:text-petrol hover:bg-petrol/[0.08] transition-colors">
        {ongelezen ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
      </button>
      <button type="button" onClick={stop(() => onVerwijder(item))} title="Verwijderen (#)" className="h-7 w-7 flex items-center justify-center rounded-[9px] text-muted-foreground hover:text-[#C0451A] hover:bg-[#C0451A]/[0.08] transition-colors">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  return (
    <>
      <div
        data-email-id={item.id}
        draggable
        onDragStart={sleepStart}
        onClick={klik}
        onMouseEnter={muisIn}
        onMouseLeave={muisUit}
        onTouchStart={touchStart}
        onTouchMove={touchMove}
        onTouchEnd={touchEnd}
        className={cn(
          'group relative flex items-start gap-3 pl-4 pr-3 cursor-pointer select-none min-w-0 max-w-full overflow-hidden',
          compact ? 'py-2' : 'py-3',
          'border-b border-[rgba(26,83,92,0.06)] dark:border-white/[0.06]',
          'transition-colors duration-100 ease-out',
          actief
            ? 'bg-petrol/[0.06] dark:bg-[#2A7A86]/[0.14]'
            : 'hover:bg-[rgba(26,83,92,0.035)] dark:hover:bg-white/[0.05] active:bg-muted/60',
          !actief && ongelezen && 'bg-white dark:bg-white/[0.03]',
          focus && 'ring-2 ring-inset ring-petrol/60 dark:ring-[#7FB5BF]/60',
          swipeX > SWIPE_DREMPEL && (swipeLinks === 'archiveren' ? 'bg-[#FDE8E4] dark:bg-[#C0451A]/20' : 'bg-[#E8F2EC] dark:bg-[#3A7D52]/20'),
          swipeX < -SWIPE_DREMPEL && (swipeLinks === 'archiveren' ? 'bg-[#E8F2EC] dark:bg-[#3A7D52]/20' : 'bg-[#FDE8E4] dark:bg-[#C0451A]/20'),
        )}
        style={{
          WebkitTapHighlightColor: 'transparent',
          transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
          transition: sleept ? 'none' : 'transform 150ms ease-out, background-color 100ms ease-out',
        }}
        aria-selected={actief}
      >
        {(ongelezen || actief) && (
          <div className={cn('absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full', actief ? 'bg-petrol dark:bg-[#2A7A86]' : 'bg-petrol/45 dark:bg-[#2A7A86]/70')} aria-hidden />
        )}

        <div className="relative flex-shrink-0 mt-0.5">
          <div
            className={cn('rounded-[11px] flex items-center justify-center transition-opacity duration-150 ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08]', compact ? 'w-7 h-7' : 'w-9 h-9', 'group-hover:opacity-0', aangevinkt && 'opacity-0')}
            style={{ backgroundColor: avatar.bg }}
          >
            <span className={cn('font-bold leading-none', compact ? 'text-[11px]' : 'text-[14px]')} style={{ color: avatar.text }}>{afzender[0]?.toUpperCase()}</span>
          </div>
          <div className={cn('absolute inset-0 flex items-center justify-center transition-opacity duration-150 opacity-0 group-hover:opacity-100', aangevinkt && '!opacity-100')}>
            <input type="checkbox" checked={aangevinkt} onChange={() => {}} onClick={(e) => { e.stopPropagation(); onToggleCheck(item.id, e) }} aria-label="Selecteer" className="h-4 w-4 rounded border-foreground/20 cursor-pointer accent-petrol" />
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-px transition-[padding] duration-150 md:group-hover:pr-[124px]">
          <div className="flex items-center gap-1.5 mb-[3px] min-w-0">
            <span className={cn('truncate leading-none tracking-[-0.005em]', compact ? 'text-[13px]' : 'text-[13.5px]', ongelezen ? 'font-bold text-foreground' : 'font-medium text-foreground/75')}>
              {afzender}
            </span>
            {threadAantal > 1 && (
              <span className="text-[10px] font-mono tabular-nums font-semibold text-petrol/80 dark:text-[#7FB5BF] bg-petrol/[0.08] dark:bg-[#2A7A86]/20 rounded-full px-1.5 py-px leading-none flex-shrink-0" title={`${threadAantal} berichten in dit gesprek`}>
                {threadAantal}
              </span>
            )}
            {toegewezen && <ToewijsAvatar doel={toegewezen} formaat={15} />}
            {bijlagen && <Paperclip className="h-3 w-3 text-petrol/45 dark:text-muted-foreground flex-shrink-0" aria-label="Bijlage" />}
            {item.pinned && <Pin className="h-3 w-3 fill-flame text-flame -rotate-45 flex-shrink-0" aria-label="Vastgepind" />}
            <span className={cn('ml-auto pl-2 text-[11.5px] font-mono tabular-nums flex-shrink-0 leading-none md:group-hover:opacity-0 transition-opacity', ongelezen ? 'text-petrol dark:text-[#7FB5BF] font-semibold' : 'text-muted-foreground/80')}>
              {formatShortDate(item.datum)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            {item.labels?.filter((l) => labelColors[l]).slice(0, 3).map((l) => (
              <span key={l} className={cn('inline-block w-[6px] h-[6px] rounded-full flex-shrink-0', labelColors[l])} title={l} />
            ))}
            <span className={cn('truncate leading-snug tracking-[-0.005em]', compact ? 'text-[13px]' : 'text-[14px]', ongelezen ? 'font-bold text-foreground' : 'font-medium text-foreground/70 dark:text-muted-foreground')}>
              {item.onderwerp || '(geen onderwerp)'}
            </span>
            {compact && preview && <span className="truncate text-[12px] text-muted-foreground/80 hidden md:inline">· {preview}</span>}
            {chip && ChipIcoon && (
              <span className="ml-auto inline-flex items-center gap-1 h-5 pl-1.5 pr-2 rounded-[6px] bg-black/[0.05] dark:bg-white/[0.08] text-[11px] text-foreground/70 max-w-[140px] flex-shrink-0" title={`${chip.soort}: ${chip.label}`}>
                <ChipIcoon className="h-3 w-3 flex-shrink-0 opacity-70" />
                <span className="truncate">{chip.label}</span>
              </span>
            )}
          </div>

          {!compact && (
            <p className="truncate text-[12.5px] leading-snug text-muted-foreground/90 min-h-[18px] mt-[3px]">
              {preview || <span className="text-muted-foreground/40">Geen voorbeeldtekst</span>}
            </p>
          )}
        </div>
        {acties}
      </div>

      {salesMode === 'wacht' && (onMarkeerBeantwoord || onWisWacht) && (
        <div className="flex gap-2 px-4 pb-2 -mt-1 text-[11px]">
          {onMarkeerBeantwoord && <button type="button" onClick={stop(() => onMarkeerBeantwoord(item.id))} className="text-petrol hover:underline">Markeer als beantwoord</button>}
          {onWisWacht && <button type="button" onClick={stop(() => onWisWacht(item.id))} className="text-muted-foreground hover:text-[#C0451A] hover:underline">Niet meer opvolgen</button>}
        </div>
      )}
    </>
  )
})
