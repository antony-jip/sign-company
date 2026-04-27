import { memo, useCallback, useMemo, useRef } from 'react'
import { Pin, Star, Paperclip, Archive, Trash2, MailOpen, Mail } from 'lucide-react'
import type { Email } from '@/types'
import { extractSenderName, cleanEmailPreview, formatShortDate, fontSizeClasses, getAvatarColor, getAvatarStyle } from './emailHelpers'
import type { FontSize } from './emailTypes'
import { cn } from '@/lib/utils'

const desktopSizeClasses: Record<FontSize, { name: string; subject: string; preview: string; date: string }> = {
  small: { name: 'md:text-base', subject: 'md:text-base', preview: 'md:text-sm', date: 'md:text-xs' },
  medium: { name: 'md:text-lg', subject: 'md:text-lg', preview: 'md:text-base', date: 'md:text-sm' },
  large: { name: 'md:text-xl', subject: 'md:text-lg', preview: 'md:text-lg', date: 'md:text-base' },
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
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'group relative flex items-center gap-2.5 pl-3 pr-3 h-[42px] cursor-pointer select-none',
          'transition-all duration-150 ease-out',
          isActive
            ? 'bg-[#1A535C]/[0.06]'
            : isChecked
              ? 'bg-[#1A535C]/[0.03]'
              : isUnread
                ? 'bg-white hover:bg-[#FAFAF8]'
                : 'hover:bg-[#F8F7F5]',
          isFocused && !isActive && 'bg-[#FAFAF8]',
        )}
      >
        {/* Unread indicator — subtle left accent */}
        {isUnread && !isActive && (
          <div className="absolute left-0 top-[13px] bottom-[13px] w-[2.5px] rounded-r-full bg-[#1A535C]" />
        )}
        {isActive && (
          <div className="absolute left-0 top-[8px] bottom-[8px] w-[2.5px] rounded-r-full bg-[#1A535C]" />
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
            'truncate leading-none text-[14px]',
            isUnread ? 'font-semibold text-[#1A1A1A]' : 'font-normal text-[#6B6B66]',
          )}>
            {senderName}
          </span>
          {email.threadCount && email.threadCount > 1 && (
            <span className="text-[10px] tabular-nums flex-shrink-0 text-[#9B9B95] bg-[#F0EFEC] rounded px-1 py-px font-medium">
              {email.threadCount}
            </span>
          )}
        </div>

        {/* Subject + preview */}
        <div className="flex-1 min-w-0 truncate leading-none text-[14px]">
          <span className={cn(
            isUnread ? 'font-semibold text-[#1A1A1A]' : 'font-normal text-[#6B6B66]',
          )}>
            {email.onderwerp || '(geen onderwerp)'}
          </span>
          {preview && (
            <span className={cn(
              'font-normal hidden md:inline',
              isUnread ? 'text-[#9B9B95]' : 'text-[#C5C2BD]',
            )}>
              {' \u2014 '}{preview}
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
            {email.pinned && (
              <Star className="h-3.5 w-3.5 fill-[#F15025] text-[#F15025]" />
            )}
            <span className={cn(
              'tabular-nums min-w-[40px] text-right text-[13px]',
              isUnread ? 'text-[#1A535C] font-medium' : 'text-[#B0ADA8]',
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
                email.pinned ? 'text-[#1A535C] hover:bg-[#1A535C]/10' : 'text-[#9B9B95] hover:text-[#1A535C] hover:bg-[#1A535C]/[0.06]',
              )}
              title={email.pinned ? 'Losmaken' : 'Vastpinnen'}
            >
              <Pin className={cn('h-3.5 w-3.5', email.pinned && 'fill-[#1A535C] -rotate-45')} />
            </button>
            {onArchive && (
              <button
                type="button"
                onClick={handleArchiveClick}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-[#9B9B95] hover:text-[#1A535C] hover:bg-[#1A535C]/[0.06] transition-colors duration-100"
                title="Archiveren (e)"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
            {onToggleRead && (
              <button
                type="button"
                onClick={handleToggleReadClick}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-[#9B9B95] hover:text-[#1A535C] hover:bg-[#1A535C]/[0.06] transition-colors duration-100"
                title={isUnread ? 'Markeer als gelezen' : 'Markeer als ongelezen'}
              >
                {isUnread ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-[#9B9B95] hover:text-[#C0451A] hover:bg-[#C0451A]/[0.06] transition-colors duration-100"
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

  // Default two-line mode
  return (
    <>
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group relative flex items-center gap-3 px-4 py-3.5 md:py-2.5 cursor-pointer transition-colors duration-100 md:duration-150 select-none',
        'border-b border-[#EBEBEB]/40 last:border-b-0 md:border-b-0',
        isActive
          ? 'bg-[#1A535C]/[0.05]'
          : 'hover:bg-[#F0EFEC]/50 active:bg-[#F0EFEC]/60 md:active:bg-transparent',
        isFocused && !isActive && 'bg-[#F0EFEC]/30',
        isUnread && !isActive && 'bg-white',
        !isUnread && !isActive && 'bg-[#FAFAF8] md:bg-transparent',
      )}
    >
      {/* Mobile-only Flame strip on unread rows */}
      {isUnread && !isActive && (
        <div className="md:hidden absolute left-0 top-[20%] bottom-[20%] w-[2px] rounded-full bg-[#F15025]/90" />
      )}
      {/* Checkbox — overlays the avatar on hover */}
      <div className="relative flex-shrink-0">
        {/* Avatar */}
        <div
          className={cn(
            'w-9 h-9 rounded-full md:rounded-lg flex items-center justify-center transition-all duration-150',
            'group-hover:opacity-0',
            isChecked && 'opacity-0',
          )}
          style={{ backgroundColor: avatarStyle.bg }}
        >
          <span className="text-[13px] md:text-xs font-medium md:font-bold leading-none" style={{ color: avatarStyle.text }}>
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

      {/* Content: two lines */}
      <div className="flex-1 min-w-0">
        {/* Line 1: sender + date */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              'truncate leading-snug text-[14.5px]',
              mdSizes.name,
              isUnread ? 'font-semibold text-[#1A1A1A]' : 'font-normal text-[#7A7975]',
            )}>
              {senderName}
            </span>
            {email.threadCount && email.threadCount > 1 && (
              <span className="text-[10px] text-[#9B9B95] bg-[#F0EFEC] rounded-md px-1.5 py-0.5 flex-shrink-0 font-medium">
                {email.threadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {email.bijlagen > 0 && (
              <Paperclip className="h-3.5 w-3.5 text-[#C5C2BD]" />
            )}
            <span className={cn(
              'tabular-nums font-mono text-[12px]',
              mdSizes.date,
              isUnread
                ? 'text-[#9B9B95] md:text-[#6B6B66] md:font-medium'
                : 'text-[#9B9B95] md:text-[#B0ADA8]',
            )}>
              {formatShortDate(email.datum)}
            </span>
          </div>
        </div>

        {/* Line 2: subject + preview */}
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'truncate leading-snug text-[14px]',
            mdSizes.subject,
            compact ? 'max-w-full' : 'max-w-full md:max-w-[55%] md:flex-shrink-0',
            isUnread
              ? 'font-semibold md:font-medium text-[#1A1A1A]'
              : 'font-normal text-[#1A1A1A]/85 md:text-[#9B9B95]',
          )}>
            {email.onderwerp || '(geen onderwerp)'}
          </span>
          {!compact && preview && (
            <span className="hidden md:contents">
              <span className="text-[#EBEBEB] flex-shrink-0">&mdash;</span>
              <span className={cn('text-[#B0ADA8] truncate', sizes.preview)}>{preview}</span>
            </span>
          )}
        </div>
        {/* Mobile-only third line: preview text below subject */}
        {!compact && preview && (
          <p className="md:hidden truncate mt-0.5 text-[13px] font-normal text-[#9B9B95]">
            {preview}
          </p>
        )}
      </div>

      {/* Pin */}
      <button
        onClick={handlePinClick}
        title={email.pinned ? 'Losmaken' : 'Vastpinnen'}
        className={cn(
          'flex-shrink-0 p-1 rounded transition-all duration-150',
          'opacity-0 group-hover:opacity-100',
          email.pinned && '!opacity-100',
          !email.pinned && 'hover:bg-[#F0EFEC]',
        )}
      >
        <Star
          className={cn(
            'h-4 w-4 transition-colors',
            email.pinned
              ? 'fill-[#F15025] text-[#F15025]'
              : 'text-[#B0ADA8] hover:text-[#F15025]',
          )}
        />
      </button>

      {/* Unread indicator dot — desktop only; mobile uses the Flame strip */}
      {isUnread && (
        <div className="hidden md:block w-[5px] h-[5px] rounded-full bg-[#1A535C] flex-shrink-0" />
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
            className="text-[#9B9B95] hover:text-[#C0451A] hover:underline"
          >
            Niet meer opvolgen
          </button>
        )}
      </div>
    )}
    {salesMode === 'beantwoord' && email.beantwoord_door_email_id && onTerugNaarWacht && (
      <div className="flex items-center gap-2 px-4 pb-2 -mt-1 text-[11px] text-[#9B9B95]">
        <span>Match via inkomende mail</span>
        <span className="text-[#D4D2CE]">·</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTerugNaarWacht(email.id, email.beantwoord_door_email_id!) }}
          className="text-[#9B9B95] hover:text-[#C0451A] hover:underline"
        >
          Dit was niet de reactie
        </button>
      </div>
    )}
    </>
  )
})
