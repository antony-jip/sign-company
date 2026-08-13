import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Pin, Paperclip, Archive, Trash2, MailOpen, Mail } from 'lucide-react'
import type { Email } from '@/types'
import { extractSenderName, cleanEmailPreview, formatShortDate, fontSizeClasses, getAvatarColor, getAvatarStyle, labelColors } from './emailHelpers'
import type { FontSize } from './emailTypes'
import { cn } from '@/lib/utils'
import { hapticLight, hapticMedium } from '@/utils/haptic'

const SWIPE_THRESHOLD = 80
const SWIPE_CLAMP = 160

const desktopSizeClasses: Record<FontSize, { name: string; subject: string; preview: string; date: string }> = {
  small: { name: 'md:text-base', subject: 'md:text-base', preview: 'md:text-sm', date: 'md:text-xs' },
  medium: { name: 'md:text-lg', subject: 'md:text-lg', preview: 'md:text-base', date: 'md:text-sm' },
  large: { name: 'md:text-xl', subject: 'md:text-lg', preview: 'md:text-lg', date: 'md:text-base' },
}

const stackedSizeClasses: Record<FontSize, { text: string; date: string }> = {
  small: { text: 'text-[13px]', date: 'text-[11px]' },
  medium: { text: 'text-[15px]', date: 'text-[12px]' },
  large: { text: 'text-[17px]', date: 'text-[13px]' },
}

interface EmailListItemProps {
  email: Email & { threadCount?: number }
  isActive: boolean
  isChecked: boolean
  isFocused: boolean
  compact?: boolean
  stacked?: boolean
  fontSize?: FontSize
  onSelect: (email: Email, e?: React.MouseEvent) => void
  onTogglePin: (email: Email) => void
  onToggleCheck: (id: string, e?: React.MouseEvent) => void
  onPrefetch?: (email: Email) => void
  // Hover quick actions
  onArchive?: (email: Email) => void
  onDelete?: (email: Email) => void
  onToggleRead?: (email: Email) => void
  // Sales Inbox v1
  salesMode?: 'wacht' | 'beantwoord'
  onMarkeerBeantwoord?: (id: string) => void
  onWisWacht?: (id: string) => void
  onTerugNaarWacht?: (outboundId: string, inkomendeMailId: string) => void
}

export const EmailListItem = memo(function EmailListItem({
  email,
  isActive,
  isChecked,
  isFocused,
  compact,
  stacked,
  fontSize = 'medium',
  onSelect,
  onTogglePin,
  onToggleCheck,
  onPrefetch,
  onArchive,
  onDelete,
  onToggleRead,
  salesMode,
  onMarkeerBeantwoord,
  onWisWacht,
  onTerugNaarWacht,
}: EmailListItemProps) {
  const isUnread = !email.gelezen
  const senderName = useMemo(() => extractSenderName(email.van), [email.van])
  const sizes = fontSizeClasses[fontSize]
  const mdSizes = desktopSizeClasses[fontSize]
  const stackedSizes = stackedSizeClasses[fontSize]
  const avatarColor = getAvatarColor(senderName)
  const avatarStyle = getAvatarStyle(senderName)

  // Preview: agressieve HTML / CSS / entity / URL stripping zodat de
  // single-line rij leesbare proza toont en geen lelijke `<p>`, `&nbsp;`,
  // `{ padding: 0; }` of lange URLs.
  const preview = useMemo(() => {
    const raw = email.body_text || email.inhoud || ''
    return cleanEmailPreview(raw).slice(0, 200)
  }, [email.body_text, email.inhoud])

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Skip de synthetic-click die direct na een touchend kan vuren bij swipes
    if (suppressNextClick.current) {
      suppressNextClick.current = false
      return
    }
    hapticLight()
    onSelect(email, e)
  }, [email, onSelect])

  const handleArchiveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onArchive?.(email)
  }, [email, onArchive])

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(email)
  }, [email, onDelete])

  const handleToggleReadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleRead?.(email)
  }, [email, onToggleRead])

  // Mobile swipe: rechts → archief, links → verwijder. Alleen actief op
  // touch-events (mobile). Niet swipen tijdens selection-mode (checkbox aan).
  const [swipeX, setSwipeX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef(0)
  const hapticFired = useRef<'archive' | 'delete' | null>(null)
  // Onderdrukt de synthetic-click die de browser na een touchend afvuurt,
  // zodat een swipe die archive/delete trigger niet ook nog de mail opent.
  const suppressNextClick = useRef(false)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Vinger neer is ~100ms vóór de click: die voorsprong gebruiken we om de
    // body al op te halen, want mobiel heeft geen hover om op te prefetchen.
    onPrefetch?.(email)
    if (isChecked) return
    touchStartX.current = e.touches[0].clientX
    setIsDragging(true)
    hapticFired.current = null
  }, [isChecked, email, onPrefetch])
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isChecked) return
    const delta = e.touches[0].clientX - touchStartX.current
    const clamped = Math.max(-SWIPE_CLAMP, Math.min(SWIPE_CLAMP, delta))
    setSwipeX(clamped)
    // Eén haptic-tick bij overschrijden van de threshold (in beide richtingen)
    if (clamped > SWIPE_THRESHOLD && hapticFired.current !== 'archive') {
      hapticLight()
      hapticFired.current = 'archive'
    } else if (clamped < -SWIPE_THRESHOLD && hapticFired.current !== 'delete') {
      hapticLight()
      hapticFired.current = 'delete'
    } else if (Math.abs(clamped) < SWIPE_THRESHOLD) {
      hapticFired.current = null
    }
  }, [isChecked])
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    // Onderdruk de aankomende click als de finger meer dan 8px is bewogen
    // (tap-vs-swipe heuristiek). Zonder dit triggert na een swipe ook nog
    // de mail-open via onClick.
    if (Math.abs(swipeX) > 8) suppressNextClick.current = true
    if (swipeX > SWIPE_THRESHOLD) {
      hapticMedium()
      onArchive?.(email)
    } else if (swipeX < -SWIPE_THRESHOLD) {
      hapticMedium()
      onDelete?.(email)
    }
    setSwipeX(0)
    hapticFired.current = null
  }, [swipeX, email, onArchive, onDelete])

  // Prefetch on hover met 150ms debounce zodat snel scrollen niet ALLES prefetcht
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleMouseEnter = useCallback(() => {
    if (!onPrefetch) return
    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current)
    prefetchTimerRef.current = setTimeout(() => onPrefetch(email), 150)
  }, [email, onPrefetch])
  const handleMouseLeave = useCallback(() => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current)
      prefetchTimerRef.current = null
    }
  }, [])

  const handlePinClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onTogglePin(email)
  }, [email, onTogglePin])

  const handleCheckClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCheck(email.id, e)
  }, [email.id, onToggleCheck])

  // Dense / single-line mode
  if (stacked) {
    return (
      <div
        data-email-id={email.id}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          // min-w-0 en overflow-hidden op de rij zelf: een kolom met een vaste
          // breedte plus een lang onderwerp duwt de rij anders breder dan de
          // lijst, en dat is wat het scrollen zijwaarts liet schuiven.
          'group relative flex items-center gap-2.5 pl-4 pr-4 h-[44px] cursor-pointer select-none min-w-0 max-w-full overflow-hidden',
          'border-b border-[rgba(26,83,92,0.06)] dark:border-white/[0.06]',
          'transition-all duration-150 ease-out',
          isActive
            ? 'bg-petrol/[0.06] dark:bg-[#2A7A86]/[0.14]'
            : isChecked
              ? 'bg-petrol/[0.03] dark:bg-[#2A7A86]/[0.08]'
              : isUnread
                ? 'bg-white dark:bg-white/[0.03] hover:bg-[rgba(26,83,92,0.04)] dark:hover:bg-white/[0.05] active:bg-petrol/[0.05]'
                : 'hover:bg-[rgba(26,83,92,0.04)] dark:hover:bg-white/[0.05] active:bg-petrol/[0.05]',
          isFocused && !isActive && 'bg-background',
        )}
      >
        {/* Unread indicator · subtle left accent */}
        {isUnread && !isActive && (
          <div className="absolute left-0 top-[12px] bottom-[12px] w-[2.5px] rounded-r-full bg-petrol dark:bg-[#2A7A86]" />
        )}
        {isActive && (
          <div className="absolute left-0 top-[8px] bottom-[8px] w-[2.5px] rounded-r-full bg-petrol dark:bg-[#2A7A86]" />
        )}

        {/* Checkbox */}
        <div className="flex-shrink-0 h-5 w-3.5 flex items-center justify-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            onClick={handleCheckClick}
            className="h-3.5 w-3.5 rounded border-[#D4D2CE] cursor-pointer accent-petrol block"
          />
        </div>

        {/* Avatar · 26x26 met ronde hoeken */}
        <div
          className="w-[26px] h-[26px] rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: avatarStyle.bg }}
          aria-hidden
        >
          <span className="text-[11px] font-bold leading-none" style={{ color: avatarStyle.text }}>
            {senderName[0]?.toUpperCase()}
          </span>
        </div>

        {/* Sender */}
        <div className="flex items-center gap-1.5 w-[120px] md:w-[170px] flex-shrink-0 min-w-0">
          <span className={cn(
            'truncate leading-none tracking-[-0.005em] transition-colors duration-200',
            stackedSizes.text,
            isUnread ? 'font-semibold text-foreground' : 'font-normal text-foreground/80',
          )}>
            {senderName}
          </span>
          {email.threadCount && email.threadCount > 1 && (
            <span className="text-[10px] font-mono tabular-nums flex-shrink-0 text-foreground/70 bg-muted rounded px-1 py-px font-medium">
              {email.threadCount}
            </span>
          )}
        </div>

        {/* Subject + preview */}
        <div className={cn('flex-1 min-w-0 truncate leading-none', stackedSizes.text)}>
          {email.labels?.filter((l) => labelColors[l]).slice(0, 3).map((l) => (
            <span
              key={l}
              className={cn('inline-block w-[6px] h-[6px] rounded-full mr-1.5 align-middle', labelColors[l])}
              title={l}
            />
          ))}
          <span className={cn(
            'tracking-[-0.005em] transition-colors duration-200',
            isUnread ? 'font-semibold text-foreground' : 'font-normal text-[#2A2A26] dark:text-muted-foreground',
          )}>
            {email.onderwerp || '(geen onderwerp)'}
          </span>
          {preview && (
            <span className={cn(
              'font-normal hidden md:inline ml-2 transition-colors duration-200',
              isUnread ? 'text-[#7A7975] dark:text-muted-foreground' : 'text-muted-foreground',
            )}>
              {preview}
            </span>
          )}
        </div>

        {/* Right meta */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto pl-2">
          {/* Default state */}
          <div className="flex items-center gap-2 group-hover:hidden">
            {email.bijlagen > 0 && (
              <Paperclip className="h-3 w-3 text-[#C5C2BD]" />
            )}
            <span className={cn(
              'font-mono tabular-nums min-w-[52px] text-right transition-colors duration-200',
              stackedSizes.date,
              isUnread ? 'text-petrol dark:text-[#7FB5BF] font-semibold' : 'text-[#8A8985] dark:text-muted-foreground/70',
            )}>
              {formatShortDate(email.datum)}
            </span>
          </div>

          {/* Hover: quick actions */}
          <div className="hidden group-hover:flex items-center gap-px">
            <button
              type="button"
              onClick={handlePinClick}
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded-lg transition-colors duration-100',
                email.pinned ? 'text-petrol hover:bg-petrol/10' : 'text-muted-foreground hover:text-petrol hover:bg-petrol/[0.06]',
              )}
              title={email.pinned ? 'Losmaken' : 'Vastpinnen'}
            >
              <Pin className={cn('h-3.5 w-3.5', email.pinned && 'fill-petrol -rotate-45')} />
            </button>
            {onArchive && (
              <button
                type="button"
                onClick={handleArchiveClick}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-petrol hover:bg-petrol/[0.06] transition-colors duration-100"
                title="Archiveren (e)"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
            {onToggleRead && (
              <button
                type="button"
                onClick={handleToggleReadClick}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-petrol hover:bg-petrol/[0.06] transition-colors duration-100"
                title={isUnread ? 'Markeer als gelezen' : 'Markeer als ongelezen'}
              >
                {isUnread ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-[#C0451A] hover:bg-[#C0451A]/[0.06] transition-colors duration-100"
                title="Verwijderen (#)"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default two-line mode · ruime 3-regel layout: afzender/tijd · onderwerp · preview
  return (
    <>
    <div
      data-email-id={email.id}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        'group relative flex items-start gap-3 pl-4 pr-3 py-3 cursor-pointer transition-colors duration-100 ease-out select-none',
        'border-b border-[rgba(26,83,92,0.06)] dark:border-white/[0.06] last:border-b-0',
        isActive
          ? 'bg-petrol/[0.06] dark:bg-[#2A7A86]/[0.14]'
          : 'hover:bg-[rgba(26,83,92,0.035)] dark:hover:bg-white/[0.05] active:bg-muted/60 md:active:bg-petrol/[0.05]',
        isFocused && !isActive && 'bg-muted/30',
        !isActive && (isUnread ? 'bg-white dark:bg-white/[0.03]' : 'bg-white md:bg-transparent dark:bg-transparent'),
        swipeX > SWIPE_THRESHOLD && 'bg-emerald-100 dark:bg-emerald-900/40',
        swipeX < -SWIPE_THRESHOLD && 'bg-red-100 dark:bg-red-900/40',
      )}
      style={{
        WebkitTapHighlightColor: 'transparent',
        transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
        transition: isDragging ? 'none' : 'transform 150ms ease-out, background-color 100ms ease-out',
      }}
    >
      {/* Left rail · ongelezen draagt petrol, actieve mail een vollere variant */}
      {(isUnread || isActive) && (
        <div
          className={cn(
            'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full',
            isActive ? 'bg-petrol dark:bg-[#2A7A86]' : 'bg-petrol/45 dark:bg-[#2A7A86]/70',
          )}
          aria-hidden
        />
      )}

      {/* Checkbox · overlays the avatar on hover */}
      <div className="relative flex-shrink-0 mt-0.5">
        {/* Avatar · squircle met zachte rand */}
        <div
          className={cn(
            'w-9 h-9 rounded-[13px] flex items-center justify-center transition-all duration-150',
            'ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] shadow-[0_1px_2px_rgba(26,83,92,0.06)]',
            'group-hover:opacity-0',
            isChecked && 'opacity-0',
          )}
          style={{ backgroundColor: avatarStyle.bg }}
        >
          <span className="text-[14px] font-bold leading-none" style={{ color: avatarStyle.text }}>
            {senderName[0]?.toUpperCase()}
          </span>
        </div>
        {/* Checkbox on hover / when checked */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center transition-all duration-150',
          'opacity-0 group-hover:opacity-100',
          isChecked && '!opacity-100',
        )}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            onClick={handleCheckClick}
            className="h-4 w-4 rounded border-foreground/20 cursor-pointer accent-petrol"
          />
        </div>
      </div>

      {/* Content: 3 regels · maakt op hover ruimte voor de zwevende acties */}
      <div className="flex-1 min-w-0 pt-px transition-[padding] duration-150 md:group-hover:pr-[124px]">
        {/* Regel 1: afzender · thread · bijlage · tijd rechts */}
        <div className="flex items-center gap-1.5 mb-[3px] min-w-0">
          <span className={cn(
            'truncate text-[13.5px] leading-none tracking-[-0.005em] transition-colors duration-200',
            isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/75',
          )}>
            {senderName}
          </span>
          {email.threadCount && email.threadCount > 1 && (
            <span className="text-[10px] font-mono tabular-nums font-semibold text-petrol/80 dark:text-[#7FB5BF] bg-petrol/[0.08] dark:bg-[#2A7A86]/20 rounded-full px-1.5 py-px leading-none flex-shrink-0">
              {email.threadCount}
            </span>
          )}
          {email.bijlagen > 0 && (
            <Paperclip className="h-3 w-3 text-petrol/45 dark:text-muted-foreground flex-shrink-0" />
          )}
          <span className={cn(
            'ml-auto pl-2 text-[11.5px] font-mono tabular-nums flex-shrink-0 leading-none transition-opacity duration-150',
            'md:group-hover:opacity-0',
            isUnread ? 'text-petrol dark:text-[#7FB5BF] font-semibold' : 'text-muted-foreground/80',
          )}>
            {formatShortDate(email.datum)}
          </span>
        </div>

        {/* Regel 2: onderwerp · prominent */}
        <div className="flex items-center gap-1.5 mb-[3px] min-w-0">
          {email.labels?.filter((l) => labelColors[l]).slice(0, 3).map((l) => (
            <span
              key={l}
              className={cn('inline-block w-[6px] h-[6px] rounded-full flex-shrink-0', labelColors[l])}
              title={l}
            />
          ))}
          <span className={cn(
            'truncate text-[14px] leading-snug tracking-[-0.005em] transition-colors duration-200',
            isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/70 dark:text-muted-foreground',
          )}>
            {email.onderwerp || '(geen onderwerp)'}
          </span>
          {email.pinned && (
            <Pin className="h-3 w-3 fill-flame text-flame -rotate-45 flex-shrink-0" aria-label="Vastgepind" />
          )}
        </div>

        {/* Regel 3: preview (altijd zichtbaar voor consistente row-hoogte) */}
        {!compact && (
          <p className="truncate text-[12.5px] leading-snug text-muted-foreground/90 min-h-[18px]">
            {preview || <span className="text-muted-foreground/40">Geen voorbeeldtekst</span>}
          </p>
        )}
      </div>

      {/* Hover-acties · zweven rechts zodat de rij niet verspringt */}
      <div className="hidden md:group-hover:flex absolute right-2.5 top-1.5 items-center gap-px p-0.5 rounded-xl bg-white dark:bg-card border border-black/[0.06] dark:border-white/10 shadow-[0_2px_10px_rgba(26,83,92,0.12)]">
        <button
          type="button"
          onClick={handlePinClick}
          title={email.pinned ? 'Losmaken' : 'Vastpinnen'}
          className={cn(
            'h-7 w-7 flex items-center justify-center rounded-[9px] transition-colors duration-100',
            email.pinned ? 'text-flame hover:bg-flame/10' : 'text-muted-foreground hover:text-petrol hover:bg-petrol/[0.08]',
          )}
        >
          <Pin className={cn('h-3.5 w-3.5', email.pinned && 'fill-flame -rotate-45')} />
        </button>
        {onArchive && (
          <button
            type="button"
            onClick={handleArchiveClick}
            title="Archiveren (e)"
            className="h-7 w-7 flex items-center justify-center rounded-[9px] text-muted-foreground hover:text-petrol hover:bg-petrol/[0.08] transition-colors duration-100"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        )}
        {onToggleRead && (
          <button
            type="button"
            onClick={handleToggleReadClick}
            title={isUnread ? 'Markeer als gelezen' : 'Markeer als ongelezen'}
            className="h-7 w-7 flex items-center justify-center rounded-[9px] text-muted-foreground hover:text-petrol hover:bg-petrol/[0.08] transition-colors duration-100"
          >
            {isUnread ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            title="Verwijderen (#)"
            className="h-7 w-7 flex items-center justify-center rounded-[9px] text-muted-foreground hover:text-[#C0451A] hover:bg-[#C0451A]/[0.08] transition-colors duration-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>

    {salesMode === 'wacht' && (onMarkeerBeantwoord || onWisWacht) && (
      <div className="flex gap-2 px-4 pb-2 -mt-1 text-[11px]">
        {onMarkeerBeantwoord && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMarkeerBeantwoord(email.id) }}
            className="text-petrol hover:underline"
          >
            Markeer als beantwoord
          </button>
        )}
        {onWisWacht && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onWisWacht(email.id) }}
            className="text-muted-foreground hover:text-[#C0451A] hover:underline"
          >
            Niet meer opvolgen
          </button>
        )}
      </div>
    )}
    {salesMode === 'beantwoord' && email.beantwoord_door_email_id && onTerugNaarWacht && (
      <div className="flex items-center gap-2 px-4 pb-2 -mt-1 text-[11px] text-muted-foreground">
        <span>Match via inkomende mail</span>
        <span className="text-[#D4D2CE]">·</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTerugNaarWacht(email.id, email.beantwoord_door_email_id!) }}
          className="text-muted-foreground hover:text-[#C0451A] hover:underline"
        >
          Dit was niet de reactie
        </button>
      </div>
    )}
    </>
  )
})
