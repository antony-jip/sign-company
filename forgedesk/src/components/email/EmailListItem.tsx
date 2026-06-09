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
    if (isChecked) return
    touchStartX.current = e.touches[0].clientX
    setIsDragging(true)
    hapticFired.current = null
  }, [isChecked])
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
          'group relative flex items-center gap-2.5 pl-3 pr-3 h-[46px] cursor-pointer select-none',
          'border-b border-[rgba(26,83,92,0.06)] dark:border-white/[0.06]',
          'transition-all duration-150 ease-out',
          isActive
            ? 'bg-[#1A535C]/[0.06] dark:bg-[#2A7A86]/[0.14]'
            : isChecked
              ? 'bg-[#1A535C]/[0.03] dark:bg-[#2A7A86]/[0.08]'
              : isUnread
                ? 'bg-white dark:bg-white/[0.03] hover:bg-[rgba(26,83,92,0.04)] dark:hover:bg-white/[0.05] active:bg-[#1A535C]/[0.05]'
                : 'hover:bg-[rgba(26,83,92,0.04)] dark:hover:bg-white/[0.05] active:bg-[#1A535C]/[0.05]',
          isFocused && !isActive && 'bg-background',
        )}
      >
        {/* Unread indicator — subtle left accent */}
        {isUnread && !isActive && (
          <div className="absolute left-0 top-[13px] bottom-[13px] w-[2.5px] rounded-r-full bg-[#1A535C] dark:bg-[#2A7A86]" />
        )}
        {isActive && (
          <div className="absolute left-0 top-[8px] bottom-[8px] w-[2.5px] rounded-r-full bg-[#1A535C] dark:bg-[#2A7A86]" />
        )}

        {/* Checkbox */}
        <div className="flex-shrink-0 h-5 w-4 flex items-center justify-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            onClick={handleCheckClick}
            className="h-3.5 w-3.5 rounded border-[#D4D2CE] cursor-pointer accent-[#1A535C] block"
          />
        </div>

        {/* Avatar — 26x26 met ronde hoeken */}
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
              isUnread ? 'text-[#1A535C] dark:text-[#7FB5BF] font-semibold' : 'text-[#8A8985] dark:text-muted-foreground/70',
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
                email.pinned ? 'text-[#1A535C] hover:bg-[#1A535C]/10' : 'text-muted-foreground hover:text-[#1A535C] hover:bg-[#1A535C]/[0.06]',
              )}
              title={email.pinned ? 'Losmaken' : 'Vastpinnen'}
            >
              <Pin className={cn('h-3.5 w-3.5', email.pinned && 'fill-[#1A535C] -rotate-45')} />
            </button>
            {onArchive && (
              <button
                type="button"
                onClick={handleArchiveClick}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-[#1A535C] hover:bg-[#1A535C]/[0.06] transition-colors duration-100"
                title="Archiveren (e)"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
            {onToggleRead && (
              <button
                type="button"
                onClick={handleToggleReadClick}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-[#1A535C] hover:bg-[#1A535C]/[0.06] transition-colors duration-100"
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

  // Default two-line mode — ruime 3-regel layout: afzender/tijd · onderwerp · preview
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
        'group relative flex items-start gap-3 px-4 py-4 cursor-pointer transition-colors duration-100 ease-out select-none',
        'border-b border-[rgba(26,83,92,0.06)] dark:border-white/[0.06] last:border-b-0',
        isActive
          ? 'bg-[#1A535C]/[0.05] dark:bg-[#2A7A86]/[0.14]'
          : 'hover:bg-[rgba(26,83,92,0.04)] dark:hover:bg-white/[0.05] active:bg-muted/60 md:active:bg-[#1A535C]/[0.05]',
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
      {/* Actieve mail — zachte petrol left-accent (alleen dark; light gebruikt bg-tint) */}
      {isActive && (
        <div className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-[#2A7A86] hidden dark:block" aria-hidden />
      )}

      {/* Checkbox — overlays the avatar on hover */}
      <div className="relative flex-shrink-0 mt-0.5">
        {/* Avatar — rond, groter */}
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150',
            'group-hover:opacity-0',
            isChecked && 'opacity-0',
          )}
          style={{ backgroundColor: avatarStyle.bg }}
        >
          <span className="text-[14px] font-semibold leading-none" style={{ color: avatarStyle.text }}>
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
            className="h-4 w-4 rounded border-foreground/20 cursor-pointer accent-[#1A535C]"
          />
        </div>
      </div>

      {/* Content: 3 regels */}
      <div className="flex-1 min-w-0 pt-px">
        {/* Regel 1: afzender · tijd · bijlage · thread */}
        <div className="flex items-center gap-1.5 mb-1 min-w-0">
          <span className={cn(
            'truncate text-[13px] leading-none transition-colors duration-200',
            isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80',
          )}>
            {senderName}
          </span>
          <span className="text-[#C5C2BD] text-[11px] flex-shrink-0 leading-none">·</span>
          <span className="text-[12px] font-mono tabular-nums text-muted-foreground flex-shrink-0 leading-none">
            {formatShortDate(email.datum)}
          </span>
          {email.bijlagen > 0 && (
            <Paperclip className="h-3 w-3 text-[#C5C2BD] flex-shrink-0" />
          )}
          {email.threadCount && email.threadCount > 1 && (
            <span className="text-[10px] font-mono tabular-nums font-semibold text-foreground/70 bg-muted rounded px-1 py-px leading-none flex-shrink-0">
              {email.threadCount}
            </span>
          )}
        </div>

        {/* Regel 2: onderwerp — prominent */}
        <div className="flex items-center gap-1.5 mb-1 min-w-0">
          {isUnread && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#F15025] flex-shrink-0" aria-hidden />
          )}
          {email.labels?.filter((l) => labelColors[l]).slice(0, 3).map((l) => (
            <span
              key={l}
              className={cn('inline-block w-[6px] h-[6px] rounded-full flex-shrink-0', labelColors[l])}
              title={l}
            />
          ))}
          <span className={cn(
            'truncate text-[14.5px] leading-snug tracking-[-0.005em] transition-colors duration-200',
            isUnread ? 'font-bold text-foreground' : 'font-semibold text-[#3A3A36] dark:text-muted-foreground',
          )}>
            {email.onderwerp || '(geen onderwerp)'}
          </span>
        </div>

        {/* Regel 3: preview (altijd zichtbaar voor consistente row-hoogte) */}
        {!compact && (
          <p className="truncate text-[13px] leading-snug text-muted-foreground min-h-[18px]">
            {preview || <span className="text-[#C5C2BD]">…</span>}
          </p>
        )}
      </div>

      {/* Pin (hover only — pinned status is communicated by the section header) */}
      <button
        onClick={handlePinClick}
        title={email.pinned ? 'Losmaken' : 'Vastpinnen'}
        className={cn(
          'flex-shrink-0 p-1 rounded transition-all duration-150',
          'opacity-0 group-hover:opacity-100 hover:bg-muted',
        )}
      >
        <Pin
          className={cn(
            'h-4 w-4 transition-colors',
            email.pinned
              ? 'fill-[#1A535C] text-[#1A535C] -rotate-45'
              : 'text-muted-foreground/80 hover:text-[#1A535C]',
          )}
        />
      </button>

      {/* Unread indicator dot — desktop only; mobile uses the Flame strip */}
      {isUnread && (
        <div className="hidden md:block w-[5px] h-[5px] rounded-full bg-[#1A535C] dark:bg-[#7FB5BF] flex-shrink-0" />
      )}
    </div>

    {salesMode === 'wacht' && (onMarkeerBeantwoord || onWisWacht) && (
      <div className="flex gap-2 px-4 pb-2 -mt-1 text-[11px]">
        {onMarkeerBeantwoord && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMarkeerBeantwoord(email.id) }}
            className="text-[#1A535C] hover:underline"
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
