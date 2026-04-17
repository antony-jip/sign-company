import { memo, useCallback, useMemo, useRef } from 'react'
import { Pin, Paperclip, Archive, Trash2, MailOpen, Mail } from 'lucide-react'
import type { Email } from '@/types'
import { extractSenderName, cleanEmailPreview, formatShortDate, fontSizeClasses, getAvatarColor, getAvatarStyle } from './emailHelpers'
import type { FontSize } from './emailTypes'
import { cn } from '@/lib/utils'

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
}: EmailListItemProps) {
  const isUnread = !email.gelezen
  const senderName = useMemo(() => extractSenderName(email.van), [email.van])
  const sizes = fontSizeClasses[fontSize]
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
          'group relative flex items-center gap-2.5 pl-3 pr-3 h-[38px] cursor-pointer select-none',
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
          <div className="absolute left-0 top-[11px] bottom-[11px] w-[2.5px] rounded-r-full bg-[#1A535C]" />
        )}
        {isActive && (
          <div className="absolute left-0 top-[6px] bottom-[6px] w-[2.5px] rounded-r-full bg-[#1A535C]" />
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

        {/* Avatar — 24x24 met ronde hoeken */}
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: avatarStyle.bg }}
          aria-hidden
        >
          <span className="text-[10px] font-bold leading-none" style={{ color: avatarStyle.text }}>
            {senderName[0]?.toUpperCase()}
          </span>
        </div>

        {/* Sender */}
        <div className="flex items-center gap-1.5 w-[160px] flex-shrink-0 min-w-0">
          <span className={cn(
            'truncate leading-none text-[13px]',
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
        <div className="flex-1 min-w-0 truncate leading-none text-[13px]">
          <span className={cn(
            isUnread ? 'font-semibold text-[#1A1A1A]' : 'font-normal text-[#6B6B66]',
          )}>
            {email.onderwerp || '(geen onderwerp)'}
          </span>
          {preview && (
            <span className={cn(
              'font-normal',
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
              <Pin className="h-3 w-3 fill-[#1A535C] text-[#1A535C] -rotate-45" />
            )}
            <span className={cn(
              'tabular-nums min-w-[40px] text-right text-[12px]',
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
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-150 select-none',
        isActive
          ? 'bg-[#1A535C]/[0.05]'
          : 'hover:bg-[#F0EFEC]/50',
        isFocused && !isActive && 'bg-[#F0EFEC]/30',
        isUnread && !isActive && 'bg-white',
      )}
    >
      {/* Checkbox — overlays the avatar on hover */}
      <div className="relative flex-shrink-0">
        {/* Avatar */}
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150',
            'group-hover:opacity-0',
            isChecked && 'opacity-0',
          )}
          style={{ backgroundColor: avatarStyle.bg }}
        >
          <span className="text-xs font-bold leading-none" style={{ color: avatarStyle.text }}>
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
              'truncate leading-snug',
              sizes.name,
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
              'text-[#B0ADA8] font-mono tabular-nums',
              sizes.date,
              isUnread && 'text-[#6B6B66] font-medium',
            )}>
              {formatShortDate(email.datum)}
            </span>
          </div>
        </div>

        {/* Line 2: subject + preview */}
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'truncate leading-snug',
            compact ? 'max-w-full' : 'max-w-[55%] flex-shrink-0',
            sizes.subject,
            isUnread ? 'font-medium text-[#1A1A1A]' : 'font-normal text-[#9B9B95]',
          )}>
            {email.onderwerp || '(geen onderwerp)'}
          </span>
          {!compact && preview && (
            <>
              <span className="text-[#EBEBEB] flex-shrink-0">&mdash;</span>
              <span className={cn('text-[#B0ADA8] truncate', sizes.preview)}>{preview}</span>
            </>
          )}
        </div>
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
        <Pin
          className={cn(
            'h-4 w-4 transition-colors',
            email.pinned
              ? 'fill-[#1A535C] text-[#1A535C] -rotate-45'
              : 'text-[#B0ADA8] hover:text-[#1A535C]',
          )}
        />
      </button>

      {/* Unread indicator dot */}
      {isUnread && (
        <div className="w-[5px] h-[5px] rounded-full bg-[#1A535C] flex-shrink-0" />
      )}
    </div>
  )
})
